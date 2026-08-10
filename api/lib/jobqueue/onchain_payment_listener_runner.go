package jobqueue

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"math/big"
	"strings"
	"time"

	"github.com/0xsequence/ethkit/ethmonitor"
	"github.com/0xsequence/ethkit/ethreceipts"
	"github.com/0xsequence/ethkit/ethrpc"
	"github.com/0xsequence/ethkit/go-ethereum/common"
	"github.com/0xsequence/ethkit/go-ethereum/core/types"
	"github.com/goware/logger"
	"github.com/rs/zerolog/log"
	"github.com/upper/db/v4"
	"golang.org/x/sync/errgroup"

	"github.com/horizon-games/OpenSky/api/config"
	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/lib/contracts"
	"github.com/horizon-games/OpenSky/api/proto"
)

const (
	OnChainPaymentListenerWorkGroup  = "onchain-payment-listener"
	OnChainPaymentListenerRetryDelay = 1 // in seconds
	OnChainPaymentListenerMaxRetries = 999
)

var _ Runner = &OnChainPaymentListenerRunner{}

type OnChainPaymentListenerTask struct{}

func (t OnChainPaymentListenerTask) Hash() string {
	return "OnChainPaymentListenerTask"
}

type OnChainPaymentListenerRunner struct {
	mainCtx               context.Context
	cfg                   config.OpenSkyOnChainPaymentConfig
	contractAddress       common.Address
	tokenAddress          common.Address
	assetAddress          common.Address
	logger                logger.Logger
	provider              *ethrpc.Provider
	contractUSDC          ContractUSDC
	contractOpenSkyAssets ContractOpenSkyAssets
	contractPaymentProxy  ContractPaymentProxy

	ticker           *time.Ticker
	monitor          *ethmonitor.Monitor
	receiptListener  *ethreceipts.ReceiptsListener
	subscription     ethreceipts.Subscription
	cancelFunc       context.CancelFunc
	errGroup         *errgroup.Group
	metricsCollector MetricsCollector
}

func NewOnChainPaymentListenerRunner(
	ctx context.Context,
	cfg config.OpenSkyOnChainPaymentConfig,
	logger logger.Logger,
	provider *ethrpc.Provider,
	contractUSDC ContractUSDC,
	contractOpenSkyAssets ContractOpenSkyAssets,
	contractPaymentProxy ContractPaymentProxy,
	metricsCollector MetricsCollector,
) *OnChainPaymentListenerRunner {
	return &OnChainPaymentListenerRunner{
		mainCtx:               ctx,
		cfg:                   cfg,
		contractAddress:       common.HexToAddress(contractPaymentProxy.Address().String()),
		tokenAddress:          common.HexToAddress(contractUSDC.Address().String()),
		assetAddress:          common.HexToAddress(contractOpenSkyAssets.Address().String()),
		logger:                logger,
		provider:              provider,
		contractUSDC:          contractUSDC,
		contractOpenSkyAssets: contractOpenSkyAssets,
		contractPaymentProxy:  contractPaymentProxy,
		metricsCollector:      metricsCollector,
	}
}

func (r *OnChainPaymentListenerRunner) WorkGroup() string {
	return OnChainPaymentListenerWorkGroup
}

func (r *OnChainPaymentListenerRunner) Queues() []string {
	return []string{OnChainPaymentListenerWorkGroup}
}

func (r *OnChainPaymentListenerRunner) MaxBatchSize() int {
	return 1
}

func (r *OnChainPaymentListenerRunner) Tick() <-chan time.Time {
	if r.ticker == nil {
		r.ticker = time.NewTicker(10 * time.Second)
	}

	return r.ticker.C
}

