package jobqueue

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/horizon-games/OpenSky/api/data"
	rankupTasks "github.com/horizon-games/OpenSky/api/lib/rankup/tasks"
	"github.com/horizon-games/OpenSky/api/proto"
	"github.com/pkg/errors"
	"github.com/rs/zerolog/log"
	"github.com/upper/db/v4"
)

const (
	RankPointsSoftResetGroup      = "rank-points-soft-reset"
	RankPointsSoftResetRetryDelay = 5 * 60 // in seconds
	RankPointsSoftResetMaxRetries = 5
)

type RankPointsSoftResetTask struct {
	Season uint16 `json:"season"`
	Week   uint8  `json:"week"`
}

func (t RankPointsSoftResetTask) Hash() string {
	return fmt.Sprintf("%d.%d", t.Season, t.Week)
}

type RankPointsSoftResetRunner struct {
	ticker *time.Ticker
}

func (r *RankPointsSoftResetRunner) WorkGroup() string {
	return RankPointsSoftResetGroup
}

func (r *RankPointsSoftResetRunner) Queues() []string {
	return []string{RankPointsSoftResetGroup}
}

func (r *RankPointsSoftResetRunner) MaxBatchSize() int {
	return 1
}

func (r *RankPointsSoftResetRunner) Tick() <-chan time.Time {
	if r.ticker == nil {
		r.ticker = time.NewTicker(10 * time.Minute)
	}
	return r.ticker.C
}

func NewRankPointsSoftResetRunner() (*RankPointsSoftResetRunner, error) {
	return &RankPointsSoftResetRunner{}, nil
}

func (r *RankPointsSoftResetRunner) RunTasks(ctx context.Context, sess db.Session, tasks []*data.Task) error {
	task := tasks[0]

	var payload RankPointsSoftResetTask

	if err := json.Unmarshal(task.Payload, &payload); err != nil {
		log.Error().Msgf("failed unmarshaling payload with: %v", err)
		return errors.Wrap(err, "error unmarshaling payload")
	}

	season, week := payload.Season, payload.Week
	if season < 1 {
		return errors.New("invalid season")
	}
	if week >= 4 {
		return errors.New("invalid week")
	}

	weeklySoftReset := rankupTasks.NewWeeklySoftResetTask()
	err := weeklySoftReset.Reset(ctx, sess, season, week)
	if err != nil {
		UpdateFailedTasks(tasks, RankPointsSoftResetRetryDelay, RankPointsSoftResetMaxRetries)
		return errors.Wrap(err, "error setting weekly soft reset")
	}

	// set task as completed
	task.Status = proto.TaskStatus_COMPLETED

	return nil
}
