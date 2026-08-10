package gamemodecriterias

import (
	"math"

	"github.com/horizon-games/OpenSky/matchmaker/lib/player"
)

type RankedCriteria struct {
	waitTimeScoreCalculator WaitTimeScoreCalculator
}

func NewRankedCriteria(waitTimeScoreCalculator WaitTimeScoreCalculator) *RankedCriteria {
	return &RankedCriteria{
		waitTimeScoreCalculator: waitTimeScoreCalculator,
	}
}

func (c *RankedCriteria) IsAllowed(p1, p2 *player.Player) bool {
	if !p1.IsRankedMatch() && !p2.IsRankedMatch() {
		return false
	}

	if p1.Mode != p2.Mode {
		return false
	}

	if !c.isAllowedScoreDistance(p1, p2) {
		return false
	}

	return true
}

func (c *RankedCriteria) isAllowedScoreDistance(p1, p2 *player.Player) bool {
	distance := math.Abs(float64(p1.Score() - p2.Score()))

	allowedDistance := math.Min(
		float64(c.waitTimeScoreCalculator.Calculate(p1)),
		float64(c.waitTimeScoreCalculator.Calculate(p2)),
	)

	return distance <= allowedDistance
}
