package gamemodecriterias

import (
	"math"

	"github.com/horizon-games/OpenSky/matchmaker/config"
	"github.com/horizon-games/OpenSky/matchmaker/lib/player"
)

type ConquestCriteria struct {
	waitTimeWinsScoreCalculator WaitTimeScoreCalculator
	waitTimeEloScoreCalculator  WaitTimeScoreCalculator

	strictConquestMatching bool
}

func NewConquestCriteria(
	cfg *config.Config,
	waitTimeWinsScoreCalculator WaitTimeScoreCalculator,
	waitTimeEloScoreCalculator WaitTimeScoreCalculator,
) *ConquestCriteria {
	return &ConquestCriteria{
		waitTimeWinsScoreCalculator: waitTimeWinsScoreCalculator,
		waitTimeEloScoreCalculator:  waitTimeEloScoreCalculator,
		strictConquestMatching:      cfg.MatchMaker.StrictConquestMatching,
	}
}

func (c *ConquestCriteria) IsAllowed(p1, p2 *player.Player) bool {
	if !p1.IsConquestMatch() && !p2.IsConquestMatch() {
		return false
	}

	if p1.Mode != p2.Mode {
		return false
	}

	if !c.isAllowedWinDistance(p1, p2) {
		return false
	}

	if !c.isAllowedEloDistance(p1, p2) {
		return false
	}

	return true
}

func (c *ConquestCriteria) isAllowedWinDistance(p1, p2 *player.Player) bool {
	distance := math.Abs(float64(p1.CurrentConquestWins() - p2.CurrentConquestWins()))

	allowedDistance := float64(0)

	if !c.strictConquestMatching {
		allowedDistance = math.Min(
			float64(c.waitTimeWinsScoreCalculator.Calculate(p1)),
			float64(c.waitTimeWinsScoreCalculator.Calculate(p2)),
		)
	}

	if distance > allowedDistance {
		return false
	}

	return true
}

func (c *ConquestCriteria) isAllowedEloDistance(p1, p2 *player.Player) bool {
	// Anything equal to 0 or above is treated the same with respect to matchmaking (as if they had 0).
	p1Elo := p1.Score()
	if p1Elo > 0 {
		p1Elo = 0
	}

	// Anything equal to 0 or above is treated the same with respect to matchmaking (as if they had 0).
	p2Elo := p2.Score()
	if p2Elo > 0 {
		p2Elo = 0
	}

	distance := math.Abs(float64(p1Elo - p2Elo))

	allowedDistance := math.Max(
		float64(c.waitTimeEloScoreCalculator.Calculate(p1)),
		float64(c.waitTimeEloScoreCalculator.Calculate(p2)),
	)

	return distance <= allowedDistance
}
