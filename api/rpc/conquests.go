package rpc

import (
	"context"
	"database/sql"
	"time"

	"github.com/pkg/errors"
	"github.com/upper/db/v4"

	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/lib/conquest/conquestv2"
	"github.com/horizon-games/OpenSky/api/proto"
	"github.com/horizon-games/OpenSky/api/rpc/rctx"
)

func (s *Server) EnterConquest(ctx context.Context, hero *proto.Hero) (bool, error) {
	oplog := rctx.Logger(ctx)

	accountID, err := s.validateAccountAndGetAddress(ctx, nil)
	if err != nil {
		return false, err
	}

	if hero == nil {
		return false, proto.Errorf(proto.ErrInvalidArgument, "must provide hero")
	}

	entered, err := s.ConquestStateManager.Enter(ctx, accountID, *hero)
	if err != nil {
		oplog.Err(err).Msgf("enter conquest")
		return false, proto.ErrorInternal("enter conquest")
	}

	return entered, nil
}

func (s *Server) ConquestStatus(ctx context.Context) (*proto.Conquest, error) {
	repo := rctx.DBContext(ctx)
	oplog := rctx.Logger(ctx)

	accountID, err := s.validateAccountAndGetAddress(ctx, nil)
	if err != nil {
		return nil, err
	}

	conquest, err := repo.Conquests().FindInProgress(accountID)
	if err != nil {
		oplog.Err(err).Msgf("find conquest in progress")
		return nil, proto.ErrorInternal("find conquest in progress")
	}

	if conquest == nil {
		return nil, nil
	}

	deckClass := data.HeroDeckClass(conquest.Hero)
	conquest.DeckClass = &deckClass

	return conquest.Conquest, nil
}

func (s *Server) InternalConquestStatus(ctx context.Context, address string) (*proto.Conquest, error) {
	repo := rctx.DBContext(ctx)
	oplog := rctx.Logger(ctx)

	accountID, err := s.validateAccountAndGetAddress(ctx, &address)
	if err != nil {
		return nil, err
	}

	conquest, err := repo.Conquests().FindInProgress(accountID)
	if err != nil {
		oplog.Err(err).Msgf("find conquest in progress")
		return nil, proto.ErrorInternal("find conquest in progress")
	}

	if conquest == nil {
		return nil, nil
	}

	deckClass := data.HeroDeckClass(conquest.Hero)
	conquest.DeckClass = &deckClass

	return conquest.Conquest, nil
}

