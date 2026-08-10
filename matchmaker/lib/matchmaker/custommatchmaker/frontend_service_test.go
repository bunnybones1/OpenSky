package custommatchmaker_test

import (
	"context"
	"fmt"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/mock/gomock"

	mmerrors "github.com/horizon-games/OpenSky/matchmaker/lib/errors"
	"github.com/horizon-games/OpenSky/matchmaker/lib/events"
	"github.com/horizon-games/OpenSky/matchmaker/lib/lock"
	"github.com/horizon-games/OpenSky/matchmaker/lib/matchmaker"
	"github.com/horizon-games/OpenSky/matchmaker/lib/matchmaker/custommatchmaker"
	"github.com/horizon-games/OpenSky/matchmaker/lib/matchmaker/custommatchmaker/mock"
	"github.com/horizon-games/OpenSky/matchmaker/lib/player"
	"github.com/horizon-games/OpenSky/matchmaker/lib/playerchannel"
	"github.com/horizon-games/OpenSky/matchmaker/matchmakertest"
	"github.com/horizon-games/OpenSky/matchmaker/matchmakertest/playergen"
)

func TestFrontendService(t *testing.T) {
	var playerQueue *mock.MockPlayerQueue

	var playerRepository *mock.MockPlayerRepository

	var matchProposalRepository *mock.MockMatchProposalRepository

	var channelFactory *mock.MockChannelFactory

	var notifier *mock.MockNotifier

	var accepter *mock.MockAccepter

	var decliner *mock.MockDecliner

	// Setup
	{
		// Mocks
		{
			ctrl := gomock.NewController(t)

			playerQueue = mock.NewMockPlayerQueue(ctrl)
			playerRepository = mock.NewMockPlayerRepository(ctrl)
			matchProposalRepository = mock.NewMockMatchProposalRepository(ctrl)
			channelFactory = mock.NewMockChannelFactory(ctrl)
			notifier = mock.NewMockNotifier(ctrl)
			accepter = mock.NewMockAccepter(ctrl)
			decliner = mock.NewMockDecliner(ctrl)
		}
	}

	p := playergen.MustNew()

	expectedChannel := &playerchannel.PlayerChannel{}

	someError := fmt.Errorf("error")

	ctx := context.Background()

	service := custommatchmaker.NewFrontendService(
		matchmakertest.NewAssertNoErrorLogger(t),
		playerQueue,
		playerRepository,
		matchProposalRepository,
		channelFactory,
		notifier,
		accepter,
		decliner,
	)

	t.Run("find match", func(t *testing.T) {
		t.Run("adds player to queue", func(t *testing.T) {
			playerRepository.EXPECT().Load(p.Address()).Return(nil, nil)

			playerRepository.EXPECT().Save(p)

			channelFactory.EXPECT().Create(ctx, p).Return(expectedChannel, nil)

			playerRepository.EXPECT().SetStatus(p, player.PlayerStatus_CONNECTED)

			playerQueue.EXPECT().Push(p)

			channel, err := service.FindMatch(ctx, p)
			require.NoError(t, err)
			assert.Same(t, expectedChannel, channel)
		})

		t.Run("fails when pushing player to queue fails", func(t *testing.T) {
			playerRepository.EXPECT().Load(p.Address()).Return(nil, nil)

			playerRepository.EXPECT().Save(p)

			channelFactory.EXPECT().Create(ctx, p).Return(expectedChannel, nil)

			playerRepository.EXPECT().SetStatus(p, player.PlayerStatus_CONNECTED)

			playerQueue.EXPECT().Push(p).Return(someError)

			channel, err := service.FindMatch(ctx, p)
			require.ErrorIs(t, err, someError)
			assert.Nil(t, channel)
		})

		t.Run("fails when setting player status fails", func(t *testing.T) {
			playerRepository.EXPECT().Load(p.Address()).Return(nil, nil)

			playerRepository.EXPECT().Save(p)

			channelFactory.EXPECT().Create(ctx, p).Return(expectedChannel, nil)

			playerRepository.EXPECT().SetStatus(p, player.PlayerStatus_CONNECTED).Return(someError)

			channel, err := service.FindMatch(ctx, p)
			require.ErrorIs(t, err, someError)
			assert.Nil(t, channel)
		})

		t.Run("fails when creating player channel fails", func(t *testing.T) {
			playerRepository.EXPECT().Load(p.Address()).Return(nil, nil)

			playerRepository.EXPECT().Save(p)

			channelFactory.EXPECT().Create(ctx, p).Return(nil, someError)

			channel, err := service.FindMatch(ctx, p)
			require.ErrorIs(t, err, someError)
			assert.Nil(t, channel)
		})

		t.Run("fails when saving fails", func(t *testing.T) {
			playerRepository.EXPECT().Load(p.Address()).Return(nil, nil)

			playerRepository.EXPECT().Save(p).Return(someError)

			channel, err := service.FindMatch(ctx, p)
			require.ErrorIs(t, err, someError)
			assert.Nil(t, channel)
		})

		t.Run("removes player from other queue", func(t *testing.T) {
			pInOtherQueue := playergen.MustNew()

			playerRepository.EXPECT().Load(p.Address()).Return(pInOtherQueue, nil)

			playerQueue.EXPECT().Remove(pInOtherQueue)

			playerRepository.EXPECT().Save(p)

			channelFactory.EXPECT().Create(ctx, p).Return(expectedChannel, nil)

			playerRepository.EXPECT().SetStatus(p, player.PlayerStatus_CONNECTED)

			playerQueue.EXPECT().Push(p)

			channel, err := service.FindMatch(ctx, p)
			require.NoError(t, err)
			assert.Same(t, expectedChannel, channel)
		})

		t.Run("does not fail when removing player from other queue fails", func(t *testing.T) {
			pInOtherQueue := playergen.MustNew()

			playerRepository.EXPECT().Load(p.Address()).Return(pInOtherQueue, nil)

			playerQueue.EXPECT().Remove(pInOtherQueue).Return(someError)

			playerRepository.EXPECT().Save(p)

			channelFactory.EXPECT().Create(ctx, p).Return(expectedChannel, nil)

			playerRepository.EXPECT().SetStatus(p, player.PlayerStatus_CONNECTED)

			playerQueue.EXPECT().Push(p)

			service := custommatchmaker.NewFrontendService(
				matchmakertest.NewAssertErrorContainsLogger(t, "remove player from other queue"),
				playerQueue,
				playerRepository,
				matchProposalRepository,
				channelFactory,
				notifier,
				accepter,
				decliner,
			)

			channel, err := service.FindMatch(ctx, p)
			require.NoError(t, err)
			assert.Same(t, expectedChannel, channel)
		})

		t.Run("does not fail when loading player fails", func(t *testing.T) {
			playerRepository.EXPECT().Load(p.Address()).Return(nil, someError)

			playerRepository.EXPECT().Save(p)

			channelFactory.EXPECT().Create(ctx, p).Return(expectedChannel, nil)

			playerRepository.EXPECT().SetStatus(p, player.PlayerStatus_CONNECTED)

			playerQueue.EXPECT().Push(p)

			channel, err := service.FindMatch(ctx, p)
			require.NoError(t, err)
			assert.Same(t, expectedChannel, channel)
		})
	})

	t.Run("accept match", func(t *testing.T) {
		t.Run("accepts match", func(t *testing.T) {
			p := playergen.MustNew()

			matchProposal := matchmaker.NewMatchProposal(p)
			matchProposal.SetTimeout(time.Minute)

			p.SetMatchProposalID(matchProposal.ID())

			playerRepository.EXPECT().Load(p.Address()).Return(p, nil)

			matchProposalRepository.EXPECT().Locker(matchProposal.ID()).Return(lock.NewNoOp())

			matchProposalRepository.EXPECT().Load(matchProposal.ID()).Return(matchProposal, nil)

			accepter.EXPECT().Accept(ctx, matchProposal, p).DoAndReturn(func(any, any, any) error {
				matchProposal.AcceptByPlayer(p)

				return nil
			})

			matchProposalRepository.EXPECT().Save(matchProposal)

			err := service.AcceptMatch(ctx, p.Address())
			require.NoError(t, err)

			assert.True(t, matchProposal.IsAccepted())
		})

		t.Run("fails when saving match proposal fails", func(t *testing.T) {
			p := playergen.MustNew()

			matchProposal := matchmaker.NewMatchProposal(p)
			matchProposal.SetTimeout(time.Minute)

			p.SetMatchProposalID(matchProposal.ID())

			playerRepository.EXPECT().Load(p.Address()).Return(p, nil)

			matchProposalRepository.EXPECT().Locker(matchProposal.ID()).Return(lock.NewNoOp())

			matchProposalRepository.EXPECT().Load(matchProposal.ID()).Return(matchProposal, nil)

			accepter.EXPECT().Accept(ctx, matchProposal, p).DoAndReturn(func(any, any, any) error {
				matchProposal.AcceptByPlayer(p)

				return nil
			})

			matchProposalRepository.EXPECT().Save(matchProposal).Return(someError)

			err := service.AcceptMatch(ctx, p.Address())
			require.ErrorIs(t, err, someError)
		})

		t.Run("does not set accepted status when not all players accepted", func(t *testing.T) {
			p1 := playergen.MustNew()
			p2 := playergen.MustNew()

			matchProposal := matchmaker.NewMatchProposal(p1, p2)
			matchProposal.SetTimeout(time.Minute)

			p1.SetMatchProposalID(matchProposal.ID())

			playerRepository.EXPECT().Load(p1.Address()).Return(p1, nil)

			matchProposalRepository.EXPECT().Locker(matchProposal.ID()).Return(lock.NewNoOp())

			matchProposalRepository.EXPECT().Load(matchProposal.ID()).Return(matchProposal, nil)

			accepter.EXPECT().Accept(ctx, matchProposal, p1).DoAndReturn(func(any, any, any) error {
				matchProposal.AcceptByPlayer(p1)

				return nil
			})

			err := service.AcceptMatch(ctx, p1.Address())
			require.NoError(t, err)

			assert.False(t, matchProposal.IsAccepted())
		})

		t.Run("fails when accepting fails", func(t *testing.T) {
			p := playergen.MustNew()

			matchProposal := matchmaker.NewMatchProposal(p)
			matchProposal.SetTimeout(time.Minute)

			p.SetMatchProposalID(matchProposal.ID())

			playerRepository.EXPECT().Load(p.Address()).Return(p, nil)

			matchProposalRepository.EXPECT().Locker(matchProposal.ID()).Return(lock.NewNoOp())

			matchProposalRepository.EXPECT().Load(matchProposal.ID()).Return(matchProposal, nil)

			accepter.EXPECT().Accept(ctx, matchProposal, p).Return(someError)

			err := service.AcceptMatch(ctx, p.Address())
			require.ErrorIs(t, err, someError)
		})

		t.Run("does nothing when it is already accepted", func(t *testing.T) {
			p := playergen.MustNew()

			matchProposal := matchmaker.NewMatchProposal(p)
			matchProposal.SetTimeout(time.Minute)
			matchProposal.AcceptByPlayer(p)

			p.SetMatchProposalID(matchProposal.ID())

			playerRepository.EXPECT().Load(p.Address()).Return(p, nil)

			matchProposalRepository.EXPECT().Locker(matchProposal.ID()).Return(lock.NewNoOp())

			matchProposalRepository.EXPECT().Load(matchProposal.ID()).Return(matchProposal, nil)

			err := service.AcceptMatch(ctx, p.Address())
			require.NoError(t, err)
		})

		t.Run("fails and notifies player about timeout when it is timed out", func(t *testing.T) {
			p := playergen.MustNew()

			matchProposal := matchmaker.NewMatchProposal(p)
			matchProposal.SetTimeout(-time.Minute)

			p.SetMatchProposalID(matchProposal.ID())

			playerRepository.EXPECT().Load(p.Address()).Return(p, nil)

			matchProposalRepository.EXPECT().Locker(matchProposal.ID()).Return(lock.NewNoOp())

			matchProposalRepository.EXPECT().Load(matchProposal.ID()).Return(matchProposal, nil)

			notifier.EXPECT().Message(ctx, events.EventTimeOutMessage{}, p)

			err := service.AcceptMatch(ctx, p.Address())
			require.ErrorIs(t, err, mmerrors.ErrInvalidOperation)
		})

		t.Run("fails when notifying player about timeout fails", func(t *testing.T) {
			p := playergen.MustNew()

			matchProposal := matchmaker.NewMatchProposal(p)
			matchProposal.SetTimeout(-time.Minute)

			p.SetMatchProposalID(matchProposal.ID())

			playerRepository.EXPECT().Load(p.Address()).Return(p, nil)

			matchProposalRepository.EXPECT().Locker(matchProposal.ID()).Return(lock.NewNoOp())

			matchProposalRepository.EXPECT().Load(matchProposal.ID()).Return(matchProposal, nil)

			notifier.EXPECT().Message(ctx, events.EventTimeOutMessage{}, p).Return(someError)

			err := service.AcceptMatch(ctx, p.Address())
			require.ErrorIs(t, err, someError)
		})

		t.Run("fails and notifies player about timeout when match proposal does not exist", func(t *testing.T) {
			p := playergen.MustNew()

			matchProposal := matchmaker.NewMatchProposal(p)

			p.SetMatchProposalID(matchProposal.ID())

			playerRepository.EXPECT().Load(p.Address()).Return(p, nil)

			matchProposalRepository.EXPECT().Locker(matchProposal.ID()).Return(lock.NewNoOp())

			matchProposalRepository.EXPECT().Load(matchProposal.ID()).Return(nil, nil)

			notifier.EXPECT().Message(ctx, events.EventTimeOutMessage{}, p)

			err := service.AcceptMatch(ctx, p.Address())
			require.ErrorIs(t, err, mmerrors.ErrInvalidOperation)
		})

		t.Run("fails when loading match proposal fails", func(t *testing.T) {
			p := playergen.MustNew()

			matchProposal := matchmaker.NewMatchProposal(p)

			p.SetMatchProposalID(matchProposal.ID())

			playerRepository.EXPECT().Load(p.Address()).Return(p, nil)

			matchProposalRepository.EXPECT().Locker(matchProposal.ID()).Return(lock.NewNoOp())

			matchProposalRepository.EXPECT().Load(matchProposal.ID()).Return(nil, someError)

			err := service.AcceptMatch(ctx, p.Address())
			require.ErrorIs(t, err, someError)
		})

		t.Run("fails when player does not have match proposal", func(t *testing.T) {
			p := playergen.MustNew()

			playerRepository.EXPECT().Load(p.Address()).Return(p, nil)

			err := service.AcceptMatch(ctx, p.Address())
			require.ErrorIs(t, err, mmerrors.ErrInvalidOperation)
		})

		t.Run("fails when loading player fails", func(t *testing.T) {
			p := playergen.MustNew()

			playerRepository.EXPECT().Load(p.Address()).Return(nil, someError)

			err := service.AcceptMatch(ctx, p.Address())
			require.ErrorIs(t, err, someError)
		})
	})

	t.Run("decline match", func(t *testing.T) {
		t.Run("delegates declining to decliner", func(t *testing.T) {
			decliner.EXPECT().DeclineMatch(ctx, p.Address())

			err := service.DeclineMatch(ctx, p.Address())
			require.NoError(t, err)
		})

		t.Run("fails when decliner fails", func(t *testing.T) {
			decliner.EXPECT().DeclineMatch(ctx, p.Address()).Return(someError)

			err := service.DeclineMatch(ctx, p.Address())
			require.ErrorIs(t, err, someError)
		})
	})
}
