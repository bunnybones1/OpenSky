package jobqueue

import (
	"context"
	"encoding/json"
	"time"

	"github.com/rs/zerolog/log"
	"github.com/upper/db/v4"

	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/lib/contracts"
	"github.com/horizon-games/OpenSky/api/proto"
)

const (
	StripeEventWorkGroup  = "stripe-event"
	StripeEventRetryDelay = 5 // in seconds
	StripeEventMaxRetries = 5
)

var _ Runner = &StripeEventRunner{}

type StripeEventTask struct {
	EventID string `json:"event_id"`
}

func (t StripeEventTask) Hash() string {
	return t.EventID
}

type StripeEventRunner struct {
	ticker *time.Ticker

	paymentEventHandler PaymentEventHandler
}

func NewStripeEventRunner(paymentEventHandler PaymentEventHandler) *StripeEventRunner {
	return &StripeEventRunner{
		paymentEventHandler: paymentEventHandler,
	}
}

func (r *StripeEventRunner) WorkGroup() string {
	return StripeEventWorkGroup
}

func (r *StripeEventRunner) Queues() []string {
	return []string{StripeEventWorkGroup}
}

func (r *StripeEventRunner) MaxBatchSize() int {
	return 10
}

func (r *StripeEventRunner) Tick() <-chan time.Time {
	if r.ticker == nil {
		r.ticker = time.NewTicker(5 * time.Second)
	}

	return r.ticker.C
}

func (r *StripeEventRunner) RunTasks(ctx context.Context, sess db.Session, tasks []*data.Task) error {
	for _, task := range tasks {
		var taskPayload StripeEventTask

		err := json.Unmarshal(task.Payload, &taskPayload)
		if err != nil {
			UpdateFailedTasks([]*data.Task{task}, StripeEventRetryDelay, StripeEventMaxRetries)
			log.Err(err).Msgf("decode task payload")

			continue
		}

		err = r.paymentEventHandler.HandleStripeEvent(ctx, taskPayload.EventID)
		if err != nil {
			UpdateFailedTasks([]*data.Task{task}, StripeEventRetryDelay, StripeEventMaxRetries)
			log.Err(err).Msgf("handle Stripe event, id: %s", taskPayload.EventID)

			continue
		}

		// Set task as completed.
		task.Status = proto.TaskStatus_COMPLETED
	}

	return nil
}

// PaymentEventHandler handles events from payment providers.
//
//go:generate go run go.uber.org/mock/mockgen -destination ./mock/payment_event_handler.go -package mock . PaymentEventHandler
type PaymentEventHandler interface {
	HandleStripeEvent(ctx context.Context, eventID string) error
	HandleOnChainItemPurchaseEvent(ctx context.Context, txHash proto.Hash, transferEvent *contracts.ERC20TransferEvent, itemPurchaseEvent *contracts.PaymentProxyItemPurchaseEvent) error
	HandleOnChainItemBurnEvent(ctx context.Context, txHash proto.Hash, transferBatchEvent *contracts.ERC1155TransferBatchEvent, itemBurnEvent *contracts.PaymentProxyItemBurnEvent) error
}
