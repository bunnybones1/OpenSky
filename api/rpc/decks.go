package rpc

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/upper/db/v4"

	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/proto"
	"github.com/horizon-games/OpenSky/api/rpc/rctx"
)

func (s *Server) ListDeckRanks(ctx context.Context, page *proto.Page, req *proto.ListDeckRanksRequest) (*proto.Page, []*proto.DeckRankAccount, error) {
	repo := rctx.DBContext(ctx)

	ranks := []*proto.DeckRank{}

	conds := db.And(db.Cond{
		"score": db.Gt(0),
	})
	if req != nil && req.Class > 0 {
		conds = conds.And(db.Cond{"class": req.Class})
	}

	q := repo.DeckRanks().FindCurrent(conds)

	cursorKey := &proto.SortBy{
		Column: "deck_string",
		Order:  &sortOrder_DESC,
	}
	orderByScore := &proto.SortBy{
		Column: "score",
		Order:  &sortOrder_DESC,
	}
	orderByCardsRevision := &proto.SortBy{
		Column: "cards_revision",
		Order:  &sortOrder_DESC,
	}

	paginator, err := NewPaginator(page, cursorKey, orderByScore, orderByCardsRevision)
	if err != nil {
		return nil, nil, proto.WrapError(proto.ErrInternal, err, "invalid page settings")
	}

	if err := paginator.Source(q).Get(ctx, &ranks); err != nil {
		return nil, nil, err
	}

	results := make([]*proto.DeckRankAccount, 0, len(ranks))
	for i := range ranks {
		var player *proto.Account
		if ranks[i].HighestPlayerID.IsValid() {
			account, err := repo.Accounts().FindByID(ranks[i].HighestPlayerID)
			if err != nil {
				return nil, nil, proto.ErrorNotFound("missing account")
			}
			player = account.Account
		}
		results = append(results, &proto.DeckRankAccount{
			DeckRank:      ranks[i],
			HighestPlayer: player,
		})
	}

	return paginator.Page(), results, nil
}

func (s *Server) ListDecks(ctx context.Context, page *proto.Page) (*proto.Page, []*proto.Deck, error) {
	account, ok := rctx.CurrentAccount(ctx)
	if !ok {
		return nil, nil, proto.ErrorInvalidArgument("session", "missing account")
	}

	repo := rctx.DBContext(ctx)

	if page == nil {
		page = &proto.Page{}
	}

	if page.PageSize == nil || *page.PageSize == 0 {
		pageSize := uint32(200)
		page.PageSize = &pageSize
	}

	cond := db.Cond{
		"account_id": account.ID,
	}

	decks := []*proto.Deck{}

	q := repo.Decks().Find(cond)

	cursorKey := &proto.SortBy{
		Column: "uuid",
		Order:  &sortOrder_DESC,
	}
	orderByFavoritedAt := &proto.SortBy{
		Column: "favorited_at",
		Order:  &sortOrder_DESC,
	}
	orderByName := &proto.SortBy{
		Column: "name",
		Order:  &sortOrder_ASC,
	}

	paginator, err := NewPaginator(page, cursorKey, orderByFavoritedAt, orderByName)
	if err != nil {
		return nil, nil, proto.WrapError(proto.ErrInternal, err, "invalid page settings")
	}

	paginator.SetOptions(&PaginatorOptions{AddNullsLast: true})

	if err := paginator.Source(q).Get(ctx, &decks); err != nil {
		return nil, nil, err
	}

	for _, deck := range decks {
		removeInvalidCards(deck)

		conquestV2points, err := s.ConquestV2PointsCalculator.FromDeckString(ctx, account.ID, deck.DeckString)
		if err != nil {
			return nil, nil, proto.WrapError(proto.ErrInternal, err, "calculate conquest v2 points failed")
		}

		deck.ConquestV2Points = conquestV2points
	}

	return paginator.Page(), decks, nil
}

