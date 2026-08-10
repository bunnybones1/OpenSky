package rpc

import (
	"context"
	"fmt"
	"math/rand"
	"time"

	"github.com/pkg/errors"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
	"github.com/upper/db/v4"

	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/lib/levels"
	playerRank "github.com/horizon-games/OpenSky/api/lib/player_rank"
	"github.com/horizon-games/OpenSky/api/lib/signals"
	"github.com/horizon-games/OpenSky/api/proto"
	"github.com/horizon-games/OpenSky/api/rpc/middleware"
	"github.com/horizon-games/OpenSky/api/rpc/rctx"
)

func init() {
	rand.Seed(time.Now().UnixNano())
}

func (s *Server) InternalMatchStart(ctx context.Context, req *proto.MatchStartRequest) (uint64, string, error) {
	repo := rctx.DBContext(ctx)
	oplog := rctx.Logger(ctx)

	if req.Info == nil {
		return 0, "", proto.Failf("match start info is invalid.")
	}

	status, err := repo.GameModeStatus().CheckStatuses(req.Info.Player1GameMode, req.Info.Player2GameMode)
	if err != nil {
		return 0, "", proto.Failf("checking game mode status failed")
	}

	if !status {
		return 0, "", proto.Failf("one of the game modes (%q or %q) is disabled", req.Info.Player1GameMode, req.Info.Player2GameMode)
	}

	// Check compatibility
	if !isGameModeCompatible(req.Info.Player1GameMode, req.Info.Player2GameMode) {
		return 0, "", proto.Failf("game modes are not compatible (%v vs %v)", req.Info.Player1GameMode, req.Info.Player2GameMode)
	}

	// Ensure both player addresses are correct and exist
	perr := proto.Failf("player1 or player2 address is invalid. both players must be registered in order to play.")
	if req.Player1 == nil || req.Player2 == nil {
		return 0, "", perr
	}

	oplog = oplog.With().
		Stringer("player1.address", req.Player1.Address).
		Bool("player1.isBot", req.Player1.IsBot).
		Stringer("player1.gameMode", req.Info.Player1GameMode).
		Stringer("player2.address", req.Player2.Address).
		Bool("player2.isBot", req.Player2.IsBot).
		Stringer("player2.gameMode", req.Info.Player2GameMode).
		Logger()

	var player1, player2 *data.Account

	player1, err = repo.Accounts().FindByAddress(req.Player1.Address)
	if err != nil {
		oplog.Debug().Err(err).Msgf("FindByAddress: %v", req.Player1.Address)
		if errors.Is(err, db.ErrNoMoreRows) && req.Player1.IsBot {
			// pass: account doesn't exists, but it's a non-registered bot
		} else {
			return 0, "", perr
		}
	}
	if player1 != nil {
		req.Player1.IsBot = player1.IsBot
	}

	player2, err = repo.Accounts().FindByAddress(req.Player2.Address)
	if err != nil {
		oplog.Debug().Err(err).Msgf("FindByAddress: %v", req.Player2.Address)
		if errors.Is(err, db.ErrNoMoreRows) && req.Player2.IsBot {
			// pass: account doesn't exists, but it's a non-registered bot
		} else {
			return 0, "", perr
		}
	}
	if player2 != nil {
		req.Player2.IsBot = player2.IsBot
	}

	// Check for active conquests when creating a conquest match
	if isConquestMatch(req.Info.Player1GameMode, req.Info.Player2GameMode) {
		// Player 1
		p1Conquest, err := repo.Conquests().FindOne(db.Cond{
			"account_id": player1.ID,
			"game_mode":  req.Info.Player1GameMode,
			"status":     proto.ConquestStatus_IN_PROGRESS,
		})
		if err == db.ErrNoMoreRows {
			return 0, "", proto.Errorf(proto.ErrFailedPrecondition, "player 1 (%d) has no active conquest matching game mode", player1.ID)
		}

		if err != nil {
			return 0, "", proto.WrapError(proto.ErrInternal, err, "failed checking for conquest")
		}

		if req.Player1.DeckClass == nil || *req.Player1.DeckClass == 0 || data.HeroDeckClass(p1Conquest.Hero) != *req.Player1.DeckClass {
			return 0, "", proto.Errorf(proto.ErrFailedPrecondition, "player 1 (%d) has a different hero (%s) locked in active conquest", player1.ID, p1Conquest.Hero.String())
		}

		// Player 2
		p2Conquest, err := repo.Conquests().FindOne(db.Cond{
			"account_id": player2.ID,
			"game_mode":  req.Info.Player2GameMode,
			"status":     proto.ConquestStatus_IN_PROGRESS,
		})

		if err == db.ErrNoMoreRows {
			return 0, "", proto.Errorf(proto.ErrFailedPrecondition, "player 2 (%d) has no active conquest matching game mode", player2.ID)
		}

		if err != nil {
			return 0, "", proto.WrapError(proto.ErrInternal, err, "failed checking for conquest")
		}

		if req.Player2.DeckClass == nil || *req.Player2.DeckClass == 0 || data.HeroDeckClass(p2Conquest.Hero) != *req.Player2.DeckClass {
			return 0, "", proto.Errorf(proto.ErrFailedPrecondition, "player 2 (%d) has a different hero (%s) locked in active conquest", player2.ID, p2Conquest.Hero.String())
		}
	}

	// Check for minimum XP in ranked mode
	if player1 != nil {
		switch *req.Info.Player1GameMode {
		case proto.GameMode_RANKED_CONSTRUCTED, proto.GameMode_RANKED_DISCOVERY:
			if levels.TotalExperience(player1.Account.Level, player1.Account.Experience) < playerRank.MinimumExpForRanked {
				return 0, "", proto.Errorf(proto.ErrFailedPrecondition, "player %d does not meet the minimum experience required for playing ranked", player1.ID)
			}
		}
	}
	if player2 != nil {
		switch *req.Info.Player2GameMode {
		case proto.GameMode_RANKED_CONSTRUCTED, proto.GameMode_RANKED_DISCOVERY:
			if levels.TotalExperience(player2.Account.Level, player2.Account.Experience) < playerRank.MinimumExpForRanked {
				return 0, "", proto.Errorf(proto.ErrFailedPrecondition, "player %d does not meet the minimum experience required for playing ranked", player2.ID)
			}
		}
	}

	var player1ID proto.AccountID
	if player1 != nil {
		player1ID = player1.ID
	}

	var player2ID proto.AccountID
	if player2 != nil {
		player2ID = player2.ID
	}

	oplog = oplog.With().
		Uint64("player1.id", player1ID.UInt64()).
		Uint64("player2.id", player2ID.UInt64()).
		Logger()

	cardIds1, _, _, _ := data.DecodeDeckString(req.Player1.InitDeckString)
	cardIds2, _, _, _ := data.DecodeDeckString(req.Player2.InitDeckString)

	now := time.Now().UTC()
	match := &data.Match{Match: &proto.Match{
		Status:                  proto.MatchStatus_IN_PROGRESS,
		Player1ID:               player1ID,
		Player2ID:               player2ID,
		Player1GameMode:         *req.Info.Player1GameMode,
		Player2GameMode:         *req.Info.Player2GameMode,
		InitPlayer1DeckString:   req.Player1.InitDeckString,
		InitPlayer2DeckString:   req.Player2.InitDeckString,
		InitPlayer1DeckNumCards: uint(len(cardIds1)),
		InitPlayer2DeckNumCards: uint(len(cardIds2)),
		StartedAt:               &now,
	}}

	var matchID uint64
	var replayID string

	if player1 != nil && player2 != nil {
		// Validate match
		if err := match.Validate(); err != nil {
			return 0, "", proto.WrapError(proto.ErrInternal, err, "failed to validate")
		}

		// Record match entry
		err = repo.TxContext(ctx, func(tx db.Session) error {
			if err := tx.Save(match); err != nil {
				return err
			}
			return nil
		}, nil)
		if err != nil {
			return 0, "", proto.WrapFailf(err, "failed to create new match: %v", err)
		}
		match.GenerateReplayID(s.Config.Match.ReplayIDSalt)

		matchID, replayID = match.ID, match.ReplayID

		oplog.Debug().Uint64("match.id", matchID).Msg("match started")
	} else {
		// even though the Go type here is uint64, this value must stay in the int4
		// range
		matchID = uint64(100000000) + uint64(rand.Int63n(1000000))

		oplog.Debug().Uint64("match.id", matchID).Msg("bot match started")
	}

	r := rctx.HTTPRequest(ctx)
	if err := s.Analytics.TrackStartMatch(r, match.Match, req); err != nil {
		oplog.Err(err).Msg("TrackStartMatch")
	}

	return matchID, replayID, nil
}

