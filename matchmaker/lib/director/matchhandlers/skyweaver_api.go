package matchhandlers

import (
	"context"

	"github.com/horizon-games/OpenSky/matchmaker/lib/player"
)

//go:generate go run go.uber.org/mock/mockgen -destination ./mock/opensky_api.go -package mock . SkyWeaverAPI
type SkyWeaverAPI interface {
	GetCurrentSeason(context.Context) (uint16, error)
	MatchStart(context.Context, *player.Player, *player.Player) (matchID uint64, replayID string, err error)
}
