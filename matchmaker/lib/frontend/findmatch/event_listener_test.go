package findmatch_test

import (
	"context"
	"fmt"
	"testing"
	"time"

	"github.com/rs/zerolog"
	"github.com/stretchr/testify/require"
	"go.uber.org/mock/gomock"

	mmerrors "github.com/horizon-games/OpenSky/matchmaker/lib/errors"
	"github.com/horizon-games/OpenSky/matchmaker/lib/events"
	"github.com/horizon-games/OpenSky/matchmaker/lib/frontend"
	"github.com/horizon-games/OpenSky/matchmaker/lib/frontend/findmatch"
	"github.com/horizon-games/OpenSky/matchmaker/lib/frontend/mock"
	"github.com/horizon-games/OpenSky/matchmaker/lib/playerchannel"
	"github.com/horizon-games/OpenSky/matchmaker/matchmakertest"
	"github.com/horizon-games/OpenSky/matchmaker/matchmakertest/playergen"
)

func TestEventListener(t *testing.T) {
	var messageSender *mock.MockMessageSender

	// Setup
	{
		// Mocks
		{
			ctrl := gomock.NewController(t)

			messageSender = mock.NewMockMessageSender(ctrl)
		}
	}

	someError := fmt.Errorf("some error")

	errorEvent := *mmerrors.ErrServerError

	ctx, cancelFn := context.WithTimeout(context.Background(), time.Minute)
	defer cancelFn()

	listener := findmatch.NewEventListener(messageSender)

	err := listener.Run(ctx)
	require.NoError(t, err)

	t.Run("runs until context is cancelled", func(t *testing.T) {
		ctx, cancelFn := context.WithTimeout(context.Background(), time.Minute)
		defer cancelFn()

		listener := findmatch.NewEventListener(messageSender)

		err := listener.Run(ctx)
		require.NoError(t, err)

		client, subscription := newClientWithSubscription()

		event := events.EventFoundMessage{}

		messageSender.EXPECT().SendMatchFoundMessage(client, event).
			DoAndReturn(func(any, any) error {
				cancelFn()

				return nil
			})

		err = subscription.SendMessage(context.Background(), event)
		require.NoError(t, err)

		listener.Listen(context.Background(), client)
	})

	t.Run("stops listening when request context is cancelled", func(t *testing.T) {
		client, subscription := newClientWithSubscription()

		event := events.EventFoundMessage{}

		ctx, cancelFn := context.WithTimeout(context.Background(), time.Minute)
		defer cancelFn()

		messageSender.EXPECT().SendMatchFoundMessage(client, event).
			DoAndReturn(func(any, any) error {
				cancelFn()

				return nil
			})

		err := subscription.SendMessage(ctx, event)
		require.NoError(t, err)

		listener.Listen(ctx, client)
	})

	t.Run("stops listening when channel is closed", func(t *testing.T) {
		client, subscription := newClientWithSubscription()

		event := events.EventFoundMessage{}

		messageSender.EXPECT().SendMatchFoundMessage(client, event).
			DoAndReturn(func(any, any) error {
				subscription.Close()

				return nil
			})

		err := subscription.SendMessage(ctx, event)
		require.NoError(t, err)

		listener.Listen(ctx, client)
	})

	t.Run("listens on event", func(t *testing.T) {
		t.Run("found", func(t *testing.T) {
			event := events.EventFoundMessage{}

			t.Run("sends match found message", func(t *testing.T) {
				client, subscription := newClientWithSubscription()

				messageSender.EXPECT().SendMatchFoundMessage(client, event).
					DoAndReturn(func(any, any) error {
						client.Close()

						return nil
					})

				err := subscription.SendMessage(ctx, event)
				require.NoError(t, err)

				listener.Listen(ctx, client)
			})

			t.Run("sends error message when sending message fails", func(t *testing.T) {
				client, subscription := newClientWithSubscription()

				messageSender.EXPECT().SendMatchFoundMessage(client, event).
					DoAndReturn(func(any, any) error {
						return someError
					})

				messageSender.EXPECT().SendErrorMessage(client, errorEvent)

				err := subscription.SendMessage(ctx, event)
				require.NoError(t, err)

				listener.Listen(ctx, client)
			})
		})

		t.Run("accepted", func(t *testing.T) {
			event := events.EventAcceptedMessage{}

			t.Run("sends accepted match message", func(t *testing.T) {
				client, subscription := newClientWithSubscription()

				messageSender.EXPECT().SendAcceptMatchMessage(client, event).
					DoAndReturn(func(any, any) error {
						client.Close()

						return nil
					})

				err := subscription.SendMessage(ctx, event)
				require.NoError(t, err)

				listener.Listen(ctx, client)
			})

			t.Run("sends error message when sending message fails", func(t *testing.T) {
				client, subscription := newClientWithSubscription()

				messageSender.EXPECT().SendAcceptMatchMessage(client, event).
					DoAndReturn(func(any, any) error {
						return someError
					})

				messageSender.EXPECT().SendErrorMessage(client, errorEvent)

				err := subscription.SendMessage(ctx, event)
				require.NoError(t, err)

				listener.Listen(ctx, client)
			})
		})

		t.Run("declined", func(t *testing.T) {
			event := events.EventDeclinedMessage{}

			t.Run("sends declined match message", func(t *testing.T) {
				client, subscription := newClientWithSubscription()

				messageSender.EXPECT().SendDeclinedMatchMessage(client, event).
					DoAndReturn(func(any, any) error {
						client.Close()

						return nil
					})

				err := subscription.SendMessage(ctx, event)
				require.NoError(t, err)

				listener.Listen(ctx, client)
			})

			t.Run("sends error message when sending message fails", func(t *testing.T) {
				client, subscription := newClientWithSubscription()

				messageSender.EXPECT().SendDeclinedMatchMessage(client, event).
					DoAndReturn(func(any, any) error {
						return someError
					})

				messageSender.EXPECT().SendErrorMessage(client, errorEvent)

				err := subscription.SendMessage(ctx, event)
				require.NoError(t, err)

				listener.Listen(ctx, client)
			})
		})

		t.Run("match made", func(t *testing.T) {
			event := events.EventMadeMessage{}

			t.Run("sends match made message", func(t *testing.T) {
				client, subscription := newClientWithSubscription()

				messageSender.EXPECT().SendMatchedMessage(client, event).
					DoAndReturn(func(any, any) error {
						client.Close()

						return nil
					})

				err := subscription.SendMessage(ctx, event)
				require.NoError(t, err)

				listener.Listen(ctx, client)
			})

			t.Run("sends error message when sending message fails", func(t *testing.T) {
				client, subscription := newClientWithSubscription()

				messageSender.EXPECT().SendMatchedMessage(client, event).
					DoAndReturn(func(any, any) error {
						return someError
					})

				messageSender.EXPECT().SendErrorMessage(client, errorEvent)

				err := subscription.SendMessage(ctx, event)
				require.NoError(t, err)

				listener.Listen(ctx, client)
			})
		})

		t.Run("timed out", func(t *testing.T) {
			event := events.EventTimeOutMessage{}

			t.Run("sends timeout message", func(t *testing.T) {
				client, subscription := newClientWithSubscription()

				messageSender.EXPECT().SendTimeoutMessage(client).
					DoAndReturn(func(any) error {
						client.Close()

						return nil
					})

				err := subscription.SendMessage(ctx, event)
				require.NoError(t, err)

				listener.Listen(ctx, client)
			})

			t.Run("sends error message when sending message fails", func(t *testing.T) {
				client, subscription := newClientWithSubscription()

				messageSender.EXPECT().SendTimeoutMessage(client).
					DoAndReturn(func(any) error {
						return someError
					})

				messageSender.EXPECT().SendErrorMessage(client, errorEvent)

				err := subscription.SendMessage(ctx, event)
				require.NoError(t, err)

				listener.Listen(ctx, client)
			})
		})

		t.Run("evicted", func(t *testing.T) {
			event := events.EventEvictedMessage{}

			t.Run("sends evicted message", func(t *testing.T) {
				client, subscription := newClientWithSubscription()

				messageSender.EXPECT().SendEvictedMessage(client, event).
					DoAndReturn(func(any, any) error {
						client.Close()

						return nil
					})

				err := subscription.SendMessage(ctx, event)
				require.NoError(t, err)

				listener.Listen(ctx, client)
			})

			t.Run("sends error message when sending message fails", func(t *testing.T) {
				client, subscription := newClientWithSubscription()

				messageSender.EXPECT().SendEvictedMessage(client, event).
					DoAndReturn(func(any, any) error {
						return someError
					})

				messageSender.EXPECT().SendErrorMessage(client, errorEvent)

				err := subscription.SendMessage(ctx, event)
				require.NoError(t, err)

				listener.Listen(ctx, client)
			})
		})

		t.Run("error", func(t *testing.T) {
			event := &events.Error{}

			t.Run("sends error message", func(t *testing.T) {
				client, subscription := newClientWithSubscription()

				messageSender.EXPECT().SendErrorMessage(client, *event).
					DoAndReturn(func(any, any) error {
						client.Close()

						return nil
					})

				err := subscription.SendMessage(ctx, event)
				require.NoError(t, err)

				listener.Listen(ctx, client)
			})

			t.Run("sends error message when sending message fails", func(t *testing.T) {
				client, subscription := newClientWithSubscription()

				messageSender.EXPECT().SendErrorMessage(client, *event).
					DoAndReturn(func(any, any) error {
						return someError
					})

				messageSender.EXPECT().SendErrorMessage(client, errorEvent)

				err := subscription.SendMessage(ctx, event)
				require.NoError(t, err)

				listener.Listen(ctx, client)
			})
		})

		t.Run("continues listening when unexpected event received", func(t *testing.T) {
			client, subscription := newClientWithSubscription()

			event := events.EventFoundMessage{}

			messageSender.EXPECT().SendMatchFoundMessage(client, event).
				DoAndReturn(func(any, any) error {
					client.Close()

					return nil
				})

			err := subscription.SendMessage(ctx, unexpectedEvent{})
			require.NoError(t, err)

			err = subscription.SendMessage(ctx, event)
			require.NoError(t, err)

			listener.Listen(ctx, client)
		})
	})
}