func (s *Server) InternalMatchEnd(ctx context.Context, req *proto.MatchEndRequest) ([]*proto.Reward, error) {
	logger := rctx.Logger(ctx)
	repo := rctx.DBContext(ctx)

	var rewards []*proto.Reward

	// Check for invalid match-end request
	if req.Status == proto.MatchStatus_IN_PROGRESS {
		return nil, proto.Failf("match is still in-progress")
	}

	// Crashed matches are considered to be tied
	if req.Status == proto.MatchStatus_CRASHED {
		var tiedGame uint = 0
		req.WinningPlayer = &tiedGame

		if req.EndedAt == nil {
			now := time.Now().UTC()
			req.EndedAt = &now
		}
	}

	if req.WinningPlayer == nil {
		return nil, proto.Failf("winningPlayer cannot be empty when recording the final match results")
	}

	match, err := repo.Matches().FindByID(req.MatchID)
	if err != nil {
		return nil, proto.WrapFailf(err, "match %d doesn't exist", req.MatchID)
	}

	if match == nil {
		return nil, proto.Failf("match %d doesn't exist", req.MatchID)
	}

	if match.Status != proto.MatchStatus_IN_PROGRESS {
		return nil, proto.Failf("match already recorded")
	}

	if req.Player1DeckString == "" || req.Player2DeckString == "" {
		return nil, proto.Failf("player deck strings cannot be empty")
	}

	// update match info
	match.Status = req.Status
	match.Player1DeckString = req.Player1DeckString
	match.Player2DeckString = req.Player2DeckString
	match.WinningPlayer = req.WinningPlayer
	match.TurnNonce = req.TurnNonce
	match.Player1Moves = req.Player1Moves
	match.Player2Moves = req.Player2Moves
	match.Metrics = req.Metrics
	match.EndedAt = req.EndedAt
	_, deckClass1, _, _ := data.DecodeDeckString(req.Player1DeckString)
	match.Player1DeckClass = &deckClass1

	_, deckClass2, _, _ := data.DecodeDeckString(req.Player2DeckString)
	match.Player2DeckClass = &deckClass2

	rewards, _, err = s.endMatch(ctx, match)
	if err != nil {
		log.Error().Msgf("saving match failed with %v", err)
		return nil, proto.ErrorInternal("saving match failed with %v", err)
	}

	if match.Player1ID.IsValid() {
		logger.Info().
			Uint64("match_id", match.ID).
			Uint64("player", match.Player1ID.UInt64()).
			Str("game_mode", match.Player1GameMode.String()).Func(func(e *zerolog.Event) {
			for questID, progress := range req.Player1QuestProgressUpdates {
				e.Uint16(fmt.Sprintf("quest_id_%d", questID), progress)
			}
		}).Msg("quest progress from match")
		if err := s.QuestUpdater.UpdateFromMatch(ctx, repo, match.Player1ID, req.Player1QuestProgressUpdates); err != nil {
			log.Err(err).Msgf("update quests in match %d for player %s", match.ID, match.Player1Address)
			return nil, fmt.Errorf("update quests: %w", err)
		}
	}

	if match.Player2ID.IsValid() {
		logger.Info().
			Uint64("match_id", match.ID).
			Uint64("player", match.Player2ID.UInt64()).
			Str("game_mode", match.Player2GameMode.String()).Func(func(e *zerolog.Event) {
			for questID, progress := range req.Player2QuestProgressUpdates {
				e.Uint16(fmt.Sprintf("quest_id_%d", questID), progress)
			}
		}).Msg("quest progress from match")
		if err := s.QuestUpdater.UpdateFromMatch(ctx, repo, match.Player2ID, req.Player2QuestProgressUpdates); err != nil {
			log.Err(err).Msgf("update quests in match %d for player %s", match.ID, match.Player2Address)
			return nil, fmt.Errorf("update quests: %w", err)
		}
	}

	r := rctx.HTTPRequest(ctx)
	if err := s.Analytics.TrackEndMatch(r, match, req); err != nil {
		logger.Err(err).Msg("TrackEndMatch")
	}

	s.MetricsCollector.TrackMatchEnd(match)

	switch {
	case match.IsRanked() || match.IsConquest():
		// ok
	default:
		// return early for unranked and non-conquest games
		return rewards, nil
	}

	// Track rewards
	if err := s.Analytics.TrackRewardMatch(r, rewards, req, match); err != nil {
		logger.Err(err).Msg("TrackRewardMatch")
	}

	return rewards, nil
}

