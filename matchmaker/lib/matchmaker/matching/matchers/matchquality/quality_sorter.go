package matchquality

import (
	"sort"

	"github.com/horizon-games/OpenSky/matchmaker/lib/player"
)

type qualitySorter struct {
	qualityCalculator QualityCalculator
}

func NewQualitySorter(qualityCalculator QualityCalculator) *qualitySorter {
	return &qualitySorter{
		qualityCalculator: qualityCalculator,
	}
}

// Sort the given candidates by quality (lower value first).
func (s *qualitySorter) Sort(p *player.Player, candidates []*player.Player) {
	sort.SliceStable(candidates, func(i, j int) bool {
		return s.qualityCalculator.Calculate(p, candidates[i]) < s.qualityCalculator.Calculate(p, candidates[j])
	})
}

//go:generate go run go.uber.org/mock/mockgen -destination ./mock/quality_calculator.go -package mock . QualityCalculator
type QualityCalculator interface {
	Calculate(*player.Player, *player.Player) float64
}
