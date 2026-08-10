//go:build integration

package rpc_test

import (
	"fmt"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/horizon-games/OpenSky/api/apitest"
	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/proto"
)

func TestGMRenameAccount(t *testing.T) {
	var adminAccountID proto.AccountID

	var address proto.Hash

	// Setup
	{
		// Accounts
		{
			var err error
			_, address, err = apitest.CreateRandomAccount("TestGMRenameAccount")
			require.NoError(t, err)

			adminAccountID, err = apitest.CreateRandomAdminAccount("TestGMRenameAccount-admin")
			require.NoError(t, err)
		}
	}

	ctx := apitest.AccountContext(adminAccountID)

	addressString := address.String()

	fetchedAccount, err := apitest.Client().GMRenameAccount(ctx, nil, &addressString, "batman", nil)
	require.NoError(t, err)
	assert.Equal(t, fetchedAccount.Name, "batman")
}

func TestGMGiveLevels(t *testing.T) {
	var accountID, adminAccountID proto.AccountID

	var address proto.Hash

	// Setup
	{
		// Accounts
		{
			var err error
			accountID, address, err = apitest.CreateRandomAccount("TestGMGiveLevels")
			require.NoError(t, err)

			adminAccountID, err = apitest.CreateRandomAdminAccount("TestGMGiveLevels-admin")
			require.NoError(t, err)
		}
	}

	ctx := apitest.AccountContext(adminAccountID)

	addressString := address.String()

	expectedLevel := uint16(10)

	status, err := apitest.Client().GMGiveLevels(ctx, &addressString, expectedLevel)
	require.NoError(t, err)
	assert.True(t, status)

	skypassSeasonStat, err := data.DB.SkypassSeasonStats().FindOrCreate(accountID, data.CurrentSeason())
	require.NoError(t, err)

	assert.Equal(t, 0, int(skypassSeasonStat.InitialAccountLevel))
	assert.Equal(t, expectedLevel, skypassSeasonStat.AchievedAccountLevel)
}

func TestGMSetRP(t *testing.T) {
	var accountID, adminAccountID proto.AccountID

	var address proto.Hash

	// Setup
	{
		// Accounts
		{
			var err error
			accountID, address, err = apitest.CreateRandomAccount("TestGMSetRP")
			require.NoError(t, err)

			adminAccountID, err = apitest.CreateRandomAdminAccount("TestGMSetRP-admin")
			require.NoError(t, err)
		}
	}

	season := data.CurrentSeason()

	userGameMode := proto.GameMode_RANKED_CONSTRUCTED

	ctx := apitest.AccountContext(adminAccountID)

	addressString := address.String()

	{
		userRP := int32(200)

		success, err := apitest.Client().GMSetRP(ctx, &addressString, &userGameMode, &userRP)
		assert.NoError(t, err)
		assert.True(t, success)

		userStats, err := data.DB.AccountStats().FindOrCreateByAccountIDAndMode(accountID, userGameMode, season)
		require.NoError(t, err)

		require.Equal(t, proto.PlayerRank_WANDERER, userStats.PlayerRank)
		require.Equal(t, proto.PlayerRankStage_STAGE_III, userStats.PlayerRankStage)
		require.Equal(t, userRP, *userStats.Score)
		require.NotNil(t, userStats.PlayerRankState)
		require.Equal(t, userRP, userStats.PlayerRankState.RP)
	}

	{
		userRP := int32(340)

		success, err := apitest.Client().GMSetRP(ctx, &addressString, &userGameMode, &userRP)
		assert.NoError(t, err)
		assert.True(t, success)

		userStats, err := data.DB.AccountStats().FindOrCreateByAccountIDAndMode(accountID, userGameMode, season)
		require.NoError(t, err)

		require.Equal(t, proto.PlayerRank_TRAINEE, userStats.PlayerRank)
		require.Equal(t, proto.PlayerRankStage_STAGE_I, userStats.PlayerRankStage)
		require.Equal(t, userRP, *userStats.Score)
		require.NotNil(t, userStats.PlayerRankState)
		require.Equal(t, userRP, userStats.PlayerRankState.RP)
	}

	{
		userRP := int32(769)

		success, err := apitest.Client().GMSetRP(ctx, &addressString, &userGameMode, &userRP)
		assert.NoError(t, err)
		assert.True(t, success)

		userStats, err := data.DB.AccountStats().FindOrCreateByAccountIDAndMode(accountID, userGameMode, season)
		require.NoError(t, err)

		require.Equal(t, proto.PlayerRank_APPRENTICE, userStats.PlayerRank)
		require.Equal(t, proto.PlayerRankStage_STAGE_II, userStats.PlayerRankStage)
		require.Equal(t, userRP, *userStats.Score)
		require.NotNil(t, userStats.PlayerRankState)
		require.Equal(t, userRP, userStats.PlayerRankState.RP)
	}

	{
		userRP := int32(1300)

		success, err := apitest.Client().GMSetRP(ctx, &addressString, &userGameMode, &userRP)
		assert.NoError(t, err)
		assert.True(t, success)

		userStats, err := data.DB.AccountStats().FindOrCreateByAccountIDAndMode(accountID, userGameMode, season)
		require.NoError(t, err)

		require.Equal(t, proto.PlayerRank_GRANDWEAVER, userStats.PlayerRank)
		require.Equal(t, proto.PlayerRankStage_STAGE_NONE, userStats.PlayerRankStage)
		require.Equal(t, userRP, *userStats.Score)
		require.NotNil(t, userStats.PlayerRankState)
		require.Equal(t, userRP, userStats.PlayerRankState.RP)
	}
}

func TestGMStats(t *testing.T) {
	var adminAccountID proto.AccountID

	// Setup
	{
		// Accounts
		{
			var err error
			adminAccountID, err = apitest.CreateRandomAdminAccount("TestGMStats-admin")
			require.NoError(t, err)

			for status := range proto.AccountStatus_name {
				_, err := apitest.CreateRandomAccountWithStatus(fmt.Sprintf("TestGMStats-%d", status), proto.AccountStatus(status))
				require.NoError(t, err)
			}
		}
	}

	ctx := apitest.AccountContext(adminAccountID)

	resp, err := apitest.Client().GMStats(ctx)
	require.NoError(t, err)

	assert.GreaterOrEqual(t, int(resp.TotalActiveUsers), 1)
	assert.GreaterOrEqual(t, int(resp.TotalBannedUsers), 1)
	assert.GreaterOrEqual(t, int(resp.TotalSuspendedUsers), 1)
	assert.GreaterOrEqual(t, int(resp.TotalVIPUsers), 1)
	assert.GreaterOrEqual(t, int(resp.TotalFlaggedUsers), 1)
	assert.GreaterOrEqual(t, int(resp.TotalToDeleteUsers), 1)
}
