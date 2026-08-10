package custommatchmaker

import (
	"context"

	"github.com/horizon-games/OpenSky/matchmaker/lib/events"
	"github.com/horizon-games/OpenSky/matchmaker/lib/player"
)

//go:generate go run go.uber.org/mock/mockgen -destination ./mock/notifier.go -package mock . Notifier
type Notifier interface {
	Message(context.Context, events.Event, ...*player.Player) error
	NumberOfSubscribers(*player.Player) (int, error)
}
