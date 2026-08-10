package rpc

import (
	"context"
	"encoding/json"
	"fmt"
	"regexp"
	"strings"

	"github.com/pkg/errors"
	"github.com/upper/db/v4"

	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/lib/jobqueue"
	"github.com/horizon-games/OpenSky/api/proto"
	"github.com/horizon-games/OpenSky/api/rpc/rctx"
)

var (
	reWhitespace    = regexp.MustCompile(`(\s+)`)
	reSearchCleanup = regexp.MustCompile(`([^\s\w]+)`)
)

func (s *Server) GetCardLibrary(ctx context.Context, page *proto.Page) ([]*proto.Card, error) {
	allCards := data.CardIndex.AllCards()
	pcards := make([]*proto.Card, len(allCards))
	for i := range allCards {
		pcards[i] = allCards[i].Card
	}
	return pcards, nil
}

func (s *Server) GetCardsByID(ctx context.Context, cardIDs []uint64) ([]*proto.Card, error) {
	cards := data.CardIndex.GetCardsByIDs(cardIDs)
	var pCards []*proto.Card
	for _, card := range cards {
		pCards = append(pCards, card.Card)
	}
	return pCards, nil
}

func (s *Server) GetCardsByDeckString(ctx context.Context, req string) ([]*proto.Card, error) {
	cards, err := data.CardIndex.GetCardsByDeckString(req)
	if err != nil {
		return nil, proto.ErrorInternal("could not find decks: %v", err)
	}

	pbCards := make([]*proto.Card, len(cards))
	for i, card := range cards {
		pbCards[i] = card.Card
	}

	return pbCards, nil
}

func (s *Server) SearchCards(ctx context.Context, page *proto.Page, req *proto.SearchCardsRequest) (*proto.Page, []*proto.CardWithBalance, error) {
	account, _ := rctx.CurrentAccount(ctx)

	results, page, err := s.searchCards(ctx, account, req.Criteria, req.IncludeUserBalances, req.ContractQuery, page)
	if err != nil {
		return nil, nil, proto.ErrorInternal("could not find cards: %v", err)
	}

	return page, results, nil
}

