package custommatchmaker_test

import (
	"context"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/mock/gomock"

	"github.com/horizon-games/OpenSky/api/proto"
	"github.com/horizon-games/OpenSky/matchmaker/lib/events"
	"github.com/horizon-games/OpenSky/matchmaker/lib/lock"
	"github.com/horizon-games/OpenSky/matchmaker/lib/matchmaker"
	"github.com/horizon-games/OpenSky/matchmaker/lib/matchmaker/custommatchmaker"
	"github.com/horizon-games/OpenSky/matchmaker/lib/matchmaker/custommatchmaker/mock"
	"github.com/horizon-games/OpenSky/matchmaker/lib/player"
	"github.com/horizon-games/OpenSky/matchmaker/matchmakertest"
	"github.com/horizon-games/OpenSky/matchmaker/matchmakertest/playergen"
)

func TestAcceptTimeouter(t *testing.T) {
	var matchProposalRepository *mock.MockMatchProposalRepository

	var playerRepository *mock.MockPlayerRepository

	var accepter *mock.MockAccepter

	var notifier *mock.MockNotifier

	var acceptTimeoutPenaltySetter *mock.MockAcceptTimeoutPenaltySetter

	// Setup
	{
		// Mocks
		{
			ctrl := gomock.NewController(t)

			matchProposalRepository = mock.NewMockMatchProposalRepository(ctrl)
			playerRepository = mock.NewMockPlayerRepository(ctrl)
			accepter = mock.NewMockAccepter(ctrl)
			notifier = mock.NewMockNotifier(ctrl)
			acceptTimeoutPenaltySetter = mock.NewMockAcceptTimeoutPenaltySetter(ctrl)
		}
	}

	logger := matchmakertest.NewAssertNoErrorLogger(t)

	p1 := playergen.MustNew()
	p2 := playergen.MustNew()

	matchProposal := matchmaker.NewMatchProposal(p1, p2)
	matchProposal.SetTimeout(0)

	matchProposal.AcceptByPlayer(p1)

	timeouter := custommatchmaker.NewAcceptTimeouter(
		logger,
		matchProposalRepository,
		playerRepository,
		accepter,
		notifier,
		acceptTimeoutPenaltySetter,
	)

	ctx, cancelFn := context.WithTimeout(context.Background(), time.Minute)
	defer cancelFn()

	err := timeouter.Run(ctx)
	require.NoError(t, err)

	t.Run("runs until context is cancelled", func(t *testing.T) {
		ctx, cancelFn := context.WithTimeout(context.Background(), 0)
		defer cancelFn()

		timeouter := custommatchmaker.NewAcceptTimeouter(
			logger,
			matchProposalRepository,
			playerRepository,
			accepter,
			notifier,
			acceptTimeoutPenaltySetter,
		)

		err := timeouter.Run(ctx)
		require.NoError(t, err)

		matchProposal := matchmaker.NewMatchProposal()
		matchProposal.SetTimeout(time.Minute)

		timeouter.Schedule(matchProposal)
	})

	t.Run("waits on match proposal timeout", func(t *testing.T) {
		t.Run("deletes match proposal and sets penalty", func(t *testing.T) {
			matchProposalRepository.EXPECT().Locker(matchProposal.ID()).Return(lock.NewNoOp())

			matchProposalRepository.EXPECT().Load(matchProposal.ID()).Return(matchProposal, nil)

			matchProposalRepository.EXPECT().Delete(matchProposal)

			playerRepository.EXPECT().Load(p1.Address()).Return(p1, nil)
			playerRepository.EXPECT().Load(p2.Address()).Return(p2, nil)

			playerRepository.EXPECT().Delete(p1)
			playerRepository.EXPECT().Delete(p2)

			playerRepository.EXPECT().SetStatus(p1, player.PlayerStatus_MATCH_ABORTED)
			playerRepository.EXPECT().SetStatus(p2, player.PlayerStatus_MATCH_TIMED_OUT)

			notifier.EXPECT().Message(gomock.Any(), events.EventTimeOutMessage{}, p1)
			notifier.EXPECT().Message(gomock.Any(), events.EventTimeOutMessage{}, p2)

			waitCtx, waitCancelFn := context.WithTimeout(context.Background(), time.Minute)

			acceptTimeoutPenaltySetter.EXPECT().SetAcceptTimeoutPenalty(p2).DoAndReturn(func(_ any) error {
				waitCancelFn()

				return nil
			})

			timeouter.Schedule(matchProposal)

			<-waitCtx.Done()
		})

		t.Run("auto-accepts match proposal when it is conquest", func(t *testing.T) {
			p1 := playergen.MustNew(
				playergen.WithMode(proto.GameMode_CONQUEST_CONSTRUCTED),
			)

			p2 := playergen.MustNew(
				playergen.WithMode(proto.GameMode_CONQUEST_CONSTRUCTED),
			)

			matchProposal := matchmaker.NewMatchProposal(p1, p2)
			matchProposal.SetTimeout(0)

			matchProposal.AcceptByPlayer(p1)

			matchProposalRepository.EXPECT().Locker(matchProposal.ID()).Return(lock.NewNoOp())

			matchProposalRepository.EXPECT().Load(matchProposal.ID()).Return(matchProposal, nil)

			playerRepository.EXPECT().Load(p2.Address()).Return(p2, nil)

			accepter.EXPECT().Accept(gomock.Any(), matchProposal, p2)

			waitCtx, waitCancelFn := context.WithTimeout(context.Background(), time.Minute)

			matchProposalRepository.EXPECT().Save(matchProposal).DoAndReturn(func(_ any) error {
				waitCancelFn()

				return nil
			})

			timeouter.Schedule(matchProposal)

			<-waitCtx.Done()

			assert.True(t, matchProposal.IsAccepted())
		})
	})
}
