//go:build integration

package rpc_test

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/upper/db/v4"
	"go.uber.org/mock/gomock"

	"github.com/horizon-games/OpenSky/api/apitest"
	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/proto"
	"github.com/horizon-games/OpenSky/api/rpc/mock"
)

func TestListSkypassRewards(t *testing.T) {
	var skypassRewardLister *mock.MockSkypassRewardLister

	var accountID, adminAccountID proto.AccountID

	var address, anotherAddress proto.Hash

	season := data.CurrentSeason()

	// Setup
	{
		// Account
		{
			var err error

			accountID, address, err = apitest.CreateRandomAccount("TestListSkypassRewards-1")
			require.NoError(t, err)

			_, anotherAddress, err = apitest.CreateRandomAccount("TestListSkypassRewards-2")
			require.NoError(t, err)

			adminAccountID, err = apitest.CreateRandomAdminAccount("TestListSkypassRewards-admin")
			require.NoError(t, err)
		}

		// Skypass season stats
		{
			err := data.DB.Save(&data.SkypassSeasonStat{
				AccountID:            accountID,
				Season:               season,
				InitialAccountLevel:  2,
				AchievedAccountLevel: 3,
				HasPremium:           true,
			})
			require.NoError(t, err)
		}

		// Mocks
		{
			ctrl := gomock.NewController(t)

			skypassRewardLister = mock.NewMockSkypassRewardLister(ctrl)

			apiService := apitest.APIService()

			originalSkypassRewardLister := apiService.RPC.SkypassRewardLister

			apiService.RPC.SkypassRewardLister = skypassRewardLister

			t.Cleanup(func() {
				apiService.RPC.SkypassRewardLister = originalSkypassRewardLister
			})
		}
	}

	expectedLevels := []*proto.SkypassLevel{{
		Level: 1,
	}}

	t.Run("player", func(t *testing.T) {
		ctx := apitest.AccountContext(accountID)

		skypassRewardLister.EXPECT().ListBySeason(gomock.Any(), accountID, season).Return(expectedLevels, nil)

		res, err := apitest.Client().ListSkypassRewards(ctx, nil, nil)
		require.NoError(t, err)
		require.NotNil(t, res)

		assert.Equal(t, expectedLevels, res.Levels)
		assert.Equal(t, season, res.SeasonNumber)
		assert.NotEmpty(t, res.SeasonName)
		assert.True(t, res.HasPremium)
	})

	t.Run("admin with player's address", func(t *testing.T) {
		ctx := apitest.AccountContext(adminAccountID)

		skypassRewardLister.EXPECT().ListBySeason(gomock.Any(), accountID, season).Return(expectedLevels, nil)

		addressString := address.String()

		res, err := apitest.Client().ListSkypassRewards(ctx, nil, &addressString)
		require.NoError(t, err)
		require.NotNil(t, res)

		assert.Equal(t, expectedLevels, res.Levels)
		assert.Equal(t, season, res.SeasonNumber)
		assert.NotEmpty(t, res.SeasonName)
		assert.True(t, res.HasPremium)
	})

	t.Run("player with another player's address", func(t *testing.T) {
		ctx := apitest.AccountContext(accountID)

		skypassRewardLister.EXPECT().ListBySeason(gomock.Any(), accountID, season).Return(expectedLevels, nil)

		addressString := anotherAddress.String()

		res, err := apitest.Client().ListSkypassRewards(ctx, nil, &addressString)
		require.NoError(t, err)
		require.NotNil(t, res)

		assert.Equal(t, expectedLevels, res.Levels)
		assert.Equal(t, season, res.SeasonNumber)
		assert.NotEmpty(t, res.SeasonName)
		assert.True(t, res.HasPremium)
	})
}

