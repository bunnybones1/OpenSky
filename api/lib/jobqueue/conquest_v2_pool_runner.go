package jobqueue

import (
	"context"
	"fmt"
	"time"

	"github.com/upper/db/v4"

	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/proto"
)

var _ Runner = &ConquestV2PoolRunner{}

// ConquestV2PoolRecalculateTask handles recalculating Conquest V2 pool.
// It is used after the weekly rewards distribution and conquest points reset.
type ConquestV2PoolRecalculateTask struct {
	CreatedAt time.Time `json:"created_at"`
}

func (t ConquestV2PoolRecalculateTask) Hash() string {
	return fmt.Sprintf("recalculate-%d", t.CreatedAt.Unix())
}

const (
	ConquestV2PoolWorkGroup  = "conquest-v2-pool"
	ConquestV2PoolRetryDelay = 60 // in seconds
	ConquestV2PoolMaxRetries = 5
)

type ConquestV2PoolRunner struct {
	ticker      *time.Ticker
	poolManager ConquestV2PoolManager
}

// NewConquestV2PoolRunner instantiates a new ConquestV2PoolRunner.
func NewConquestV2PoolRunner(poolManager ConquestV2PoolManager) (*ConquestV2PoolRunner, error) {
	return &ConquestV2PoolRunner{
		poolManager: poolManager,
	}, nil
}

func (r *ConquestV2PoolRunner) WorkGroup() string {
	return ConquestV2PoolWorkGroup
}

func (r *ConquestV2PoolRunner) Queues() []string {
	return []string{ConquestV2PoolWorkGroup}
}

func (r *ConquestV2PoolRunner) MaxBatchSize() int {
	return 1
}

func (r *ConquestV2PoolRunner) Tick() <-chan time.Time {
	if r.ticker == nil {
		r.ticker = time.NewTicker(time.Minute)
	}

	return r.ticker.C
}

func (r *ConquestV2PoolRunner) RunTasks(ctx context.Context, _ db.Session, tasks []*data.Task) error {
	task := tasks[0]

	err := r.poolManager.RecalculatePool(ctx)
	if err != nil {
		UpdateFailedTasks(tasks, ConquestV2PoolRetryDelay, ConquestV2PoolMaxRetries)
		return fmt.Errorf("recalculate pool: %w", err)
	}

	// Set task as completed.
	task.Status = proto.TaskStatus_COMPLETED

	return nil
}
