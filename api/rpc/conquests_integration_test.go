//go:build integration

package rpc_test

import (
	"context"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/upper/db/v4"
	"go.uber.org/mock/gomock"

	"github.com/horizon-games/OpenSky/api/apitest"
	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/proto"
	"github.com/horizon-games/OpenSky/api/rpc/mock"
)

func TestEnterConquest(t *testing.T) {
	var conquestStateManager *mock.MockConquestStateManager

	var accountID proto.AccountID

	// Setup
	{
		// Account
		{
			var err error

			accountID, _, err = apitest.CreateRandomAccount("TestEnterConquest")
			require.NoError(t, err)
		}

		// Mocks
		{
			ctrl := gomock.NewController(t)

			conquestStateManager = mock.NewMockConquestStateManager(ctrl)

			apiService := apitest.APIService()

			originalConquestStateManager := apiService.RPC.ConquestStateManager

			apiService.RPC.ConquestStateManager = conquestStateManager

			t.Cleanup(func() {
				apiService.RPC.ConquestStateManager = originalConquestStateManager
			})
		}
	}

	ctx := apitest.AccountContext(accountID)

	hero := proto.Hero_SAMYA

	conquestStateManager.EXPECT().Enter(gomock.Any(), accountID, hero).Return(true, nil)

	entered, err := apitest.Client().EnterConquest(ctx, &hero)
	require.NoError(t, err)
	assert.True(t, entered)
}

func TestConquestStatus(t *testing.T) {
	var accountID proto.AccountID

	// Setup
	{
		// Account
		{
			var err error

			accountID, _, err = apitest.CreateRandomAccount("TestConquestStatus")
			require.NoError(t, err)
		}
	}

	ctx := apitest.AccountContext(accountID)

	t.Run("returns conquest when it exists and it is in progress", func(t *testing.T) {
		var conquest *data.Conquest

		// Setup
		{
			// Conquests
			{
				conquest = &data.Conquest{Conquest: &proto.Conquest{
					Status:    proto.ConquestStatus_IN_PROGRESS,
					AccountID: accountID,
					Mode:      proto.GameMode_CONQUEST_CONSTRUCTED,
					Hero:      proto.Hero_SAMYA,
				}}
				err := data.DB.Save(conquest)
				require.NoError(t, err)

				t.Cleanup(func() {
					err := data.DB.Conquests().Find(db.Cond{"account_id": accountID}).Delete()
					require.NoError(t, err)
				})
			}
		}

		resultConquest, err := apitest.Client().ConquestStatus(ctx)
		require.NoError(t, err)
		require.NotNil(t, resultConquest)

		assert.Equal(t, conquest.ID, resultConquest.ID)
		assert.Equal(t, data.HeroDeckClass(conquest.Hero), *resultConquest.DeckClass)
	})

	t.Run("does not return conquest when it exists and it is not in progress", func(t *testing.T) {
		var conquest *data.Conquest

		// Setup
		{
			// Conquests
			{
				conquest = &data.Conquest{Conquest: &proto.Conquest{
					Status:    proto.ConquestStatus_REWARDS_PENDING,
					AccountID: accountID,
					Mode:      proto.GameMode_CONQUEST_CONSTRUCTED,
					Hero:      proto.Hero_SAMYA,
				}}
				err := data.DB.Save(conquest)
				require.NoError(t, err)

				t.Cleanup(func() {
					err := data.DB.Conquests().Find(db.Cond{"account_id": accountID}).Delete()
					require.NoError(t, err)
				})
			}
		}

		resultConquest, err := apitest.Client().ConquestStatus(ctx)
		require.NoError(t, err)
		require.Nil(t, resultConquest)
	})

	t.Run("does not return conquest when it does not exist", func(t *testing.T) {
		resultConquest, err := apitest.Client().ConquestStatus(ctx)
		require.NoError(t, err)
		require.Nil(t, resultConquest)
	})
}

