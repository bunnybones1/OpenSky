package frontend_test

import (
	"testing"

	"github.com/gorilla/websocket"
	"github.com/stretchr/testify/require"

	"github.com/horizon-games/OpenSky/matchmaker/lib/frontend"
	"github.com/horizon-games/OpenSky/matchmaker/matchmakertest"
)

func TestClientFactory(t *testing.T) {
	wsConn := &websocket.Conn{}

	ipAddress := "1.2.3.4"

	factory := frontend.NewClientFactory(matchmakertest.NewAssertNoErrorLogger(t))

	client := factory.Create(wsConn, ipAddress)
	require.NotNil(t, client)
}
