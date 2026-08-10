package rpc

import (
	"context"
	"fmt"
	"math/big"
	"strings"
	"time"

	"github.com/0xsequence/go-sequence/lib/prototyp"
	"github.com/pkg/errors"
	"github.com/scylladb/go-set/u64set"
	"github.com/upper/db/v4"

	"github.com/horizon-games/OpenSky/api/config"
	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/lib/levels"
	playerRank "github.com/horizon-games/OpenSky/api/lib/player_rank"
	"github.com/horizon-games/OpenSky/api/lib/ranking"
	"github.com/horizon-games/OpenSky/api/proto"
	"github.com/horizon-games/OpenSky/api/rpc/rctx"
)

func (s *Server) GMFindAccount(ctx context.Context, name *string, address *string) (*proto.Account, error) {
	repo := rctx.DBContext(ctx)

	if name == nil && address == nil {
		return nil, proto.ErrorInvalidArgument("accountAddress", "both name and accountAddress missing")
	}

	var account *data.Account

	var err error

	if name != nil && *name != "" {
		account, err = repo.Accounts().FindOne(db.Cond{
			"name": *name,
		})
	} else {
		account, err = repo.Accounts().FindByAddress(proto.HashFromString(*address))
	}
	if err != nil {
		if err == db.ErrNoMoreRows {
			return nil, proto.ErrorNotFound("account not found")
		}

		return nil, proto.ErrorInternal("fetching account failed with %v", err)
	}

	account.Account.LevelUpXP = levels.LevelUpXP(account.Account.Level)

	account.Experience, err = repo.Items().GetXP(account.ID)
	if err != nil {
		return nil, proto.ErrorInternal("fetching account xp with %v", err)
	}

	account.Stats = &proto.AccountStats{}

	stats, err := repo.AccountStats().FindByAccountID(account.ID, data.CurrentSeason())
	if err != nil {
		return nil, proto.WrapError(proto.ErrInternal, err, "failed fetching account game stats")
	}

	for _, st := range stats {
		ranks, err := repo.AccountStats().GetRanks(st.GameMode, []proto.AccountID{st.AccountID}, data.CurrentSeason())
		if err != nil {
			return nil, proto.WrapError(proto.ErrInternal, err, "failed fetching account rank")
		}
		if rank, ok := ranks[st.AccountID]; ok {
			st.Rank = &rank
		}

		if st.GameMode == proto.GameMode_RANKED_CONSTRUCTED {
			account.Stats.RankedConstructed = st.AccountStat
		}

		if st.GameMode == proto.GameMode_RANKED_DISCOVERY {
			account.Stats.RankedDiscovery = st.AccountStat
		}
	}

	if account.Stats.RankedConstructed == nil {
		account.Stats.RankedConstructed = data.DefaultAccountStats(account.ID, proto.GameMode_RANKED_CONSTRUCTED)
	}

	if account.Stats.RankedDiscovery == nil {
		account.Stats.RankedDiscovery = data.DefaultAccountStats(account.ID, proto.GameMode_RANKED_DISCOVERY)
	}

	return account.Account, nil
}

func (s *Server) GMRenameAccount(ctx context.Context, oldName *string, address *string, newName string, lockedUntil *time.Time) (*proto.Account, error) {
	repo := rctx.DBContext(ctx)

	account, err := s.GMFindAccount(ctx, oldName, address)
	if err != nil {
		return nil, err
	}

	account.Name = newName
	if account.PrivateSettings == nil {
		account.PrivateSettings = data.DefaultAccountSettings()
	}

	if lockedUntil != nil {
		account.PrivateSettings.RenameLockedUntil = lockedUntil
	}

	acc := &data.Account{Account: account}
	if err := acc.Validate(); err != nil {
		return nil, err
	}

	if err := acc.Validate(); err != nil {
		return nil, err
	}

	if err := acc.ValidateName(); err != nil {
		return nil, err
	}

	err = repo.Save(acc)
	if err != nil {
		errString := err.Error()
		if strings.Contains(errString, "duplicate key value violates unique constraint \"account_unique_name_idx\"") {
			return nil, proto.WrapError(proto.ErrAlreadyExists, err, "duplicated account name")
		}

		return nil, proto.WrapError(proto.ErrInternal, err, "failed to update account")
	}

	return account, nil
}

