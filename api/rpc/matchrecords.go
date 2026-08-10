package rpc

import (
	"context"
	"fmt"
	"time"

	"github.com/rs/zerolog/log"
	db "github.com/upper/db/v4"

	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/proto"
	rpcmw "github.com/horizon-games/OpenSky/api/rpc/middleware"
	"github.com/horizon-games/OpenSky/api/rpc/rctx"
)

type matchWithUsers struct {
	*data.Match

	P1 *proto.MatchPlayer `db:"p1"`
	P2 *proto.MatchPlayer `db:"p2"`
}

func (s *Server) ListMatches(ctx context.Context, page *proto.Page, req *proto.ListMatchesRequest) (*proto.Page, []*proto.Match, error) {
	logger := rctx.Logger(ctx)
	repo := rctx.DBContext(ctx)

	account, _ := rctx.CurrentAccount(ctx)
	sessionType := rctx.SessionTypeContext(ctx)

	if req == nil {
		req = &proto.ListMatchesRequest{}
	}

	// for user/wallet sessions, we always set to return only the user's matches
	if sessionType != rpcmw.SessionTypeAdmin {
		if account == nil {
			return nil, nil, proto.Errorf(proto.ErrPermissionDenied, "missing account info")
		}

		if req.AccountAddress != nil && *req.AccountAddress != account.Address {
			return nil, nil, proto.Errorf(proto.ErrPermissionDenied, "you can only view your own match history")
		}

		req.AccountAddress = &account.Address
	}

	if sessionType == rpcmw.SessionTypeAdmin && req.AccountAddress == nil {
		req.AccountAddress = &account.Address
	}

	filters := db.And()

	gameModes := []proto.GameMode{
		proto.GameMode_RANKED_CONSTRUCTED,
		proto.GameMode_RANKED_DISCOVERY,
	}

	if req.AccountAddress != nil && req.AccountAddress.IsValidAddress() {
		player, err := data.DB.Accounts(repo).FindByAddress(*req.AccountAddress)
		if err != nil {
			logger.Err(err).Msgf("find account %s", *req.AccountAddress)
			return nil, nil, proto.ErrorInternal("find account failed")
		}

		filters = filters.And(db.Or(
			db.Cond{"matches.p1_id": player.ID},
			db.Cond{"matches.p2_id": player.ID},
		))

		if account != nil && (account.ID == player.ID || account.Admin) {
			gameModes = []proto.GameMode{
				proto.GameMode_RANKED_CONSTRUCTED,
				proto.GameMode_RANKED_DISCOVERY,
				proto.GameMode_CONQUEST_CONSTRUCTED,
				proto.GameMode_CONQUEST_DISCOVERY,
				proto.GameMode_CHALLENGE_CONSTRUCTED,
				proto.GameMode_CHALLENGE_DISCOVERY,
			}
		}
	}

	filters = filters.And(db.Or(
		db.Cond{"matches.p1_game_mode": db.AnyOf(gameModes)},
		db.Cond{"matches.p2_game_mode": db.AnyOf(gameModes)},
	))

	filters = filters.And(db.Cond{
		"matches.status": db.In(proto.MatchStatus_ABANDONED, proto.MatchStatus_FORFEITED, proto.MatchStatus_COMPLETED),
	})

	q := listMatchesQuery(ctx, filters)

	results := []*matchWithUsers{}

	cursorKey := &proto.SortBy{
		Column: "matches.id",
		Order:  &sortOrder_DESC,
	}
	orderByStartedAt := &proto.SortBy{
		Column: "matches.started_at",
		Order:  &sortOrder_DESC,
	}

	paginator, err := NewPaginator(page, cursorKey, orderByStartedAt)
	if err != nil {
		return nil, nil, proto.WrapError(proto.ErrInternal, err, "invalid page settings")
	}

	if err := paginator.Source(q).Get(ctx, &results); err != nil {
		return nil, nil, err
	}

	matches := make([]*proto.Match, len(results))

	for i := range results {
		match := results[i]

		match.Match.Player1 = match.P1
		match.Match.Player2 = match.P2

		match.GenerateReplayID(s.Config.Match.ReplayIDSalt)

		matches[i] = match.Match.Match
	}

	return paginator.Page(), matches, nil
}

func (s *Server) GetMatch(ctx context.Context, matchID uint64) (*proto.Match, error) {
	account, _ := rctx.CurrentAccount(ctx)
	sessionType := rctx.SessionTypeContext(ctx)

	// do not query match id if account is nil
	// NOTE: this may never happen anyway because access_control.go rules may prevent this point
	if sessionType <= rpcmw.SessionTypeUser && account == nil {
		return nil, proto.Failf("invalid account")
	}

	match, err := s.getMatch(ctx, matchID, account, nil)
	if err != nil {
		return nil, err
	}

	return match.Match, nil
}

