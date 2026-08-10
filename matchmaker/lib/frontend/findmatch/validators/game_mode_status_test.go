package validators_test

import (
	"context"
	"fmt"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/mock/gomock"

	"github.com/horizon-games/OpenSky/api/proto"
	mmerrors "github.com/horizon-games/OpenSky/matchmaker/lib/errors"
	"github.com/horizon-games/OpenSky/matchmaker/lib/frontend/findmatch/validators"
	"github.com/horizon-games/OpenSky/matchmaker/lib/frontend/findmatch/validators/mock"
	"github.com/horizon-games/OpenSky/matchmaker/lib/messages"
)

func TestGameModeStatusValidator(t *testing.T) {
	var gameModeStatusChecker *mock.MockGameModeStatusChecker

	// Setup
	{
		// Mocks
		{
			ctrl := gomock.NewController(t)

			gameModeStatusChecker = mock.NewMockGameModeStatusChecker(ctrl)
		}
	}

	gameMode := proto.GameMode_RANKED_CONSTRUCTED

	msg := &messages.FindMatchMessage{
		Mode: gameMode,
	}

	someError := fmt.Errorf("error")

	ctx := context.Background()

	validator := validators.NewGameModeStatusValidator(gameModeStatusChecker)

	t.Run("valid when game mode is enabled", func(t *testing.T) {
		gameModeStatusChecker.EXPECT().IsEnabled(ctx, gameMode).Return(true, nil)

		isValid, err := validator.IsValid(ctx, nil, msg)
		require.NoError(t, err)
		assert.True(t, isValid)
	})

	t.Run("invalid when game mode is disabled", func(t *testing.T) {
		gameModeStatusChecker.EXPECT().IsEnabled(ctx, gameMode).Return(false, nil)

		isValid, err := validator.IsValid(ctx, nil, msg)
		require.ErrorIs(t, err, mmerrors.ErrGameModeDisabled)
		assert.False(t, isValid)
	})

	t.Run("invalid when game mode checker fails", func(t *testing.T) {
		gameModeStatusChecker.EXPECT().IsEnabled(ctx, gameMode).Return(false, someError)

		isValid, err := validator.IsValid(ctx, nil, msg)
		require.ErrorIs(t, err, someError)
		assert.False(t, isValid)
	})
}
