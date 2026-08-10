package rankup

import (
	"context"
	"fmt"
	"math/rand"

	"github.com/pkg/errors"
	"github.com/rs/zerolog/log"
	"github.com/upper/db/v4"

	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/lib/jobqueue"
	"github.com/horizon-games/OpenSky/api/lib/levels"
	playerRank "github.com/horizon-games/OpenSky/api/lib/player_rank"
	"github.com/horizon-games/OpenSky/api/lib/ranking"
	"github.com/horizon-games/OpenSky/api/proto"
	"github.com/horizon-games/OpenSky/api/rpc/rctx"
)

type MatchPlayerRankUpper struct {
	grandmastersUpdater GrandmasterListerUpdater
}

func NewMatchPlayerRankUpper(grandmastersUpdater GrandmasterListerUpdater) *MatchPlayerRankUpper {
	return &MatchPlayerRankUpper{
		grandmastersUpdater: grandmastersUpdater,
	}
}

func (u *MatchPlayerRankUpper) UpdatePlayerStatsAndRanks(ctx context.Context, sess db.Session, match *data.Match) ([]*proto.FeedEvent, []*proto.Reward, error) {
	repo := rctx.DBContext(ctx)

	// only ranked games' stats are tracked
	if !match.IsRanked() {
		return nil, nil, nil
	}

	// either Player1GameMode or Player2GameMode has to be ranked.
	gameMode := match.Player1GameMode
	if gameMode != proto.GameMode_RANKED_CONSTRUCTED && gameMode != proto.GameMode_RANKED_DISCOVERY {
		gameMode = match.Player2GameMode
	}

	if match.WinningPlayer == nil {
		// nil is incorrect value, must be 0 (tie), 1 (p1), or 2 (p2)
		return nil, nil, errors.Errorf("winningPlayer cannot be nil (match %v)", match.ID)
	}

	season := data.CurrentSeason()

	// update player scores and win/loss/abandon/forfeit counts
	// changes will be saved along with exp/level change in rewardMatch
	p1Stats, err := repo.AccountStats(sess).FindOrCreateByAccountIDAndMode(match.Player1ID, match.Player1GameMode, season)
	if err != nil {
		return nil, nil, errors.Wrap(err, "failed to retrieve p1 stats")
	}
	p1RankState := &p1Stats.PlayerRankState.State

	p2Stats, err := repo.AccountStats(sess).FindOrCreateByAccountIDAndMode(match.Player2ID, match.Player2GameMode, season)
	if err != nil {
		return nil, nil, errors.Wrap(err, "failed to retrieve p2 stats")
	}
	p2RankState := &p2Stats.PlayerRankState.State

	var winnerStats, loserStats *data.AccountStat

	var p1NewRankState, p2NewRankState *ranking.State

	switch *match.WinningPlayer {
	case data.MatchTie:
		p1NewRankState, err = ranking.UpdateRankState(ranking.Draw, p1RankState, p2RankState)
		if err != nil {
			return nil, nil, errors.Wrap(err, "failed to update rank state")
		}
		p1Stats.TieCount++

		p2NewRankState, err = ranking.UpdateRankState(ranking.Draw, p2RankState, p1RankState)
		if err != nil {
			return nil, nil, errors.Wrap(err, "failed to update rank state")
		}
		p2Stats.TieCount++
	case data.MatchPlayer1Won:
		winnerStats = p1Stats
		loserStats = p2Stats

		p1NewRankState, err = ranking.UpdateRankState(ranking.Win, p1RankState, p2RankState)
		if err != nil {
			return nil, nil, errors.Wrap(err, "failed to update rank state")
		}

		p2NewRankState, err = ranking.UpdateRankState(ranking.Loss, p2RankState, p1RankState)
		if err != nil {
			return nil, nil, errors.Wrap(err, "failed to update rank state")
		}
	case data.MatchPlayer2Won:
		winnerStats = p2Stats
		loserStats = p1Stats

		p1NewRankState, err = ranking.UpdateRankState(ranking.Loss, p1RankState, p2RankState)
		if err != nil {
			return nil, nil, errors.Wrap(err, "failed to update rank state")
		}

		p2NewRankState, err = ranking.UpdateRankState(ranking.Win, p2RankState, p1RankState)
		if err != nil {
			return nil, nil, errors.Wrap(err, "failed to update rank state")
		}
	default:
		return nil, nil, nil
	}

	if mayPersistStats(p1Stats) {
		p1Stats.PlayerRankState = newPlayerRankState(p1Stats, *p1RankState, *p1NewRankState)
	}
	if mayPersistStats(p2Stats) {
		p2Stats.PlayerRankState = newPlayerRankState(p2Stats, *p2RankState, *p2NewRankState)
	}

	if match.HasWinner() {
		// Update win/loss counters
		winnerStats.WinCount++
		loserStats.LossCount++

		if winnerStats.LossStreak > 0 {
			winnerStats.LossStreak = 0
		}

		if loserStats.WinStreak > 0 {
			loserStats.WinStreak = 0
		}

		loserStats.LossStreak++
		winnerStats.WinStreak++

		switch match.Status {
		case proto.MatchStatus_ABANDONED:
			loserStats.AbandonCount++

		case proto.MatchStatus_FORFEITED:
			loserStats.ForfeitCount++
		}
	}

	// We still need to update the new players rank *after* stats were updated
	p1RankUpEvents, p1RankUpRewards, err := u.updatePlayerRanks(ctx, sess, match.Player1GameMode, p1Stats)
	if err != nil {
		return nil, nil, fmt.Errorf("update player 1 ranks: %w", err)
	}

	p2RankUpEvents, p2RankUpRewards, err := u.updatePlayerRanks(ctx, sess, match.Player2GameMode, p2Stats)
	if err != nil {
		return nil, nil, fmt.Errorf("update player 2 ranks: %w", err)
	}

	rankUpEvents := append(p1RankUpEvents, p2RankUpEvents...)
	rankUpRewards := append(p1RankUpRewards, p2RankUpRewards...)

	if mayPersistStats(p1Stats) {
		if err = sess.Save(p1Stats); err != nil {
			return nil, nil, errors.Wrap(err, "saving p1 account stats failed")
		}
		match.Player1RankState = p1Stats.PlayerRankState
	}

	if mayPersistStats(p2Stats) {
		if err = sess.Save(p2Stats); err != nil {
			return nil, nil, errors.Wrap(err, "saving p2 account stats failed")
		}
		match.Player2RankState = p2Stats.PlayerRankState
	}

	// Run account checks
	if err = u.triggerAccountChecks(ctx, p1Stats, match); err != nil {
		return nil, nil, errors.Wrap(err, "account check failed for p1")
	}

	if err = u.triggerAccountChecks(ctx, p2Stats, match); err != nil {
		return nil, nil, errors.Wrap(err, "account check failed for p2")
	}

	if !match.HasWinner() {
		return rankUpEvents, rankUpRewards, nil
	}

	enqueuePromotionTask := false

	// Update the afterMatch rank change for winner and loser
	for i, r := range rankUpRewards {
		if r.Type != proto.RewardType_RANK {
			continue
		}

		// retrieve new ranks
		ranks, err := repo.AccountStats(sess).GetRanks(*r.GameMode, []proto.AccountID{r.AccountID}, season)
		if err != nil {
			return nil, nil, proto.WrapError(proto.ErrInternal, err, "failed fetching account rank after match")
		}

		if rank, ok := ranks[r.AccountID]; ok {
			rankUpRewards[i].Rank.AfterMatch.RankPosition = rank
		}

		var playerStats *data.AccountStat
		if r.AccountID == loserStats.AccountID {
			playerStats = loserStats
		} else {
			playerStats = winnerStats
		}

		// Need to check if Master ranked up or GW ranked down since it's not
		// checked in the `levels.isRankUp()` function
		if r.Rank.AfterMatch.Rank >= proto.PlayerRank_MASTER {
			r.Rank.AfterMatch.Rank = proto.PlayerRank_MASTER

			rankPointsBelow, rankPointsAbove, isGrandmaster, err := u.findBelowAndAboveMasters(ctx, sess, *r.GameMode, season, *playerStats)
			if err != nil {
				return nil, nil, fmt.Errorf("find below and above players: %w", err)
			}

			rankUpRewards[i].Rank.AfterMatch.ScoreBelow = rankPointsBelow
			rankUpRewards[i].Rank.AfterMatch.ScoreAbove = rankPointsAbove

			if isGrandmaster {
				r.Rank.AfterMatch.Rank = proto.PlayerRank_GRANDWEAVER
			}

			enqueuePromotionTask = true
		}
	}

	if enqueuePromotionTask {
		// enqueue leaderboard promotions only if any reward.AfterMatch.Rank is
		// master or higher.
		err = repo.Tasks(sess).EnqueueTask(jobqueue.PromoteGrandmastersWorkGroup, jobqueue.PromoteGrandmastersTask{
			Season:   season,
			GameMode: gameMode,
			MatchID:  match.ID,
		}, nil, nil)
		if err != nil {
			return nil, nil, err
		}
	}

	return rankUpEvents, rankUpRewards, nil
}

