package findmatch

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/rs/zerolog"

	"github.com/horizon-games/OpenSky/api/proto"
	"github.com/horizon-games/OpenSky/matchmaker/lib/messages"
	"github.com/horizon-games/OpenSky/matchmaker/lib/player"
)

//go:generate go run go.uber.org/mock/mockgen -destination ./mock/player_factory.go -package mock . PlayerFactory
type PlayerFactory interface {
	Create(context.Context, *messages.FindMatchMessage) (*player.Player, error)
}

type playerFactory struct {
	logger     zerolog.Logger
	openskyAPI SkyWeaverAPI
}

func NewPlayerFactory(logger zerolog.Logger, openskyAPI SkyWeaverAPI) *playerFactory {
	return &playerFactory{
		logger:     logger.With().Str("fn", "findmatch.playerFactory").Logger(),
		openskyAPI: openskyAPI,
	}
}

func (f *playerFactory) Create(ctx context.Context, msg *messages.FindMatchMessage) (*player.Player, error) {
	p, err := f.createPlayerFromMessage(msg)
	if err != nil {
		return nil, fmt.Errorf("create player: %w", err)
	}

	p.Account, err = f.openskyAPI.GetAccountWithItems(ctx, p.Address(), *p.DeckString, p.PrivateSeed.Prisms)
	if err != nil {
		return nil, fmt.Errorf("get account: %w", err)
	}

	if p.Account == nil {
		return nil, fmt.Errorf("account %q has not been found", p.PrivateSeed.Player.String())
	}

	p.Quests, err = f.openskyAPI.ListQuests(ctx, p.Address())
	if err != nil {
		p.Quests = []*proto.Quest{}

		f.logger.Err(err).Msg("list player quests")
	}

	if p.IsConquestMatch() {
		p.ConquestInfo, err = f.openskyAPI.GetConquestInfo(ctx, p.Address())
		if err != nil {
			return nil, fmt.Errorf("get conquest info: %w", err)
		}
	}

	if err := p.RemoveUnownedCardsFromDeck(); err != nil {
		return nil, fmt.Errorf("remove unowned cards from deck: %w", err)
	}

	return p, nil
}

func (f *playerFactory) createPlayerFromMessage(msg *messages.FindMatchMessage) (*player.Player, error) {
	p, err := player.New(&msg.PrivateSeed, msg.Mode)
	if err != nil {
		return nil, fmt.Errorf("create new player: %w", err)
	}

	p.SessionID = strings.ToUpper(msg.SessionID)
	p.ClientVersionHash = strings.ToLower(msg.VersionHash)
	p.PlayerSessionID = msg.PlayerSessionID

	sessionStartTime := time.Now()
	p.SessionStartTime = &sessionStartTime

	return p, nil
}

//go:generate go run go.uber.org/mock/mockgen -destination ./mock/opensky_api.go -package mock . SkyWeaverAPI
type SkyWeaverAPI interface {
	GetAccountWithItems(ctx context.Context, address proto.Hash, deckString string, prisms []player.Prism) (*player.AccountWithItems, error)
	GetConquestInfo(context.Context, proto.Hash) (*proto.Conquest, error)
	ListQuests(context.Context, proto.Hash) ([]*proto.Quest, error)
}
