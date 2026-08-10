package jobqueue

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/rs/zerolog/log"
	"github.com/upper/db/v4"

	"github.com/horizon-games/OpenSky/api/config"
	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/proto"
)

const (
	StickerRewardsWorkGroup  = "sticker-rewards"
	StickerRewardsRetryDelay = 30 * 60 // in seconds
	StickerRewardsMaxRetries = 5
)

var _ Runner = &StickerRewardsRunner{}

// StickerRewardsTask is responsible for finding users who have points to
// spend this season and create distribution tasks for them.
type StickerRewardsTask struct {
	Season uint16 `json:"season"`
	Times  uint64 `json:"times"`
}

func (t StickerRewardsTask) Hash() string {
	return fmt.Sprintf("sticker-rewards.%d.%d", t.Season, t.Times)
}

type StickerRewardsRunner struct {
	cfg config.OpenSkyStickerRewardsConfig

	ticker *time.Ticker
}

func (r *StickerRewardsRunner) WorkGroup() string {
	return StickerRewardsWorkGroup
}

func (r *StickerRewardsRunner) Queues() []string {
	return []string{StickerRewardsWorkGroup}
}

func (r *StickerRewardsRunner) MaxBatchSize() int {
	return 1
}

func (r *StickerRewardsRunner) Tick() <-chan time.Time {
	if r.ticker == nil {
		r.ticker = time.NewTicker(5 * time.Second)
	}
	return r.ticker.C
}

func NewStickerRewardsRunner(cfg config.OpenSkyStickerRewardsConfig) *StickerRewardsRunner {
	return &StickerRewardsRunner{
		cfg: cfg,
	}
}

func (r *StickerRewardsRunner) RunTasks(_ context.Context, sess db.Session, tasks []*data.Task) error {
	task := tasks[0]

	var times uint64

	season := data.CurrentSeason()

	if task.Payload != nil {
		var payload StickerRewardsTask

		if err := json.Unmarshal(task.Payload, &payload); err != nil {
			log.Err(err).Msgf("decode sticker rewards payload")
			UpdateFailedTasks(tasks, 0, 0)

			return fmt.Errorf("decode sticker rewards payload: %w", err)
		}

		season = payload.Season
		times = payload.Times
	}

	logger := log.Log().Uint16("season", season)

	// Carry unspent points from friends from the previous season to
	// the current one. This query can be run at any time as points_carried
	// doesn't change once the season finishes, running it here won't have any
	// effects most of the time, but it ensures that points_carried will be
	// always available for the tasks that are going to be carried out in this
	// task. A possible optimization would be running it only the first time this
	// task executes after a season change, but it's difficult to detect that
	// within the scope of this task.
	if err := data.DB.LevelsPerSeason(sess).CarryPointsOverToNewSeason(season); err != nil {
		logger.Err(err).Msgf("carry points over to new season")
		UpdateFailedTasks(tasks, StickerRewardsRetryDelay, StickerRewardsMaxRetries)

		return fmt.Errorf("carry points over to new season: %w", err)
	}

	// retrieve the sticker with lower cost
	var sticker data.Sticker

	err := data.DB.Stickers(sess).Find(db.Cond{"season": season}).OrderBy("required_points").One(&sticker)
	if err != nil {
		logger.Err(err).Msgf("find lowest cost sticker")
		UpdateFailedTasks(tasks, StickerRewardsRetryDelay, StickerRewardsMaxRetries)

		return fmt.Errorf("find lowest cost sticker: %w", err)
	}

	var items []*data.Item

	err = data.DB.Items(sess).Find(db.Cond{
		"item_type": proto.ItemType_SW_STICKER_POINTS,
		"token_id":  data.StickerPointsItemID,
		"balance":   db.Gte(sticker.RequiredPoints),
	}).All(&items)
	if err != nil {
		logger.Err(err).Msgf("find sticker points")
		UpdateFailedTasks(tasks, StickerRewardsRetryDelay, StickerRewardsMaxRetries)

		return fmt.Errorf("find sticker points: %w", err)
	}

	for _, item := range items {
		// retrieve not-awarded stickers for this season and user
		unawardedStickers, err := data.DB.AwardedStickers().FindAllUnawardedStickers(item.AccountID, season)
		if err != nil {
			logger.Err(err).Msgf("list unawarded stickers")
			UpdateFailedTasks(tasks, StickerRewardsRetryDelay, StickerRewardsMaxRetries)

			return fmt.Errorf("list unawarded stickers: %w", err)
		}

		if len(unawardedStickers) < 1 {
			// this user has no more stickers to win, skip
			continue
		}

		err = data.DB.Tasks(sess).EnqueueTask(GrantStickerRewardsWorkGroup, &GrantStickerRewardsTask{
			AccountID: item.AccountID,
			Season:    season,
			Times:     times,
		}, nil, &item.AccountID)
		if err != nil {
			logger.Err(err).Msgf("enqueue GrantStickerRewardsTask")
			UpdateFailedTasks(tasks, StickerRewardsRetryDelay, StickerRewardsMaxRetries)

			return fmt.Errorf("enqueue GrantStickerRewardsTask: %w", err)
		}
	}

	// create new task
	nextRunAt := r.nextStickerRewardsTime(task.RunAt)

	err = data.DB.Tasks(sess).EnqueueTask(StickerRewardsWorkGroup, &StickerRewardsTask{
		Season: data.SeasonFromTimestamp(*nextRunAt),
		Times:  times + 1,
	}, nextRunAt, nil)
	if err != nil {
		logger.Err(err).Msgf("enqueue StickerRewardsTask")
		UpdateFailedTasks(tasks, StickerRewardsRetryDelay, StickerRewardsMaxRetries)

		return fmt.Errorf("enqueue StickerRewardsTask: %w", err)
	}

	task.Status = proto.TaskStatus_COMPLETED

	return nil
}

// nextStickerRewards returns the next time the rewards task should run
// based on the last time the task ran.
func (r *StickerRewardsRunner) nextStickerRewardsTime(last *time.Time) *time.Time {
	newTime := last.Add(time.Duration(r.cfg.CheckForPendingRewardsMinutes) * time.Minute)

	return &newTime
}
