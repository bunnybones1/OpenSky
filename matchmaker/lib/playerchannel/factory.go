package playerchannel

import (
	"context"
	"fmt"

	"github.com/rs/zerolog"

	mmerrors "github.com/horizon-games/OpenSky/matchmaker/lib/errors"
	"github.com/horizon-games/OpenSky/matchmaker/lib/events"
	"github.com/horizon-games/OpenSky/matchmaker/lib/player"
)

type Factory struct {
	logger         zerolog.Logger
	pubsub         events.PubSub
	channelClosers []ChannelCloser
}

func NewFactory(
	logger zerolog.Logger,
	pubsub events.PubSub,
	channelClosers ...ChannelCloser,
) *Factory {
	return &Factory{
		logger:         logger.With().Str("fn", "playerchannel.Factory").Logger(),
		pubsub:         pubsub,
		channelClosers: channelClosers,
	}
}

func (f *Factory) Create(ctx context.Context, p *player.Player) (*PlayerChannel, error) {
	channelID := playerToChannelID(p)

	subscriber, err := f.pubsub.Subscribe(ctx, channelID)
	if err != nil {
		return nil, fmt.Errorf("subscribe: %w", err)
	}

	channel := New(subscriber, p)

	channel.SetCloseHandler(func(channel *PlayerChannel) {
		if err := f.onClose(channel); err != nil {
			f.logger.Err(err).Msg("on close channel")
		}
	})

	return channel, nil
}

func (f *Factory) onClose(channel *PlayerChannel) error {
	if channel == nil {
		return mmerrors.ErrMissingChannel
	}

	channel.Close()

	nsubs, err := f.pubsub.NumSubscribers(channel.ChannelID())
	if err != nil {
		return fmt.Errorf("get number of subscribers: %w", err)
	}

	if nsubs > 0 {
		// we still have other subscribers after closing our subscription, it's not
		// safe to remove from the queue while we have other subscribers.
		return nil
	}

	for _, closer := range f.channelClosers {
		if err := closer.Close(channel); err != nil {
			return fmt.Errorf("close: %w", err)
		}
	}

	return nil
}

type ChannelCloser interface {
	Close(*PlayerChannel) error
}