func (s *Server) InternalListUnlockedDeckStrings(ctx context.Context, req *proto.InternalListUnlockedDeckStringsRequest) ([]string, error) {
	logger := rctx.Logger(ctx)
	repo := rctx.DBContext(ctx)

	accountAddress := req.AccountAddress.String()
	accountID, err := s.validateAccountAndGetAddress(ctx, &accountAddress)
	if err != nil {
		return nil, err
	}

	// find unlocked heroes
	items, err := data.DB.Items(repo).FindAccountItems(accountID, proto.ItemType_SW_HERO)
	if err != nil {
		logger.Err(err).Msg("find account items")
		return nil, proto.ErrorInternal("find account items")
	}

	unlockedHeroes := map[proto.DeckClass]bool{}
	for _, item := range items {
		unlockedHeroes[data.HeroDeckClass(proto.Hero(item.TokenID))] = true
	}

	starterDecks := data.GetStarterDecks() // retrieve static list of starter decks
	var deckStrings []string
	for _, deck := range starterDecks {
		if !unlockedHeroes[deck.Class] {
			// hero is not unlocked yet
			continue
		}
		// push deckstring into response
		deckString, err := data.EncodeDeckString(deck.CardIDs, deck.Class)
		if err != nil {
			logger.Err(err).Msgf("generate deck string")
			return nil, proto.ErrorInternal("generate deck string")
		}
		deckStrings = append(deckStrings, deckString)
	}

	return deckStrings, nil
}

func (s *Server) FavoriteDeck(ctx context.Context, uuid string) (bool, error) {
	account, ok := rctx.CurrentAccount(ctx)
	if !ok {
		return false, proto.ErrorInvalidArgument("session", "missing account")
	}
	repo := rctx.DBContext(ctx)

	cond := db.Cond{
		"account_id": account.ID,
		"uuid":       uuid,
	}
	now := time.Now().UTC()

	err := repo.Decks().Find(cond).Update(map[string]time.Time{
		"favorited_at": now,
	})
	if err != nil {
		return false, err
	}

	return true, nil
}

func (s *Server) UnfavoriteDeck(ctx context.Context, uuid string) (bool, error) {
	account, ok := rctx.CurrentAccount(ctx)
	if !ok {
		return false, proto.ErrorInvalidArgument("session", "missing account")
	}
	repo := rctx.DBContext(ctx)

	cond := db.Cond{
		"account_id": account.ID,
		"uuid":       uuid,
	}

	err := repo.Decks().Find(cond).Update(map[string]interface{}{
		"favorited_at": nil,
	})

	if err != nil {
		return false, err
	}

	return true, nil
}

func (s *Server) ToggleDeckFavorite(ctx context.Context, uuid string) (bool, error) {
	account, ok := rctx.CurrentAccount(ctx)
	if !ok {
		return false, proto.ErrorInvalidArgument("session", "missing account")
	}
	repo := rctx.DBContext(ctx)

	cond := db.Cond{
		"account_id": account.ID,
		"uuid":       uuid,
	}

	var isFavorite bool

	err := repo.TxContext(ctx, func(tx db.Session) error {
		var deck proto.Deck
		err := repo.Decks(tx).Find(cond).One(&deck)
		if err != nil {
			return err
		}
		isFavorite = deck.FavoritedAt != nil

		var favoritedAt *time.Time
		if isFavorite {
			// unset favorited time
			favoritedAt = nil
			isFavorite = false
		} else {
			now := time.Now().UTC()
			favoritedAt = &now
			isFavorite = true
		}

		err = repo.Decks(tx).Find(cond).Update(map[string]interface{}{
			"favorited_at": favoritedAt,
		})
		return err
	}, nil)

	return isFavorite, err
}