func TestInternalConquestStatus(t *testing.T) {
	var accountID proto.AccountID

	var address proto.Hash

	// Setup
	{
		// Account
		{
			var err error

			accountID, address, err = apitest.CreateRandomAccount("TestInternalConquestStatus")
			require.NoError(t, err)
		}
	}

	ctx := apitest.ServiceContext()

	t.Run("returns conquest when it exists and it is in progress", func(t *testing.T) {
		var conquest *data.Conquest

		// Setup
		{
			// Conquests
			{
				conquest = &data.Conquest{Conquest: &proto.Conquest{
					Status:    proto.ConquestStatus_IN_PROGRESS,
					AccountID: accountID,
					Mode:      proto.GameMode_CONQUEST_CONSTRUCTED,
					Hero:      proto.Hero_SAMYA,
				}}
				err := data.DB.Save(conquest)
				require.NoError(t, err)

				t.Cleanup(func() {
					err := data.DB.Conquests().Find(db.Cond{"account_id": accountID}).Delete()
					require.NoError(t, err)
				})
			}
		}

		resultConquest, err := apitest.Client().InternalConquestStatus(ctx, address.String())
		require.NoError(t, err)
		require.NotNil(t, resultConquest)

		assert.Equal(t, conquest.ID, resultConquest.ID)
		assert.Equal(t, data.HeroDeckClass(conquest.Hero), *resultConquest.DeckClass)
	})

	t.Run("does not return conquest when it exists and it is not in progress", func(t *testing.T) {
		var conquest *data.Conquest

		// Setup
		{
			// Conquests
			{
				conquest = &data.Conquest{Conquest: &proto.Conquest{
					Status:    proto.ConquestStatus_REWARDS_PENDING,
					AccountID: accountID,
					Mode:      proto.GameMode_CONQUEST_CONSTRUCTED,
					Hero:      proto.Hero_SAMYA,
				}}
				err := data.DB.Save(conquest)
				require.NoError(t, err)

				t.Cleanup(func() {
					err := data.DB.Conquests().Find(db.Cond{"account_id": accountID}).Delete()
					require.NoError(t, err)
				})
			}
		}

		resultConquest, err := apitest.Client().InternalConquestStatus(ctx, address.String())
		require.NoError(t, err)
		require.Nil(t, resultConquest)
	})

	t.Run("does not return conquest when it does not exist", func(t *testing.T) {
		resultConquest, err := apitest.Client().InternalConquestStatus(ctx, address.String())
		require.NoError(t, err)
		require.Nil(t, resultConquest)
	})

	t.Run("fails when it is a request from a player", func(t *testing.T) {
		ctx := apitest.AccountContext(accountID)

		resultConquest, err := apitest.Client().InternalConquestStatus(ctx, address.String())
		require.ErrorContains(t, err, "unauthorized")
		require.Nil(t, resultConquest)
	})
}

