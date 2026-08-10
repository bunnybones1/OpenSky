package playerstats_test

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/horizon-games/OpenSky/api/proto"
	"github.com/horizon-games/OpenSky/matchmaker/lib/playerstats"
	"github.com/horizon-games/OpenSky/matchmaker/lib/store"
)

func TestPlayerStatsManager(t *testing.T) {
	manager := playerstats.NewPlayerStatsManager(store.NewMemStore())
	require.NotNil(t, manager)

	t.Run("pushes some stats of a single player", func(t *testing.T) {
		{
			err := manager.Push("0x0000000000000000000000000000000000000001", &playerstats.Stat{
				Hero:         proto.Hero_ADA,
				OpponentHero: proto.Hero_LOTUS,
				OpponentID:   "0x0000000000000000000000000000000000000002",
			})
			require.NoError(t, err)
		}
		{
			err := manager.Push("0x0000000000000000000000000000000000000001", &playerstats.Stat{
				Hero:         proto.Hero_ADA,
				OpponentHero: proto.Hero_SAMYA,
				OpponentID:   "0x0000000000000000000000000000000000000003",
			})
			require.NoError(t, err)
		}
		{
			err := manager.Push("0x0000000000000000000000000000000000000001", &playerstats.Stat{
				Hero:         proto.Hero_ADA,
				OpponentHero: proto.Hero_HORIK,
				OpponentID:   "0x0000000000000000000000000000000000000004",
			})
			require.NoError(t, err)
		}
		{
			err := manager.Push("0x0000000000000000000000000000000000000001", &playerstats.Stat{
				Hero:         proto.Hero_TITUS,
				OpponentHero: proto.Hero_AXEL,
				OpponentID:   "0x0000000000000000000000000000000000000004",
			})
			require.NoError(t, err)
		}
	})

	t.Run("pushes some stats of another player", func(t *testing.T) {
		{
			err := manager.Push("0x0000000000000000000000000000000000000007", &playerstats.Stat{
				Hero:         proto.Hero_IRIS,
				OpponentHero: proto.Hero_FOX,
				OpponentID:   "0x0000000000000000000000000000000000000003",
			})
			require.NoError(t, err)
		}
		{
			err := manager.Push("0x0000000000000000000000000000000000000007", &playerstats.Stat{
				Hero:         proto.Hero_AXEL,
				OpponentHero: proto.Hero_FOX,
				OpponentID:   "0x0000000000000000000000000000000000000003",
			})
			require.NoError(t, err)
		}
		{
			err := manager.Push("0x0000000000000000000000000000000000000007", &playerstats.Stat{
				Hero:         proto.Hero_ADA,
				OpponentHero: proto.Hero_FOX,
				OpponentID:   "0x0000000000000000000000000000000000000004",
			})
			require.NoError(t, err)
		}
		{
			err := manager.Push("0x0000000000000000000000000000000000000007", &playerstats.Stat{
				Hero:         proto.Hero_TITUS,
				OpponentHero: proto.Hero_FOX,
				OpponentID:   "0x0000000000000000000000000000000000000004",
			})
			require.NoError(t, err)
		}
	})

	t.Run("retrieves stats of some players", func(t *testing.T) {
		{
			summary, err := manager.Retrieve("0x0000000000000000000000000000000000000001")
			require.NoError(t, err)
			require.NotNil(t, summary)
		}
		{
			summary, err := manager.Retrieve("0x0000000000000000000000000000000000000002")
			require.NoError(t, err)
			require.NotNil(t, summary) // player doesn't exists
		}
		{
			summary, err := manager.Retrieve("0x0000000000000000000000000000000000000007")
			require.NoError(t, err)
			require.NotNil(t, summary)
		}
	})

	t.Run("retrieves stats of some players and expects aggregated values", func(t *testing.T) {
		{
			summary, err := manager.Retrieve("0x0000000000000000000000000000000000000001")
			require.NoError(t, err)
			require.NotNil(t, summary)

			assert.Len(t, summary.Stats, 4)

			assert.Equal(t, 0.0, summary.VsHeroProbability[proto.Hero_ADA])
			assert.Equal(t, 0.0, summary.VsHeroProbability[proto.Hero_ARI])
			assert.Equal(t, 1.0/10.0, summary.VsHeroProbability[proto.Hero_AXEL])
			assert.Equal(t, 1.0/10.0, summary.VsHeroProbability[proto.Hero_HORIK])
			assert.Equal(t, 1.0/10.0, summary.VsHeroProbability[proto.Hero_LOTUS])
			assert.Equal(t, 1.0/10.0, summary.VsHeroProbability[proto.Hero_SAMYA])
			assert.Equal(t, 0.0, summary.VsHeroProbability[proto.Hero_SITTI])

			assert.Equal(t, 1.0/10.0, summary.VsPlayerProbability["0x0000000000000000000000000000000000000002"])
			assert.Equal(t, 0.0, summary.VsPlayerProbability["0x0000000000000000000000000000000000000008"])
			assert.Equal(t, 2.0/10.0, summary.VsPlayerProbability["0x0000000000000000000000000000000000000004"])
		}
		{
			summary, err := manager.Retrieve("0x0000000000000000000000000000000000000002")
			require.NoError(t, err)
			require.NotNil(t, summary) // player doesn't exists

			assert.Len(t, summary.Stats, 0)

			assert.Equal(t, 0.0, summary.VsHeroProbability[proto.Hero_ADA])
			assert.Equal(t, 0.0, summary.VsHeroProbability[proto.Hero_ARI])

			assert.Equal(t, 0.0, summary.VsPlayerProbability["0x0000000000000000000000000000000000000002"])
			assert.Equal(t, 0.0, summary.VsPlayerProbability["0x0000000000000000000000000000000000000008"])
			assert.Equal(t, 0.0, summary.VsPlayerProbability["0x0000000000000000000000000000000000000004"])
		}
		{
			summary, err := manager.Retrieve("0x0000000000000000000000000000000000000007")
			require.NoError(t, err)
			require.NotNil(t, summary)

			assert.Len(t, summary.Stats, 4)

			assert.Equal(t, 0.0, summary.VsHeroProbability[proto.Hero_ADA])
			assert.Equal(t, 0.0, summary.VsHeroProbability[proto.Hero_ARI])
			assert.Equal(t, 4.0/10.0, summary.VsHeroProbability[proto.Hero_FOX])

			assert.Equal(t, 0.0, summary.VsPlayerProbability["0x0000000000000000000000000000000000000002"])
			assert.Equal(t, 2.0/10.0, summary.VsPlayerProbability["0x0000000000000000000000000000000000000003"])
			assert.Equal(t, 2.0/10.0, summary.VsPlayerProbability["0x0000000000000000000000000000000000000004"])
		}
	})

	t.Run("add more stats to player 2 and expect summary values to remain constant", func(t *testing.T) {
		// Push more data and expect no values to be removed
		for i := 0; i < 6; i++ {
			err := manager.Push("0x0000000000000000000000000000000000000007", &playerstats.Stat{
				Hero:         proto.Hero_BOURAN,
				OpponentHero: proto.Hero_MAI,
				OpponentID:   "0x0000000000000000000000000000000000000009",
			})
			require.NoError(t, err)
		}
		{
			summary, err := manager.Retrieve("0x0000000000000000000000000000000000000007")
			require.NoError(t, err)
			require.NotNil(t, summary)

			assert.Len(t, summary.Stats, 10)

			assert.Equal(t, 0.0, summary.VsHeroProbability[proto.Hero_ADA])
			assert.Equal(t, 0.0, summary.VsHeroProbability[proto.Hero_ARI])
			assert.Equal(t, 4.0/10.0, summary.VsHeroProbability[proto.Hero_FOX])

			assert.Equal(t, 0.0, summary.VsPlayerProbability["0x0000000000000000000000000000000000000002"])
			assert.Equal(t, 2.0/10.0, summary.VsPlayerProbability["0x0000000000000000000000000000000000000003"])
			assert.Equal(t, 2.0/10.0, summary.VsPlayerProbability["0x0000000000000000000000000000000000000004"])
		}
	})

	t.Run("add more stats to player 2 and expect summary values to begin changing", func(t *testing.T) {
		// Push more data and expect some inital values to be removed
		{
			err := manager.Push("0x0000000000000000000000000000000000000007", &playerstats.Stat{
				Hero:         proto.Hero_BOURAN,
				OpponentHero: proto.Hero_MAI,
				OpponentID:   "0x0000000000000000000000000000000000000009",
			})
			require.NoError(t, err)
		}
		{
			summary, err := manager.Retrieve("0x0000000000000000000000000000000000000007")
			require.NoError(t, err)
			require.NotNil(t, summary)

			assert.Len(t, summary.Stats, 10)

			assert.Equal(t, 0.0, summary.VsHeroProbability[proto.Hero_ADA])
			assert.Equal(t, 0.0, summary.VsHeroProbability[proto.Hero_ARI])
			assert.Equal(t, 3.0/10.0, summary.VsHeroProbability[proto.Hero_FOX])
			assert.Equal(t, 7.0/10.0, summary.VsHeroProbability[proto.Hero_MAI])

			assert.Equal(t, 0.0, summary.VsPlayerProbability["0x0000000000000000000000000000000000000002"])
			assert.Equal(t, 1.0/10.0, summary.VsPlayerProbability["0x0000000000000000000000000000000000000003"])
			assert.Equal(t, 2.0/10.0, summary.VsPlayerProbability["0x0000000000000000000000000000000000000004"])
			assert.Equal(t, 7.0/10.0, summary.VsPlayerProbability["0x0000000000000000000000000000000000000009"])
		}

		// Push more data and expect some inital values to be removed
		{
			err := manager.Push("0x0000000000000000000000000000000000000007", &playerstats.Stat{
				Hero:         proto.Hero_BOURAN,
				OpponentHero: proto.Hero_MAI,
				OpponentID:   "0x0000000000000000000000000000000000000009",
			})
			require.NoError(t, err)
		}
		{
			summary, err := manager.Retrieve("0x0000000000000000000000000000000000000007")
			require.NoError(t, err)
			require.NotNil(t, summary)

			assert.Len(t, summary.Stats, 10)

			assert.Equal(t, 0.0, summary.VsHeroProbability[proto.Hero_ADA])
			assert.Equal(t, 0.0, summary.VsHeroProbability[proto.Hero_ARI])
			assert.Equal(t, 2.0/10.0, summary.VsHeroProbability[proto.Hero_FOX])
			assert.Equal(t, 8.0/10.0, summary.VsHeroProbability[proto.Hero_MAI])

			assert.Equal(t, 0.0, summary.VsPlayerProbability["0x0000000000000000000000000000000000000002"])
			assert.Equal(t, 0.0, summary.VsPlayerProbability["0x0000000000000000000000000000000000000003"])
			assert.Equal(t, 2.0/10.0, summary.VsPlayerProbability["0x0000000000000000000000000000000000000004"])
			assert.Equal(t, 8.0/10.0, summary.VsPlayerProbability["0x0000000000000000000000000000000000000009"])
		}

		// Push more data and expect all inital values to be removed
		for i := 0; i < 2; i++ {
			err := manager.Push("0x0000000000000000000000000000000000000007", &playerstats.Stat{
				Hero:         proto.Hero_BOURAN,
				OpponentHero: proto.Hero_MAI,
				OpponentID:   "0x0000000000000000000000000000000000000009",
			})
			require.NoError(t, err)
		}
		{
			summary, err := manager.Retrieve("0x0000000000000000000000000000000000000007")
			require.NoError(t, err)
			require.NotNil(t, summary)

			assert.Len(t, summary.Stats, 10)

			assert.Equal(t, 0.0, summary.VsHeroProbability[proto.Hero_ADA])
			assert.Equal(t, 0.0, summary.VsHeroProbability[proto.Hero_ARI])
			assert.Equal(t, 0.0, summary.VsHeroProbability[proto.Hero_FOX])
			assert.Equal(t, 1.0, summary.VsHeroProbability[proto.Hero_MAI])

			assert.Equal(t, 0.0, summary.VsPlayerProbability["0x0000000000000000000000000000000000000002"])
			assert.Equal(t, 0.0, summary.VsPlayerProbability["0x0000000000000000000000000000000000000003"])
			assert.Equal(t, 0.0, summary.VsPlayerProbability["0x0000000000000000000000000000000000000004"])
			assert.Equal(t, 1.0, summary.VsPlayerProbability["0x0000000000000000000000000000000000000009"])
		}
	})
}
