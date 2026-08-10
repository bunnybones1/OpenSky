package custommatchmaker_test

import (
	"context"
	"fmt"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/mock/gomock"

	"github.com/horizon-games/OpenSky/matchmaker/lib/events"
	"github.com/horizon-games/OpenSky/matchmaker/lib/matchmaker"
	"github.com/horizon-games/OpenSky/matchmaker/lib/matchmaker/custommatchmaker"
	"github.com/horizon-games/OpenSky/matchmaker/lib/matchmaker/custommatchmaker/mock"
	"github.com/horizon-games/OpenSky/matchmaker/lib/player"
	"github.com/horizon-games/OpenSky/matchmaker/matchmakertest/playergen"
)

func TestAccepter(t *testing.T) {
	var matchProposalRepository *mock.MockMatchProposalRepository

	var playerRepository *mock.MockPlayerRepository

	var notifier *mock.MockNotifier

	// Setup
	{
		// Mocks
		{
			ctrl := gomock.NewController(t)

			matchProposalRepository = mock.NewMockMatchProposalRepository(ctrl)
			playerRepository = mock.NewMockPlayerRepository(ctrl)
			notifier = mock.NewMockNotifier(ctrl)
		}
	}

	someError := fmt.Errorf("error")

	ctx := context.Background()

	accepter := custommatchmaker.NewAccepter(matchProposalRepository, playerRepository, notifier)

	t.Run("accepts match proposal by player", func(t *testing.T) {
		p1 := playergen.MustNew()
		p2 := playergen.MustNew()

		matchProposal := matchmaker.NewMatchProposal(p1, p2)

		matchProposalRepository.EXPECT().Save(matchProposal)

		playerRepository.EXPECT().SetStatus(p1, player.PlayerStatus_MATCH_ACCEPTED)

		acceptMessage := events.EventAcceptedMessage{
			PlayerID: p1.Address(),
		}

		notifier.EXPECT().Message(ctx, acceptMessage, player.NewWithAddress(p1.Address()))
		notifier.EXPECT().Message(ctx, acceptMessage, player.NewWithAddress(p2.Address()))

		err := accepter.Accept(ctx, matchProposal, p1)
		require.NoError(t, err)

		assert.True(t, matchProposal.HasAccepted(p1.Address()))
	})

	t.Run("fails when sending notification fails", func(t *testing.T) {
		p1 := playergen.MustNew()
		p2 := playergen.MustNew()

		matchProposal := matchmaker.NewMatchProposal(p1, p2)

		matchProposalRepository.EXPECT().Save(matchProposal)

		playerRepository.EXPECT().SetStatus(p1, player.PlayerStatus_MATCH_ACCEPTED)

		acceptMessage := events.EventAcceptedMessage{
			PlayerID: p1.Address(),
		}

		notifier.EXPECT().Message(ctx, acceptMessage, player.NewWithAddress(p1.Address())).Return(someError)

		err := accepter.Accept(ctx, matchProposal, p1)
		require.ErrorIs(t, err, someError)
	})

	t.Run("fails when setting player status fails", func(t *testing.T) {
		p1 := playergen.MustNew()
		p2 := playergen.MustNew()

		matchProposal := matchmaker.NewMatchProposal(p1, p2)

		matchProposalRepository.EXPECT().Save(matchProposal)

		playerRepository.EXPECT().SetStatus(p1, player.PlayerStatus_MATCH_ACCEPTED).Return(someError)

		err := accepter.Accept(ctx, matchProposal, p1)
		require.ErrorIs(t, err, someError)
	})

	t.Run("fails when saving match proposal fails", func(t *testing.T) {
		p1 := playergen.MustNew()
		p2 := playergen.MustNew()

		matchProposal := matchmaker.NewMatchProposal(p1, p2)

		matchProposalRepository.EXPECT().Save(matchProposal).Return(someError)

		err := accepter.Accept(ctx, matchProposal, p1)
		require.ErrorIs(t, err, someError)
	})
}