func (s *Server) SearchDecks(ctx context.Context, page *proto.Page, req *proto.SearchDecksRequest) (*proto.Page, []*proto.Deck, error) {
	repo := rctx.DBContext(ctx)

	account, ok := rctx.CurrentAccount(ctx)
	if !ok {
		return nil, nil, proto.ErrorInvalidArgument("session", "missing account")
	}

	cond := db.Cond{
		"account_id": account.ID,
	}

	// user's cards
	filters := db.And(cond)

	if req.DeckString != nil && *req.DeckString != "" {
		filters = filters.And(db.Cond{"deck_string": *req.DeckString})
	}

	if req.Name != nil && *req.Name != "" {
		filters = filters.And(db.Cond{"name ILIKE": "%" + *req.Name + "%"})
	}

	if req.Class != nil {
		filters = filters.And(db.Cond{"class": *req.Class})
	}

	decks := []*proto.Deck{}

	q := repo.Decks().Find(filters)

	cursorKey := &proto.SortBy{
		Column: "uuid",
		Order:  &sortOrder_DESC,
	}
	orderByName := &proto.SortBy{
		Column: "name",
		Order:  &sortOrder_ASC,
	}
	orderByCreatedAt := &proto.SortBy{
		Column: "created_at",
		Order:  &sortOrder_DESC,
	}

	paginator, err := NewPaginator(page, cursorKey, orderByName, orderByCreatedAt)
	if err != nil {
		return nil, nil, proto.WrapError(proto.ErrInternal, err, "invalid page settings")
	}

	if err := paginator.Source(q).Get(ctx, &decks); err != nil {
		return nil, nil, err
	}

	for _, deck := range decks {
		removeInvalidCards(deck)
	}

	return paginator.Page(), decks, nil
}

func (s *Server) SearchDeckRanks(ctx context.Context, page *proto.Page, req *proto.SearchDeckRanksRequest) (*proto.Page, []*proto.DeckRank, error) {
	logger := rctx.Logger(ctx)
	repo := rctx.DBContext(ctx)

	filters := db.And()

	if req.DeckString != nil && *req.DeckString != "" {
		filters = db.And(db.Cond{"deck_string": *req.DeckString})
	}

	if len(req.Classes) > 0 {
		filters = db.And(db.Cond{"class": req.Classes})
	}

	if req.WithCards != nil && len(req.WithCards) > 0 {
		filters = db.And(db.Raw("card_ids @> ?", strings.Replace(fmt.Sprint(req.WithCards), " ", ",", -1)))
	}

	q := repo.DeckRanks().FindCurrent(filters)

	var results []*proto.DeckRank

	cursorKey := &proto.SortBy{
		Column: "deck_string",
		Order:  &sortOrder_DESC,
	}
	orderByScore := &proto.SortBy{
		Column: "score",
		Order:  &sortOrder_DESC,
	}
	orderByCardsRevision := &proto.SortBy{
		Column: "cards_revision",
		Order:  &sortOrder_ASC,
	}

	paginator, err := NewPaginator(page, cursorKey, orderByScore, orderByCardsRevision)
	if err != nil {
		return nil, nil, proto.WrapError(proto.ErrInternal, err, "invalid page settings")
	}

	if err := paginator.Source(q).Get(ctx, &results); err != nil {
		logger.Err(err).Msg("get search deck ranks")
		return nil, nil, err
	}

	var accountIDs []proto.AccountID

	for _, deckRank := range results {
		accountIDs = append(accountIDs, deckRank.HighestPlayerID)
	}

	var accounts []*data.Account

	err = data.DB.Accounts(repo).Find(db.Cond{"id": db.AnyOf(accountIDs)}).All(&accounts)
	if err != nil {
		logger.Err(err).Msg("find accounts")
		return nil, nil, proto.ErrorInternal("find accounts failed")
	}

	accountIDMap := make(map[proto.AccountID]proto.Hash)

	for _, account := range accounts {
		accountIDMap[account.ID] = account.Address
	}

	for _, deckRank := range results {
		deckRank.HighestPlayerAddress = accountIDMap[deckRank.HighestPlayerID]
	}

	return paginator.Page(), results, nil
}