func (u *MatchPlayerRankUpper) updatePlayerRanks(ctx context.Context, sess db.Session, gameMode proto.GameMode, stats *data.AccountStat) ([]*proto.FeedEvent, []*proto.Reward, error) {
	var rewards []*proto.Reward
	var events []*proto.FeedEvent

	repo := rctx.DBContext(ctx)
	season := data.CurrentSeason()

	if !mayPersistStats(stats) {
		return events, rewards, nil
	}

	currRank := playerRank.LookupRankByScore(*stats.Score)

	// Find player's current above and below rank positions
	rankPointsBelow, rankPointsAbove, _, err := u.findBelowAndAboveMasters(ctx, sess, gameMode, season, *stats)
	if err != nil {
		log.Err(err).Msgf("updatePlayerRanks: failed to get elo above or below")
		return nil, nil, err
	}

	reward := &proto.Reward{
		AccountID: stats.AccountID,
		Type:      proto.RewardType_RANK,
		GameMode:  &gameMode,
		Rank: &proto.RewardRank{
			BeforeMatch: &proto.RankData{
				Rank:               stats.PlayerRank,
				RankStage:          stats.PlayerRankStage,
				Score:              *stats.Score,
				RequiredRankPoints: currRank.NextRankRPMin(),
				ScoreBelow:         rankPointsBelow,
				ScoreAbove:         rankPointsAbove,
			},
		},
	}

	// Get user account
	account, err := repo.Accounts(sess).FindByID(stats.AccountID)
	if err != nil {
		return nil, nil, proto.WrapError(proto.ErrInternal, err, "failed fetching account")
	}

	account.Experience, err = repo.Items(sess).GetXP(stats.AccountID)
	if err != nil {
		return nil, nil, fmt.Errorf("get xp: %w", err)
	}

	// Get Season Stat
	seasonStat, err := data.DB.SkypassSeasonStats(sess).FindOrCreate(stats.AccountID, data.CurrentSeason())
	if err != nil {
		return nil, nil, proto.WrapError(proto.ErrInternal, err, "failed fetching season stat")
	}

	// Get rank position (which hasn't been updated yet)
	ranks, err := repo.AccountStats(sess).GetRanks(gameMode, []proto.AccountID{stats.AccountID}, data.CurrentSeason())
	if err != nil {
		return nil, nil, proto.WrapError(proto.ErrInternal, err, "failed fetching account rank before match")
	}
	reward.Rank.BeforeMatch.RankPosition = ranks[stats.AccountID]

	// Record new rank according to ranking points
	var newRank playerRank.PlayerRank

	// update points
	stats.Score = &stats.PlayerRankState.RP
	maybeNewRank := playerRank.LookupRankByScore(*stats.Score)

	if currRank.HardFloor && *stats.Score < currRank.HardFloorValue {
		// cannot fall below hard floor
		// TODO: ok, but what happens with the state?
		newRank = currRank
		stats.Score = &currRank.HardFloorValue
		stats.PlayerRankState.RP = currRank.HardFloorValue
	} else {
		// allow to move freely following rank points
		newRank = maybeNewRank
	}

	stats.PlayerRank = newRank.Rank
	stats.PlayerRankStage = newRank.Stage
	stats.UpdatedAt = data.TimeNowUTCPtr()

	if stats.PlayerRankState.Won() {
		var rankUpXP int32
		if playerRank.IsRankStageUp(newRank, currRank) {
			rankUpXP = newRank.XPReward
		}
		// Winner got bonus XP from ranking up
		if rankUpXP > 0 {
			hasPreviousEvents, err := repo.FeedEvents(sess).Find(db.Cond{
				"account_id":        stats.AccountID,
				"event_type":        proto.FeedEventType_RANKUP,
				"player_rank":       stats.PlayerRank,
				"player_rank_stage": stats.PlayerRankStage,
				"game_mode":         gameMode,
				"season":            season,
			}).Exists()
			if err != nil {
				log.Error().Err(err).Msgf("updatePlayerRanks: failed to get event count from feed_events")
				return nil, nil, err
			}
			if !hasPreviousEvents {
				// Give extra XP only once per season
				events = append(events,
					&proto.FeedEvent{
						AccountID:       stats.AccountID,
						Type:            proto.FeedEventType_RANKUP,
						PlayerRank:      &stats.PlayerRank,
						PlayerRankStage: &stats.PlayerRankStage,
						GameMode:        &gameMode,
						Season:          &season,
					},
				)
				rewards = append(rewards,
					&proto.Reward{
						AccountID: stats.AccountID,
						Type:      proto.RewardType_EXP,
						Exp: &proto.RewardExp{
							Amount:         uint64(rankUpXP),
							Reason:         proto.RewardExpReason_RankUp,
							CurrentLevel:   seasonStat.LevelProgress(),
							RequiredExp:    levels.LevelUpXP(account.Level),
							BeforeMatchExp: account.Experience,
						},
					},
				)
			}
		}
	}

	reward.Rank.AfterMatch = &proto.RankData{
		Rank:               stats.PlayerRank,
		RankStage:          stats.PlayerRankStage,
		Score:              *stats.Score,
		RequiredRankPoints: newRank.NextRankRPMin(),
	}

	rewards = append(rewards, reward)

	return events, rewards, nil
}

