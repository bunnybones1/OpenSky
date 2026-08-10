package frontend_test

import (
	"testing"
	"time"

	"github.com/stretchr/testify/require"
	"go.uber.org/mock/gomock"

	"github.com/horizon-games/OpenSky/api/proto"
	mmerrors "github.com/horizon-games/OpenSky/matchmaker/lib/errors"
	"github.com/horizon-games/OpenSky/matchmaker/lib/events"
	"github.com/horizon-games/OpenSky/matchmaker/lib/frontend"
	"github.com/horizon-games/OpenSky/matchmaker/lib/frontend/mock"
	"github.com/horizon-games/OpenSky/matchmaker/lib/messages"
)

func TestMessageSender(t *testing.T) {
	var client *mock.MockClientWriter

	// Setup
	{
		// Mocks
		{
			ctrl := gomock.NewController(t)

			client = mock.NewMockClientWriter(ctrl)
		}
	}

	sender := frontend.NewMessageSender()

	t.Run("sends refusal cooldown message", func(t *testing.T) {
		penalty := time.Minute

		expectedMsg := messages.NewCooldownPenaltyMessage(penalty)

		client.EXPECT().WriteJSON(expectedMsg)

		err := sender.SendRefusalCooldownMessage(client, penalty)
		require.NoError(t, err)
	})

	t.Run("sends match found message", func(t *testing.T) {
		gameMode := proto.GameMode_RANKED_CONSTRUCTED
		ttl := time.Minute
		opponnentID := "123"
		playerID := "456"

		event := events.EventFoundMessage{
			PlayerID:   proto.HashFromString(playerID),
			OpponentID: proto.HashFromString(opponnentID),
			TTL:        ttl,
			Mode:       gameMode,
		}

		expectedMsg := messages.NewMatchFoundMessage(
			gameMode,
			ttl,
			// Players are sorted.
			[]string{playerID, opponnentID},
		)

		client.EXPECT().WriteJSON(expectedMsg)

		err := sender.SendMatchFoundMessage(client, event)
		require.NoError(t, err)
	})

	t.Run("sends accepted match message", func(t *testing.T) {
		playerID := proto.HashFromString("123")

		event := events.EventAcceptedMessage{
			PlayerID: playerID,
		}

		expectedMsg := messages.NewAcceptedMatchMessage(playerID)

		client.EXPECT().WriteJSON(expectedMsg)

		err := sender.SendAcceptedMatchMessage(client, event)
		require.NoError(t, err)
	})

	t.Run("sends matched message", func(t *testing.T) {
		serverAddress := "1.2.3.4"
		gameMode := proto.GameMode_RANKED_CONSTRUCTED

		event := events.EventMadeMessage{
			ServerAddress: serverAddress,
			Mode:          gameMode,
		}

		expectedMsg1 := messages.NewMatchMadeMessage(serverAddress)
		expectedMsg2 := messages.NewMatchReadyToStartMessage(gameMode)

		client.EXPECT().WriteJSON(expectedMsg1)
		client.EXPECT().WriteJSON(expectedMsg2)

		err := sender.SendMatchedMessage(client, event)
		require.NoError(t, err)
	})

	t.Run("sends declined match message", func(t *testing.T) {
		playerID := proto.HashFromString("123")

		event := events.EventDeclinedMessage{
			PlayerID: playerID,
		}

		expectedMsg := messages.NewDeclinedMatchMessage(playerID)

		client.EXPECT().WriteJSON(expectedMsg)

		err := sender.SendDeclinedMatchMessage(client, event)
		require.NoError(t, err)
	})

	t.Run("sends evicted message", func(t *testing.T) {
		t.Run("sends duplicate connection error", func(t *testing.T) {
			event := events.EventEvictedMessage{
				Error: mmerrors.ErrDuplicateConnection,
			}

			expectedMsg := messages.NewErrorMessage(mmerrors.ErrDuplicateConnection.Reason)

			client.EXPECT().WriteJSON(expectedMsg)

			err := sender.SendEvictedMessage(client, event)
			require.NoError(t, err)
		})

		t.Run("sends server shutdown error", func(t *testing.T) {
			event := events.EventEvictedMessage{
				Error: mmerrors.ErrServerShutdown,
			}

			expectedMsg := messages.NewErrorMessage(mmerrors.ErrServerShutdown.Reason)

			client.EXPECT().WriteJSON(expectedMsg)

			err := sender.SendEvictedMessage(client, event)
			require.NoError(t, err)
		})

		t.Run("fails when unsupported error given", func(t *testing.T) {
			event := events.EventEvictedMessage{
				Error: mmerrors.ErrInvalidOperation,
			}

			err := sender.SendEvictedMessage(client, event)
			require.ErrorContains(t, err, "unexpected error")
		})
	})

	t.Run("sends timeout message", func(t *testing.T) {
		expectedMsg := messages.NewTimedOutMessage()

		client.EXPECT().WriteJSON(expectedMsg)

		err := sender.SendTimeoutMessage(client)
		require.NoError(t, err)
	})

	t.Run("sends error message", func(t *testing.T) {
		reason := "some reason"

		event := events.Error{
			Reason: reason,
		}

		expectedMsg := messages.NewErrorMessage(reason)

		client.EXPECT().WriteJSON(expectedMsg)

		err := sender.SendErrorMessage(client, event)
		require.NoError(t, err)
	})
}