func (s *Server) GetMatchArchiveRecordsURI(ctx context.Context, matchID uint64, replayID string) (bool, *proto.Match, string, []string, error) {
	match, err := s.getMatch(ctx, matchID, nil, &replayID)
	if err != nil {
		return false, nil, "", nil, err
	}

	// For in-progress matches, return error.
	//
	// In case of a system failure and a match is stuck "in-progress", then we allow the results
	// to be queryable after 2 hours from the start time.
	if match.Status == proto.MatchStatus_IN_PROGRESS && !match.StartedAt.Add(120*time.Minute).Before(time.Now()) {
		return false, nil, "", nil, proto.Failf("match is still in-progress")
	}

	// Fetch signed urls which are accessible for 2 hours
	uris, err := s.MatchRecorder.GetSignedRecordsURLs(matchID, 120*time.Minute)
	if err != nil {
		return false, nil, "", nil, proto.WrapFailf(err, "failed to fetch match record uris")
	}

	var indexURI string
	if len(uris) > 0 {
		indexURI = uris[0]
	}

	uris = uris[1:]

	return true, match.Match, indexURI, uris, nil
}

func (s *Server) GetMatchLiveRecordsURI(ctx context.Context, matchID uint64) (bool, *proto.Match, string, error) {
	// TODO: for now, we'll prevent this endpoint, but we should decide when we want to make this available
	return false, nil, "", proto.WrapError(proto.ErrUnimplemented, nil, "unimplemented")

	// account, _ := rctx.CurrentAccount(ctx)
	// match, err := s.getMatch(matchID, account)
	// if err != nil {
	// 	return false, nil, "", err
	// }
	// recordURI := s.MatchRecorder.LiveURI(matchID, -1)
	// return true, match, recordURI, nil
}

func (s *Server) InternalAppendMatchArchiveRecords(ctx context.Context, matchID uint64, index int64, jsonStringData string) (bool, string, error) {
	err := s.MatchRecorder.UploadArchiveRecords(matchID, index, jsonStringData)
	if err != nil {
		return false, "", proto.WrapFailf(err, "failed to save match records")
	}

	recordURI := s.MatchRecorder.ArchiveURI(matchID, index)

	return true, recordURI, nil
}

func (s *Server) InternalAppendMatchLiveRecords(ctx context.Context, matchID uint64, index int64, jsonStringData string) (bool, string, error) {
	// NOTE: currently disabled until we have proper security measures in place

	// if _, err := s.MatchRecorder.IsConnected(); err != nil {
	// 	return false, "", proto.WrapError(proto.ErrUnavailable, err, err.Error())
	// }
	// err := s.MatchRecorder.UploadLiveRecords(matchID, index, jsonStringData)
	// if err != nil {
	// 	return false, "", proto.WrapFailf(err, "failed to save match records")
	// }

	recordURI := s.MatchRecorder.LiveURI(matchID, index)
	return true, recordURI, nil
}

func (s *Server) getMatch(ctx context.Context, matchID uint64, account *data.Account, replayID *string) (*data.Match, error) {
	logger := rctx.Logger(ctx)
	repo := rctx.DBContext(ctx)

	match, err := repo.Matches().FindOne(db.Cond{
		"id": matchID,
	})
	if err != nil && err != db.ErrNoMoreRows {
		logger.Err(err).Msgf("find match %d", matchID)
		return nil, proto.WrapError(proto.ErrFail, err, err.Error())
	}

	if match == nil {
		logger.Error().Msgf("match does not exist: %d", matchID)
		return nil, proto.ErrorNotFound("match not found")
	}

	match.Player1, err = s.fetchMatchPlayer(ctx, match.Player1ID)
	if err != nil {
		logger.Err(err).Msgf("fetch match player 1")
		return nil, proto.WrapError(proto.ErrNotFound, err, "could not find player1 address")
	}

	match.Player1.DeckString = match.Player1DeckString
	match.Player1.InitDeckString = match.InitPlayer1DeckString

	match.Player2, err = s.fetchMatchPlayer(ctx, match.Player2ID)
	if err != nil {
		logger.Err(err).Msgf("fetch match player 2")
		return nil, proto.WrapError(proto.ErrNotFound, err, "could not find player2 address")
	}

	match.Player2.DeckString = match.Player2DeckString
	match.Player2.InitDeckString = match.InitPlayer2DeckString

	if replayID != nil || (account != nil && (match.HasPlayer(account.Account) || account.Admin)) {
		match.GenerateReplayID(s.Config.Match.ReplayIDSalt)
	}

	// If we're looking up an arbitrary match and we have a replay ID,
	// make sure it's correct before returning the match.
	if replayID != nil && !match.IsReplayIDValid(s.Config.Match.ReplayIDSalt, *replayID) {
		logger.Error().Msgf("match with this replay ID not found: %s", *replayID)
		return nil, proto.ErrorNotFound("match with this replay ID not found")
	}

	if (account == nil || !match.HasPlayer(account.Account)) && replayID == nil && (account == nil || !account.Admin) {
		if !match.IsRanked() && !match.IsConquest() {
			logger.Error().Msgf("match is private and you don't have the replay ID")
			return nil, proto.ErrorNotFound("match is private and you don't have the replay ID")
		}
	}

	return match, nil
}

