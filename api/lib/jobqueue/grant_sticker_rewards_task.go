package jobqueue

import (
	"context"
	"encoding/json"
	"fmt"
	"math"
	"math/big"
	"time"

	"github.com/rs/zerolog/log"
	"github.com/upper/db/v4"

	"github.com/horizon-games/OpenSky/api/config"
	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/proto"
)

const stickerRewardAmount = 100

const (
	GrantStickerRewardsWorkGroup  = "grant-sticker-rewards"
	GrantStickerRewardsRetryDelay = 60 * 10 // minutes
	GrantStickerRewardsMaxRetries = 5
)

// GrantStickerRewardsTask is used to calculate sticker rewards, move points
// to the next season and create sticker minting tasks.
type GrantStickerRewardsTask struct {
	AccountID      proto.AccountID `json:"account_id"`
	AccountAddress proto.Hash      `json:"account_address" db:"account_address"`
	Season         uint16          `json:"season" db:"season"`
	Times          uint64          `json:"times" db:"-"`
}

func (t GrantStickerRewardsTask) Hash() string {
	return fmt.Sprintf("grant-sticker-rewards-%d.%d.%d", t.AccountID, t.Season, t.Times)
}

type GrantStickerRewardsRunner struct {
	cfg config.OpenSkyStickerRewardsConfig

	ticker *time.Ticker
}

func (r *GrantStickerRewardsRunner) WorkGroup() string {
	return GrantStickerRewardsWorkGroup
}

func (r *GrantStickerRewardsRunner) Queues() []string {
	return []string{GrantStickerRewardsWorkGroup}
}

func (r *GrantStickerRewardsRunner) MaxBatchSize() int {
	return 10
}

func (r *GrantStickerRewardsRunner) Tick() <-chan time.Time {
	if r.ticker == nil {
		r.ticker = time.NewTicker(time.Minute)
	}

	return r.ticker.C
}

func NewGrantStickerRewardsRunner(cfg config.OpenSkyStickerRewardsConfig) *GrantStickerRewardsRunner {
	return &GrantStickerRewardsRunner{
		cfg: cfg,
	}
}

func (r *GrantStickerRewardsRunner) RunTasks(ctx context.Context, sess db.Session, tasks []*data.Task) error {
	for _, task := range tasks {
		if err := r.grantStickersToSingleAccount(ctx, sess, task); err != nil {
			UpdateFailedTasks([]*data.Task{task}, GrantStickerRewardsRetryDelay, GrantStickerRewardsMaxRetries)
			return err
		}

		task.Status = proto.TaskStatus_COMPLETED
	}

	return nil
}

