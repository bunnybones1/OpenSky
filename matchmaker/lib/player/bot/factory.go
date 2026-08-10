package bot

import (
	"context"
	"fmt"

	"github.com/rs/zerolog"

	"github.com/horizon-games/OpenSky/api/proto"
	"github.com/horizon-games/OpenSky/matchmaker/lib/opensky"
	"github.com/horizon-games/OpenSky/matchmaker/lib/player"
	"github.com/horizon-games/OpenSky/matchmaker/lib/playerchannel"
)

type Factory struct {
	logger         zerolog.Logger
	openskyAPI     *opensky.API
	channelFactory ChannelFactory
	autoAccepter   AutoAccepter

	ctx context.Context
}

func NewFactory(
	logger zerolog.Logger,
	openskyAPI *opensky.API,
	channelFactory ChannelFactory,
	autoAccepter AutoAccepter,
) *Factory {
	return &Factory{
		logger:         logger.With().Str("fn", "bot.Factory").Logger(),
		openskyAPI:     openskyAPI,
		channelFactory: channelFactory,
		autoAccepter:   autoAccepter,
	}
}

func (f *Factory) Run(ctx context.Context) error {
	f.ctx = ctx

	return nil
}

func (f *Factory) CreateUnregistered(p *player.Player) (*player.Player, error) {
	difficulty := Difficulty(p)

	b, err := New(p.Mode, p.Account.Level, difficulty)
	if err != nil {
		return nil, fmt.Errorf("create bot player: %w", err)
	}

	b.ClientVersionHash = p.ClientVersionHash
	b.InitTimestamp = p.InitTimestamp

	return b, nil
}

func (f *Factory) CreateRegistered(p *player.Player) (*player.Player, error) {
	b, err := f.CreateUnregistered(p)
	if err != nil {
		return nil, fmt.Errorf("create unregistered bot: %w", err)
	}

	account, err := f.openskyAPI.GetBotPlayer(f.ctx, p)
	if err != nil {
		return nil, fmt.Errorf("get bot player: %w", err)
	}

	b.Account = account
	b.DeckString = &account.DeckString
	b.DeckClass = account.DeckClass

	b.PrivateSeed.Prisms = account.Prisms
	b.PrivateSeed.Cards = player.Cards{}
	for cardID := range account.Cards {
		b.PrivateSeed.Cards = append(b.PrivateSeed.Cards, cardID)
	}
	b.PrivateSeed.CardRarities = account.Cards
	b.PrivateSeed.HeroAbility = nil

	channel, err := f.channelFactory.Create(f.ctx, b)
	if err != nil {
		return nil, fmt.Errorf("create channel: %w", err)
	}

	go func() {
		if err := f.autoAccepter.ListenAndAutoAccept(channel); err != nil {
			f.logger.Err(err).Msg("listen and auto-accept")
		}
	}()

	return b, nil
}

func (f *Factory) CreateSimple(mode proto.GameMode) *player.Player {
	return player.NewBotPlayer(mode)
}

type ChannelFactory interface {
	Create(context.Context, *player.Player) (*playerchannel.PlayerChannel, error)
}

type AutoAccepter interface {
	ListenAndAutoAccept(*playerchannel.PlayerChannel) error
}