func (s *Server) BotMatchEnd(ctx context.Context, req *proto.BotMatchEndRequest) ([]*proto.Reward, error) {
	logger := rctx.Logger(ctx)
	repo := rctx.DBContext(ctx)

	sessionType := rctx.SessionTypeContext(ctx)

	var account *data.Account

	if sessionType == middleware.SessionTypeService {
		if req.PlayerAddress == nil {
			return nil, proto.Failf("must pass a player address when calling from service session")
		}

		var err error

		account, err = data.DB.Accounts(repo).FindByAddress(proto.HashFromString(*req.PlayerAddress))
		if err != nil {
			logger.Err(err).Msgf("find account %s", *req.PlayerAddress)
			return nil, proto.Failf("find account %s failed: %v", *req.PlayerAddress, err)
		}
	} else {
		account, _ = rctx.CurrentAccount(ctx)
		if account == nil {
			return nil, proto.Failf("logged-in users only")
		}

		if req.Mode != nil && *req.Mode != proto.GameMode_TUTORIAL {
			err := shadowban(ctx, account, signals.USER_FAKED_BOT)
			if err != nil {
				logger.Err(err).Msgf("shadow ban")
				return nil, proto.Failf("failed saving signal with: %v", err)
			}
		}
	}

	var rewards []*proto.Reward
	var match *data.Match

	// Check for invalid match-end request
	if req.Status == proto.MatchStatus_IN_PROGRESS {
		logger.Error().Msgf("match is still in-progress")
		return nil, proto.Failf("match is still in-progress")
	}

	mode := proto.GameMode_PRACTICE_BOT
	if req.Mode != nil {
		switch *req.Mode {
		case proto.GameMode_WARM_UP, proto.GameMode_TUTORIAL:
			mode = *req.Mode
		}
	}

	// Crashed matches are considered to be tied
	if req.Status == proto.MatchStatus_CRASHED {
		var tiedGame uint = 0
		req.WinningPlayer = &tiedGame
	}
	if req.WinningPlayer == nil {
		logger.Error().Msgf("winningPlayer cannot be empty when recording the final match results")
		return nil, proto.Failf("winningPlayer cannot be empty when recording the final match results")
	}

	_, deckClass, _, _ := data.DecodeDeckString(req.DeckString)

	now := time.Now().UTC()
	match = &data.Match{
		Match: &proto.Match{
			Status:                req.Status,
			WinningPlayer:         req.WinningPlayer,
			Player1ID:             account.ID,
			Player1DeckString:     req.DeckString,
			Player1DeckClass:      &deckClass,
			Player1GameMode:       mode,
			InitPlayer1DeckString: req.DeckString,
			StartedAt:             &req.MatchStartedAt,
			EndedAt:               &now,
			TurnNonce:             req.TurnNonce,
			TutorialLevel:         req.TutorialLevel,
			Player1: &proto.MatchPlayer{
				ID:             account.ID,
				Address:        account.Address,
				DeckString:     req.DeckString,
				InitDeckString: req.DeckString,
			},
		},
	}

	rewards, _, err := s.endMatch(ctx, match)
	if err != nil {
		logger.Err(err).Msgf("save match")
		return nil, proto.ErrorInternal("saving match failed with %v", err)
	}

	if match.Player1ID.IsValid() {
		logger.Info().
			Uint64("player", match.Player1ID.UInt64()).
			Str("game_mode", match.Player1GameMode.String()).Func(func(e *zerolog.Event) {
			for questID, progress := range req.PlayerQuestProgressUpdates {
				e.Uint16(fmt.Sprintf("quest_id_%d", questID), progress)
			}
		}).Msg("quest progress from match")
		if err := s.QuestUpdater.UpdateFromMatch(ctx, repo, match.Player1ID, req.PlayerQuestProgressUpdates); err != nil {
			log.Err(err).Msgf("update quests in bot match for player %s", match.Player1Address)
			return nil, fmt.Errorf("update quests: %w", err)
		}
	}

	r := rctx.HTTPRequest(ctx)
	if err = s.Analytics.TrackEndMatch(r, match, &proto.MatchEndRequest{Player1SessionId: req.PlayerSessionId}); err != nil {
		logger.Err(err).Msg("TrackEndMatch")
	}

	if mode == proto.GameMode_TUTORIAL {
		if err := s.Analytics.TrackTutorialStatus(r, match.Player1ID, match); err != nil {
			logger.Err(err).Msgf("TrackTutorialStatus")
		}
	}

	s.MetricsCollector.TrackMatchEnd(match)

	return rewards, nil
}