func (u *MatchPlayerRankUpper) triggerAccountChecks(ctx context.Context, stats *data.AccountStat, match *data.Match) error {
	repo := rctx.DBContext(ctx)

	if stats.GameMode != proto.GameMode_RANKED_CONSTRUCTED && stats.GameMode != proto.GameMode_RANKED_DISCOVERY {
		return nil
	}

	// trigger checks for the first time somewhere between 5 and 10 matches in
	if stats.GamesPlayed+int32(rand.Intn(5)) < 10 {
		return nil
	}

	// starting with 15th match trigger checks every 5 matches played
	if stats.GameMode >= 15 && stats.GameMode%5 != 0 {
		return nil
	}

	err := repo.Tasks().EnqueueTask(jobqueue.UpdateMatchStatsQueue, jobqueue.UpdateMatchStats{
		AccountID: stats.AccountID,
		MatchID:   match.ID,
		Score:     *stats.Score,
	}, nil, &stats.AccountID)
	if err != nil {
		return err
	}

	err = repo.Tasks().EnqueueTask(jobqueue.UpdateOwnershipStatsQueue, jobqueue.UpdateOwnershipStats{
		AccountID: stats.AccountID,
		MatchID:   match.ID,
		Score:     *stats.Score,
	}, nil, &stats.AccountID)
	if err != nil {
		return err
	}

	return nil
}

