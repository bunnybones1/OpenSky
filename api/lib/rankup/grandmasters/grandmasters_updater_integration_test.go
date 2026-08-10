//go:build integration

package grandmasters_test

import (
	"fmt"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/upper/db/v4"

	"github.com/horizon-games/OpenSky/api/apitest"
	"github.com/horizon-games/OpenSky/api/data"
	playerRank "github.com/horizon-games/OpenSky/api/lib/player_rank"
	"github.com/horizon-games/OpenSky/api/lib/rankup/grandmasters"
	"github.com/horizon-games/OpenSky/api/proto"
)

func TestGrandmastersUpdater(t *testing.T) {
	_, err := data.DB.SQL().Exec("TRUNCATE account_stats CASCADE")
	require.NoError(t, err)

	season := data.CurrentSeason()

	{
		masterRank := playerRank.LookupRankByType(proto.PlayerRank_MASTER, proto.PlayerRankStage_STAGE_NONE)
		gameMode := proto.GameMode_RANKED_CONSTRUCTED
		for i := 0; i < 150; i++ {
			accountID, _, err := apitest.CreateRandomAccount(fmt.Sprintf("TestPromoteGrandmastersRunner-Master-%d", i))
			require.NoError(t, err)

			score := masterRank.RPMin + int32(i)

			_, err = data.DB.AccountStats().Insert(&data.AccountStat{&proto.AccountStat{
				AccountID:  accountID,
				PlayerRank: proto.PlayerRank_MASTER,
				GameMode:   gameMode,
				Season:     &season,
				Score:      &score,
			}})
			require.NoError(t, err)
		}
	}

	grandmastersUpdater := grandmasters.NewUpdater()

	var gmAccountIDs, mAccountIDs []proto.AccountID

	{
		// list of grandmasters and masters
		gms, ms, err := grandmastersUpdater.List(data.DB, proto.GameMode_RANKED_CONSTRUCTED, season)
		require.NoError(t, err)
		assert.Equal(t, 100, len(gms))
		assert.Equal(t, 50, len(ms))

		for _, gm := range gms {
			gmAccountIDs = append(gmAccountIDs, gm.AccountID)
		}
		for _, m := range ms {
			mAccountIDs = append(mAccountIDs, m.AccountID)
		}
	}

	// make sure the list of grandmasters match the initial image before updating
	{
		ranked, err := data.DB.AccountStats().GetRanks(proto.GameMode_RANKED_CONSTRUCTED, gmAccountIDs, season)
		require.NoError(t, err)

		// make sure all previously listed grandmasters are included
		for _, accountID := range gmAccountIDs {
			_, exists := ranked[accountID]
			require.True(t, exists)
		}
	}

	// we should not have any persisted grandmasters
	{
		count, err := data.DB.AccountStats().Find(db.Cond{
			"game_mode":   proto.GameMode_RANKED_CONSTRUCTED,
			"player_rank": proto.PlayerRank_GRANDWEAVER,
			"status":      db.NotAnyOf(data.BannedStatuses),
		}).Count()
		require.NoError(t, err)
		assert.Equal(t, uint64(0), count)
	}

	// update
	{
		err := grandmastersUpdater.Update(data.DB.Session, proto.GameMode_RANKED_CONSTRUCTED, season)
		require.NoError(t, err)
	}

	var rankedGrandmasters map[proto.AccountID]uint32

	// make sure the list of grandmasters match the initial image after updating
	{
		ranked, err := data.DB.AccountStats().GetRanks(proto.GameMode_RANKED_CONSTRUCTED, gmAccountIDs, season)
		require.NoError(t, err)

		// make sure all previously listed grandmasters are included
		for _, accountID := range gmAccountIDs {
			_, exists := ranked[accountID]
			require.True(t, exists)
		}

		rankedGrandmasters = ranked
	}

	{
		ranked, err := data.DB.AccountStats().GetRanks(proto.GameMode_RANKED_CONSTRUCTED, mAccountIDs, season)
		require.NoError(t, err)

		// make sure all previously listed masters are included
		for _, accountID := range mAccountIDs {
			_, exists := ranked[accountID]
			require.True(t, exists)
		}
	}

	// we should have 100 persisted grandmasters
	{
		count, err := data.DB.AccountStats().Find(db.Cond{
			"game_mode":   proto.GameMode_RANKED_CONSTRUCTED,
			"player_rank": proto.PlayerRank_GRANDWEAVER,
			"status":      db.NotAnyOf(data.BannedStatuses),
		}).Count()
		require.NoError(t, err)
		assert.Equal(t, uint64(100), count)
	}

	// all persisted grandmasters should have a rank
	{
		stats := []*data.AccountStat{}
		err := data.DB.AccountStats().Find(db.Cond{
			"game_mode":   proto.GameMode_RANKED_CONSTRUCTED,
			"player_rank": proto.PlayerRank_GRANDWEAVER,
			"status":      db.NotAnyOf(data.BannedStatuses),
		}).All(&stats)
		require.NoError(t, err)

		assert.Equal(t, 100, len(stats))

		for _, s := range stats {
			assert.NotZero(t, rankedGrandmasters[s.AccountID])
		}
	}
}
