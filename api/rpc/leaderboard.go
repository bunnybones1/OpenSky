package rpc

import (
	"context"
	"encoding/json"
	"fmt"
	"math"
	"strings"
	"time"

	"github.com/upper/db/v4"

	"github.com/horizon-games/OpenSky/api/config"
	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/proto"
	"github.com/horizon-games/OpenSky/api/rpc/rctx"
)

var (
	maxLeaderBoardResults = 100
)

func (s *Server) ListLeaderboard(ctx context.Context, page *proto.Page, req *proto.ListLeaderboardRequest) (*proto.Page, []*proto.LeaderboardEntry, error) {
	if req == nil {
		return nil, nil, proto.ErrorRequiredArgument("req")
	}
	if req.GameMode == nil || *req.GameMode == proto.GameMode_UNKNOWN {
		return nil, nil, proto.ErrorRequiredArgument("gameMode")
	}

	return s.fetchLeaderboardEntries(ctx, nil, page, req)
}

func (s *Server) fetchLeaderboardEntries(ctx context.Context, _ db.Session, page *proto.Page, req *proto.ListLeaderboardRequest) (*proto.Page, []*proto.LeaderboardEntry, error) {
	repo := rctx.DBContext(ctx)

	if page == nil {
		page = &proto.Page{}
	}

	var season uint16
	if req.Season != nil && *req.Season > 0 {
		season = *req.Season
	} else {
		season = data.CurrentSeason()
	}

	conds := db.And(
		db.Cond{
			"st.status":    db.NotAnyOf(data.BannedStatuses),
			"st.season":    season,
			"st.game_mode": *req.GameMode,
		},
	)

	if req.PlayerNamePrefix != nil {
		prefix := strings.TrimSpace(*req.PlayerNamePrefix)
		if data.AccountNameRex.MatchString(prefix) {
			return nil, nil, proto.ErrorInvalidArgument("name", "name contains characters that are not allowed, use only letters, digits, dash (-), underscore (_) and dot")
		}

		if data.AccountNameRex.MatchString(prefix) {
			return nil, nil, proto.ErrorInternal("account name search string is invalid")
		}

		if len(prefix) >= 3 {
			conds = conds.And(db.Raw("LOWER(a.name) ILIKE ?", "%"+prefix+"%"))
		}
	}

	if req.Region != nil && *req.Region != "" {
		conds = conds.And(db.Cond{"a.region": *req.Region})
	}

	var entries []*proto.LeaderboardEntry
	var sortBy []*proto.SortBy

	hasPlayerRankFilter := false
	if req.PlayerRank != nil {
		switch *req.PlayerRank {
		case proto.PlayerRank_GRANDWEAVER:
			conds = conds.And(db.Cond{
				"st.player_rank": proto.PlayerRank_GRANDWEAVER,
			})

			hasPlayerRankFilter = true

		case proto.PlayerRank_UNKNOWN:
			// do not add filter

		default:
			conds = conds.And(db.Cond{
				"st.player_rank": *req.PlayerRank,
			})
			hasPlayerRankFilter = true
		}
	}

	if !hasPlayerRankFilter {
		sortBy = append(sortBy, &proto.SortBy{
			Column: "player_rank",
			Order:  &sortOrder_DESC,
		})
	}

	q := repo.SQL().
		Select("st.*").
		From("accounts a").
		Join("account_stats st").
		On("a.id = st.account_id").
		Where(conds)

	cursorKey := &proto.SortBy{
		Column: "account_id",
		Order:  &sortOrder_ASC,
	}

	sortBy = append(sortBy, &proto.SortBy{
		Column: "st.score",
		Order:  &sortOrder_DESC,
	})
	sortBy = append(sortBy, &proto.SortBy{
		Column: "st.updated_at",
		Order:  &sortOrder_ASC,
	})
	sortBy = append(sortBy, &proto.SortBy{
		Column: "st.account_id",
		Order:  &sortOrder_ASC,
	})

	paginator, err := NewPaginator(page, cursorKey, sortBy...)
	if err != nil {
		return nil, nil, proto.WrapError(proto.ErrInternal, err, "invalid page settings")
	}

	if err := paginator.Source(q).Get(ctx, &entries); err != nil {
		return nil, nil, err
	}

	var accountIDs []proto.AccountID
	for _, a := range entries {
		accountIDs = append(accountIDs, a.AccountStat.AccountID)
	}

	var accounts []*proto.Account
	err = repo.Accounts().Find(db.Cond{"id": db.AnyOf(accountIDs)}).All(&accounts)
	if err != nil {
		return nil, nil, proto.ErrorInternal("failed fetching leaderboard %v", err)
	}

	accLookup := make(map[proto.AccountID]*proto.Account)

	for _, a := range accounts {
		if a.PrivateSettings != nil {
			a.TitleID = a.PrivateSettings.TitleID
		}

		accLookup[a.ID] = a
	}

	crystalIDOwnerMap, err := s.CrystalGetter.GetTopPriority(repo, accountIDs)
	if err != nil {
		return nil, nil, proto.ErrorInternal("failed to get players's crystal: %v", err)
	}

	accRanks, err := repo.AccountStats().GetRanks(*req.GameMode, accountIDs, season)
	if err != nil {
		return nil, nil, proto.ErrorInternal("failed fetching leaderboard ranks %v", err)
	}

	silverRewards, ticketRewards, _, err := repo.AccountStats().GetRankedCardRewards(*req.GameMode, season)
	if err != nil {
		return nil, nil, proto.ErrorInternal("failed ranked rewards %v", err)
	}

	for i := range entries {
		var playerCrystalID *uint64

		if crystalID, ok := crystalIDOwnerMap[entries[i].AccountStat.AccountID]; ok {
			playerCrystalID = &crystalID
		}

		entries[i].Account = accLookup[entries[i].AccountStat.AccountID]
		entries[i].Rank = accRanks[entries[i].AccountStat.AccountID]
		entries[i].RankedSilverReward = silverRewards[entries[i].AccountStat.AccountID]
		entries[i].RankedTicketReward = ticketRewards[entries[i].AccountStat.AccountID]
		entries[i].Account.CrystalID = playerCrystalID
	}

	return paginator.Page(), entries, nil
}

