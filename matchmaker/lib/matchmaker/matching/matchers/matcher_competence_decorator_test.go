package matchers_test

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/mock/gomock"

	"github.com/horizon-games/OpenSky/api/proto"
	"github.com/horizon-games/OpenSky/matchmaker/lib/matchmaker"
	"github.com/horizon-games/OpenSky/matchmaker/lib/matchmaker/matching"
	"github.com/horizon-games/OpenSky/matchmaker/lib/matchmaker/matching/matchers"
	matchingmock "github.com/horizon-games/OpenSky/matchmaker/lib/matchmaker/matching/mock"
)

func TestMatcherCompetenceDecorator(t *testing.T) {
	var matcher *matchingmock.MockMatcher

	// Setup
	{
		// Mocks
		{
			ctrl := gomock.NewController(t)

			matcher = matchingmock.NewMockMatcher(ctrl)
		}
	}

	ctx := context.Background()

	expectedMatchProposals := []*matchmaker.MatchProposal{
		{},
	}

	gameModes := []proto.GameMode{
		proto.GameMode_RANKED_CONSTRUCTED,
		proto.GameMode_RANKED_DISCOVERY,
	}

	findMatchesConditions := matchers.FindMatchesConditions{
		GameModes: gameModes,
	}

	decorator := matchers.NewMatcherCompetenceDecorator(matcher, findMatchesConditions)

	t.Run("passes request when all game modes in the request are allowed", func(t *testing.T) {
		request := &matchmaker.FindMatchesRequest{
			GameModes: gameModes,
		}

		matcher.EXPECT().FindMatchProposals(ctx, request).Return(expectedMatchProposals, nil)

		matchProposals, err := decorator.FindMatchProposals(ctx, request)
		require.NoError(t, err)
		assert.Equal(t, expectedMatchProposals, matchProposals)
	})

	t.Run("fails when at least 1 game mode in the request is not allowed", func(t *testing.T) {
		request := &matchmaker.FindMatchesRequest{
			GameModes: []proto.GameMode{proto.GameMode_CONQUEST_CONSTRUCTED},
		}

		matchProposals, err := decorator.FindMatchProposals(ctx, request)
		require.ErrorIs(t, err, matching.ErrIncompetentHandler)
		assert.Nil(t, matchProposals)
	})
}
