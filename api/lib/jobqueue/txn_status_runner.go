package jobqueue

import (
	"context"
	"encoding/json"
	"fmt"
	"sync"
	"time"

	"github.com/0xsequence/ethkit/ethrpc"
	"github.com/0xsequence/go-sequence"
	seqRelayer "github.com/0xsequence/go-sequence/relayer"
	relayerProto "github.com/0xsequence/go-sequence/relayer/proto"
	"github.com/pkg/errors"
	"github.com/rs/zerolog/log"
	"github.com/upper/db/v4"

	"github.com/horizon-games/OpenSky/api/config"
	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/proto"
)

// TxnStatusRunner is responsible for checking the status of sent transactions
// by the SendTxnsRunner, so that we  can record their state.

var (
	_                    Runner = &TxnStatusRunner{}
	delayedMintingCutoff        = time.Date(2025, 7, 29, 0, 0, 0, 0, time.UTC)
)

const (
	TxnStatusGroup        = "metatxns-status-check" // TODO: rename to txn-status, but needs db migration
	TxnStatusRetryDelay   = 5
	TxnStatusMaxRetries   = 20
	TxnStatusCheckTimeout = 30
	TxnStatusBatchSize    = 10
)

type TxnStatusRunner struct {
	relayer *seqRelayer.RpcRelayer

	ticker           *time.Ticker
	metricsCollector MetricsCollector
}

type TxnStatusTask struct {
	MetaTxnID sequence.MetaTxnID `json:"metatxn_id"`
	TaskIDs   []uint64           `json:"task_ids"`

	SubmittedAt time.Time `json:"run_at"`
}

func (t TxnStatusTask) Hash() string {
	return string(t.MetaTxnID)
}

func (r *TxnStatusRunner) WorkGroup() string {
	return TxnStatusGroup
}

func (r *TxnStatusRunner) Queues() []string {
	return []string{
		TxnStatusGroup,
	}
}

func (r *TxnStatusRunner) Tick() <-chan time.Time {
	if r.ticker == nil {
		r.ticker = time.NewTicker(15 * time.Second)
	}
	return r.ticker.C
}

func (r *TxnStatusRunner) MaxBatchSize() int {
	return TxnStatusBatchSize
}

func NewTxnStatusRunner(metricsCollector MetricsCollector) (*TxnStatusRunner, error) {
	r := &TxnStatusRunner{
		metricsCollector: metricsCollector,
	}

	var err error
	cfg := config.Instance

	// Ethereum
	if cfg.Ethereum.URL == "" {
		return nil, errors.Errorf("Ethereum URL not set in config file")
	}
	provider, err := ethrpc.NewProvider(cfg.Ethereum.URL)
	if err != nil {
		return nil, errors.New("can't instantiate ethprovider")
	}

	// Relayer
	if cfg.Sequence.RelayerURL == "" {
		return nil, errors.Errorf("Sequence Relayer URL not set in config file")
	}
	if cfg.Sequence.AccessKey == "" {
		return nil, errors.Errorf("Sequence Access Key not set in config file")
	}
	r.relayer, err = seqRelayer.NewRpcRelayer(cfg.Sequence.RelayerURL, cfg.Sequence.AccessKey, provider, nil)
	if err != nil {
		return nil, fmt.Errorf("new runner failed, relayer: %w", err)
	}

	return r, nil
}

