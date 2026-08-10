package rpc

import (
	"context"
	"database/sql"
	"time"

	"github.com/microcosm-cc/bluemonday"
	"github.com/scylladb/go-set/u64set"
	"github.com/upper/db/v4"

	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/lib/jobqueue"
	"github.com/horizon-games/OpenSky/api/lib/signals"
	"github.com/horizon-games/OpenSky/api/proto"
	"github.com/horizon-games/OpenSky/api/rpc/rctx"
)

var (
	plainTextPolicy = bluemonday.StrictPolicy()
)

const (
	defaultBanDuration        = time.Hour * 24 * 365 * 100 // by default ban people for a hundred years
	defaultSuspensionDuration = time.Hour * 24 * 30        // by default suspend people for 30 days
	defaultVetDuration        = time.Hour * 24 * 60        // by default mark people as vetted (OK) for 60 days
)

type gmMatchWithUsers struct {
	*proto.GMMatch

	P1 *proto.MatchPlayer `db:"p1"`
	P2 *proto.MatchPlayer `db:"p2"`
}

func (s *Server) GMListAccountActions(ctx context.Context, page *proto.Page) (*proto.Page, []*proto.AccountAction, error) {
	results := []*proto.AccountAction{}
	repo := rctx.DBContext(ctx)

	q := repo.AccountActions().Find()

	cursorKey := &proto.SortBy{
		Column: "id",
		Order:  &sortOrder_DESC,
	}
	orderByCreatedAt := &proto.SortBy{
		Column: "created_at",
		Order:  &sortOrder_DESC,
	}

	paginator, err := NewPaginator(page, cursorKey, orderByCreatedAt)
	if err != nil {
		return nil, nil, proto.WrapError(proto.ErrInternal, err, "invalid page settings")
	}

	if err := paginator.Source(q).Get(ctx, &results); err != nil {
		return nil, nil, proto.WrapFailf(err, "failed to retrieve results")
	}

	return paginator.Page(), results, nil
}