func (s *Server) ConquestStats(ctx context.Context) (*proto.ConquestStats, error) {
	repo := rctx.DBContext(ctx)
	oplog := rctx.Logger(ctx)

	accountID, err := s.validateAccountAndGetAddress(ctx, nil)
	if err != nil {
		return nil, err
	}

	resp := &proto.ConquestStats{}

	var firstConquest *proto.Conquest

	err = repo.Conquests().Find(db.Cond{"account_id": accountID}).OrderBy("id").Limit(1).One(&firstConquest)
	if err != nil && !errors.Is(err, db.ErrNoMoreRows) {
		oplog.Err(err).Msg("find the first conquest")
		return nil, proto.ErrorInternal("find the first conquest")
	}

	if firstConquest != nil {
		resp.FirstConquestMatchPlayed = firstConquest.CreatedAt
	}

	constructedConquestsCount, err := repo.Conquests().Find(db.Cond{
		"account_id": accountID,
		"game_mode":  proto.GameMode_CONQUEST_CONSTRUCTED,
	}).Count()
	if err != nil {
		oplog.Err(err).Msg("find number of constructed conquests")
		return nil, proto.ErrorInternal("find number of constructed conquests")
	}

	resp.ConstructedTicketsUsed = uint32(constructedConquestsCount)

	discoveryConquestsCount, err := repo.Conquests().Find(db.Cond{
		"account_id": accountID,
		"game_mode":  proto.GameMode_CONQUEST_DISCOVERY,
	}).Count()
	if err != nil {
		oplog.Err(err).Msg("find number of discovery conquests")
		return nil, proto.ErrorInternal("find number of discovery conquests")
	}

	resp.DiscoveryTicketsUsed = uint32(discoveryConquestsCount)

	// Get matches played by counting number of match results in all conquests
	row, err := repo.SQL().QueryRow("SELECT COUNT(*) FROM (SELECT jsonb_object_keys(match_progress) FROM conquests WHERE account_id = ? AND game_mode = ?) AS s", accountID, proto.GameMode_CONQUEST_CONSTRUCTED)
	if err != nil {
		oplog.Err(err).Msg("find number of constructed conquest matches")
		return nil, proto.ErrorInternal("find number of constructed conquest matches")
	}

	err = row.Scan(&resp.ConstructedMatchesPlayed)
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		oplog.Err(err).Msg("parse constructed conquest matches played")
		return nil, proto.ErrorInternal("parse constructed conquest matches played")
	}

	row, err = repo.SQL().QueryRow("SELECT COUNT(*) FROM (SELECT jsonb_object_keys(match_progress) FROM conquests WHERE account_id = ? AND game_mode = ?) AS s", accountID, proto.GameMode_CONQUEST_DISCOVERY)
	if err != nil {
		oplog.Err(err).Msg("find number of discovery conquest matches")
		return nil, proto.ErrorInternal("find number of discovery conquest matches")
	}

	err = row.Scan(&resp.DiscoveryMatchesPlayed)
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		oplog.Err(err).Msg("parse discovery conquest matches played")
		return nil, proto.ErrorInternal("parse discovery conquest matches played")
	}

	if resp.ConstructedMatchesPlayed > 0 {
		// Get number of wins to calculate win ratio
		row, err := repo.SQL().QueryRow("SELECT COUNT(*) FROM (SELECT key, value FROM conquests CROSS JOIN jsonb_each(conquests.match_progress) WHERE account_id = ? AND game_mode = ?) AS s WHERE s.value = to_jsonb(?::text);", accountID, proto.GameMode_CONQUEST_CONSTRUCTED, proto.ConquestMatchResult_WIN.String())
		if err != nil {
			oplog.Err(err).Msg("find constructed conquest matches won")
			return nil, proto.ErrorInternal("find constructed conquest matches won")
		}

		var wins uint32

		err = row.Scan(&wins)
		if err != nil && !errors.Is(err, sql.ErrNoRows) {
			oplog.Err(err).Msg("parse constructed conquest matches won")
			return nil, proto.ErrorInternal("parse constructed conquest matches won")
		}

		resp.ConstructedWinRate = float32(wins) / float32(resp.ConstructedMatchesPlayed) * 100

		// Get number of conquests per win count
		rows, err := repo.SQL().Query("SELECT wins, COUNT(id) FROM (SELECT id, count(value) AS wins FROM (SELECT id, value FROM conquests CROSS JOIN jsonb_each(conquests.match_progress) WHERE account_id = ? AND status = ? AND game_mode = ?) AS s WHERE s.value = to_jsonb(?::text) GROUP BY s.id) AS s2 GROUP BY s2.wins", accountID, proto.ConquestStatus_COMPLETED, proto.GameMode_CONQUEST_CONSTRUCTED, proto.ConquestMatchResult_WIN.String())
		if err != nil {
			oplog.Err(err).Msg("find constructed conquest matches won per conquest")
			return nil, proto.ErrorInternal("find constructed conquest matches won per conquest")
		}

		var conquestCount uint32
		for rows.Next() {
			err := rows.Scan(&wins, &conquestCount)
			if err != nil && !errors.Is(err, sql.ErrNoRows) {
				oplog.Err(err).Msg("parse constructed conquest matches won per conquest")
				return nil, proto.ErrorInternal("parse constructed conquest matches won per conquest")
			}

			switch wins {
			case 1:
				resp.ConstructedSilverCardsWon += conquestCount

			case 2:
				resp.ConstructedSilverCardsWon += 2 * conquestCount

			case 3:
				resp.ConstructedSilverCardsWon += conquestCount
				resp.ConstructedGoldCardsWon += conquestCount
			}
		}
	}

	if resp.DiscoveryMatchesPlayed > 0 {
		// Get number of wins to calculate win ratio
		row, err := repo.SQL().QueryRow("SELECT COUNT(*) FROM (SELECT key, value FROM conquests CROSS JOIN jsonb_each(conquests.match_progress) WHERE account_id = ? AND game_mode = ?) AS s WHERE s.value = to_jsonb(?::text);", accountID, proto.GameMode_CONQUEST_DISCOVERY, proto.ConquestMatchResult_WIN.String())
		if err != nil {
			oplog.Err(err).Msg("find discovery conquest matches won")
			return nil, proto.ErrorInternal("find discovery conquest matches won")
		}

		var wins uint32

		err = row.Scan(&wins)
		if err != nil && !errors.Is(err, sql.ErrNoRows) {
			oplog.Err(err).Msg("parse discovery conquest matches won")
			return nil, proto.ErrorInternal("parse discovery conquest matches won")
		}

		resp.DiscoveryWinRate = float32(wins) / float32(resp.DiscoveryMatchesPlayed) * 100

		// Get number of conquests per win count
		rows, err := repo.SQL().Query("SELECT wins, COUNT(id) FROM (SELECT id, count(value) AS wins FROM (SELECT id, value FROM conquests CROSS JOIN jsonb_each(conquests.match_progress) WHERE account_id = ? AND status = ? AND game_mode = ?) AS s WHERE s.value = to_jsonb(?::text) GROUP BY s.id) AS s2 GROUP BY s2.wins", accountID, proto.ConquestStatus_COMPLETED, proto.GameMode_CONQUEST_DISCOVERY, proto.ConquestMatchResult_WIN.String())
		if err != nil {
			oplog.Err(err).Msg("find discovery conquest matches won per conquest")
			return nil, proto.ErrorInternal("find discovery conquest matches won per conquest")
		}

		var conquestCount uint32
		for rows.Next() {
			err := rows.Scan(&wins, &conquestCount)
			if err != nil && !errors.Is(err, sql.ErrNoRows) {
				oplog.Err(err).Msg("parse discovery conquest matches won per conquest")
				return nil, proto.ErrorInternal("parse discovery conquest matches won per conquest")
			}

			switch wins {
			case 1:
				resp.DiscoverySilverCardsWon += conquestCount

			case 2:
				resp.DiscoverySilverCardsWon += 2 * conquestCount

			case 3:
				resp.DiscoverySilverCardsWon += conquestCount
				resp.DiscoveryGoldCardsWon += conquestCount
			}
		}
	}

	return resp, nil
}