func (s *Server) CreateDeck(ctx context.Context, req *proto.CreateDeckRequest) (*proto.Deck, error) {
	account, ok := rctx.CurrentAccount(ctx)
	if !ok {
		return nil, proto.ErrorInvalidArgument("session", "missing account")
	}
	repo := rctx.DBContext(ctx)

	var deckClass proto.DeckClass
	if req.DeckClass != nil {
		deckClass = *req.DeckClass
	}

	deck, err := data.NewDeckByCardIDs(req.Name, deckClass, req.CardIDs)
	if err != nil {
		return nil, err
	}

	deck.AccountID = account.ID

	if req.Art != nil {
		deck.Art = *req.Art
	}

	deck.DeckType = proto.DeckType_CUSTOM

	// TODO: later, lets verify a user owns the card before adding to a deck
	// or we can flag it and let them make wish-list decks too..

	// Persist Deck + card list in deck_cards table
	err = repo.Save(deck)
	if err != nil {
		return nil, proto.WrapFailf(err, "failed to create deck")
	}

	return deck.Deck, nil

}

// UpdateDeck for a user by the deck string supplied..
func (s *Server) UpdateDeck(ctx context.Context, req *proto.UpdateDeckRequest) (*proto.Deck, error) {
	logger := rctx.Logger(ctx)
	repo := rctx.DBContext(ctx)

	account, ok := rctx.CurrentAccount(ctx)
	if !ok {
		return nil, proto.ErrorInvalidArgument("session", "missing account")
	}

	deck, err := s.DeckUpdater.Update(repo, account.ID, req)
	if err != nil {
		logger.Err(err).Msg("update deck")

		return nil, proto.WrapFailf(err, "deck update failed")
	}

	return deck.Deck, nil
}

func (s *Server) GetDeck(ctx context.Context, req *proto.DeckRequest) (*proto.Deck, error) {
	account, ok := rctx.CurrentAccount(ctx)
	if !ok {
		return nil, proto.ErrorInvalidArgument("session", "missing account")
	}
	repo := rctx.DBContext(ctx)

	cond := db.Cond{
		"account_id": account.ID,
	}

	filters := db.And(cond)
	if req.UUID != nil && *req.UUID != "" {
		filters = filters.And(db.Cond{"uuid": req.UUID})
	}
	if req.DeckString != nil && *req.DeckString != "" {
		filters = filters.And(db.Cond{"deck_string": req.DeckString})
	}

	var deck *proto.Deck
	err := repo.Decks().Find(filters).Limit(1).One(&deck)
	if err != nil && err != db.ErrNoMoreRows {
		return nil, err
	}
	if deck == nil {
		return nil, err
	}

	removeInvalidCards(deck)

	return deck, nil
}

func (s *Server) DeleteDeck(ctx context.Context, req *proto.DeckRequest) (bool, error) {
	account, ok := rctx.CurrentAccount(ctx)
	if !ok {
		return false, proto.ErrorInvalidArgument("session", "missing account")
	}
	repo := rctx.DBContext(ctx)

	// User must pass at least either UUID or DeckString param, otherwise it will remove
	// all of their decks.
	if (req.UUID == nil || *req.UUID == "") && (req.DeckString == nil || *req.DeckString == "") {
		return false, proto.Errorf(proto.ErrInvalidArgument, "must provide either uuid or deck_string")
	}

	cond := db.Cond{
		"account_id": account.ID,
		"deck_type":  db.NotEq(proto.DeckType_LOCKED_STARTER),
	}

	filters := db.And(cond)
	if req.UUID != nil && *req.UUID != "" {
		filters = filters.And(db.Cond{"uuid": req.UUID})
	}
	if req.DeckString != nil && *req.DeckString != "" {
		filters = filters.And(db.Cond{"deck_string": req.DeckString})
	}

	err := repo.Decks().Find(filters).Delete()
	if err != nil {
		if err == db.ErrNoMoreRows {
			return false, proto.ErrorNotFound("failed to retrieve deck")
		}
		return false, err
	}

	return true, nil
}

