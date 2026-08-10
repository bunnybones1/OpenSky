package jobqueue

import (
	"context"
	"time"

	"github.com/horizon-games/OpenSky/api/data"
	"github.com/upper/db/v4"
)

// MatchSignalsRunner is responsible for processing tasks related to account health
// Right now it's only creation of signals to be acted upon by moderators, but
// in the future it will issue bans on it's own in obvious cases.

var _ Runner = &MatchSignalsRunner{}

const (
	MatchSignalsWorkGroup  = "match-signals"
	MatchSignalsRetryDelay = 60 // in seconds
	MatchSignalsMaxRetries = 5
)

type MatchSignalsRunner struct {
	ticker *time.Ticker
}

func (r *MatchSignalsRunner) WorkGroup() string {
	return MatchSignalsWorkGroup
}

func (r *MatchSignalsRunner) Queues() []string {
	return []string{
		UpdateOwnershipStatsQueue,
		UpdateMatchStatsQueue,
	}
}

func (r *MatchSignalsRunner) MaxBatchSize() int {
	return 50
}

func (r *MatchSignalsRunner) Tick() <-chan time.Time {
	if r.ticker == nil {
		r.ticker = time.NewTicker(time.Minute)
	}
	return r.ticker.C
}

func NewMatchSignalsRunner() (*MatchSignalsRunner, error) {
	return &MatchSignalsRunner{}, nil
}

func (r *MatchSignalsRunner) RunTasks(ctx context.Context, sess db.Session, tasks []*data.Task) error {
	var err error

	for _, task := range tasks {

		switch task.Queue {
		case UpdateMatchStatsQueue:
			err = updateMatchStats(ctx, sess, task)

		case UpdateOwnershipStatsQueue:
			err = updateOwnershipStats(ctx, sess, task)
		}

		if err != nil {
			UpdateFailedTasks([]*data.Task{task}, MatchSignalsRetryDelay, MatchSignalsMaxRetries)
			return err
		}
		UpdateCompletedTasks([]*data.Task{task})
	}

	return nil
}
