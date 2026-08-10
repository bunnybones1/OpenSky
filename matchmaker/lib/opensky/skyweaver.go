package opensky

import (
	"context"
	"encoding/json"
	"fmt"
	"math/rand"
	"time"

	"github.com/rs/zerolog"

	"github.com/horizon-games/OpenSky/api/lib/deckstring"
	"github.com/horizon-games/OpenSky/api/proto"
	"github.com/horizon-games/OpenSky/matchmaker/config"
	"github.com/horizon-games/OpenSky/matchmaker/lib/player"
)

const (
	ItemType_SW_SILVER_CARDS = "SW_SILVER_CARDS"
	ItemType_SW_GOLD_CARDS   = "SW_GOLD_CARDS"
)

type API struct {
	log    zerolog.Logger
	config *config.Config

	swAPIClient proto.SkyWeaverAPI
}

func NewAPI(cfg *config.Config, logger zerolog.Logger, client proto.SkyWeaverAPI) *API {
	return &API{
		log:         logger.With().Str("module", "OpenSky").Logger(),
		swAPIClient: client,
		config:      cfg,
	}
}

func (a *API) MatchStart(ctx context.Context, player1 *player.Player, player2 *player.Player) (uint64, string, error) {
	matchID, replayID, err := a.swAPIClient.InternalMatchStart(a.authContext(ctx), &proto.MatchStartRequest{
		Player1: playerToProto(player1),
		Player2: playerToProto(player2),
		Info: &proto.MatchStartInfo{
			Player1GameMode:    &player1.Mode,
			Player2GameMode:    &player2.Mode,
			Player1RequestedAt: *player1.SessionStartTime,
			Player2RequestedAt: *player2.SessionStartTime,
			MatchedAt:          time.Now(),
		},
	})
	if err != nil {
		return 0, "", err
	}
	return matchID, replayID, nil
}

func (a *API) GetAccountWithItems(ctx context.Context, address proto.Hash, deckString string, prisms []player.Prism) (*player.AccountWithItems, error) {
	if a.config.Testing.GenerateUserAccounts {
		a.log.Debug().Msg("using generated account")
		return a.generateGetAccountWithItems(ctx, address, prisms)
	}

	account, err := a.swAPIClient.InternalGetAccount(a.authContext(ctx), address.String())
	if err != nil {
		return nil, err
	}

	accountWithItems := player.NewAccountWithItems(account)
	accountWithItems.Prisms = prisms

	cards, err := a.getUserCards(a.authContext(ctx), address)
	if err != nil {
		return nil, err
	}

	for _, card := range cards {
		baseCardType := player.Rarity_BASE
		if silverCards, ok := card.BalanceByType[ItemType_SW_SILVER_CARDS]; ok && silverCards.Balance.Uint64() > 0 {
			baseCardType = player.Rarity_SILVER
		}
		if goldCards, ok := card.BalanceByType[ItemType_SW_GOLD_CARDS]; ok && goldCards.Balance.Uint64() > 0 {
			baseCardType = player.Rarity_GOLD
		}
		cardID := card.Card.ID
		accountWithItems.Cards[cardID] = baseCardType
	}

	deckEquipment, err := a.getUserDeckEquipment(a.authContext(ctx), address, deckString)
	if err != nil {
		return nil, fmt.Errorf("get user deck equipment: %w", err)
	}

	accountWithItems.DeckEquipment = deckEquipment

	deckEquipmentBytes, err := json.Marshal(deckEquipment)
	if err != nil {
		return nil, fmt.Errorf("encode deck equipment: %w", err)
	}

	a.log.Debug().
		Stringer("accountAddress", address).
		Str("deckString", deckString).
		RawJSON("deckEquipment", deckEquipmentBytes).
		Msgf("deck equipment")

	return accountWithItems, nil
}

