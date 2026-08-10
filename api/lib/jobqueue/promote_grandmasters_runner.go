package jobqueue

import (
	"context"
	"fmt"
	"time"

	"encoding/json"

	"github.com/upper/db/v4"

	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/proto"
)

const (
	PromoteGrandmastersWorkGroup  = "promote-grandmasters"
	PromoteGrandmastersRetryDelay = 15 // seconds
	PromoteGrandmastersMaxRetries = 5
)

type PromoteGrandmastersTask struct {
	Season   uint16         `json:"season"`
	GameMode proto.GameMode `json:"game_mode"`
	MatchID  uint64         `json:"match_id"`
}

func (t PromoteGrandmastersTask) Hash() string {
	return fmt.Sprintf("%v.%d.%d", t.GameMode, t.Season, t.MatchID)
}

type PromoteGrandmastersRunner struct {
	grandmastersUpdater GrandmasterUpdater

	ticker *time.Ticker
}

func (r *PromoteGrandmastersRunner) WorkGroup() string {
	return PromoteGrandmastersWorkGroup
}

func (r *PromoteGrandmastersRunner) Queues() []string {
	return []string{PromoteGrandmastersWorkGroup}
}

func (r *PromoteGrandmastersRunner) MaxBatchSize() int {
	return 1
}

func (r *PromoteGrandmastersRunner) Tick() <-chan time.Time {
	if r.ticker == nil {
		r.ticker = time.NewTicker(30 * time.Second)
	}

	return r.ticker.C
}

func NewPromoteGrandmastersRunner(updater GrandmasterUpdater) *PromoteGrandmastersRunner {
	return &PromoteGrandmastersRunner{
		grandmastersUpdater: updater,
	}
}

func (r *PromoteGrandmastersRunner) RunTasks(ctx context.Context, sess db.Session, tasks []*data.Task) error {
	for _, task := range tasks {
		if err := r.promoteGrandmasters(ctx, sess, task); err != nil {
			UpdateFailedTasks([]*data.Task{task}, PromoteGrandmastersRetryDelay, PromoteGrandmastersMaxRetries)
			return err
		}

		task.Status = proto.TaskStatus_COMPLETED
	}

	return nil
}

func (r *PromoteGrandmastersRunner) promoteGrandmasters(ctx context.Context, sess db.Session, task *data.Task) error {
	var payload PromoteGrandmastersTask

	if err := json.Unmarshal(task.Payload, &payload); err != nil {
		return fmt.Errorf("decode payload: %w", err)
	}

	err := data.DB.TxContext(ctx, func(tx db.Session) error {
		return r.grandmastersUpdater.Update(sess, payload.GameMode, payload.Season)
	}, nil)

	return err
}

type GrandmasterUpdater interface {
	Update(sess db.Session, gameMode proto.GameMode, season uint16) error
}