func (s *Server) ConquestRewards(ctx context.Context) ([]*proto.WeeklyGolds, error) {
	repo := rctx.DBContext(ctx)

	now := time.Now().UTC()

	var pool []*proto.WeeklyGolds
	err := repo.WeeklyGolds().Find(db.Cond{
		"start_at": db.Lte(now),
		"end_at":   db.Gte(now),
	}).All(&pool)

	if err != nil {
		return nil, proto.WrapFailf(err, "db query")
	}

	if len(pool) == 0 {
		return pool, nil
	}

	// Fetch token supplies from items table and assign to response
	golds := map[uint64]*proto.WeeklyGolds{}
	itemIDs := []uint64{}

	for _, p := range pool {
		_, itemID, err := data.SWTokenID2TypeAndItemID(p.TokenID)
		if err != nil {
			return nil, proto.WrapFailf(err, "SWTokenID2TypeAndItemID")
		}

		itemIDs = append(itemIDs, itemID)
		golds[itemID] = p
	}

	// Query item supply (where account address is empty)
	var items []*data.Item

	err = repo.Items().Find(db.Cond{"item_type": proto.ItemType_SW_GOLD_CARDS, "token_id": itemIDs, "account_id": 0}).All(&items)
	if err != nil && err != db.ErrNoMoreRows {
		return nil, proto.WrapFailf(err, "db query")
	}

	for _, item := range items {
		g, ok := golds[item.TokenID]
		if !ok {
			return nil, proto.Failf("unexpected, unable to find gold id we just queried %d", item.TokenID)
		}

		g.TotalSupply = item.Balance.Uint64()
	}

	return pool, err
}

func conquestPoints(ctx context.Context, sess db.Session, accountID proto.AccountID) (*data.ConquestPoints, uint64, error) {
	repo := rctx.DBContext(ctx)

	// Player earn a gold card every 30 points they earn
	const eventID = 1         // Event ID
	const pointsRequired = 30 // Number of points required to trigger a mint task

	// Fetch or create conquest points
	points, err := repo.ConquestPoints(sess).FindOrCreateByAddressAndEventID(accountID, uint16(eventID))
	if err != nil {
		return nil, 0, errors.Wrap(err, "failed to fetch or create players conquest points")
	}

	return points, uint64(pointsRequired), nil
}

