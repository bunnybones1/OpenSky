package rpc

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"math"
	"math/rand"
	"net"
	"net/http"
	"net/url"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/0xsequence/ethkit/go-ethereum/common"
	"github.com/0xsequence/ethkit/go-ethereum/common/hexutil"
	"github.com/0xsequence/go-sequence"
	"github.com/goware/logadapter-zerolog"
	"github.com/rs/zerolog"
	"github.com/upper/db/v4"

	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/lib/jobqueue"
	"github.com/horizon-games/OpenSky/api/lib/levels"
	playerRank "github.com/horizon-games/OpenSky/api/lib/player_rank"
	"github.com/horizon-games/OpenSky/api/lib/singleflight"
	"github.com/horizon-games/OpenSky/api/proto"
	rpcmw "github.com/horizon-games/OpenSky/api/rpc/middleware"
	"github.com/horizon-games/OpenSky/api/rpc/rctx"
)

// RequestAccountDeletionMessage is an expected message when requesting an account deletion.
const RequestAccountDeletionMessage = "Request account deletion"

var (
	cacheCountRanksTTL   = time.Second * 60
	cacheCountRanksGroup singleflight.Group
)

func (s *Server) RegisterAccount(ctx context.Context, req *proto.AccountRegistration, captcha string) (bool, *proto.Account, error) {
	oplog := rctx.Logger(ctx)
	repo := rctx.DBContext(ctx)

	sessionType := rctx.SessionTypeContext(ctx)
	switch sessionType {
	case rpcmw.SessionTypeUser:
		// already an account - do nothing, don't touch captcha - just return account
		account, ok := rctx.CurrentAccount(ctx)
		if ok {
			presentAccount(ctx, account)
			return true, account.Account, nil
		}

	case rpcmw.SessionTypeAppDev, rpcmw.SessionTypeService:
		return false, nil, proto.ErrorInvalidArgument("Authentication", "apps and services can't create accounts")

	case rpcmw.SessionTypeWallet:
		// OK, actually register account

	default:
		return false, nil, proto.ErrorInvalidArgument("Authentication", "invalid session")
	}

	if req == nil {
		return false, nil, proto.ErrorInvalidArgument("account", "cannot be nil")
	}

	walletAddress := rctx.WalletAddress(ctx)
	if req.Address.IsValidAddress() && req.Address.String() != walletAddress {
		return false, nil, proto.ErrorInvalidArgument("address", "does not match your auth token")
	}

	req.Address = proto.HashFromString(walletAddress)

	account, err := s.AccountRegisterer.Register(ctx, repo, req)
	if err != nil {
		var protoErr proto.Error

		if errors.As(err, &protoErr) {
			return false, nil, err
		}

		oplog.Err(err).Msg("account registration")

		return false, nil, proto.WrapError(proto.ErrInternal, err, "account registration failed")
	}

	acc, err := s.getAccount(ctx, account, &account.ID)
	if err != nil {
		oplog.Err(err).Msgf("get account")
		return false, nil, proto.WrapError(proto.ErrInternal, err, "could not get account")
	}

	return true, acc, nil
}

func (s *Server) InternalGetAccount(ctx context.Context, address string) (*proto.Account, error) {
	oplog := rctx.Logger(ctx)
	repo := rctx.DBContext(ctx)

	account, err := repo.Accounts().FindByAddress(proto.HashFromString(address))
	if err != nil {
		oplog.Info().Msgf("account not found %v", address)
		return nil, proto.ErrorNotFound("account not found")
	}

	if account.Status != proto.AccountStatus_ACTIVE && account.Status != proto.AccountStatus_VIP && account.Status != proto.AccountStatus_FLAGGED {
		return nil, proto.Errorf(proto.ErrPermissionDenied, "account banned")
	}

	res, err := s.getAccount(ctx, account, nil)
	if err != nil {
		return nil, err
	}

	// add internal rank state to response
	res.Stats.RankedConstructed.InternalPlayerRankState = &res.Stats.RankedConstructed.PlayerRankState
	res.Stats.RankedDiscovery.InternalPlayerRankState = &res.Stats.RankedDiscovery.PlayerRankState

	return res, nil
}