func (s *Server) CheckDeck(ctx context.Context, req *proto.CheckDeckRequest) (*proto.CheckDeckResponse, error) {
	repo := rctx.DBContext(ctx)

	var accountID proto.AccountID

	if req.AccountAddress == nil {
		account, ok := rctx.CurrentAccount(ctx)
		if !ok {
			return nil, proto.ErrorInvalidArgument("session", "missing account")
		}

		accountID = account.ID
	} else {
		account, err := data.DB.Accounts(repo).FindByAddress(*req.AccountAddress)
		if err != nil {
			return nil, proto.ErrorInvalidArgument("account address", "wrong account")
		}

		accountID = account.ID
	}

	cond := db.Cond{
		"account_id": accountID,
		"deck_type":  db.NotEq(proto.DeckType_LOCKED_STARTER),
	}

	filters := db.And(cond)
	if req.UUID != nil && *req.UUID != "" {
		filters = filters.And(db.Cond{"uuid": req.UUID})
	}
	if req.DeckString != nil && *req.DeckString != "" {
		filters = filters.And(db.Cond{"deck_string": req.DeckString})
	}

	var deck *data.Deck
	err := repo.Decks().Find(filters).Limit(1).One(&deck)
	if err != nil && err != db.ErrNoMoreRows {
		return nil, proto.WrapFailf(err, "query failed")
	}
	if deck == nil {
		if req.DeckString == nil || *req.DeckString == "" {
			return &proto.CheckDeckResponse{
				ContainsInvalid:     false,
				AccountOwnsAllCards: true,
			}, nil
		}
		deck, err = data.DeckFromDeckString(*req.DeckString)
		if err != nil {
			return nil, proto.WrapFailf(err, "invalid deck string")
		}
		deck.Name = "Partial deck"
		deck.AccountID = accountID
	}

	hadInvalid := deck.ForceValidClass()

	// if req.ContractQuery {
	// 	err := s.getCardsFromChain(accountAddress.String())
	// 	if err != nil {
	// 		return nil, err
	// 	}
	// }

	var cardsOwned []*proto.Item
	if len(deck.CardIDs) > 0 {
		err = repo.SQL().
			Select("token_id").
			From("items").
			Where(db.Cond{
				"account_id": accountID,
				"token_id":   db.AnyOf(deck.CardIDs),
				"item_type":  db.AnyOf([]proto.ItemType{proto.ItemType_SW_BASE_CARDS, proto.ItemType_SW_SILVER_CARDS, proto.ItemType_SW_GOLD_CARDS}),
			}).
			GroupBy("token_id").
			Amend(func(s string) string {
				return fmt.Sprintf("%s HAVING SUM(balance) > 0", s)
			}).All(&cardsOwned)

		if err != nil {
			return nil, proto.WrapFailf(err, "query failed")
		}

		if err := deck.Validate(); err != nil {
			return nil, proto.WrapFailf(err, "deck validation failed")
		}
	}

	isClassUnlocked, err := data.IsDeckClassUnlocked(repo, accountID, deck.Class)
	if err != nil {
		return nil, proto.WrapFailf(err, "deck class lock check failed")
	}

	return &proto.CheckDeckResponse{
		ContainsInvalid:     hadInvalid,
		AccountOwnsAllCards: len(deck.CardIDs) == len(cardsOwned),
		UnlockedClass:       isClassUnlocked,
	}, nil
}