// searchCards will search the entire library (account=nil), or a user's collection (account!=nil)
func (s *Server) searchCards(ctx context.Context, account *data.Account, criteria *proto.CardSearchCriteria, includeBalances bool, queryContract bool, page *proto.Page) ([]*proto.CardWithBalance, *proto.Page, error) {
	// oplog := rctx.Logger(ctx)
	repo := rctx.DBContext(ctx)

	selector := repo.Session.SQL().Select(
		"c.id AS id",
		"c.name AS name",
		"c.description AS description",
		"c.asset AS asset",
		"c.mana_cost AS mana_cost",
		db.Raw(`(CASE WHEN c.mana_cost >= 0 THEN c.mana_cost ELSE 999999 END) AS mana_weight`),
		"c.power AS power",
		"c.health AS health",
		"c.attached_spell_id AS attached_spell_id",
		"c.keywords AS keywords",
		"c.updated_at AS updated_at",
		"c.created_at AS created_at",
		"c.rarity AS rarity",
		"c.class AS class",
		"c.element AS element",
		"c.status AS status",
		"c.type AS type").
		From("cards c").LeftJoin("cards t").On("c.attached_spell_id = t.id")

	filters := db.And()
	filters = filters.And(
		db.Raw("(t.status = ?) IS NOT FALSE", proto.CardStatus_PLAY),
	)
	cond := db.Cond{
		"c.status": proto.CardStatus_PLAY,
		"c.asset":  db.NotEq(""),
	}
	if criteria == nil || criteria.IncludeTokens == nil || !*criteria.IncludeTokens {
		cond["c.class"] = db.NotEq(proto.CardClass_TOK)
	}
	filters = filters.And(cond)

	var accountID proto.AccountID
	if account != nil {
		accountID = account.ID
	}

	if criteria != nil {
		if criteria.AccountAddress != nil {
			acc, err := data.DB.Accounts(repo).FindByAddress(*criteria.AccountAddress)
			if err != nil {
				return nil, nil, fmt.Errorf("find account %s: %w", *criteria.AccountAddress, err)
			}

			accountID = acc.ID
		}

		if criteria.OwnedCards != nil {
			if !accountID.IsValid() {
				return nil, nil, errors.Errorf("can't filter by card ownership for anonymous user")
			}

			var itemTypes []proto.ItemType
			if criteria.ItemType != nil && (*criteria.ItemType == proto.ItemType_SW_BASE_CARDS ||
				*criteria.ItemType == proto.ItemType_SW_SILVER_CARDS ||
				*criteria.ItemType == proto.ItemType_SW_GOLD_CARDS) {
				itemTypes = []proto.ItemType{*criteria.ItemType}
			} else {
				itemTypes = []proto.ItemType{
					proto.ItemType_SW_BASE_CARDS,
					proto.ItemType_SW_SILVER_CARDS,
					proto.ItemType_SW_GOLD_CARDS,
				}
			}

			if *criteria.OwnedCards {
				// search cards account owns
				filters = filters.And(db.Raw("EXISTS (SELECT 1 FROM items i WHERE c.id = i.token_id AND i.account_id = ? AND i.item_type IN ? AND i.balance > 0)", accountID, itemTypes))

			} else {
				// search cards account doesn't own
				filters = filters.And(db.Raw("NOT EXISTS (SELECT 1 FROM items i WHERE c.id = i.token_id AND i.account_id = ? AND i.item_type IN ? AND i.balance > 0)", accountID, itemTypes))
			}
		}

		if len(criteria.IDs) > 0 {
			filters = filters.And(db.Cond{"c.id": db.AnyOf(criteria.IDs)})
		}

		if criteria.SearchText != nil {
			q := reSearchCleanup.ReplaceAllString(*criteria.SearchText, " ")
			q = strings.TrimSpace(q)

			if len(q) > 0 {
				if !strings.Contains(q, " ") {
					filters = filters.And(db.Or(
						db.Raw("c.search_doc @@ to_tsquery(?::text)", q+":*"),
						db.Raw("t.search_doc @@ to_tsquery(?::text)", q+":*"),
					))
				} else {
					ts := reWhitespace.ReplaceAllString(q, " & ")
					filters = filters.And(db.Or(
						db.Raw("c.search_doc @@ to_tsquery(?::text)", ts+":*"),
						db.Raw("t.search_doc @@ to_tsquery(?::text)", ts+":*"),
						db.Raw("c.search_doc @@ websearch_to_tsquery(?::text)", q),
						db.Raw("t.search_doc @@ websearch_to_tsquery(?::text)", q),
					))
				}
			}
		}

		if len(criteria.CardManaCost) > 0 {
			filters = filters.And(db.Cond{"c.mana_cost": db.AnyOf(criteria.CardManaCost)})
		}

		if criteria.CardType != nil {
			filters = filters.And(db.Cond{"c.type": criteria.CardType})
		}

		if len(criteria.CardElement) > 0 {
			filters = filters.And(db.Or(
				db.Cond{"c.element": db.AnyOf(criteria.CardElement)},
				db.Cond{"t.element": db.AnyOf(criteria.CardElement)},
			))
		}

		if len(criteria.CardClass) > 0 {
			filters = filters.And(db.Cond{"c.class": db.AnyOf(criteria.CardClass)})
		}
	}

	var cards []*proto.CardWithBalance

	selector = selector.Where(filters)

	// Wrap in a subquery to use "mana_weight" as a regular column when sorting
	selector = repo.SQL().Select("*").From(selector).As("q")

	cursorKey := &proto.SortBy{
		Column: "id",
		Order:  &sortOrder_ASC,
	}
	orderByManaCost := &proto.SortBy{
		Column: "mana_weight",
		Order:  &sortOrder_ASC,
	}

	paginator, err := NewPaginator(page, cursorKey, orderByManaCost)
	if err != nil {
		return nil, nil, proto.WrapError(proto.ErrInternal, err, "invalid page settings")
	}

	if err := paginator.Source(selector).Get(ctx, &cards); err != nil {
		return nil, nil, err
	}

	for _, c := range cards {
		c.Card.ImageURL = data.CardIndex.GetImageURL(c.Card.ID)
	}

	// TODO: a lot of this code is super redundant and copied from GetCards..
	// ahh.. one day we'll write nice code cuz we card, right?
	if includeBalances && accountID.IsValid() {
		cardIDs := make([]uint64, len(cards))
		cardMap := make(map[uint64]*proto.CardWithBalance, len(cards))
		for i, c := range cards {
			c.BalanceByType = map[string]*proto.BalanceTuple{}
			cardIDs[i] = c.Card.ID
			cardMap[c.Card.ID] = c
		}
		var balances []*data.Item
		err := repo.Items().Find(db.Cond{
			"account_id": accountID,
			"token_id":   db.AnyOf(cardIDs),
			"item_type":  db.Gte(proto.ItemType_SW_BASE_CARDS),
			"balance":    db.Gt(0),
		}).All(&balances)
		if err != nil {
			return nil, nil, err
		}

		for _, b := range balances {
			cardID := uint64(b.TokenID)
			if cardMap[cardID].CreatedAt == nil || (b.CreatedAt != nil && cardMap[cardID].CreatedAt.Before(*b.CreatedAt)) {
				cardMap[cardID].CreatedAt = b.CreatedAt
			}

			// ByType
			if cardMap[cardID].BalanceByType[b.ItemType.String()] == nil {
				cardMap[cardID].BalanceByType[b.ItemType.String()] = &proto.BalanceTuple{}
			}
			cardMap[cardID].BalanceByType[b.ItemType.String()].Balance.Add(b.Balance.Int())

			// Totals
			cardMap[cardID].Balance.Add(b.Balance.Int())

		}
	}

	return cards, paginator.Page(), nil
}