func (r *GrantStickerRewardsRunner) grantStickersToSingleAccount(_ context.Context, sess db.Session, task *data.Task) error {
	var payload GrantStickerRewardsTask

	if err := json.Unmarshal(task.Payload, &payload); err != nil {
		log.Err(err).Uint64("account_id", task.AccountID.UInt64()).Msgf("decode payload")
		return fmt.Errorf("decode payload: %w", err)
	}

	accountID, err := getAccountID(sess, payload.AccountID, payload.AccountAddress)
	if err != nil {
		log.Err(err).Msgf("get account ID")
		UpdateFailedTasks([]*data.Task{task}, 0, 0)

		return fmt.Errorf("get account ID: %w", err)
	}

	logger := log.Logger.Log().Uint64("account_id", accountID.UInt64()).Uint16("season", payload.Season)

	// Retrieve not-awarded stickers for this season and user.
	stickers, err := data.DB.AwardedStickers(sess).FindAllUnawardedStickers(accountID, payload.Season)
	if err != nil {
		logger.Err(err).Msgf("find unawarded stickers")
		return fmt.Errorf("find unawarded stickers for season %d, account %d: %w", payload.Season, accountID, err)
	}

	if len(stickers) < 1 {
		// No unawarded stickers left for this player, nothing more to do.
		task.Status = proto.TaskStatus_COMPLETED

		return nil
	}

	// Calculate total points for user.
	currentStickerPoints, err := data.DB.Items(sess).GetStickerPoints(accountID)
	if err != nil {
		logger.Err(err).Msgf("get sticker points")
		return fmt.Errorf("get sticker points: %w", err)
	}

	// Include a cost of the highest already awarded sticker.
	var spentStickerPoints uint64

	highestCostSticker, err := data.DB.AwardedStickers(sess).FindHighestCostAwardedSticker(accountID, payload.Season)
	if err != nil {
		logger.Err(err).Msgf("find highest cost awarded sticker")
		return fmt.Errorf("find highest cost awarded sticker: %w", err)
	}

	if highestCostSticker != nil {
		spentStickerPoints = highestCostSticker.RequiredPoints
	}

	totalStickerPoints := currentStickerPoints + spentStickerPoints

	friends, err := data.DB.LevelsPerSeason(sess).GetFriendsList(accountID, payload.Season)
	if err != nil {
		logger.Err(err).Msgf("get friend list")
		return fmt.Errorf("get friend list: %w", err)
	}

	// Collect earned stickers
	earnedStickers := make([]*data.Sticker, 0)

	// totalCost is the most expensive sticker the user can get.
	var totalCost uint64

	for _, sticker := range stickers {
		cost := sticker.RequiredPoints
		if cost > totalStickerPoints {
			continue // Not enough points for this sticker.
		}

		if cost > totalCost {
			totalCost = cost
		}

		earnedStickers = append(earnedStickers, sticker)
	}

	if len(earnedStickers) < 1 {
		// could not get any stickers, not enough points
		return nil
	}

	stickerPointsDeduction := totalCost - spentStickerPoints

	if stickerPointsDeduction > 0 {
		err = data.DB.Items(sess).SpendStickerPoints(accountID, big.NewInt(int64(totalCost-spentStickerPoints)), proto.TransactionType_SKYWEAVER, "")
		if err != nil {
			logger.Err(err).Msgf("spend sticker points")
			return fmt.Errorf("spend sticker points: %w", err)
		}
	}

	// Reset spent points (they're not actually spendable until the end of the
	// season, but we have to keep a record of what happened regardless because we
	// have to pass any unspent points to the next season).
	err = data.DB.LevelsPerSeason(sess).Find(db.Cond{
		"season":     payload.Season,
		"inviter_id": accountID,
	}).Update(map[string]uint{
		"points_spent": 0,
	})
	if err != nil {
		logger.Err(err).Msgf("reset points")
		return fmt.Errorf("reset points: %w", err)
	}

	// Record spent points on friends.
	for _, friend := range friends {
		availablePoints := friend.Points
		if availablePoints < 1 {
			continue // no points to spend
		}

		pointsSpent := uint64(math.Min(float64(availablePoints), float64(totalCost)))

		err := data.DB.LevelsPerSeason(sess).Find(db.Cond{
			"season":     payload.Season,
			"account_id": friend.Account.ID,
			"inviter_id": accountID,
		}).Update(map[string]interface{}{
			"points_spent": pointsSpent,
		})
		if err != nil {
			logger.Err(err).Msgf("persist spent points")
			return fmt.Errorf("persist spent points: %w", err)
		}

		// totalCost eventually becomes zero when all points are consumed
		totalCost -= pointsSpent
		if totalCost < 1 {
			break
		}
	}

	// enqueue sticker distribution
	stickerRewards := map[uint64]uint64{}
	for _, sticker := range earnedStickers {
		stickerRewards[sticker.TokenID] = stickerRewardAmount

		// record awarded sticker
		err := sess.Save(&data.AwardedSticker{
			TokenID:   sticker.TokenID,
			Season:    sticker.Season,
			AccountID: accountID,
		})
		if err != nil {
			logger.Err(err).Msg("record awarded stickers")
			return fmt.Errorf("record awarded stickers: %w", err)
		}
	}

	mintingTime := r.stickersMintingTime()

	err = data.DB.Tasks(sess).EnqueueTask(MintStickerRewardsQueue, MintStickerRewardsTask{
		AccountID:      accountID,
		StickerAmounts: stickerRewards,
		AwardedAt:      data.TimeNowUTC(),
	}, mintingTime, task.AccountID)
	if err != nil {
		logger.Err(err).Msgf("enqueue MintStickerRewardsTask")
		return fmt.Errorf("enqueue MintStickerRewardsTask: %w", err)
	}

	return nil
}

func (r *GrantStickerRewardsRunner) stickersMintingTime() *time.Time {
	newTime := data.TimeNowUTC().Add(time.Duration(r.cfg.MintingDelayMinutes) * time.Minute)

	return &newTime
}
