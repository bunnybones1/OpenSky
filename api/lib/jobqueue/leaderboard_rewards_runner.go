package jobqueue

import (
	"context"
	"fmt"
	"math/big"
	"time"

	"github.com/pkg/errors"
	"github.com/upper/db/v4"

	"github.com/horizon-games/OpenSky/api/config"
	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/proto"
)

var _ Runner = &LeaderboardRewardsRunner{}

type LeaderboardRewardsTask struct {
	Season uint16 `json:"season"`
	Week   uint8  `json:"week"`
}

func (t LeaderboardRewardsTask) Hash() string {
	return fmt.Sprintf("%d.%d", t.Season, t.Week)
}

const (
	LeaderboardRewardsWorkGroup  = "leaderboard-rewards"
	LeaderboardRewardsRetryDelay = 5 * 60 // in seconds
	LeaderboardRewardsMaxRetries = 5

	cardDecimalsMultiplier = 100
)

// LeaderboardRewardsRunner is responsible for distributed weekly silver card rewards and tickets
// for the OpenSky RANKED modes.
type LeaderboardRewardsRunner struct {
	cfg    config.OpenSkyLeaderboardRewardsConfig
	ticker *time.Ticker
}

func (r *LeaderboardRewardsRunner) WorkGroup() string {
	return LeaderboardRewardsWorkGroup
}

func (r *LeaderboardRewardsRunner) Queues() []string {
	return []string{LeaderboardRewardsWorkGroup}
}

func (r *LeaderboardRewardsRunner) MaxBatchSize() int {
	return 1
}

func (r *LeaderboardRewardsRunner) Tick() <-chan time.Time {
	if r.ticker == nil {
		r.ticker = time.NewTicker(time.Minute)
	}
	return r.ticker.C
}

func NewLeaderboardRewardsRunner(cfg config.OpenSkyLeaderboardRewardsConfig) *LeaderboardRewardsRunner {
	return &LeaderboardRewardsRunner{
		cfg: cfg,
	}
}