func removeInvalidCards(d *proto.Deck) bool {
	removed := false

	// remove deleted cards
	validCardIDs := data.CardIndex.RemoveInvalidIDs(d.CardIDs)
	if len(d.CardIDs) != len(validCardIDs) {
		removed = true
	}
	d.CardIDs = validCardIDs

	var cardClass1, cardClass2 proto.CardClass

	switch d.Class {
	case proto.DeckClass_STR,
		proto.DeckClass_STH,
		proto.DeckClass_STA,
		proto.DeckClass_STI,
		proto.DeckClass_STW:
		cardClass1 = proto.CardClass_STR

	case proto.DeckClass_HRT,
		proto.DeckClass_HRA,
		proto.DeckClass_HRI,
		proto.DeckClass_HRW:
		cardClass1 = proto.CardClass_HRT

	case proto.DeckClass_AGY,
		proto.DeckClass_AGI,
		proto.DeckClass_AGW:
		cardClass1 = proto.CardClass_AGY

	case proto.DeckClass_INT,
		proto.DeckClass_INW:
		cardClass1 = proto.CardClass_INT

	case proto.DeckClass_WIS:
		cardClass1 = proto.CardClass_WIS
	}

	switch d.Class {
	case proto.DeckClass_STW,
		proto.DeckClass_HRW,
		proto.DeckClass_AGW,
		proto.DeckClass_INW:
		cardClass2 = proto.CardClass_WIS

	case proto.DeckClass_STI,
		proto.DeckClass_HRI,
		proto.DeckClass_AGI:
		cardClass2 = proto.CardClass_INT

	case proto.DeckClass_STA,
		proto.DeckClass_HRA:
		cardClass2 = proto.CardClass_AGY

	case proto.DeckClass_STH:
		cardClass2 = proto.CardClass_HRT
	}

	cards := data.CardIndex.GetCardsByIDs(d.CardIDs)
	newIDs := make([]uint64, 0, len(d.CardIDs))
	for _, c := range cards {
		if c.Class != cardClass1 && c.Class != cardClass2 {
			removed = true
			continue
		}
		newIDs = append(newIDs, c.ID)
	}

	d.CardIDs = newIDs
	cardsDeckClass, _, _ := data.GetDeckClassFromCardIDs(newIDs)
	if !data.EqualOrSubclass(d.Class, cardsDeckClass) {
		d.Class = cardsDeckClass
	}

	d.DeckString, _ = data.EncodeDeckString(d.CardIDs, d.Class)

	return removed
}