func (s *Server) AvailableXPBonuses(ctx context.Context) (int, error) {
	return 0, nil
}

func getMatchWinnerLoser(ctx context.Context, sess db.Session, match *data.Match) (*data.Account, *data.Account, bool, error) {
	repo := rctx.DBContext(ctx)

	var p1, p2 *data.Account
	var err error

	if match.Player1ID.IsValid() {
		p1, err = repo.Accounts(sess).FindByID(match.Player1ID)
		if err != nil {
			return nil, nil, false, errors.Wrap(err, "fetching winner account failed")
		}

		p1.Experience, err = data.DB.Items(sess).GetXP(p1.ID)
		if err != nil {
			return nil, nil, false, fmt.Errorf("get winner xp: %w", err)
		}
	}
	if match.Player2ID.IsValid() {
		p2, err = repo.Accounts(sess).FindByID(match.Player2ID)
		if err != nil {
			return nil, nil, false, errors.Wrap(err, "fetching loser account failed")
		}

		p2.Experience, err = data.DB.Items(sess).GetXP(p2.ID)
		if err != nil {
			return nil, nil, false, fmt.Errorf("get loser xp: %w", err)
		}
	}

	if match.WinningPlayer == nil || *match.WinningPlayer == 0 {
		return p1, p2, true, nil
	}

	if *match.WinningPlayer == 1 {
		return p1, p2, false, nil
	}

	if *match.WinningPlayer == 2 {
		return p2, p1, false, nil
	}

	return nil, nil, false, nil
}