func (s *Server) GMUnlockAllBaseCards(ctx context.Context, address *string) (bool, error) {
	repo := rctx.DBContext(ctx)

	if address == nil || *address == "" {
		return false, proto.ErrorInvalidArgument("accountAddress", "accountAddress missing")
	}

	err := repo.TxContext(ctx, func(tx db.Session) error {
		account, err := repo.Accounts(tx).FindByAddress(proto.HashFromString(*address))
		if err == db.ErrNoMoreRows {
			return proto.ErrorNotFound("account not found")
		}
		if err != nil {
			return proto.ErrorInternal("fetching account failed with %v", err)
		}

		// get card user already has
		userCards, err := repo.Items(tx).FindAccountItems(
			account.ID,
			proto.ItemType_SW_BASE_CARDS,
			proto.ItemType_SW_SILVER_CARDS,
			proto.ItemType_SW_GOLD_CARDS)
		if err != nil {
			return errors.Wrapf(err, "failed fetching user (%d) cards", account.ID)
		}
		userCardIDs := u64set.New()
		for _, c := range userCards {
			if !c.Balance.Gt(big.NewInt(0)) {
				continue
			}
			userCardIDs.Add(c.TokenID)
		}

		// get all valid cards
		allCardIDs := u64set.New(data.CardIndex.AllCardIDs()...)
		// get a diff - cards used doesn't have unlocked yet
		missingCardIDs := u64set.Difference(allCardIDs, userCardIDs)

		for _, cardID := range missingCardIDs.List() {
			err = tx.Save(&data.Item{Item: &proto.Item{
				AccountID: account.ID,
				ItemType:  proto.ItemType_SW_BASE_CARDS,
				TokenID:   cardID,
				Balance:   prototyp.NewBigInt(1),
			}})
			if err != nil {
				return err
			}
		}

		return nil
	}, nil)

	if err != nil {
		return false, err
	}

	return true, nil
}

func (s *Server) GMGiveLevels(ctx context.Context, address *string, newLevels uint16) (bool, error) {
	repo := rctx.DBContext(ctx)

	if address == nil || *address == "" {
		return false, proto.ErrorInvalidArgument("accountAddress", "accountAddress missing")
	}

	err := repo.TxContext(ctx, func(tx db.Session) error {
		account, err := repo.Accounts(tx).FindByAddress(proto.HashFromString(*address))
		if err == db.ErrNoMoreRows {
			return proto.ErrorNotFound("account not found")
		}
		if err != nil {
			return proto.ErrorInternal("fetching account failed with %v", err)
		}

		newXP := levels.TotalExperience(account.Level+newLevels, 0) - levels.TotalExperience(account.Level, 0)

		err = data.DB.Items(tx).GainXP(
			account.ID,
			big.NewInt(int64(newXP)),
			proto.TransactionType_GIVEAWAY,
			"",
		)
		if err != nil {
			return proto.ErrorInternal("gain xp: %v", err)
		}

		if _, _, err := s.Leveller.LevelUp(tx, account); err != nil {
			return proto.ErrorInternal("level up: %v", err)
		}

		return nil
	}, nil)

	if err != nil {
		return false, err
	}

	return true, nil
}

