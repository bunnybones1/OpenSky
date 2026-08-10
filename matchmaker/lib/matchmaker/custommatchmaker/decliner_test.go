package custommatchmaker_test

import (
	"context"
	"testing"

	"github.com/rs/zerolog"
	"github.com/stretchr/testify/require"
	"go.uber.org/mock/gomock"

	"github.com/horizon-games/OpenSky/api/proto"
	"github.com/horizon-games/OpenSky/matchmaker/lib/events"
	"github.com/horizon-games/OpenSky/matchmaker/lib/lock"
	"github.com/horizon-games/OpenSky/matchmaker/lib/matchmaker"
	"github.com/horizon-games/OpenSky/matchmaker/lib/matchmaker/custommatchmaker"
	"github.com/horizon-games/OpenSky/matchmaker/lib/matchmaker/custommatchmaker/mock"
	"github.com/horizon-games/OpenSky/matchmaker/matchmakertest/playergen"
)

func TestDecliner(t *testing.T) {
	var playerRepository *mock.MockPlayerRepository

	var playerQueue *mock.MockPlayerQueue

	var matchProposalRepository *mock.MockMatchProposalRepository

	var notifier *mock.MockNotifier

	var refusalPenaltySetter *mock.MockRefusalPenaltySetter

	// Setup
	{
		// Mocks
		{
			ctrl := gomock.NewController(t)

			playerRepository = mock.NewMockPlayerRepository(ctrl)
			playerQueue = mock.NewMockPlayerQueue(ctrl)
			matchProposalRepository = mock.NewMockMatchProposalRepository(ctrl)
			notifier = mock.NewMockNotifier(ctrl)
			refusalPenaltySetter = mock.NewMockRefusalPenaltySetter(ctrl)
		}
	}

	matchProposalID := "abc"

	p1 := playergen.MustNew(
		playergen.WithMatchProposalID(matchProposalID),
	)

	p2 := playergen.MustNew(
		playergen.WithMatchProposalID(matchProposalID),
	)

	matchProposal := matchmaker.NewMatchProposalWithData(matchmaker.MatchProposalData{
		ID:        matchProposalID,
		Addresses: []proto.Hash{p1.Address(), p2.Address()},
	})

	ctx := context.Background()

	decliner := custommatchmaker.NewDecliner(
		zerolog.Nop(),
		playerRepository,
		playerQueue,
		matchProposalRepository,
		notifier,
		refusalPenaltySetter,
	)

	t.Run("declines a match and sets refusal penalty", func(t *testing.T) {
		expectedEvent := events.EventDeclinedMessage{
			PlayerID: p1.Address(),
		}

		playerRepository.EXPECT().Load(p1.Address()).Return(p1, nil)

		playerQueue.EXPECT().Remove(p1)

		matchProposalRepository.EXPECT().HasMatchProposal(p1.Address()).Return(true, nil)

		matchProposalRepository.EXPECT().Locker(matchProposalID).Return(lock.NewNoOp())

		matchProposalRepository.EXPECT().Load(matchProposalID).Return(matchProposal, nil)

		playerRepository.EXPECT().Load(p2.Address()).Return(p2, nil)

		notifier.EXPECT().Message(ctx, expectedEvent, p1, p2)

		matchProposalRepository.EXPECT().Delete(matchProposal)

		refusalPenaltySetter.EXPECT().SetRefusalPenalty(p1)

		err := decliner.DeclineMatch(ctx, p1.Address())
		require.NoError(t, err)
	})

	t.Run("does not set refusal penalty when it is challenge", func(t *testing.T) {
		p1 := playergen.MustNew(
			playergen.WithMatchProposalID(matchProposalID),
			playergen.WithMode(proto.GameMode_CHALLENGE_CONSTRUCTED),
		)

		matchProposal := matchmaker.NewMatchProposalWithData(matchmaker.MatchProposalData{
			ID:        matchProposalID,
			Addresses: []proto.Hash{p1.Address(), p2.Address()},
		})

		expectedEvent := events.EventDeclinedMessage{
			PlayerID: p1.Address(),
		}

		playerRepository.EXPECT().Load(p1.Address()).Return(p1, nil)

		playerQueue.EXPECT().Remove(p1)

		matchProposalRepository.EXPECT().HasMatchProposal(p1.Address()).Return(true, nil)

		matchProposalRepository.EXPECT().Locker(matchProposalID).Return(lock.NewNoOp())

		matchProposalRepository.EXPECT().Load(matchProposalID).Return(matchProposal, nil)

		playerRepository.EXPECT().Load(p2.Address()).Return(p2, nil)

		notifier.EXPECT().Message(ctx, expectedEvent, p1, p2)

		matchProposalRepository.EXPECT().Delete(matchProposal)

		err := decliner.DeclineMatch(ctx, p1.Address())
		require.NoError(t, err)
	})

	t.Run("fails when it is conquest", func(t *testing.T) {
		p1 := playergen.MustNew(
			playergen.WithMatchProposalID(matchProposalID),
			playergen.WithMode(proto.GameMode_CONQUEST_CONSTRUCTED),
		)

		playerRepository.EXPECT().Load(p1.Address()).Return(p1, nil)

		playerQueue.EXPECT().Remove(p1)

		matchProposalRepository.EXPECT().HasMatchProposal(p1.Address()).Return(true, nil)

		err := decliner.DeclineMatch(ctx, p1.Address())
		require.ErrorContains(t, err, "conquest cannot be declined")
	})

	t.Run("removes player from queue when player does not have match proposal", func(t *testing.T) {
		playerRepository.EXPECT().Load(p1.Address()).Return(p1, nil)

		playerQueue.EXPECT().Remove(p1)

		matchProposalRepository.EXPECT().HasMatchProposal(p1.Address()).Return(false, nil)

		err := decliner.DeclineMatch(ctx, p1.Address())
		require.NoError(t, err)
	})
}
