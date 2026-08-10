package findmatch_test

import (
	"context"
	"fmt"
	"sync"
	"testing"

	"github.com/rs/zerolog"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/mock/gomock"

	mmerrors "github.com/horizon-games/OpenSky/matchmaker/lib/errors"
	"github.com/horizon-games/OpenSky/matchmaker/lib/frontend"
	"github.com/horizon-games/OpenSky/matchmaker/lib/frontend/findmatch"
	"github.com/horizon-games/OpenSky/matchmaker/lib/frontend/findmatch/mock"
	"github.com/horizon-games/OpenSky/matchmaker/lib/messages"
	"github.com/horizon-games/OpenSky/matchmaker/lib/playerchannel"
	"github.com/horizon-games/OpenSky/matchmaker/matchmakertest"
	"github.com/horizon-games/OpenSky/matchmaker/matchmakertest/playergen"
)

func TestHandler(t *testing.T) {
	var playerFactory *mock.MockPlayerFactory

	var notifier *mock.MockNotifier

	var matchFinder *mock.MockMatchFinder

	var eventListener *mock.MockEventListener

	var validator1, validator2 *mock.MockValidator

	// Setup
	{
		// Mocks
		{
			ctrl := gomock.NewController(t)

			playerFactory = mock.NewMockPlayerFactory(ctrl)
			notifier = mock.NewMockNotifier(ctrl)
			matchFinder = mock.NewMockMatchFinder(ctrl)
			eventListener = mock.NewMockEventListener(ctrl)
			validator1 = mock.NewMockValidator(ctrl)
			validator2 = mock.NewMockValidator(ctrl)
		}
	}

	p := playergen.MustNew()

	channel := &playerchannel.PlayerChannel{}

	msg := &messages.FindMatchMessage{
		PrivateSeed: p.PrivateSeed,
	}

	someError := fmt.Errorf("some error")

	ctx := context.Background()

	handler := findmatch.NewHandler(
		playerFactory,
		notifier,
		matchFinder,
		eventListener,
		validator1,
		validator2,
	)

	t.Run("creates player and delegates finding match", func(t *testing.T) {
		client := newClient()

		playerFactory.EXPECT().Create(ctx, msg).Return(p, nil)

		validator1.EXPECT().IsValid(ctx, client, msg).Return(true, nil)
		validator2.EXPECT().IsValid(ctx, client, msg).Return(true, nil)

		notifier.EXPECT().Message(ctx, mmerrors.ErrDuplicateConnection, p)

		matchFinder.EXPECT().FindMatch(ctx, p).Return(channel, nil)

		wg := sync.WaitGroup{}
		wg.Add(1)
		eventListener.EXPECT().Listen(ctx, client).Do(func(any, any) {
			wg.Done()
		})

		err := handler.Handle(ctx, client, msg)
		require.NoError(t, err)

		wg.Wait()

		assert.Equal(t, p, client.Player())
		assert.Equal(t, channel, client.Channel())
	})

	t.Run("fails when finding match fails", func(t *testing.T) {
		client := newClient()

		playerFactory.EXPECT().Create(ctx, msg).Return(p, nil)

		validator1.EXPECT().IsValid(ctx, client, msg).Return(true, nil)
		validator2.EXPECT().IsValid(ctx, client, msg).Return(true, nil)

		notifier.EXPECT().Message(ctx, mmerrors.ErrDuplicateConnection, p)

		matchFinder.EXPECT().FindMatch(ctx, p).Return(nil, someError)

		err := handler.Handle(ctx, client, msg)
		require.ErrorIs(t, err, someError)
	})

	t.Run("does not fail when sending notification fails", func(t *testing.T) {
		client := newClient()

		playerFactory.EXPECT().Create(ctx, msg).Return(p, nil)

		validator1.EXPECT().IsValid(ctx, client, msg).Return(true, nil)
		validator2.EXPECT().IsValid(ctx, client, msg).Return(true, nil)

		notifier.EXPECT().Message(ctx, mmerrors.ErrDuplicateConnection, p).Return(someError)

		matchFinder.EXPECT().FindMatch(ctx, p).Return(channel, nil)

		wg := sync.WaitGroup{}
		wg.Add(1)
		eventListener.EXPECT().Listen(ctx, client).Do(func(any, any) {
			wg.Done()
		})

		err := handler.Handle(ctx, client, msg)
		require.NoError(t, err)

		wg.Wait()

		assert.Equal(t, p, client.Player())
		assert.Equal(t, channel, client.Channel())
	})

	t.Run("does nothing when any of validators is invalid", func(t *testing.T) {
		client := newClient()

		playerFactory.EXPECT().Create(ctx, msg).Return(p, nil)

		validator1.EXPECT().IsValid(ctx, client, msg).Return(false, nil)

		err := handler.Handle(ctx, client, msg)
		require.NoError(t, err)
	})

	t.Run("fails when any of validators fails", func(t *testing.T) {
		client := newClient()

		playerFactory.EXPECT().Create(ctx, msg).Return(p, nil)

		validator1.EXPECT().IsValid(ctx, client, msg).Return(false, someError)

		err := handler.Handle(ctx, client, msg)
		require.ErrorIs(t, err, someError)
	})

	t.Run("fails when creating player fails", func(t *testing.T) {
		client := newClient()

		playerFactory.EXPECT().Create(ctx, msg).Return(nil, someError)

		err := handler.Handle(ctx, client, msg)
		require.ErrorIs(t, err, someError)
	})

	t.Run("does nothing when client has channel already", func(t *testing.T) {
		client := newClient()

		client.SetChannel(channel)

		err := handler.Handle(ctx, client, msg)
		require.NoError(t, err)
	})
}

func newClient() *frontend.Client {
	return frontend.NewClient(zerolog.Nop(), matchmakertest.NewClientConnNop(), "")
}
