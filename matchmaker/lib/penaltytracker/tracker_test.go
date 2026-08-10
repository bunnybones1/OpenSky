package penaltytracker_test

import (
	"fmt"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/horizon-games/OpenSky/matchmaker/config"
	"github.com/horizon-games/OpenSky/matchmaker/lib/penaltytracker"
	"github.com/horizon-games/OpenSky/matchmaker/lib/store"
	"github.com/horizon-games/OpenSky/matchmaker/matchmakertest/playergen"
)

func TestTracker(t *testing.T) {
	keyValStore := store.NewMemStore()

	refusalMap := []float32{1, 5, 10}

	cfg := &config.Config{
		MatchMaker: config.MatchMakerConfig{
			MatchAcceptancePenalty: 3 * time.Second,
			MatchRefusalWindow:     time.Minute,
			MatchRefusalPenalty: config.MatchMakerMatchRefusalPenaltyConfig{
				DefaultSeconds: refusalMap,
			},
		},
		VersionHash: config.GITCOMMIT,
	}

	tracker := penaltytracker.NewTracker(cfg, keyValStore)

	t.Run("refusal penalty", func(t *testing.T) {
		t.Run("sets penalty cooldown based on penalty map ", func(t *testing.T) {
			p := playergen.MustNew()

			for i := 0; i < len(refusalMap); i++ {
				err := tracker.SetRefusalPenalty(p)
				require.NoError(t, err)

				penalty, err := tracker.GetPenalty(p)
				require.NoError(t, err)
				assert.InDelta(t, time.Duration(refusalMap[i])*time.Second, penalty, float64(100*time.Millisecond))
			}
		})

		t.Run("deletes penalty", func(t *testing.T) {
			p := playergen.MustNew()

			err := tracker.DeleteRefusalPenalty(p)
			require.NoError(t, err)

			err = tracker.SetRefusalPenalty(p)
			require.NoError(t, err)

			penalty, err := tracker.GetPenalty(p)
			require.NoError(t, err)
			assert.Greater(t, penalty, time.Duration(0))

			err = tracker.DeleteRefusalPenalty(p)
			require.NoError(t, err)

			penalty, err = tracker.GetPenalty(p)
			require.NoError(t, err)
			assert.Equal(t, time.Duration(0), penalty)
		})
	})

	t.Run("accept timeout penalty", func(t *testing.T) {
		p := playergen.MustNew()

		err := tracker.SetAcceptTimeoutPenalty(p)
		require.NoError(t, err)

		penalty, err := tracker.GetPenalty(p)
		require.NoError(t, err)
		assert.Greater(t, penalty, time.Duration(0))
	})

	t.Run("get penalty provides the highest stores penalty", func(t *testing.T) {
		tests := []struct {
			name          string
			refusalCount  int
			acceptTimeout bool
			abandon       time.Duration
			expected      time.Duration
		}{
			{
				name:          "accept timeout penalty is higher",
				refusalCount:  1,
				acceptTimeout: true,
				expected:      3 * time.Second,
			},
			{
				name:          "refusal penalty is higher",
				refusalCount:  2,
				acceptTimeout: true,
				expected:      5 * time.Second,
			},
			{
				name:          "abandon penalty is higher",
				refusalCount:  2,
				acceptTimeout: true,
				abandon:       6 * time.Second,
				expected:      6 * time.Second,
			},
		}

		for _, tt := range tests {
			t.Run(tt.name, func(t *testing.T) {
				p := playergen.MustNew()

				for i := 0; i < tt.refusalCount; i++ {
					err := tracker.SetRefusalPenalty(p)
					require.NoError(t, err)
				}

				if tt.acceptTimeout {
					err := tracker.SetAcceptTimeoutPenalty(p)
					require.NoError(t, err)
				}

				if tt.abandon > 0 {
					err := keyValStore.StoreTTL(fmt.Sprintf("match_abandon_cooldown:%s:dev", p.Address()), nil, tt.abandon)
					require.NoError(t, err)

				}

				penalty, err := tracker.GetPenalty(p)
				require.NoError(t, err)
				assert.InDelta(t, tt.expected, penalty, float64(100*time.Millisecond))
			})
		}
	})
}
