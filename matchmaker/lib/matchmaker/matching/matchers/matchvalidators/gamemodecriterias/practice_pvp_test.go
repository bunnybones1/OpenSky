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

func TestPracticePVPCriteria(t *testing.T) {
	var waitTimeScoreCalculator *mock.MockWaitTimeScoreCalculator

	// Setup
	{
		// Mocks
		{
			ctrl := gomock.NewController(t)

			waitTimeScoreCalculator = mock.NewMockWaitTimeScoreCalculator(ctrl)
		}
	}

	criteria := gamemodecriterias.NewPracticePVPCriteria(waitTimeScoreCalculator)

	tests := []struct {
		name                             string
		p1GameMode, p2GameMode           proto.GameMode
		p1Rank, p2Rank                   proto.PlayerRank
		p1Score, p2Score                 int32
		p1WaitTimeScore, p2WaitTimeScore int
		isAllowed                        bool
	}{
		{
			name:            "both players in practice pvp and equal distance score",
			p1GameMode:      proto.GameMode_PRACTICE_PVP,
			p2GameMode:      proto.GameMode_PRACTICE_PVP,
			p1Score:         2,
			p2Score:         10,
			p1WaitTimeScore: 8,
			p2WaitTimeScore: 19,
			isAllowed:       true,
		},
		{
			name:            "both players in practice pvp and lower distance score",
			p1GameMode:      proto.GameMode_PRACTICE_PVP,
			p2GameMode:      proto.GameMode_PRACTICE_PVP,
			p1Score:         2,
			p2Score:         10,
			p1WaitTimeScore: 9,
			p2WaitTimeScore: 19,
			isAllowed:       true,
		},
		{
			name:            "one player in ranked constructed with apprentice rank and lower distance score",
			p1GameMode:      proto.GameMode_PRACTICE_PVP,
			p2GameMode:      proto.GameMode_RANKED_CONSTRUCTED,
			p2Rank:          proto.PlayerRank_APPRENTICE,
			p1Score:         2,
			p2Score:         10,
			p1WaitTimeScore: 8,
			p2WaitTimeScore: 19,
			isAllowed:       true,
		},
		{
			name:            "distance of score is higher than allowed wait time score distance",
			p1GameMode:      proto.GameMode_PRACTICE_PVP,
			p2GameMode:      proto.GameMode_PRACTICE_PVP,
			p1Score:         2,
			p2Score:         10,
			p1WaitTimeScore: 7,
			p2WaitTimeScore: 19,
			isAllowed:       false,
		},
		{
			name:       "player 1 is in ranked constructed and at least expert rank",
			p1GameMode: proto.GameMode_PRACTICE_PVP,
			p2GameMode: proto.GameMode_RANKED_CONSTRUCTED,
			p2Rank:     proto.PlayerRank_EXPERT,
			isAllowed:  false,
		},
		{
			name:       "player 2 is in ranked constructed and at least expert rank",
			p1GameMode: proto.GameMode_RANKED_CONSTRUCTED,
			p1Rank:     proto.PlayerRank_EXPERT,
			p2GameMode: proto.GameMode_PRACTICE_PVP,
			isAllowed:  false,
		},
		{
			name:       "players are not in the same mode",
			p1GameMode: proto.GameMode_PRACTICE_PVP,
			p2GameMode: proto.GameMode_PRACTICE_BOT,
			isAllowed:  false,
		},
		{
			name:       "neither of players are in practice pvp or ranked constructed",
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
				playergen.WithRank(tt.p1Rank),
			)

			p2 := playergen.MustNew(
				playergen.WithMode(tt.p2GameMode),
				playergen.WithScore(tt.p2Score),
				playergen.WithRank(tt.p2Rank),
			)

			if tt.p1WaitTimeScore > 0 {
				waitTimeScoreCalculator.EXPECT().Calculate(p1).Return(tt.p1WaitTimeScore)
			}

			if tt.p2WaitTimeScore > 0 {
				waitTimeScoreCalculator.EXPECT().Calculate(p2).Return(tt.p2WaitTimeScore)
			}

			isAllowed := criteria.IsAllowed(p1, p2)
			assert.Equal(t, tt.isAllowed, isAllowed)
		})
	}
}
