package custommatchmaker_test

import (
	"context"
	"fmt"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/mock/gomock"

	"github.com/horizon-games/OpenSky/api/proto"
	"github.com/horizon-games/OpenSky/matchmaker/lib/matchmaker"
	"github.com/horizon-games/OpenSky/matchmaker/lib/matchmaker/custommatchmaker"
	"github.com/horizon-games/OpenSky/matchmaker/lib/matchmaker/custommatchmaker/mock"
	"github.com/horizon-games/OpenSky/matchmaker/lib/player"
	"github.com/horizon-games/OpenSky/matchmaker/matchmakertest"
	"github.com/horizon-games/OpenSky/matchmaker/matchmakertest/playergen"
)

func TestQueryService(t *testing.T) {
	var playerQueue *mock.MockPlayerQueue

	var playerRepository *mock.MockPlayerRepository

	var notifier *mock.MockNotifier

	// Setup
	{
		// Mocks
		{
			ctrl := gomock.NewController(t)

			playerQueue = mock.NewMockPlayerQueue(ctrl)
			playerRepository = mock.NewMockPlayerRepository(ctrl)
			notifier = mock.NewMockNotifier(ctrl)
		}
	}

	gameMode1 := proto.GameMode_RANKED_CONSTRUCTED
	gameMode2 := proto.GameMode_PRACTICE_PVP

	p1 := playergen.MustNew()
	p2 := playergen.MustNew()

	someError := fmt.Errorf("error")

	ctx := context.Background()

	service := custommatchmaker.NewQueryService(
		matchmakertest.NewAssertNoErrorLogger(t),
		playerQueue,
		playerRepository,
		notifier,
	)

	t.Run("lists players from game modes", func(t *testing.T) {
		request := &matchmaker.QueryRequest{
			GameModes: []proto.GameMode{
				gameMode1,
				gameMode2,
			},
		}

		playerQueue.EXPECT().Items(gameMode1).Return([]proto.Hash{p1.Address()}, nil)
		playerQueue.EXPECT().Items(gameMode2).Return([]proto.Hash{p2.Address()}, nil)

		playerRepository.EXPECT().Load(p1.Address()).Return(p1, nil)
		playerRepository.EXPECT().Load(p2.Address()).Return(p2, nil)

		notifier.EXPECT().NumberOfSubscribers(p1).Return(1, nil)
		notifier.EXPECT().NumberOfSubscribers(p2).Return(1, nil)

		players, err := service.GetPlayers(ctx, request)
		require.NoError(t, err)
		assert.Len(t, players, 2)
		assert.Contains(t, players, p1)
		assert.Contains(t, players, p2)
	})

	t.Run("removes player from queue when there is no subscription", func(t *testing.T) {
		request := &matchmaker.QueryRequest{
			GameModes: []proto.GameMode{
				gameMode1,
			},
		}

		playerQueue.EXPECT().Items(gameMode1).Return([]proto.Hash{p1.Address(), p2.Address()}, nil)

		playerRepository.EXPECT().Load(p1.Address()).Return(p1, nil)
		playerRepository.EXPECT().Load(p2.Address()).Return(p2, nil)

		notifier.EXPECT().NumberOfSubscribers(p1).Return(0, nil)
		notifier.EXPECT().NumberOfSubscribers(p2).Return(1, nil)

		playerQueue.EXPECT().Remove(p1)

		players, err := service.GetPlayers(ctx, request)
		require.NoError(t, err)
		assert.Len(t, players, 1)
		assert.Contains(t, players, p2)
	})

	t.Run("does not fail when removing player from queue fails", func(t *testing.T) {
		request := &matchmaker.QueryRequest{
			GameModes: []proto.GameMode{
				gameMode1,
			},
		}

		playerQueue.EXPECT().Items(gameMode1).Return([]proto.Hash{p1.Address(), p2.Address()}, nil)

		playerRepository.EXPECT().Load(p1.Address()).Return(p1, nil)
		playerRepository.EXPECT().Load(p2.Address()).Return(p2, nil)

		notifier.EXPECT().NumberOfSubscribers(p1).Return(0, nil)
		notifier.EXPECT().NumberOfSubscribers(p2).Return(1, nil)

		playerQueue.EXPECT().Remove(p1).Return(someError)

		service := custommatchmaker.NewQueryService(
			matchmakertest.NewAssertErrorContainsLogger(t, "remove orphaned player from queue"),
			playerQueue,
			playerRepository,
			notifier,
		)

		players, err := service.GetPlayers(ctx, request)
		require.NoError(t, err)
		assert.Len(t, players, 1)
		assert.Contains(t, players, p2)
	})

	t.Run("fails when getting number of subscribers fails", func(t *testing.T) {
		request := &matchmaker.QueryRequest{
			GameModes: []proto.GameMode{
				gameMode1,
			},
		}

		playerQueue.EXPECT().Items(gameMode1).Return([]proto.Hash{p1.Address(), p2.Address()}, nil)

		playerRepository.EXPECT().Load(p1.Address()).Return(p1, nil)

		notifier.EXPECT().NumberOfSubscribers(p1).Return(0, someError)

		players, err := service.GetPlayers(ctx, request)
		require.ErrorIs(t, err, someError)
		assert.Empty(t, players)
	})

	t.Run("does not fail when loading player fails", func(t *testing.T) {
		request := &matchmaker.QueryRequest{
			GameModes: []proto.GameMode{
				gameMode1,
			},
		}

		playerQueue.EXPECT().Items(gameMode1).Return([]proto.Hash{p1.Address(), p2.Address()}, nil)

		playerRepository.EXPECT().Load(p1.Address()).Return(nil, someError)
		playerRepository.EXPECT().Load(p2.Address()).Return(p2, nil)

		playerQueue.EXPECT().Remove(player.NewWithAddressAndMode(p1.Address(), gameMode1))

		notifier.EXPECT().NumberOfSubscribers(p2).Return(1, nil)

		service := custommatchmaker.NewQueryService(
			matchmakertest.NewAssertErrorContainsLogger(t, "retrieve player data from store"),
			playerQueue,
			playerRepository,
			notifier,
		)

		players, err := service.GetPlayers(ctx, request)
		require.NoError(t, err)
		assert.Len(t, players, 1)
		assert.Contains(t, players, p2)
	})

	t.Run("does not fail when remove player from queue during loading player failure fails", func(t *testing.T) {
		request := &matchmaker.QueryRequest{
			GameModes: []proto.GameMode{
				gameMode1,
			},
		}

		playerQueue.EXPECT().Items(gameMode1).Return([]proto.Hash{p1.Address(), p2.Address()}, nil)

		playerRepository.EXPECT().Load(p1.Address()).Return(nil, someError)
		playerRepository.EXPECT().Load(p2.Address()).Return(p2, nil)

		playerQueue.EXPECT().Remove(player.NewWithAddressAndMode(p1.Address(), gameMode1)).Return(someError)

		notifier.EXPECT().NumberOfSubscribers(p2).Return(1, nil)

		service := custommatchmaker.NewQueryService(
			matchmakertest.NewAssertErrorContainsLogger(t,
				"retrieve player data from store",
				"remove player with no data from queue",
			),
			playerQueue,
			playerRepository,
			notifier,
		)

		players, err := service.GetPlayers(ctx, request)
		require.NoError(t, err)
		assert.Len(t, players, 1)
		assert.Contains(t, players, p2)
	})

	t.Run("fails when getting players from queue fails", func(t *testing.T) {
		request := &matchmaker.QueryRequest{
			GameModes: []proto.GameMode{
				gameMode1,
				gameMode2,
			},
		}

		playerQueue.EXPECT().Items(gameMode1).Return(nil, someError)

		players, err := service.GetPlayers(ctx, request)
		require.ErrorIs(t, err, someError)
		assert.Empty(t, players)
	})
}
