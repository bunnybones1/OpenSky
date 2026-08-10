package rpc

import (
	"context"

	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/proto"
	"github.com/horizon-games/OpenSky/api/rpc/rctx"
)

func (s *Server) GetFriendPoints(ctx context.Context, address string) (uint64, []*proto.FriendPoints, error) {
	repo := rctx.DBContext(ctx)
	oplog := rctx.Logger(ctx)

	accountID, err := s.validateAccountAndGetAddress(ctx, &address)
	if err != nil {
		return 0, nil, err
	}

	season := data.CurrentSeason()

	friends, err := repo.LevelsPerSeason(repo).GetFriendsList(accountID, season)
	if err != nil {
		oplog.Err(err).Msgf("get friend list")
		return 0, nil, proto.ErrorInternal("failed to fetch list of friends %v", err)
	}

	stickerPoints, err := repo.Items(repo).GetStickerPoints(accountID)
	if err != nil {
		oplog.Err(err).Msgf("get sticker points")
		return 0, nil, proto.ErrorInternal("failed to fetch sticker points")
	}

	highestCostAwardedSticker, err := repo.AwardedStickers(repo).FindHighestCostAwardedSticker(accountID, season)
	if err != nil {
		oplog.Err(err).Msgf("find highest cost awarded sticker")
		return 0, nil, proto.ErrorInternal("failed to find highest cost awarded sticker")
	}

	if highestCostAwardedSticker != nil {
		stickerPoints += highestCostAwardedSticker.RequiredPoints
	}

	return stickerPoints, friends, nil
}

func (s *Server) GetPointsGifted(ctx context.Context, address string) (uint64, *proto.Account, error) {
	repo := rctx.DBContext(ctx)
	oplog := rctx.Logger(ctx)

	accountID, err := s.validateAccountAndGetAddress(ctx, &address)
	if err != nil {
		return 0, nil, err
	}

	account, err := repo.Accounts().FindByID(accountID)
	if err != nil {
		oplog.Err(err).Msgf("find account")
		return 0, nil, proto.ErrorInternal("failed to find account")
	}

	if account == nil {
		return 0, nil, proto.ErrorInvalidArgument("account", "invalid account")
	}

	if account.InvitedByID == nil {
		return 0, nil, nil
	}

	inviter, err := repo.Accounts().FindByID(*account.InvitedByID)
	if err != nil {
		oplog.Err(err).Msgf("find inviter account")
		return 0, nil, proto.ErrorInternal("failed to retrieve inviter account %v", err)
	}

	levels, err := repo.LevelsPerSeason().FindByAccountIDAllSeasons(account.ID)
	if err != nil {
		oplog.Err(err).Msgf("find levels per season for all seasons")
		return 0, nil, proto.ErrorInternal("failed to fetch list of levels %v", err)
	}

	var total uint64

	for _, level := range levels {
		total += level.Levels
	}

	return total, inviter.Account, nil
}
