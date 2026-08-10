package validators_test

import (
	"context"
	"testing"

	"github.com/lestrrat-go/jwx/v2/jwa"
	"github.com/lestrrat-go/jwx/v2/jwt"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/horizon-games/OpenSky/matchmaker/config"
	"github.com/horizon-games/OpenSky/matchmaker/lib/frontend/findmatch/validators"
	"github.com/horizon-games/OpenSky/matchmaker/lib/messages"
	"github.com/horizon-games/OpenSky/matchmaker/matchmakertest/playergen"
)

func TestAuthValidator(t *testing.T) {
	ctx := context.Background()

	p := playergen.MustNew()

	jwtSecret := "secret"

	cfg := &config.Config{
		Auth: config.Auth{
			JWTSecret: jwtSecret,
		},
	}

	validator := validators.NewAuthValidator(cfg)

	t.Run("valid when auth token is valid", func(t *testing.T) {
		token, err := jwt.NewBuilder().
			Claim("account", p.PrivateSeed.Player.String()).
			Claim("app", "OpenSky").
			Build()
		require.NoError(t, err)

		authToken, err := jwt.Sign(
			token,
			jwt.WithKey(jwa.HS256, []byte(jwtSecret)),
		)
		require.NoError(t, err)

		msg := &messages.FindMatchMessage{
			AuthToken:   string(authToken),
			PrivateSeed: p.PrivateSeed,
		}

		isValid, err := validator.IsValid(ctx, nil, msg)
		require.NoError(t, err)
		assert.True(t, isValid)
	})

	t.Run("invalid when auth token is invalid", func(t *testing.T) {
		msg := &messages.FindMatchMessage{
			AuthToken:   "invalid",
			PrivateSeed: p.PrivateSeed,
		}

		isValid, err := validator.IsValid(ctx, nil, msg)
		require.ErrorContains(t, err, "invalid private seed")
		assert.False(t, isValid)
	})

	t.Run("valid when bypass is enabled", func(t *testing.T) {
		cfg := &config.Config{
			Testing: config.TestingConfig{
				AuthenticationBypassEnabled: true,
			},
		}

		validator := validators.NewAuthValidator(cfg)

		isValid, err := validator.IsValid(ctx, nil, nil)
		require.NoError(t, err)
		assert.True(t, isValid)
	})
}