func (s *Server) InternalGetBotAccounts(ctx context.Context, req *proto.InternalGetBotAccountsRequest) ([]*proto.Account, error) {
	oplog := rctx.Logger(ctx)
	repo := rctx.DBContext(ctx)

	if req.GameMode == nil {
		return nil, proto.ErrorRequiredArgument("gameMode")
	}

	// get all bot accounts
	var accounts []*proto.Account
	err := repo.Accounts().Find(db.Cond{
		"is_bot": true,
	}).All(&accounts)
	if err != nil {
		oplog.Info().Msgf("retrieve bot accounts")
		return nil, proto.ErrorNotFound("no bot accounts found")
	}

	accountIDs := []proto.AccountID{}
	for _, account := range accounts {
		accountIDs = append(accountIDs, account.ID)
	}

	// get stats for compatible accounts
	conds := db.And(db.Cond{
		"season":     data.CurrentSeason(),
		"game_mode":  *req.GameMode,
		"account_id": db.AnyOf(accountIDs),
	})

	if req.OpponentRank != nil {
		conds = conds.And(db.Cond{
			"player_rank": db.Lte(*req.OpponentRank),
		})
	}
	if req.OpponentScore > 0 {
		conds = conds.And(db.Cond{
			"score": db.Lte(req.OpponentScore + 200), // there are 200RP per rank
		})
	}

	// exclude bots that are currently playing other matches
	conds = conds.And(db.Raw(`
		NOT EXISTS (SELECT 1 FROM matches WHERE (p1_id = account_id OR p2_id = account_id) AND status = ?)
	`, proto.MatchStatus_IN_PROGRESS))

	accountStats := []*proto.AccountStat{}
	err = repo.AccountStats().Find(conds).All(&accountStats)
	if err != nil {
		oplog.Info().Msgf("retrieve bot stats")
		return nil, proto.ErrorNotFound("no bot stats found")
	}

	compatibleAccounts := map[proto.AccountID]*proto.AccountStat{}
	for i := range accountStats {
		compatibleAccounts[accountStats[i].AccountID] = accountStats[i]
	}

	// if we don't have any stats yet return full list of bot-accounts, this
	// could happen at the beginning of a season
	if len(compatibleAccounts) < 1 {
		rand.Shuffle(len(accounts), func(i, j int) {
			accounts[i], accounts[j] = accounts[j], accounts[i]
		})
		return accounts, nil
	}

	// filter out incompatible accounts
	filtered := []*proto.Account{}
	for i := range accounts {
		_, isCompatible := compatibleAccounts[accounts[i].ID]
		if isCompatible {
			// if the account is compatible, or if there are no stats then use any player.
			filtered = append(filtered, accounts[i])
		}
	}

	// sort filtered accounts
	sort.Slice(filtered, func(i, j int) bool {
		if req.OpponentScore > 0 {
			// if the player provided a score sort by proximity to that score
			scoreIDiff := math.Abs(float64(req.OpponentScore) - float64(*compatibleAccounts[filtered[i].ID].Score))
			scoreJDiff := math.Abs(float64(req.OpponentScore) - float64(*compatibleAccounts[filtered[j].ID].Score))
			return scoreIDiff < scoreJDiff
		}
		// if not, sort by maximum score
		return *compatibleAccounts[filtered[j].ID].Score < *compatibleAccounts[filtered[i].ID].Score
	})

	return filtered, nil
}

func (s *Server) GetAccount(ctx context.Context, address string) (*proto.Account, error) {
	oplog := rctx.Logger(ctx)
	repo := rctx.DBContext(ctx)

	addressHash := proto.HashFromString(address)
	if !addressHash.IsValidAddress() {
		return nil, proto.ErrorInvalidArgument("address", "address is invalid")
	}

	account, err := repo.Accounts().FindByAddress(addressHash)
	if err != nil {
		oplog.Info().Msgf("account not found (address: %v)", address)
		// NOTE: just return null for the account to be graceful
		return nil, nil // proto.ErrorNotFound("account not found")
	}

	var callerAccountID *proto.AccountID

	callerAccount, ok := rctx.CurrentAccount(ctx)
	if ok {
		callerAccountID = &callerAccount.ID
	}

	return s.getAccount(ctx, account, callerAccountID)
}

func (s *Server) GetAccountByUsername(ctx context.Context, username string) (*proto.Account, error) {
	oplog := rctx.Logger(ctx)
	repo := rctx.DBContext(ctx)

	if username == "" {
		return nil, proto.ErrorInvalidArgument("username", "username is invalid")
	}

	account, err := repo.Accounts().FindOne(db.Raw("lower(name) = ?", strings.TrimSpace(strings.ToLower(username))))
	if err != nil {
		oplog.Info().Msgf("account not found (name: %v)", username)
		return nil, proto.ErrorNotFound("account not found")
	}

	var callerAccountID *proto.AccountID

	callerAccount, ok := rctx.CurrentAccount(ctx)
	if ok {
		callerAccountID = &callerAccount.ID
	}

	return s.getAccount(ctx, account, callerAccountID)
}

func (s *Server) getAccount(ctx context.Context, account *data.Account, callerAccountID *proto.AccountID) (*proto.Account, error) {
	oplog := rctx.Logger(ctx)
	repo := rctx.DBContext(ctx)
	sessionType := rctx.SessionTypeContext(ctx)

	account.Account.LevelUpXP = levels.LevelUpXP(account.Account.Level)

	account.Stats = &proto.AccountStats{}

	var err error

	account.Experience, err = data.DB.Items(repo).GetXP(account.ID)
	if err != nil {
		return nil, fmt.Errorf("get xp: %w", err)
	}

	err = setAccountStatsForRanked(ctx, account)
	if err != nil {
		return nil, err
	}

	if sessionType == rpcmw.SessionTypeService {
		err := setAccountStatsForConquest(ctx, account)
		if err != nil {
			return nil, err
		}
	}

	// Get user's crystal
	crystalIDOwnerMap, err := s.CrystalGetter.GetTopPriority(repo, []proto.AccountID{account.ID})
	if err != nil {
		oplog.Warn().Msgf("failed to get players's crystal: %v", err)
	} else {
		if crystalID, ok := crystalIDOwnerMap[account.ID]; ok {
			account.Account.CrystalID = &crystalID
		}
	}

	if account.PrivateSettings != nil {
		account.TitleID = account.PrivateSettings.TitleID
	}

	if callerAccountID != nil && account.ID == *callerAccountID {
		account.IsBurnerWallet = data.SetBoolPointer(account.IsBurner())
	}

	if account.InvitedByID != nil {
		inviter, err := data.DB.Accounts(repo).FindByID(*account.InvitedByID)
		if err != nil {
			oplog.Err(err).Msgf("find inviter account %d", *account.InvitedByID)
			return nil, proto.ErrorInternal("find inviter account failed")
		}

		account.InvitedBy = &inviter.Address
	}

	// Provide spectate code to the owner or services only
	presentAccount(ctx, account)

	// Recover user's season level
	seasonStat, err := data.DB.SkypassSeasonStats(repo).FindOrCreate(account.ID, data.CurrentSeason())
	if err != nil {
		oplog.Warn().Msgf("failed to get player's season stats: %v", err)
	} else {
		account.Account.SeasonLevel = seasonStat.LevelProgress()
	}

	return account.Account, nil
}

