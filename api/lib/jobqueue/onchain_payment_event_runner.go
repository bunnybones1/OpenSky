package jobqueue

import (
	"context"
	"crypto/sha1"
	"encoding/json"
	"fmt"
	"math/big"
	"strconv"
	"time"

	"github.com/rs/zerolog/log"
	"github.com/upper/db/v4"

	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/lib/contracts"
	"github.com/horizon-games/OpenSky/api/proto"
)

const (
	OnChainPaymentEventWorkGroup  = "onchain-payment-event"
	OnChainPaymentEventRetryDelay = 5 // in seconds
	OnChainPaymentEventMaxRetries = 5
)

var _ Runner = &OnChainPaymentEventRunner{}

type OnChainPaymentEventTask struct {
	TxHash             proto.Hash
	BlockNumber        *big.Int
	TxIndex            uint
	EventIndex         uint
	TransferEvent      *contracts.ERC20TransferEvent
	ItemPurchaseEvent  *contracts.PaymentProxyItemPurchaseEvent
	TransferBatchEvent *contracts.ERC1155TransferBatchEvent
	ItemBurnEvent      *contracts.PaymentProxyItemBurnEvent
}

func (t OnChainPaymentEventTask) Hash() string {
	h := sha1.New()

	h.Write([]byte(t.TxHash))
	h.Write([]byte(strconv.Itoa(int(t.EventIndex))))

	sh := h.Sum(nil)

	return fmt.Sprintf("%x", sh)
}

type OnChainPaymentEventRunner struct {
	paymentEventHandler PaymentEventHandler

	ticker *time.Ticker
}

func NewOnChainPaymentEventRunner(paymentEventHandler PaymentEventHandler) *OnChainPaymentEventRunner {
	return &OnChainPaymentEventRunner{
		paymentEventHandler: paymentEventHandler,
	}
}

func (r *OnChainPaymentEventRunner) WorkGroup() string {
	return OnChainPaymentEventWorkGroup
}

func (r *OnChainPaymentEventRunner) Queues() []string {
	return []string{OnChainPaymentEventWorkGroup}
}

func (r *OnChainPaymentEventRunner) MaxBatchSize() int {
	return 10
}

func (r *OnChainPaymentEventRunner) Tick() <-chan time.Time {
	if r.ticker == nil {
		r.ticker = time.NewTicker(10 * time.Second)
	}

	return r.ticker.C
}

func (r *OnChainPaymentEventRunner) RunTasks(ctx context.Context, _ db.Session, tasks []*data.Task) error {
	for _, task := range tasks {
		var taskPayload OnChainPaymentEventTask

		if err := json.Unmarshal(task.Payload, &taskPayload); err != nil {
			UpdateFailedTasks([]*data.Task{task}, 0, 0)
			log.Err(err).Msgf("decode task payload")

			continue
		}

		if !taskPayload.TxHash.IsValidTxnHash() {
			UpdateFailedTasks([]*data.Task{task}, 0, 0)
			log.Error().Msgf("on-chain payment event has invalid tx hash, tx: %s", taskPayload.TxHash)

			continue
		}

		if taskPayload.ItemPurchaseEvent == nil && taskPayload.ItemBurnEvent == nil {
			UpdateFailedTasks([]*data.Task{task}, 0, 0)
			log.Error().Msgf("on-chain payment event has nil item purchase and item burn events, tx: %s", taskPayload.TxHash)

			continue
		}

		if taskPayload.ItemPurchaseEvent != nil && taskPayload.ItemBurnEvent != nil {
			UpdateFailedTasks([]*data.Task{task}, 0, 0)
			log.Error().Msgf("on-chain payment event has both item purchase and item burn events, tx: %s", taskPayload.TxHash)

			continue
		}

		if taskPayload.ItemPurchaseEvent != nil {
			if taskPayload.TransferEvent == nil {
				UpdateFailedTasks([]*data.Task{task}, 0, 0)
				log.Error().Msgf("on-chain payment event has nil transfer event, tx: %s", taskPayload.TxHash)

				continue
			}

			err := r.paymentEventHandler.HandleOnChainItemPurchaseEvent(ctx, taskPayload.TxHash, taskPayload.TransferEvent, taskPayload.ItemPurchaseEvent)
			if err != nil {
				UpdateFailedTasks([]*data.Task{task}, OnChainPaymentEventRetryDelay, OnChainPaymentEventMaxRetries)
				log.Err(err).Msgf("handle on-chain item purchase event, id: %s", taskPayload.TxHash)

				continue
			}
		}

		if taskPayload.ItemBurnEvent != nil {
			if taskPayload.TransferBatchEvent == nil {
				UpdateFailedTasks([]*data.Task{task}, 0, 0)
				log.Error().Msgf("on-chain payment event has nil transfer batch event, tx: %s", taskPayload.TxHash)

				continue
			}

			err := r.paymentEventHandler.HandleOnChainItemBurnEvent(ctx, taskPayload.TxHash, taskPayload.TransferBatchEvent, taskPayload.ItemBurnEvent)
			if err != nil {
				UpdateFailedTasks([]*data.Task{task}, OnChainPaymentEventRetryDelay, OnChainPaymentEventMaxRetries)
				log.Err(err).Msgf("handle on-chain item burn event, id: %s", taskPayload.TxHash)

				continue
			}
		}

		// Set task as completed.
		task.Status = proto.TaskStatus_COMPLETED
	}

	return nil
}