func (s *Server) fetchMatchPlayer(ctx context.Context, accountID proto.AccountID) (*proto.MatchPlayer, error) {
	repo := rctx.DBContext(ctx)

	account, err := repo.Accounts().FindByID(accountID)
	if err != nil {
		return nil, fmt.Errorf("find account %d", accountID)
	}

	if account == nil {
		return nil, fmt.Errorf("account does not exist %d", accountID)
	}

	crystalIDOwnerMap, err := s.CrystalGetter.GetTopPriority(repo, []proto.AccountID{account.ID})
	if err != nil {
		log.Warn().Msgf("failed to get players's crystal: %v", err)
	}

	var playerCrystalID *uint64

	if crystalID, ok := crystalIDOwnerMap[account.ID]; ok {
		playerCrystalID = &crystalID
	}

	return &proto.MatchPlayer{
		ID:        account.ID,
		Address:   account.Address,
		Name:      account.Name,
		Region:    account.Region,
		TagArtID:  account.TagArtID,
		CrystalID: playerCrystalID,
	}, nil
}

func listMatchesQuery(ctx context.Context, filters interface{}) db.Selector {
	repo := rctx.DBContext(ctx)

	crystalSubquery := func(column string) db.Selector {
		return repo.SQL().Select(
			"account_id",
			db.Raw("token_id AS crystal_id"),
		).
			From("items").
			Where(db.Cond{
				"item_type":  proto.ItemType_SW_CRYSTALS,
				"balance":    db.Gt(0),
				"account_id": db.Raw("matches." + column),
			}).
			OrderBy("-token_id").
			Limit(1)
	}

	q := repo.SQL().
		Select(
			db.Raw("matches.*"),

			db.Raw(`matches.p1_deck_string AS "p1.deck_string"`),
			db.Raw(`matches.init_p1_deck_string AS "p1.init_deck_string"`),
			db.Raw(`matches.p2_deck_string AS "p2.deck_string"`),
			db.Raw(`matches.init_p2_deck_string AS "p2.init_deck_string"`),

			db.Raw("COALESCE(reviewed_matches.reviewed, false) AS reviewed"),

			db.Raw(`p1.id AS "p1.id"`),
			db.Raw(`p1.address AS "p1.address"`),
			db.Raw(`p1.name AS "p1.name"`),
			db.Raw(`p1.region AS "p1.region"`),
			db.Raw(`p1.tag_art_id AS "p1.tag_art_id"`),
			db.Raw(`p1crystal.crystal_id AS "p1.crystal_id"`),

			db.Raw(`p2.id AS "p2.id"`),
			db.Raw(`p2.address AS "p2.address"`),
			db.Raw(`p2.name AS "p2.name"`),
			db.Raw(`p2.region AS "p2.region"`),
			db.Raw(`p2.tag_art_id AS "p2.tag_art_id"`),
			db.Raw(`p2crystal.crystal_id AS "p2.crystal_id"`),
		).
		From("matches").
		Join("accounts AS p1").On("matches.p1_id = p1.id").
		Join("accounts AS p2").On("matches.p2_id = p2.id").
		LeftJoin("reviewed_matches").On("matches.id = reviewed_matches.match_id").
		LeftJoin(db.Raw(`LATERAL ? AS p1crystal`, crystalSubquery("p1_id"))).On("matches.p1_id = p1crystal.account_id").
		LeftJoin(db.Raw(`LATERAL ? AS p2crystal`, crystalSubquery("p2_id"))).On("matches.p2_id = p2crystal.account_id").
		Where(filters)

	return q
}
