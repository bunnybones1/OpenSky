package validators

import (
	"context"

	"github.com/horizon-games/OpenSky/matchmaker/config"
	"github.com/horizon-games/OpenSky/matchmaker/lib/frontend"
	"github.com/horizon-games/OpenSky/matchmaker/lib/messages"
)

type IPAddressValidator struct {
	allowSameIPMatch bool
}

func NewIPAddressValidatorValidator(cfg *config.Config) *IPAddressValidator {
	return &IPAddressValidator{
		allowSameIPMatch: cfg.MatchMaker.AllowSameIPMatch,
	}
}

func (v *IPAddressValidator) IsValid(_ context.Context, client *frontend.Client, _ *messages.FindMatchMessage) (bool, error) {
	if v.allowSameIPMatch {
		return true, nil
	}

	if len(client.Player().IPAddress) == 0 {
		return false, nil
	}

	return true, nil
}