// GetCards returns cards from the entire library
func (s *Server) GetCardOwnership(ctx context.Context, accountAddress *string, contractQuery *bool) (*proto.CardOwnershipResponse, error) {
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
		return nil, proto.ErrorInvalidArgument("accountAddress", "not set")
	}

	frames := []proto.ItemType{proto.ItemType_SW_BASE_CARDS, proto.ItemType_SW_SILVER_CARDS, proto.ItemType_SW_GOLD_CARDS}

	response := new(proto.CardOwnershipResponse)
	response.CardBalances = make(map[uint64]map[string]*proto.BalanceTuple)
	response.LockedCardsByClass = make(map[string]uint64)
	response.LockedCardsByFrame = make(map[string]uint64)
	response.LockedCardsByClassAndFrame = make(map[string]map[string]uint64)
	response.UnlockedCardsByClass = make(map[string]uint64)
	response.UnlockedCardsByFrame = make(map[string]uint64)
	response.UnlockedCardsByClassAndFrame = make(map[string]map[string]uint64)
	response.PendingCardsByClass = make(map[string]uint64)
	response.PendingCardsByFrame = make(map[string]uint64)
	response.PendingCardsByClassAndFrame = make(map[string]map[string]uint64)

	for _, frame := range frames {
		response.LockedCardsByFrame[frame.String()] = 0
		response.UnlockedCardsByFrame[frame.String()] = 0
		response.PendingCardsByFrame[frame.String()] = 0
	}

	for _, class := range data.ActiveClasses {
		response.LockedCardsByClass[class.String()] = 0
		response.UnlockedCardsByClass[class.String()] = 0
		response.PendingCardsByClass[class.String()] = 0

		response.LockedCardsByClassAndFrame[class.String()] = make(map[string]uint64)
		response.UnlockedCardsByClassAndFrame[class.String()] = make(map[string]uint64)
		response.PendingCardsByClassAndFrame[class.String()] = make(map[string]uint64)

		for _, frame := range frames {
			response.LockedCardsByClassAndFrame[class.String()][frame.String()] = 0
			response.UnlockedCardsByClassAndFrame[class.String()][frame.String()] = 0
			response.PendingCardsByClassAndFrame[class.String()][frame.String()] = 0
		}
	}

	var balances []*data.Item
	err := repo.Items().Find(db.Cond{
		"account_id": accountID,
		"item_type":  db.AnyOf(frames),
		"balance":    db.Gt(0),
	}).All(&balances)
	if err != nil {
		return nil, err
	}

	var cardID uint64
	var card *data.Card
	for _, b := range balances {
		cardID = b.TokenID
		if !data.CardIndex.IDs.Has(cardID) {
			continue
		}
		card = data.CardIndex.GetCardByID(cardID)

		vals, ok := response.CardBalances[cardID]
		if !ok {
			vals = make(map[string]*proto.BalanceTuple, len(frames))
			for _, frame := range frames {
				vals[frame.String()] = new(proto.BalanceTuple)
			}

			response.UnlockedCards++
			response.UnlockedCardsByClass[card.Class.String()]++
		}
		vals[b.ItemType.String()].Balance = b.Balance
		vals[b.ItemType.String()].IsNew = b.IsNew

		response.CardBalances[cardID] = vals

		response.UnlockedCardsByFrame[b.ItemType.String()]++
		response.UnlockedCardsByClassAndFrame[card.Class.String()][b.ItemType.String()]++
	}

	for _, card := range data.CardIndex.AllCards() {
		response.LockedCards++
		response.LockedCardsByClass[card.Class.String()]++

		for _, frame := range frames {
			response.LockedCardsByFrame[frame.String()]++
			response.LockedCardsByClassAndFrame[card.Class.String()][frame.String()]++
		}
	}
	response.LockedCards = response.LockedCards - response.UnlockedCards
	for _, frame := range frames {
		response.LockedCardsByFrame[frame.String()] = response.LockedCardsByFrame[frame.String()] - response.UnlockedCardsByFrame[frame.String()]
	}

	for _, class := range data.ActiveClasses {
		response.LockedCardsByClass[class.String()] = response.LockedCardsByClass[class.String()] - response.UnlockedCardsByClass[class.String()]

		for _, frame := range frames {
			response.LockedCardsByClassAndFrame[class.String()][frame.String()] = response.LockedCardsByClassAndFrame[class.String()][frame.String()] - response.UnlockedCardsByClassAndFrame[class.String()][frame.String()]
		}
	}

	// delayed minting cards
	var tasks []*data.Task
	err = data.DB.Tasks(nil).Find(db.Cond{
		"account_id": accountID,
		"queue":      db.In(jobqueue.DelayedMintingQueue),
		"status":     db.In(proto.TaskStatus_PENDING, proto.TaskStatus_DISABLED),
	}).All(&tasks)
	if err != nil {
		return nil, err
	}
	for _, task := range tasks {
		var payload jobqueue.DelayedMintingTask
		err := json.Unmarshal(task.Payload, &payload)
		if err != nil {
			return nil, err
		}

		for _, tokenID := range payload.TokenIDs {
			tokenType, cardID, err := data.SWTokenID2TypeAndItemID(tokenID)
			if err != nil {
				continue
			}

			if tokenType != proto.ItemType_SW_SILVER_CARDS && tokenType != proto.ItemType_SW_GOLD_CARDS {
				continue
			}

			if !data.CardIndex.IDs.Has(cardID) {
				continue
			}

			card = data.CardIndex.GetCardByID(cardID)

			response.PendingCards++
			response.PendingCardsByClass[card.Class.String()]++
			response.PendingCardsByFrame[tokenType.String()]++
			response.PendingCardsByClassAndFrame[card.Class.String()][tokenType.String()]++
		}

	}

	return response, nil
}

