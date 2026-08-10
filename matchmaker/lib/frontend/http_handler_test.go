package frontend_test

import (
	"fmt"
	"net/http"
	"testing"

	"github.com/gorilla/websocket"
	"github.com/rs/zerolog"
	"github.com/stretchr/testify/require"
	"go.uber.org/mock/gomock"

	"github.com/horizon-games/OpenSky/matchmaker/lib/frontend"
	"github.com/horizon-games/OpenSky/matchmaker/lib/frontend/mock"
)

func TestHTTPHandler(t *testing.T) {
	var ipAddressRetriever *mock.MockIPAddressRetriever

	var websocketUpgrader *mock.MockWebsocketUpgrader

	var websocketHandler *mock.MockWebsocketHandler

	// Setup
	{
		// Mocks
		{
			ctrl := gomock.NewController(t)

			ipAddressRetriever = mock.NewMockIPAddressRetriever(ctrl)
			websocketUpgrader = mock.NewMockWebsocketUpgrader(ctrl)
			websocketHandler = mock.NewMockWebsocketHandler(ctrl)
		}
	}

	ipAddress := "1.2.3.4"

	wsConn := &websocket.Conn{}

	someError := fmt.Errorf("some error")

	handler := frontend.NewHTTPHandler(
		zerolog.Nop(),
		ipAddressRetriever,
		websocketUpgrader,
		websocketHandler,
		nil,
		nil,
		nil,
		nil,
		nil,
		nil,
	)

	t.Run("match maker", func(t *testing.T) {
		t.Run("converts http call to websocket connection and delegates handling to websocket handler", func(t *testing.T) {
			ipAddressRetriever.EXPECT().Retrieve(gomock.Any()).Return(ipAddress, nil)

			websocketUpgrader.EXPECT().Upgrade(gomock.Any(), gomock.Any(), nil).Return(wsConn, nil)

			websocketHandler.EXPECT().Handle(gomock.Any(), wsConn, ipAddress)

			require.HTTPSuccess(t, handler.MatchMakerHandle, "", "/", nil)
		})

		t.Run("ends request and does not fail when handling websocket connection fails", func(t *testing.T) {
			ipAddressRetriever.EXPECT().Retrieve(gomock.Any()).Return(ipAddress, nil)

			websocketUpgrader.EXPECT().Upgrade(gomock.Any(), gomock.Any(), nil).Return(wsConn, nil)

			websocketHandler.EXPECT().Handle(gomock.Any(), wsConn, ipAddress).Return(someError)

			require.HTTPSuccess(t, handler.MatchMakerHandle, "", "/", nil)
		})

		t.Run("fails when upgrading request to websocket fails", func(t *testing.T) {
			ipAddressRetriever.EXPECT().Retrieve(gomock.Any()).Return(ipAddress, nil)

			websocketUpgrader.EXPECT().Upgrade(gomock.Any(), gomock.Any(), nil).Return(nil, someError)

			require.HTTPStatusCode(t, handler.MatchMakerHandle, "", "/", nil, http.StatusBadRequest)
		})

		t.Run("fails when retrieving IP address fails", func(t *testing.T) {
			ipAddressRetriever.EXPECT().Retrieve(gomock.Any()).Return("", someError)

			require.HTTPStatusCode(t, handler.MatchMakerHandle, "", "/", nil, http.StatusBadRequest)
		})
	})
}