// findBelowAndAboveMasters for grandmasters returns the ranking points of
// players above and below the same rank, for masters returns the ranking
// points of the last grandmaster.
func (u *MatchPlayerRankUpper) findBelowAndAboveMasters(ctx context.Context, sess db.Session, gameMode proto.GameMode, season uint16, accountStats data.AccountStat) (int32, int32, bool, error) {
	repo := rctx.DBContext(ctx)

	masterRank := playerRank.LookupRankByType(proto.PlayerRank_MASTER, proto.PlayerRankStage_STAGE_NONE)

	if *accountStats.Score < masterRank.RPMin {
		// player is not a master
		return 0, 0, false, nil
	}

	grandmasters, _, err := u.grandmastersUpdater.List(sess, gameMode, season)
	if err != nil {
		return 0, 0, false, errors.Wrap(err, "could not update ranks")
	}

	isGrandmaster := map[proto.AccountID]bool{}
	for i := range grandmasters {
		isGrandmaster[grandmasters[i].AccountID] = true
	}

	var lastGrandMaster *data.AccountStat
	if len(grandmasters) > 0 {
		lastGrandMaster = grandmasters[len(grandmasters)-1]
	}

	rankPointsBelow, rankPointsAbove := int32(0), int32(0)

	if isGrandmaster[accountStats.AccountID] {
		// Player one rank position below
		var playerBelow *data.AccountStat
		err := repo.AccountStats(sess).Find(db.Cond{
			"season":      data.CurrentSeason(),
			"game_mode":   gameMode,
			"player_rank": db.Gte(proto.PlayerRank_MASTER),
			"score":       db.Lte(accountStats.Score),
			"account_id":  db.NotEq(accountStats.AccountID),
			"status":      db.NotAnyOf(data.BannedStatuses),
		}).OrderBy(
			"-score",
			"updated_at",
			"account_id",
		).Limit(1).One(&playerBelow)

		if err != nil && !errors.Is(err, db.ErrNoMoreRows) {
			return 0, 0, false, errors.Wrap(err, "Fetching below failed")
		}
		if playerBelow != nil {
			rankPointsBelow = *playerBelow.Score
		}

		// Player one rank position above
		var playerAbove *data.AccountStat
		err = repo.AccountStats(sess).Find(db.Cond{
			"season":      data.CurrentSeason(),
			"game_mode":   gameMode,
			"player_rank": db.Gte(proto.PlayerRank_MASTER),
			"score":       db.Gte(accountStats.Score),
			"account_id":  db.NotEq(accountStats.AccountID),
			"status":      db.NotAnyOf(data.BannedStatuses),
		}).OrderBy(
			"score",
			"-updated_at",
			"-account_id",
		).Limit(1).One(&playerAbove)

		if err != nil && !errors.Is(err, db.ErrNoMoreRows) {
			return 0, 0, false, errors.Wrap(err, "Fetching above failed")
		}
		if playerAbove != nil {
			rankPointsAbove = *playerAbove.Score
		}
		return rankPointsBelow, rankPointsAbove, true, nil
	}

	if lastGrandMaster != nil {
		rankPointsAbove = *lastGrandMaster.Score
	}

	return 0, rankPointsAbove, false, nil
}