func (r *OnChainPaymentListenerRunner) RunTasks(ctx context.Context, sess db.Session, tasks []*data.Task) error {
	oplog := log.With().Str("op", OnChainPaymentListenerWorkGroup).Logger()
	oplog.Info().Msgf("%s running", OnChainPaymentListenerWorkGroup)

	if !r.isListeningRunning() {
		if err := r.startListening(ctx); err != nil {
			UpdateFailedTasks(tasks, OnChainPaymentListenerRetryDelay, OnChainPaymentListenerMaxRetries)
			return fmt.Errorf("start listening: %w", err)
		}
	}

	var latestEventTask *data.Task

	err := data.DB.Tasks(sess).Find(db.Cond{"queue": OnChainPaymentEventWorkGroup}).OrderBy("-id").One(&latestEventTask)
	if err != nil && !errors.Is(err, db.ErrNoMoreRows) {
		UpdateFailedTasks(tasks, OnChainPaymentListenerRetryDelay, OnChainPaymentListenerMaxRetries)
		return fmt.Errorf("find latest event: %w", err)
	}

	var lastPaymentEvent *lastPaymentEventInfo

	if latestEventTask != nil {
		var latestEventTaskPayload *OnChainPaymentEventTask

		if err := json.Unmarshal(latestEventTask.Payload, &latestEventTaskPayload); err != nil {
			UpdateFailedTasks(tasks, OnChainPaymentListenerRetryDelay, OnChainPaymentListenerMaxRetries)
			return fmt.Errorf("decode latest event task payload: %w", err)
		}

		lastPaymentEvent = &lastPaymentEventInfo{
			BlockNumber: latestEventTaskPayload.BlockNumber,
			TxIndex:     latestEventTaskPayload.TxIndex,
			EventIndex:  latestEventTaskPayload.EventIndex,
		}
	}

	idleTimeout := time.NewTimer(r.cfg.SubscribeIdleTimeout)

	for {
		select {
		case <-idleTimeout.C:
			tasks[0].Try = 0
			return nil
		case <-ctx.Done():
			tasks[0].Try = 0
			return nil
		case receipt, ok := <-r.subscription.TransactionReceipt():
			if !ok {
				continue
			}

			idleTimeout.Reset(r.cfg.SubscribeIdleTimeout)

			var processingTxAgain bool

			if lastPaymentEvent != nil {
				if receipt.BlockNumber() == nil {
					oplog.Warn().Msg("receipt block number is nil")
					continue
				}

				// The block has been already processed.
				if receipt.BlockNumber().Cmp(lastPaymentEvent.BlockNumber) < 0 {
					continue
				}

				// The block has been processed but maybe not all transactions and events.
				if receipt.BlockNumber().Cmp(lastPaymentEvent.BlockNumber) == 0 {
					if receipt.TransactionIndex() < lastPaymentEvent.TxIndex {
						continue
					}

					if receipt.TransactionIndex() == lastPaymentEvent.TxIndex {
						processingTxAgain = true
					}
				}
			}

			for i, log := range receipt.Logs() {
				// The transaction has been processed but maybe not all events.
				if processingTxAgain && lastPaymentEvent != nil {
					if log.Index <= lastPaymentEvent.EventIndex {
						continue
					}
				}

				if log.Address != r.contractAddress {
					continue
				}

				if err := r.handleItemPurchaseEvent(sess, log, i, receipt); err != nil {
					UpdateFailedTasks(tasks, OnChainPaymentListenerRetryDelay, OnChainPaymentListenerMaxRetries)
					return fmt.Errorf("handle item purchase event: %w", err)
				}

				if err := r.handleItemBurnEvent(sess, log, i, receipt); err != nil {
					UpdateFailedTasks(tasks, OnChainPaymentListenerRetryDelay, OnChainPaymentListenerMaxRetries)
					return fmt.Errorf("handle item burn event: %w", err)
				}
			}
		}
	}
}

func (r *OnChainPaymentListenerRunner) isListeningRunning() bool {
	if r.monitor == nil || r.receiptListener == nil {
		return false
	}

	return r.monitor.IsRunning() && r.receiptListener.IsRunning()
}