func (s *Server) GMCreateAccountAction(ctx context.Context, action *proto.AccountAction) (*proto.AccountAction, error) {
	oplog := rctx.Logger(ctx)

	gmAccount, ok := rctx.CurrentAccount(ctx)
	if !ok {
		return nil, proto.ErrorInvalidArgument("session", "missing account")
	}
	repo := rctx.DBContext(ctx)

	if action == nil {
		return nil, proto.ErrorInvalidArgument("action", "missing action to create")
	}

	if !action.AccountAddress.IsValidAddress() {
		return nil, proto.ErrorInvalidArgument("action.accountAddress", "invalid account address")
	}

	if action.ExpiresAt != nil && action.ExpiresAt.Before(time.Now()) {
		return nil, proto.ErrorInvalidArgument("action.expiresAt", "action has to expire in the future")
	}

	action.CreatedBy = &gmAccount.ID
	action.CreatedAt = nil
	action.ID = 0
	action.IsActive = true

	err := repo.TxContext(ctx, func(tx db.Session) error {
		account, err := repo.Accounts(tx).FindByAddress(action.AccountAddress)
		if err == db.ErrNoMoreRows {
			return proto.ErrorNotFound("account doesn't exist")
		}
		if err != nil {
			return proto.WrapError(proto.ErrInternal, err, "error fetching account")
		}

		action.AccountID = account.ID

		if account.Status == proto.AccountStatus_TO_DELETE || account.Status == proto.AccountStatus_DELETED {
			return proto.ErrorInvalidArgument("account", "can't create action for account deleted or pending deletion")
		}

		var expiry time.Time
		var signalType string

		switch action.ActionType {
		case proto.ActionType_MOD_BAN:
			expiry = time.Now().UTC().Add(defaultBanDuration)
			account.Status = proto.AccountStatus_BANNED
			signalType = signals.BANNED

			err = data.DB.AccountActions(tx).Find(db.Cond{
				"account_id":  account.ID,
				"action_type": proto.ActionType_MOD_VET,
			}).Update(db.Cond{"is_active": false})
			if err != nil {
				return err
			}

			err = data.DB.AccountStats(tx).Find(db.Cond{"account_id": account.ID}).Update(db.Cond{"status": proto.AccountStatus_BANNED})
			if err != nil {
				return proto.WrapError(proto.ErrInternal, err, "banning account - disabling stats")
			}

			err = jobqueue.DisableDelayedMinting(tx, account.ID)
			if err != nil {
				return proto.WrapError(proto.ErrInternal, err, "failed disabling pending minting")
			}

		case proto.ActionType_MOD_SUSPENSION:
			expiry = time.Now().UTC().Add(defaultSuspensionDuration)
			account.Status = proto.AccountStatus_SUSPENDED
			signalType = signals.SUSPENDED

			err = jobqueue.DisableDelayedMinting(tx, account.ID)
			if err != nil {
				return proto.WrapError(proto.ErrInternal, err, "failed disabling pending minting")
			}

		case proto.ActionType_MOD_FLAG:
			expiry = time.Now().UTC().Add(defaultBanDuration)
			account.Status = proto.AccountStatus_FLAGGED
			signalType = signals.SHADOWBAN

			err = data.DB.AccountActions(tx).Find(db.Cond{
				"account_id":  account.ID,
				"action_type": proto.ActionType_MOD_VET,
			}).Update(db.Cond{"is_active": false})
			if err != nil {
				return err
			}

			err = jobqueue.DisableDelayedMinting(tx, account.ID)
			if err != nil {
				return proto.WrapError(proto.ErrInternal, err, "failed disabling pending minting")
			}

		case proto.ActionType_MOD_VET:
			expiry = time.Now().UTC().Add(defaultVetDuration)
			account.Status = proto.AccountStatus_ACTIVE
			signalType = signals.VETTED
			err = data.DB.AccountActions(tx).Find(db.Cond{
				"account_id": account.ID,
				"action_type": db.In(
					proto.ActionType_AUTO_BAN,
					proto.ActionType_AUTO_FLAG,
					proto.ActionType_MOD_BAN,
					proto.ActionType_MOD_FLAG,
					proto.ActionType_DELAYED_AUTO_BAN,
					proto.ActionType_DELAYED_MOD_BAN,
				)}).Update(db.Cond{"is_active": false})
			if err != nil {
				return err
			}

			err = data.DB.AccountStats(tx).Find(db.Cond{"account_id": account.ID}).Update(db.Cond{"status": proto.AccountStatus_ACTIVE})
			if err != nil {
				return proto.WrapError(proto.ErrInternal, err, "unbanning account - restoring stats")
			}

			err = jobqueue.ReEnableDelayedMinting(tx, account.ID)
			if err != nil {
				return proto.WrapError(proto.ErrInternal, err, "failed enabling pending minting")
			}

		default:
			return proto.ErrorInvalidArgument("action.actionType", "unsupported action type")
		}

		if action.ExpiresAt == nil {
			action.ExpiresAt = &expiry
		}

		err = tx.Save(account)
		if err != nil {
			return proto.WrapError(proto.ErrInternal, err, "failed to update account status")
		}

		err = tx.Save(&data.AccountAction{AccountAction: action})
		if err != nil {
			return proto.WrapError(proto.ErrInternal, err, "failed create account action")
		}

		err = data.DB.AccountSignals(tx).Session().Save(&data.AccountSignal{
			AccountSignal: &proto.AccountSignal{
				AccountID:    account.ID,
				SignalType:   signalType,
				SignalStatus: proto.SignalStatus_PENDING,
			},
		})
		if err != nil {
			return proto.WrapError(proto.ErrInternal, err, "failed creating account signal")
		}

		if err := s.GrandmastersRecalculator.Recalculate(tx, data.CurrentSeason()); err != nil {
			return proto.WrapError(proto.ErrInternal, err, "failed to recalculate leaderboard")
		}

		// Track account activity
		r := rctx.HTTPRequest(ctx)
		if err := s.Analytics.TrackAccountBanning(r, account.ID, account.Status); err != nil {
			oplog.Err(err).Msg("TrackAccountBanning")
		}

		return nil
	}, nil)

	if err != nil {
		return nil, err
	}

	return action, nil
}