func (a *API) GetConquestInfo(ctx context.Context, address proto.Hash) (*proto.Conquest, error) {
	conquest, err := a.swAPIClient.InternalConquestStatus(a.authContext(ctx), address.String())
	if err != nil {
		return nil, err
	}

	return conquest, nil
}

func (a *API) GetBotPlayer(ctx context.Context, p *player.Player) (*player.AccountWithItems, error) {
	logger := a.log.With().
		Str("fn", "getBotPlayer").
		Stringer("opponent.mode", p.Mode).
		Int32("opponent.score", p.Score()).
		Logger()

	opponentRank := p.Rank()

	candidates, err := a.swAPIClient.InternalGetBotAccounts(a.authContext(ctx), &proto.InternalGetBotAccountsRequest{
		OpponentRank:  &opponentRank,
		OpponentScore: p.Score(),
		GameMode:      &p.Mode,
	})
	if err != nil {
		return nil, fmt.Errorf("InternalGetBotAccounts: %v", err)
	}

	if len(candidates) < 1 {
		return nil, fmt.Errorf("no candidates for player with rank %v in game mode %v", p.Rank(), p.Mode)
	}

	// first candidate is the most compatible one
	candidate := candidates[0]

	// TODO: maybe we can pick one at random because this could make players
	// match the same bot over and over again
	unlockedDecks, err := a.swAPIClient.InternalListUnlockedDeckStrings(a.authContext(ctx), &proto.InternalListUnlockedDeckStringsRequest{
		AccountAddress: p.Address(),
	})
	if err != nil {
		return nil, fmt.Errorf("InternalListUnlockedDeckStringsRequest: %v", err)
	}
	if len(unlockedDecks) < 1 {
		return nil, fmt.Errorf("no unlocked decks found for player with rank %v in game mode %v", p.Rank(), p.Mode)
	}

	logger.Debug().Msgf("unlocked decks: %#v", unlockedDecks)

	// pick deck depending on specific game mode
	var cardIDs []uint64
	var prisms []player.Prism

	chosenDeck := unlockedDecks[rand.Intn(len(unlockedDecks))]

	chosenDeckCards, chosenDeckCardClass, _, err := deckstring.Decode(chosenDeck)
	if err != nil {
		return nil, fmt.Errorf("Decode: %v", err)
	}

	logger.Debug().Msgf("chosen deck: %v", chosenDeckCards)
	logger.Debug().Msgf("chosen card class: %v", chosenDeckCardClass)

	prisms = []player.Prism{
		player.Prism(proto.CardClass_value[chosenDeckCardClass]),
	}

	logger.Debug().Msgf("chosen prism: %#v", prisms[0])

	switch p.Mode {
	case proto.GameMode_PRACTICE_PVP,
		proto.GameMode_RANKED_CONSTRUCTED:
		cardIDs = chosenDeckCards
	case proto.GameMode_RANKED_DISCOVERY:
		chosenDeck, err = deckstring.Encode(nil, chosenDeckCardClass) // empty deck string
		if err != nil {
			return nil, fmt.Errorf("deckstring.Encode: %w", err)
		}
	default:
		return nil, fmt.Errorf("unsupported game mode: %v", p.Mode)
	}

	account, err := a.swAPIClient.InternalGetAccount(a.authContext(ctx), candidate.Address.String())
	if err != nil {
		return nil, err
	}

	accountWithItems := player.NewAccountWithItems(account)

	accountWithItems.DeckString = chosenDeck

	accountWithItems.Prisms = prisms
	accountWithItems.DeckClass = player.PrismsToDeckClass(prisms)

	for _, cardID := range cardIDs {
		accountWithItems.Cards[cardID] = player.Rarity_BASE
	}

	return accountWithItems, nil
}