func (s *Server) GMSetRP(ctx context.Context, address *string, mode *proto.GameMode, rankPoints *int32) (bool, error) {
	repo := rctx.DBContext(ctx)

	if !config.Instance.OpenSky.GameMaster.AllowRankEloChange {
		return false, proto.Errorf(proto.ErrPermissionDenied, "changing elo is not enabled.")
	}

	if address == nil || *address == "" {
		return false, proto.ErrorInvalidArgument("accountAddress", "accountAddress missing")
	}

	if mode == nil || *mode == proto.GameMode_UNKNOWN {
		return false, proto.ErrorInvalidArgument("mode", "gameMode missing")
	}

	if !(*mode == proto.GameMode_RANKED_CONSTRUCTED || *mode == proto.GameMode_RANKED_DISCOVERY || *mode == proto.GameMode_CONQUEST_CONSTRUCTED || *mode == proto.GameMode_CONQUEST_DISCOVERY) {
		return false, proto.ErrorInvalidArgument("mode", "can only set elo for ranked & conquest game modes")
	}

	if rankPoints == nil || *rankPoints < 200 {
		return false, proto.ErrorInvalidArgument("rankPoints", "invalid rank points - must be 200 and above")
	}

	playerRankState := ranking.InitialRankState()
	playerRankState.RP = *rankPoints
	playerRankState.Win = ranking.Win

	err := repo.TxContext(ctx, func(tx db.Session) error {
		account, err := repo.Accounts(tx).FindByAddress(proto.HashFromString(*address))
		if err == db.ErrNoMoreRows {
			return proto.ErrorNotFound("account not found")
		}
		if err != nil {
			return proto.ErrorInternal("fetching account failed with %v", err)
		}

		// Get new current rank
		season := data.CurrentSeason()
		currRank := playerRank.LookupRankByScore(*rankPoints)
		playerStats, err := repo.AccountStats(tx).FindByAccountIDAndMode(account.ID, *mode, season)

		if err != nil {
			if err != db.ErrNoMoreRows {
				return proto.ErrorInternal("failed to fetch account stats")
			}

			playerStats = &data.AccountStat{
				AccountStat: &proto.AccountStat{
					AccountID: account.ID,
					GameMode:  *mode,
					Season:    &season,
				},
			}
		}

		if account.Level < 15 {
			newXP := levels.TotalExperience(15, 0) - levels.TotalExperience(account.Level, 0)

			err = data.DB.Items(tx).GainXP(
				account.ID,
				big.NewInt(int64(newXP)),
				proto.TransactionType_GIVEAWAY,
				"",
			)
			if err != nil {
				return proto.ErrorInternal("gain xp: %v", err)
			}

			if _, _, err := s.Leveller.LevelUp(tx, account); err != nil {
				return proto.ErrorInternal("level up: %v", err)
			}
		}

		playerStats.PlayerRank = currRank.Rank
		playerStats.PlayerRankStage = currRank.Stage
		playerStats.PlayerRankState = proto.RankState{State: *playerRankState}

		if err = tx.Save(playerStats); err != nil {
			return proto.ErrorInternal("saving account stats failed")
		}

		// Update masters and grandweavers if needed
		if err := s.GrandmastersRecalculator.Recalculate(tx, season); err != nil {
			return proto.ErrorInternal("update grandmasters failed")
		}

		return nil
	}, nil)

	if err != nil {
		return false, err
	}

	return true, nil
}

func (s *Server) GMSetWarmupGamesCompleted(ctx context.Context, address *string, numGamesCompleted uint8) (bool, error) {
	repo := rctx.DBContext(ctx)

	if address == nil || *address == "" {
		return false, proto.ErrorInvalidArgument("accountAddress", "accountAddress missing")
	}

	if numGamesCompleted > 3 {
		return false, proto.ErrorInvalidArgument("numGamesCompleted", "numGamesCompleted must be 0-3")
	}
	err := repo.TxContext(ctx, func(tx db.Session) error {
		account, err := repo.Accounts(tx).FindByAddress(proto.HashFromString(*address))
		if err == db.ErrNoMoreRows {
			return proto.ErrorNotFound("account not found")
		}
		if err != nil {
			return proto.ErrorInternal("fetching account failed with %v", err)
		}

		account.WarmUps = uint8(numGamesCompleted)

		if err = tx.Save(account); err != nil {
			return proto.ErrorInternal("saving account failed")
		}

		return nil
	}, nil)

	if err != nil {
		return false, err
	}

	return true, nil
}

