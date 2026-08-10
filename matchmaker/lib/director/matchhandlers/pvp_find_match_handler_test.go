package matchhandlers_test

import (
	"context"
	"fmt"
	"testing"
	"time"

	"github.com/stretchr/testify/require"
	"go.uber.org/mock/gomock"

	"github.com/horizon-games/OpenSky/matchmaker/lib/director/matchhandlers"
	"github.com/horizon-games/OpenSky/matchmaker/lib/matchmaker"
	matchmakermock "github.com/horizon-games/OpenSky/matchmaker/lib/matchmaker/mock"
	"github.com/horizon-games/OpenSky/matchmaker/matchmakertest/playergen"
)

func TestPVPFindMatchProcessor(t *testing.T) {
	var matchmakerBackendService *matchmakermock.MockBackendService

	// Setup
	{
		// Mocks
		{
			ctrl := gomock.NewController(t)

			matchmakerBackendService = matchmakermock.NewMockBackendService(ctrl)
		}
	}

	p1 := playergen.MustNew(
		playergen.WithInitTimestamp(time.Now()),
	)

	p2 := playergen.MustNew(
		playergen.WithInitTimestamp(time.Now()),
	)

	matchProposal := matchmaker.NewMatchProposal(p1, p2)

	someError := fmt.Errorf("some error")

	ctx := context.Background()

	processor := matchhandlers.NewPVPFindMatchProcessor(matchmakerBackendService)

	t.Run("calls backend the match has been found", func(t *testing.T) {
		matchmakerBackendService.EXPECT().MatchFound(ctx, matchmaker.MatchProcessedData{
			MatchProposal: matchProposal,
		})

		err := processor.ProcessMatch(ctx, matchProposal)
		require.NoError(t, err)
	})

	t.Run("fails when calling backend fails", func(t *testing.T) {
		matchmakerBackendService.EXPECT().MatchFound(ctx, matchmaker.MatchProcessedData{
			MatchProposal: matchProposal,
		}).Return(someError)

		err := processor.ProcessMatch(ctx, matchProposal)
		require.ErrorIs(t, err, someError)
	})

	t.Run("fails when number of players is not 2", func(t *testing.T) {
		matchProposal := matchmaker.NewMatchProposal(p1)

		err := processor.ProcessMatch(ctx, matchProposal)
		require.ErrorContains(t, err, "expected 2 players, got 1 instead")
	})
}