func (a *API) CheckDeck(ctx context.Context, address proto.Hash, deckString string) (bool, error) {
	if a.config.Testing.AuthenticationBypassEnabled {
		a.log.Debug().Msg("deck validation bypassed by config settings")
		return true, nil
	}

	logger := a.log.With().
		Stringer("address", address).
		Logger()

	req := proto.CheckDeckRequest{
		AccountAddress: &address,
		DeckString:     &deckString,
		ContractQuery:  a.config.MatchMaker.DirectBalanceFetch,
	}

	checkDeckRes, err := a.swAPIClient.CheckDeck(a.authContext(ctx), &req)
	if err != nil {
		logger.Warn().Err(err).Msg("API failed to validate deck")
		return false, err
	}
	if checkDeckRes.ContainsInvalid {
		logger.Debug().Msg("deck contains invalid cards")
		return false, nil
	}
	if !checkDeckRes.AccountOwnsAllCards {
		logger.Debug().Msg("account doesn't own all cards")
		return false, nil
	}
	return true, nil
}

func (a *API) GetGameModesStatus(ctx context.Context) (*proto.GameModesStatus, error) {
	return a.swAPIClient.GetGameModesStatus(a.authContext(ctx))
}

func (a *API) GetCurrentSeason(ctx context.Context) (uint16, error) {
	return a.swAPIClient.GetCurrentSeason(a.authContext(ctx))
}

func (a *API) ListQuests(ctx context.Context, address proto.Hash) ([]*proto.Quest, error) {
	addressString := address.String()

	quests, _, err := a.swAPIClient.ListQuests(a.authContext(ctx), &addressString)
	if err != nil {
		return nil, fmt.Errorf("list quests: %w", err)
	}

	return quests, nil
}

func (a *API) authContext(ctx context.Context) context.Context {
	return AuthHeaderContext(a.config.SkyWeaverAPI.AuthToken, ctx)
}

func (a *API) getUserDeckEquipment(ctx context.Context, address proto.Hash, deckString string) (*proto.DeckEquipment, error) {
	addressString := address.String()

	deckEquipment, err := a.swAPIClient.GetDeckEquipmentByDeckString(ctx, &addressString, deckString)
	if err != nil {
		return nil, fmt.Errorf("request deck equipment: %w", err)
	}

	return deckEquipment, nil
}

func (a *API) getUserCards(ctx context.Context, address proto.Hash) ([]*proto.CardWithBalance, error) {
	logger := a.log.With().
		Str("fn", "getUserCards").
		Logger()

	ownedCards := true

	req := proto.SearchCardsRequest{
		Criteria: &proto.CardSearchCriteria{
			OwnedCards:     &ownedCards,
			AccountAddress: &address,
		},
		IncludeUserBalances: true,
		ContractQuery:       a.config.MatchMaker.DirectBalanceFetch,
	}

	var before string

	pageSize := uint32(200)

	cardsWithBalance := []*proto.CardWithBalance{}
	for {
		pageRes, pageCardsWithBalance, err := a.swAPIClient.SearchCards(ctx, &proto.Page{
			PageSize: &pageSize,
			Before:   &before,
		}, &req)
		if err != nil {
			return nil, err
		}
		logger.Debug().Msgf("fetching cards +%v...", len(pageCardsWithBalance))
		cardsWithBalance = append(cardsWithBalance, pageCardsWithBalance...)
		if pageRes.HasBefore == nil || !*pageRes.HasBefore {
			break // no more items left
		}
		before = *pageRes.After
	}

	logger.Debug().Msgf("finishing fetching cards (%v total)", len(cardsWithBalance))
	return cardsWithBalance, nil
}

func playerToProto(p *player.Player) *proto.MatchPlayer {
	if p.Account == nil {
		panic("ranked: account argument cannot be nil")
	}

	playerSessionId := p.PlayerSessionID.String()

	return &proto.MatchPlayer{
		Address:         p.Account.Address,
		Name:            p.Account.Name,
		DeckClass:       &p.DeckClass,
		DeckString:      *p.DeckString,
		InitDeckString:  *p.DeckString,
		PlayerSessionId: &playerSessionId,
	}
}
