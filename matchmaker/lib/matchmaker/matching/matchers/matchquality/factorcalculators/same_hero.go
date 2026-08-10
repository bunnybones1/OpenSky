package factorcalculators

import (
	"github.com/horizon-games/OpenSky/api/proto"
	"github.com/horizon-games/OpenSky/matchmaker/lib/mappings"
	"github.com/horizon-games/OpenSky/matchmaker/lib/matchmaker/matching/matchers/matchquality"
	"github.com/horizon-games/OpenSky/matchmaker/lib/player"
)

type SameHeroCalculator struct {
}

func NewSameHeroCalculator() *SameHeroCalculator {
	return &SameHeroCalculator{}
}

// Calculate 1 if players are using the same hero. 0 otherwise.
func (c *SameHeroCalculator) Calculate(p1, p2 *player.Player) matchquality.Factor {
	p1Hero := c.prismsToHero(p1.PrivateSeed.Prisms)
	p2Hero := c.prismsToHero(p2.PrivateSeed.Prisms)

	if p1Hero == p2Hero {
		return c.newFactor(1)
	}

	return c.newFactor(0)
}

func (c *SameHeroCalculator) prismsToHero(prisms []player.Prism) proto.Hero {
	return mappings.DeckClassHero(player.PrismsToDeckClass(prisms))
}

func (c *SameHeroCalculator) newFactor(value float64) matchquality.Factor {
	return matchquality.NewFactor("Mirror Match", 5, 1, value)
}
