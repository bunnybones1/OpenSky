package frontend_test

import (
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/horizon-games/OpenSky/matchmaker/config"
	"github.com/horizon-games/OpenSky/matchmaker/lib/frontend"
)

func TestIPAddressRetriever(t *testing.T) {
	cfg := &config.Config{
		Mode: config.DevelopmentMode,
	}

	ipAddress := "1.2.3.4"

	retriever := frontend.NewIPAddressRetriever(cfg)

	t.Run("uses value of true-client-ip header when it is not empty", func(t *testing.T) {
		req := httptest.NewRequest("", "/", nil)
		req.Header.Add("true-client-ip", ipAddress)

		result, err := retriever.Retrieve(req)
		require.NoError(t, err)

		assert.Equal(t, ipAddress, result)
	})

	t.Run("returns 127.0.0.1 when origin contains localhost", func(t *testing.T) {
		req := httptest.NewRequest("", "/", nil)
		req.Header.Add("origin", "foo.localhost")

		result, err := retriever.Retrieve(req)
		require.NoError(t, err)

		assert.Equal(t, "127.0.0.1", result)
	})

	t.Run("returns 127.0.0.1 when origin contains 0xhorizon.net", func(t *testing.T) {
		req := httptest.NewRequest("", "/", nil)
		req.Header.Add("origin", "foo.0xhorizon.net")

		result, err := retriever.Retrieve(req)
		require.NoError(t, err)

		assert.Equal(t, "127.0.0.1", result)
	})

	t.Run("returns host when remote address is not empty and service is in development mode", func(t *testing.T) {
		req := httptest.NewRequest("", "/", nil)
		req.RemoteAddr = "192.0.0.1:8000"

		result, err := retriever.Retrieve(req)
		require.NoError(t, err)

		assert.Equal(t, "192.0.0.1", result)
	})

	t.Run("fails when no sources have IP address", func(t *testing.T) {
		req := httptest.NewRequest("", "/", nil)
		req.RemoteAddr = ""

		result, err := retriever.Retrieve(req)
		require.ErrorContains(t, err, "unable to determine IP address")

		assert.Empty(t, result)
	})

	t.Run("fails when remote address is set but service mode is not development", func(t *testing.T) {
		req := httptest.NewRequest("", "/", nil)

		cfg := &config.Config{
			Mode: config.ProductionMode,
		}

		retriever := frontend.NewIPAddressRetriever(cfg)

		result, err := retriever.Retrieve(req)
		require.ErrorContains(t, err, "unable to determine IP address")

		assert.Empty(t, result)
	})
}
