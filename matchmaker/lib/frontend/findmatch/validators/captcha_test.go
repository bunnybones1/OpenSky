package validators_test

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/rs/zerolog"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/horizon-games/OpenSky/matchmaker/config"
	"github.com/horizon-games/OpenSky/matchmaker/lib/frontend"
	"github.com/horizon-games/OpenSky/matchmaker/lib/frontend/findmatch/validators"
	"github.com/horizon-games/OpenSky/matchmaker/lib/messages"
	"github.com/horizon-games/OpenSky/matchmaker/lib/store"
	"github.com/horizon-games/OpenSky/matchmaker/matchmakertest"
	"github.com/horizon-games/OpenSky/matchmaker/matchmakertest/playergen"
)

func TestCaptchaValidator(t *testing.T) {
	p := playergen.MustNew()

	client := newClient(matchmakertest.NewAssertNoErrorLogger(t))
	client.SetPlayer(p)

	verifyTokenResponse := "foo"

	msg := &messages.FindMatchMessage{
		VerifyToken: messages.HCaptchaVerifyToken{
			Response: verifyTokenResponse,
		},
	}

	ctx := context.Background()

	logger := matchmakertest.NewAssertNoErrorLogger(t)

	keyValStore := store.NewMemStore()

	captchaServer := newCaptchaServer(t, validators.HCaptchaResponse{
		Success:            true,
		ChallengeTimestamp: time.Now(),
	})

	httpClient := captchaServer.Client()

	cfg := &config.Config{
		HCaptcha: config.HCaptchaConfig{
			URL: captchaServer.URL,
		},
	}

	validator := validators.NewCaptchaValidator(cfg, logger, keyValStore, httpClient)

	t.Run("valid when verification passes and caches result", func(t *testing.T) {
		p := playergen.MustNew()

		client := newClient(logger)
		client.SetPlayer(p)

		isValid, err := validator.IsValid(ctx, client, msg)
		require.NoError(t, err)
		assert.True(t, isValid)

		ttl, err := keyValStore.TTL(fmt.Sprintf("player_interactive_validation_passed:%s", p.Address()))
		require.NoError(t, err)
		assert.NotZero(t, ttl)
	})

	t.Run("valid when cached result is valid", func(t *testing.T) {
		p := playergen.MustNew()

		client := newClient(logger)
		client.SetPlayer(p)

		err := keyValStore.StoreTTL(fmt.Sprintf("player_interactive_validation_passed:%s", p.Address()), nil, time.Minute)
		require.NoError(t, err)

		isValid, err := validator.IsValid(ctx, client, nil)
		require.NoError(t, err)
		assert.True(t, isValid)
	})

	t.Run("validates when cached result is expired", func(t *testing.T) {
		p := playergen.MustNew()

		client := newClient(logger)
		client.SetPlayer(p)

		err := keyValStore.StoreTTL(fmt.Sprintf("player_interactive_validation_passed:%s", p.Address()), nil, -time.Minute)
		require.NoError(t, err)

		isValid, err := validator.IsValid(ctx, client, msg)
		require.NoError(t, err)
		assert.True(t, isValid)
	})

	t.Run("invalid and shadow bans player when verification does not pass", func(t *testing.T) {
		p := playergen.MustNew()

		client := newClient(logger)
		client.SetPlayer(p)

		captchaServer := newCaptchaServer(t, validators.HCaptchaResponse{
			Success: false,
		})

		httpClient := captchaServer.Client()

		cfg := &config.Config{
			HCaptcha: config.HCaptchaConfig{
				URL: captchaServer.URL,
			},
		}

		validator := validators.NewCaptchaValidator(cfg, logger, keyValStore, httpClient)

		isValid, err := validator.IsValid(ctx, client, msg)
		require.NoError(t, err)
		assert.False(t, isValid)

		assert.True(t, *p.ShadowBanned)
	})

	t.Run("invalid when verification score is higher or equal to minimal score", func(t *testing.T) {
		p := playergen.MustNew()

		client := newClient(logger)
		client.SetPlayer(p)

		captchaServer := newCaptchaServer(t, validators.HCaptchaResponse{
			Success:            true,
			ChallengeTimestamp: time.Now(),
			Score:              1,
		})

		httpClient := captchaServer.Client()

		cfg := &config.Config{
			HCaptcha: config.HCaptchaConfig{
				URL: captchaServer.URL,
			},
		}

		validator := validators.NewCaptchaValidator(cfg, logger, keyValStore, httpClient)

		isValid, err := validator.IsValid(ctx, client, msg)
		require.NoError(t, err)
		assert.False(t, isValid)
	})

	t.Run("invalid when verification challenge is invalid", func(t *testing.T) {
		p := playergen.MustNew()

		client := newClient(logger)
		client.SetPlayer(p)

		captchaServer := newCaptchaServer(t, validators.HCaptchaResponse{
			Success:            true,
			ChallengeTimestamp: time.Now().Add(time.Hour),
		})

		httpClient := captchaServer.Client()

		cfg := &config.Config{
			HCaptcha: config.HCaptchaConfig{
				URL: captchaServer.URL,
			},
		}

		logger := matchmakertest.NewAssertErrorContainsLogger(t, "captcha provider error")

		validator := validators.NewCaptchaValidator(cfg, logger, keyValStore, httpClient)

		isValid, err := validator.IsValid(ctx, client, msg)
		require.NoError(t, err)
		assert.False(t, isValid)
	})

	t.Run("invalid when verification site key is different", func(t *testing.T) {
		p := playergen.MustNew()

		client := newClient(logger)
		client.SetPlayer(p)

		captchaServer := newCaptchaServer(t, validators.HCaptchaResponse{
			Success: true,
			Sitekey: "bar",
		})

		httpClient := captchaServer.Client()

		cfg := &config.Config{
			HCaptcha: config.HCaptchaConfig{
				URL: captchaServer.URL,
			},
		}

		logger := matchmakertest.NewAssertErrorContainsLogger(t, "captcha provider error")

		validator := validators.NewCaptchaValidator(cfg, logger, keyValStore, httpClient)

		isValid, err := validator.IsValid(ctx, client, msg)
		require.NoError(t, err)
		assert.False(t, isValid)
	})

	t.Run("invalid when verification error code is not empty", func(t *testing.T) {
		p := playergen.MustNew()

		client := newClient(logger)
		client.SetPlayer(p)

		captchaServer := newCaptchaServer(t, validators.HCaptchaResponse{
			ErrorCodes: []string{"foo"},
		})

		httpClient := captchaServer.Client()

		cfg := &config.Config{
			HCaptcha: config.HCaptchaConfig{
				URL: captchaServer.URL,
			},
		}

		logger := matchmakertest.NewAssertErrorContainsLogger(t, "captcha provider error")

		validator := validators.NewCaptchaValidator(cfg, logger, keyValStore, httpClient)

		isValid, err := validator.IsValid(ctx, client, msg)
		require.NoError(t, err)
		assert.False(t, isValid)
	})

	t.Run("invalid when verify token is empty", func(t *testing.T) {
		p := playergen.MustNew()

		client := newClient(logger)
		client.SetPlayer(p)

		msg := &messages.FindMatchMessage{
			VerifyToken: messages.HCaptchaVerifyToken{
				Response: "",
			},
		}

		cfg := &config.Config{
			HCaptcha: config.HCaptchaConfig{
				URL: captchaServer.URL,
			},
		}

		logger := matchmakertest.NewAssertErrorContainsLogger(t, "captcha provider error")

		validator := validators.NewCaptchaValidator(cfg, logger, keyValStore, nil)

		isValid, err := validator.IsValid(ctx, client, msg)
		require.NoError(t, err)
		assert.False(t, isValid)
	})

	t.Run("valid when it is disabled", func(t *testing.T) {
		cfg := &config.Config{
			HCaptcha: config.HCaptchaConfig{
				Disabled: true,
			},
		}

		validator := validators.NewCaptchaValidator(cfg, logger, keyValStore, nil)

		isValid, err := validator.IsValid(ctx, nil, nil)
		require.NoError(t, err)
		assert.True(t, isValid)
	})

	t.Run("valid when verification bypass is enabled", func(t *testing.T) {
		p := playergen.MustNew()

		client := newClient(logger)
		client.SetPlayer(p)

		cfg := &config.Config{
			Testing: config.TestingConfig{
				CaptchaBypassEnabled: true,
			},
		}

		validator := validators.NewCaptchaValidator(cfg, logger, keyValStore, nil)

		isValid, err := validator.IsValid(ctx, client, msg)
		require.NoError(t, err)
		assert.True(t, isValid)
	})
}

func newCaptchaServer(t *testing.T, resp validators.HCaptchaResponse) *httptest.Server {
	return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		b, err := json.Marshal(resp)
		require.NoError(t, err)

		_, err = w.Write(b)
		require.NoError(t, err)
	}))
}

func newClient(logger zerolog.Logger) *frontend.Client {
	return frontend.NewClient(logger, matchmakertest.NewClientConnNop(), "")
}