func (s *Server) ConquestPoints(ctx context.Context) (uint64, uint64, error) {
	// Get player's address
	account, ok := rctx.CurrentAccount(ctx)
	if !ok {
		return 0, 0, proto.ErrorInvalidArgument("session", "missing account")
	}

	// Get current points and Required
	points, required, err := conquestPoints(ctx, nil, account.ID)
	return points.CurrentPoints, required, err
}

// ConquestTreasuresInfo gets amount of silvers and USDC in each treasure
func (s *Server) ConquestTreasuresInfo(ctx context.Context) (map[uint16]*proto.ConquestTreasureInfo, error) {
	const maxLevel = 10

	treasures := make(map[uint16]*proto.ConquestTreasureInfo)

	// Get pool for USDC calculation
	pool, err := s.ConquestV2PoolManager.GetPool(ctx)
	if err != nil {
		return nil, err
	}

	// Get config for Silver Cards weight
	cfg, err := s.ConquestV2PoolManager.GetConfig(ctx)
	if err != nil {
		return nil, err
	}

	// Get info of all treasures
	for level := uint16(0); level <= maxLevel; level++ {
		amountUSDC := s.ConquestV2TreasureCalculator.GetUSDCAmountInTreasurePerLevelWithPool(pool.Amount, pool.TotalWeight, level)
		amountSilver := s.ConquestV2TreasureCalculator.GetSilverCardsAmountInTreasurePerLevelWithConfig(cfg.Settings.WeightPerSilverCard, level)
		treasures[level] = &proto.ConquestTreasureInfo{AmountSilver: amountSilver, AmountUSDC: amountUSDC}
	}

	return treasures, err
}

func (s *Server) ConquestV2Pool(ctx context.Context) (*proto.ConquestV2Pool, error) {
	logger := rctx.Logger(ctx)

	pool, err := s.ConquestV2PoolManager.GetPool(ctx)
	if err != nil {
		logger.Err(err).Msg("get conquest v2 pool failed")
		return nil, proto.ErrorInternal("get conquest v2 pool failed")
	}

	return pool, nil
}

func (s *Server) ConquestV2Progress(ctx context.Context) (*proto.ConquestV2TreasureProgress, error) {
	repo := rctx.DBContext(ctx)
	logger := rctx.Logger(ctx)

	account, ok := rctx.CurrentAccount(ctx)
	if !ok {
		return nil, proto.ErrorInvalidArgument("session", "missing account")
	}

	conquestPoints, err := repo.ConquestPoints(nil).FindOrCreateByAddressAndEventID(account.ID, conquestv2.EventID)
	if err != nil {
		logger.Err(err).Msg("get conquest points failed")
		return nil, proto.ErrorInternal("get conquest points failed")
	}

	treasureProgress, err := s.ConquestV2TreasureCalculator.FromConquestPoints(conquestPoints)
	if err != nil {
		logger.Err(err).Msg("calculate treasure failed")
		return nil, proto.ErrorInternal("calculate treasure failed")
	}

	return treasureProgress.ConquestV2TreasureProgress, nil
}

func (s *Server) GMSetConquestV2PoolConfig(ctx context.Context, poolCeiling *int32, poolFloor *int32, topWeightUnitPrice *float32, bottomWeightUnitPrice *float32, weightPerSilverCard *float32) (bool, error) {
	logger := rctx.Logger(ctx)

	err := s.ConquestV2PoolManager.SetConfig(ctx, poolCeiling, poolFloor, topWeightUnitPrice, bottomWeightUnitPrice, weightPerSilverCard)
	if err != nil {
		logger.Err(err).Msg("set conquest v2 config failed")
		return false, proto.ErrorInternal("set conquest v2 config failed")
	}

	return true, nil
}

func (s *Server) GMGetConquestV2PoolConfig(ctx context.Context) (*proto.ConquestV2PoolConfig, error) {
	logger := rctx.Logger(ctx)

	config, err := s.ConquestV2PoolManager.GetConfig(ctx)
	if err != nil {
		logger.Err(err).Msg("get conquest v2 config failed")
		return nil, proto.ErrorInternal("get conquest v2 config failed")
	}

	return config, nil
}

func (s *Server) GMGetConquestV2Summary(ctx context.Context) (*proto.ConquestV2Summary, error) {
	logger := rctx.Logger(ctx)

	summary, err := s.ConquestV2SummaryGetter.Get(ctx)
	if err != nil {
		logger.Err(err).Msg("get conquest v2 summary")
		return nil, proto.ErrorInternal("get conquest v2 summary failed")
	}

	return summary, nil
}

