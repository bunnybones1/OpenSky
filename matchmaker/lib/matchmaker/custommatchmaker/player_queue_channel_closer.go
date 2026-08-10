package custommatchmaker

import (
	"github.com/rs/zerolog"

	"github.com/horizon-games/OpenSky/matchmaker/lib/playerchannel"
)

type PlayerQueueChannelCloser struct {
	logger      zerolog.Logger
	playerQueue PlayerQueue
}

func NewPlayerQueueChannelCloser(logger zerolog.Logger, playerQueue PlayerQueue) *PlayerQueueChannelCloser {
	return &PlayerQueueChannelCloser{
		logger:      logger.With().Str("fn", "custommatchmaker.PlayerQueueChannelCloser").Logger(),
		playerQueue: playerQueue,
	}
}

func (c *PlayerQueueChannelCloser) Close(channel *playerchannel.PlayerChannel) error {
	if channel.Player() != nil {
		if err := c.playerQueue.Remove(channel.Player()); err != nil {
			c.logger.Err(err).Msg("remove player from queue")
		}
	}

	return nil
}
