package custommatchmaker_test

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/horizon-games/OpenSky/matchmaker/config"
	"github.com/horizon-games/OpenSky/matchmaker/lib/lock"
	"github.com/horizon-games/OpenSky/matchmaker/lib/matchmaker"
	"github.com/horizon-games/OpenSky/matchmaker/lib/matchmaker/custommatchmaker"
	"github.com/horizon-games/OpenSky/matchmaker/lib/queue/memqueue"
	"github.com/horizon-games/OpenSky/matchmaker/lib/store"
	"github.com/horizon-games/OpenSky/matchmaker/matchmakertest/playergen"
)

func TestMatchProposalRepository(t *testing.T) {
	cfg := &config.Config{
		MatchMaker: config.MatchMakerConfig{
			MatchAcceptanceTimeout: time.Minute,
		},
	}
	keyValStore := store.NewMemStore()
	locker := lock.NewMemLock()

	queueDistributor := memqueue.NewMemQueue(keyValStore)
	acceptedQueue := custommatchmaker.NewMatchProposalQueue(queueDistributor, matchmaker.MatchProposalStatusAccepted)

	repository := custommatchmaker.NewMatchProposalRepository(cfg, keyValStore, locker, acceptedQueue)

	t.Run("saves, loads and deletes match proposal", func(t *testing.T) {
		p := playergen.MustNew()

		matchProposal := matchmaker.NewMatchProposal(p)

		err := repository.Save(matchProposal)
		require.NoError(t, err)

		loadedMatchProposal, err := repository.Load(matchProposal.ID())
		require.NoError(t, err)
		assert.Equal(t, matchProposal.Data(), loadedMatchProposal.Data())

		err = repository.Delete(matchProposal)
		require.NoError(t, err)

		loadedMatchProposal, err = repository.Load(matchProposal.ID())
		require.NoError(t, err)
		assert.Nil(t, loadedMatchProposal)
	})

	t.Run("saves and deletes player's pending match", func(t *testing.T) {
		p := playergen.MustNew()

		matchProposal := matchmaker.NewMatchProposal(p)

		err := repository.Save(matchProposal)
		require.NoError(t, err)

		has, err := repository.HasMatchProposal(p.Address())
		require.NoError(t, err)
		assert.True(t, has)

		err = repository.Delete(matchProposal)
		require.NoError(t, err)

		has, err = repository.HasMatchProposal(p.Address())
		require.NoError(t, err)
		assert.False(t, has)
	})

	t.Run("adds and removes match proposal to/from list of accepted when it saves/deleted accepted match proposal", func(t *testing.T) {
		p := playergen.MustNew()

		matchProposal := matchmaker.NewMatchProposal(p)

		err := repository.Save(matchProposal)
		require.NoError(t, err)

		accepted, err := acceptedQueue.Items(p.Mode)
		require.NoError(t, err)
		require.Empty(t, accepted)

		matchProposal.SetAccepted()

		err = repository.Save(matchProposal)
		require.NoError(t, err)

		accepted, err = acceptedQueue.Items(p.Mode)
		require.NoError(t, err)
		require.Len(t, accepted, 1)

		assert.Equal(t, matchProposal.ID(), accepted[0])

		err = repository.Delete(matchProposal)
		require.NoError(t, err)

		accepted, err = acceptedQueue.Items(p.Mode)
		require.NoError(t, err)
		require.Empty(t, accepted)
	})

	t.Run("removes match proposal from list of accepted when it becomes ready to be made", func(t *testing.T) {
		p := playergen.MustNew()

		matchProposal := matchmaker.NewMatchProposal(p)
		matchProposal.SetAccepted()

		err := repository.Save(matchProposal)
		require.NoError(t, err)

		accepted, err := acceptedQueue.Items(p.Mode)
		require.NoError(t, err)
		require.Len(t, accepted, 1)

		matchProposal.SetToBeMade()

		err = repository.Save(matchProposal)
		require.NoError(t, err)

		accepted, err = acceptedQueue.Items(p.Mode)
		require.NoError(t, err)
		require.Empty(t, accepted)
	})
}
