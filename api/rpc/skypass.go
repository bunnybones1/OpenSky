package rpc

import (
	"context"
	"fmt"
	"io"
	"math/big"
	"net/http"
	"sort"

	"github.com/upper/db/v4"

	"github.com/horizon-games/OpenSky/api/config"
	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/proto"
	"github.com/horizon-games/OpenSky/api/rpc/rctx"
)

func (s *Server) ListSkypassRewards(ctx context.Context, season *uint16, accountAddress *string) (*proto.ListSkypassRewardsResponse, error) {
	logger := rctx.Logger(ctx)
	repo := rctx.DBContext(ctx)

	accountID, err := s.validateAccountAndGetAddress(ctx, accountAddress)
	if err != nil {
		return nil, err
	}

	// Use current season if not specified.
	ssn := data.CurrentSeason()

	if season != nil {
		ssn = *season
	}

	levels, err := s.SkypassRewardLister.ListBySeason(ctx, accountID, ssn)
	if err != nil {
		logger.Err(err).Msg("list skypass rewards")
		return nil, proto.ErrorInternal("list skypass rewards")
	}

	seasonStat, err := data.DB.SkypassSeasonStats(repo).FindOrCreate(accountID, ssn)
	if err != nil {
		logger.Err(err).Msg("find or create skypass season stat")
		return nil, proto.ErrorInternal("find skypass season stat")
	}

	return &proto.ListSkypassRewardsResponse{
		Levels:       levels,
		SeasonNumber: ssn,
		SeasonName:   data.SeasonName(ssn),
		HasPremium:   seasonStat.HasPremium,
	}, nil
}

func (s *Server) ClaimSkypassRewards(ctx context.Context, ids []uint64, accountAddress *string) ([]*proto.Reward, error) {
	logger := rctx.Logger(ctx)

	accountID, err := s.validateAccountAndGetAddress(ctx, accountAddress)
	if err != nil {
		return nil, err
	}

	gainedRewards, err := s.SkypassRewardClaimer.ClaimRewards(ctx, accountID, ids)
	if err != nil {
		logger.Err(err).Msg("claim skypass rewards")
		return nil, proto.ErrorInternal("claim skypass rewards")
	}

	r := rctx.HTTPRequest(ctx)
	if err := s.Analytics.TrackSkypassRewardsClaim(r, accountID, gainedRewards); err != nil {
		// log and continue (not a fatal error)
		logger.Err(err).Msg("TrackSkypassRewardsClaim")
	}

	return gainedRewards, nil
}

func (s *Server) GMListSkypassRewards(ctx context.Context, season *uint16) ([]*proto.SkypassReward, error) {
	logger := rctx.Logger(ctx)

	seasonNumber := data.CurrentSeason()

	if season != nil {
		seasonNumber = *season
	}

	var rewards []*data.SkypassReward

	if err := data.DB.SkypassRewards().Find(db.Cond{"season": seasonNumber}).All(&rewards); err != nil {
		logger.Err(err).Msg("find skypass rewards")
		return nil, proto.ErrorInternal("find skypass rewards")
	}

	var rewardsProto []*proto.SkypassReward

	for _, reward := range rewards {
		rewardsProto = append(rewardsProto, reward.SkypassReward)
	}

	sort.SliceStable(rewardsProto, func(i, j int) bool {
		if rewardsProto[i].Level != rewardsProto[j].Level {
			return rewardsProto[i].Level < rewardsProto[j].Level
		}

		if rewardsProto[i].Tier != rewardsProto[j].Tier {
			return *rewardsProto[i].Tier < *rewardsProto[j].Tier
		}

		return !rewardsProto[i].IsStarter
	})

	return rewardsProto, nil
}

