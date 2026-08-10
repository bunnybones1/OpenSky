package opensky

import (
	"context"

	"github.com/horizon-games/OpenSky/api/proto"
	"github.com/horizon-games/OpenSky/matchmaker/lib/player"
	"github.com/horizon-games/OpenSky/matchmaker/matchmakertest/playergen"
)

func (a *API) generateGetAccountWithItems(ctx context.Context, address proto.Hash, prisms []player.Prism) (*player.AccountWithItems, error) {
	p := playergen.MustNew(
		playergen.WithRandomPrisms(),
		playergen.WithRandomCards(50),
	)

	return p.Account, nil
}