func (r *LeaderboardRewardsRunner) RunTasks(_ context.Context, sess db.Session, tasks []*data.Task) error {
	task := tasks[0]

	// If we run the task on a day a new season starts we won't have enough
	// information to give rewards at any point on that day, that's why we'll use
	// yesterday's season, because we can always be sure to have enough
	// information from yesterday.
	//
	// e.g.: If this task runs at any time of the day on Jan 17th, 2022 it will
	// use season 2, even though Jan 17th is the day season 3 starts.
	//
	// See: https://github.com/horizon-games/issue-tracker/issues/6797
	season := r.seasonFromDayBefore(*task.RunAt)
	seasonWeek := r.seasonWeekFromDayBefore(*task.RunAt)

	seasonWeekStartTime := data.SeasonWeekStartTime(season, seasonWeek)

	gameModes := []proto.GameMode{
		proto.GameMode_RANKED_CONSTRUCTED,
		proto.GameMode_RANKED_DISCOVERY,
	}

	mintRewards := make(map[proto.AccountID]*leaderboardReward)

	var excludedCardIDs []uint64

	excludedCardIDs = data.CardIndex.CardIDsByCardSets(r.cfg.RewardsExcludedCardSets...)

	excludedCardIDs = append(excludedCardIDs, data.CardIndex.CardIDsSeasonInvalid(season)...)

	for _, mode := range gameModes {
		cardRewards, ticketRewards, ranks, err := data.DB.AccountStats(sess).GetRankedCardRewards(mode, season)
		if err != nil {
			UpdateFailedTasks(tasks, LeaderboardRewardsRetryDelay, LeaderboardRewardsMaxRetries)
			return errors.Wrap(err, "error fetching rewards from db")
		}

		// Silver card rewards
		for accountID, rewardedCards := range cardRewards {
			rewardedTickets := ticketRewards[accountID]
			if rewardedCards == 0 && rewardedTickets == 0 {
				continue
			}

			var tokenIds []uint64

			if _, ok := mintRewards[accountID]; !ok {
				mintRewards[accountID] = &leaderboardReward{}
			}

			if rewardedCards > 0 {
				if mintRewards[accountID].silverCardAmounts == nil {
					mintRewards[accountID].silverCardAmounts = make(map[uint64]uint64)
				}

				for i := uint(0); i < rewardedCards; i++ {
					card := data.CardIndex.GetRandomCard(excludedCardIDs)
					cardTokenID := data.ItemTypeAndID2SWTokenID(proto.ItemType_SW_SILVER_CARDS, card.ID)
					tokenIds = append(tokenIds, cardTokenID)
					mintRewards[accountID].silverCardAmounts[cardTokenID] = mintRewards[accountID].silverCardAmounts[cardTokenID] + cardDecimalsMultiplier
				}
			}

			if rewardedTickets > 0 {
				mintRewards[accountID].ticketAmount = mintRewards[accountID].ticketAmount + uint64(rewardedTickets)

				for i := 0; i < int(rewardedTickets); i++ {
					tokenIds = append(tokenIds, ConquestTicketV1ID)
				}
			}

			rank := ranks[accountID]

			switch mode {
			case proto.GameMode_RANKED_CONSTRUCTED:
				mintRewards[accountID].rankedConstructedRank = rank
			case proto.GameMode_RANKED_DISCOVERY:
				mintRewards[accountID].rankedDiscoveryRank = rank
			}

			// Retrieve earned ranks from feed events (most recent comes first)
			earnedRankEvents := []proto.FeedEvent{}

			err = data.DB.FeedEvents(sess).Find(db.Cond{
				"account_id": accountID,
				"event_type": proto.FeedEventType_RANKUP,
				"game_mode":  mode,
				"created_at": db.Gt(seasonWeekStartTime),
			}).OrderBy("-created_at", "-id").All(&earnedRankEvents)
			if err != nil {
				UpdateFailedTasks(tasks, LeaderboardRewardsRetryDelay, LeaderboardRewardsMaxRetries)
				return errors.Wrap(err, "error creating feed event for leaderboard reward")
			}

			// Record earned ranks
			var earnedRanks []*proto.NotificationEarnedRank
			minRank := proto.NewNotificationEarnedRank(proto.PlayerRank_UNRANKED, proto.PlayerRankStage_STAGE_NONE)
			for _, earnedRankEvent := range earnedRankEvents {
				earnedRank := proto.NewNotificationEarnedRank(
					*earnedRankEvent.PlayerRank,
					*earnedRankEvent.PlayerRankStage,
				)

				// Append only ranks that are lower than the final rank earned
				isLowerRank := *earnedRank.PlayerRank < *minRank.PlayerRank || *earnedRank.PlayerRank == *minRank.PlayerRank && *earnedRank.PlayerRankStage < *minRank.PlayerRankStage
				if *minRank.PlayerRank == proto.PlayerRank_UNRANKED || isLowerRank {
					if *earnedRank.PlayerRank == proto.PlayerRank_MASTER && rank <= 100 {
						// Add grandweaver too
						grandWeaver := proto.NewNotificationEarnedRank(
							proto.PlayerRank_GRANDWEAVER,
							proto.PlayerRankStage_STAGE_NONE,
						)
						earnedRanks = append(earnedRanks, grandWeaver)
					}
					earnedRanks = append(earnedRanks, earnedRank)
					minRank = proto.NewNotificationEarnedRank(
						*earnedRank.PlayerRank,
						*earnedRank.PlayerRankStage,
					)
				}
			}
			switch mode {
			case proto.GameMode_RANKED_CONSTRUCTED:
				mintRewards[accountID].earnedConstructedPlayerRanks = earnedRanks
			case proto.GameMode_RANKED_DISCOVERY:
				mintRewards[accountID].earnedDiscoveryPlayerRanks = earnedRanks
			}

			// Record leaderboard status in a user's feed, horray+congrats to player!
			if len(tokenIds) > 0 {
				event := &data.FeedEvent{
					FeedEvent: &proto.FeedEvent{
						AccountID:       accountID,
						Type:            proto.FeedEventType_LEADERBOARD_REWARD,
						GameMode:        &mode,
						LeaderboardRank: &rank,
						TokenIDs:        tokenIds,
					},
				}

				if err = sess.Save(event); err != nil {
					UpdateFailedTasks(tasks, LeaderboardRewardsRetryDelay, LeaderboardRewardsMaxRetries)
					return errors.Wrap(err, "error creating feed event for leaderboard reward")
				}
			}
		}
	}

	for accountID, rewards := range mintRewards {
		err := data.DB.Tasks(sess).EnqueueTask(MintLeaderboardRewardsQueue, MintLeaderboardRewardsTask{
			AccountID:                    accountID,
			Season:                       season,
			Week:                         seasonWeek,
			SilverCardAmounts:            rewards.silverCardAmounts,
			TicketAmount:                 rewards.ticketAmount,
			RankedConstructedRank:        rewards.rankedConstructedRank,
			RankedDiscoveryRank:          rewards.rankedDiscoveryRank,
			EarnedConstructedPlayerRanks: rewards.earnedConstructedPlayerRanks,
			EarnedDiscoveryPlayerRanks:   rewards.earnedDiscoveryPlayerRanks,
		}, nil, &accountID)
		if err != nil {
			UpdateFailedTasks(tasks, LeaderboardRewardsRetryDelay, LeaderboardRewardsMaxRetries)
			return fmt.Errorf("enqueue MintLeaderboardRewardsTask: %w", err)
		}

		if rewards.ticketAmount > 0 {
			err := data.DB.Items(sess).GainConquestTickets(accountID, big.NewInt(int64(rewards.ticketAmount)), proto.TransactionType_LEADERBOARD_REWARD, "")
			if err != nil {
				UpdateFailedTasks(tasks, LeaderboardRewardsRetryDelay, LeaderboardRewardsMaxRetries)
				return fmt.Errorf("gain conquest tickets: %w", err)
			}
		}
	}

	// create new task
	nextRunAt := r.nextLeaderboardRewards(task.RunAt)
	_, week := nextRunAt.ISOWeek()

	err := data.DB.Tasks(sess).EnqueueTask(LeaderboardRewardsWorkGroup, LeaderboardRewardsTask{
		Season: r.seasonFromDay(*nextRunAt),
		Week:   uint8(week),
	}, nextRunAt, nil)
	if err != nil {
		UpdateFailedTasks(tasks, LeaderboardRewardsRetryDelay, LeaderboardRewardsMaxRetries)
		return errors.Wrap(err, "error creating next leaderboard reward task")
	}

	// schedule hard reset task to run immediately (only for end of season)
	if seasonWeek == 4 {
		err := data.DB.Tasks(sess).EnqueueTask(RankPointsHardResetGroup, RankPointsHardResetTask{
			Season: season, // season from day before
		}, nil, nil)
		if err != nil {
			UpdateFailedTasks(tasks, LeaderboardRewardsRetryDelay, LeaderboardRewardsMaxRetries)
			return errors.Wrap(err, "error creating next hard reset task")
		}
	}

	// schedule soft reset task to run immediately
	if seasonWeek < 4 {
		err := data.DB.Tasks(sess).EnqueueTask(RankPointsSoftResetGroup, RankPointsSoftResetTask{
			Season: season,     // season from day before
			Week:   seasonWeek, // season week from day before
		}, nil, nil)
		if err != nil {
			UpdateFailedTasks(tasks, LeaderboardRewardsRetryDelay, LeaderboardRewardsMaxRetries)
			return errors.Wrap(err, "error creating next soft reset task")
		}
	}

	// set task as completed
	task.Status = proto.TaskStatus_COMPLETED

	return nil
}