func (s *Server) GMUpdateSkypassRewards(ctx context.Context, season uint16, url string) ([]*proto.SkypassReward, error) {
	logger := rctx.Logger(ctx)

	account, ok := rctx.CurrentAccount(ctx)
	if !ok {
		return nil, proto.ErrorInvalidArgument("session", "missing account")
	}

	resp, err := http.DefaultClient.Get(url)
	if err != nil {
		logger.Err(err).Msg("get spreadsheet")
		return nil, proto.ErrorInternal("get spreadsheet: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, proto.ErrorInternal("get spreadsheet failed with status %d", resp.StatusCode)
	}

	if resp.Header["Content-Type"][0] != "text/csv" {
		logger.Error().Msgf("expected content-type 'text/csv' but got '%s'", resp.Header["Content-Type"][0])
		return nil, proto.ErrorInternal("expected content-type 'text/csv' but got '%s'", resp.Header["Content-Type"][0])
	}

	rewards, err := s.SkypassRewardUpdater.UpdateFromReader(ctx, account.ID, season, resp.Body)
	if err != nil {
		logger.Err(err).Msg("update from reader")
		return nil, proto.ErrorInternal("update from reader: %v", err)
	}

	var rewardsProto []*proto.SkypassReward

	for _, reward := range rewards {
		rewardsProto = append(rewardsProto, reward.SkypassReward)
	}

	sort.SliceStable(rewardsProto, func(i, j int) bool {
		if rewardsProto[i].Level != rewardsProto[j].Level {
			return rewardsProto[i].Level < rewardsProto[j].Level
		}

		if rewardsProto[i].Tier != rewardsProto[j].Tier {
			return *rewardsProto[i].Tier < *rewardsProto[j].Tier
		}

		return !rewardsProto[i].IsStarter
	})

	return rewardsProto, nil
}

func (s *Server) GMHasSkypassPremium(ctx context.Context, address string) (bool, error) {
	logger := rctx.Logger(ctx)

	accountID, err := s.validateAccountAndGetAddress(ctx, &address)
	if err != nil {
		return false, err
	}

	seasonStat, err := data.DB.SkypassSeasonStats().FindOrCreate(accountID, data.CurrentSeason())
	if err != nil {
		logger.Err(err).Msg("find season stats")
		return false, proto.ErrorInternal("find season stats: %v", err)
	}

	return seasonStat.HasPremium, nil
}

func (s *Server) GMToggleSkypassPremium(ctx context.Context, address string) (bool, error) {
	logger := rctx.Logger(ctx)

	accountID, err := s.validateAccountAndGetAddress(ctx, &address)
	if err != nil {
		return false, err
	}

	season := data.CurrentSeason()
	tokenID := data.SkypassTokenID(season)
	amount := big.NewInt(1)

	if s.Config.Mode == config.ProductionMode {
		count, err := data.DB.Transactions().Find(db.Cond{
			"token_id":         tokenID,
			"transaction_type": proto.TransactionType_GIVEAWAY,
		}).Count()
		if err != nil {
			logger.Err(err).Msg("find transactions")
			return false, proto.ErrorInternal("find transactions: %v", err)
		}

		if count >= s.Config.OpenSky.SkypassConfig.GiveawayLimit {
			logger.Error().Msg("too many skypasses given away")
			return false, proto.ErrorInternal("too many skypasses given away")
		}
	}

	var hasPremium bool

	err = data.DB.Tx(func(sess db.Session) error {
		seasonStat, err := data.DB.SkypassSeasonStats(sess).FindOrCreate(accountID, season)
		if err != nil {
			return fmt.Errorf("find season stats: %w", err)
		}

		switch seasonStat.HasPremium {
		case true:
			err := data.DB.Items(sess).SpendToken(
				accountID,
				tokenID,
				amount,
				proto.TransactionType_TAKEAWAY,
				"")
			if err != nil {
				return fmt.Errorf("spend token: %w", err)
			}

			if err := data.DB.SkypassSeasonStats(sess).UnsetPremium(accountID, season); err != nil {
				return fmt.Errorf("unset premium: %w", err)
			}

			hasPremium = false
		case false:
			err := data.DB.Items(sess).GainToken(
				accountID,
				tokenID,
				amount,
				proto.TransactionType_GIVEAWAY,
				"")
			if err != nil {
				return fmt.Errorf("gain token: %w", err)
			}

			if err = data.DB.SkypassSeasonStats(sess).SetPremium(accountID, season); err != nil {
				return fmt.Errorf("set premium: %w", err)
			}

			hasPremium = true
		}

		return nil
	})
	if err != nil {
		logger.Err(err).Msg("toggle skypass premium")
		return false, proto.ErrorInternal("toggle skypass premium: %v", err)
	}

	return hasPremium, nil
}

// SkypassRewardLister provides list of rewards for an account.
//
//go:generate go run go.uber.org/mock/mockgen -destination ./mock/skypass_reward_lister.go -package mock . SkypassRewardLister
type SkypassRewardLister interface {
	ListBySeason(context.Context, proto.AccountID, uint16) ([]*proto.SkypassLevel, error)
}

// SkypassRewardClaimer claims rewards for an account.
//
//go:generate go run go.uber.org/mock/mockgen -destination ./mock/skypass_reward_claimer.go -package mock . SkypassRewardClaimer
type SkypassRewardClaimer interface {
	ClaimRewards(context.Context, proto.AccountID, []uint64) ([]*proto.Reward, error)
}

// SkypassRewardUpdater updates Skypass rewards.
//
//go:generate go run go.uber.org/mock/mockgen -destination ./mock/skypass_reward_updater.go -package mock . SkypassRewardUpdater
type SkypassRewardUpdater interface {
	UpdateFromReader(ctx context.Context, accountID proto.AccountID, season uint16, r io.Reader) ([]*data.SkypassReward, error)
}
