package gamemodecriterias

import (
	"time"

	"github.com/horizon-games/OpenSky/api/proto"
	"github.com/horizon-games/OpenSky/matchmaker/config"
	"github.com/horizon-games/OpenSky/matchmaker/lib/player"
)

//go:generate go run go.uber.org/mock/mockgen -destination ./mock/wait_time_score_calculator.go -package mock . WaitTimeScoreCalculator
type WaitTimeScoreCalculator interface {
	Calculate(*player.Player) int
}

type waitTimeScoreCalculator struct {
	relaxMatchingRuleInterval config.MatchMakerRelaxMatchingRuleIntervalConfig
	rules                     []int
}

func NewWaitTimeScoreCalculator(cfg *config.Config, rules []int) *waitTimeScoreCalculator {
	return &waitTimeScoreCalculator{
		relaxMatchingRuleInterval: cfg.MatchMaker.RelaxMatchingRuleInterval,
		rules:                     rules,
	}
}

func (c *waitTimeScoreCalculator) Calculate(p *player.Player) int {
	wait := p.WaitTime()

	intervalFn := c.getRelaxMatchingRuleIntervalFn(p.Mode)

	i := 0

	for ; i < len(c.rules)-1; i++ {
		if c.waitTimeInRange(wait, intervalFn(i), intervalFn(i+1)) {
			return c.rules[i]
		}
	}

	return c.rules[i]
}

func (c *waitTimeScoreCalculator) getRelaxMatchingRuleIntervalFn(mode proto.GameMode) func(int) time.Duration {
	intervals := c.relaxMatchingRuleInterval

	var interval time.Duration

	switch mode {
	case proto.GameMode_CONQUEST_DISCOVERY:
		interval = intervals.Conquest.Discovery
	case proto.GameMode_CONQUEST_CONSTRUCTED:
		interval = intervals.Conquest.Constructed
	case proto.GameMode_RANKED_DISCOVERY:
		interval = intervals.Ranked.Discovery
	case proto.GameMode_RANKED_CONSTRUCTED:
		interval = intervals.Ranked.Constructed
	default:
		interval = intervals.Default
	}

	return func(stage int) time.Duration {
		return time.Duration(stage) * interval
	}
}

func (c *waitTimeScoreCalculator) waitTimeInRange(waitTime time.Duration, min time.Duration, max time.Duration) bool {
	return waitTime >= min && waitTime < max
}
