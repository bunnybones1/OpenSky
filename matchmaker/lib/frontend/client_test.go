package frontend_test

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/horizon-games/OpenSky/matchmaker/lib/frontend"
	"github.com/horizon-games/OpenSky/matchmaker/lib/playerchannel"
	"github.com/horizon-games/OpenSky/matchmaker/matchmakertest"
	"github.com/horizon-games/OpenSky/matchmaker/matchmakertest/playergen"
)

func TestClient(t *testing.T) {
	logger := matchmakertest.NewAssertNoErrorLogger(t)
	clientConn := matchmakertest.NewClientConnNop()
	ipAddress := "1.2.3.4"

	client := frontend.NewClient(logger, clientConn, ipAddress)

	t.Run("ID", func(t *testing.T) {
		id := client.ShortID()
		assert.Len(t, id, 8)
	})

	t.Run("player", func(t *testing.T) {
		p := playergen.MustNew()

		assert.False(t, client.HasPlayer())

		client.SetPlayer(p)

		require.True(t, client.HasPlayer())
		assert.Equal(t, p, client.Player())
	})

	t.Run("channel", func(t *testing.T) {
		channel := &playerchannel.PlayerChannel{}

		assert.False(t, client.HasChannel())

		client.SetChannel(channel)

		require.True(t, client.HasChannel())
		assert.Equal(t, channel, client.Channel())
	})
}
