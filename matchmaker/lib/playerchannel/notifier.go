package playerchannel

import (
	"context"
	"fmt"

	"github.com/horizon-games/OpenSky/matchmaker/lib/events"
	"github.com/horizon-games/OpenSky/matchmaker/lib/player"
)

type Notifier struct {
	pubsub events.PubSub
}

func NewNotifier(s events.PubSub) *Notifier {
	return &Notifier{
		pubsub: s,
	}
}

func (n *Notifier) Message(ctx context.Context, message events.Event, players ...*player.Player) error {
	var anyErr error
	for _, p := range players {
		channelID := playerToChannelID(p)

		if err := n.pubsub.Publish(ctx, channelID, message); err != nil {
			// we'll record the error but will try to continue anyways.
			anyErr = err
		}
	}

	return anyErr
}

func (n *Notifier) NumberOfSubscribers(p *player.Player) (int, error) {
	channelID := playerToChannelID(p)

	number, err := n.pubsub.NumSubscribers(channelID)
	if err != nil {
		return 0, fmt.Errorf("retrieve number of subscriptions: %w", err)
	}

	return number, nil
}