func TestConquestStats(t *testing.T) {
	var accountID, accountID2 proto.AccountID

	// Setup
	{
		// Account
		{
			var err error

			accountID, _, err = apitest.CreateRandomAccount("ConquestStats")
			require.NoError(t, err)

			accountID2, _, err = apitest.CreateRandomAccount("ConquestStats-2")
			require.NoError(t, err)
		}

		// Conquests
		{
			createConquest(t, accountID, proto.GameMode_CONQUEST_CONSTRUCTED, proto.ConquestStatus_COMPLETED, 1, proto.ConquestMatchResultMap{
				1: proto.ConquestMatchResult_WIN,
				2: proto.ConquestMatchResult_LOSS,
			})
			createConquest(t, accountID, proto.GameMode_CONQUEST_CONSTRUCTED, proto.ConquestStatus_COMPLETED, 2, proto.ConquestMatchResultMap{
				1: proto.ConquestMatchResult_WIN,
				2: proto.ConquestMatchResult_WIN,
				3: proto.ConquestMatchResult_WIN,
			})
			createConquest(t, accountID, proto.GameMode_CONQUEST_DISCOVERY, proto.ConquestStatus_COMPLETED, 3, proto.ConquestMatchResultMap{
				1: proto.ConquestMatchResult_WIN,
				2: proto.ConquestMatchResult_WIN,
				3: proto.ConquestMatchResult_WIN,
			})
			createConquest(t, accountID, proto.GameMode_CONQUEST_DISCOVERY, proto.ConquestStatus_COMPLETED, 4, proto.ConquestMatchResultMap{
				1: proto.ConquestMatchResult_WIN,
				2: proto.ConquestMatchResult_WIN,
				3: proto.ConquestMatchResult_WIN,
			})
			createConquest(t, accountID, proto.GameMode_CONQUEST_DISCOVERY, proto.ConquestStatus_COMPLETED, 5, proto.ConquestMatchResultMap{
				1: proto.ConquestMatchResult_WIN,
				2: proto.ConquestMatchResult_WIN,
				3: proto.ConquestMatchResult_WIN,
			})

			t.Cleanup(func() {
				err := data.DB.Conquests().Find(db.Cond{"account_id": accountID}).Delete()
				require.NoError(t, err)
			})
		}
	}

	t.Run("with existing data", func(t *testing.T) {
		ctx := apitest.AccountContext(accountID)

		stats, err := apitest.Client().ConquestStats(ctx)
		require.NoError(t, err)

		assert.NotNil(t, stats.FirstConquestMatchPlayed)
		assert.Equal(t, uint32(5), stats.ConstructedMatchesPlayed)
		assert.Equal(t, uint32(2), stats.ConstructedTicketsUsed)
		assert.Equal(t, float32(80), stats.ConstructedWinRate)
		assert.Equal(t, uint32(2), stats.ConstructedSilverCardsWon)
		assert.Equal(t, uint32(1), stats.ConstructedGoldCardsWon)
		assert.Equal(t, uint32(9), stats.DiscoveryMatchesPlayed)
		assert.Equal(t, uint32(3), stats.DiscoveryTicketsUsed)
		assert.Equal(t, float32(100), stats.DiscoveryWinRate)
		assert.Equal(t, uint32(3), stats.DiscoverySilverCardsWon)
		assert.Equal(t, uint32(3), stats.DiscoveryGoldCardsWon)
	})

	t.Run("without existing data", func(t *testing.T) {
		ctx := apitest.AccountContext(accountID2)

		stats, err := apitest.Client().ConquestStats(ctx)
		require.NoError(t, err)

		assert.Nil(t, stats.FirstConquestMatchPlayed)
		assert.Equal(t, uint32(0), stats.ConstructedMatchesPlayed)
		assert.Equal(t, uint32(0), stats.ConstructedTicketsUsed)
		assert.Equal(t, float32(0), stats.ConstructedWinRate)
		assert.Equal(t, uint32(0), stats.ConstructedSilverCardsWon)
		assert.Equal(t, uint32(0), stats.ConstructedGoldCardsWon)
		assert.Equal(t, uint32(0), stats.DiscoveryMatchesPlayed)
		assert.Equal(t, uint32(0), stats.DiscoveryTicketsUsed)
		assert.Equal(t, float32(0), stats.DiscoveryWinRate)
		assert.Equal(t, uint32(0), stats.DiscoverySilverCardsWon)
		assert.Equal(t, uint32(0), stats.DiscoveryGoldCardsWon)
	})
}

func TestConquestTreasuresInfo(t *testing.T) {
	var accountID, adminAccountID proto.AccountID

	// Setup
	{
		// Accounts
		{
			var err error

			accountID, _, err = apitest.CreateRandomAccount("TestConquestTreasuresInfo")
			require.NoError(t, err)

			adminAccountID, err = apitest.CreateRandomAdminAccount("TestConquestTreasuresInfo-admin")
			require.NoError(t, err)
		}

		// Conquest pool config
		{
			ctxAdmin := apitest.AccountContext(adminAccountID)

			// Set fake configs
			poolCeiling := int32(1)
			poolFloor := int32(2)
			topWeightUnitPrice := float32(1)
			bottomWeightUnitPrice := float32(1)
			weightPerSilverCard := float32(0)

			_, err := apitest.Client().GMSetConquestV2PoolConfig(ctxAdmin, &poolCeiling, &poolFloor, &topWeightUnitPrice, &bottomWeightUnitPrice, &weightPerSilverCard)
			require.NoError(t, err)
		}
	}

	ctx := apitest.AccountContext(accountID)

	treasures, err := apitest.Client().ConquestTreasuresInfo(ctx)
	require.NoError(t, err)

	var usdc int64

	for i := uint16(1); i < 11; i++ {
		require.Equal(t, int64(0), treasures[i].AmountSilver)
		require.True(t, usdc < treasures[i].AmountUSDC)
		usdc = treasures[i].AmountUSDC
	}
}

func TestConquestV2Pool(t *testing.T) {
	ctx := context.Background()

	var conquestV2PoolManager *mock.MockConquestV2PoolManager

	// Setup
	{
		// Mocks
		{
			ctrl := gomock.NewController(t)

			conquestV2PoolManager = mock.NewMockConquestV2PoolManager(ctrl)

			apiService := apitest.APIService()

			originalConquestV2PoolManager := apiService.RPC.ConquestV2PoolManager

			apiService.RPC.ConquestV2PoolManager = conquestV2PoolManager

			t.Cleanup(func() {
				apiService.RPC.ConquestV2PoolManager = originalConquestV2PoolManager
			})
		}
	}

	expectedPool := &proto.ConquestV2Pool{
		Amount:      1,
		TotalWeight: 2,
	}

	conquestV2PoolManager.EXPECT().GetPool(gomock.Any()).Return(expectedPool, nil)

	pool, err := apitest.Client().ConquestV2Pool(ctx)
	require.NoError(t, err)

	assert.Equal(t, expectedPool, pool)
}

