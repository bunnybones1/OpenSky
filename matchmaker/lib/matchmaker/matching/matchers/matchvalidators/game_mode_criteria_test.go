package matchvalidators_test

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/mock/gomock"

	"github.com/horizon-games/OpenSky/api/proto"
	"github.com/horizon-games/OpenSky/matchmaker/lib/matchmaker/matching/matchers/matchvalidators"
	"github.com/horizon-games/OpenSky/matchmaker/lib/matchmaker/matching/matchers/matchvalidators/mock"
	"github.com/horizon-games/OpenSky/matchmaker/matchmakertest/playergen"
)

func TestGameModeCriteriaValidator(t *testing.T) {
	var gameModeCriteria1, gameModeCriteria2 *mock.MockGameModeCriteria

	// Setup
	{
		// Mocks
		{
			ctrl := gomock.NewController(t)

			gameModeCriteria1 = mock.NewMockGameModeCriteria(ctrl)
			gameModeCriteria2 = mock.NewMockGameModeCriteria(ctrl)
		}
	}

	p1 := playergen.MustNew(
		playergen.WithMode(proto.GameMode_RANKED_CONSTRUCTED),
	)

	p2 := playergen.MustNew(
		playergen.WithMode(proto.GameMode_RANKED_CONSTRUCTED),
	)

	validator := matchvalidators.NewGameModeCriteriaValidator(gameModeCriteria1, gameModeCriteria2)

	t.Run("valid when at least 1 criteria is valid", func(t *testing.T) {
		gameModeCriteria1.EXPECT().IsAllowed(p1, p2).Return(false)
		gameModeCriteria2.EXPECT().IsAllowed(p1, p2).Return(true)

		isValid, err := validator.IsValid(p1, p2)
		require.NoError(t, err)
		assert.True(t, isValid)
	})

	t.Run("does not check other criteria when valid is found", func(t *testing.T) {
		gameModeCriteria1.EXPECT().IsAllowed(p1, p2).Return(true)

		isValid, err := validator.IsValid(p1, p2)
		require.NoError(t, err)
		assert.True(t, isValid)
	})

	t.Run("invalid when all criteria are invalid", func(t *testing.T) {
		gameModeCriteria1.EXPECT().IsAllowed(p1, p2).Return(false)
		gameModeCriteria2.EXPECT().IsAllowed(p1, p2).Return(false)

		isValid, err := validator.IsValid(p1, p2)
		require.NoError(t, err)
		assert.False(t, isValid)
	})

	t.Run("invalid when no criteria exist", func(t *testing.T) {
		validator := matchvalidators.NewGameModeCriteriaValidator()

		isValid, err := validator.IsValid(p1, p2)
		require.NoError(t, err)
		assert.False(t, isValid)
	})
}
