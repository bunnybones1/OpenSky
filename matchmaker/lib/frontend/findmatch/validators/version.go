package validators

import (
	"context"

	"github.com/horizon-games/OpenSky/matchmaker/config"
	mmerrors "github.com/horizon-games/OpenSky/matchmaker/lib/errors"
	"github.com/horizon-games/OpenSky/matchmaker/lib/frontend"
	"github.com/horizon-games/OpenSky/matchmaker/lib/messages"
)

type VersionValidator struct {
	latestVersionHash string
}

func NewVersionValidator(cfg *config.Config) *VersionValidator {
	return &VersionValidator{
		latestVersionHash: cfg.VersionHash,
	}
}

func (v *VersionValidator) IsValid(_ context.Context, _ *frontend.Client, msg *messages.FindMatchMessage) (bool, error) {
	if msg.VersionHash != v.latestVersionHash {
		return false, mmerrors.ErrOutdatedClient
	}

	return true, nil
}