func (s *Server) GMListAccounts(ctx context.Context, page *proto.Page, accountStatus []*proto.AccountStatus, accountActions []*proto.AccountStatus, createdBefore *time.Time, createdAfter *time.Time, conquestsUnlocked *bool) (*proto.Page, []*proto.GMAccount, error) {
	repo := rctx.DBContext(ctx)

	var accounts []*data.Account

	query := repo.SQL().
		Select(
			db.Raw("a.id AS id"),
			db.Raw("a.address AS address"),
			db.Raw("a.name AS name"),
			db.Raw("a.locale AS locale"),
			db.Raw("a.created_at AS created_at"),
			db.Raw("a.updated_at AS updated_at"),
			db.Raw("a.experience AS experience"),
			db.Raw("a.level AS level"),
			db.Raw("a.region AS region"),
			db.Raw("a.tag_art_id AS tag_art_id"),
			db.Raw("a.settings AS settings"),
			db.Raw("a.old_address AS old_address"),
			db.Raw("a.admin AS admin"),
			db.Raw("a.status AS status"),
			db.Raw("a.last_ip_address AS last_ip_address"),
		).
		From(db.Raw("accounts a"))

	cond := db.And()
	if len(accountStatus) > 0 {
		cond = cond.And(db.Cond{
			"a.status": db.AnyOf(accountStatus),
		})
	}

	if createdBefore != nil {
		cond = cond.And(db.Cond{
			"a.created_at": db.Lt(createdBefore),
		})
	}

	if createdAfter != nil {
		cond = cond.And(db.Cond{
			"a.created_at": db.Gt(createdAfter),
		})
	}

	if len(accountActions) > 0 {
		query = query.Join(db.Raw("account_actions ac")).On("ac.account_id = a.id")
		cond = cond.And(db.Cond{
			"ac.action_type": db.AnyOf(accountActions),
		})
	}

	query = query.Where(cond)

	cursorKey := &proto.SortBy{
		Column: "id",
		Order:  &sortOrder_ASC,
	}
	orderByName := &proto.SortBy{
		Column: "name",
		Order:  &sortOrder_ASC,
	}

	paginator, err := NewPaginator(page, cursorKey, orderByName)
	if err != nil {
		return nil, nil, proto.WrapError(proto.ErrInternal, err, "invalid page settings")
	}

	if err := paginator.Source(query).Get(ctx, &accounts); err != nil {
		return nil, nil, err
	}

	results := make([]*proto.GMAccount, len(accounts))
	accountIDs := make([]proto.AccountID, len(accounts))

	for i, a := range accounts {
		results[i] = &proto.GMAccount{
			Account: a.Account,
		}

		accountIDs[i] = a.ID
	}

	curSeason := data.CurrentSeason()

	var accountStats []*data.AccountStat

	err = repo.AccountStats().Find(db.Cond{"account_id": db.AnyOf(accountIDs)}).All(&accountStats)
	if err != nil {
		return nil, nil, proto.WrapError(proto.ErrInternal, err, "failed fetching account stats")
	}

	conquestsUnlockMap := make(map[proto.AccountID]bool, len(accounts))
	statsMap := make(map[proto.AccountID]*proto.AccountStats, len(accounts))

	for _, st := range accountStats {
		if _, ok := conquestsUnlockMap[st.AccountID]; !ok {
			conquestsUnlockMap[st.AccountID] = false
		}

		if st.PlayerRank >= proto.PlayerRank_WANDERER {
			conquestsUnlockMap[st.AccountID] = true
		}

		if statsMap[st.AccountID] == nil {
			statsMap[st.AccountID] = &proto.AccountStats{}
		}

		if st.GameMode == proto.GameMode_RANKED_CONSTRUCTED && st.Season != nil && *st.Season == curSeason {
			statsMap[st.AccountID].RankedConstructed = st.AccountStat
		}

		if st.GameMode == proto.GameMode_RANKED_DISCOVERY && st.Season != nil && *st.Season == curSeason {
			statsMap[st.AccountID].RankedDiscovery = st.AccountStat
		}
	}

	var ipAddresses []*data.IPAddressHistory
	err = repo.IPAddressHistories().Find(db.Cond{"account_id": db.AnyOf(accountIDs)}).OrderBy("created_at").All(&ipAddresses)
	if err != nil {
		return nil, nil, proto.WrapError(proto.ErrInternal, err, "failed fetching account ip history")
	}

	ipMap := make(map[proto.AccountID][]*proto.IPAddressHistory, len(accounts))
	for _, ip := range ipAddresses {
		arr := ipMap[ip.AccountID]
		ipMap[ip.AccountID] = append(arr, ip.IPAddressHistory)
	}

	var actions []*data.AccountAction
	err = data.DB.AccountActions(nil).Find(db.Cond{"account_id": db.AnyOf(accountIDs)}).OrderBy("is_active", "-created_at").All(&actions)
	if err != nil {
		return nil, nil, proto.WrapError(proto.ErrInternal, err, "failed fetching account actions")
	}

	actionMap := make(map[proto.AccountID][]*proto.AccountAction, len(accounts))
	for _, act := range actions {
		arr := actionMap[act.AccountID]
		actionMap[act.AccountID] = append(arr, act.AccountAction)
	}

	for _, res := range results {
		res.AccountActions = actionMap[res.Account.ID]
		res.IpHistory = ipMap[res.Account.ID]
		res.ConquestsUnlocked = conquestsUnlockMap[res.Account.ID]
		res.Account.Stats = statsMap[res.Account.ID]
	}

	return paginator.Page(), results, nil
}

