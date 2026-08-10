package matchmaker

import (
	"context"

	"github.com/horizon-games/OpenSky/api/proto"
	"github.com/horizon-games/OpenSky/matchmaker/lib/player"
	"github.com/horizon-games/OpenSky/matchmaker/lib/playerchannel"
)

type FrontendService interface {
	FindMatch(context.Context, *player.Player) (*playerchannel.PlayerChannel, error)
	AcceptMatch(context.Context, proto.Hash) error
	DeclineMatch(context.Context, proto.Hash) error
}
