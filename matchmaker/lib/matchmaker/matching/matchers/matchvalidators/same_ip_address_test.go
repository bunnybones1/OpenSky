package matchvalidators_test

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/mock/gomock"

	"github.com/horizon-games/OpenSky/matchmaker/config"
	"github.com/horizon-games/OpenSky/matchmaker/lib/matchmaker/matching/matchers/matchvalidators"
	"github.com/horizon-games/OpenSky/matchmaker/lib/matchmaker/matching/matchers/matchvalidators/mock"
	"github.com/horizon-games/OpenSky/matchmaker/matchmakertest/playergen"
)

func TestSameIPAddressValidator(t *testing.T) {
	var challengeCriteria *mock.MockGameModeCriteria

	// Setup
	{
		// Mocks
		{
			ctrl := gomock.NewController(t)

			challengeCriteria = mock.NewMockGameModeCriteria(ctrl)
		}
	}

	cfg := &config.Config{}

	validator := matchvalidators.NewSameIPAddressValidator(cfg, challengeCriteria)

	t.Run("valid when IP addresses are different", func(t *testing.T) {
		p1 := playergen.MustNew(
			playergen.WithIPAddress("1"),
		)

		p2 := playergen.MustNew(
			playergen.WithIPAddress("2"),
		)

		isValid, err := validator.IsValid(p1, p2)
		require.NoError(t, err)
		assert.True(t, isValid)
	})

	t.Run("valid when IP addresses are same but it is allowed challenge", func(t *testing.T) {
		p1 := playergen.MustNew(
			playergen.WithIPAddress("1"),
		)

		p2 := playergen.MustNew(
			playergen.WithIPAddress("1"),
		)

		challengeCriteria.EXPECT().IsAllowed(p1, p2).Return(true)

		isValid, err := validator.IsValid(p1, p2)
		require.NoError(t, err)
		assert.True(t, isValid)
	})

	t.Run("invalid when IP addresses are same and it is not allowed challenge", func(t *testing.T) {
		p1 := playergen.MustNew(
			playergen.WithIPAddress("1"),
		)

		p2 := playergen.MustNew(
			playergen.WithIPAddress("1"),
		)

		challengeCriteria.EXPECT().IsAllowed(p1, p2).Return(false)

		isValid, err := validator.IsValid(p1, p2)
		require.NoError(t, err)
		assert.False(t, isValid)
	})

	t.Run("valid when it is set to allow same IP addresses", func(t *testing.T) {
		cfg := &config.Config{
			MatchMaker: config.MatchMakerConfig{
				AllowSameIPMatch: true,
			},
		}

		validator := matchvalidators.NewSameIPAddressValidator(cfg, challengeCriteria)

		p1 := playergen.MustNew(
			playergen.WithIPAddress("1"),
		)

		p2 := playergen.MustNew(
			playergen.WithIPAddress("1"),
		)

		isValid, err := validator.IsValid(p1, p2)
		require.NoError(t, err)
		assert.True(t, isValid)
	})
}
