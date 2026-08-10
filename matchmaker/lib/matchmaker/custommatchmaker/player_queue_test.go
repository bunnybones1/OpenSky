package custommatchmaker_test

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/horizon-games/OpenSky/api/proto"
	"github.com/horizon-games/OpenSky/matchmaker/lib/matchmaker/custommatchmaker"
	"github.com/horizon-games/OpenSky/matchmaker/lib/queue/memqueue"
	"github.com/horizon-games/OpenSky/matchmaker/lib/store"
	"github.com/horizon-games/OpenSky/matchmaker/matchmakertest/playergen"
)

func TestPlayerQueue(t *testing.T) {
	keyValStore := store.NewMemStore()
	q := memqueue.NewMemQueue(keyValStore)

	gameMode := proto.GameMode_RANKED_CONSTRUCTED
	anotherGameMode := proto.GameMode_CONQUEST_CONSTRUCTED

	p := playergen.MustNew(
		playergen.WithMode(gameMode),
	)

	queue := custommatchmaker.NewPlayerQueue(q)

	t.Run("pushes, lists and remove from queue", func(t *testing.T) {
		items, err := queue.Items(gameMode)
		require.NoError(t, err)
		assert.Empty(t, items)

		err = queue.Push(p)
		require.NoError(t, err)

		items, err = queue.Items(gameMode)
		require.NoError(t, err)
		assert.Len(t, items, 1)
		assert.Equal(t, p.Address(), items[0])

		items, err = queue.Items(anotherGameMode)
		require.NoError(t, err)
		assert.Empty(t, items)

		err = queue.Remove(p)
		require.NoError(t, err)

		items, err = queue.Items(gameMode)
		require.NoError(t, err)
		assert.Empty(t, items)
	})

	t.Run("remove fails when address is invalid", func(t *testing.T) {
		p := playergen.MustNew(
			playergen.WithAddress("123"),
		)

		err := queue.Remove(p)
		require.ErrorContains(t, err, "invalid address")
	})

	t.Run("remove fails when game mode is unknown", func(t *testing.T) {
		p := playergen.MustNew()

		err := queue.Remove(p)
		require.ErrorContains(t, err, "missing game mode")
	})
}