func TestConquestV2Progress(t *testing.T) {
	var conquestV2TreasureCalculator *mock.MockConquestV2TreasureCalculator

	var accountID proto.AccountID

	// Setup
	{
		// Account
		{
			var err error

			accountID, _, err = apitest.CreateRandomAccount("TestConquestV2Progress")
			require.NoError(t, err)
		}

		// Mocks
		{
			ctrl := gomock.NewController(t)

			conquestV2TreasureCalculator = mock.NewMockConquestV2TreasureCalculator(ctrl)

			apiService := apitest.APIService()

			originalConquestV2TreasureCalculator := apiService.RPC.ConquestV2TreasureCalculator

			apiService.RPC.ConquestV2TreasureCalculator = conquestV2TreasureCalculator

			t.Cleanup(func() {
				apiService.RPC.ConquestV2TreasureCalculator = originalConquestV2TreasureCalculator
			})
		}
	}

	ctx := apitest.AccountContext(accountID)
	ctx = apitest.DBContext(ctx)

	expectedProgress := &proto.ConquestV2TreasureProgress{
		TreasureLevel:          1,
		TreasurePoints:         2,
		TreasurePointsRequired: 3,
	}

	conquestV2TreasureCalculator.EXPECT().FromConquestPoints(gomock.Any()).DoAndReturn(func(conquestPoints *data.ConquestPoints) (*data.ConquestV2TreasureProgress, error) {
		assert.Equal(t, accountID, conquestPoints.AccountID)
		assert.Equal(t, 2, int(conquestPoints.EventID))
		assert.Equal(t, 0, int(conquestPoints.CurrentPoints))

		return &data.ConquestV2TreasureProgress{
			ConquestV2TreasureProgress: expectedProgress,
		}, nil
	})

	progress, err := apitest.Client().ConquestV2Progress(ctx)
	require.NoError(t, err)

	assert.Equal(t, expectedProgress, progress)
}

func TestGMSetConquestV2PoolConfig(t *testing.T) {
	var conquestV2PoolManager *mock.MockConquestV2PoolManager

	var accountID proto.AccountID

	// Setup
	{
		// Account
		{
			var err error
			accountID, err = apitest.CreateRandomAdminAccount("TestGMSetConquestV2PoolConfig")
			require.NoError(t, err)
		}

		// Mocks
		{
			ctrl := gomock.NewController(t)

			conquestV2PoolManager = mock.NewMockConquestV2PoolManager(ctrl)

			apiService := apitest.APIService()

			originalConquestV2PoolManager := apiService.RPC.ConquestV2PoolManager

			apiService.RPC.ConquestV2PoolManager = conquestV2PoolManager

			t.Cleanup(func() {
				apiService.RPC.ConquestV2PoolManager = originalConquestV2PoolManager
			})
		}
	}

	ctx := apitest.AccountContext(accountID)

	poolCeiling := int32(1)
	poolFloor := int32(2)
	topWeightUnitPrice := float32(3)
	bottomWeightUnitPrice := float32(4)
	weightPerSilverCard := float32(3)

	conquestV2PoolManager.EXPECT().
		SetConfig(gomock.Any(), &poolCeiling, &poolFloor, &topWeightUnitPrice, &bottomWeightUnitPrice, &weightPerSilverCard).
		Return(nil)

	ok, err := apitest.Client().GMSetConquestV2PoolConfig(ctx, &poolCeiling, &poolFloor, &topWeightUnitPrice, &bottomWeightUnitPrice, &weightPerSilverCard)
	require.NoError(t, err)

	assert.True(t, ok)
}

