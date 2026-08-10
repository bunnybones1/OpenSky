package validators_test

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/horizon-games/OpenSky/matchmaker/config"
	mmerrors "github.com/horizon-games/OpenSky/matchmaker/lib/errors"
	"github.com/horizon-games/OpenSky/matchmaker/lib/frontend/findmatch/validators"
	"github.com/horizon-games/OpenSky/matchmaker/lib/messages"
)

func TestVersionValidator(t *testing.T) {
	versionHash := "some hash"

	cfg := &config.Config{
		VersionHash: versionHash,
	}

	ctx := context.Background()

	validator := validators.NewVersionValidator(cfg)

	t.Run("valid when version of message is same as service", func(t *testing.T) {
		msg := &messages.FindMatchMessage{
			VersionHash: versionHash,
		}

		isValid, err := validator.IsValid(ctx, nil, msg)
		require.NoError(t, err)
		assert.True(t, isValid)
	})

	t.Run("invalid when version of message is different than service", func(t *testing.T) {
		msg := &messages.FindMatchMessage{
			VersionHash: "different hash",
		}

		isValid, err := validator.IsValid(ctx, nil, msg)
		require.ErrorIs(t, err, mmerrors.ErrOutdatedClient)
		assert.False(t, isValid)
	})
}
