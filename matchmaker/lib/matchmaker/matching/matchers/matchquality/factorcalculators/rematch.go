package factorcalculators

import (
	"github.com/rs/zerolog"

	"github.com/horizon-games/OpenSky/api/proto"
	"github.com/horizon-games/OpenSky/matchmaker/lib/matchmaker/matching/matchers/matchquality"
	"github.com/horizon-games/OpenSky/matchmaker/lib/player"
	"github.com/horizon-games/OpenSky/matchmaker/lib/playerstats"
)

type RematchCalculator struct {
	logger               zerolog.Logger
	playerStatsRetriever PlayerStatsRetriever
}

func NewRematchCalculator(
	logger zerolog.Logger,
	playerStatsRetriever PlayerStatsRetriever,
) *RematchCalculator {
	return &RematchCalculator{
		logger:               logger.With().Str("fn", "factorcalculators.RematchCalculator").Logger(),
		playerStatsRetriever: playerStatsRetriever,
	}
}

// Calculate 1 if players last match was against one another. 0 otherwise.
func (c *RematchCalculator) Calculate(p1, p2 *player.Player) matchquality.Factor {
	p1Stats, err := c.playerStatsRetriever.Retrieve(p1.Address())
	if err != nil {
		c.logger.Err(err).Msg("get player 1 stats")
		return c.newFactor(0)
	}

	p2Stats, err := c.playerStatsRetriever.Retrieve(p2.Address())
	if err != nil {
		c.logger.Err(err).Msg("get player 2 stats")
		return c.newFactor(0)
	}

	if p1Stats == nil || p2Stats == nil {
		return c.newFactor(0)
	}

	if len(p1Stats.Stats) > 0 && len(p2Stats.Stats) > 0 {
		p1LastMatch := p1Stats.Stats[len(p1Stats.Stats)-1]
		p2LastMatch := p2Stats.Stats[len(p2Stats.Stats)-1]

		if p1LastMatch.OpponentID == p2.Address() || p2LastMatch.OpponentID == p1.Address() {
			return c.newFactor(1)
		}
	}

	return c.newFactor(0)
}

func (c *RematchCalculator) newFactor(value float64) matchquality.Factor {
	return matchquality.NewFactor("Rematch", 40, 1, value)
}

//go:generate go run go.uber.org/mock/mockgen -destination ./mock/player_stats_retriever.go -package mock . PlayerStatsRetriever
type PlayerStatsRetriever interface {
	Retrieve(proto.Hash) (*playerstats.StatsSummary, error)
}