func (s *Server) AccountLeaderboard(ctx context.Context, page *proto.Page, req *proto.AccountLeaderboardRequest) (*proto.Page, []*proto.LeaderboardEntry, error) {
	logger := rctx.Logger(ctx)
	repo := rctx.DBContext(ctx)

	if req == nil {
		return nil, nil, proto.ErrorRequiredArgument("req")
	}
	if req.GameMode == nil || *req.GameMode == proto.GameMode_UNKNOWN {
		return nil, nil, proto.ErrorRequiredArgument("gameMode")
	}

	var accountID proto.AccountID

	account, _ := rctx.CurrentAccount(ctx)
	if account != nil {
		accountID = account.ID
	}

	if req.AccountAddress != nil && *req.AccountAddress != "" {
		account, err := data.DB.Accounts(repo).FindByAddress(proto.HashFromString(*req.AccountAddress))
		if err != nil {
			logger.Err(err).Msgf("find account %s", *req.AccountAddress)
			return nil, nil, proto.ErrorInternal("find account failed")
		}

		accountID = account.ID
	}

	if !accountID.IsValid() {
		return nil, nil, proto.ErrorRequiredArgument("accountAddress")
	}

	var pageSize uint32
	if page != nil && page.PageSize != nil && *page.PageSize > 0 {
		pageSize = *page.PageSize
	}
	if pageSize > uint32(maxLeaderBoardResults) {
		pageSize = uint32(maxLeaderBoardResults)
	}
	if pageSize <= 0 {
		pageSize = defaultPageSize
	}

	var season uint16
	if req.Season != nil && *req.Season > 0 {
		season = *req.Season
	} else {
		season = data.CurrentSeason()
	}

	var entries []*proto.LeaderboardEntry

	err := repo.TxContext(ctx, func(tx db.Session) error {
		// get account stats entry for the requested account
		accountStat, err := repo.AccountStats(tx).FindByAccountIDAndMode(accountID, *req.GameMode, season)
		if err == db.ErrNoMoreRows {
			return proto.ErrorNotFound("no leaderboard entry for this player")
		}
		if err != nil {
			return proto.ErrorInternal("failed fetching leaderboard %v", err)
		}
		if accountStat.PlayerRank == proto.PlayerRank_GRANDWEAVER && pageSize > data.GrandMasterCount {
			pageSize = data.GrandMasterCount
		}

		// retrieve half the page after the account we want
		cursor := []string{
			fmt.Sprintf("%d", accountStat.AccountID),
			fmt.Sprintf("%d", *accountStat.Score),
			accountStat.UpdatedAt.Format("2006-01-02 15:04:05"),
		}
		cursorJSON, err := json.Marshal(cursor)
		if err != nil {
			return proto.ErrorInternal("failed generating cursor %v", err)
		}

		cursorBefore := encodeCursor(string(cursorJSON))

		pageHalfSize := uint32(math.Ceil(float64(pageSize) / 2))

		pageAfter, entriesAfter, err := s.fetchLeaderboardEntries(
			ctx, tx,
			&proto.Page{
				PageSize: &pageHalfSize,
				Before:   &cursorBefore,
			},
			&proto.ListLeaderboardRequest{
				GameMode:   req.GameMode,
				PlayerRank: &accountStat.PlayerRank,
				Season:     req.Season,
			},
		)
		if err != nil {
			logger.Err(err).Msg("fetch leaderboard entries for after")
			return proto.ErrorInternal("failed fetching leaderboard starting point %v", err)
		}

		after := pageAfter.Before

		if len(entriesAfter) == 0 {
			after = &cursorBefore
		}

		pageBefore, entriesBefore, err := s.fetchLeaderboardEntries(
			ctx, tx,
			&proto.Page{
				PageSize: &pageHalfSize,
				After:    after,
			},
			&proto.ListLeaderboardRequest{
				GameMode:   req.GameMode,
				PlayerRank: &accountStat.PlayerRank,
				Season:     req.Season,
			},
		)
		if err != nil {
			logger.Err(err).Msg("fetch leaderboard entries for before")
			return proto.ErrorInternal("failed fetching leaderboard before the point %v", err)
		}

		if len(entriesAfter) == 0 {
			pageSizeOne := uint32(1)
			_, entriesAfter, err = s.fetchLeaderboardEntries(
				ctx, tx,
				&proto.Page{
					PageSize: &pageSizeOne,
					Before:   pageBefore.After,
				},
				&proto.ListLeaderboardRequest{
					GameMode:   req.GameMode,
					PlayerRank: &accountStat.PlayerRank,
					Season:     req.Season,
				},
			)
			if err != nil {
				logger.Err(err).Msg("fetch leaderboard entry for the target account")
				return proto.ErrorInternal("failed fetching leaderboard for the point %v", err)
			}
		}

		// join two sides into a single result
		entries = append(entriesBefore, entriesAfter...)
		entriesPageSize := uint32(len(entries))
		page = &proto.Page{
			PageSize: &entriesPageSize,
		}

		return err
	}, nil)
	if err != nil {
		return nil, nil, err
	}

	return page, entries, nil
}