func newClientWithSubscription() (*frontend.Client, *testSubscription) {
	subscription := newTestSubscription()

	channel := playerchannel.New(subscription, nil)

	client := frontend.NewClient(zerolog.Nop(), matchmakertest.NewClientConnNop(), "")

	p := playergen.MustNew()

	client.SetPlayer(p)

	client.SetChannel(channel)

	return client, subscription
}

type testSubscription struct {
	events chan events.Event
	done   chan struct{}
	closed bool
}

func newTestSubscription() *testSubscription {
	return &testSubscription{
		events: make(chan events.Event, 2),
		done:   make(chan struct{}, 2),
	}
}

func (s *testSubscription) ChannelID() string {
	// TODO implement me
	panic("implement me")
}

func (s *testSubscription) SendMessage(_ context.Context, event events.Event) error {
	s.events <- event

	return nil
}

func (s *testSubscription) ReadMessage() <-chan events.Event {
	return s.events
}

func (s *testSubscription) Done() <-chan struct{} {
	return s.done
}

func (s *testSubscription) Err() error {
	return nil
}

func (s *testSubscription) Unsubscribe() {
	if !s.closed {
		close(s.events)
	}
}

func (s *testSubscription) Close() {
	close(s.events)
	s.done <- struct{}{}
	s.closed = true
}

type unexpectedEvent struct {
}

func (e unexpectedEvent) Type() events.Type {
	return events.TypeNone
}
