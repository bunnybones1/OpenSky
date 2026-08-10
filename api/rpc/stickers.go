package rpc

import (
	"context"

	"github.com/upper/db/v4"

	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/proto"
	"github.com/horizon-games/OpenSky/api/rpc/rctx"
)

func (s *Server) GetStickers(ctx context.Context) ([]*proto.Sticker, error) {
	return s.GetStickersBySeason(ctx, data.CurrentSeason())
}

func (s *Server) GetStickersBySeason(ctx context.Context, season uint16) ([]*proto.Sticker, error) {
	oplog := rctx.Logger(ctx)
	repo := rctx.DBContext(ctx)

	var stickers []*proto.Sticker
	err := repo.Stickers().Find(db.Cond{
		"season": season,
	}).OrderBy("required_points").All(&stickers)
	switch err {
	case db.ErrNoMoreRows:
		return nil, proto.ErrorNotFound("no stickers for this season")
	case nil:
		// ok
	default:
		oplog.Warn().Msgf("failed to fetch stickers %v", err)
		return nil, proto.WrapError(proto.ErrInternal, err, "failed to fetch stickers")
	}

	return stickers, nil
}

func (s *Server) GetStickerOwnership(ctx context.Context, accountAddress *string) (*proto.StickerOwnershipResponse, error) {
	logger := rctx.Logger(ctx)
	repo := rctx.DBContext(ctx)

	var accountID proto.AccountID

	if account, _ := rctx.CurrentAccount(ctx); account != nil {
		accountID = account.ID
	}

	if accountAddress != nil {
		account, err := data.DB.Accounts(repo).FindByAddress(proto.HashFromString(*accountAddress))
		if err != nil {
			logger.Err(err).Msgf("find account %s", *accountAddress)
			return nil, proto.ErrorInternal("find account failed")
		}

		accountID = account.ID
	}

	if !accountID.IsValid() {
		return nil, proto.ErrorInvalidArgument("accountAddress", "is invalid")
	}

	response := new(proto.StickerOwnershipResponse)
	response.StickerBalances = make(map[uint64]*proto.BalanceTuple)

	var balances []*data.Item
	err := repo.Items().Find(db.Cond{
		"account_id": accountID,
		"item_type":  proto.ItemType_SW_STICKERS,
		"balance":    db.Gt(0),
	}).All(&balances)
	if err != nil {
		return nil, err
	}

	for _, b := range balances {
		stickerID := b.TokenID
		response.StickerBalances[stickerID] = &proto.BalanceTuple{Balance: b.Balance}
	}

	return response, nil
}
