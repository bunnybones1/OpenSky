package validators_test

import (
	"context"
	"fmt"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/mock/gomock"

	"github.com/horizon-games/OpenSky/api/proto"
	"github.com/horizon-games/OpenSky/matchmaker/lib/frontend/findmatch/mock"
	"github.com/horizon-games/OpenSky/matchmaker/lib/frontend/findmatch/validators"
	"github.com/horizon-games/OpenSky/matchmaker/lib/messages"
	"github.com/horizon-games/OpenSky/matchmaker/matchmakertest"
)

func TestGameModeExclusiveValidator(t *testing.T) {
	var subValidator1, subValidator2 *mock.MockValidator

	// Setup
	{
		// Mocks
		{
			ctrl := gomock.NewController(t)

			subValidator1 = mock.NewMockValidator(ctrl)
			subValidator2 = mock.NewMockValidator(ctrl)
		}
	}

	client := newClient(matchmakertest.NewAssertNoErrorLogger(t))

	exclusiveGameMode := proto.GameMode_RANKED_CONSTRUCTED

	exclusiveGameModes := []proto.GameMode{
		exclusiveGameMode,
	}

	someError := fmt.Errorf("some error")

	ctx := context.Background()

	validator := validators.NewGameModeExclusiveValidator(exclusiveGameModes, subValidator1, subValidator2)

	t.Run("valid when game mode is in exclusives and sub validation passes", func(t *testing.T) {
		msg := &messages.FindMatchMessage{
			Mode: exclusiveGameMode,
		}

		subValidator1.EXPECT().IsValid(ctx, client, msg).Return(true, nil)
		subValidator2.EXPECT().IsValid(ctx, client, msg).Return(true, nil)

		isValid, err := validator.IsValid(ctx, client, msg)
		require.NoError(t, err)
		assert.True(t, isValid)
	})

	t.Run("invalid when game mode is in exclusives and any sub validation does not pass", func(t *testing.T) {
		msg := &messages.FindMatchMessage{
			Mode: exclusiveGameMode,
		}

		subValidator1.EXPECT().IsValid(ctx, client, msg).Return(false, nil)

		isValid, err := validator.IsValid(ctx, client, msg)
		require.NoError(t, err)
		assert.False(t, isValid)
	})

	t.Run("returns sub validation result when game mode is in exclusives and any sub validation fails", func(t *testing.T) {
		msg := &messages.FindMatchMessage{
			Mode: exclusiveGameMode,
		}

		subValidator1.EXPECT().IsValid(ctx, client, msg).Return(true, someError)

		isValid, err := validator.IsValid(ctx, client, msg)
		require.ErrorIs(t, err, someError)
		assert.True(t, isValid)
	})

	t.Run("valid when game mode is not in exclusives", func(t *testing.T) {
		msg := &messages.FindMatchMessage{
			Mode: proto.GameMode_CONQUEST_CONSTRUCTED,
		}

		isValid, err := validator.IsValid(ctx, client, msg)
		require.NoError(t, err, someError)
		assert.True(t, isValid)
	})
}