func (r *OnChainPaymentListenerRunner) startListening(ctx context.Context) error {
	if r.provider == nil {
		return fmt.Errorf("provider is nil")
	}

	if r.monitor == nil {
		if err := r.setMonitor(ctx); err != nil {
			return fmt.Errorf("set monitor: %w", err)
		}
	}

	if r.receiptListener == nil {
		if err := r.setReceiptListener(); err != nil {
			return fmt.Errorf("set receipt listener: %w", err)
		}
	}

	if r.subscription == nil {
		r.setSubscription()
	}

	if r.errGroup != nil {
		r.cancelFunc()

		if err := r.waitForStopping(ctx); err != nil {
			return fmt.Errorf("wait for stopping: %w", err)
		}
	}

	cancelCtx, cancelFunc := context.WithCancel(r.mainCtx)
	r.cancelFunc = cancelFunc

	eg, egCtx := errgroup.WithContext(cancelCtx)
	r.errGroup = eg

	eg.Go(func() error {
		err := r.monitor.Run(egCtx)
		if err != nil {
			return fmt.Errorf("run monitor: %w", err)
		}

		return nil
	})

	eg.Go(func() error {
		err := r.receiptListener.Run(egCtx)
		if err != nil {
			return fmt.Errorf("run receipt listener: %w", err)
		}

		return nil
	})

	go func() {
		if err := eg.Wait(); err != nil {
			r.logger.Error(err)
		}
	}()

	if err := r.waitForRunning(ctx); err != nil {
		return fmt.Errorf("wait for running: %w", err)
	}

	return nil
}

func (r *OnChainPaymentListenerRunner) setMonitor(ctx context.Context) error {
	var startBlockNumber *big.Int

	if r.cfg.MonitorStartNumBlocksBack > 0 {
		latestBlockNumber, err := r.provider.BlockNumber(ctx)
		if err != nil {
			return fmt.Errorf("get latest block number: %w", err)
		}

		startBlockNumber = big.NewInt(int64(latestBlockNumber - r.cfg.MonitorStartNumBlocksBack))
	}

	options := ethmonitor.DefaultOptions
	options.WithLogs = true
	options.DebugLogging = r.cfg.MonitorDebugLogging
	options.BlockRetentionLimit = 400
	options.StartBlockNumber = startBlockNumber
	options.PollingInterval = r.cfg.MonitorPollingInterval
	options.Logger = r.logger

	monitor, err := ethmonitor.NewMonitor(r.provider, options)
	if err != nil {
		return fmt.Errorf("instantiate monitor: %w", err)
	}

	r.monitor = monitor

	return nil
}

func (r *OnChainPaymentListenerRunner) setReceiptListener() error {
	options := ethreceipts.DefaultOptions

	receiptListener, err := ethreceipts.NewReceiptsListener(r.logger, r.provider, r.monitor, options)
	if err != nil {
		return fmt.Errorf("instantiate receipt listener: %w", err)
	}

	r.receiptListener = receiptListener

	return nil
}

func (r *OnChainPaymentListenerRunner) setSubscription() {
	filter := ethreceipts.FilterLogs(func(logs []*types.Log) bool {
		for _, log := range logs {
			r.metricsCollector.TrackLastBlockNumber("payment-listener", log.BlockNumber)

			if log.Address != r.contractAddress {
				continue
			}

			if r.contractPaymentProxy.IsItemPurchaseEvent(log) {
				return true
			}

			if r.contractPaymentProxy.IsItemBurnEvent(log) {
				return true
			}
		}

		return false
	})

	r.subscription = r.receiptListener.Subscribe(filter)
}

func (r *OnChainPaymentListenerRunner) waitForStopping(ctx context.Context) error {
	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		default:
			if !r.monitor.IsRunning() && !r.receiptListener.IsRunning() {
				return nil
			}
		}
	}
}

func (r *OnChainPaymentListenerRunner) waitForRunning(ctx context.Context) error {
	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		default:
			if r.monitor.IsRunning() && r.receiptListener.IsRunning() {
				return nil
			}
		}
	}
}

