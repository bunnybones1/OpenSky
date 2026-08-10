package jobqueue

import (
	"context"
	"encoding/json"
	"fmt"
	"math"
	"math/big"
	"time"

	"github.com/pkg/errors"
	"github.com/upper/db/v4"

	"github.com/horizon-games/OpenSky/api/config"
	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/lib/analytics"
	"github.com/horizon-games/OpenSky/api/proto"
)

var _ Runner = &ConquestV2RewardsRunner{}

// ConquestV2RewardsTask handles weekly distribution of Conquest V2 rewards.
type ConquestV2RewardsTask struct {
	Season uint16 `json:"season"`
	Week   uint16 `json:"week"`
}

func (t ConquestV2RewardsTask) Hash() string {
	return fmt.Sprintf("%d.%d", t.Season, t.Week)
}

const (
	ConquestV2RewardsWorkGroup  = "conquest-v2-rewards"
	ConquestV2RewardsRetryDelay = 5 * 60 // in seconds
	ConquestV2RewardsMaxRetries = 5

	conquestV2EventID              = 2
	conquestV2TreasureLevel1Points = 250
)

type ConquestV2RewardsRunner struct {
	ticker             *time.Ticker
	cfg                config.OpenSkyConquestV2Config
	poolManager        ConquestV2PoolManager
	treasureCalculator ConquestV2TreasureCalculator
	analyticsTracker   analytics.Tracker
}

// NewConquestV2RewardsRunner instantiates a new ConquestV2RewardsRunner.
func NewConquestV2RewardsRunner(cfg config.OpenSkyConquestV2Config, poolManager ConquestV2PoolManager, treasureCalculator ConquestV2TreasureCalculator, analyticsTracker analytics.Tracker) (*ConquestV2RewardsRunner, error) {
	return &ConquestV2RewardsRunner{
		cfg:                cfg,
		poolManager:        poolManager,
		treasureCalculator: treasureCalculator,
		analyticsTracker:   analyticsTracker,
	}, nil
}

func (r *ConquestV2RewardsRunner) WorkGroup() string {
	return ConquestV2RewardsWorkGroup
}

func (r *ConquestV2RewardsRunner) Queues() []string {
	return []string{ConquestV2RewardsWorkGroup}
}

func (r *ConquestV2RewardsRunner) MaxBatchSize() int {
	return 1
}

func (r *ConquestV2RewardsRunner) Tick() <-chan time.Time {
	if r.ticker == nil {
		r.ticker = time.NewTicker(time.Minute)
	}

	return r.ticker.C
}