func TestGMGetConquestV2PoolConfig(t *testing.T) {
	var conquestV2PoolManager *mock.MockConquestV2PoolManager

	var accountID proto.AccountID

	// Setup
	{
		// Account
		{
			var err error
			accountID, err = apitest.CreateRandomAdminAccount("TestGMGetConquestV2PoolConfig")
			require.NoError(t, err)
		}

		// Mocks
		{
			ctrl := gomock.NewController(t)

			conquestV2PoolManager = mock.NewMockConquestV2PoolManager(ctrl)

			apiService := apitest.APIService()

			originalConquestV2PoolManager := apiService.RPC.ConquestV2PoolManager

			apiService.RPC.ConquestV2PoolManager = conquestV2PoolManager

			t.Cleanup(func() {
				apiService.RPC.ConquestV2PoolManager = originalConquestV2PoolManager
			})
		}
	}

	ctx := apitest.AccountContext(accountID)

	expectedConfig := &proto.ConquestV2PoolConfig{}

	conquestV2PoolManager.EXPECT().GetConfig(gomock.Any()).Return(expectedConfig, nil)

	config, err := apitest.Client().GMGetConquestV2PoolConfig(ctx)
	require.NoError(t, err)

	assert.Equal(t, expectedConfig, config)
}

func TestGMGetConquestV2Summary(t *testing.T) {
	var conquestV2SummaryGetter *mock.MockConquestV2SummaryGetter

	var accountID proto.AccountID

	// Setup
	{
		// Account
		{
			var err error
			accountID, err = apitest.CreateRandomAdminAccount("TestGMGetConquestV2Summary")
			require.NoError(t, err)
		}

		// Mocks
		{
			ctrl := gomock.NewController(t)

			conquestV2SummaryGetter = mock.NewMockConquestV2SummaryGetter(ctrl)

			apiService := apitest.APIService()

			originalConquestV2SummaryGetter := apiService.RPC.ConquestV2SummaryGetter

			apiService.RPC.ConquestV2SummaryGetter = conquestV2SummaryGetter

			t.Cleanup(func() {
				apiService.RPC.ConquestV2SummaryGetter = originalConquestV2SummaryGetter
			})
		}
	}

	ctx := apitest.AccountContext(accountID)

	expectedSummary := &proto.ConquestV2Summary{Pool: 1}

	conquestV2SummaryGetter.EXPECT().Get(gomock.Any()).Return(expectedSummary, nil)

	summary, err := apitest.Client().GMGetConquestV2Summary(ctx)
	require.NoError(t, err)

	assert.Equal(t, expectedSummary, summary)
}