func (s *Server) GMIsAccountBanned(ctx context.Context, accountHandle string) (bool, *proto.AccountStatus, []*proto.AccountAction, error) {
	repo := rctx.DBContext(ctx)

	accountID, err := s.validateAccountAndGetAddress(ctx, &accountHandle)
	if err != nil {
		return false, nil, nil, err
	}

	activeActions, err := repo.AccountActions().FindActive(accountID)
	if err != nil {
		return false, nil, nil, proto.WrapError(proto.ErrInternal, err, "failed fetching ban list")
	}

	account, err := repo.Accounts().FindByID(accountID)
	if err != nil {
		if err == db.ErrNoMoreRows {
			return false, nil, nil, proto.ErrorNotFound("account with the address '%s' does not exist", accountHandle)
		}
		return false, nil, nil, proto.ErrorInternal(err.Error())
	}

	resp := make([]*proto.AccountAction, len(activeActions))
	for i, a := range activeActions {
		resp[i] = a.AccountAction
	}

	return len(activeActions) > 0, &account.Status, resp, nil
}

func (s *Server) GMAccountSignalSummaries(ctx context.Context, page *proto.Page, accountStatus []*proto.AccountStatus, createdBefore *time.Time, createdAfter *time.Time, accountAddress *string) (*proto.Page, []*proto.AccountSignalSummary, error) {
	repo := rctx.DBContext(ctx)

	if len(accountStatus) == 0 {
		active := proto.AccountStatus_ACTIVE
		accountStatus = append(accountStatus, &active)
	}

	var cond db.Cond

	if accountAddress != nil && proto.HashFromString(*accountAddress).IsValidAddress() {
		cond = db.Cond{
			"ac.address": proto.HashFromString(*accountAddress),
		}
	} else {
		cond = db.Cond{
			"ac.status": db.AnyOf(accountStatus),
		}

		if createdBefore != nil {
			cond["ac.created_at"] = db.Lt(createdBefore)
		}

		if createdAfter != nil {
			cond["ac.created_at"] = db.Gt(createdAfter)
		}
	}

	results := []*proto.AccountSignalSummary{}

	q := repo.SQL().
		Select(
			"a.account_id AS account_id",
			"a.score AS score",
			"ac.address AS account_address",
			"ac.created_at AS created_at",
			"ac.updated_at AS updated_at",
		).
		From("account_scores a").
		Join("accounts ac").
		On("a.account_id = ac.id")

	if len(accountStatus) == 1 && *accountStatus[0] == proto.AccountStatus_ACTIVE {
		q = q.And(
			db.Raw(`NOT EXISTS (
			SELECT id FROM account_actions act
			WHERE
				act.account_id = a.account_id
				AND act.is_active = true
				AND act.action_type = ?
				AND act.expires_at < NOW()
			)
		`, proto.ActionType_MOD_VET),
		)
	}

	q = q.Where(cond)

	// set up paginator
	cursorKey := &proto.SortBy{
		Column: "a.account_id",
		Order:  &sortOrder_DESC,
	}
	orderByScore := &proto.SortBy{
		Column: "a.score",
		Order:  &sortOrder_DESC,
	}

	paginator, err := NewPaginator(page, cursorKey, orderByScore)
	if err != nil {
		return nil, nil, proto.WrapError(proto.ErrInternal, err, "invalid page settings")
	}

	paginator.TranslateSort(map[string]string{
		"score":      "a.score",
		"updated_at": "ac.updated_at",
		"created_at": "ac.created_at",
	})

	err = paginator.Source(q).Get(ctx, &results)
	switch err {
	case nil:
		// ok
	case sql.ErrNoRows:
		return nil, nil, proto.WrapError(proto.ErrNotFound, err, "signals not found")
	default:
		return nil, nil, proto.WrapError(proto.ErrInternal, err, "failed fetching signals")
	}

	accountIDs := make([]proto.AccountID, len(results))
	for i, res := range results {
		accountIDs[i] = res.AccountID
	}

	var accounts []*data.Account
	err = repo.Accounts().Find(db.Cond{"id": db.AnyOf(accountIDs)}).All(&accounts)
	if err != nil {
		return nil, nil, proto.WrapError(proto.ErrInternal, err, "failed fetching accounts for signals")
	}
	accountMap := make(map[proto.AccountID]*proto.Account, len(accounts))
	for _, ac := range accounts {
		accountMap[ac.ID] = ac.Account
	}

	var actions []*data.AccountAction
	err = repo.AccountActions().Find(db.Cond{"account_id": db.AnyOf(accountIDs)}).OrderBy("is_active", "-created_at").All(&actions)
	if err != nil {
		return nil, nil, proto.WrapError(proto.ErrInternal, err, "failed fetching actions for signals")
	}
	actionMap := make(map[proto.AccountID][]*proto.AccountAction, len(accounts))
	for _, act := range actions {
		arr := actionMap[act.AccountID]
		actionMap[act.AccountID] = append(arr, act.AccountAction)
	}

	for _, res := range results {
		res.Account = accountMap[res.AccountID]
		res.AccountActions = actionMap[res.AccountID]
	}

	return paginator.Page(), results, nil
}