func (s *Server) endMatch(ctx context.Context, match *data.Match) ([]*proto.Reward, []*proto.FeedEvent, error) {
	repo := rctx.DBContext(ctx)

	oplog := rctx.Logger(ctx)

	var rewards []*proto.Reward
	var events []*proto.FeedEvent

	err := repo.TxContext(ctx, func(tx db.Session) error {
		var xpRewards []*proto.Reward
		var xpEvents []*proto.FeedEvent

		winner, loser, isDraw, err := getMatchWinnerLoser(ctx, tx, match)
		if err != nil {
			oplog.Error().Msgf("matchEnd: fetching winner/loser failed %v", err)
			return errors.Wrap(err, "fetching winner/loser failed")
		}

		// update warm up counter
		if err := updateWarmUpCounter(match, winner); err != nil {
			oplog.Error().Msgf("matchEnd: updating warm up counter failed. %v", err)
			return errors.Wrap(err, "updating warm up counter failed")
		}

		if !match.IsPracticeBot() {
			// update player ranks and stats (scores and win/loss/abandon/forfeit counts)
			rankUpEvents, rankUpRewards, err := s.MatchPlayerRankUpper.UpdatePlayerStatsAndRanks(ctx, tx, match)
			if err != nil {
				oplog.Err(err).Msgf("matchEnd: updating player stats")
				return errors.Wrap(err, "updating player stats failed")
			}
			events = append(events, rankUpEvents...)
			rewards = append(rewards, rankUpRewards...)
		}

		// award XP
		xpRewards, err = s.MatchXPAwarder.AwardFromMatch(tx, match, winner, loser)
		if err != nil {
			oplog.Err(err).Msgf("award xp from match")
			return errors.Wrap(err, "awarding match XP failed")
		}
		rewards = append(rewards, xpRewards...)

		// update conquest progress
		conquestEvents, conquestRewards, err := s.updateConquestProgress(ctx, tx, match, winner, loser, isDraw)
		if err != nil {
			oplog.Error().Msgf("matchEnd: updating conquest progress failed. %v", err)
			return errors.Wrap(err, "updating conquest progress failed")
		}
		events = append(events, conquestEvents...)
		rewards = append(rewards, conquestRewards...)

		// update XP from match
		{
			var winnerNewXP, loserNewXP uint64
			for _, reward := range rewards {
				if reward.Type != proto.RewardType_EXP {
					continue
				}
				if winner != nil && reward.AccountID == winner.ID {
					winnerNewXP += reward.Exp.Amount
				}
				if loser != nil && reward.AccountID == loser.ID {
					loserNewXP += reward.Exp.Amount
				}
			}

			xpEvents, xpRewards, err = s.MatchXPUpdater.UpdateFromMatch(tx, match, winner, loser, winnerNewXP, loserNewXP)
			if err != nil {
				oplog.Err(err).Msg("update xp from match")
				return fmt.Errorf("update xp from match: %w", err)
			}
			events = append(events, xpEvents...)
			rewards = append(rewards, xpRewards...)
		}

		// save match, unless it's a bot game
		if match.ID > 0 {
			if err := tx.Save(match); err != nil {
				oplog.Error().Msgf("matchEnd: saving match failed. %v", err)
				return errors.Wrap(err, "saving match failed")
			}
		}

		if err := s.DeckRankUpdater.UpdateFromMatch(tx, match, data.CurrentSeason()); err != nil {
			oplog.Err(err).Msg("update deck rank from match")
			return fmt.Errorf("update deck rank from match: %w", err)
		}

		if match.IsConquest() {
			err = s.ConquestAccountStatUpdater.RecalculateScore(ctx, tx, match.Player1GameMode, data.CurrentSeason(), winner)
			if err != nil {
				oplog.Err(err).Msg("recalculate conquest score for winner")
			}

			err = s.ConquestAccountStatUpdater.RecalculateScore(ctx, tx, match.Player1GameMode, data.CurrentSeason(), loser)
			if err != nil {
				oplog.Err(err).Msg("recalculate conquest score for loser")
			}
		}

		if winner != nil {
			if err := tx.Save(winner); err != nil {
				oplog.Error().Msgf("matchEnd: failed saving winner account changes. %v", err)
				return errors.Wrap(err, "failed saving winner account changes")
			}
		}
		if loser != nil {
			if err := tx.Save(loser); err != nil {
				oplog.Error().Msgf("matchEnd: failed saving loser account changes. %v", err)
				return errors.Wrap(err, "failed saving loser account changes")
			}
		}

		for _, ev := range events {
			// The specific events are deprecated, so we do not store them.
			if ev.Type == proto.FeedEventType_LEVELUP {
				continue
			}
			if err := tx.Save(&data.FeedEvent{FeedEvent: ev}); err != nil {
				oplog.Error().Msgf("matchEnd: failed saving events %v", err)
				return errors.Wrap(err, "failed saving events")
			}
		}

		return nil
	}, nil)

	return rewards, events, err
}

