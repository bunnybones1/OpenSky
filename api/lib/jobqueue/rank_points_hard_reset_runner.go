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
	RankPointsHardResetGroup      = "rank-points-hard-reset"
	RankPointsHardResetRetryDelay = 5 * 60 // in seconds
	RankPointsHardResetMaxRetries = 5
)

type RankPointsHardResetTask struct {
	Season uint16 `json:"season"`
}

func (t RankPointsHardResetTask) Hash() string {
	return fmt.Sprintf("%d", t.Season)
}

type RankPointsHardResetRunner struct {
	ticker *time.Ticker
}

func (r *RankPointsHardResetRunner) WorkGroup() string {
	return RankPointsHardResetGroup
}

func (r *RankPointsHardResetRunner) Queues() []string {
	return []string{RankPointsHardResetGroup}
}

func (r *RankPointsHardResetRunner) MaxBatchSize() int {
	return 1
}

func (r *RankPointsHardResetRunner) Tick() <-chan time.Time {
	if r.ticker == nil {
		r.ticker = time.NewTicker(10 * time.Minute)
	}
	return r.ticker.C
}

func NewRankPointsHardResetRunner() (*RankPointsHardResetRunner, error) {
	return &RankPointsHardResetRunner{}, nil
}

func (r *RankPointsHardResetRunner) RunTasks(ctx context.Context, sess db.Session, tasks []*data.Task) error {
	task := tasks[0]

	var payload RankPointsHardResetTask

	if err := json.Unmarshal(task.Payload, &payload); err != nil {
		log.Error().Msgf("failed unmarshaling payload with: %v", err)
		return errors.Wrap(err, "error unmarshaling payload")
	}

	season := payload.Season
	if season < 1 {
		return errors.New("invalid season")
	}

	monthlyHardReset := rankupTasks.NewMonthlyHardResetTask()
	err := monthlyHardReset.Reset(ctx, sess, season)
	if err != nil {
		UpdateFailedTasks(tasks, RankPointsHardResetRetryDelay, RankPointsHardResetMaxRetries)
		return errors.Wrap(err, "error setting monthly hard reset")
	}

	// set task as completed
	task.Status = proto.TaskStatus_COMPLETED

	return nil
}
