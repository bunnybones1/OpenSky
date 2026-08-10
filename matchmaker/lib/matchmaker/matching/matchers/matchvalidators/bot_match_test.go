package matchvalidators_test

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/horizon-games/OpenSky/api/proto"
	"github.com/horizon-games/OpenSky/matchmaker/config"
	"github.com/horizon-games/OpenSky/matchmaker/lib/matchmaker/matching/matchers/matchvalidators"
	"github.com/horizon-games/OpenSky/matchmaker/lib/player"
	"github.com/horizon-games/OpenSky/matchmaker/matchmakertest/playergen"
)

func TestBotMatchValidator(t *testing.T) {
	cfg := &config.Config{}

	validator := matchvalidators.NewBotMatchValidator(cfg)

	tests := []struct {
		name     string
		rank     proto.PlayerRank
		lost     bool
		waitTime time.Duration
		expected bool
	}{
		{
			name:     "valid when rank is lower than trainee and wait time is higher than 10s and won last match",
			rank:     proto.PlayerRank_WANDERER,
			waitTime: 15 * time.Second,
			expected: true,
		},
		{
			name:     "valid when rank is lower than trainee and wait time is lower than 10s and lost match",
			rank:     proto.PlayerRank_WANDERER,
			lost:     true,
			waitTime: 5 * time.Second,
			expected: true,
		},
		{
			name:     "invalid when rank is lower than trainee and wait time is lower than 10s and won match",
			rank:     proto.PlayerRank_WANDERER,
			waitTime: 5 * time.Second,
			expected: false,
		},
		{
			name:     "valid when rank is trainee and wait time is higher than 20s and won last match",
			rank:     proto.PlayerRank_TRAINEE,
			waitTime: 25 * time.Second,
			expected: true,
		},
		{
			name:     "valid when rank is trainee and wait time is lower than 20s and lost match",
			rank:     proto.PlayerRank_TRAINEE,
			lost:     true,
			waitTime: 15 * time.Second,
			expected: true,
		},
		{
			name:     "invalid when rank is trainee and wait time is lower than 20s and won match",
			rank:     proto.PlayerRank_TRAINEE,
			waitTime: 15 * time.Second,
			expected: false,
		},
		{
			name:     "valid when rank is apprentice and wait time is higher than 30s and won last match",
			rank:     proto.PlayerRank_APPRENTICE,
			waitTime: 35 * time.Second,
			expected: true,
		},
		{
			name:     "valid when rank is apprentice and wait time is lower than 30s and lost match",
			rank:     proto.PlayerRank_APPRENTICE,
			lost:     true,
			waitTime: 25 * time.Second,
			expected: true,
		},
		{
			name:     "invalid when rank is apprentice and wait time is lower than 30s and won match",
			rank:     proto.PlayerRank_APPRENTICE,
			waitTime: 25 * time.Second,
			expected: false,
		},
		{
			name:     "invalid when rank is higher than apprentice",
			rank:     proto.PlayerRank_EXPERT,
			lost:     true,
			waitTime: 0,
			expected: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			p := playergen.MustNew(
				playergen.WithMode(proto.GameMode_RANKED_CONSTRUCTED),
				playergen.WithRank(tt.rank),
				playergen.WithInitTimestamp(time.Now().Add(-1*tt.waitTime)),
				playergen.WithWin(!tt.lost),
			)

			b := player.NewBotPlayer(p.Mode)

			isValid, err := validator.IsValid(b, p)
			require.NoError(t, err)
			assert.Equal(t, tt.expected, isValid)
		})
	}

	t.Run("valid when bypass wait time check is enabled", func(t *testing.T) {
		p1 := playergen.MustNew()
		p2 := playergen.MustNew()

		cfg := &config.Config{
			Testing: config.TestingConfig{
				PlayerBotBypassWaitTimeChecksEnabled: true,
			},
		}

		validator := matchvalidators.NewBotMatchValidator(cfg)

		isValid, err := validator.IsValid(p1, p2)
		require.NoError(t, err)
		assert.True(t, isValid)
	})
}
