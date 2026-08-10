package custommatchmaker

import (
	"context"
	"errors"
	"fmt"

	mmerrors "github.com/horizon-games/OpenSky/matchmaker/lib/errors"
	"github.com/horizon-games/OpenSky/matchmaker/lib/playerchannel"
)

type DeclineMatchChannelCloser struct {
	decliner Decliner
}

func NewDeclineMatchChannelCloser(decliner Decliner) *DeclineMatchChannelCloser {
	return &DeclineMatchChannelCloser{
		decliner: decliner,
	}
}

func (c *DeclineMatchChannelCloser) Close(channel *playerchannel.PlayerChannel) error {
	if channel.Player() != nil {
		if err := c.decliner.DeclineMatch(context.Background(), channel.Player().Address()); err != nil {
			if errors.Is(err, mmerrors.ErrMissingPlayer) {
				return nil
			}

			return fmt.Errorf("decline match: %w", err)
		}
	}

	return nil
}