func TestClaimSkypassRewards(t *testing.T) {
	var skypassRewardClaimer *mock.MockSkypassRewardClaimer

	var accountID, adminAccountID proto.AccountID

	var address, anotherAddress proto.Hash

	// Setup
	{
		// Account
		{
			var err error

			accountID, address, err = apitest.CreateRandomAccount("TestClaimSkypassRewards-1")
			require.NoError(t, err)

			_, anotherAddress, err = apitest.CreateRandomAccount("TestClaimSkypassRewards-2")
			require.NoError(t, err)

			adminAccountID, err = apitest.CreateRandomAdminAccount("TestClaimSkypassRewards-admin")
			require.NoError(t, err)
		}

		// Mocks
		{
			ctrl := gomock.NewController(t)

			skypassRewardClaimer = mock.NewMockSkypassRewardClaimer(ctrl)

			apiService := apitest.APIService()

			originalSkypassRewardClaimer := apiService.RPC.SkypassRewardClaimer

			apiService.RPC.SkypassRewardClaimer = skypassRewardClaimer

			t.Cleanup(func() {
				apiService.RPC.SkypassRewardClaimer = originalSkypassRewardClaimer
			})
		}
	}

	expectedGainedRewards := []*proto.Reward{
		{
			Type: proto.RewardType_HERO,
		},
	}

	t.Run("player", func(t *testing.T) {
		ctx := apitest.AccountContext(accountID)

		skypassRewardClaimer.EXPECT().ClaimRewards(gomock.Any(), accountID, []uint64{1, 2}).Return(expectedGainedRewards, nil)

		gainedRewards, err := apitest.Client().ClaimSkypassRewards(ctx, []uint64{1, 2}, nil)
		require.NoError(t, err)

		assert.Equal(t, expectedGainedRewards, gainedRewards)
	})

	t.Run("admin with player's address", func(t *testing.T) {
		ctx := apitest.AccountContext(adminAccountID)

		addressString := address.String()

		skypassRewardClaimer.EXPECT().ClaimRewards(gomock.Any(), accountID, []uint64{1, 2}).Return(expectedGainedRewards, nil)

		gainedRewards, err := apitest.Client().ClaimSkypassRewards(ctx, []uint64{1, 2}, &addressString)
		require.NoError(t, err)

		assert.Equal(t, expectedGainedRewards, gainedRewards)
	})

	t.Run("player with another player's address", func(t *testing.T) {
		ctx := apitest.AccountContext(accountID)

		addressString := anotherAddress.String()

		skypassRewardClaimer.EXPECT().ClaimRewards(gomock.Any(), accountID, []uint64{1, 2}).Return(expectedGainedRewards, nil)

		gainedRewards, err := apitest.Client().ClaimSkypassRewards(ctx, []uint64{1, 2}, &addressString)
		require.NoError(t, err)

		assert.Equal(t, expectedGainedRewards, gainedRewards)
	})
}

func TestGMListSkypassRewards(t *testing.T) {
	var accountID proto.AccountID

	// Setup
	{
		// Account
		{
			var err error
			accountID, err = apitest.CreateRandomAdminAccount("TestGMListSkypassRewards")
			require.NoError(t, err)
		}
	}

	tier := proto.SkypassTier_FREE
	itemType := proto.ItemType_SW_BASE_CARDS

	ctx := apitest.AccountContext(accountID)

	t.Run("for current season when no season provided", func(t *testing.T) {
		var reward *data.SkypassReward

		season := data.CurrentSeason()

		// Setup
		{
			// Skypass rewards
			{
				reward = &data.SkypassReward{
					SkypassReward: &proto.SkypassReward{
						Season:   season,
						Tier:     &tier,
						ItemType: &itemType,
						Amount:   1,
					},
				}
				err := data.DB.Save(reward)
				require.NoError(t, err)

				t.Cleanup(func() {
					err := data.DB.SkypassRewards().Find(db.Cond{"id": reward.ID}).Delete()
					require.NoError(t, err)
				})
			}
		}

		rewards, err := apitest.Client().GMListSkypassRewards(ctx, nil)
		require.NoError(t, err)

		require.Len(t, rewards, 1)
		assert.Equal(t, reward.ID, rewards[0].ID)
	})

	t.Run("for specific season when season provided", func(t *testing.T) {
		var reward *data.SkypassReward

		season := data.CurrentSeason() - 1

		// Setup
		{
			// Skypass rewards
			{
				reward = &data.SkypassReward{
					SkypassReward: &proto.SkypassReward{
						Season:   season,
						Tier:     &tier,
						ItemType: &itemType,
						Amount:   1,
					},
				}
				err := data.DB.Save(reward)
				require.NoError(t, err)

				t.Cleanup(func() {
					err := data.DB.SkypassRewards().Find(db.Cond{"id": reward.ID}).Delete()
					require.NoError(t, err)
				})
			}
		}

		rewards, err := apitest.Client().GMListSkypassRewards(ctx, &season)
		require.NoError(t, err)

		require.Len(t, rewards, 1)
		assert.Equal(t, reward.ID, rewards[0].ID)
	})
}

