package jobqueue

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/rs/zerolog/log"
	"github.com/upper/db/v4"

	"github.com/horizon-games/OpenSky/api/data"
)

const (
	DeckRankUpdateWorkGroup  = "deck-rank-update"
	DeckRankUpdateRetryDelay = 5 // in seconds
	DeckRankUpdateMaxRetries = 5
)

var _ Runner = &DeckRankUpdateRunner{}

type DeckRankUpdateTask struct {
	MatchID uint64 `json:"match_id"`
	Season  uint16 `json:"season"`
}

func (t DeckRankUpdateTask) Hash() string {
	return fmt.Sprintf("%d", t.MatchID)
}

type DeckRankUpdateRunner struct {
	deckRankUpdater DeckRankUpdater

	ticker *time.Ticker
}

func NewDeckRankUpdateRunner(deckRankUpdater DeckRankUpdater) *DeckRankUpdateRunner {
	return &DeckRankUpdateRunner{
		deckRankUpdater: deckRankUpdater,
	}
}

func (r *DeckRankUpdateRunner) WorkGroup() string {
	return DeckRankUpdateWorkGroup
}

func (r *DeckRankUpdateRunner) Queues() []string {
	return []string{DeckRankUpdateWorkGroup}
}

func (r *DeckRankUpdateRunner) MaxBatchSize() int {
	return 5
}

func (r *DeckRankUpdateRunner) Tick() <-chan time.Time {
	if r.ticker == nil {
		r.ticker = time.NewTicker(time.Minute)
	}

	return r.ticker.C
}

func (r *DeckRankUpdateRunner) RunTasks(_ context.Context, sess db.Session, tasks []*data.Task) error {
	for _, task := range tasks {
		var taskPayload DeckRankUpdateTask

		if err := json.Unmarshal(task.Payload, &taskPayload); err != nil {
			log.Err(err).Msg("decode task payload")
			UpdateFailedTasks([]*data.Task{task}, 0, 0)

			continue
		}

		match, err := data.DB.Matches(sess).FindByID(taskPayload.MatchID)
		if err != nil && !errors.Is(err, db.ErrNoMoreRows) {
			log.Err(err).Msg("find match")
			UpdateFailedTasks([]*data.Task{task}, DeckRankUpdateRetryDelay, DeckRankUpdateMaxRetries)

			continue
		}

		if match == nil || errors.Is(err, db.ErrNoMoreRows) {
			log.Error().Msgf("match %d does not exist", taskPayload.MatchID)
			UpdateFailedTasks([]*data.Task{task}, 0, 0)

			continue
		}

		if err := r.deckRankUpdater.UpdateFromMatch(sess, match, taskPayload.Season); err != nil {
			log.Err(err).Msg("update deck rank from match")
			UpdateFailedTasks([]*data.Task{task}, DeckRankUpdateRetryDelay, DeckRankUpdateMaxRetries)

			continue
		}

		UpdateCompletedTasks([]*data.Task{task})
	}

	return nil
}

//go:generate go run go.uber.org/mock/mockgen -destination ./mock/deck_rank_updater.go -package mock . DeckRankUpdater
type DeckRankUpdater interface {
	UpdateFromMatch(sess db.Session, match *data.Match, season uint16) error
}
