package matchhandlers_test

import (
	"context"
	"fmt"
	"testing"
	"time"

	"github.com/rs/zerolog"
	"github.com/stretchr/testify/require"
	"go.uber.org/mock/gomock"

	"github.com/horizon-games/OpenSky/api/proto"
	"github.com/horizon-games/OpenSky/matchmaker/lib/director/matchhandlers"
	"github.com/horizon-games/OpenSky/matchmaker/lib/director/matchhandlers/mock"
	"github.com/horizon-games/OpenSky/matchmaker/lib/gameservers"
	gameserversmock "github.com/horizon-games/OpenSky/matchmaker/lib/gameservers/mock"
	"github.com/horizon-games/OpenSky/matchmaker/lib/matchmaker"
	matchmakermock "github.com/horizon-games/OpenSky/matchmaker/lib/matchmaker/mock"
	"github.com/horizon-games/OpenSky/matchmaker/lib/player"
	"github.com/horizon-games/OpenSky/matchmaker/lib/playerstats"
	"github.com/horizon-games/OpenSky/matchmaker/matchmakertest/playergen"
)

func TestPVPMakeMatchProcessor(t *testing.T) {
	var matchmakerBackendService *matchmakermock.MockBackendService

	var gameServerManager *gameserversmock.MockManager

	var openskyAPI *mock.MockSkyWeaverAPI

	var refusalPenaltyDeleter *mock.MockRefusalPenaltyDeleter

	var playerStatsPusher *mock.MockPlayerStatsPusher

	var recentMatchTracker *mock.MockRecentMatchTracker

	var playerShuffler *mock.MockPlayerShuffler

	// Setup
	{
		// Mocks
		{
			ctrl := gomock.NewController(t)

			matchmakerBackendService = matchmakermock.NewMockBackendService(ctrl)
			gameServerManager = gameserversmock.NewMockManager(ctrl)
			openskyAPI = mock.NewMockSkyWeaverAPI(ctrl)
			refusalPenaltyDeleter = mock.NewMockRefusalPenaltyDeleter(ctrl)
			playerStatsPusher = mock.NewMockPlayerStatsPusher(ctrl)
			recentMatchTracker = mock.NewMockRecentMatchTracker(ctrl)
			playerShuffler = mock.NewMockPlayerShuffler(ctrl)
		}
	}

	p1 := playergen.MustNew(
		playergen.WithPrisms(player.Prism(proto.CardClass_STR)),
		playergen.WithInitTimestamp(time.Now()),
	)

	p2 := playergen.MustNew(
		playergen.WithPrisms(player.Prism(proto.CardClass_INT)),
		playergen.WithInitTimestamp(time.Now()),
	)

	matchProposal := matchmaker.NewMatchProposal(p1, p2)

	gameServerInfo := &gameservers.GameServerInfo{
		Name: "foo",
	}

	matchID := uint64(11)

	replayID := "replay-foo-id"

	season := uint16(10)

	someError := fmt.Errorf("some error")

	ctx := context.Background()

	processor := matchhandlers.NewPVPMakeMatchProcessor(
		zerolog.Nop(),
		matchmakerBackendService,
		gameServerManager,
		openskyAPI,
		refusalPenaltyDeleter,
		playerStatsPusher,
		recentMatchTracker,
		playerShuffler,
	)

	t.Run("initiates match on game server", func(t *testing.T) {
		playerShuffler.EXPECT().Shuffle([]*player.Player{p1, p2}).Return([]*player.Player{p2, p1})

		refusalPenaltyDeleter.EXPECT().DeleteRefusalPenalty(p2)
		refusalPenaltyDeleter.EXPECT().DeleteRefusalPenalty(p1)

		playerStatsPusher.EXPECT().Push(p2.Address(), &playerstats.Stat{
			Hero:         proto.Hero_ARI,
			OpponentHero: proto.Hero_ADA,
			OpponentID:   p1.Address(),
		})
		playerStatsPusher.EXPECT().Push(p1.Address(), &playerstats.Stat{
			Hero:         proto.Hero_ADA,
			OpponentHero: proto.Hero_ARI,
			OpponentID:   p2.Address(),
		})

		recentMatchTracker.EXPECT().DeleteMatch(p2.Address(), p1.Address())

		gameServerManager.EXPECT().Find(ctx, p2.ClientVersionHash).Return(gameServerInfo, nil)

		openskyAPI.EXPECT().GetCurrentSeason(ctx).Return(season, nil)

		openskyAPI.EXPECT().MatchStart(ctx, p2, p1).Return(matchID, replayID, nil)

		gameServerManager.EXPECT().InitiateMatch(ctx, gameServerInfo, gameservers.MatchRequest{
			MatchID:  matchID,
			ReplayID: replayID,
			Players:  []*player.Player{p2, p1},
			Season:   season,
		})

		matchmakerBackendService.EXPECT().MatchMade(ctx, matchmaker.MatchProcessedData{
			MatchProposal:  matchProposal,
			GameServerInfo: gameServerInfo,
		})

		err := processor.ProcessMatch(ctx, matchProposal)
		require.NoError(t, err)
	})

	t.Run("fails when sending match made info to backend service fails", func(t *testing.T) {
		playerShuffler.EXPECT().Shuffle([]*player.Player{p1, p2}).Return([]*player.Player{p2, p1})

		refusalPenaltyDeleter.EXPECT().DeleteRefusalPenalty(p2)
		refusalPenaltyDeleter.EXPECT().DeleteRefusalPenalty(p1)

		playerStatsPusher.EXPECT().Push(p2.Address(), &playerstats.Stat{
			Hero:         proto.Hero_ARI,
			OpponentHero: proto.Hero_ADA,
			OpponentID:   p1.Address(),
		})
		playerStatsPusher.EXPECT().Push(p1.Address(), &playerstats.Stat{
			Hero:         proto.Hero_ADA,
			OpponentHero: proto.Hero_ARI,
			OpponentID:   p2.Address(),
		})

		recentMatchTracker.EXPECT().DeleteMatch(p2.Address(), p1.Address())

		gameServerManager.EXPECT().Find(ctx, p2.ClientVersionHash).Return(gameServerInfo, nil)

		openskyAPI.EXPECT().GetCurrentSeason(ctx).Return(season, nil)

		openskyAPI.EXPECT().MatchStart(ctx, p2, p1).Return(matchID, replayID, nil)

		gameServerManager.EXPECT().InitiateMatch(ctx, gameServerInfo, gameservers.MatchRequest{
			MatchID:  matchID,
			ReplayID: replayID,
			Players:  []*player.Player{p2, p1},
			Season:   season,
		})

		matchmakerBackendService.EXPECT().MatchMade(ctx, matchmaker.MatchProcessedData{
			MatchProposal:  matchProposal,
			GameServerInfo: gameServerInfo,
		}).Return(someError)

		err := processor.ProcessMatch(ctx, matchProposal)
		require.ErrorIs(t, err, someError)
	})

	t.Run("fails when initiating match on game server fails", func(t *testing.T) {
		playerShuffler.EXPECT().Shuffle([]*player.Player{p1, p2}).Return([]*player.Player{p2, p1})

		refusalPenaltyDeleter.EXPECT().DeleteRefusalPenalty(p2)
		refusalPenaltyDeleter.EXPECT().DeleteRefusalPenalty(p1)

		playerStatsPusher.EXPECT().Push(p2.Address(), &playerstats.Stat{
			Hero:         proto.Hero_ARI,
			OpponentHero: proto.Hero_ADA,
			OpponentID:   p1.Address(),
		})
		playerStatsPusher.EXPECT().Push(p1.Address(), &playerstats.Stat{
			Hero:         proto.Hero_ADA,
			OpponentHero: proto.Hero_ARI,
			OpponentID:   p2.Address(),
		})

		recentMatchTracker.EXPECT().DeleteMatch(p2.Address(), p1.Address())

		gameServerManager.EXPECT().Find(ctx, p2.ClientVersionHash).Return(gameServerInfo, nil)

		openskyAPI.EXPECT().GetCurrentSeason(ctx).Return(season, nil)

		openskyAPI.EXPECT().MatchStart(ctx, p2, p1).Return(matchID, replayID, nil)

		gameServerManager.EXPECT().InitiateMatch(ctx, gameServerInfo, gameservers.MatchRequest{
			MatchID:  matchID,
			ReplayID: replayID,
			Players:  []*player.Player{p2, p1},
			Season:   season,
		}).Return(someError)

		err := processor.ProcessMatch(ctx, matchProposal)
		require.ErrorIs(t, err, someError)
	})

	t.Run("fails when starting match on opensky API fails", func(t *testing.T) {
		playerShuffler.EXPECT().Shuffle([]*player.Player{p1, p2}).Return([]*player.Player{p2, p1})

		refusalPenaltyDeleter.EXPECT().DeleteRefusalPenalty(p2)
		refusalPenaltyDeleter.EXPECT().DeleteRefusalPenalty(p1)

		playerStatsPusher.EXPECT().Push(p2.Address(), &playerstats.Stat{
			Hero:         proto.Hero_ARI,
			OpponentHero: proto.Hero_ADA,
			OpponentID:   p1.Address(),
		})
		playerStatsPusher.EXPECT().Push(p1.Address(), &playerstats.Stat{
			Hero:         proto.Hero_ADA,
			OpponentHero: proto.Hero_ARI,
			OpponentID:   p2.Address(),
		})

		recentMatchTracker.EXPECT().DeleteMatch(p2.Address(), p1.Address())

		gameServerManager.EXPECT().Find(ctx, p2.ClientVersionHash).Return(gameServerInfo, nil)

		openskyAPI.EXPECT().GetCurrentSeason(ctx).Return(season, nil)

		openskyAPI.EXPECT().MatchStart(ctx, p2, p1).Return(uint64(0), "", someError)

		err := processor.ProcessMatch(ctx, matchProposal)
		require.ErrorIs(t, err, someError)
	})

	t.Run("fails when getting current season fails", func(t *testing.T) {
		playerShuffler.EXPECT().Shuffle([]*player.Player{p1, p2}).Return([]*player.Player{p2, p1})

		refusalPenaltyDeleter.EXPECT().DeleteRefusalPenalty(p2)
		refusalPenaltyDeleter.EXPECT().DeleteRefusalPenalty(p1)

		playerStatsPusher.EXPECT().Push(p2.Address(), &playerstats.Stat{
			Hero:         proto.Hero_ARI,
			OpponentHero: proto.Hero_ADA,
			OpponentID:   p1.Address(),
		})
		playerStatsPusher.EXPECT().Push(p1.Address(), &playerstats.Stat{
			Hero:         proto.Hero_ADA,
			OpponentHero: proto.Hero_ARI,
			OpponentID:   p2.Address(),
		})

		recentMatchTracker.EXPECT().DeleteMatch(p2.Address(), p1.Address())

		gameServerManager.EXPECT().Find(ctx, p2.ClientVersionHash).Return(gameServerInfo, nil)

		openskyAPI.EXPECT().GetCurrentSeason(ctx).Return(uint16(0), someError)

		err := processor.ProcessMatch(ctx, matchProposal)
		require.ErrorIs(t, err, someError)
	})

	t.Run("fails when finding game server fails", func(t *testing.T) {
		playerShuffler.EXPECT().Shuffle([]*player.Player{p1, p2}).Return([]*player.Player{p2, p1})

		refusalPenaltyDeleter.EXPECT().DeleteRefusalPenalty(p2)
		refusalPenaltyDeleter.EXPECT().DeleteRefusalPenalty(p1)

		playerStatsPusher.EXPECT().Push(p2.Address(), &playerstats.Stat{
			Hero:         proto.Hero_ARI,
			OpponentHero: proto.Hero_ADA,
			OpponentID:   p1.Address(),
		})
		playerStatsPusher.EXPECT().Push(p1.Address(), &playerstats.Stat{
			Hero:         proto.Hero_ADA,
			OpponentHero: proto.Hero_ARI,
			OpponentID:   p2.Address(),
		})

		recentMatchTracker.EXPECT().DeleteMatch(p2.Address(), p1.Address())

		gameServerManager.EXPECT().Find(ctx, p2.ClientVersionHash).Return(nil, someError)

		err := processor.ProcessMatch(ctx, matchProposal)
		require.ErrorIs(t, err, someError)
	})

	t.Run("fails when deleting track of recent match fails", func(t *testing.T) {
		playerShuffler.EXPECT().Shuffle([]*player.Player{p1, p2}).Return([]*player.Player{p2, p1})

		refusalPenaltyDeleter.EXPECT().DeleteRefusalPenalty(p2)
		refusalPenaltyDeleter.EXPECT().DeleteRefusalPenalty(p1)

		playerStatsPusher.EXPECT().Push(p2.Address(), &playerstats.Stat{
			Hero:         proto.Hero_ARI,
			OpponentHero: proto.Hero_ADA,
			OpponentID:   p1.Address(),
		})
		playerStatsPusher.EXPECT().Push(p1.Address(), &playerstats.Stat{
			Hero:         proto.Hero_ADA,
			OpponentHero: proto.Hero_ARI,
			OpponentID:   p2.Address(),
		})

		recentMatchTracker.EXPECT().DeleteMatch(p2.Address(), p1.Address()).Return(someError)

		err := processor.ProcessMatch(ctx, matchProposal)
		require.ErrorIs(t, err, someError)
	})

	t.Run("does not fail when pushing player 1 stats fails", func(t *testing.T) {
		playerShuffler.EXPECT().Shuffle([]*player.Player{p1, p2}).Return([]*player.Player{p2, p1})

		refusalPenaltyDeleter.EXPECT().DeleteRefusalPenalty(p2)
		refusalPenaltyDeleter.EXPECT().DeleteRefusalPenalty(p1)

		playerStatsPusher.EXPECT().Push(p2.Address(), &playerstats.Stat{
			Hero:         proto.Hero_ARI,
			OpponentHero: proto.Hero_ADA,
			OpponentID:   p1.Address(),
		})
		playerStatsPusher.EXPECT().Push(p1.Address(), &playerstats.Stat{
			Hero:         proto.Hero_ADA,
			OpponentHero: proto.Hero_ARI,
			OpponentID:   p2.Address(),
		}).Return(someError)

		recentMatchTracker.EXPECT().DeleteMatch(p2.Address(), p1.Address())

		gameServerManager.EXPECT().Find(ctx, p2.ClientVersionHash).Return(gameServerInfo, nil)

		openskyAPI.EXPECT().GetCurrentSeason(ctx).Return(season, nil)

		openskyAPI.EXPECT().MatchStart(ctx, p2, p1).Return(matchID, replayID, nil)

		gameServerManager.EXPECT().InitiateMatch(ctx, gameServerInfo, gameservers.MatchRequest{
			MatchID:  matchID,
			ReplayID: replayID,
			Players:  []*player.Player{p2, p1},
			Season:   season,
		})

		matchmakerBackendService.EXPECT().MatchMade(ctx, matchmaker.MatchProcessedData{
			MatchProposal:  matchProposal,
			GameServerInfo: gameServerInfo,
		})

		err := processor.ProcessMatch(ctx, matchProposal)
		require.NoError(t, err)
	})

	t.Run("does not fail when pushing player 2 stats fails", func(t *testing.T) {
		playerShuffler.EXPECT().Shuffle([]*player.Player{p1, p2}).Return([]*player.Player{p2, p1})

		refusalPenaltyDeleter.EXPECT().DeleteRefusalPenalty(p2)
		refusalPenaltyDeleter.EXPECT().DeleteRefusalPenalty(p1)

		playerStatsPusher.EXPECT().Push(p2.Address(), &playerstats.Stat{
			Hero:         proto.Hero_ARI,
			OpponentHero: proto.Hero_ADA,
			OpponentID:   p1.Address(),
		}).Return(someError)
		playerStatsPusher.EXPECT().Push(p1.Address(), &playerstats.Stat{
			Hero:         proto.Hero_ADA,
			OpponentHero: proto.Hero_ARI,
			OpponentID:   p2.Address(),
		})

		recentMatchTracker.EXPECT().DeleteMatch(p2.Address(), p1.Address())

		gameServerManager.EXPECT().Find(ctx, p2.ClientVersionHash).Return(gameServerInfo, nil)

		openskyAPI.EXPECT().GetCurrentSeason(ctx).Return(season, nil)

		openskyAPI.EXPECT().MatchStart(ctx, p2, p1).Return(matchID, replayID, nil)

		gameServerManager.EXPECT().InitiateMatch(ctx, gameServerInfo, gameservers.MatchRequest{
			MatchID:  matchID,
			ReplayID: replayID,
			Players:  []*player.Player{p2, p1},
			Season:   season,
		})

		matchmakerBackendService.EXPECT().MatchMade(ctx, matchmaker.MatchProcessedData{
			MatchProposal:  matchProposal,
			GameServerInfo: gameServerInfo,
		})

		err := processor.ProcessMatch(ctx, matchProposal)
		require.NoError(t, err)
	})

	t.Run("fails when deleting refusal penalty fails", func(t *testing.T) {
		playerShuffler.EXPECT().Shuffle([]*player.Player{p1, p2}).Return([]*player.Player{p2, p1})

		refusalPenaltyDeleter.EXPECT().DeleteRefusalPenalty(p2).Return(someError)

		err := processor.ProcessMatch(ctx, matchProposal)
		require.ErrorIs(t, err, someError)
	})

	t.Run("fails when number of players is not 2", func(t *testing.T) {
		matchProposal := matchmaker.NewMatchProposal(p1)

		err := processor.ProcessMatch(ctx, matchProposal)
		require.ErrorContains(t, err, "expected 2 players, got 1 instead")
	})
}
