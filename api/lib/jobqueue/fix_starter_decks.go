package jobqueue

import (
	"context"
	"crypto/sha1"
	"encoding/json"
	"fmt"
	"time"

	"github.com/0xsequence/go-sequence/lib/prototyp"
	"github.com/rs/zerolog/log"
	"github.com/scylladb/go-set/u64set"
	"github.com/upper/db/v4"

	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/proto"
)

const (
	FixStarterDecksWorkGroup  = "fix-starter-decks"
	FixStarterDecksRetryDelay = 5 // in seconds
	FixStarterDecksMaxRetries = 5
)

var _ Runner = &FixStarterDecksRunner{}

// FixStarterDecksTask is used to fix missing base cards from unlocked starter decks.
type FixStarterDecksTask struct {
	AccountID      proto.AccountID `json:"account_id"`
	AccountAddress proto.Hash

	// CreatedAt is used to make sure the task hash is unique.
	CreatedAt time.Time
}

func (t FixStarterDecksTask) Hash() string {
	h := sha1.New()
	h.Write([]byte(fmt.Sprintf("%d", t.AccountID)))
	h.Write([]byte(t.CreatedAt.String()))

	sh := h.Sum(nil)

	return fmt.Sprintf("%x", sh)
}

type FixStarterDecksRunner struct {
	ticker *time.Ticker
}

func NewFixStarterDecksRunner() *FixStarterDecksRunner {
	return &FixStarterDecksRunner{}
}

func (r *FixStarterDecksRunner) WorkGroup() string {
	return FixStarterDecksWorkGroup
}

func (r *FixStarterDecksRunner) Queues() []string {
	return []string{FixStarterDecksWorkGroup}
}

func (r *FixStarterDecksRunner) MaxBatchSize() int {
	return 10
}

func (r *FixStarterDecksRunner) Tick() <-chan time.Time {
	if r.ticker == nil {
		r.ticker = time.NewTicker(time.Minute)
	}

	return r.ticker.C
}

func (r *FixStarterDecksRunner) RunTasks(_ context.Context, sess db.Session, tasks []*data.Task) error {
	for _, task := range tasks {
		var taskPayload FixStarterDecksTask

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

		var decks []*data.Deck

		err = data.DB.Decks(sess).Find(db.Cond{
			"account_id": accountID,
			"deck_type":  proto.DeckType_UNLOCKED_STARTER,
		}).All(&decks)
		if err != nil {
			UpdateFailedTasks([]*data.Task{task}, FixStarterDecksRetryDelay, FixStarterDecksMaxRetries)
			return fmt.Errorf("find decks: %w", err)
		}

		for _, deck := range decks {
			var items []*data.Item

			err := data.DB.Items(sess).Find(db.Cond{
				"account_id": accountID,
				"item_type":  proto.ItemType_SW_BASE_CARDS,
				"token_id":   db.AnyOf(deck.CardIDs),
			}).All(&items)
			if err != nil {
				UpdateFailedTasks([]*data.Task{task}, FixStarterDecksRetryDelay, FixStarterDecksMaxRetries)
				return fmt.Errorf("find items: %w", err)
			}

			if len(items) == len(deck.CardIDs) {
				continue
			}

			existingTokenIDs := u64set.New()

			for _, item := range items {
				existingTokenIDs.Add(item.TokenID)
			}

			for _, cardID := range deck.CardIDs {
				if existingTokenIDs.Has(cardID) {
					continue
				}

				newItem := &data.Item{Item: &proto.Item{
					AccountID: accountID,
					ItemType:  proto.ItemType_SW_BASE_CARDS,
					TokenID:   cardID,
					Balance:   prototyp.NewBigInt(1),
				}}

				if err := sess.Save(newItem); err != nil {
					return fmt.Errorf("save item: %w", err)
				}
			}
		}

		task.Status = proto.TaskStatus_COMPLETED
	}

	return nil
}
