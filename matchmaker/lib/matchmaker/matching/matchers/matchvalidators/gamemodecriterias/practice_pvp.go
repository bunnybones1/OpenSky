package gamemodecriterias

import (
	"math"

	"github.com/horizon-games/OpenSky/api/proto"
	"github.com/horizon-games/OpenSky/matchmaker/lib/player"
)

type PracticePVPCriteria struct {
	waitTimeScoreCalculator WaitTimeScoreCalculator
}

func NewPracticePVPCriteria(waitTimeScoreCalculator WaitTimeScoreCalculator) *PracticePVPCriteria {
	return &PracticePVPCriteria{
		waitTimeScoreCalculator: waitTimeScoreCalculator,
	}
}

func (c *PracticePVPCriteria) IsAllowed(p1, p2 *player.Player) bool {
	if !p1.IsPracticePVPMatch() && !p2.IsPracticePVPMatch() {
		return false
	}

	vsRanked := p1.Mode == proto.GameMode_RANKED_CONSTRUCTED || p2.Mode == proto.GameMode_RANKED_CONSTRUCTED
	if p1.Mode != p2.Mode && !vsRanked {
		return false
	}

	if p1.Mode == proto.GameMode_RANKED_CONSTRUCTED {
		if p1.Rank() >= proto.PlayerRank_EXPERT {
			return false
		}
	}

	if p2.Mode == proto.GameMode_RANKED_CONSTRUCTED {
		if p2.Rank() >= proto.PlayerRank_EXPERT {
			return false
		}
	}

	scoreDistance := math.Abs(float64(p1.Score() - p2.Score()))
	allowedWaitTimeScoreDistance := math.Min(
		float64(c.waitTimeScoreCalculator.Calculate(p1)),
		float64(c.waitTimeScoreCalculator.Calculate(p2)),
	)

	return scoreDistance <= allowedWaitTimeScoreDistance
}
