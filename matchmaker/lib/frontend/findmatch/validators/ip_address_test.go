package validators_test

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/horizon-games/OpenSky/matchmaker/config"
	"github.com/horizon-games/OpenSky/matchmaker/lib/frontend"
	"github.com/horizon-games/OpenSky/matchmaker/lib/frontend/findmatch/validators"
	"github.com/horizon-games/OpenSky/matchmaker/matchmakertest"
	"github.com/horizon-games/OpenSky/matchmaker/matchmakertest/playergen"
)

func TestIPAddressValidatorValidator(t *testing.T) {
	ctx := context.Background()

	p := playergen.MustNew()

	tests := []struct {
		name             string
		allowSameIPMatch bool
		ipAddress        string
		isValid          bool
	}{
		{
			name:             "valid when same IP is allowed and IP is empty",
			allowSameIPMatch: true,
			isValid:          true,
		},
		{
			name:             "valid when same IP is not allowed and IP is not empty",
			allowSameIPMatch: false,
			ipAddress:        "1.2.3.4",
			isValid:          true,
		},
		{
			name:             "invalid when same IP is not allowed and IP is empty",
			allowSameIPMatch: false,
			isValid:          false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			cfg := &config.Config{
				MatchMaker: config.MatchMakerConfig{
					AllowSameIPMatch: tt.allowSameIPMatch,
				},
			}

			validator := validators.NewIPAddressValidatorValidator(cfg)

			client := frontend.NewClient(
				matchmakertest.NewAssertNoErrorLogger(t),
				matchmakertest.NewClientConnNop(),
				tt.ipAddress,
			)
			client.SetPlayer(p)

			isValid, err := validator.IsValid(ctx, client, nil)
			require.NoError(t, err)
			assert.Equal(t, tt.isValid, isValid)
		})
	}
}
