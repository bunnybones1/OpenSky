package matchhandlers

import (
	"github.com/horizon-games/OpenSky/api/proto"
	"github.com/horizon-games/OpenSky/matchmaker/lib/mappings"
	"github.com/horizon-games/OpenSky/matchmaker/lib/player"
)

func prismsToHero(prisms []player.Prism) proto.Hero {
	return mappings.DeckClassHero(player.PrismsToDeckClass(prisms))
}
