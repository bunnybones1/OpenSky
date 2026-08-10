package custommatchmaker_test

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/horizon-games/OpenSky/matchmaker/config"
	mmerrors "github.com/horizon-games/OpenSky/matchmaker/lib/errors"
	"github.com/horizon-games/OpenSky/matchmaker/lib/matchmaker/custommatchmaker"
	"github.com/horizon-games/OpenSky/matchmaker/lib/player"
	"github.com/horizon-games/OpenSky/matchmaker/lib/store"
	"github.com/horizon-games/OpenSky/matchmaker/matchmakertest/playergen"
)

func TestPlayerRepository(t *testing.T) {
	cfg := &config.Config{}
	keyValStore := store.NewMemStore()

	repository := custommatchmaker.NewPlayerRepository(cfg, keyValStore)

	t.Run("saves, loads and deletes player", func(t *testing.T) {
		p := playergen.MustNew()

		err := repository.Save(p)
		require.NoError(t, err)

		loadedP, err := repository.Load(p.Address())
		require.NoError(t, err)
		assert.Equal(t, p, loadedP)

		err = repository.Delete(p)
		require.NoError(t, err)

		loadedP, err = repository.Load(p.Address())
		require.ErrorIs(t, err, mmerrors.ErrMissingPlayer)
		assert.Nil(t, loadedP)
	})

	t.Run("sets and get status", func(t *testing.T) {
		p := playergen.MustNew()

		status, err := repository.GetStatus(p)
		require.ErrorContains(t, err, "load map")
		assert.Equal(t, player.PlayerStatus_ERROR, status)

		err = repository.SetStatus(p, player.PlayerStatus_CONNECTED)
		require.NoError(t, err)

		status, err = repository.GetStatus(p)
		require.NoError(t, err)
		assert.Equal(t, player.PlayerStatus_CONNECTED, status)
	})
}
