package appleappstore_test

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/horizon-games/OpenSky/api/config"
	"github.com/horizon-games/OpenSky/api/lib/payments/appleappstore"
)

func TestClient(t *testing.T) {
	type server struct {
		code int
		body string
	}

	tests := []struct {
		name        string
		testServer  *server
		sandboxServ *server
		expected    *appleappstore.Response
		err         error
	}{
		{
			name: "use sandbox when response status is 21007",
			testServer: &server{
				code: http.StatusOK,
				body: `{"status": 21007}`,
			},
			sandboxServ: &server{
				code: http.StatusOK,
				body: `{"status": 0}`,
			},
			expected: &appleappstore.Response{
				Status: 0,
			},
		},
		{
			name: "bad payload",
			testServer: &server{
				code: http.StatusOK,
				body: `{"status": 21002}`,
			},
			expected: &appleappstore.Response{
				Status: 21002,
			},
		},
		{
			name: "success",
			testServer: &server{
				code: http.StatusOK,
				body: `{"status": 0}`,
			},
			expected: &appleappstore.Response{
				Status: 0,
			},
		},
		{
			name: "bad http status code",
			testServer: &server{
				code: http.StatusInternalServerError,
				body: `qwerty!@#$%^`,
			},
			err: appleappstore.ErrAppleAppStoreServer,
		},
	}

	cfg := config.OpenSkyMobileIAPConfig{
		Enabled: true,
	}

	ctx := context.Background()

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			client := appleappstore.NewClient(cfg, http.DefaultClient)
			client.WithSandboxURL("localhost")

			testServer := httptest.NewServer(serverWithResponse(t, tt.testServer.code, tt.testServer.body))
			defer testServer.Close()

			client.WithProductionURL(testServer.URL)
			if tt.sandboxServ != nil {
				sandboxServer := httptest.NewServer(serverWithResponse(t, tt.sandboxServ.code, tt.sandboxServ.body))
				defer sandboxServer.Close()

				client.WithSandboxURL(sandboxServer.URL)
			}

			response, err := client.Verify(ctx, "receipt data")
			require.ErrorIs(t, err, tt.err)
			assert.Equal(t, tt.expected, response)
		})
	}
}

func serverWithResponse(t *testing.T, statusCode int, response string) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if http.MethodPost == r.Method {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(statusCode)

			_, err := w.Write([]byte(response))
			require.NoError(t, err)
		} else {
			_, err := w.Write([]byte(`unsupported request`))
			require.NoError(t, err)
		}
	})
}
