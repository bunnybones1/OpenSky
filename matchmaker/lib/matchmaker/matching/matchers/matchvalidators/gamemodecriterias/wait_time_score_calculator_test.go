package gamemodecriterias_test

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"

	"github.com/horizon-games/OpenSky/api/proto"
	"github.com/horizon-games/OpenSky/matchmaker/config"
	"github.com/horizon-games/OpenSky/matchmaker/lib/matchmaker/matching/matchers/matchvalidators/gamemodecriterias"
	"github.com/horizon-games/OpenSky/matchmaker/matchmakertest/playergen"
)

func TestWaitTimeScoreCalculator(t *testing.T) {
	cfg := &config.Config{
		MatchMaker: config.MatchMakerConfig{
			RelaxMatchingRuleInterval: config.MatchMakerRelaxMatchingRuleIntervalConfig{
				Default: time.Second,
			},
		},
	}
	cfg.MatchMaker.RelaxMatchingRuleInterval.Ranked.Constructed = 11 * time.Second
	cfg.MatchMaker.RelaxMatchingRuleInterval.Ranked.Discovery = 12 * time.Second
	cfg.MatchMaker.RelaxMatchingRuleInterval.Conquest.Constructed = 21 * time.Second
	cfg.MatchMaker.RelaxMatchingRuleInterval.Conquest.Discovery = 22 * time.Second

	calculator := gamemodecriterias.NewWaitTimeScoreCalculator(cfg, []int{10, 20, 30})

	tests := []struct {
		name     string
		gameMode proto.GameMode
		waitTime time.Duration
		result   int
	}{
		{
			name:     "1st rule when wait time is zero",
			waitTime: 0,
			result:   10,
		},
		{
			name:     "1st rule when game mode is ranked constructed and wait time is lower than relax rule",
			gameMode: proto.GameMode_RANKED_CONSTRUCTED,
			waitTime: 10 * time.Second,
			result:   10,
		},
		{
			name:     "2nd rule when game mode is ranked constructed and wait time is equal to relax rule",
			gameMode: proto.GameMode_RANKED_CONSTRUCTED,
			waitTime: 11 * time.Second,
			result:   20,
		},
		{
			name:     "last rule when game mode is ranked constructed and wait time is equal or higher than multiplication of relax rule",
			gameMode: proto.GameMode_RANKED_CONSTRUCTED,
			waitTime: 22 * time.Second,
			result:   30,
		},
		{
			name:     "1st rule when game mode is ranked discovery and wait time is lower than relax rule",
			gameMode: proto.GameMode_RANKED_DISCOVERY,
			waitTime: 11 * time.Second,
			result:   10,
		},
		{
			name:     "2nd rule when game mode is ranked discovery and wait time is equal to relax rule",
			gameMode: proto.GameMode_RANKED_DISCOVERY,
			waitTime: 12 * time.Second,
			result:   20,
		},
		{
			name:     "last rule when game mode is ranked discovery and wait time is equal or higher than multiplication of relax rule",
			gameMode: proto.GameMode_RANKED_DISCOVERY,
			waitTime: 24 * time.Second,
			result:   30,
		},
		{
			name:     "1st rule when game mode is conquest constructed and wait time is lower than relax rule",
			gameMode: proto.GameMode_CONQUEST_CONSTRUCTED,
			waitTime: 20 * time.Second,
			result:   10,
		},
		{
			name:     "2nd rule when game mode is conquest constructed and wait time is equal to relax rule",
			gameMode: proto.GameMode_CONQUEST_CONSTRUCTED,
			waitTime: 21 * time.Second,
			result:   20,
		},
		{
			name:     "last rule when game mode is conquest constructed and wait time is equal or higher than multiplication of relax rule",
			gameMode: proto.GameMode_CONQUEST_CONSTRUCTED,
			waitTime: 42 * time.Second,
			result:   30,
		},
		{
			name:     "1st rule when game mode is conquest discovery and wait time is lower than relax rule",
			gameMode: proto.GameMode_CONQUEST_DISCOVERY,
			waitTime: 21 * time.Second,
			result:   10,
		},
		{
			name:     "2nd rule when game mode is conquest discovery and wait time is equal to relax rule",
			gameMode: proto.GameMode_CONQUEST_DISCOVERY,
			waitTime: 22 * time.Second,
			result:   20,
		},
		{
			name:     "last rule when game mode is conquest discovery and wait time is equal or higher than multiplication of relax rule",
			gameMode: proto.GameMode_CONQUEST_DISCOVERY,
			waitTime: 44 * time.Second,
			result:   30,
		},
		{
			name:     "1st rule when game mode is other and wait time is lower than default relax rule",
			gameMode: proto.GameMode_PRACTICE_PVP,
			waitTime: 0 * time.Second,
			result:   10,
		},
		{
			name:     "2nd rule when game mode is other and wait time is equal to default relax rule",
			gameMode: proto.GameMode_PRACTICE_PVP,
			waitTime: 1 * time.Second,
			result:   20,
		},
		{
			name:     "last rule when game mode is other and wait time is equal or higher than multiplication of default relax rule",
			gameMode: proto.GameMode_PRACTICE_PVP,
			waitTime: 2 * time.Second,
			result:   30,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			p := playergen.MustNew(
				playergen.WithMode(tt.gameMode),
				playergen.WithInitTimestamp(time.Now().Add(-tt.waitTime)),
			)

			result := calculator.Calculate(p)
			assert.Equal(t, tt.result, result)
		})
	}
}
