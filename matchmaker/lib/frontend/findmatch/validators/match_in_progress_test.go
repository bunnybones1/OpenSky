package validators_test

import (
	"context"
	"fmt"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/mock/gomock"

	"github.com/horizon-games/OpenSky/matchmaker/lib/events"
	"github.com/horizon-games/OpenSky/matchmaker/lib/frontend/findmatch/validators"
	"github.com/horizon-games/OpenSky/matchmaker/lib/frontend/findmatch/validators/mock"
	frontendmock "github.com/horizon-games/OpenSky/matchmaker/lib/frontend/mock"
	"github.com/horizon-games/OpenSky/matchmaker/lib/gameservers"
	"github.com/horizon-games/OpenSky/matchmaker/lib/messages"
	"github.com/horizon-games/OpenSky/matchmaker/matchmakertest"
	"github.com/horizon-games/OpenSky/matchmaker/matchmakertest/playergen"
)

func TestMatchInProgressValidator(t *testing.T) {
	var matchInProgressChecker *mock.MockMatchInProgressChecker

	var messageSender *frontendmock.MockMessageSender

	// Setup
	{
		// Mocks
		{
			ctrl := gomock.NewController(t)

			matchInProgressChecker = mock.NewMockMatchInProgressChecker(ctrl)
			messageSender = frontendmock.NewMockMessageSender(ctrl)
		}
	}

	p := playergen.MustNew()

	client := newClient(matchmakertest.NewAssertNoErrorLogger(t))
	client.SetPlayer(p)

	matchInProgress := &messages.InProgressMatchInfo{
		ServerInfo: gameservers.GameServerInfo{
			WS:             "ws",
			ReleaseVersion: "dev",
		},
		MatchInfo: messages.MatchInfo{
			Mode: p.Mode,
		},
	}

	event := events.EventMadeMessage{
		ServerAddress: "ws?release=dev",
		Mode:          p.Mode,
	}

	someError := fmt.Errorf("error")

	ctx := context.Background()

	validator := validators.NewMatchInProgressValidator(matchInProgressChecker, messageSender)

	t.Run("valid when no match in progress found", func(t *testing.T) {
		matchInProgressChecker.EXPECT().GetMatch(p.Address()).Return(nil, nil)

		isValid, err := validator.IsValid(ctx, client, nil)
		require.NoError(t, err)
		assert.True(t, isValid)
	})

	t.Run("invalid when match in progress found", func(t *testing.T) {
		matchInProgressChecker.EXPECT().GetMatch(p.Address()).Return(matchInProgress, nil)

		messageSender.EXPECT().SendMatchedMessage(client, event).Return(nil)

		isValid, err := validator.IsValid(ctx, client, nil)
		require.NoError(t, err)
		assert.False(t, isValid)
	})

	t.Run("fails when sending message fails", func(t *testing.T) {
		matchInProgressChecker.EXPECT().GetMatch(p.Address()).Return(matchInProgress, nil)

		messageSender.EXPECT().SendMatchedMessage(client, event).Return(someError)

		isValid, err := validator.IsValid(ctx, client, nil)
		require.ErrorIs(t, err, someError)
		assert.False(t, isValid)
	})

	t.Run("fails when finding match in progress fails", func(t *testing.T) {
		matchInProgressChecker.EXPECT().GetMatch(p.Address()).Return(nil, someError)

		isValid, err := validator.IsValid(ctx, client, nil)
		require.ErrorIs(t, err, someError)
		assert.False(t, isValid)
	})
}
