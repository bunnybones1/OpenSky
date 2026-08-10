package matchhandlers_test

import (
	"context"
	"fmt"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/mock/gomock"

	"github.com/horizon-games/OpenSky/matchmaker/lib/director/matchhandlers"
	"github.com/horizon-games/OpenSky/matchmaker/lib/director/matchhandlers/mock"
	"github.com/horizon-games/OpenSky/matchmaker/lib/gameservers"
	gameserversmock "github.com/horizon-games/OpenSky/matchmaker/lib/gameservers/mock"
	"github.com/horizon-games/OpenSky/matchmaker/lib/matchmaker"
	matchmakermock "github.com/horizon-games/OpenSky/matchmaker/lib/matchmaker/mock"
	"github.com/horizon-games/OpenSky/matchmaker/lib/player"
	"github.com/horizon-games/OpenSky/matchmaker/matchmakertest/playergen"
)

func TestBotMatchProcessor(t *testing.T) {
	var matchmakerBackendService *matchmakermock.MockBackendService

	var gameServerManager *gameserversmock.MockManager

	var openskyAPI *mock.MockSkyWeaverAPI

	var playerShuffler *mock.MockPlayerShuffler

	// Setup
	{
		// Mocks
		{
			ctrl := gomock.NewController(t)

			matchmakerBackendService = matchmakermock.NewMockBackendService(ctrl)
			gameServerManager = gameserversmock.NewMockManager(ctrl)
			openskyAPI = mock.NewMockSkyWeaverAPI(ctrl)
			playerShuffler = mock.NewMockPlayerShuffler(ctrl)
		}
	}

	p := playergen.MustNew(
		playergen.WithInitTimestamp(time.Now()),
	)

	b1 := player.NewBotPlayer(p.Mode)

	b2 := player.NewBotPlayer(p.Mode)

	matchProposal := matchmaker.NewMatchProposal(b1, p)

	gameServerInfo := &gameservers.GameServerInfo{
		Name: "foo",
	}

	season := uint16(10)

	someError := fmt.Errorf("some error")

	ctx := context.Background()

	processor := matchhandlers.NewBotMatchProcessor(
		matchmakerBackendService,
		gameServerManager,
		openskyAPI,
		playerShuffler,
	)

	t.Run("initiates match on game server", func(t *testing.T) {
		playerShuffler.EXPECT().Shuffle([]*player.Player{b1, p}).Return([]*player.Player{p, b1})

		gameServerManager.EXPECT().Find(ctx, p.ClientVersionHash).Return(gameServerInfo, nil)

		openskyAPI.EXPECT().GetCurrentSeason(ctx).Return(season, nil)

		gameServerManager.EXPECT().InitiateMatch(ctx, gameServerInfo, gomock.Any()).
			DoAndReturn(func(_ context.Context, _ *gameservers.GameServerInfo, request gameservers.MatchRequest) error {
				assert.Greater(t, request.MatchID, uint64(0))
				assert.Equal(t, "", request.ReplayID)
				assert.Equal(t, []*player.Player{p, b1}, request.Players)
				assert.Equal(t, season, request.Season)

				return nil
			})

		matchmakerBackendService.EXPECT().MatchMade(ctx, matchmaker.MatchProcessedData{
			MatchProposal:  matchProposal,
			GameServerInfo: gameServerInfo,
		})

		err := processor.ProcessMatch(ctx, matchProposal)
		require.NoError(t, err)
	})

	t.Run("fails when sending match made info to backend service fails", func(t *testing.T) {
		playerShuffler.EXPECT().Shuffle([]*player.Player{b1, p}).Return([]*player.Player{p, b1})

		gameServerManager.EXPECT().Find(ctx, p.ClientVersionHash).Return(gameServerInfo, nil)

		openskyAPI.EXPECT().GetCurrentSeason(ctx).Return(season, nil)

		gameServerManager.EXPECT().InitiateMatch(ctx, gameServerInfo, gomock.Any()).
			DoAndReturn(func(_ context.Context, _ *gameservers.GameServerInfo, request gameservers.MatchRequest) error {
				assert.Greater(t, request.MatchID, uint64(0))
				assert.Equal(t, "", request.ReplayID)
				assert.Equal(t, []*player.Player{p, b1}, request.Players)
				assert.Equal(t, season, request.Season)

				return nil
			})

		matchmakerBackendService.EXPECT().MatchMade(ctx, gomock.Any()).Return(someError)

		err := processor.ProcessMatch(ctx, matchProposal)
		require.ErrorIs(t, err, someError)
	})

	t.Run("fails when initiating match on game server fails", func(t *testing.T) {
		playerShuffler.EXPECT().Shuffle([]*player.Player{b1, p}).Return([]*player.Player{p, b1})

		gameServerManager.EXPECT().Find(ctx, p.ClientVersionHash).Return(gameServerInfo, nil)

		openskyAPI.EXPECT().GetCurrentSeason(ctx).Return(season, nil)

		gameServerManager.EXPECT().InitiateMatch(ctx, gameServerInfo, gomock.Any()).Return(someError)

		err := processor.ProcessMatch(ctx, matchProposal)
		require.ErrorIs(t, err, someError)
	})

	t.Run("fails when getting current season fails", func(t *testing.T) {
		playerShuffler.EXPECT().Shuffle([]*player.Player{b1, p}).Return([]*player.Player{p, b1})

		gameServerManager.EXPECT().Find(ctx, p.ClientVersionHash).Return(gameServerInfo, nil)

		openskyAPI.EXPECT().GetCurrentSeason(ctx).Return(uint16(0), someError)

		err := processor.ProcessMatch(ctx, matchProposal)
		require.ErrorIs(t, err, someError)
	})

	t.Run("fails when finding game server fails", func(t *testing.T) {
		playerShuffler.EXPECT().Shuffle([]*player.Player{b1, p}).Return([]*player.Player{p, b1})

		gameServerManager.EXPECT().Find(ctx, p.ClientVersionHash).Return(nil, someError)

		err := processor.ProcessMatch(ctx, matchProposal)
		require.ErrorIs(t, err, someError)
	})

	t.Run("fails when all players are bots", func(t *testing.T) {
		matchProposal := matchmaker.NewMatchProposal(b1, b2)

		err := processor.ProcessMatch(ctx, matchProposal)
		require.ErrorContains(t, err, "no real player found")
	})

	t.Run("fails when number of players is not 2", func(t *testing.T) {
		matchProposal := matchmaker.NewMatchProposal(p)

		err := processor.ProcessMatch(ctx, matchProposal)
		require.ErrorContains(t, err, "expected 2 players, got 1 instead")
	})
}
