package frontend_test

import (
	"context"
	"encoding/json"
	"fmt"
	"testing"
	"time"

	"github.com/gorilla/websocket"
	"github.com/rs/zerolog"
	"github.com/stretchr/testify/require"
	"go.uber.org/mock/gomock"
	"golang.org/x/sync/errgroup"

	"github.com/horizon-games/OpenSky/matchmaker/config"
	mmerrors "github.com/horizon-games/OpenSky/matchmaker/lib/errors"
	"github.com/horizon-games/OpenSky/matchmaker/lib/events"
	"github.com/horizon-games/OpenSky/matchmaker/lib/frontend"
	"github.com/horizon-games/OpenSky/matchmaker/lib/frontend/mock"
	"github.com/horizon-games/OpenSky/matchmaker/lib/messages"
	"github.com/horizon-games/OpenSky/matchmaker/matchmakertest"
	"github.com/horizon-games/OpenSky/matchmaker/matchmakertest/playergen"
)

func TestWebsocketHandler(t *testing.T) {
	var clientFactory *mock.MockClientFactory

	var messageReceiver *mock.MockMessageReceiver

	var findMatchHandler *mock.MockFindMatchMessageHandler

	var acceptMatchHandler, declineMatchHandler *mock.MockClientMessageHandler

	var messageSender *mock.MockMessageSender

	// Setup
	{
		// Mocks
		{
			ctrl := gomock.NewController(t)

			clientFactory = mock.NewMockClientFactory(ctrl)
			messageReceiver = mock.NewMockMessageReceiver(ctrl)
			findMatchHandler = mock.NewMockFindMatchMessageHandler(ctrl)
			acceptMatchHandler = mock.NewMockClientMessageHandler(ctrl)
			declineMatchHandler = mock.NewMockClientMessageHandler(ctrl)
			messageSender = mock.NewMockMessageSender(ctrl)
		}
	}

	logger := matchmakertest.NewAssertNoErrorLogger(t)

	wsConn := &websocket.Conn{}

	ipAddress := "1.2.3.4"

	someError := fmt.Errorf("some error")

	cfg := &config.Config{
		MatchMaker: config.MatchMakerConfig{
			AuthenticationTimeout: time.Minute,
		},
	}

	handler := frontend.NewWebsocketHandler(
		cfg,
		logger,
		clientFactory,
		messageReceiver,
		findMatchHandler,
		acceptMatchHandler,
		declineMatchHandler,
		messageSender,
	)

	ctx, cancelFn := context.WithTimeout(context.Background(), 5*time.Minute)
	defer cancelFn()

	go func(ctx context.Context) {
		err := handler.Run(ctx)
		require.NoError(t, err)
	}(ctx)

	t.Run("runs until context is cancelled and evicts all clients when it is shutting down", func(t *testing.T) {
		client1 := newClient(logger)

		client2 := newClient(logger)

		ctx, cancelFn := context.WithTimeout(context.Background(), 5*time.Minute)
		defer cancelFn()

		handler := frontend.NewWebsocketHandler(
			cfg,
			matchmakertest.NewErrorLogger(t),
			clientFactory,
			messageReceiver,
			findMatchHandler,
			acceptMatchHandler,
			declineMatchHandler,
			messageSender,
		)

		go func(ctx context.Context) {
			err := handler.Run(ctx)
			require.NoError(t, err)
		}(ctx)

		clientFactory.EXPECT().Create(wsConn, ipAddress).Return(client1)
		clientFactory.EXPECT().Create(wsConn, ipAddress).Return(client2)

		var client1Pinged, client2Pinged bool

		messageReceiver.EXPECT().Receive(client1).
			DoAndReturn(func(_ frontend.ClientReaderCloser) ([]byte, messages.MessageType, error) {
				client1Pinged = true
				return nil, messages.PingType, nil
			}).AnyTimes()

		messageReceiver.EXPECT().Receive(client2).
			DoAndReturn(func(_ frontend.ClientReaderCloser) ([]byte, messages.MessageType, error) {
				client2Pinged = true
				return nil, messages.PingType, nil
			}).AnyTimes()

		evictedMessage := events.EventEvictedMessage{
			Error: mmerrors.ErrServerShutdown,
		}

		messageSender.EXPECT().SendEvictedMessage(client1, evictedMessage).Return(someError)

		messageSender.EXPECT().SendEvictedMessage(client2, evictedMessage)

		eg, ctx := errgroup.WithContext(context.Background())

		eg.Go(func() error {
			return handler.Handle(ctx, wsConn, ipAddress)
		})

		eg.Go(func() error {
			return handler.Handle(ctx, wsConn, ipAddress)
		})

		for {
			if client1Pinged && client2Pinged {
				cancelFn()
				break
			}
		}

		err := eg.Wait()
		require.NoError(t, err)
	})

	t.Run("closes connection without error when authentication timed out", func(t *testing.T) {
		client := newClient(logger)

		ctx, cancelFn := context.WithTimeout(context.Background(), 5*time.Minute)
		defer cancelFn()

		cfg := &config.Config{
			MatchMaker: config.MatchMakerConfig{
				AuthenticationTimeout: 100 * time.Millisecond,
			},
		}

		handler := frontend.NewWebsocketHandler(
			cfg,
			logger,
			clientFactory,
			messageReceiver,
			findMatchHandler,
			acceptMatchHandler,
			declineMatchHandler,
			messageSender,
		)

		go func(ctx context.Context) {
			err := handler.Run(ctx)
			require.NoError(t, err)
		}(ctx)

		clientFactory.EXPECT().Create(wsConn, ipAddress).Return(client)

		messageReceiver.EXPECT().Receive(client).
			DoAndReturn(func(_ frontend.ClientReaderCloser) ([]byte, messages.MessageType, error) {
				return nil, messages.PingType, nil
			}).AnyTimes()

		err := handler.Handle(ctx, wsConn, ipAddress)
		require.NoError(t, err)
	})

	t.Run("does not fail when request context is cancelled", func(t *testing.T) {
		client := newClient(logger)

		ctx, cancelFn := context.WithTimeout(context.Background(), 100*time.Millisecond)
		defer cancelFn()

		clientFactory.EXPECT().Create(wsConn, ipAddress).Return(client)

		messageReceiver.EXPECT().Receive(client).
			DoAndReturn(func(_ frontend.ClientReaderCloser) ([]byte, messages.MessageType, error) {
				return nil, messages.PingType, nil
			}).AnyTimes()

		err := handler.Handle(ctx, wsConn, ipAddress)
		require.NoError(t, err)
	})

	t.Run("reads incoming messages", func(t *testing.T) {
		t.Run("find match message", func(t *testing.T) {
			p := playergen.MustNew()

			findMatchMessage := &messages.FindMatchMessage{
				Envelope: messages.Envelope{
					Type: messages.FindMatchType,
				},
				PrivateSeed: p.PrivateSeed,
				SessionID:   p.SessionID,
				Mode:        p.Mode,
				VersionHash: p.ClientVersionHash,
			}

			t.Run("is delegated", func(t *testing.T) {
				client := newClient(logger)

				clientFactory.EXPECT().Create(wsConn, ipAddress).Return(client)

				messageReceiver.EXPECT().Receive(client).
					DoAndReturn(func(_ frontend.ClientReaderCloser) ([]byte, messages.MessageType, error) {
						b, err := json.Marshal(findMatchMessage)
						require.NoError(t, err)

						return b, findMatchMessage.Type, nil
					})

				findMatchHandler.EXPECT().Handle(gomock.Any(), client, findMatchMessage)

				messageReceiver.EXPECT().Receive(client).
					DoAndReturn(func(client frontend.ClientReaderCloser) ([]byte, messages.MessageType, error) {
						client.Close()

						return nil, messages.PingType, nil
					})

				err := handler.Handle(ctx, wsConn, ipAddress)
				require.NoError(t, err)
			})

			t.Run("closes connection when finding match", func(t *testing.T) {
				client := newClient(zerolog.Nop())

				clientFactory.EXPECT().Create(wsConn, ipAddress).Return(client)

				messageReceiver.EXPECT().Receive(client).
					DoAndReturn(func(_ frontend.ClientReaderCloser) ([]byte, messages.MessageType, error) {
						b, err := json.Marshal(findMatchMessage)
						require.NoError(t, err)

						return b, findMatchMessage.Type, nil
					})

				findMatchHandler.EXPECT().Handle(gomock.Any(), client, findMatchMessage).Return(someError)

				messageSender.EXPECT().SendErrorMessage(client, *mmerrors.ErrServerError)

				err := handler.Handle(ctx, wsConn, ipAddress)
				require.NoError(t, err)
			})
		})

		t.Run("accept match message", func(t *testing.T) {
			t.Run("is delegated", func(t *testing.T) {
				client := newClient(logger)

				clientFactory.EXPECT().Create(wsConn, ipAddress).Return(client)

				messageReceiver.EXPECT().Receive(client).
					DoAndReturn(func(_ frontend.ClientReaderCloser) ([]byte, messages.MessageType, error) {
						msg := messages.NewAcceptedMatchMessage("")

						b, err := json.Marshal(msg)
						require.NoError(t, err)

						return b, msg.Type, nil
					})

				acceptMatchHandler.EXPECT().Handle(gomock.Any(), client)

				messageReceiver.EXPECT().Receive(client).
					DoAndReturn(func(client frontend.ClientReaderCloser) ([]byte, messages.MessageType, error) {
						client.Close()

						return nil, messages.PingType, nil
					})

				err := handler.Handle(ctx, wsConn, ipAddress)
				require.NoError(t, err)
			})

			t.Run("closes connection when accepting match fails", func(t *testing.T) {
				client := newClient(zerolog.Nop())

				clientFactory.EXPECT().Create(wsConn, ipAddress).Return(client)

				messageReceiver.EXPECT().Receive(client).
					DoAndReturn(func(_ frontend.ClientReaderCloser) ([]byte, messages.MessageType, error) {
						msg := messages.NewAcceptedMatchMessage("")

						b, err := json.Marshal(msg)
						require.NoError(t, err)

						return b, msg.Type, nil
					})

				acceptMatchHandler.EXPECT().Handle(gomock.Any(), client).Return(someError)

				messageSender.EXPECT().SendErrorMessage(client, *mmerrors.ErrServerError)

				err := handler.Handle(ctx, wsConn, ipAddress)
				require.NoError(t, err)
			})
		})

		t.Run("decline match message", func(t *testing.T) {
			t.Run("is delegated", func(t *testing.T) {
				client := newClient(logger)

				clientFactory.EXPECT().Create(wsConn, ipAddress).Return(client)

				messageReceiver.EXPECT().Receive(client).
					DoAndReturn(func(_ frontend.ClientReaderCloser) ([]byte, messages.MessageType, error) {
						msg := messages.NewDeclinedMatchMessage("")

						b, err := json.Marshal(msg)
						require.NoError(t, err)

						return b, msg.Type, nil
					})

				declineMatchHandler.EXPECT().Handle(gomock.Any(), client)

				messageReceiver.EXPECT().Receive(client).
					DoAndReturn(func(client frontend.ClientReaderCloser) ([]byte, messages.MessageType, error) {
						client.Close()

						return nil, messages.PingType, nil
					})

				err := handler.Handle(ctx, wsConn, ipAddress)
				require.NoError(t, err)
			})

			t.Run("closes connection when declining match fails", func(t *testing.T) {
				client := newClient(zerolog.Nop())

				clientFactory.EXPECT().Create(wsConn, ipAddress).Return(client)

				messageReceiver.EXPECT().Receive(client).
					DoAndReturn(func(_ frontend.ClientReaderCloser) ([]byte, messages.MessageType, error) {
						msg := messages.NewDeclinedMatchMessage("")

						b, err := json.Marshal(msg)
						require.NoError(t, err)

						return b, msg.Type, nil
					})

				declineMatchHandler.EXPECT().Handle(gomock.Any(), client).Return(someError)

				messageSender.EXPECT().SendErrorMessage(client, *mmerrors.ErrServerError)

				err := handler.Handle(ctx, wsConn, ipAddress)
				require.NoError(t, err)
			})

			t.Run("sends invalid operation message when invalid operation error is returned", func(t *testing.T) {
				p := playergen.MustNew()

				client := newClient(zerolog.Nop())
				client.SetPlayer(p)

				clientFactory.EXPECT().Create(wsConn, ipAddress).Return(client)

				messageReceiver.EXPECT().Receive(client).
					DoAndReturn(func(_ frontend.ClientReaderCloser) ([]byte, messages.MessageType, error) {
						msg := messages.NewDeclinedMatchMessage("")

						b, err := json.Marshal(msg)
						require.NoError(t, err)

						return b, msg.Type, nil
					})

				declineMatchHandler.EXPECT().Handle(gomock.Any(), client).Return(mmerrors.ErrInvalidOperation)

				messageSender.EXPECT().SendErrorMessage(client, *mmerrors.ErrInvalidOperation)

				messageReceiver.EXPECT().Receive(client).
					DoAndReturn(func(client frontend.ClientReaderCloser) ([]byte, messages.MessageType, error) {
						client.Close()

						return nil, messages.PingType, nil
					})

				err := handler.Handle(ctx, wsConn, ipAddress)
				require.NoError(t, err)
			})
		})

		t.Run("closes connection when unexpected message received", func(t *testing.T) {
			client := newClient(zerolog.Nop())

			clientFactory.EXPECT().Create(wsConn, ipAddress).Return(client)

			messageReceiver.EXPECT().Receive(client).
				DoAndReturn(func(_ frontend.ClientReaderCloser) ([]byte, messages.MessageType, error) {
					return nil, "foo", nil
				}).AnyTimes()

			messageSender.EXPECT().SendErrorMessage(client, *mmerrors.ErrServerError)

			err := handler.Handle(ctx, wsConn, ipAddress)
			require.NoError(t, err)
		})

		t.Run("closes connection when receiving message fails", func(t *testing.T) {
			client := newClient(zerolog.Nop())

			clientFactory.EXPECT().Create(wsConn, ipAddress).Return(client)

			messageReceiver.EXPECT().Receive(client).Return(nil, messages.EmptyMessageType, someError)

			messageSender.EXPECT().SendErrorMessage(client, *mmerrors.ErrServerError)

			err := handler.Handle(ctx, wsConn, ipAddress)
			require.NoError(t, err)
		})
	})
}

func newClient(logger zerolog.Logger) *frontend.Client {
	return frontend.NewClient(logger, matchmakertest.NewClientConnNop(), "")
}