func (s *Server) MarkDeckNotNew(ctx context.Context, uuid string) (bool, error) {
	account, ok := rctx.CurrentAccount(ctx)
	if !ok {
		return false, proto.ErrorInvalidArgument("session", "missing account")
	}
	repo := rctx.DBContext(ctx)

	deck, err := repo.Decks().FindOne(db.Cond{
		"account_id": account.ID,
		"uuid":       uuid,
	})

	if err == db.ErrNoMoreRows {
		return false, proto.ErrorNotFound("deck not found")
	}

	if err != nil {
		return false, proto.ErrorInternal("failed fetching deck")
	}

	if deck.DeckType == proto.DeckType_LOCKED_STARTER {
		return false, proto.Errorf(proto.ErrFailedPrecondition, "deck not unlocked")
	}

	deck.IsNew = false

	err = repo.Save(deck)
	if err != nil {
		return false, err
	}

	return true, nil
}

func (s *Server) ListUnlockedDeckClasses(ctx context.Context) ([]*proto.DeckClass, error) {
	logger := rctx.Logger(ctx)
	repo := rctx.DBContext(ctx)

	accountID, err := s.validateAccountAndGetAddress(ctx, nil)
	if err != nil {
		return nil, err
	}

	items, err := repo.Items().FindAccountItems(accountID, proto.ItemType_SW_HERO)
	if err != nil && !errors.Is(err, db.ErrNoMoreRows) {
		logger.Err(err).Msg("find heroes")
		return nil, proto.ErrorInternal("find heroes")
	}

	// Ada needs to be added manually as it happens it is not added into items.
	strDeckClass := data.HeroDeckClass(proto.Hero_ADA)
	deckClasses := []*proto.DeckClass{
		&strDeckClass,
	}

	for _, item := range items {
		if proto.Hero_ADA == proto.Hero(item.TokenID) {
			continue
		}

		deckClass := data.HeroDeckClass(proto.Hero(item.TokenID))
		deckClasses = append(deckClasses, &deckClass)
	}

	return deckClasses, err
}

func (s *Server) GMResetStarterDecks(ctx context.Context, address string) (bool, error) {
	logger := rctx.Logger(ctx)
	repo := rctx.DBContext(ctx)

	accountID, err := s.validateAccountAndGetAddress(ctx, &address)
	if err != nil {
		return false, err
	}

	if err := data.CreateStarterDecks(repo, accountID); err != nil {
		logger.Err(err).Msg("reset starter decks")
		return false, proto.ErrorInternal("reset starter decks")
	}

	items, err := data.DB.Items(repo).FindAccountItems(accountID, proto.ItemType_SW_HERO)
	if err != nil {
		logger.Err(err).Msg("find heroes")
		return false, proto.ErrorInternal("find heroes")
	}

	unlockedHeroes := map[proto.DeckClass]struct{}{}

	for _, item := range items {
		unlockedHeroes[data.HeroDeckClass(proto.Hero(item.TokenID))] = struct{}{}
	}

	decks := data.GetStarterDecks()

	for _, deck := range decks {
		if deck.DeckType == proto.DeckType_UNLOCKED_STARTER {
			continue
		}

		if _, ok := unlockedHeroes[deck.Class]; ok {
			_, _, err := data.UnlockStarterDeckByDeckClass(repo, accountID, deck.Class)
			if err != nil {
				logger.Err(err).Msgf("unlock starter deck %s", deck.Class)
				return false, proto.ErrorInternal("unlock starter deck")
			}
		}
	}

	return true, nil
}

// ConquestV2PointsCalculator calculates points for a conquest match.
//
//go:generate go run go.uber.org/mock/mockgen -destination ./mock/conquest_v2_points_calculator.go -package mock . ConquestV2PointsCalculator
type ConquestV2PointsCalculator interface {
	FromDeckString(context.Context, proto.AccountID, string) (uint64, error)
}

type DeckUpdater interface {
	Update(db.Session, proto.AccountID, *proto.UpdateDeckRequest) (*data.Deck, error)
}
