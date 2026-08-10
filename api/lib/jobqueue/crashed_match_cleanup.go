package jobqueue

import (
	"context"
	"time"

	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/proto"
	"github.com/rs/zerolog/log"
	"github.com/upper/db/v4"
)

const (
	CrashedMatchCleanupWorkGroup  = "crashed-match-cleanup"
	CrashedMatchCleanupRetryDelay = 60
	CrashedMatchCleanupMaxRetries = 10
)

type CrashedMatchCleanupRunner struct {
	ticker *time.Ticker
}

func (r *CrashedMatchCleanupRunner) Queues() []string {
	return []string{CrashedMatchCleanupWorkGroup}
}

func (r *CrashedMatchCleanupRunner) WorkGroup() string {
	return CrashedMatchCleanupWorkGroup
}

func (r *CrashedMatchCleanupRunner) MaxBatchSize() int {
	return 1
}

func (r *CrashedMatchCleanupRunner) Tick() <-chan time.Time {
	if r.ticker == nil {
		r.ticker = time.NewTicker(10 * time.Minute)
	}
	return r.ticker.C
}

func NewCrashedMatchCleanupRunner() (*CrashedMatchCleanupRunner, error) {
	return &CrashedMatchCleanupRunner{}, nil
}

func (r *CrashedMatchCleanupRunner) RunTasks(ctx context.Context, sess db.Session, tasks []*data.Task) error {
	oplog := log.With().Str("op", CrashedMatchCleanupWorkGroup).Logger()
	oplog.Info().Msgf("%s running", CrashedMatchCleanupWorkGroup)

	// set ended_at for matches that are not in progress and are missing this value
	_, err := sess.SQL().ExecContext(ctx, "UPDATE matches SET ended_at = COALESCE(updated_at, started_at, now()) WHERE ended_at IS NULL AND status != ?", proto.MatchStatus_IN_PROGRESS)
	if err != nil && err != db.ErrNoMoreRows {
		UpdateFailedTasks(tasks, CrashedMatchCleanupRetryDelay, CrashedMatchCleanupMaxRetries)
		return err
	}

	// set ended_at and status to crashed for matches that are in progress and haven't completed in 2 hours
	_, err = sess.SQL().ExecContext(ctx, "UPDATE matches SET ended_at = COALESCE(updated_at, started_at, now()), status = ? WHERE ended_at IS NULL AND status = ? AND started_at < NOW() - INTERVAL '2 hours'", proto.MatchStatus_CRASHED, proto.MatchStatus_IN_PROGRESS)
	if err != nil && err != db.ErrNoMoreRows {
		UpdateFailedTasks(tasks, CrashedMatchCleanupRetryDelay, CrashedMatchCleanupMaxRetries)
		return err
	}

	for _, task := range tasks {
		task.Try = 0
	}

	return nil
}