func (s *Server) GetCurrentSeason(ctx context.Context) (uint16, error) {
	return data.CurrentSeason(), nil
}

func (s *Server) GetNextRewardsTime(ctx context.Context) (string, error) {
	next := NextRewardsTime(time.Now().UTC(), s.Config.OpenSky.LeaderboardRewards)
	return next.Format(time.RFC3339), nil
}

func (s *Server) GetNextSeasonTime(ctx context.Context) (string, error) {
	next := time.Unix(data.CurrentSeasonEnd(), 0)
	return next.Format(time.RFC3339), nil
}

func (s *Server) GetCurrentSeasonStartTime(ctx context.Context) (string, error) {
	current := time.Unix(data.CurrentSeasonStart(), 0)
	return current.Format(time.RFC3339), nil
}

func NextRewardsTime(t time.Time, cfg config.OpenSkyLeaderboardRewardsConfig) time.Time {
	next := time.Date(
		t.Year(),
		t.Month(),
		t.Day(),
		cfg.Time.Hour(),
		cfg.Time.Minute(),
		0,
		0,
		time.UTC,
	)

	dayDiff := cfg.Weekday - int(next.Weekday())
	if dayDiff != 0 {
		next = next.Add(time.Duration(dayDiff) * 24 * time.Hour)
	}

	if !next.After(t) {
		next = next.Add(time.Duration(24*7) * time.Hour)
	}

	return next
}