func (s *Server) GMListAccountSignals(ctx context.Context, account *string) ([]*proto.AccountSignal, error) {
	repo := rctx.DBContext(ctx)

	if account == nil || *account == "" {
		return nil, proto.ErrorInvalidArgument("account", "missing account address")
	}

	results := []*data.AccountSignal{}
	err := repo.SQL().
		Select(db.Raw(`
			sig.id AS id,
			sig.signal_status AS signal_status,
			sig.account_id AS account_id,
			sig.signal_type AS signal_type,
			sig.created_at AS created_at,
			sig.updated_at AS updated_at,
			sig.payload AS payload,
			COALESCE(((sig.ml_value-norm.average)/norm.standard_deviation) * scor.score, 0.0) AS ml_value`)).
		From(db.Raw("account_signals sig")).
		LeftJoin(db.Raw("signal_scores scor")).
		On(db.Raw("sig.signal_type = scor.signal_type")).
		LeftJoin(db.Raw("signal_normalization norm")).
		On(db.Raw("norm.signal_type = sig.signal_type")).
		LeftJoin(db.Raw("accounts a")).
		On(db.Raw("sig.account_id = a.id")).
		Where(db.Cond{
			"a.address": proto.HashFromString(*account),
		}).
		OrderBy("signal_status", "-created_at").
		All(&results)

	signals := make([]*proto.AccountSignal, len(results))
	for i, r := range results {
		err := r.Present()
		if err != nil {
			return nil, err
		}
		signals[i] = r.AccountSignal
	}

	return signals, err
}

func (s *Server) ReportAccount(ctx context.Context, report *proto.Report) (bool, error) {
	repo := rctx.DBContext(ctx)

	if report == nil {
		return false, proto.ErrorInvalidArgument("report", "missing report data")
	}

	account, ok := rctx.CurrentAccount(ctx)
	if !ok {
		return false, proto.ErrorInvalidArgument("session", "missing account")
	}

	match, err := repo.Matches().FindByID(report.MatchID)
	if err != nil {
		return false, proto.WrapError(proto.ErrInternal, err, "failed to fetch reported match")
	}

	if report.ReportedAddress.String() == account.Address.String() {
		return false, proto.ErrorInvalidArgument("reportedAddress", "reporting yourself? cute.")
	}

	if match.Player1ID != account.ID && match.Player2ID != account.ID {
		return false, proto.ErrorInvalidArgument("matchId", "you can only send reports about matches you participaded in")
	}

	reportedAccount, err := data.DB.Accounts(repo).FindByAddress(report.ReportedAddress)
	if err != nil {
		return false, proto.ErrorInvalidArgument("address", "account does not exist")
	}

	if match.Player1ID != reportedAccount.ID && match.Player2ID != reportedAccount.ID {
		return false, proto.ErrorInvalidArgument("matchId", "you can only send reports about your opponent in a match")
	}

	report.ReporterComment = plainTextPolicy.Sanitize(report.ReporterComment)
	if len(report.ReporterComment) > 4000 {
		report.ReporterComment = report.ReporterComment[0:4000]
	}

	signal := &data.AccountSignal{
		AccountSignal: &proto.AccountSignal{
			AccountID:    reportedAccount.ID,
			SignalType:   signals.USER_REPORT,
			SignalStatus: proto.SignalStatus_PENDING,
			SignalData: signals.UserReport{
				ReportedBy: account.Address,
				MatchID:    report.MatchID,
				Comment:    report.ReporterComment,
			},
		},
	}

	err = repo.AccountSignals().Session().Save(signal)
	if err != nil {
		return false, err
	}

	return true, nil
}

