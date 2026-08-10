package jobqueue

import (
	"context"
	"crypto/sha1"
	"encoding/json"
	"fmt"
	"math/big"
	"time"

	"github.com/rs/zerolog/log"
	"github.com/upper/db/v4"

	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/proto"
)

const (
	GiveawayOffChainTokensWorkGroup  = "giveaway-offchain-tokens"
	GiveawayOffChainTokensRetryDelay = 5 // in seconds
	GiveawayOffChainTokensMaxRetries = 5
)

var _ Runner = &GiveawayOffChainTokensRunner{}

// GiveawayOffChainTokensTask is used to give away off-chain tokens in mass.
type GiveawayOffChainTokensTask struct {
	AccountID      proto.AccountID `json:"account_id"`
	AccountAddress proto.Hash

	// Tokens is a map of ItemType:ItemID:amount
	Tokens map[proto.ItemType]map[uint64]uint64

	// CreatedAt is used to make sure the task hash is unique.
	CreatedAt time.Time
}

func (t GiveawayOffChainTokensTask) Hash() string {
	h := sha1.New()
	h.Write([]byte(fmt.Sprintf("%d", t.AccountID)))
	h.Write([]byte(t.CreatedAt.String()))

	for itemType, items := range t.Tokens {
		for itemID, amount := range items {
			h.Write([]byte(fmt.Sprintf("%s-%d-%d", itemType, itemID, amount)))
		}
	}

	sh := h.Sum(nil)

	return fmt.Sprintf("%x", sh)
}

type GiveawayOffChainTokensRunner struct {
	ticker *time.Ticker
}

func NewGiveawayOffChainTokensRunner() *GiveawayOffChainTokensRunner {
	return &GiveawayOffChainTokensRunner{}
}

func (r *GiveawayOffChainTokensRunner) WorkGroup() string {
	return GiveawayOffChainTokensWorkGroup
}

func (r *GiveawayOffChainTokensRunner) Queues() []string {
	return []string{GiveawayOffChainTokensWorkGroup}
}

func (r *GiveawayOffChainTokensRunner) MaxBatchSize() int {
	return 500
}

func (r *GiveawayOffChainTokensRunner) Tick() <-chan time.Time {
	if r.ticker == nil {
		r.ticker = time.NewTicker(time.Minute)
	}

	return r.ticker.C
}

func (r *GiveawayOffChainTokensRunner) RunTasks(_ context.Context, sess db.Session, tasks []*data.Task) error {
	for _, task := range tasks {
		var taskPayload GiveawayOffChainTokensTask

		if err := json.Unmarshal(task.Payload, &taskPayload); err != nil {
			log.Err(err).Msg("decode task payload")
			UpdateFailedTasks([]*data.Task{task}, 0, 0)

			continue
		}

		accountID, err := getAccountID(sess, taskPayload.AccountID, taskPayload.AccountAddress)
		if err != nil {
			log.Err(err).Msgf("get account ID")
			UpdateFailedTasks([]*data.Task{task}, 0, 0)

			return fmt.Errorf("get account ID: %w", err)
		}

		if len(taskPayload.Tokens) == 0 {
			log.Error().Msg("no tokens in the GiveawayOffChainTokensTask")
			UpdateFailedTasks([]*data.Task{task}, 0, 0)

			continue
		}

		for itemType, items := range taskPayload.Tokens {
			if len(items) == 0 {
				log.Warn().Msgf("no items in the GiveawayOffChainTokensTask, item type: %s", itemType)
				continue
			}

			for itemID, amount := range items {
				tokenID := data.ItemTypeAndID2SWTokenID(itemType, itemID)

				err := data.DB.Items(sess).GainToken(
					accountID,
					tokenID,
					big.NewInt(int64(amount)),
					proto.TransactionType_GIVEAWAY,
					"",
				)
				if err != nil {
					log.Err(err).Msg("gain token")
					UpdateFailedTasks([]*data.Task{task}, GiveawayOffChainTokensRetryDelay, GiveawayOffChainTokensMaxRetries)

					return fmt.Errorf("gain token: %w", err)
				}
			}
		}

		UpdateCompletedTasks([]*data.Task{task})
	}

	return nil
}
