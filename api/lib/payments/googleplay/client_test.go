package googleplay

import (
	"context"
	"crypto/rand"
	"crypto/rsa"
	"crypto/x509"
	"encoding/json"
	"encoding/pem"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/stretchr/testify/require"

	"github.com/horizon-games/OpenSky/api/config"
)

type serviceAccountKey struct {
	Type                    string `json:"type"`
	ProjectID               string `json:"project_id"`
	PrivateKeyID            string `json:"private_key_id"`
	PrivateKey              string `json:"private_key"`
	ClientEmail             string `json:"client_email"`
	ClientID                string `json:"client_id"`
	AuthURI                 string `json:"auth_uri"`
	TokenURI                string `json:"token_uri"`
	AuthProviderX509CertURL string `json:"auth_provider_x509_cert_url"`
	ClientX509CertURL       string `json:"client_x509_cert_url"`
}

func makeServiceAccountJSON(t *testing.T, tokenURI string) string {
	t.Helper()

	privateKey, err := rsa.GenerateKey(rand.Reader, 2048)
	require.NoError(t, err)

	privateKeyDER, err := x509.MarshalPKCS8PrivateKey(privateKey)
	require.NoError(t, err)

	privateKeyPEM := pem.EncodeToMemory(&pem.Block{
		Type:  "PRIVATE KEY",
		Bytes: privateKeyDER,
	})

	key := serviceAccountKey{
		Type:                    "service_account",
		ProjectID:               "test-project",
		PrivateKeyID:            "test-private-key-id",
		PrivateKey:              string(privateKeyPEM),
		ClientEmail:             "test-account@example.com",
		ClientID:                "1234567890",
		AuthURI:                 "https://accounts.google.com/o/oauth2/auth",
		TokenURI:                tokenURI,
		AuthProviderX509CertURL: "https://www.googleapis.com/oauth2/v1/certs",
		ClientX509CertURL:       "https://example.invalid/test-cert.pem",
	}

	payload, err := json.Marshal(key)
	require.NoError(t, err)

	return string(payload)
}

func newMockGoogleServer() *httptest.Server {
	return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/token":
			w.Header().Set("Content-Type", "application/json")
			_, _ = w.Write([]byte(`{"access_token":"test-access-token","token_type":"Bearer","expires_in":3600}`))
			return
		case "/applications/package/purchases/products/productID/tokens/purchaseToken":
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusNotFound)
			_, _ = w.Write([]byte(`{"error":{"code":404,"message":"No application was found for the given package name.","status":"NOT_FOUND"}}`))
			return
		default:
			if strings.HasSuffix(
				r.URL.Path,
				"/applications/package/purchases/products/productID/tokens/purchaseToken",
			) {
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusNotFound)
				_, _ = w.Write([]byte(`{"error":{"code":404,"message":"No application was found for the given package name.","status":"NOT_FOUND"}}`))
				return
			}

			w.WriteHeader(http.StatusNotFound)
			_, _ = w.Write([]byte(fmt.Sprintf(`{"error":{"code":404,"message":"unexpected path %q"}}`, r.URL.Path)))
		}
	}))
}

func TestClient(t *testing.T) {
	server := newMockGoogleServer()
	defer server.Close()

	jsonKey := makeServiceAccountJSON(t, server.URL+"/token")
	invalidKey := `{"type":"service_account","private_key":"invalid","token_uri":"` + server.URL + `/token"}`

	t.Run("JSON key", func(t *testing.T) {
		t.Parallel()

		t.Run("fails when invalid", func(t *testing.T) {
			t.Parallel()

			cfg := config.OpenSkyMobileIAPConfig{
				Enabled:       true,
				GoogleKeyData: invalidKey,
			}

			_, err := NewClient(cfg, server.Client())
			require.ErrorContains(t, err, "configure JWT from JSON")
		})

		t.Run("fails when nil", func(t *testing.T) {
			t.Parallel()

			cfg := config.OpenSkyMobileIAPConfig{
				Enabled: true,
			}

			_, err := NewClient(cfg, server.Client())
			require.ErrorContains(t, err, "unexpected end of JSON input")
		})

		t.Run("success when valid", func(t *testing.T) {
			t.Parallel()

			cfg := config.OpenSkyMobileIAPConfig{
				Enabled:       true,
				GoogleKeyData: jsonKey,
			}

			_, err := NewClient(cfg, server.Client())
			require.NoError(t, err)
		})
	})

	t.Run("verify", func(t *testing.T) {
		ctx := context.Background()

		cfg := config.OpenSkyMobileIAPConfig{
			Enabled:       true,
			GoogleKeyData: jsonKey,
		}

		client, err := NewClient(cfg, server.Client())
		require.NoError(t, err)

		client.service.BasePath = server.URL + "/"

		_, err = client.Verify(ctx, "package", "productID", "purchaseToken")
		require.ErrorContains(t, err, "googleapi: Error 404")
		require.ErrorContains(t, err, "No application was found for the given package name")
	})
}