func (s *Server) GMSetReviewed(ctx context.Context, matchId uint64, reviewed bool) (bool, error) {
	account, ok := rctx.CurrentAccount(ctx)
	if !ok {
		return false, proto.ErrorInvalidArgument("session", "missing account")
	}
	repo := rctx.DBContext(ctx)

	_, err := repo.Session.SQL().Exec(`
		INSERT INTO reviewed_matches (match_id, reviewed, reviewer_id) VALUES(?, ?, ?)
			ON CONFLICT (match_id)
				DO UPDATE
					SET
						reviewed = EXCLUDED.reviewed,
						reviewer_id = EXCLUDED.reviewer_id
	`,
		matchId,
		reviewed,
		account.ID,
	)

	if err != nil {
		return false, err
	}

	return true, nil
}

func (s *Server) GMListMatches(ctx context.Context, page *proto.Page, req *proto.GMListMatchesRequest) (*proto.Page, []*proto.GMMatch, error) {
	logger := rctx.Logger(ctx)
	repo := rctx.DBContext(ctx)

	filters := db.And()

	if req == nil {
		req = &proto.GMListMatchesRequest{}
	}

	if req.AccountAddress != nil {
		player, err := data.DB.Accounts(repo).FindByAddress(*req.AccountAddress)
		if err != nil {
			logger.Err(err).Msgf("find account %s", *req.AccountAddress)
			return nil, nil, proto.ErrorInternal("cannot find account")
		}

		filters = filters.And(db.Or(
			db.Cond{"matches.p1_id": player.ID},
			db.Cond{"matches.p2_id": player.ID},
		))
	}
	if req.Modes != nil {
		filters = filters.And(db.Or(
			db.Cond{"matches.p1_game_mode": db.AnyOf(req.Modes)},
			db.Cond{"matches.p2_game_mode": db.AnyOf(req.Modes)},
		))
	}
	if req.Statuses != nil {
		filters = filters.And(db.Cond{
			"matches.status": db.AnyOf(req.Statuses),
		})
	}

	duration := db.And()
	if req.MaxDuration != nil {
		value, err := time.ParseDuration(*req.MaxDuration)
		if err != nil {
			return nil, nil, proto.ErrorInvalidArgument("max_duration", "invalid value")
		}
		duration = duration.And(db.Cond{"matches.duration_seconds": db.Lte(value / time.Second)})
	}
	if req.MinDuration != nil {
		value, err := time.ParseDuration(*req.MinDuration)
		if err != nil {
			return nil, nil, proto.ErrorInvalidArgument("min_duration", "invalid value")
		}
		duration = duration.And(db.Cond{"matches.duration_seconds": db.Gte(value / time.Second)})
	}
	if !duration.Empty() {
		filters = filters.And(duration)
	}

	q := listMatchesQuery(ctx, filters)

	if req.Reviewed != nil {
		if *req.Reviewed {
			q = q.And(db.Cond{"reviewed": true})
		} else {
			q = q.And(db.Or(
				db.Cond{"reviewed": false},
				db.Cond{"reviewed_matches.match_id": db.IsNull()},
			))
		}
	}

	results := []*gmMatchWithUsers{}

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

	matches := make([]*proto.GMMatch, len(results))

	for i := range results {
		match := results[i]

		match.Match.Player1 = match.P1
		match.Match.Player2 = match.P2

		dMatch := data.NewMatch(match.Match)
		dMatch.GenerateReplayID(s.Config.Match.ReplayIDSalt)

		matches[i] = match.GMMatch
	}

	return paginator.Page(), matches, nil
}

