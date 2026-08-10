package gamemodecriterias_test

import (
	"fmt"
	"testing"

	"github.com/stretchr/testify/assert"
	"go.uber.org/mock/gomock"

	"github.com/horizon-games/OpenSky/api/proto"
	"github.com/horizon-games/OpenSky/matchmaker/config"
	"github.com/horizon-games/OpenSky/matchmaker/lib/matchmaker/matching/matchers/matchvalidators/gamemodecriterias"
	"github.com/horizon-games/OpenSky/matchmaker/lib/matchmaker/matching/matchers/matchvalidators/gamemodecriterias/mock"
	"github.com/horizon-games/OpenSky/matchmaker/matchmakertest/playergen"
)

func TestConquestCriteria(t *testing.T) {
	var waitTimeWinsScoreCalculator *mock.MockWaitTimeScoreCalculator

	var waitTimeEloScoreCalculator *mock.MockWaitTimeScoreCalculator

	// Setup
	{
		// Mocks
		{
			ctrl := gomock.NewController(t)

			waitTimeWinsScoreCalculator = mock.NewMockWaitTimeScoreCalculator(ctrl)
			waitTimeEloScoreCalculator = mock.NewMockWaitTimeScoreCalculator(ctrl)
		}
	}

	cfg := config.Config{}

	criteria := gamemodecriterias.NewConquestCriteria(&cfg, waitTimeWinsScoreCalculator, waitTimeEloScoreCalculator)

	tests := []struct {
		name                                     string
		p1GameMode, p2GameMode                   proto.GameMode
		p1Wins, p2Wins                           int
		p1WaitTimeWinsScore, p2WaitTimeWinsScore int
		p1Score, p2Score                         int32
		p1WaitTimeEloScore, p2WaitTimeEloScore   int
		isAllowed                                bool
	}{
		{
			name:                "players have equal wins distance and equal score distance",
			p1GameMode:          proto.GameMode_CONQUEST_CONSTRUCTED,
			p2GameMode:          proto.GameMode_CONQUEST_CONSTRUCTED,
			p1Wins:              1,
			p2Wins:              2,
			p1WaitTimeWinsScore: 1,
			p2WaitTimeWinsScore: 2,
			p1Score:             -2,
			p2Score:             -10,
			p1WaitTimeEloScore:  6,
			p2WaitTimeEloScore:  8,
			isAllowed:           true,
		},
		{
			name:                "players have lower wins distance and equal score distance",
			p1GameMode:          proto.GameMode_CONQUEST_CONSTRUCTED,
			p2GameMode:          proto.GameMode_CONQUEST_CONSTRUCTED,
			p1Wins:              1,
			p2Wins:              2,
			p1WaitTimeWinsScore: 3,
			p2WaitTimeWinsScore: 2,
			p1Score:             -2,
			p2Score:             -10,
			p1WaitTimeEloScore:  6,
			p2WaitTimeEloScore:  8,
			isAllowed:           true,
		},
		{
			name:                "players have equal wins distance and lower score distance",
			p1GameMode:          proto.GameMode_CONQUEST_CONSTRUCTED,
			p2GameMode:          proto.GameMode_CONQUEST_CONSTRUCTED,
			p1Wins:              1,
			p2Wins:              2,
			p1WaitTimeWinsScore: 1,
			p2WaitTimeWinsScore: 2,
			p1Score:             -2,
			p2Score:             -10,
			p1WaitTimeEloScore:  6,
			p2WaitTimeEloScore:  9,
			isAllowed:           true,
		},
		{
			name:                "positive score is counted as 0",
			p1GameMode:          proto.GameMode_CONQUEST_CONSTRUCTED,
			p2GameMode:          proto.GameMode_CONQUEST_CONSTRUCTED,
			p1Wins:              1,
			p2Wins:              2,
			p1WaitTimeWinsScore: 1,
			p2WaitTimeWinsScore: 2,
			p1Score:             20,
			p2Score:             8,
			p1WaitTimeEloScore:  6,
			p2WaitTimeEloScore:  8,
			isAllowed:           true,
		},
		{
			name:                "distance of score is higher than allowed wait time score distance",
			p1GameMode:          proto.GameMode_CONQUEST_CONSTRUCTED,
			p2GameMode:          proto.GameMode_CONQUEST_CONSTRUCTED,
			p1Wins:              1,
			p2Wins:              2,
			p1WaitTimeWinsScore: 1,
			p2WaitTimeWinsScore: 2,
			p1Score:             -2,
			p2Score:             -10,
			p1WaitTimeEloScore:  6,
			p2WaitTimeEloScore:  7,
			isAllowed:           false,
		},
		{
			name:                "distance of wins is higher than allowed wait time wins distance",
			p1GameMode:          proto.GameMode_CONQUEST_CONSTRUCTED,
			p2GameMode:          proto.GameMode_CONQUEST_CONSTRUCTED,
			p1Wins:              1,
			p2Wins:              3,
			p1WaitTimeWinsScore: 1,
			p2WaitTimeWinsScore: 2,
			isAllowed:           false,
		},
		{
			name:       "players are not in the same mode",
			p1GameMode: proto.GameMode_CONQUEST_CONSTRUCTED,
			p2GameMode: proto.GameMode_CONQUEST_DISCOVERY,
			isAllowed:  false,
		},
		{
			name:       "neither of players are in conquest mode",
			p1GameMode: proto.GameMode_RANKED_CONSTRUCTED,
			p2GameMode: proto.GameMode_PRACTICE_PVP,
			isAllowed:  false,
		},
	}

	for _, tt := range tests {
		t.Run(fmt.Sprintf("%t when %s", tt.isAllowed, tt.name), func(t *testing.T) {
			p1 := playergen.MustNew(
				playergen.WithMode(tt.p1GameMode),
				playergen.WithConquestWins(tt.p1Wins),
				playergen.WithScore(tt.p1Score),
			)

			p2 := playergen.MustNew(
				playergen.WithMode(tt.p2GameMode),
				playergen.WithConquestWins(tt.p2Wins),
				playergen.WithScore(tt.p2Score),
			)

			if tt.p1WaitTimeWinsScore > 0 {
				waitTimeWinsScoreCalculator.EXPECT().Calculate(p1).Return(tt.p1WaitTimeWinsScore)
			}

			if tt.p2WaitTimeWinsScore > 0 {
				waitTimeWinsScoreCalculator.EXPECT().Calculate(p2).Return(tt.p2WaitTimeWinsScore)
			}

			if tt.p1WaitTimeEloScore > 0 {
				waitTimeEloScoreCalculator.EXPECT().Calculate(p1).Return(tt.p1WaitTimeEloScore)
			}

			if tt.p2WaitTimeEloScore > 0 {
				waitTimeEloScoreCalculator.EXPECT().Calculate(p2).Return(tt.p2WaitTimeEloScore)
			}

			isAllowed := criteria.IsAllowed(p1, p2)
			assert.Equal(t, tt.isAllowed, isAllowed)
		})
	}
}