func (s *Server) GMStats(ctx context.Context) (*proto.GMStatsResponse, error) {
	repo := rctx.DBContext(ctx)

	var statsResponse proto.GMStatsResponse

	accountStats := []struct {
		Count  uint64              `db:"count"`
		Status proto.AccountStatus `db:"status"`
	}{}

	err := repo.SQL().
		Select(db.Raw(`COUNT(1)`), "status").
		From("accounts").
		GroupBy("status").
		All(&accountStats)
	if err != nil {
		return nil, proto.ErrorInternal("failed to query user counts")
	}

	for _, stat := range accountStats {
		switch stat.Status {
		case proto.AccountStatus_ACTIVE:
			statsResponse.TotalActiveUsers = stat.Count

		case proto.AccountStatus_BANNED:
			statsResponse.TotalBannedUsers = stat.Count

		case proto.AccountStatus_SUSPENDED:
			statsResponse.TotalSuspendedUsers = stat.Count

		case proto.AccountStatus_VIP:
			statsResponse.TotalVIPUsers = stat.Count

		case proto.AccountStatus_FLAGGED:
			statsResponse.TotalFlaggedUsers = stat.Count

		case proto.AccountStatus_TO_DELETE:
			statsResponse.TotalToDeleteUsers = stat.Count

		case proto.AccountStatus_DELETED: // Do nothing

		default:
			return nil, proto.ErrorInternal(fmt.Sprintf("unhandled user status: %v", stat.Status))
		}
	}

	return &statsResponse, nil
}

// TODO: justify why we need this interface here, and if it really adds value
// to a process or if it solves an actual problem we have. compare with the
// AnalyticsTracker interface in lib/analytics/
type Leveller interface {
	LevelUp(db.Session, *data.Account) ([]*proto.FeedEvent, []*proto.Reward, error)
}