func (s *Server) GMListPendingCards(ctx context.Context, page *proto.Page) (*proto.Page, []*proto.GMPendingCardsReponse, error) {
	q := data.DB.Tasks(nil).Find(db.Cond{
		"queue":  db.In(jobqueue.DelayedMintingQueue),
		"status": proto.TaskStatus_PENDING,
	})

	cursorKey := &proto.SortBy{
		Column: "id",
		Order:  &sortOrder_ASC,
	}

	orderByRunAt := &proto.SortBy{
		Column: "run_at",
		Order:  &sortOrder_ASC,
	}

	if page == nil {
		pageSize := uint32(500)

		page = &proto.Page{
			PageSize: &pageSize,
		}
	}

	paginator, err := NewPaginator(page, cursorKey, orderByRunAt)
	if err != nil {
		return nil, nil, proto.WrapError(proto.ErrInternal, err, "invalid page settings")
	}

	// get minting tasks
	var tasks []*proto.Task
	if err := paginator.Source(q).Get(ctx, &tasks); err != nil {
		return nil, nil, err
	}

	accountIDs := u64set.New()
	for _, t := range tasks {
		accountIDs.Add(t.AccountID.UInt64())
	}

	// get accounts
	var accounts []*proto.Account
	accountMap := make(map[proto.AccountID]*proto.Account)
	err = data.DB.Accounts(nil).Find(db.Cond{
		"id": db.AnyOf(accountIDs.List()),
	}).All(&accounts)
	if err != nil {
		return nil, nil, err
	}
	for _, a := range accounts {
		accountMap[a.ID] = a
	}

	// get cards won
	type cardsWon struct {
		AccountID proto.AccountID `db:"account_id"`
		CardCount uint            `db:"count"`
	}

	var won []*cardsWon
	dayWinMap := make(map[proto.AccountID]uint)
	err = data.DB.Session.SQL().
		Select("account_id", db.Raw("COUNT(*) AS count")).
		From("tasks").
		Where(db.Cond{
			"queue":      db.In(jobqueue.DelayedMintingQueue),
			"account_id": db.AnyOf(accountIDs.List()),
			"created_at": db.Gte(time.Now().UTC().Add(-1 * 24 * time.Hour)),
		}).
		GroupBy("account_id").
		All(&won)
	if err != nil {
		return nil, nil, err
	}
	for _, w := range won {
		dayWinMap[w.AccountID] = w.CardCount
	}
	won = make([]*cardsWon, 0)
	weekWinMap := make(map[proto.AccountID]uint)
	err = data.DB.Session.SQL().
		Select("account_id", db.Raw("COUNT(*) AS count")).
		From("tasks").
		Where(db.Cond{
			"queue":      db.In(jobqueue.DelayedMintingQueue),
			"account_id": db.AnyOf(accountIDs.List()),
			"created_at": db.Gte(time.Now().UTC().Add(-7 * 24 * time.Hour)),
		}).
		GroupBy("account_id").
		All(&won)
	if err != nil {
		return nil, nil, err
	}
	for _, w := range won {
		weekWinMap[w.AccountID] = w.CardCount
	}

	// decorate all the things
	response := make([]*proto.GMPendingCardsReponse, len(tasks))
	for i, t := range tasks {
		r := &proto.GMPendingCardsReponse{}
		r.Account = accountMap[*t.AccountID]
		r.CardsWonLastDay = dayWinMap[*t.AccountID]
		r.CardsWonLastWeek = weekWinMap[*t.AccountID]
		r.MintAt = *t.RunAt
		response[i] = r
	}

	return paginator.Page(), response, nil
}

func shadowban(ctx context.Context, account *data.Account, signalType string) error {
	repo := rctx.DBContext(ctx)

	account.Status = proto.AccountStatus_FLAGGED
	err := repo.Accounts().Session().Save(account)
	if err != nil {
		return err
	}
	err = repo.AccountSignals().Session().Save(&data.AccountSignal{
		AccountSignal: &proto.AccountSignal{
			AccountID:    account.ID,
			SignalType:   signals.USER_FAKED_BOT,
			SignalStatus: proto.SignalStatus_PENDING,
			MLScore:      1.0,
		},
	})

	return err
}
