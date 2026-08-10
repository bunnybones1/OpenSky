package playerchannel

import (
	"fmt"

	"github.com/goware/pubsub"

	"github.com/horizon-games/OpenSky/matchmaker/lib/events"
	"github.com/horizon-games/OpenSky/matchmaker/lib/player"
)

// PlayerChannel is the player's subscription to the message bus which brokers
// messages between the matchmaker and the websocket server.
type PlayerChannel struct {
	pubsub.Subscription[events.Event]

	closed chan struct{}

	player  *player.Player
	onClose func(*PlayerChannel)
}

func New(s pubsub.Subscription[events.Event], p *player.Player) *PlayerChannel {
	return &PlayerChannel{
		Subscription: s,
		player:       p,
		closed:       make(chan struct{}),
	}
}

func (s *PlayerChannel) Player() *player.Player {
	return s.player
}

func (s *PlayerChannel) SetCloseHandler(fn func(*PlayerChannel)) {
	s.onClose = fn
}

func (s *PlayerChannel) Close() {
	select {
	case <-s.closed:
		return
	default:
	}

	close(s.closed)

	if s.Subscription != nil {
		s.Subscription.Unsubscribe()
	}

	if s.onClose != nil {
		s.onClose(s)
	}
}

func playerToChannelID(p *player.Player) string {
	return fmt.Sprintf("player_channel:%s", p.Address())
}