func TestGMListConquestV2AccountTreasureProgress(t *testing.T) {
	var conquestV2TreasureCalculator *mock.MockConquestV2TreasureCalculator

	var adminAccountID, accountID1, accountID2, accountID3 proto.AccountID

	var name1, name2, name3 string

	// Setup
	{
		// Account
		{
			var err error
			adminAccountID, err = apitest.CreateRandomAdminAccount("TestGMListConquestV2AccountTreasureProgress")
			require.NoError(t, err)

			name1 = "TestGMListConquestV2AccountTreasureProgress-1"
			accountID1, _, err = apitest.CreateRandomAccount(name1)
			require.NoError(t, err)

			name2 = "TestGMListConquestV2AccountTreasureProgress-2"
			accountID2, _, err = apitest.CreateRandomAccount(name2)
			require.NoError(t, err)

			name3 = "TestGMListConquestV2AccountTreasureProgress-3"
			accountID3, _, err = apitest.CreateRandomAccount(name3)
			require.NoError(t, err)
		}

		// Conquest points
		{
			err := data.DB.ConquestPoints().Truncate()
			require.NoError(t, err)

			// Player 1
			{
				existingPointsPlayer, err := data.DB.ConquestPoints(nil).FindOrCreateByAddressAndEventID(accountID1, 2)
				require.NoError(t, err)

				existingPointsPlayer.CurrentPoints = uint64(300)

				err = data.DB.Save(existingPointsPlayer)
				require.NoError(t, err)
			}

			// Player 2
			{
				existingPointsPlayer, err := data.DB.ConquestPoints(nil).FindOrCreateByAddressAndEventID(accountID2, 2)
				require.NoError(t, err)

				existingPointsPlayer.CurrentPoints = uint64(2000)

				err = data.DB.Save(existingPointsPlayer)
				require.NoError(t, err)
			}

			// Player 3
			{
				existingPointsPlayer, err := data.DB.ConquestPoints(nil).FindOrCreateByAddressAndEventID(accountID3, 2)
				require.NoError(t, err)

				existingPointsPlayer.CurrentPoints = uint64(240)

				err = data.DB.Save(existingPointsPlayer)
				require.NoError(t, err)
			}
		}

		// Mocks
		{
			ctrl := gomock.NewController(t)

			conquestV2TreasureCalculator = mock.NewMockConquestV2TreasureCalculator(ctrl)

			apiService := apitest.APIService()

			originalConquestV2TreasureCalculator := apiService.RPC.ConquestV2TreasureCalculator

			apiService.RPC.ConquestV2TreasureCalculator = conquestV2TreasureCalculator

			t.Cleanup(func() {
				apiService.RPC.ConquestV2TreasureCalculator = originalConquestV2TreasureCalculator
			})
		}
	}

	ctx := apitest.AccountContext(adminAccountID)

	conquestV2TreasureCalculator.EXPECT().FromConquestPoints(gomock.Any()).DoAndReturn(func(conquestPoints *data.ConquestPoints) (*data.ConquestV2TreasureProgress, error) {
		assert.Equal(t, 2, int(conquestPoints.EventID))
		assert.Equal(t, 2000, int(conquestPoints.CurrentPoints))

		return &data.ConquestV2TreasureProgress{
			ConquestV2TreasureProgress: &proto.ConquestV2TreasureProgress{
				TreasureLevel:          3,
				TreasurePoints:         500,
				TreasurePointsRequired: 500,
			}}, nil
	})
	conquestV2TreasureCalculator.EXPECT().FromConquestPoints(gomock.Any()).DoAndReturn(func(conquestPoints *data.ConquestPoints) (*data.ConquestV2TreasureProgress, error) {
		assert.Equal(t, 2, int(conquestPoints.EventID))
		assert.Equal(t, 300, int(conquestPoints.CurrentPoints))

		return &data.ConquestV2TreasureProgress{
			ConquestV2TreasureProgress: &proto.ConquestV2TreasureProgress{
				TreasureLevel:          1,
				TreasurePoints:         50,
				TreasurePointsRequired: 450,
			}}, nil
	})
	conquestV2TreasureCalculator.EXPECT().FromConquestPoints(gomock.Any()).DoAndReturn(func(conquestPoints *data.ConquestPoints) (*data.ConquestV2TreasureProgress, error) {
		assert.Equal(t, 2, int(conquestPoints.EventID))
		assert.Equal(t, 240, int(conquestPoints.CurrentPoints))

		return &data.ConquestV2TreasureProgress{
			ConquestV2TreasureProgress: &proto.ConquestV2TreasureProgress{
				TreasureLevel:          0,
				TreasurePoints:         240,
				TreasurePointsRequired: 10,
			}}, nil
	})

	page, accountTreasureProgress, err := apitest.Client().GMListConquestV2AccountTreasureProgress(ctx, nil)
	require.NoError(t, err)
	assert.NotNil(t, page)

	require.NotNil(t, accountTreasureProgress)
	require.Len(t, accountTreasureProgress, 3)

	progress := accountTreasureProgress[0]
	assert.Equal(t, accountID2, progress.AccountID)
	assert.Equal(t, name2, progress.AccountName)
	assert.Equal(t, 3, int(progress.Progress.TreasureLevel))
	assert.Equal(t, 500, int(progress.Progress.TreasurePoints))
	assert.Equal(t, 500, int(progress.Progress.TreasurePointsRequired))

	progress = accountTreasureProgress[1]
	assert.Equal(t, accountID1, progress.AccountID)
	assert.Equal(t, name1, progress.AccountName)
	assert.Equal(t, 1, int(progress.Progress.TreasureLevel))
	assert.Equal(t, 50, int(progress.Progress.TreasurePoints))
	assert.Equal(t, 450, int(progress.Progress.TreasurePointsRequired))

	progress = accountTreasureProgress[2]
	assert.Equal(t, accountID3, progress.AccountID)
	assert.Equal(t, name3, progress.AccountName)
	assert.Equal(t, 0, int(progress.Progress.TreasureLevel))
	assert.Equal(t, 240, int(progress.Progress.TreasurePoints))
	assert.Equal(t, 10, int(progress.Progress.TreasurePointsRequired))
}

func createConquest(t *testing.T, accountID proto.AccountID, mode proto.GameMode, status proto.ConquestStatus, nonce uint64, progress proto.ConquestMatchResultMap) {
	now := time.Now().UTC()
	conq := &data.Conquest{Conquest: &proto.Conquest{
		AccountID:     accountID,
		Mode:          mode,
		Hero:          proto.Hero_ADA,
		Status:        status,
		CreatedAt:     &now,
		Nonce:         nonce,
		MatchProgress: progress,
	}}

	_, err := data.DB.Conquests(nil).Insert(conq)
	require.NoError(t, err)
}
