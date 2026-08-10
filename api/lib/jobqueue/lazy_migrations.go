package jobqueue

import (
	"context"
	"crypto/sha1"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/upper/db/v4"

	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/proto"
)

const (
	LazyMigrationQueue      = "lazy-migration"
	LazyMigrationRetryDelay = 60 // in seconds
	LazyMigrationMaxRetries = 5

	StarterDeckMigration   = "starter-deck-migration"
	StarterDeckV2Migration = "starter-deck-v2-migration"
)

type LazyMigrationTask struct {
	AccountID      proto.AccountID `json:"account_id"`
	AccountAddress proto.Hash      `json:"account_address"`
	Migration      string          `json:"migration"`
}

func (t LazyMigrationTask) Hash() string {
	h := sha1.New()
	h.Write([]byte(fmt.Sprintf("%d", t.AccountID)))
	h.Write([]byte(t.Migration))

	sh := h.Sum(nil)

	return fmt.Sprintf("%x", sh)
}

type LazyMigrationRunner struct {
	ticker *time.Ticker
}

func (r *LazyMigrationRunner) WorkGroup() string {
	return LazyMigrationQueue
}

func (r *LazyMigrationRunner) Queues() []string {
	return []string{
		LazyMigrationQueue,
	}
}

func (r *LazyMigrationRunner) MaxBatchSize() int {
	return 50
}

func (r *LazyMigrationRunner) Tick() <-chan time.Time {
	if r.ticker == nil {
		r.ticker = time.NewTicker(time.Minute)
	}
	return r.ticker.C
}

func NewLazyMigrationRunner() *LazyMigrationRunner {
	return &LazyMigrationRunner{}
}

func (r *LazyMigrationRunner) RunTasks(_ context.Context, sess db.Session, tasks []*data.Task) error {
	for _, task := range tasks {
		var payload *LazyMigrationTask

		err := json.Unmarshal(task.Payload, &payload)
		if err != nil {
			UpdateFailedTasks([]*data.Task{task}, 0, 0)
			return fmt.Errorf("decode task payload: %w", err)
		}

		switch payload.Migration {
		case StarterDeckMigration:
			UpdatePausedTasks([]*data.Task{task})
			continue
		case StarterDeckV2Migration:
			if err := r.starterDeckV2Migration(sess, payload); err != nil {
				UpdateFailedTasks([]*data.Task{task}, LazyMigrationRetryDelay, LazyMigrationMaxRetries)
				return fmt.Errorf("starter deck v2 migration: %w", err)
			}
		default:
			UpdateFailedTasks([]*data.Task{task}, 0, 0)
			return fmt.Errorf("unknown lazy migration: %s", payload.Migration)
		}

		UpdateCompletedTasks([]*data.Task{task})
	}

	return nil
}

func (r *LazyMigrationRunner) starterDeckV2Migration(sess db.Session, payload *LazyMigrationTask) error {
	accountID, err := getAccountID(sess, payload.AccountID, payload.AccountAddress)
	if err != nil {
		return fmt.Errorf("get account ID: %w", err)
	}

	if err := r.addHeroAda(sess, accountID); err != nil {
		return fmt.Errorf("add hero Ada: %w", err)
	}

	if err := r.removeLockedDecks(sess, accountID); err != nil {
		return fmt.Errorf("remove locked decks: %w", err)
	}

	if err := r.changeTypeForUnlockedDecks(sess, accountID); err != nil {
		return fmt.Errorf("change type for unlocked decks: %w", err)
	}

	if err := data.CreateStarterDecks(sess, accountID); err != nil {
		return fmt.Errorf("create starter decks: %w", err)
	}

	if err := r.unlockStarterDecks(sess, accountID); err != nil {
		return fmt.Errorf("unlock starter decks: %w", err)
	}

	return nil
}

func (r *LazyMigrationRunner) addHeroAda(sess db.Session, accountID proto.AccountID) error {
	item, err := data.DB.Items(sess).FindAccountItem(accountID, proto.ItemType_SW_HERO, uint64(proto.Hero_ADA))
	if err != nil && !errors.Is(err, db.ErrNoMoreRows) {
		return fmt.Errorf("find hero: %w", err)
	}

	if item != nil {
		return nil
	}

	if err := data.UnlockHero(sess, accountID, proto.Hero_ADA); err != nil {
		return fmt.Errorf("unlock hero: %w", err)
	}

	return nil
}

func (r *LazyMigrationRunner) removeLockedDecks(sess db.Session, accountID proto.AccountID) error {
	err := data.DB.Decks(sess).Find(db.Cond{
		"account_id": accountID,
		"deck_type":  proto.DeckType_LOCKED_STARTER,
	}).Delete()
	if err != nil {
		return fmt.Errorf("delete locked decks: %w", err)
	}

	return nil
}

func (r *LazyMigrationRunner) changeTypeForUnlockedDecks(sess db.Session, accountID proto.AccountID) error {
	err := data.DB.Decks(sess).Find(db.Cond{
		"account_id": accountID,
		"deck_type":  proto.DeckType_UNLOCKED_STARTER,
	}).Update(db.Cond{
		"deck_type": proto.DeckType_CUSTOM,
	})
	if err != nil {
		return fmt.Errorf("change deck type: %w", err)
	}

	return nil
}

func (r *LazyMigrationRunner) unlockStarterDecks(sess db.Session, accountID proto.AccountID) error {
	var events []*proto.FeedEvent

	items, err := data.DB.Items(sess).FindAccountItems(accountID, proto.ItemType_SW_HERO)
	if err != nil {
		return fmt.Errorf("find heroes: %w", err)
	}

	unlockedHeroes := map[proto.DeckClass]struct{}{}

	for _, item := range items {
		unlockedHeroes[data.HeroDeckClass(proto.Hero(item.TokenID))] = struct{}{}
	}

	decks := data.GetStarterDecks()

	for _, deck := range decks {
		if deck.DeckType == proto.DeckType_UNLOCKED_STARTER {
			continue
		}

		if _, ok := unlockedHeroes[deck.Class]; ok {
			deckEvents, _, err := data.UnlockStarterDeckByDeckClass(sess, accountID, deck.Class)
			if err != nil {
				return fmt.Errorf("unlock starter deck %s: %w", deck.Class, err)
			}

			events = append(events, deckEvents...)
		}
	}

	for _, event := range events {
		if err := sess.Save(&data.FeedEvent{FeedEvent: event}); err != nil {
			return fmt.Errorf("save event: %w", err)
		}
	}

	return nil
}