func (r *ConquestV2RewardsRunner) RunTasks(ctx context.Context, sess db.Session, tasks []*data.Task) error {
	task := tasks[0]

	var taskPayload ConquestV2RewardsTask

	err := json.Unmarshal(task.Payload, &taskPayload)
	if err != nil {
		UpdateFailedTasks(tasks, ConquestV2RewardsRetryDelay, ConquestV2RewardsMaxRetries)
		return fmt.Errorf("decode task payload: %w", err)
	}

	conquestPoints, err := r.getConquestPointsForPlayersWithTreasureLevel1AndHigher(sess)
	if err != nil {
		UpdateFailedTasks(tasks, ConquestV2RewardsRetryDelay, ConquestV2RewardsMaxRetries)
		return fmt.Errorf("get conquest points for players with treasure level 1 and higher: %w", err)
	}

	totalWeight, treasureProgress, err := r.getTotalWeightAndTreasureProgress(conquestPoints)
	if err != nil {
		UpdateFailedTasks(tasks, ConquestV2RewardsRetryDelay, ConquestV2RewardsMaxRetries)
		return fmt.Errorf("get total weight and treasure progress: %w", err)
	}

	pool, err := r.poolManager.GetPool(ctx)
	if err != nil {
		UpdateFailedTasks(tasks, ConquestV2RewardsRetryDelay, ConquestV2RewardsMaxRetries)
		return fmt.Errorf("get pool: %w", err)
	}

	awardedAt := data.TimeNowUTC()
	runAt := r.getConquestV2SendRewardTaskRunAt(&awardedAt)

	// Get config for Silver Cards weight
	cfg, err := r.poolManager.GetConfig(ctx)
	if err != nil {
		UpdateFailedTasks(tasks, ConquestV2RewardsRetryDelay, ConquestV2RewardsMaxRetries)
		return fmt.Errorf("failed to retrieve silver cards from latest expansion: %w", err)
	}

	excludedCardIDs := data.CardIndex.CardIDsSeasonInvalid(taskPayload.Season)

	for _, cp := range conquestPoints {
		conquestPointsData := treasureProgress[cp.AccountID]

		if conquestPointsData == nil || conquestPointsData.TreasureLevel == 0 {
			continue
		}

		err = r.deductConquestPoints(sess, cp.AccountID, conquestPointsData.PointsAccounted)
		if err != nil {
			UpdateFailedTasks(tasks, ConquestV2RewardsRetryDelay, ConquestV2RewardsMaxRetries)
			return fmt.Errorf("deduct conquest points: %w", err)
		}

		silverCardAmounts := map[uint64]uint64{}

		if cfg.Settings.WeightPerSilverCard > 0 {
			totalSilverCardsAwarded := r.treasureCalculator.GetSilverCardsAmountInTreasurePerLevelWithConfig(cfg.Settings.WeightPerSilverCard, conquestPointsData.TreasureLevel)

			for i := 0; i < int(totalSilverCardsAwarded); i++ {
				// Only cards from the latest expansion set
				card := data.CardIndex.GetRandomCardByCardSets(r.cfg.RewardsWeeklyExclusiveCardSets, excludedCardIDs)
				silverCardID := data.ItemTypeAndID2SWTokenID(proto.ItemType_SW_SILVER_CARDS, card.Card.ID)
				silverCardAmounts[silverCardID] = silverCardAmounts[silverCardID] + cardDecimalsMultiplier
			}
		}

		// Calculate USDC rewards
		rewardAmountUSDC := r.treasureCalculator.GetUSDCAmountInTreasurePerLevelWithPool(pool.Amount, totalWeight, conquestPointsData.TreasureLevel)

		if err = r.enqueueSendRewardTask(sess, cp.AccountID, conquestPointsData.TreasureLevel, big.NewInt(rewardAmountUSDC), silverCardAmounts, taskPayload, awardedAt, runAt); err != nil {
			UpdateFailedTasks(tasks, ConquestV2RewardsRetryDelay, ConquestV2RewardsMaxRetries)
			return fmt.Errorf("enqueue task: %w", err)
		}

		rewardFloat := float32(float64(rewardAmountUSDC) / math.Pow10(6))

		if err := r.analyticsTracker.TrackTreasureRewards(nil, cp.AccountID, conquestPointsData, rewardFloat); err != nil {
			UpdateFailedTasks(tasks, ConquestV2RewardsRetryDelay, ConquestV2RewardsMaxRetries)
			return fmt.Errorf("track treasure rewards: %w", err)
		}
	}

	err = r.schedulePoolRecalculation(sess)
	if err != nil {
		UpdateFailedTasks(tasks, ConquestV2RewardsRetryDelay, ConquestV2RewardsMaxRetries)
		return errors.Wrap(err, "schedule next conquest V2 rewards task")
	}

	err = r.scheduleNewTask(sess, task.RunAt, taskPayload)
	if err != nil {
		UpdateFailedTasks(tasks, ConquestV2RewardsRetryDelay, ConquestV2RewardsMaxRetries)
		return errors.Wrap(err, "schedule next conquest V2 rewards task")
	}

	// Set task as completed.
	task.Status = proto.TaskStatus_COMPLETED

	return nil
}

func (r *ConquestV2RewardsRunner) getConquestPointsForPlayersWithTreasureLevel1AndHigher(sess db.Session) ([]*data.ConquestPoints, error) {
	var conquestPoints []*data.ConquestPoints

	err := data.DB.ConquestPoints(sess).Find(db.Cond{
		"event_id":       conquestV2EventID,
		"current_points": db.Gte(conquestV2TreasureLevel1Points),
	}).All(&conquestPoints)
	if err != nil && err != db.ErrNoMoreRows {
		return nil, fmt.Errorf("find conquest points: %w", err)
	}

	return conquestPoints, nil
}

func (r *ConquestV2RewardsRunner) getTotalWeightAndTreasureProgress(conquestPoints []*data.ConquestPoints) (float32, map[proto.AccountID]*data.ConquestV2TreasureProgress, error) {
	var totalWeight float32

	treasureProgress := map[proto.AccountID]*data.ConquestV2TreasureProgress{}

	for _, cp := range conquestPoints {
		conquestPointsData, err := r.treasureCalculator.FromConquestPoints(cp)
		if err != nil {
			return 0, nil, fmt.Errorf("get treasure progress: %w", err)
		}

		totalWeight += conquestPointsData.Weight

		treasureProgress[cp.AccountID] = conquestPointsData
	}

	return totalWeight, treasureProgress, nil
}

func (r *ConquestV2RewardsRunner) deductConquestPoints(sess db.Session, accountID proto.AccountID, amountForDeduction uint64) error {
	_, err := sess.SQL().
		Update("conquest_points").
		Where(db.Cond{
			"account_id": accountID,
			"event_id":   conquestV2EventID,
		}).
		Set(
			db.Raw("current_points = current_points - ?", amountForDeduction),
		).
		Exec()
	if err != nil {
		return fmt.Errorf("save conquest points: %w", err)
	}

	return nil
}

