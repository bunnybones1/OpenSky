package factorcalculators

import (
	"math"

	"github.com/horizon-games/OpenSky/matchmaker/lib/matchmaker/matching/matchers/matchquality"
	"github.com/horizon-games/OpenSky/matchmaker/lib/player"
)

type MMRDifferenceCalculator struct {
}

func NewMMRDifferenceCalculator() *MMRDifferenceCalculator {
	return &MMRDifferenceCalculator{}
}

func (c *MMRDifferenceCalculator) Calculate(p1, p2 *player.Player) matchquality.Factor {
	return c.newFactor(math.Abs(float64(p1.Score()) - float64(p2.Score())))
}

func (c *MMRDifferenceCalculator) newFactor(value float64) matchquality.Factor {
	return matchquality.NewFactor("MMR Difference", 0.05, 5, value)
}