func (u *MatchPlayerRankUpper) PromoteUnranked(sess db.Session, account *data.Account, xp uint64) ([]*proto.FeedEvent, []*proto.Reward, error) {
	var events []*proto.FeedEvent
	var rewards []*proto.Reward

	if account == nil {
		return nil, nil, fmt.Errorf("account is nil")
	}

	season := data.CurrentSeason()

	gameModes := []proto.GameMode{
		proto.GameMode_RANKED_CONSTRUCTED,
		proto.GameMode_RANKED_DISCOVERY,
	}

	wandererRank := playerRank.LookupRankByType(
		proto.PlayerRank_WANDERER,
		proto.PlayerRankStage_STAGE_I,
	)

	for i := range gameModes {
		gameMode := gameModes[i]

		stats, err := data.DB.AccountStats(sess).FindOrCreateByAccountIDAndMode(account.ID, gameMode, data.CurrentSeason())
		if err != nil {
			return nil, nil, fmt.Errorf("retrieve player stats: %w", err)
		}

		// already wanderer
		if stats.PlayerRank >= wandererRank.Rank {
			continue
		}

		// xp is not enough
		totalExp := levels.TotalExperience(account.Level, xp)
		if totalExp < uint64(wandererRank.XPMin) {
			continue
		}

		// create reward
		reward := &proto.Reward{
			AccountID: stats.AccountID,
			Type:      proto.RewardType_RANK,
			GameMode:  &gameMode,
			Rank:      &proto.RewardRank{},
		}

		// record data before match
		reward.Rank.BeforeMatch = &proto.RankData{
			Rank:               proto.PlayerRank_UNRANKED,
			RankStage:          proto.PlayerRankStage_STAGE_I,
			Score:              wandererRank.HardFloorValue,
			RequiredRankPoints: wandererRank.HardFloorValue,
		}

		stats.PlayerRank = wandererRank.Rank
		stats.PlayerRankStage = wandererRank.Stage

		err = sess.Save(stats)
		if err != nil {
			return nil, nil, fmt.Errorf("failed to persist player stats: %w", err)
		}

		// record data after match
		reward.Rank.AfterMatch = &proto.RankData{
			Rank:               proto.PlayerRank_WANDERER,
			RankStage:          proto.PlayerRankStage_STAGE_I,
			Score:              wandererRank.HardFloorValue,
			RequiredRankPoints: wandererRank.NextRankRPMin(),
		}

		// add new reward
		if gameMode == proto.GameMode_RANKED_CONSTRUCTED {
			rewards = append(rewards, reward)
		}

		// add new event
		events = append(events,
			&proto.FeedEvent{
				AccountID:       stats.AccountID,
				Type:            proto.FeedEventType_RANKUP,
				PlayerRank:      &stats.PlayerRank,
				PlayerRankStage: &stats.PlayerRankStage,
				GameMode:        &gameMode,
				Season:          &season,
			},
		)
	}

	return events, rewards, nil
}