func (r *ConquestV2RewardsRunner) enqueueSendRewardTask(sess db.Session, accountID proto.AccountID, treasureLevel uint16, amountUSDC *big.Int, silverCardAmounts map[uint64]uint64, taskPayload ConquestV2RewardsTask, awardedAt, runAt time.Time) error {
	err := data.DB.Tasks(sess).EnqueueTask(ConquestV2SendRewardQueue, ConquestV2SendRewardTask{
		AccountID:         accountID,
		Season:            taskPayload.Season,
		Week:              taskPayload.Week,
		TreasureLevel:     treasureLevel,
		AmountUSDC:        amountUSDC,
		SilverCardAmounts: silverCardAmounts,
		AwardedAt:         awardedAt,
	}, &runAt, &accountID)
	if err != nil {
		return fmt.Errorf("enqueue ConquestV2SendRewardTask: %w", err)
	}

	return nil
}

func (r *ConquestV2RewardsRunner) getConquestV2SendRewardTaskRunAt(now *time.Time) time.Time {
	daysRemaining := r.cfg.RewardsSendWeekday - int(now.Weekday())

	runAt := time.Date(
		now.Year(),
		now.Month(),
		now.Day()+daysRemaining,
		r.cfg.RewardsSendTime.Hour(),
		r.cfg.RewardsSendTime.Minute(),
		0,
		0,
		time.UTC,
	)

	return runAt
}

func (r *ConquestV2RewardsRunner) schedulePoolRecalculation(sess db.Session) error {
	err := data.DB.Tasks(sess).EnqueueTask(ConquestV2PoolWorkGroup, ConquestV2PoolRecalculateTask{
		CreatedAt: data.TimeNowUTC(),
	}, nil, nil)
	if err != nil {
		return fmt.Errorf("enqueue ConquestV2PoolRecalculateTask: %w", err)
	}

	return nil
}

func (r *ConquestV2RewardsRunner) scheduleNewTask(sess db.Session, lastRunAt *time.Time, taskPayload ConquestV2RewardsTask) error {
	nextRunAt := r.getNextConquestV2RewardsTaskRunAt(lastRunAt)

	season, week := r.getNextSeasonAndWeek(taskPayload.Season, taskPayload.Week)

	err := data.DB.Tasks(sess).EnqueueTask(ConquestV2RewardsWorkGroup, ConquestV2RewardsTask{
		Season: season,
		Week:   week,
	}, &nextRunAt, nil)
	if err != nil {
		return fmt.Errorf("enqueue ConquestV2RewardsTask: %w", err)
	}

	return nil
}

func (r *ConquestV2RewardsRunner) getNextConquestV2RewardsTaskRunAt(lastRunAt *time.Time) time.Time {
	daysRemaining := r.cfg.RewardsScheduleWeekday - int(lastRunAt.Weekday())
	if daysRemaining < 1 {
		daysRemaining = 7 + daysRemaining
	}

	next := time.Date(
		lastRunAt.Year(),
		lastRunAt.Month(),
		lastRunAt.Day()+daysRemaining,
		r.cfg.RewardsScheduleTime.Hour(),
		r.cfg.RewardsScheduleTime.Minute(),
		0,
		0,
		time.UTC,
	)

	return next
}

func (r *ConquestV2RewardsRunner) getNextSeasonAndWeek(season, week uint16) (uint16, uint16) {
	week++

	if week > 4 {
		week = 1
		season++
	}

	return season, week
}

// ConquestV2PoolManager provides pool.
//
//go:generate go run go.uber.org/mock/mockgen -destination ./mock/conquest_v2_pool_manager.go -package mock . ConquestV2PoolManager
type ConquestV2PoolManager interface {
	GetPool(context.Context) (*proto.ConquestV2Pool, error)
	RecalculatePool(context.Context) error
	GetConfig(context.Context) (*proto.ConquestV2PoolConfig, error)
}

// ConquestV2TreasureCalculator calculates a progress for conquest treasures.
//
//go:generate go run go.uber.org/mock/mockgen -destination ./mock/conquest_v2_treasure_calculator.go -package mock . ConquestV2TreasureCalculator
type ConquestV2TreasureCalculator interface {
	FromConquestPoints(*data.ConquestPoints) (*data.ConquestV2TreasureProgress, error)
	GetSilverCardsAmountInTreasurePerLevelWithConfig(float32, uint16) int64
	GetUSDCAmountInTreasurePerLevelWithPool(uint64, float32, uint16) int64
}