func (r *OnChainPaymentListenerRunner) handleItemPurchaseEvent(sess db.Session, eventLog *types.Log, logIndex int, receipt ethreceipts.Receipt) error {
	itemPurchaseEvent, err := r.contractPaymentProxy.FindAndDecodeItemPurchaseEvent(eventLog)
	if err != nil {
		log.Err(err).Msgf("find and decode item purchase event, tx: %s", eventLog.TxHash.Hex())
		return nil
	}

	if itemPurchaseEvent == nil {
		return nil
	}

	var transferEvent *contracts.ERC20TransferEvent

	// Loop back in logs history to find related ComposeTransfer event.
	// We consider the nearest ComposeTransfer event with matching parameters to be the related ComposeTransfer event.
	for a := logIndex; a >= 0; a-- {
		pastLog := receipt.Logs()[a]

		if pastLog.Address != r.tokenAddress {
			continue
		}

		transferEvent, err = r.contractUSDC.FindAndDecodeTransferEvent(pastLog)
		if err != nil {
			log.Err(err).Msgf("find and decode transfer event, tx: %s", eventLog.TxHash.Hex())
			continue
		}

		if transferEvent == nil {
			continue
		}

		if transferEvent.To.String() != strings.ToLower(r.contractAddress.String()) {
			transferEvent = nil

			continue
		}

		break
	}

	if transferEvent == nil {
		return nil
	}

	err = data.DB.Tasks(sess).EnqueueTaskIgnoringDuplicates(OnChainPaymentEventWorkGroup, OnChainPaymentEventTask{
		TxHash:            proto.HashFromString(receipt.TransactionHash().Hex()),
		BlockNumber:       receipt.BlockNumber(),
		TxIndex:           receipt.TransactionIndex(),
		EventIndex:        eventLog.Index,
		TransferEvent:     transferEvent,
		ItemPurchaseEvent: itemPurchaseEvent,
	}, nil, nil)
	if err != nil {
		return fmt.Errorf("enqueue OnChainPaymentEventTask: %w", err)
	}

	return nil
}

func (r *OnChainPaymentListenerRunner) handleItemBurnEvent(sess db.Session, eventLog *types.Log, logIndex int, receipt ethreceipts.Receipt) error {
	itemBurnEvent, err := r.contractPaymentProxy.FindAndDecodeItemBurnEvent(eventLog)
	if err != nil {
		log.Err(err).Msgf("find and decode item burn event, tx: %s", eventLog.TxHash.Hex())
		return nil
	}

	if itemBurnEvent == nil {
		return nil
	}

	var transferBatchEvent *contracts.ERC1155TransferBatchEvent

	// Loop back in logs history to find related ComposeTransfer batch event.
	// We consider the nearest ComposeTransfer event with matching parameters to be the related ComposeTransfer batch event.
	for a := logIndex; a >= 0; a-- {
		pastLog := receipt.Logs()[a]

		if pastLog.Address != r.assetAddress {
			continue
		}

		transferBatchEvent, err = r.contractOpenSkyAssets.FindAndDecodeTransferBatchEvent(pastLog)
		if err != nil {
			log.Err(err).Msgf("find and decode transfer batch event, tx: %s", eventLog.TxHash.Hex())
			continue
		}

		if transferBatchEvent == nil {
			continue
		}

		if transferBatchEvent.To.String() != strings.ToLower(r.contractAddress.String()) {
			transferBatchEvent = nil

			continue
		}

		break
	}

	if transferBatchEvent == nil {
		return nil
	}

	err = data.DB.Tasks(sess).EnqueueTaskIgnoringDuplicates(OnChainPaymentEventWorkGroup, OnChainPaymentEventTask{
		TxHash:             proto.HashFromString(receipt.TransactionHash().Hex()),
		BlockNumber:        receipt.BlockNumber(),
		TxIndex:            receipt.TransactionIndex(),
		EventIndex:         eventLog.Index,
		TransferBatchEvent: transferBatchEvent,
		ItemBurnEvent:      itemBurnEvent,
	}, nil, nil)
	if err != nil {
		return fmt.Errorf("enqueue OnChainPaymentEventTask: %w", err)
	}

	return nil
}

type lastPaymentEventInfo struct {
	BlockNumber *big.Int
	TxIndex     uint
	EventIndex  uint
}

type ContractPaymentProxy interface {
	Address() proto.Hash
	FindAndDecodeItemPurchaseEvent(*types.Log) (*contracts.PaymentProxyItemPurchaseEvent, error)
	IsItemPurchaseEvent(*types.Log) bool
	FindAndDecodeItemBurnEvent(*types.Log) (*contracts.PaymentProxyItemBurnEvent, error)
	IsItemBurnEvent(*types.Log) bool
}
