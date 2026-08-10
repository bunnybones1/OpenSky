package gamemodecriterias_test

import (
	"fmt"
	"testing"

	"github.com/stretchr/testify/assert"
	"go.uber.org/mock/gomock"

	"github.com/horizon-games/OpenSky/api/proto"
	"github.com/horizon-games/OpenSky/matchmaker/lib/matchmaker/matching/matchers/matchvalidators/gamemodecriterias"
	"github.com/horizon-games/OpenSky/matchmaker/lib/matchmaker/matching/matchers/matchvalidators/gamemodecriterias/mock"
	"github.com/horizon-games/OpenSky/matchmaker/matchmakertest/playergen"
)

func TestRankedCriteria(t *testing.T) {
	var waitTimeScoreCalculator *mock.MockWaitTimeScoreCalculator

	// Setup
	{
		// Mocks
		{
			ctrl := gomock.NewController(t)

			waitTimeScoreCalculator = mock.NewMockWaitTimeScoreCalculator(ctrl)
		}
	}

	criteria := gamemodecriterias.NewRankedCriteria(waitTimeScoreCalculator)

	tests := []struct {
		name                             string
		p1GameMode, p2GameMode           proto.GameMode
		p1Score, p2Score                 int32
		p1WaitTimeScore, p2WaitTimeScore int
		isAllowed                        bool
	}{
		{
			name:            "both players in ranked constructed and equal distance score",
			p1GameMode:      proto.GameMode_RANKED_CONSTRUCTED,
			p2GameMode:      proto.GameMode_RANKED_CONSTRUCTED,
			p1Score:         2,
			p2Score:         10,
			p1WaitTimeScore: 8,
			p2WaitTimeScore: 19,
			isAllowed:       true,
		},
		{
			name:            "both players in ranked discovery and equal distance score",
			p1GameMode:      proto.GameMode_RANKED_DISCOVERY,
			p2GameMode:      proto.GameMode_RANKED_DISCOVERY,
			p1Score:         2,
			p2Score:         10,
			p1WaitTimeScore: 8,
			p2WaitTimeScore: 19,
			isAllowed:       true,
		},
		{
			name:            "both players in the same mode and lower distance score",
			p1GameMode:      proto.GameMode_RANKED_CONSTRUCTED,
			p2GameMode:      proto.GameMode_RANKED_CONSTRUCTED,
			p1Score:         2,
			p2Score:         10,
			p1WaitTimeScore: 9,
			p2WaitTimeScore: 19,
			isAllowed:       true,
		},
		{
			name:            "distance of score is higher than allowed wait time score distance",
			p1GameMode:      proto.GameMode_RANKED_CONSTRUCTED,
			p2GameMode:      proto.GameMode_RANKED_CONSTRUCTED,
			p1Score:         2,
			p2Score:         10,
			p1WaitTimeScore: 7,
			p2WaitTimeScore: 19,
			isAllowed:       false,
		},
		{
			name:       "players are not in the same mode",
			p1GameMode: proto.GameMode_RANKED_CONSTRUCTED,
			p2GameMode: proto.GameMode_RANKED_DISCOVERY,
			isAllowed:  false,
		},
		{
			name:       "neither of players are in ranked mode",
			p1GameMode: proto.GameMode_CONQUEST_CONSTRUCTED,
			p2GameMode: proto.GameMode_PRACTICE_BOT,
			isAllowed:  false,
		},
	}

	for _, tt := range tests {
		t.Run(fmt.Sprintf("%t when %s", tt.isAllowed, tt.name), func(t *testing.T) {
			p1 := playergen.MustNew(
				playergen.WithMode(tt.p1GameMode),
				playergen.WithScore(tt.p1Score),
			)

			p2 := playergen.MustNew(
				playergen.WithMode(tt.p2GameMode),
				playergen.WithScore(tt.p2Score),
			)

			if tt.p1WaitTimeScore > 0 {
				waitTimeScoreCalculator.EXPECT().Calculate(p1).Return(tt.p1WaitTimeScore)
			}

			if tt.p1WaitTimeScore > 0 {
				waitTimeScoreCalculator.EXPECT().Calculate(p2).Return(tt.p1WaitTimeScore)
			}

			isAllowed := criteria.IsAllowed(p1, p2)
			assert.Equal(t, tt.isAllowed, isAllowed)
		})
	}
}