func updateWarmUpCounter(match *data.Match, winner *data.Account) error {
	if match.Match == nil {
		return errors.New("match missing")
	}
	if !match.IsPractice() {
		return nil
	}
	if match.Match.Status != proto.MatchStatus_COMPLETED {
		return nil
	}
	if match.Match.WinningPlayer == nil {
		return errors.New("winning player is not defined")
	}
	if match.IsPracticeBot() {
		if *match.Match.WinningPlayer != 1 {
			// game is either tied or was won by the bot
			return nil
		}
	}
	if winner.WarmUps < 3 {
		winner.WarmUps++
	}
	return nil
}

func (s *Server) updateConquestProgress(ctx context.Context, sess db.Session, match *data.Match, winner, loser *data.Account, isDraw bool) ([]*proto.FeedEvent, []*proto.Reward, error) {
	if !match.IsConquest() {
		return nil, nil, nil
	}

	var conquestRewards []*proto.Reward

	var conquestEvents []*proto.FeedEvent

	winnerMatchResult := proto.ConquestMatchResult_WIN
	loserMatchResult := proto.ConquestMatchResult_LOSS

	if isDraw {
		winnerMatchResult = proto.ConquestMatchResult_DRAW
		loserMatchResult = proto.ConquestMatchResult_DRAW
	}

	events, rewards, err := s.ConquestStateManager.UpdateProgress(ctx, sess, winner.ID, match.ID, winnerMatchResult)
	if err != nil {
		return nil, nil, fmt.Errorf("update conquest progress for winner: %w", err)
	}

	conquestEvents = append(conquestEvents, events...)
	conquestRewards = append(conquestRewards, rewards...)

	events, rewards, err = s.ConquestStateManager.UpdateProgress(ctx, sess, loser.ID, match.ID, loserMatchResult)
	if err != nil {
		return nil, nil, fmt.Errorf("update conquest progress for loser: %w", err)
	}

	conquestEvents = append(conquestEvents, events...)
	conquestRewards = append(conquestRewards, rewards...)

	events, rewards, err = s.ConquestV2PointsUpdater.Update(ctx, sess, match)
	if err != nil {
		return nil, nil, fmt.Errorf("update conquest points: %w", err)
	}

	conquestEvents = append(conquestEvents, events...)
	conquestRewards = append(conquestRewards, rewards...)

	return conquestEvents, conquestRewards, nil
}

