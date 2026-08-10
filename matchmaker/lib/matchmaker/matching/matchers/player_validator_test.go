package matchers_test

import (
	"fmt"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/mock/gomock"

	"github.com/horizon-games/OpenSky/matchmaker/lib/matchmaker/matching/matchers"
	"github.com/horizon-games/OpenSky/matchmaker/lib/matchmaker/matching/matchers/mock"
	"github.com/horizon-games/OpenSky/matchmaker/lib/player"
	"github.com/horizon-games/OpenSky/matchmaker/matchmakertest/playergen"
)

func TestPlayerValidator(t *testing.T) {
	var playerRepository *mock.MockPlayerRepository

	// Setup
	{
		// Mocks
		{
			ctrl := gomock.NewController(t)

			playerRepository = mock.NewMockPlayerRepository(ctrl)
		}
	}

	someErr := fmt.Errorf("some error")

	validator := matchers.NewPlayerValidator(playerRepository, 0)

	t.Run("valid when player is connected and not shadow banned", func(t *testing.T) {
		p := playergen.MustNew()

		playerRepository.EXPECT().GetStatus(p).Return(player.PlayerStatus_CONNECTED, nil)

		isValid, err := validator.IsValid(p)
		require.NoError(t, err)
		assert.True(t, isValid)
	})

	t.Run("invalid when player is not connected and not shadow banned", func(t *testing.T) {
		p := playergen.MustNew()

		playerRepository.EXPECT().GetStatus(p).Return(player.PlayerStatus_LOOKING_FOR_MATCH, nil)

		isValid, err := validator.IsValid(p)
		require.NoError(t, err)
		assert.False(t, isValid)
	})

	t.Run("valid and unbans when player is connected and shadow banned and the time passes and chance to unban passes", func(t *testing.T) {
		validator := matchers.NewPlayerValidator(playerRepository, 1)

		p := playergen.MustNew(
			playergen.WithShadowBan(time.Now().Add(-time.Second)),
		)

		playerRepository.EXPECT().Save(p)
		playerRepository.EXPECT().GetStatus(p).Return(player.PlayerStatus_CONNECTED, nil)

		isValid, err := validator.IsValid(p)
		require.NoError(t, err)
		assert.True(t, isValid)

		assert.False(t, *p.ShadowBanned)
	})

	t.Run("invalid and unbans when player is not connected and shadow banned and the time passes and chance to unban passes", func(t *testing.T) {
		validator := matchers.NewPlayerValidator(playerRepository, 1)

		p := playergen.MustNew(
			playergen.WithShadowBan(time.Now().Add(-time.Second)),
		)

		playerRepository.EXPECT().Save(p)
		playerRepository.EXPECT().GetStatus(p).Return(player.PlayerStatus_LOOKING_FOR_MATCH, nil)

		isValid, err := validator.IsValid(p)
		require.NoError(t, err)
		assert.False(t, isValid)

		assert.False(t, *p.ShadowBanned)
	})

	t.Run("invalid when player is shadow banned and the time passes and chance to unban not passes", func(t *testing.T) {
		validator := matchers.NewPlayerValidator(playerRepository, 0)

		p := playergen.MustNew(
			playergen.WithShadowBan(time.Now().Add(-time.Second)),
		)

		isValid, err := validator.IsValid(p)
		require.NoError(t, err)
		assert.False(t, isValid)

		assert.True(t, *p.ShadowBanned)
	})

	t.Run("invalid when player is shadow banned and the time not passed", func(t *testing.T) {
		validator := matchers.NewPlayerValidator(playerRepository, 1)

		p := playergen.MustNew(
			playergen.WithShadowBan(time.Now().Add(time.Second)),
		)

		isValid, err := validator.IsValid(p)
		require.NoError(t, err)
		assert.False(t, isValid)

		assert.True(t, *p.ShadowBanned)
	})

	t.Run("fails when getting player status fails", func(t *testing.T) {
		p := playergen.MustNew()

		playerRepository.EXPECT().GetStatus(p).Return(player.PlayerStatus_CONNECTED, someErr)

		isValid, err := validator.IsValid(p)
		require.ErrorIs(t, err, someErr)
		assert.False(t, isValid)
	})

	t.Run("fails when saving unbanned player fails", func(t *testing.T) {
		validator := matchers.NewPlayerValidator(playerRepository, 1)

		p := playergen.MustNew(
			playergen.WithShadowBan(time.Now().Add(-time.Second)),
		)

		playerRepository.EXPECT().Save(p).Return(someErr)

		isValid, err := validator.IsValid(p)
		require.ErrorIs(t, err, someErr)
		assert.False(t, isValid)
	})
}