func setAccountStatsForRanked(ctx context.Context, account *data.Account) error {
	// TODO: this is very similar to GetAccountStats, we could merge, simplify
	// and make use of the caching GetAccountStats has.

	oplog := rctx.Logger(ctx)
	repo := rctx.DBContext(ctx)

	constructed, err := repo.AccountStats().FindOrCreateByAccountIDAndMode(account.ID, proto.GameMode_RANKED_CONSTRUCTED, data.CurrentSeason())
	if err != nil {
		oplog.Warn().Msgf("fetching account stats, db err, %v", err)
		return proto.WrapError(proto.ErrInternal, err, "failed fetching account game stats")
	}

	discovery, err := repo.AccountStats().FindOrCreateByAccountIDAndMode(account.ID, proto.GameMode_RANKED_DISCOVERY, data.CurrentSeason())
	if err != nil {
		oplog.Warn().Msgf("fetching account stats, db err, %v", err)
		return proto.WrapError(proto.ErrInternal, err, "failed fetching account game stats")
	}

	totalExperience := levels.TotalExperience(account.Level, account.Experience)

	stats := []*data.AccountStat{
		constructed,
		discovery,
	}

	for _, st := range stats {
		totalRanks, err := repo.AccountStats().CountRanks(st.GameMode, st.PlayerRank, data.CurrentSeason())
		if err != nil {
			oplog.Warn().Msgf("fetching masters count: %v", err)
			return proto.WrapError(proto.ErrInternal, err, "failed fetching masters count")
		}

		ranks, err := repo.AccountStats().GetRanks(st.GameMode, []proto.AccountID{st.AccountID}, data.CurrentSeason())
		if err != nil {
			return proto.WrapError(proto.ErrInternal, err, "failed fetching account rank")
		}

		var rankProgress float32
		if rank, ok := ranks[st.AccountID]; ok {
			st.Rank = &rank
			if totalRanks > 0 {
				rankProgress = float32(rank) / float32(totalRanks)
			}
		}

		if st.PlayerRank == proto.PlayerRank_UNRANKED {
			rankProgress = float32(totalExperience) / float32(playerRank.MinimumExpForRanked)
		}

		rankProgress = float32(math.Floor(float64(rankProgress*100.0)) / 100.0)
		if rankProgress > 1 {
			// there's a tiny chance of this being more than 100% because
			// totalRanks is cached
			rankProgress = 1
		}

		st.RankProgress = &rankProgress
		st.Experience = &totalExperience

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

	return nil
}

func setAccountStatsForConquest(ctx context.Context, account *data.Account) error {
	oplog := rctx.Logger(ctx)
	repo := rctx.DBContext(ctx)

	constructed, err := repo.AccountStats().FindOrCreateByAccountIDAndMode(account.ID, proto.GameMode_CONQUEST_CONSTRUCTED, data.CurrentSeason())
	if err != nil {
		oplog.Warn().Msgf("fetching account stats, db err, %v", err)
		return proto.WrapError(proto.ErrInternal, err, "failed fetching account game stats")
	}

	discovery, err := repo.AccountStats().FindOrCreateByAccountIDAndMode(account.ID, proto.GameMode_CONQUEST_DISCOVERY, data.CurrentSeason())
	if err != nil {
		oplog.Warn().Msgf("fetching account stats, db err, %v", err)
		return proto.WrapError(proto.ErrInternal, err, "failed fetching account game stats")
	}

	account.Stats.ConquestConstructed = constructed.AccountStat
	account.Stats.ConquestDiscovery = discovery.AccountStat

	return nil
}

func (s *Server) UpdateAccount(ctx context.Context, req *proto.Account) (*proto.Account, error) {
	oplog := rctx.Logger(ctx)

	account, ok := rctx.CurrentAccount(ctx)
	if !ok {
		return nil, proto.ErrorInvalidArgument("session", "missing account")
	}
	repo := rctx.DBContext(ctx)

	// security: ensure only user can update their own account
	if req.Address.ZeroValue() || account.Address != req.Address {
		oplog.Warn().Msgf("address does not match account context")
		return nil, proto.ErrorInvalidArgument("address", "is invalid")
	}

	now := time.Now().UTC()

	if account.PrivateSettings != nil && account.PrivateSettings.RenameLockedUntil != nil && account.PrivateSettings.RenameLockedUntil.After(now) {
		return nil, proto.Errorf(proto.ErrPermissionDenied, "account name change locked until %s", account.PrivateSettings.RenameLockedUntil.UTC())
	}

	// Update account
	account.Account.Name = req.Name
	account.Account.Locale = req.Locale
	account.Account.UpdatedAt = &now
	account.Account.TagArtID = req.TagArtID
	account.Region = req.Region

	if account.InvitedByID == nil && req.InvitedBy != nil && req.InvitedBy.IsValidAddress() {
		inviter, err := data.DB.Accounts(repo).FindByAddress(*req.InvitedBy)
		if err != nil {
			oplog.Err(err).Msgf("find inviter account %s", *req.InvitedBy)
			return nil, proto.ErrorInternal("find inviter account failed")
		}

		account.InvitedByID = &inviter.ID
	}

	s.setAccountSettings(account, req)

	if err := s.setTitle(repo.Session, account, req); err != nil {
		oplog.Err(err).Msg("set account title")
		return nil, fmt.Errorf("setting title failed")
	}

	if err := account.Validate(); err != nil {
		oplog.Info().Msgf("account validation failed with %v", err)
		return nil, err
	}

	if err := account.ValidateName(); err != nil {
		oplog.Info().Msgf("account name validation failed with %v", err)
		return nil, err
	}

	if err := repo.Save(account); err != nil {
		errString := err.Error()
		if strings.Contains(errString, "duplicate key value violates unique constraint \"account_unique_name_idx\"") {
			oplog.Info().Msgf("username already exists")
			return nil, proto.WrapError(proto.ErrAlreadyExists, err, "duplicated account name")
		}
		oplog.Warn().Msgf("db err, %v", err)
		return nil, proto.WrapError(proto.ErrInternal, err, "failed to update account")
	}

	oplog.Info().Msgf("successfully updated account")

	account.Settings = account.PrivateSettings

	if account.InvitedByID != nil {
		inviter, err := data.DB.Accounts(repo).FindByID(*account.InvitedByID)
		if err != nil {
			oplog.Err(err).Msgf("find inviter account %d", *account.InvitedByID)
			return nil, proto.ErrorInternal("find inviter account failed")
		}

		account.InvitedBy = &inviter.Address
	}

	return account.Account, nil
}

func (s *Server) GetAccountStats(ctx context.Context, address string, seasons []uint16) ([]*proto.AccountStat, []*proto.AccountStat, error) {
	return s.getAccountStats(ctx, address, seasons)
}

func (s *Server) InternalGetAccountStats(ctx context.Context, address string, seasons []uint16) ([]*proto.AccountStat, []*proto.AccountStat, error) {
	constructedStats, discoveryStats, err := s.getAccountStats(ctx, address, seasons)
	if err != nil {
		return nil, nil, err
	}

	// add internal rank state to response
	for i := range constructedStats {
		constructedStats[i].InternalPlayerRankState = &constructedStats[i].PlayerRankState
	}
	for i := range discoveryStats {
		discoveryStats[i].InternalPlayerRankState = &discoveryStats[i].PlayerRankState
	}

	return constructedStats, discoveryStats, nil
}

func (s *Server) setAccountSettings(account *data.Account, req *proto.Account) {
	if req.Settings == nil {
		return
	}
	if account.PrivateSettings == nil {
		account.PrivateSettings = data.DefaultAccountSettings()
	}
	if req.Settings.RequestMoreInvites != nil {
		account.PrivateSettings.RequestMoreInvites = req.Settings.RequestMoreInvites
	}
	if req.Settings.HidePlayerNames != nil {
		account.PrivateSettings.HidePlayerNames = req.Settings.HidePlayerNames
	}
	if req.Settings.HasValidTwitchProfile() {
		account.PrivateSettings.TwitchProfile = req.Settings.TwitchProfile
	}
}

func (s *Server) setTitle(sess db.Session, account *data.Account, req *proto.Account) error {
	if req.TitleID == nil || *req.TitleID == 0 {
		if account.PrivateSettings != nil {
			account.PrivateSettings.TitleID = nil
		}

		account.TitleID = nil

		return nil
	}

	if account.PrivateSettings == nil {
		account.PrivateSettings = data.DefaultAccountSettings()
	}

	title, err := data.DB.Items(sess).FindAccountItem(account.ID, proto.ItemType_SW_TITLES, *req.TitleID)
	if err != nil {
		if errors.Is(err, db.ErrNoMoreRows) {
			return fmt.Errorf("title %d is not owned", req.TitleID)
		}

		return fmt.Errorf("find title: %w", err)
	}

	if title == nil {
		return fmt.Errorf("title %d is not owned", req.TitleID)
	}

	account.TitleID = &title.TokenID
	account.PrivateSettings.TitleID = &title.TokenID

	return nil
}

func (s *Server) AccountExists(ctx context.Context, address string) (bool, bool, error) {
	repo := rctx.DBContext(ctx)
	return repo.Accounts().AccountExists(proto.HashFromString(address))
}

func (s *Server) AccountExistsByName(ctx context.Context, name string) (bool, bool, error) {
	repo := rctx.DBContext(ctx)
	return repo.Accounts().AccountExistsByName(name)
}

func (s *Server) RequestMoreInvites(ctx context.Context) (bool, error) {
	oplog := rctx.Logger(ctx)

	account, ok := rctx.CurrentAccount(ctx)
	if !ok {
		return false, proto.ErrorInvalidArgument("session", "missing account")
	}
	repo := rctx.DBContext(ctx)

	if account.PrivateSettings == nil {
		account.PrivateSettings = data.DefaultAccountSettings()
	}
	account.PrivateSettings.RequestMoreInvites = data.SetBoolPointer(true)
	if err := repo.Save(account); err != nil {
		oplog.Warn().Msgf("failure to request more invites")
		return false, proto.WrapError(proto.ErrInternal, err, "failed to request more invites")
	}
	return true, nil
}

func (s *Server) GetPrivateSpectateCode(ctx context.Context, reset *bool) (string, error) {
	oplog := rctx.Logger(ctx)
	forceReset := false
	if reset != nil {
		forceReset = *reset
	}

	account, ok := rctx.CurrentAccount(ctx)
	if !ok {
		return "", proto.ErrorInvalidArgument("session", "missing account")
	}
	repo := rctx.DBContext(ctx)
	err := account.RefreshSpectateCode(repo, forceReset)
	if err != nil {
		oplog.Warn().Msgf("failure to refresh spectate code")
		return "", proto.WrapError(proto.ErrInternal, err, "failed to refresh spectate code")
	}

	return *account.PrivateSettings.SpectateCode, nil
}

func (s *Server) InternalGetPrivateSpectateCode(ctx context.Context, address string) (string, error) {
	oplog := rctx.Logger(ctx)
	repo := rctx.DBContext(ctx)

	account, err := repo.Accounts().FindByAddress(proto.HashFromString(address))
	if err != nil {
		oplog.Info().Msgf("account not found %v", address)
		return "", proto.ErrorNotFound("account not found")
	}
	err = account.RefreshSpectateCode(repo, false)
	if err != nil {
		oplog.Warn().Msgf("failure to refresh spectate code")
		return "", proto.WrapError(proto.ErrInternal, err, "failed to refresh spectate code")
	}

	if account.PrivateSettings == nil {
		return "", proto.Failf("account.Settings is not set")
	}
	if account.PrivateSettings.SpectateCode == nil {
		return "", proto.Failf("account.Settings.SpectateCode is not set")
	}

	return *account.PrivateSettings.SpectateCode, nil
}

func (s *Server) AdminListAccounts(ctx context.Context, page *proto.Page) (*proto.Page, []*proto.Account, error) {
	return nil, nil, proto.WrapError(proto.ErrUnimplemented, nil, "")
}

func (s *Server) AdminSearchAccounts(ctx context.Context, page *proto.Page, filterName, filterAvatar string) (*proto.Page, []*proto.Account, error) {
	return nil, nil, proto.WrapError(proto.ErrUnimplemented, nil, "")
}

func (s *Server) SetInvitedBy(ctx context.Context, req *proto.SetInvitedByRequest) (bool, error) {
	oplog := rctx.Logger(ctx)

	account, ok := rctx.CurrentAccount(ctx)
	if !ok {
		return false, proto.ErrorInvalidArgument("session", "missing account")
	}

	// security: ensure only user can update their own account
	if req.Address.ZeroValue() || account.Address != req.Address {
		oplog.Warn().Msgf("address does not match account context")
		return false, proto.ErrorInvalidArgument("address", "is invalid")
	}

	repo := rctx.DBContext(ctx)

	if account.InvitedByID != nil {
		return false, proto.Errorf(proto.ErrPermissionDenied, "inviter can only be set once")
	}

	if req.InvitedBy == account.Address {
		return false, proto.Errorf(proto.ErrInvalidArgument, "you cannot set yourself as inviter")
	}

	if req.InvitedBy.IsValidAddress() {
		inviter, err := data.DB.Accounts(repo).FindByAddress(req.InvitedBy)
		if err != nil {
			oplog.Err(err).Msgf("find inviter")
			return false, proto.Errorf(proto.ErrInvalidArgument, "inviter cannot be found")
		}

		account.InvitedByID = &inviter.ID
	}

	if err := repo.Save(account); err != nil {
		oplog.Info().Msgf("failed to update account")
		return false, proto.WrapError(proto.ErrInternal, err, "failed to update account")
	}

	return true, nil
}

// TODO: Remove if we dont plan to enable captcha
//
//nolint:unused
func (s *Server) hcaptchaVerify(log zerolog.Logger, remoteIP, captcha, username string) (bool, error) {
	formData := url.Values{}
	formData["sitekey"] = []string{s.Config.Hcaptcha.SiteKey}
	formData["secret"] = []string{s.Config.Hcaptcha.SecretKey}
	formData["response"] = []string{captcha}

	formData["remoteip"] = []string{remoteIP}
	// formData["remoteip_strictness"] = []string{"high"} // docs recommend this to be off

	formData["behavior_type"] = []string{"signup"}
	// TODO: lets get the "ekey"

	if !s.Config.Hcaptcha.LocalDevMode {
		formData["host"] = []string{"skyweaver.net"}
	}

	client := http.Client{Timeout: time.Second * 5}
	resp, err := client.PostForm(`https://hcaptcha.com/siteverify`, formData)
	if err != nil || resp.StatusCode != 200 {
		return false, fmt.Errorf("captcha server error")
	}
	defer resp.Body.Close()

	data, _ := io.ReadAll(resp.Body)
	var result map[string]interface{}
	err = json.Unmarshal(data, &result)
	if err != nil {
		return false, fmt.Errorf("captcha result parse failed: %w", err)
	}

	success, _ := result["success"].(bool)
	if !success {
		return false, nil
	}

	// note: we do not check the result["hostname"] as hcaptcha docs state to not rely on it

	// check time
	challengeTS, ok := result["challenge_ts"].(string)
	if ok && len(challengeTS) > 0 {
		ts, err := time.Parse(time.RFC3339, challengeTS)
		if err != nil {
			return false, fmt.Errorf("false to parse time")
		}
		// 4 minutes from time of captcha to register
		if time.Now().Unix()-ts.Unix() >= 60*4 {
			log.Warn().Msgf("hcaptcha blocking ip %s with challenge ts (more than allowed time) %v and username '%s'", remoteIP, ts, username)
			return false, nil
		}
	}

	// spew.Dump(result)
	// (map[string]interface {}) (len=12) {
	// 	(string) (len=12) "score_reason": ([]interface {}) (len=1 cap=1) {
	// 	 (string) (len=21) "anom_should_challenge"
	// 	},
	// 	(string) (len=8) "features": ([]interface {}) {
	// 	},
	// 	(string) (len=7) "classes": ([]interface {}) (len=1 cap=1) {
	// 	 (string) (len=7) "unknown"
	// 	},
	// 	(string) (len=15) "behavior_counts": (map[string]interface {}) (len=5) {
	// 	 (string) (len=2) "ip": (float64) 1,
	// 	 (string) (len=5) "ip_ua": (float64) 1,
	// 	 (string) (len=6) "subnet": (float64) 1,
	// 	 (string) (len=9) "ip_device": (float64) 1,
	// 	 (string) (len=6) "device": (float64) 1
	// 	},
	// 	(string) (len=12) "scoped_uid_0": (string) (len=112) "C0_A2S/tFCmRGrrzOp2uPHfAByD5WnmVe5LYNpangSu5UqbsF/k8Kayqnru8T23Pf8g_FH9BEvYJ+HKjyNtx450GkADLdLSx2N1zqEpA8TNBmwtQ",
	// 	(string) (len=12) "scoped_uid_1": (string) (len=112) "C0_tEPPvY6HcHhaqIVr82mLHpgTs8igsNFwDQIe9CJa3HKsReCZA91WkZZvfsD2UGSQ_FH9BEvYJ+HKjyNtx450GkATFZFe8PZSa/xDNuuwOcsgA",
	// 	(string) (len=12) "challenge_ts": (string) (len=27) "2022-03-18T11:30:39.000000Z",
	// 	(string) (len=8) "hostname": (string) (len=13) "0xhorizon.net",
	// 	(string) (len=7) "sitekey": (string) (len=36) "aacba776-ecc6-48a5-bc54-fb114be1ba5a",
	// 	(string) (len=5) "score": (float64) 0.35,
	// 	(string) (len=12) "scoped_uid_2": (string) (len=91) "C0_H4EOqGHnFOhyn9132U5Jewbl1o8/WMpfNGKFD86RpO0_FH9BEvYJ+HKjyNtx450GkAj7ZUsABC6Ny6/H1/jQxzEA",
	// 	(string) (len=7) "success": (bool) true
	//  }

	// Score check
	score, ok := result["score"].(float64)
	if !ok && s.Config.Hcaptcha.LocalDevMode {
		return true, nil // skip for local development mode
	}
	if score == 0 {
		// no score is provided, so we assume dont have any scoring, so lets allow it..
		return true, nil
	}

	minScore := 0.9 // min score for dev/stg/prod
	if s.Config.Hcaptcha.LocalDevMode {
		minScore = 0.9 // allow higher threshold of suspicious activity locally
	}
	if score >= minScore {
		log.Warn().Msgf("hcaptcha blocking ip %s with score %f and username '%s'", remoteIP, score, username)
		return false, nil
	}

	return true, nil
}

func (s *Server) cacheCountRanks(ctx context.Context, gameMode proto.GameMode, playerRank proto.PlayerRank, season uint16) (uint64, error) {
	key := fmt.Sprintf("api:ranks_count:%s:%s:%d", gameMode, playerRank, season)

	fn := func(ctx context.Context) (interface{}, error) {
		repo := rctx.DBContext(ctx)

		cachedCount, _, _ := s.CacheStore.Get(ctx, key)
		if cachedCount != nil {
			totalRanks, err := strconv.ParseUint(string(cachedCount), 10, 64)
			if err == nil {
				return totalRanks, nil
			}
		}

		totalRanks, err := repo.AccountStats().CountRanks(gameMode, playerRank, season)
		if err != nil {
			return 0, err
		}

		// result is cached
		_ = s.CacheStore.SetEx(ctx, key, []byte(fmt.Sprintf("%d", totalRanks)), cacheCountRanksTTL)

		return totalRanks, nil
	}

	result, _, err := cacheCountRanksGroup.Do(ctx, key, fn)
	if err != nil {
		return 0, err
	}

	return result.(uint64), nil
}

// RequestAccountDeletion flags an account for deletion.
func (s *Server) RequestAccountDeletion(ctx context.Context, proof *proto.WalletProof) (bool, error) {
	oplog := rctx.Logger(ctx)
	repo := rctx.DBContext(ctx)

	account, ok := rctx.CurrentAccount(ctx)
	if !ok {
		return false, proto.ErrorInvalidArgument("session", "missing account")
	}

	if account.Address != proto.HashFromString(proof.Address) {
		oplog.Warn().Msgf("address does not match account context")
		return false, proto.ErrorInvalidArgument("address", "is invalid")
	}

	chainID, err := s.ETHProvider.ChainID(context.Background())
	if err != nil {
		oplog.Warn().Msgf("failure to get chain ID")
		return false, proto.WrapError(proto.ErrInternal, err, "failure to get chain ID")
	}

	sig, err := hexutil.Decode(proof.Signature)
	if err != nil {
		oplog.Warn().Msgf("failure to decode signature")
		return false, proto.WrapError(proto.ErrInternal, err, "failure to decode signature")
	}

	valid, err := sequence.IsValidSignature(
		logadapter.LogAdapter(oplog),
		common.HexToAddress(proof.Address),
		sequence.MessageDigest([]byte(PrefixEIP191Message(proof.Message))),
		sig,
		sequence.SequenceContexts(),
		chainID,
		s.ETHProvider,
	)
	if err != nil {
		oplog.Warn().Msgf("failure to validate signature")
		return false, proto.WrapError(proto.ErrInternal, err, "failure to validate signature")
	}

	if !valid {
		// Note: we respond with a 403/unauthorized, and offer very littler information
		// on purpose for security reasons.
		oplog.Warn().Msgf("bad proof for %s", proof.Address)
		return false, proto.Errorf(proto.ErrPermissionDenied, "bad proof")
	}

	if proof.Message != RequestAccountDeletionMessage {
		oplog.Warn().Msgf("unexpected message '%s'", proof.Message)
		return false, proto.Errorf(proto.ErrInvalidArgument, "unexpected message")
	}

	err = repo.TxContext(ctx, func(tx db.Session) error {
		account.Status = proto.AccountStatus_TO_DELETE

		if err := tx.Save(account); err != nil {
			oplog.Warn().Msgf("failure to save account status")
			return proto.WrapError(proto.ErrInternal, err, "failure to save account status")
		}

		err := data.DB.AccountStats(tx).
			Find(db.Cond{"account_id": account.ID}).
			Update(db.Cond{"status": account.Status})
		if err != nil {
			oplog.Warn().Msgf("failure to save account stats")
			return proto.WrapError(proto.ErrInternal, err, "failure to save account stats")
		}

		runAt := data.TimeNowUTC().Add(30 * 24 * time.Hour).Add(-time.Hour)
		err = data.DB.Tasks(tx).EnqueueTask(jobqueue.AccountDeletionQueue, jobqueue.AccountDeletionTask{
			AccountID: account.ID,
		}, &runAt, &account.ID)
		if err != nil {
			return proto.WrapError(proto.ErrInternal, err, "failed to enqueue account deletion")
		}

		return nil
	}, nil)
	if err != nil {
		return false, err
	}

	return true, nil
}

func (s *Server) getAccountStats(ctx context.Context, address string, seasons []uint16) ([]*proto.AccountStat, []*proto.AccountStat, error) {
	oplog := rctx.Logger(ctx)
	repo := rctx.DBContext(ctx)

	var stats []*data.AccountStat
	var err error

	account, err := repo.Accounts().FindByAddress(proto.HashFromString(address))
	if err != nil {
		oplog.Warn().Msgf("fetching account, db err, %v", err)
		return nil, nil, proto.WrapError(proto.ErrInternal, err, "failed fetching account")
	}

	if len(seasons) > 0 {
		stats, err = repo.AccountStats().FindByAccountIDAndSeasons(account.ID, seasons)
	} else {
		stats, err = repo.AccountStats().FindByAccountIDAllSeasons(account.ID)
	}
	if err != nil {
		oplog.Warn().Msgf("fetching account stats, db err, %v", err)
		return nil, nil, proto.WrapError(proto.ErrInternal, err, "failed fetching account game stats")
	}

	xp, err := repo.Items().GetXP(account.ID)
	if err != nil {
		oplog.Err(err).Msg("get xp")
		return nil, nil, proto.WrapError(proto.ErrInternal, err, "failed get xp")
	}

	totalExperience := levels.TotalExperience(account.Level, xp)

	var constructedStats []*proto.AccountStat
	var discoveryStats []*proto.AccountStat

	for _, st := range stats {
		totalRanks, err := s.cacheCountRanks(ctx, st.GameMode, st.PlayerRank, *st.Season)
		if err != nil {
			oplog.Warn().Msgf("fetching masters count: %v", err)
			return nil, nil, proto.WrapError(proto.ErrInternal, err, "failed fetching masters count")
		}

		ranks, err := repo.AccountStats().GetRanks(st.GameMode, []proto.AccountID{account.ID}, *st.Season)
		if err != nil {
			return nil, nil, proto.WrapError(proto.ErrInternal, err, "failed fetching account rank")
		}

		var rankProgress float32
		if rank, ok := ranks[st.AccountID]; ok {
			st.Rank = &rank
			if totalRanks > 0 {
				rankProgress = float32(rank) / float32(totalRanks)
			}
		}

		if st.PlayerRank == proto.PlayerRank_UNRANKED {
			rankProgress = float32(totalExperience) / float32(playerRank.MinimumExpForRanked)
		}

		rankProgress = float32(math.Floor(float64(rankProgress*100.0)) / 100.0)
		if rankProgress > 1 {
			// there's a tiny chance of this being more than 100% because
			// totalRanks is cached
			rankProgress = 1
		}

		st.RankProgress = &rankProgress
		st.Experience = &totalExperience

		switch st.GameMode {
		case proto.GameMode_RANKED_CONSTRUCTED:
			constructedStats = append(constructedStats, st.AccountStat)
		case proto.GameMode_RANKED_DISCOVERY:
			discoveryStats = append(discoveryStats, st.AccountStat)
		}
	}

	return constructedStats, discoveryStats, nil
}

func (s *Server) MigrateFromBurner(ctx context.Context, ethAuthProofString string) (bool, error) {
	logger := rctx.Logger(ctx)
	repo := rctx.DBContext(ctx)

	accountID, err := s.validateAccountAndGetAddress(ctx, nil)
	if err != nil {
		return false, err
	}

	valid, proof, err := s.ETHAuth.DecodeProof(ethAuthProofString)
	if err != nil {
		logger.Err(err).Msgf("decode eth auth proof")
		return false, proto.WrapError(proto.ErrPermissionDenied, err, "invalid ethauth proof")
	}

	if !valid || proof == nil {
		logger.Err(err).Msgf("invalid eth auth proof")
		return false, proto.Errorf(proto.ErrPermissionDenied, "invalid ethauth proof")
	}

	if proof.Claims.Origin != "" {
		httpReq, _ := ctx.Value(proto.HTTPRequestCtxKey).(*http.Request)
		if httpReq.Header.Get("Origin") != proof.Claims.Origin {
			return false, proto.Errorf(proto.ErrInvalidArgument, "ethauth proof origin does not match the http request")
		}
	}

	newAddress := proto.HashFromString(proof.Address)

	existingAccount, err := data.DB.Accounts(repo).FindByAddress(newAddress)
	if err != nil && !errors.Is(err, db.ErrNoMoreRows) {
		logger.Err(err).Msgf("find account %s", newAddress)
		return false, proto.ErrorInternal("finding account failed")
	}

	if existingAccount != nil || !errors.Is(err, db.ErrNoMoreRows) {
		return false, proto.ErrorInternal("account is registered already")
	}

	account, err := data.DB.Accounts(repo).FindByID(accountID)
	if err != nil {
		logger.Err(err).Msgf("find account %d", accountID)
		return false, proto.ErrorInternal("finding account failed")
	}

	if !account.IsBurner() {
		return false, proto.ErrorInternal("account is not burner")
	}

	account.Address = newAddress

	if err := repo.Save(account); err != nil {
		logger.Err(err).Msgf("save account %d", accountID)
		return false, proto.ErrorInternal("saving account failed")
	}

	if err := data.DB.Items(repo).AssignItemsToAccount(account.Address, account.ID); err != nil {
		logger.Err(err).Msgf("assign items to account with address %s", account.Address)
		return false, proto.ErrorInternal("assign items to account")
	}

	return true, nil
}

func (s *Server) PrepareTransferAssetsFromBurnerTransaction(ctx context.Context) ([]*proto.OnChainTransaction, error) {
	logger := rctx.Logger(ctx)

	accountID, err := s.validateAccountAndGetAddress(ctx, nil)
	if err != nil {
		return nil, err
	}

	transactions, err := s.AccountAssetTransferer.ComposeTransactionToTransferFromBurner(ctx, accountID)
	if err != nil {
		logger.Err(err).Msg("compose transactions to transfer from burner")
		return nil, proto.ErrorInternal("compose transactions to transfer from burner")
	}

	return transactions, nil
}

// PrefixEIP191Message prefixes the message before used in signing or validation as a digest
// as described in https://eips.ethereum.org/EIPS/eip-191.
func PrefixEIP191Message(msg string) string {
	return fmt.Sprintf("\x19Ethereum Signed Message:\n%d%s", len(msg), msg)
}

// TODO: Remove if we dont plan to enable captcha
//
//nolint:unused
func getRemoteIP(req *http.Request) string {
	remoteAddr := req.RemoteAddr

	ip, _, err := net.SplitHostPort(remoteAddr)
	if err != nil {
		return remoteAddr
	}
	return ip
}

func presentAccount(ctx context.Context, account *data.Account) {
	switch rctx.SessionTypeContext(ctx) {
	case rpcmw.SessionTypeService, rpcmw.SessionTypeAdmin:
		account.Settings = account.PrivateSettings
	case rpcmw.SessionTypeUser:
		sessionAccount, ok := rctx.CurrentAccount(ctx)
		if ok && (sessionAccount.ID == account.ID) {
			account.Settings = account.PrivateSettings
		}
	}
}

type CrystalGetter interface {
	GetTopPriority(db.Session, []proto.AccountID) (map[proto.AccountID]uint64, error)
}

//go:generate go run go.uber.org/mock/mockgen -destination ./mock/account_asset_transferer.go -package mock . AccountAssetTransferer
type AccountAssetTransferer interface {
	ComposeTransactionToTransferFromBurner(context.Context, proto.AccountID) ([]*proto.OnChainTransaction, error)
}

//go:generate go run go.uber.org/mock/mockgen -destination ./mock/account_registerer.go -package mock . AccountRegisterer
type AccountRegisterer interface {
	Register(context.Context, db.Session, *proto.AccountRegistration) (*data.Account, error)
}
