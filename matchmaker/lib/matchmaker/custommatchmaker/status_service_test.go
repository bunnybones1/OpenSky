package custommatchmaker_test

import (
	"fmt"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/mock/gomock"

	"github.com/horizon-games/OpenSky/api/proto"
	"github.com/horizon-games/OpenSky/matchmaker/config"
	"github.com/horizon-games/OpenSky/matchmaker/lib/gameservers"
	"github.com/horizon-games/OpenSky/matchmaker/lib/lock"
	"github.com/horizon-games/OpenSky/matchmaker/lib/matchmaker/custommatchmaker"
	"github.com/horizon-games/OpenSky/matchmaker/lib/matchmaker/custommatchmaker/mock"
	"github.com/horizon-games/OpenSky/matchmaker/matchmakertest"
	"github.com/horizon-games/OpenSky/matchmaker/matchmakertest/playergen"
)

func TestStatusService(t *testing.T) {
	var gameServerManager *mock.MockGameServerManager

	var playerQueue *mock.MockPlayerQueue

	var playerRepository *mock.MockPlayerRepository

	var gameModeLocker *mock.MockGameModeLocker

	// Setup
	{
		// Mocks
		{
			ctrl := gomock.NewController(t)

			gameServerManager = mock.NewMockGameServerManager(ctrl)
			playerQueue = mock.NewMockPlayerQueue(ctrl)
			playerRepository = mock.NewMockPlayerRepository(ctrl)
			gameModeLocker = mock.NewMockGameModeLocker(ctrl)
		}
	}

	expectedGameServersInfo := map[string]*gameservers.GameServerInfo{
		"foo": {
			Name: "bar",
		},
	}

	p := playergen.MustNew(
		playergen.WithRandomGameMode(),
	)

	someError := fmt.Errorf("error")

	emptyQueues := []proto.GameMode{
		proto.GameMode_TUTORIAL,
		proto.GameMode_WARM_UP,
		proto.GameMode_PRACTICE_BOT,
		proto.GameMode_RANKED_CONSTRUCTED,
		proto.GameMode_RANKED_DISCOVERY,
		proto.GameMode_CONQUEST_CONSTRUCTED,
		proto.GameMode_CONQUEST_DISCOVERY,
		proto.GameMode_CHALLENGE_CONSTRUCTED,
		proto.GameMode_CHALLENGE_DISCOVERY,
	}

	nonEmptyQueue := proto.GameMode_PRACTICE_PVP

	cfg := &config.Config{
		MatchMaker: config.MatchMakerConfig{
			AuthenticationTimeout: time.Second,
		},
		VersionHash: "dev",
	}

	service := custommatchmaker.NewStatusService(
		cfg,
		matchmakertest.NewAssertNoErrorLogger(t),
		gameServerManager,
		playerQueue,
		playerRepository,
		gameModeLocker,
	)

	t.Run("provides matchmaker status", func(t *testing.T) {
		gameServerManager.EXPECT().ListInfo().Return(expectedGameServersInfo, nil)

		for _, gameMode := range emptyQueues {
			gameModeLocker.EXPECT().Locker(gameMode).Return(lock.NewNoOp())
			playerQueue.EXPECT().Items(gameMode)
		}

		gameModeLocker.EXPECT().Locker(nonEmptyQueue).Return(lock.NewNoOp())

		playerQueue.EXPECT().Items(nonEmptyQueue).Return([]proto.Hash{p.Address()}, nil)

		playerRepository.EXPECT().Load(p.Address()).Return(p, nil)

		status, err := service.Status()
		require.NoError(t, err)
		require.NotNil(t, status)

		assert.Equal(t, expectedGameServersInfo, status.ServerInfo)
		assert.Equal(t, cfg.MatchMaker, status.Config)
		assert.Equal(t, cfg.VersionHash, status.ReleaseVersion)
		assert.Len(t, status.Queues, len(emptyQueues)+1)

		for _, queueStatus := range status.Queues {
			if queueStatus.Name != nonEmptyQueue.String() {
				assert.Empty(t, queueStatus.Players)
				assert.Zero(t, queueStatus.Size)

				continue
			}

			assert.Equal(t, 1, queueStatus.Size)
			require.Len(t, queueStatus.Players, 1)
			assert.Equal(t, p.Address().String(), queueStatus.Players[0].Address)
		}
	})

	t.Run("does not fail when getting players from queue fails", func(t *testing.T) {
		gameServerManager.EXPECT().ListInfo().Return(expectedGameServersInfo, nil)

		for _, gameMode := range emptyQueues {
			gameModeLocker.EXPECT().Locker(gameMode).Return(lock.NewNoOp())
			playerQueue.EXPECT().Items(gameMode)
		}

		gameModeLocker.EXPECT().Locker(nonEmptyQueue).Return(lock.NewNoOp())

		playerQueue.EXPECT().Items(nonEmptyQueue).Return(nil, someError)

		service := custommatchmaker.NewStatusService(
			cfg,
			matchmakertest.NewAssertErrorContainsLogger(t, "get queue status"),
			gameServerManager,
			playerQueue,
			playerRepository,
			gameModeLocker,
		)

		status, err := service.Status()
		require.NoError(t, err)
		require.NotNil(t, status)

		assert.Equal(t, expectedGameServersInfo, status.ServerInfo)
		assert.Equal(t, cfg.MatchMaker, status.Config)
		assert.Equal(t, cfg.VersionHash, status.ReleaseVersion)
		assert.Len(t, status.Queues, len(emptyQueues))
	})

	t.Run("does not fail when listing game servers info fails", func(t *testing.T) {
		gameServerManager.EXPECT().ListInfo().Return(nil, someError)

		for _, gameMode := range emptyQueues {
			gameModeLocker.EXPECT().Locker(gameMode).Return(lock.NewNoOp())
			playerQueue.EXPECT().Items(gameMode)
		}

		gameModeLocker.EXPECT().Locker(nonEmptyQueue).Return(lock.NewNoOp())

		playerQueue.EXPECT().Items(nonEmptyQueue)

		service := custommatchmaker.NewStatusService(
			cfg,
			matchmakertest.NewAssertErrorContainsLogger(t, "list game servers info"),
			gameServerManager,
			playerQueue,
			playerRepository,
			gameModeLocker,
		)

		status, err := service.Status()
		require.NoError(t, err)
		require.NotNil(t, status)

		assert.Nil(t, status.ServerInfo)
		assert.Equal(t, cfg.MatchMaker, status.Config)
		assert.Equal(t, cfg.VersionHash, status.ReleaseVersion)
		assert.Len(t, status.Queues, len(emptyQueues)+1)
	})
}
