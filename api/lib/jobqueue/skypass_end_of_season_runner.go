package jobqueue

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/upper/db/v4"

	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/proto"
)

type SkypassEndOfSeasonTask struct {
	Season uint16 `json:"season"`
}

func (t SkypassEndOfSeasonTask) Hash() string {
	return fmt.Sprintf("%d", t.Season)
}

const (
	SkypassEndOfSeasonWorkGroup  = "skypass-end-of-season"
	SkypassEndOfSeasonRetryDelay = 5 // in seconds
	SkypassEndOfSeasonMaxRetries = 5
)

type SkypassEndOfSeasonRunner struct {
	ticker *time.Ticker
}

func NewSkypassEndOfSeasonRunner() *SkypassEndOfSeasonRunner {
	return &SkypassEndOfSeasonRunner{}
}

func (r *SkypassEndOfSeasonRunner) WorkGroup() string {
	return SkypassEndOfSeasonWorkGroup
}

func (r *SkypassEndOfSeasonRunner) Queues() []string {
	return []string{SkypassEndOfSeasonWorkGroup}
}

func (r *SkypassEndOfSeasonRunner) MaxBatchSize() int {
	return 1
}

func (r *SkypassEndOfSeasonRunner) Tick() <-chan time.Time {
	if r.ticker == nil {
		r.ticker = time.NewTicker(time.Minute)
	}

	return r.ticker.C
}

func (r *SkypassEndOfSeasonRunner) RunTasks(ctx context.Context, sess db.Session, tasks []*data.Task) error {
	task := tasks[0]

	var taskPayload SkypassEndOfSeasonTask

	if err := json.Unmarshal(task.Payload, &taskPayload); err != nil {
		UpdateFailedTasks(tasks, SkypassEndOfSeasonRetryDelay, SkypassEndOfSeasonMaxRetries)
		return fmt.Errorf("decode task payload: %w", err)
	}

	var seasonStats []*data.SkypassSeasonStat

	err := data.DB.SkypassSeasonStats(sess).Find(db.And(
		db.Cond{"season": taskPayload.Season},
		db.Raw("achieved_account_level > initial_account_level"),
	)).All(&seasonStats)
	if err != nil {
		UpdateFailedTasks(tasks, SkypassEndOfSeasonRetryDelay, SkypassEndOfSeasonMaxRetries)
		return fmt.Errorf("fetch skypass season stats: %w", err)
	}

	for _, seasonStat := range seasonStats {
		err := data.DB.Tasks(sess).EnqueueTaskIgnoringDuplicates(SkypassAutoClaimWorkGroup, SkypassAutoClaimTask{
			AccountID: seasonStat.AccountID,
			Season:    seasonStat.Season,
		}, nil, &seasonStat.AccountID)
		if err != nil {
			UpdateFailedTasks(tasks, SkypassEndOfSeasonRetryDelay, SkypassEndOfSeasonMaxRetries)
			return fmt.Errorf("enqueue SkypassAutoClaimTask: %w", err)
		}
	}

	if err := r.scheduleNewTask(sess); err != nil {
		UpdateFailedTasks(tasks, SkypassEndOfSeasonRetryDelay, SkypassEndOfSeasonMaxRetries)
		return fmt.Errorf("schedule next skypass end of season task: %w", err)
	}

	// Set task as completed.
	task.Status = proto.TaskStatus_COMPLETED

	return nil
}

func (r *SkypassEndOfSeasonRunner) scheduleNewTask(sess db.Session) error {
	nextRunAt := r.getNextSkypassEndOfSeasonTaskRunAt()

	season := data.CurrentSeason()

	err := data.DB.Tasks(sess).EnqueueTaskIgnoringDuplicates(SkypassEndOfSeasonWorkGroup, SkypassEndOfSeasonTask{
		Season: season,
	}, &nextRunAt, nil)
	if err != nil {
		return fmt.Errorf("enqueue SkypassEndOfSeasonTask: %w", err)
	}

	return nil
}

func (r *SkypassEndOfSeasonRunner) getNextSkypassEndOfSeasonTaskRunAt() time.Time {
	return time.Unix(data.CurrentSeasonEnd()+10, 0)
}
