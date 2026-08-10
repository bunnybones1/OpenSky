package rpc

import (
	"context"

	"github.com/rs/zerolog/log"
	"github.com/upper/db/v4"

	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/proto"
	"github.com/horizon-games/OpenSky/api/rpc/rctx"
)

func (s *Server) GetFeed(ctx context.Context, page *proto.Page, req *proto.GetFeedRequest) (*proto.Page, []*proto.FeedEvent, error) {
	logger := rctx.Logger(ctx)
	repo := rctx.DBContext(ctx)

	if !req.AccountAddress.IsValidAddress() {
		return nil, nil, proto.ErrorInvalidArgument("account_address", "is invalid")
	}

	account, err := data.DB.Accounts(repo).FindByAddress(req.AccountAddress)
	if err != nil {
		logger.Err(err).Msgf("find account %s", req.AccountAddress)
		return nil, nil, proto.ErrorInternal("find account failed")
	}

	cond := db.And(db.Cond{"account_id": account.ID})

	// The specific events are deprecated,
	// so they should be excluded from the feed in case they would still exist in the database.
	cond = cond.And(db.Cond{"event_type": db.NotIn(proto.FeedEventType_MATCH, proto.FeedEventType_LEVELUP)})

	if len(req.Types) > 0 {
		cond = cond.And(db.Cond{"event_type": db.AnyOf(req.Types)})
	}

	q := repo.FeedEvents().Find(cond)

	var events []*proto.FeedEvent

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

	if err := paginator.Source(q).Get(ctx, &events); err != nil {
		return nil, nil, err
	}

	matchID2Event := make(map[uint64]*proto.FeedEvent)
	matchIDs := make([]uint64, 0, len(events))

	for _, e := range events {
		switch e.Type {
		case proto.FeedEventType_REWARD, proto.FeedEventType_TRADE:
			for _, tokenID := range e.TokenIDs {
				itemType, id, err := data.SWTokenID2TypeAndItemID(tokenID)
				if err != nil {
					continue
				}

				switch itemType {
				case proto.ItemType_SW_BASE_CARDS:
					card := data.CardIndex.GetCardByID(id)
					if card != nil {
						card.Card.ItemType = proto.ItemType_SW_BASE_CARDS
						e.Cards = append(e.Cards, card.Card)
					}

				case proto.ItemType_SW_SILVER_CARDS:
					card := data.CardIndex.GetCardByID(id)
					if card != nil {
						card.Card.ItemType = proto.ItemType_SW_SILVER_CARDS
						e.Cards = append(e.Cards, card.Card)
					}

				case proto.ItemType_SW_GOLD_CARDS:
					card := data.CardIndex.GetCardByID(id)
					if card != nil {
						card.Card.ItemType = proto.ItemType_SW_GOLD_CARDS
						e.Cards = append(e.Cards, card.Card)
					}

				case proto.ItemType_SW_HERO:
					e.Heroes = append(e.Heroes, proto.Hero(id))
				}
			}
		}
	}

	if len(matchIDs) > 0 {
		var matches []*data.Match
		if err := repo.Matches().Find(db.Cond{"id": db.AnyOf(matchIDs)}).All(&matches); err != nil {
			return nil, nil, proto.ErrorInternal("failed fetching match info %v", err.Error())
		}

		var playerAccountIDs []proto.AccountID

		for _, m := range matches {
			playerAccountIDs = append(playerAccountIDs, m.Player1ID, m.Player2ID)
		}

		var players []*data.Account
		if err := repo.Accounts().Find(db.Cond{"id": db.AnyOf(playerAccountIDs)}).All(&players); err != nil {
			return nil, nil, proto.ErrorInternal("failed fetching match player info %v", err.Error())
		}

		var accountIDs []proto.AccountID
		for _, p := range players {
			accountIDs = append(accountIDs, p.ID)
		}
		crystalIDOwnerMap, err := s.CrystalGetter.GetTopPriority(repo, accountIDs)
		if err != nil {
			log.Warn().Msgf("failed to get players's crystal: %v", err)
		}

		id2player := make(map[proto.AccountID]*proto.MatchPlayer, len(players))

		for _, p := range players {
			var playerCrystalID *uint64

			if crystalID, ok := crystalIDOwnerMap[p.ID]; ok {
				playerCrystalID = &crystalID
			}

			id2player[p.ID] = &proto.MatchPlayer{
				ID:        p.ID,
				Address:   p.Address,
				Name:      p.Name,
				Region:    p.Region,
				TagArtID:  p.TagArtID,
				CrystalID: playerCrystalID,
			}
		}

		for _, m := range matches {
			if p1 := id2player[m.Player1ID]; p1 != nil {
				playerCopy := *p1
				m.Player1 = &playerCopy
				m.Player1.DeckString = m.Player1DeckString
				m.Player1.InitDeckString = m.InitPlayer1DeckString
			}

			if p2 := id2player[m.Player2ID]; p2 != nil {
				playerCopy := *p2
				m.Player2 = &playerCopy
				m.Player2.DeckString = m.Player2DeckString
				m.Player2.InitDeckString = m.InitPlayer2DeckString
			}

			matchID2Event[m.ID].Match = m.Match
		}
	}

	return paginator.Page(), events, nil
}
