package gameservers

import "github.com/horizon-games/OpenSky/matchmaker/lib/player"

type MatchRequest struct {
	MatchID  uint64
	ReplayID string
	Players  []*player.Player
	Season   uint16
}