func TestGMHasSkypassPremium(t *testing.T) {
	var accountID2, adminAccountID proto.AccountID

	var address1, address2 proto.Hash

	// Setup
	{
		// Account
		{
			var err error

			_, address1, err = apitest.CreateRandomAccount("TestGMHasSkypassPremium1")
			require.NoError(t, err)

			accountID2, address2, err = apitest.CreateRandomAccount("TestGMHasSkypassPremium2")
			require.NoError(t, err)

			adminAccountID, err = apitest.CreateRandomAdminAccount("TestGMHasSkypassPremium-admin")
			require.NoError(t, err)
		}

		// Skypass season stats
		{
			seasonStat, err := data.DB.SkypassSeasonStats().FindOrCreate(accountID2, data.CurrentSeason())
			seasonStat.HasPremium = true
			err = data.DB.Save(seasonStat)
			require.NoError(t, err)
		}
	}

	ctx := apitest.AccountContext(adminAccountID)

	has, err := apitest.Client().GMHasSkypassPremium(ctx, address1.String())
	require.NoError(t, err)
	assert.False(t, has)

	has, err = apitest.Client().GMHasSkypassPremium(ctx, address2.String())
	require.NoError(t, err)
	assert.True(t, has)
}

func TestGMToggleSkypassPremium(t *testing.T) {
	var accountID, adminAccountID proto.AccountID

	var address proto.Hash

	// Setup
	{
		// Account
		{
			var err error

			accountID, address, err = apitest.CreateRandomAccount("TestGMToggleSkypassPremium")
			require.NoError(t, err)

			adminAccountID, err = apitest.CreateRandomAdminAccount("TestGMToggleSkypassPremium-admin")
			require.NoError(t, err)
		}
	}

	ctx := apitest.AccountContext(adminAccountID)

	has, err := apitest.Client().GMToggleSkypassPremium(ctx, address.String())
	require.NoError(t, err)
	assert.True(t, has)

	item, err := data.DB.Items().FindAccountItem(accountID, proto.ItemType_SW_SKYPASS, uint64(data.CurrentSeason()))
	require.NoError(t, err)
	require.NotNil(t, item)
	assert.Equal(t, 1, int(item.Balance.Int64()))

	seasonStat, err := data.DB.SkypassSeasonStats().FindOrCreate(accountID, data.CurrentSeason())
	require.NoError(t, err)
	assert.True(t, seasonStat.HasPremium)

	has, err = apitest.Client().GMToggleSkypassPremium(ctx, address.String())
	require.NoError(t, err)
	assert.False(t, has)

	item, err = data.DB.Items().FindAccountItem(accountID, proto.ItemType_SW_SKYPASS, uint64(data.CurrentSeason()))
	require.NoError(t, err)
	require.NotNil(t, item)
	assert.Equal(t, 0, int(item.Balance.Int64()))

	seasonStat, err = data.DB.SkypassSeasonStats().FindOrCreate(accountID, data.CurrentSeason())
	require.NoError(t, err)
	assert.False(t, seasonStat.HasPremium)
}
