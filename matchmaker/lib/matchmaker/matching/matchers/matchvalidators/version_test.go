package matchvalidators_test

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/horizon-games/OpenSky/matchmaker/lib/matchmaker/matching/matchers/matchvalidators"
	"github.com/horizon-games/OpenSky/matchmaker/matchmakertest/playergen"
)

func TestVersionValidator(t *testing.T) {
	validator := matchvalidators.NewVersionValidator()

	tests := []struct {
		name                             string
		p1ClientVersion, p2ClientVersion string
		expected                         bool
	}{
		{
			name:            "valid when client versions are same",
			p1ClientVersion: "foo",
			p2ClientVersion: "foo",
			expected:        true,
		},
		{
			name:            "invalid when client versions are different",
			p1ClientVersion: "foo",
			p2ClientVersion: "bar",
			expected:        false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			p1 := playergen.MustNew(
				playergen.WithClientVersion(tt.p1ClientVersion),
			)

			p2 := playergen.MustNew(
				playergen.WithClientVersion(tt.p2ClientVersion),
			)

			isValid, err := validator.IsValid(p1, p2)
			require.NoError(t, err)
			assert.Equal(t, tt.expected, isValid)
		})
	}
}