func (r *TxnStatusRunner) RunTasks(ctx context.Context, sess db.Session, tasks []*data.Task) error {
	oplog := log.With().Str("op", TxnStatusGroup).Logger()
	oplog.Info().Msgf("%s running", TxnStatusGroup)

	var retryMintingTaskIDs, successfullTaskIDs []uint64

	wg := sync.WaitGroup{}

	for _, t := range tasks {
		var payload TxnStatusTask
		err := json.Unmarshal(t.Payload, &payload)
		if err != nil {
			oplog.Error().Msgf("failed unmarshalling txnStatus task payload with: %v", err)
			UpdateFailedTasks([]*data.Task{t}, TxnStatusRetryDelay, TxnStatusMaxRetries)
			continue
		}

		wg.Add(1)
		go func(ctx context.Context, task *data.Task) {
			defer wg.Done()

			logger := oplog.With().
				Uint64("taskID", task.ID).
				Stringer("metaTxnID", payload.MetaTxnID).
				Logger()

			receipt, err := r.getMetaTxnReceipt(ctx, payload.MetaTxnID)
			logger.Debug().Msgf("txnStatus: metaTxn %s receipt: %#v", payload.MetaTxnID, receipt)

			if err != nil {
				logger.Error().Msgf("getMetaTxnReceipt: fetching receipt for metaTxn %s failed with: %v", payload.MetaTxnID, err)
				UpdateFailedTasks([]*data.Task{task}, TxnStatusRetryDelay, TxnStatusMaxRetries)
				return
			}

			if receipt == nil {
				logger.Error().Msgf("getMetaTxnReceipt: fetching receipt for metaTxn %s returned nil receipt", payload.MetaTxnID)
				UpdateFailedTasks([]*data.Task{task}, TxnStatusRetryDelay, TxnStatusMaxRetries)
				return
			}

			var status relayerProto.ETHTxnStatus
			if s, ok := relayerProto.ETHTxnStatus_value[receipt.Status]; ok {
				status = relayerProto.ETHTxnStatus(s)
			} else {
				status = relayerProto.ETHTxnStatus_UNKNOWN
			}

			switch status {
			case relayerProto.ETHTxnStatus_QUEUED, relayerProto.ETHTxnStatus_SENT:
				logger.Info().Msgf("txnStatus: metaTxn %s is not confirmed yet", payload.MetaTxnID)
				UpdateFailedTasks([]*data.Task{task}, TxnStatusRetryDelay, TxnStatusMaxRetries)
				return

			/*
				case relayerProto.ETHTxnStatus_SUCCEEDED:
					logger.Info().Msgf("txnStatus: metaTxn %s minted - status: %s", payload.MetaTxnID, receipt.Status)
					r.metricsCollector.TrackTxMintingDuration(receipt.Status, payload.SubmittedAt)
					UpdateCompletedTasks([]*data.Task{task})
					successfullTaskIDs = append(successfullTaskIDs, payload.TaskIDs...)

					return
			*/

			case relayerProto.ETHTxnStatus_FAILED, relayerProto.ETHTxnStatus_DROPPED:
				logger.Error().Msgf("txnStatus: metaTxn %s failed completely - status: %s - putting it back in queue to be retried", payload.MetaTxnID, receipt.Status)
				r.metricsCollector.TrackTxMintingDuration(receipt.Status, payload.SubmittedAt)
				UpdateCompletedTasks([]*data.Task{task})
				retryMintingTaskIDs = append(retryMintingTaskIDs, payload.TaskIDs...)

			case relayerProto.ETHTxnStatus_PARTIALLY_FAILED, relayerProto.ETHTxnStatus_SUCCEEDED:
				logger.Error().Msgf("txnStatus: metaTxn %s partially failed - status: %s - putting failed txns back in queue to be retried", payload.MetaTxnID, receipt.Status)
				r.metricsCollector.TrackTxMintingDuration(receipt.Status, payload.SubmittedAt)
				UpdateCompletedTasks([]*data.Task{task})
				for i, tx := range receipt.Receipts {
					if tx.Status == relayerProto.ETHTxnStatus_SUCCEEDED.String() {
						successfullTaskIDs = append(successfullTaskIDs, payload.TaskIDs[i])
						continue
					}
					retryMintingTaskIDs = append(retryMintingTaskIDs, payload.TaskIDs[i])
				}

			default:
				logger.Error().Msgf("txnStatus: unknown status %s of metaTxn %s", receipt.Status, payload.MetaTxnID)
				UpdateFailedTasks([]*data.Task{task}, TxnStatusRetryDelay, TxnStatusMaxRetries)
				// not minted within the retry limit
				if task.Try >= uint32(TxnStatusMaxRetries) {
					retryMintingTaskIDs = append(retryMintingTaskIDs, payload.TaskIDs...)
				}
			}
		}(ctx, t)
	}

	wg.Wait()

	var mintingTasks []*data.Task
	err := data.DB.Tasks(sess).Find(db.Cond{
		"id":    db.AnyOf(successfullTaskIDs),
		"queue": db.In(ExitConquestQueue, DelayedMintingQueue),
	}).All(&mintingTasks)
	if err != nil {
		oplog.Error().Msgf("txnStatus: failed fetching tasks have delayed minting scheduled with: %v", err)
		UpdateFailedTasks(tasks, TxnStatusRetryDelay, TxnStatusMaxRetries)
		return err
	}
	for _, t := range mintingTasks {
		// workaround
		if t.CreatedAt.Compare(delayedMintingCutoff) < 0 {
			continue
		}
		err := scheduleDelayedMinting(sess, t)
		if err != nil {
			oplog.Error().Msgf("txnStatus: failed scheduling delayed minting with: %v", err)
			UpdateFailedTasks(tasks, TxnStatusRetryDelay, TxnStatusMaxRetries)
			return err
		}

		err = createDelayedMintingFeedEntry(sess, t)
		if err != nil {
			oplog.Error().Msgf("txnStatus: failed creating feed event for delayed minting: %v", err)
			UpdateFailedTasks(tasks, TxnStatusRetryDelay, TxnStatusMaxRetries)
			return err
		}
	}

	var retryMintingTasks []*data.Task
	err = data.DB.Tasks(sess).Find(db.Cond{"id": db.AnyOf(retryMintingTaskIDs)}).All(&retryMintingTasks)
	if err != nil {
		oplog.Error().Msgf("txnStatus: failed fetching tasks to be retried for metaTxns %v with: %v", retryMintingTaskIDs, err)
		UpdateFailedTasks(tasks, TxnStatusRetryDelay, TxnStatusMaxRetries)
		return err
	}
	for i := range retryMintingTasks {
		retryMintingTasks[i].Status = proto.TaskStatus_PENDING
	}
	UpdateFailedTasks(retryMintingTasks, SendTxnsRetryDelay, SendTxnsMaxRetries)
	// save updated tasks to be retried
	for _, task := range retryMintingTasks {
		err = sess.Save(task)
		if err != nil {
			oplog.Error().Msgf("failed updating task %d status with: %v", task.ID, err)
			return err
		}
	}

	return nil
}

func (r *TxnStatusRunner) getMetaTxnReceipt(ctx context.Context, metaTxnID sequence.MetaTxnID) (*relayerProto.MetaTxnReceipt, error) {
	ctx, cancel := context.WithTimeout(ctx, TxnStatusCheckTimeout*time.Second)
	defer cancel()

	// TODO: lets review relayer endpoints..
	// we discussed having .Wait() and also .Get() with different functionality..
	receipt, err := r.relayer.Service.GetMetaTxnReceipt(ctx, string(metaTxnID))
	if err != nil {
		return nil, err
	}
	return receipt, nil
}
