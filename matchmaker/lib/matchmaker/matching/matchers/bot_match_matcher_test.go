package matchers_test

import (
	"context"
	"fmt"
	"testing"
	"time"

	"github.com/rs/zerolog"
	"github.com/stretchr/testify/require"
	"go.uber.org/mock/gomock"

	"github.com/horizon-games/OpenSky/api/proto"
	"github.com/horizon-games/OpenSky/matchmaker/lib/matchmaker"
	"github.com/horizon-games/OpenSky/matchmaker/lib/matchmaker/matching/matchers"
	"github.com/horizon-games/OpenSky/matchmaker/lib/matchmaker/matching/matchers/mock"
	matchmakermock "github.com/horizon-games/OpenSky/matchmaker/lib/matchmaker/mock"
	"github.com/horizon-games/OpenSky/matchmaker/lib/player"
	"github.com/horizon-games/OpenSky/matchmaker/matchmakertest/playergen"
)

func TestBotMatchMatcher(t *testing.T) {
	var queryService *matchmakermock.MockQueryService

	var botFactory *mock.MockBotFactory

	// Setup
	{
		// Mocks
		{
			ctrl := gomock.NewController(t)

			queryService = matchmakermock.NewMockQueryService(ctrl)
			botFactory = mock.NewMockBotFactory(ctrl)
		}
	}

	p1 := playergen.MustNew(
		playergen.WithMode(proto.GameMode_PRACTICE_BOT),
		playergen.WithInitTimestamp(time.Now()),
	)

	p2 := playergen.MustNew(
		playergen.WithMode(proto.GameMode_WARM_UP),
		playergen.WithInitTimestamp(time.Now()),
	)

	b1 := player.NewBotPlayer(p1.Mode)

	b2 := player.NewBotPlayer(p2.Mode)

	gameModes := []proto.GameMode{
		proto.GameMode_PRACTICE_BOT,
		proto.GameMode_WARM_UP,
	}

	request := &matchmaker.FindMatchesRequest{
		GameModes: gameModes,
	}

	someError := fmt.Errorf("some error")

	ctx := context.Background()

	matcher := matchers.NewBotMatchMatcher(zerolog.Nop(), queryService, botFactory)

	t.Run("queries for players and creates match proposal with a bot for each of them", func(t *testing.T) {
		queryService.EXPECT().GetPlayers(ctx, &matchmaker.QueryRequest{
			GameModes: gameModes,
		}).Return([]*player.Player{p1, p2}, nil)

		botFactory.EXPECT().CreateUnregistered(p1).Return(b1, nil)
		botFactory.EXPECT().CreateUnregistered(p2).Return(b2, nil)

		matchProposals, err := matcher.FindMatchProposals(ctx, request)
		require.NoError(t, err)
		require.Len(t, matchProposals, 2)

		findPlayerInMatchProposals(t, p1, matchProposals)
		findPlayerInMatchProposals(t, p2, matchProposals)
	})

	t.Run("does not fail when no players found", func(t *testing.T) {
		queryService.EXPECT().GetPlayers(ctx, &matchmaker.QueryRequest{
			GameModes: gameModes,
		}).Return(nil, nil)

		matchProposals, err := matcher.FindMatchProposals(ctx, request)
		require.NoError(t, err)
		require.Empty(t, matchProposals)
	})

	t.Run("fails when creating bot fails", func(t *testing.T) {
		queryService.EXPECT().GetPlayers(ctx, &matchmaker.QueryRequest{
			GameModes: gameModes,
		}).Return([]*player.Player{p1}, nil)

		botFactory.EXPECT().CreateUnregistered(p1).Return(nil, someError)

		matchProposals, err := matcher.FindMatchProposals(ctx, request)
		require.ErrorIs(t, err, someError)
		require.Empty(t, matchProposals)
	})

	t.Run("fails when querying players fails", func(t *testing.T) {
		queryService.EXPECT().GetPlayers(ctx, &matchmaker.QueryRequest{
			GameModes: gameModes,
		}).Return(nil, someError)

		matchProposals, err := matcher.FindMatchProposals(ctx, request)
		require.ErrorIs(t, err, someError)
		require.Empty(t, matchProposals)
	})
}