func (s *Server) GetPendingCards(ctx context.Context) ([]*proto.PendingCardsResponse, error) {
	account, _ := rctx.CurrentAccount(ctx)

	var tasks []*data.Task
	err := data.DB.Tasks(nil).Find(db.Cond{
		"account_id": account.ID,
		"queue":      db.In(jobqueue.DelayedMintingQueue),
		"status":     db.In(proto.TaskStatus_PENDING, proto.TaskStatus_DISABLED),
	}).All(&tasks)
	if err != nil {
		return nil, err
	}

	var response []*proto.PendingCardsResponse

	for _, task := range tasks {
		var payload jobqueue.DelayedMintingTask
		err := json.Unmarshal(task.Payload, &payload)
		if err != nil {
			return nil, err
		}

		resp := &proto.PendingCardsResponse{
			MintAt: *task.RunAt,
		}

		for _, tokenID := range payload.TokenIDs {
			resp.TokenIDs = append(resp.TokenIDs, tokenID)

			tokenType, cardID, err := data.SWTokenID2TypeAndItemID(tokenID)
			if err != nil {
				continue
			}

			if tokenType != proto.ItemType_SW_SILVER_CARDS && tokenType != proto.ItemType_SW_GOLD_CARDS {
				continue
			}

			if !data.CardIndex.IDs.Has(cardID) {
				continue
			}
			card := data.CardIndex.GetCardByID(cardID)

			resp.Cards = append(resp.Cards, card.Card)
		}

		response = append(response, resp)
	}

	return response, nil
}