func (s *Server) GMListConquestV2AccountTreasureProgress(ctx context.Context, page *proto.Page) (*proto.Page, []*proto.ConquestV2AccountTreasureProgress, error) {
	repo := rctx.DBContext(ctx)
	logger := rctx.Logger(ctx)

	conquestPointsResult := repo.ConquestPoints(nil).Find(db.Cond{
		"event_id": conquestv2.EventID,
	})

	cursorKey := &proto.SortBy{
		Column: "current_points",
		Order:  &sortOrder_DESC,
	}

	paginator, err := NewPaginator(page, cursorKey)
	if err != nil {
		logger.Err(err).Msg("invalid page settings")
		return nil, nil, proto.WrapError(proto.ErrInternal, err, "invalid page settings")
	}

	var conquestPoints []*data.ConquestPoints

	if err := paginator.Source(conquestPointsResult).Get(ctx, &conquestPoints); err != nil {
		logger.Err(err).Msg("get page")
		return nil, nil, proto.WrapError(proto.ErrInternal, err, "get page")
	}

	var accountIDs []proto.AccountID

	for _, cp := range conquestPoints {
		accountIDs = append(accountIDs, cp.AccountID)
	}

	var accounts []*data.Account

	if err = repo.Accounts(nil).Find(db.Cond{"id": db.AnyOf(accountIDs)}).All(&accounts); err != nil {
		logger.Err(err).Msg("find accounts")
		return nil, nil, proto.WrapError(proto.ErrInternal, err, "find accounts")
	}

	accountByID := map[proto.AccountID]*data.Account{}

	for _, account := range accounts {
		accountByID[account.ID] = account
	}

	var accountsTreasureProgress []*proto.ConquestV2AccountTreasureProgress

	for _, cp := range conquestPoints {
		treasureProgress, err := s.ConquestV2TreasureCalculator.FromConquestPoints(cp)
		if err != nil {
			logger.Err(err).Msg("calculate treasure")
			return nil, nil, proto.WrapError(proto.ErrInternal, err, "calculate treasure")
		}

		accountsTreasureProgress = append(accountsTreasureProgress, &proto.ConquestV2AccountTreasureProgress{
			AccountID:   cp.AccountID,
			AccountName: accountByID[cp.AccountID].Name,
			Progress:    treasureProgress.ConquestV2TreasureProgress,
		})
	}

	return paginator.Page(), accountsTreasureProgress, nil
}

//go:generate go run go.uber.org/mock/mockgen -destination ./mock/conquest_state_manager.go -package mock . ConquestStateManager
type ConquestStateManager interface {
	Enter(context.Context, proto.AccountID, proto.Hero) (bool, error)
	UpdateProgress(context.Context, db.Session, proto.AccountID, uint64, proto.ConquestMatchResult) ([]*proto.FeedEvent, []*proto.Reward, error)
}

// ConquestV2PoolManager manages pool for conquest v2.
//
//go:generate go run go.uber.org/mock/mockgen -destination ./mock/conquest_v2_pool_manager.go -package mock . ConquestV2PoolManager
type ConquestV2PoolManager interface {
	GetPool(context.Context) (*proto.ConquestV2Pool, error)
	SetConfig(ctx context.Context, poolCeiling *int32, poolFloor *int32, topWeightUnitPrice *float32, bottomWeightUnitPrice *float32, weightPerSilverCard *float32) error
	GetConfig(context.Context) (*proto.ConquestV2PoolConfig, error)
}

// ConquestV2SummaryGetter provides conquest summary.
//
//go:generate go run go.uber.org/mock/mockgen -destination ./mock/conquest_v2_summary_getter.go -package mock . ConquestV2SummaryGetter
type ConquestV2SummaryGetter interface {
	Get(context.Context) (*proto.ConquestV2Summary, error)
}

// ConquestV2TreasureCalculator calculates a progress for conquest treasures.
//
//go:generate go run go.uber.org/mock/mockgen -destination ./mock/conquest_v2_treasure_calculator.go -package mock . ConquestV2TreasureCalculator
type ConquestV2TreasureCalculator interface {
	FromConquestPoints(*data.ConquestPoints) (*data.ConquestV2TreasureProgress, error)
	GetSilverCardsAmountInTreasurePerLevelWithConfig(float32, uint16) int64
	GetUSDCAmountInTreasurePerLevelWithPool(uint64, float32, uint16) int64
}
