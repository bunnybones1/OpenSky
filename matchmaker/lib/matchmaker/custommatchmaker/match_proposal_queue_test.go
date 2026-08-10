package custommatchmaker_test

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/horizon-games/OpenSky/api/proto"
	"github.com/horizon-games/OpenSky/matchmaker/lib/matchmaker"
	"github.com/horizon-games/OpenSky/matchmaker/lib/matchmaker/custommatchmaker"
	"github.com/horizon-games/OpenSky/matchmaker/lib/queue/memqueue"
	"github.com/horizon-games/OpenSky/matchmaker/lib/store"
	"github.com/horizon-games/OpenSky/matchmaker/matchmakertest/playergen"
)

func TestMatchProposalQueue(t *testing.T) {
	keyValStore := store.NewMemStore()
	q := memqueue.NewMemQueue(keyValStore)

	gameMode := proto.GameMode_RANKED_CONSTRUCTED
	anotherGameMode := proto.GameMode_CONQUEST_CONSTRUCTED

	p := playergen.MustNew(
		playergen.WithMode(gameMode),
	)

	matchProposal := matchmaker.NewMatchProposal(p)

	queue := custommatchmaker.NewMatchProposalQueue(q, matchmaker.MatchProposalStatusAccepted)

	t.Run("pushes, lists and remove from queue", func(t *testing.T) {
		items, err := queue.Items(gameMode)
		require.NoError(t, err)
		assert.Empty(t, items)

		err = queue.Push(matchProposal)
		require.NoError(t, err)

		items, err = queue.Items(gameMode)
		require.NoError(t, err)
		assert.Len(t, items, 1)
		assert.Equal(t, matchProposal.ID(), items[0])

		items, err = queue.Items(anotherGameMode)
		require.NoError(t, err)
		assert.Empty(t, items)

		err = queue.Remove(matchProposal.ID(), gameMode)
		require.NoError(t, err)

		items, err = queue.Items(gameMode)
		require.NoError(t, err)
		assert.Empty(t, items)
	})
}
