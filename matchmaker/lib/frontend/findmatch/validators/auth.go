package validators

import (
	"context"
	"fmt"

	"github.com/lestrrat-go/jwx/v2/jwa"
	"github.com/lestrrat-go/jwx/v2/jwt"

	"github.com/horizon-games/OpenSky/matchmaker/config"
	"github.com/horizon-games/OpenSky/matchmaker/lib/frontend"
	"github.com/horizon-games/OpenSky/matchmaker/lib/messages"
)

type AuthValidator struct {
	authenticationBypassEnabled bool
	jwtSecret                   []byte
}

func NewAuthValidator(cfg *config.Config) *AuthValidator {
	return &AuthValidator{
		authenticationBypassEnabled: cfg.Testing.AuthenticationBypassEnabled,
		jwtSecret:                   []byte(cfg.Auth.JWTSecret),
	}
}

func (v *AuthValidator) IsValid(_ context.Context, _ *frontend.Client, msg *messages.FindMatchMessage) (bool, error) {
	if v.authenticationBypassEnabled {
		return true, nil
	}

	_, err := jwt.ParseString(
		msg.AuthToken,
		jwt.WithClaimValue("account", msg.PrivateSeed.Player.String()),
		jwt.WithClaimValue("app", "OpenSky"),
		jwt.WithKey(jwa.HS256, v.jwtSecret),
	)
	if err != nil {
		return false, fmt.Errorf("invalid private seed: %w", err)
	}

	return true, nil
}