func newPlayerRankState(stats *data.AccountStat, currState ranking.State, newState ranking.State) proto.RankState {
	if stats == nil {
		return proto.RankState{}
	}

	if stats.PlayerRank < proto.PlayerRank_APPRENTICE {
		//  Ensure RP can't go down before a player reaches the Apprentice rank
		if newState.RP < currState.RP {
			newState.RP = currState.RP
		}

		//  Ensure RD remains unchanged for players before reaching the Apprentice rank
		newState.RD = ranking.DefaultGlicko_RDInit
	}

	return proto.RankState{State: newState}
}

func mayPersistStats(stat *data.AccountStat) bool {
	if stat == nil {
		return false
	}
	if stat.PlayerRank < proto.PlayerRank_WANDERER {
		return false
	}

	// Practice PvP players will not gain nor lose RP no matter their opponent
	switch stat.GameMode {
	case proto.GameMode_RANKED_CONSTRUCTED, proto.GameMode_RANKED_DISCOVERY:
		return true
	}
	return false
}

//go:generate go run go.uber.org/mock/mockgen -destination ./mock/grandmasters_lister_updater.go -package mock . GrandmasterListerUpdater
type GrandmasterListerUpdater interface {
	List(sess db.Session, gameMode proto.GameMode, season uint16) (grandmasters []*data.AccountStat, masters []*data.AccountStat, err error)
	Update(sess db.Session, gameMode proto.GameMode, season uint16) error
}
