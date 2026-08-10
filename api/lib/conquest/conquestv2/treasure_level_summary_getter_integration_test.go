//go:build integration

package conquestv2_test

import (
	"context"
	"fmt"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/upper/db/v4"

	"github.com/horizon-games/OpenSky/api/apitest"
	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/lib/conquest/conquestv2"
	"github.com/horizon-games/OpenSky/api/proto"
)

func TestTreasureLevelSummaryGetter(t *testing.T) {
	ctx := apitest.DBContext(context.Background())

	var accountIDS []proto.AccountID

	// Setup
	{
		// Accounts
		{
			for i := 0; i < 12; i++ {
				accountID1, _, err := apitest.CreateRandomAccount(fmt.Sprintf("TestTreasureLevelSummaryGetter1-%d", i))
				require.NoError(t, err)

				accountID2, _, err := apitest.CreateRandomAccount(fmt.Sprintf("TestTreasureLevelSummaryGetter2-%d", i))
				require.NoError(t, err)

				accountIDS = append(accountIDS, accountID1, accountID2)
			}
		}
	}

	treasureLevelSummaryGetter := conquestv2.NewTreasureLevelSummaryGetter()

	t.Run("returns data for each level even when there is no player", func(t *testing.T) {
		levels, err := treasureLevelSummaryGetter.Get(ctx)
		require.NoError(t, err)

		assert.Len(t, levels, 10)

		for _, level := range levels {
			assert.Equal(t, int32(0), level.NumberOfPlayers)
			assert.Equal(t, float32(0), level.TotalWeight)
		}
	})

	t.Run("returns well calculated data for each level", func(t *testing.T) {
		fixturesData := []struct {
			level               uint16
			pointsPerPlayer     uint64 // 2 players for each level
			expectedTotalWeight float32
		}{
			{
				level:               1,
				pointsPerPlayer:     500,
				expectedTotalWeight: 1 * 2,
			},
			{
				level:               2,
				pointsPerPlayer:     1000,
				expectedTotalWeight: 3.19 * 2,
			},
			{
				level:               3,
				pointsPerPlayer:     2000,
				expectedTotalWeight: 6.9 * 2,
			},
			{
				level:               4,
				pointsPerPlayer:     3000,
				expectedTotalWeight: 12.65 * 2,
			},
			{
				level:               5,
				pointsPerPlayer:     4000,
				expectedTotalWeight: 21.32 * 2,
			},
			{
				level:               6,
				pointsPerPlayer:     6000,
				expectedTotalWeight: 34.29 * 2,
			},
			{
				level:               7,
				pointsPerPlayer:     8000,
				expectedTotalWeight: 53.99 * 2,
			},
			{
				level:               8,
				pointsPerPlayer:     10000,
				expectedTotalWeight: 84.67 * 2,
			},
			{
				level:               9,
				pointsPerPlayer:     12000,
				expectedTotalWeight: 134.32 * 2,
			},
			{
				level:               10,
				pointsPerPlayer:     14000,
				expectedTotalWeight: 218.69 * 2,
			},
		}

		// Setup
		{
			eventID := uint16(2)

			for i, fixture := range fixturesData {
				addressIndex := i * 2

				err := data.DB.ConquestPoints(nil).InsertReturning(&proto.ConquestPoints{
					AccountID:     accountIDS[addressIndex],
					EventID:       eventID,
					CurrentPoints: fixture.pointsPerPlayer,
				})
				require.NoError(t, err)

				err = data.DB.ConquestPoints(nil).InsertReturning(&proto.ConquestPoints{
					AccountID:     accountIDS[addressIndex+1],
					EventID:       eventID,
					CurrentPoints: fixture.pointsPerPlayer,
				})
				require.NoError(t, err)
			}

			t.Cleanup(func() {
				err := data.DB.ConquestPoints(nil).Find(db.Cond{"event_id": eventID}).Delete()
				require.NoError(t, err)
			})
		}

		levels, err := treasureLevelSummaryGetter.Get(ctx)
		require.NoError(t, err)

		assert.Len(t, levels, 10)

		for _, fixture := range fixturesData {
			var found bool

			for _, level := range levels {
				if level.Level == fixture.level {
					assert.Equal(t, int32(2), level.NumberOfPlayers)
					assert.Equal(t, fixture.expectedTotalWeight, level.TotalWeight)

					found = true

					break
				}
			}

			assert.True(t, found)
		}
	})
}
