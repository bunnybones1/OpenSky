package matchvalidators_test

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/horizon-games/OpenSky/matchmaker/lib/matchmaker/matching/matchers/matchvalidators"
	"github.com/horizon-games/OpenSky/matchmaker/matchmakertest/playergen"
)

func TestSessionValidator(t *testing.T) {
	validator := matchvalidators.NewSessionValidator()

	tests := []struct {
		name                 string
		p1Session, p2Session string
		expected             bool
	}{
		{
			name:     "valid when sessions are empty",
			expected: true,
		},
		{
			name:      "valid when sessions are not empty and they are same",
			p1Session: "foo",
			p2Session: "foo",
			expected:  true,
		},
		{
			name:      "invalid when sessions are not empty and they are different",
			p1Session: "foo",
			p2Session: "bar",
			expected:  false,
		},
		{
			name:      "invalid when player 1 has empty session and player 2 does not",
			p2Session: "bar",
			expected:  false,
		},
		{
			name:      "invalid when player 2 has empty session and player 1 does not",
			p1Session: "foo",
			expected:  false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			p1 := playergen.MustNew(
				playergen.WithSessionID(tt.p1Session),
			)

			p2 := playergen.MustNew(
				playergen.WithSessionID(tt.p2Session),
			)

			isValid, err := validator.IsValid(p1, p2)
			require.NoError(t, err)
			assert.Equal(t, tt.expected, isValid)
		})
	}
}
