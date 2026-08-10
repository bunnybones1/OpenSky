package matchquality

import (
	"github.com/horizon-games/OpenSky/matchmaker/lib/player"
)

type qualityCalculator struct {
	factorCalculators []FactorCalculator
}

func NewQualityCalculator(factorCalculators ...FactorCalculator) *qualityCalculator {
	return &qualityCalculator{
		factorCalculators: factorCalculators,
	}
}

func (c *qualityCalculator) Calculate(p1, p2 *player.Player) float64 {
	var factors []Factor

	for i := 0; i < len(c.factorCalculators); i++ {
		calculator := c.factorCalculators[i]

		factor := calculator.Calculate(p1, p2)

		factors = append(factors, factor)
	}

	quality := Quality(factors...)

	return quality
}

//go:generate go run go.uber.org/mock/mockgen -destination ./mock/factor_calculator.go -package mock . FactorCalculator
type FactorCalculator interface {
	Calculate(*player.Player, *player.Player) Factor
}