// nextLeaderboardRewards returns the next time the rewards task should run
// based on the last time the task ran.
func (r *LeaderboardRewardsRunner) nextLeaderboardRewards(last *time.Time) *time.Time {
	daysRemaining := r.cfg.Weekday - int(last.Weekday())
	if daysRemaining < 1 {
		daysRemaining = 7 + daysRemaining
	}

	next := time.Date(
		last.Year(),
		last.Month(),
		last.Day()+daysRemaining,
		r.cfg.Time.Hour(),
		r.cfg.Time.Minute(),
		0,
		0,
		time.UTC,
	)

	return &next
}

// seasonFromDayBefore returns the number of the season the day before belongs
// to.
func (r *LeaderboardRewardsRunner) seasonFromDayBefore(rewardsAt time.Time) uint16 {
	return r.seasonFromDay(rewardsAt.AddDate(0, 0, -1))
}

// seasonFromDay returns the number of the season the given day belongs to, or
// the number of the season that starts on the given day.
func (r *LeaderboardRewardsRunner) seasonFromDay(ts time.Time) uint16 {
	return data.SeasonFromTimestamp(time.Date(
		ts.Year(),
		ts.Month(),
		ts.Day(),
		r.cfg.Time.Hour(),
		r.cfg.Time.Minute(),
		0, 0, time.UTC,
	))
}

// seasonWeekFromDayBefore returns the number of the season week the day before belongs
// to.
func (r *LeaderboardRewardsRunner) seasonWeekFromDayBefore(rewardsAt time.Time) uint8 {
	return r.seasonWeekFromDay(rewardsAt.AddDate(0, 0, -1))
}

// seasonWeekFromDay returns the number of the season week the given day belongs to, or
// the number of the season week that starts on the given day.
func (r *LeaderboardRewardsRunner) seasonWeekFromDay(ts time.Time) uint8 {
	_, week := data.SeasonWeekFromTimestamp(time.Date(
		ts.Year(),
		ts.Month(),
		ts.Day(),
		r.cfg.Time.Hour(),
		r.cfg.Time.Minute(),
		0, 0, time.UTC,
	))
	return week
}

type leaderboardReward struct {
	silverCardAmounts            map[uint64]uint64
	ticketAmount                 uint64
	rankedConstructedRank        int
	rankedDiscoveryRank          int
	earnedConstructedPlayerRanks []*proto.NotificationEarnedRank
	earnedDiscoveryPlayerRanks   []*proto.NotificationEarnedRank
}