func isConquestMatch(a, b *proto.GameMode) bool {
	if a == nil || b == nil {
		return false
	}
	if *a == proto.GameMode_CONQUEST_DISCOVERY || *a == proto.GameMode_CONQUEST_CONSTRUCTED {
		return *a == *b
	}
	return false
}

func isGameModeCompatible(a, b *proto.GameMode) bool {
	switch {
	case *a == proto.GameMode_RANKED_CONSTRUCTED || *b == proto.GameMode_RANKED_CONSTRUCTED:
		if *a == proto.GameMode_PRACTICE_PVP || *b == proto.GameMode_PRACTICE_PVP {
			return true
		}
	}
	return *a == *b
}

// ConquestExiter exits the conquest.
//
//go:generate go run go.uber.org/mock/mockgen -destination ./mock/conquest_exiter.go -package mock . ConquestExiter
type ConquestExiter interface {
	Exit(context.Context, db.Session, proto.Hash) ([]*proto.FeedEvent, []*proto.Reward, error)
}

// ConquestAccountStatUpdater updates score.
//
//go:generate go run go.uber.org/mock/mockgen -destination ./mock/conquest_account_stat_updater.go -package mock . ConquestAccountStatUpdater
type ConquestAccountStatUpdater interface {
	RecalculateScore(ctx context.Context, sess db.Session, mode proto.GameMode, season uint16, account *data.Account) error
}

// ConquestV2PointsUpdater updates conquest points for players.
//
//go:generate go run go.uber.org/mock/mockgen -destination ./mock/conquest_v2_points_updater.go -package mock . ConquestV2PointsUpdater
type ConquestV2PointsUpdater interface {
	Update(context.Context, db.Session, *data.Match) ([]*proto.FeedEvent, []*proto.Reward, error)
}

type MatchPlayerRankUpper interface {
	UpdatePlayerStatsAndRanks(context.Context, db.Session, *data.Match) ([]*proto.FeedEvent, []*proto.Reward, error)
}

type MatchXPAwarder interface {
	AwardFromMatch(db.Session, *data.Match, *data.Account, *data.Account) ([]*proto.Reward, error)
}

type MatchXPUpdater interface {
	UpdateFromMatch(db.Session, *data.Match, *data.Account, *data.Account, uint64, uint64) ([]*proto.FeedEvent, []*proto.Reward, error)
}

type QuestUpdater interface {
	UpdateFromMatch(context.Context, db.Session, proto.AccountID, map[uint64]uint16) error
}

type DeckRankUpdater interface {
	UpdateFromMatch(sess db.Session, match *data.Match, season uint16) error
}
