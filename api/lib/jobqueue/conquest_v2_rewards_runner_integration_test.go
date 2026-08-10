//go:build integration

package jobqueue_test

import (
	"context"
	"encoding/json"
	"fmt"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/upper/db/v4"
	"go.uber.org/mock/gomock"

	"github.com/horizon-games/OpenSky/api/apitest"
	"github.com/horizon-games/OpenSky/api/config"
	"github.com/horizon-games/OpenSky/api/data"
	analyticsMock "github.com/horizon-games/OpenSky/api/lib/analytics/mock"
	"github.com/horizon-games/OpenSky/api/lib/conquest/conquestv2"
	"github.com/horizon-games/OpenSky/api/lib/jobqueue"
	"github.com/horizon-games/OpenSky/api/lib/jobqueue/mock"
	"github.com/horizon-games/OpenSky/api/proto"
)

func TestConquestV2RewardsRunner(t *testing.T) {
	var poolManager *mock.MockConquestV2PoolManager

	var treasureCalculator *mock.MockConquestV2TreasureCalculator

	var analyticsTracker *analyticsMock.MockTracker

	var task *data.Task

	var taskPayload jobqueue.ConquestV2RewardsTask

	var accountID1, accountID2, accountID3, accountID4 proto.AccountID

	// Setup
	{
		// Mocks
		{
			ctrl := gomock.NewController(t)

			poolManager = mock.NewMockConquestV2PoolManager(ctrl)
			treasureCalculator = mock.NewMockConquestV2TreasureCalculator(ctrl)
			analyticsTracker = analyticsMock.NewMockTracker(ctrl)
		}

		// Task
		{
			taskPayload = jobqueue.ConquestV2RewardsTask{
				Season: 2,
				Week:   4,
			}

			payloadJSON, err := json.Marshal(taskPayload)
			require.NoError(t, err)

			task = &data.Task{
				Task: &proto.Task{
					Status:    proto.TaskStatus_PENDING,
					Payload:   payloadJSON,
					CreatedAt: data.TimeNowUTCPtr(),
					RunAt:     data.TimeNowUTCPtr(),
				},
			}
		}

		// Account
		{
			var err error

			accountID1, _, err = apitest.CreateRandomAccount("TestConquestV2RewardsRunner-1")
			require.NoError(t, err)

			accountID2, _, err = apitest.CreateRandomAccount("TestConquestV2RewardsRunner-2")
			require.NoError(t, err)

			accountID3, _, err = apitest.CreateRandomAccount("TestConquestV2RewardsRunner-3")
			require.NoError(t, err)

			accountID4, _, err = apitest.CreateRandomAccount("TestConquestV2RewardsRunner-4")
			require.NoError(t, err)
		}

		// Conquest points
		{
			// Player 1
			{
				existingPointsPlayer, err := data.DB.ConquestPoints(nil).FindOrCreateByAddressAndEventID(accountID1, conquestv2.EventID)
				require.NoError(t, err)

				existingPointsPlayer.CurrentPoints = uint64(300) // Level 1 - 50/500 - weight of 1 kg

				err = data.DB.Save(existingPointsPlayer)
				require.NoError(t, err)
			}

			// Player 2
			{
				existingPointsPlayer, err := data.DB.ConquestPoints(nil).FindOrCreateByAddressAndEventID(accountID2, conquestv2.EventID)
				require.NoError(t, err)

				existingPointsPlayer.CurrentPoints = uint64(2000) // Level 3 - 500/1000 - 6.89 kg

				err = data.DB.Save(existingPointsPlayer)
				require.NoError(t, err)
			}

			// Player 3
			{
				existingPointsPlayer, err := data.DB.ConquestPoints(nil).FindOrCreateByAddressAndEventID(accountID3, conquestv2.EventID)
				require.NoError(t, err)

				existingPointsPlayer.CurrentPoints = uint64(240) // Level 0 - 240 / 250 -  0 kg - should not be included.

				err = data.DB.Save(existingPointsPlayer)
				require.NoError(t, err)
			}

			// Player 4
			{
				existingPointsPlayer, err := data.DB.ConquestPoints(nil).FindOrCreateByAddressAndEventID(accountID4, conquestv2.EventID)
				require.NoError(t, err)

				existingPointsPlayer.CurrentPoints = uint64(13750) // Level 10 - 2500/2500 - 218.68 kg

				err = data.DB.Save(existingPointsPlayer)
				require.NoError(t, err)
			}

			t.Cleanup(func() {
				err := data.DB.ConquestPoints(nil).Truncate()
				require.NoError(t, err)
			})
		}

		t.Cleanup(func() {
			err := data.DB.Tasks(nil).Truncate()
			require.NoError(t, err)

			err = data.DB.FeedEvents(nil).Truncate()
			require.NoError(t, err)
		})
	}

	parsedTime, err := time.ParseInLocation("15:04", "02:03", time.UTC)
	require.NoError(t, err)

	cfg := config.OpenSkyConquestV2Config{
		RewardsScheduleWeekday: 1,          // Monday
		RewardsScheduleTime:    parsedTime, // 02:03
		RewardsSendWeekday:     2,          // Tuesday
		RewardsSendTime:        parsedTime, // 02:03
	}

	runner, err := jobqueue.NewConquestV2RewardsRunner(cfg, poolManager, treasureCalculator, analyticsTracker)
	require.NoError(t, err)

	poolAmount := uint64(100)
	expectedConfig := &proto.ConquestV2PoolConfig{}
	expectedConfig.Settings = &proto.ConquestV2PoolConfigData{
		WeightPerSilverCard: float32(0.05),
	}

	poolManager.EXPECT().GetPool(gomock.Any()).Return(&proto.ConquestV2Pool{Amount: poolAmount}, nil)
	poolManager.EXPECT().GetConfig(gomock.Any()).Return(expectedConfig, nil)

	treasureCalculator.EXPECT().FromConquestPoints(gomock.Any()).DoAndReturn(func(conquestPoints *data.ConquestPoints) (*data.ConquestV2TreasureProgress, error) {
		assert.Equal(t, conquestv2.EventID, int(conquestPoints.EventID))
		assert.Equal(t, 300, int(conquestPoints.CurrentPoints))

		return &data.ConquestV2TreasureProgress{
			ConquestV2TreasureProgress: &proto.ConquestV2TreasureProgress{
				TreasureLevel:          1,
				TreasurePoints:         50,
				TreasurePointsRequired: 450,
			},
			Weight:          1,
			PointsAccounted: 250,
		}, nil
	})
	treasureCalculator.EXPECT().FromConquestPoints(gomock.Any()).DoAndReturn(func(conquestPoints *data.ConquestPoints) (*data.ConquestV2TreasureProgress, error) {
		assert.Equal(t, conquestv2.EventID, int(conquestPoints.EventID))
		assert.Equal(t, 2000, int(conquestPoints.CurrentPoints))

		return &data.ConquestV2TreasureProgress{
			ConquestV2TreasureProgress: &proto.ConquestV2TreasureProgress{
				TreasureLevel:          3,
				TreasurePoints:         500,
				TreasurePointsRequired: 500,
			},
			Weight:          6.9,
			PointsAccounted: 1500,
		}, nil
	})
	treasureCalculator.EXPECT().FromConquestPoints(gomock.Any()).DoAndReturn(func(conquestPoints *data.ConquestPoints) (*data.ConquestV2TreasureProgress, error) {
		assert.Equal(t, conquestv2.EventID, int(conquestPoints.EventID))
		assert.Equal(t, 13750, int(conquestPoints.CurrentPoints))

		return &data.ConquestV2TreasureProgress{
			ConquestV2TreasureProgress: &proto.ConquestV2TreasureProgress{
				TreasureLevel:          10,
				TreasurePoints:         2500,
				TreasurePointsRequired: 2500,
			},
			Weight:          218.68,
			PointsAccounted: 11250,
		}, nil
	})

	// Test mock of Silver cards in treasures
	treasureCalculator.EXPECT().GetSilverCardsAmountInTreasurePerLevelWithConfig(gomock.Any(), gomock.Any()).DoAndReturn(func(weightPerSilver float32, level uint16) int64 {
		assert.Equal(t, float32(0.05), weightPerSilver)
		assert.Equal(t, 1, int(level))
		return 0
	})
	treasureCalculator.EXPECT().GetSilverCardsAmountInTreasurePerLevelWithConfig(gomock.Any(), gomock.Any()).DoAndReturn(func(weightPerSilver float32, level uint16) int64 {
		assert.Equal(t, float32(0.05), weightPerSilver)
		assert.Equal(t, 3, int(level))
		return 0
	})
	treasureCalculator.EXPECT().GetSilverCardsAmountInTreasurePerLevelWithConfig(gomock.Any(), gomock.Any()).DoAndReturn(func(weightPerSilver float32, level uint16) int64 {
		assert.Equal(t, float32(0.05), weightPerSilver)
		assert.Equal(t, 10, int(level))
		return 10
	})

	// Test mock of usdc in treasures
	treasureCalculator.EXPECT().GetUSDCAmountInTreasurePerLevelWithPool(gomock.Any(), gomock.Any(), gomock.Any()).DoAndReturn(func(_poolAmount uint64, _poolTotalWeight float32, _level uint16) int64 {
		assert.Equal(t, poolAmount, _poolAmount)
		assert.Equal(t, float32(226.57999), _poolTotalWeight)
		assert.Equal(t, 1, int(_level))
		return 441345
	})
	treasureCalculator.EXPECT().GetUSDCAmountInTreasurePerLevelWithPool(gomock.Any(), gomock.Any(), gomock.Any()).DoAndReturn(func(_poolAmount uint64, _poolTotalWeight float32, _level uint16) int64 {
		assert.Equal(t, poolAmount, _poolAmount)
		assert.Equal(t, float32(226.57999), _poolTotalWeight)
		assert.Equal(t, 3, int(_level))
		return 3045282
	})
	treasureCalculator.EXPECT().GetUSDCAmountInTreasurePerLevelWithPool(gomock.Any(), gomock.Any(), gomock.Any()).DoAndReturn(func(_poolAmount uint64, _poolTotalWeight float32, _level uint16) int64 {
		assert.Equal(t, poolAmount, _poolAmount)
		assert.Equal(t, float32(226.57999), _poolTotalWeight)
		assert.Equal(t, 10, int(_level))
		return 96513374
	})

	analyticsTracker.EXPECT().TrackTreasureRewards(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).Times(3)

	err = runner.RunTasks(context.Background(), data.DB.Session, []*data.Task{task})
	require.NoError(t, err)

	assert.Equal(t, proto.TaskStatus_COMPLETED, task.Status)

	// Check conquest points
	{
		conquestPoints, err := data.DB.ConquestPoints(nil).FindOrCreateByAddressAndEventID(accountID1, conquestv2.EventID)
		require.NoError(t, err)
		assert.Equal(t, 50, int(conquestPoints.CurrentPoints))

		conquestPoints, err = data.DB.ConquestPoints(nil).FindOrCreateByAddressAndEventID(accountID2, conquestv2.EventID)
		require.NoError(t, err)
		assert.Equal(t, 500, int(conquestPoints.CurrentPoints))

		conquestPoints, err = data.DB.ConquestPoints(nil).FindOrCreateByAddressAndEventID(accountID3, conquestv2.EventID)
		require.NoError(t, err)
		assert.Equal(t, 240, int(conquestPoints.CurrentPoints))

		conquestPoints, err = data.DB.ConquestPoints(nil).FindOrCreateByAddressAndEventID(accountID4, conquestv2.EventID)
		require.NoError(t, err)
		assert.Equal(t, 2500, int(conquestPoints.CurrentPoints))
	}

	// Check scheduled sending rewards
	{
		task, payload, err := getConquestV2SendRewardTask(accountID1)
		require.NoError(t, err)

		assert.WithinDuration(t, data.TimeNowUTC(), *task.RunAt, time.Hour*24*7*2)
		assert.Equal(t, time.Tuesday, task.RunAt.Weekday())
		assert.Equal(t, parsedTime.Hour(), task.RunAt.Hour())
		assert.Equal(t, parsedTime.Minute(), task.RunAt.Minute())

		assert.Equal(t, accountID1, payload.AccountID)
		assert.Equal(t, taskPayload.Season, payload.Season)
		assert.Equal(t, taskPayload.Week, payload.Week)
		assert.Equal(t, 1, int(payload.TreasureLevel))
		assert.Equalf(t, 441345, int(payload.AmountUSDC.Int64()), "100 / (6.9 + 1 + 218.68) * 1 = 0.441345")
		assert.Equalf(t, 0, len(payload.SilverCardAmounts), "0.05 * 1 = 0.05 silver")

		task, payload, err = getConquestV2SendRewardTask(accountID2)
		require.NoError(t, err)

		assert.WithinDuration(t, data.TimeNowUTC(), *task.RunAt, time.Hour*24*7*2)
		assert.Equal(t, time.Tuesday, task.RunAt.Weekday())
		assert.Equal(t, parsedTime.Hour(), task.RunAt.Hour())
		assert.Equal(t, parsedTime.Minute(), task.RunAt.Minute())

		assert.Equal(t, accountID2, payload.AccountID)
		assert.Equal(t, taskPayload.Season, payload.Season)
		assert.Equal(t, taskPayload.Week, payload.Week)
		assert.Equal(t, 3, int(payload.TreasureLevel))
		assert.Equalf(t, 3045282, int(payload.AmountUSDC.Int64()), "100 / (6.9 + 1 + 218.68) * 6.9 = 3.045282")
		assert.Equalf(t, 0, len(payload.SilverCardAmounts), "0.05 * 6.9 = 0.345 silver")

		_, _, err = getConquestV2SendRewardTask(accountID3)
		require.ErrorIs(t, err, db.ErrNoMoreRows)

		task, payload, err = getConquestV2SendRewardTask(accountID4)
		require.NoError(t, err)

		assert.WithinDuration(t, data.TimeNowUTC(), *task.RunAt, time.Hour*24*7*2)
		assert.Equal(t, time.Tuesday, task.RunAt.Weekday())
		assert.Equal(t, parsedTime.Hour(), task.RunAt.Hour())
		assert.Equal(t, parsedTime.Minute(), task.RunAt.Minute())

		assert.Equal(t, accountID4, payload.AccountID)
		assert.Equal(t, taskPayload.Season, payload.Season)
		assert.Equal(t, taskPayload.Week, payload.Week)
		assert.Equal(t, 10, int(payload.TreasureLevel))
		assert.Equalf(t, 96513374, int(payload.AmountUSDC.Int64()), "100 / (6.9 + 1 + 218.68) * 218.68 = 96.513374")

		// Count silvers for treasure level 10
		silverAmount := uint64(0)
		for _, amount := range payload.SilverCardAmounts {
			silverAmount = silverAmount + amount
		}
		assert.Equalf(t, uint64(10*100), silverAmount, "0.05 * 218.68 = 10.934 silver")
	}

	// Check scheduled pool recalculation
	{
		task, payload, err := getConquestV2PoolRecalculateTask()
		require.NoError(t, err)

		assert.WithinDuration(t, data.TimeNowUTC(), *task.RunAt, time.Hour)
		assert.WithinDuration(t, payload.CreatedAt, data.TimeNowUTC(), time.Minute)
	}

	// Check next task
	{
		nextTask, nextPayload, err := apitest.GetTask[jobqueue.ConquestV2RewardsTask](jobqueue.ConquestV2RewardsWorkGroup, nil)
		require.NoError(t, err)

		assert.WithinDuration(t, data.TimeNowUTC(), *nextTask.RunAt, time.Hour*24*8)
		assert.Equal(t, time.Monday, nextTask.RunAt.Weekday())
		assert.Equal(t, parsedTime.Hour(), nextTask.RunAt.Hour())
		assert.Equal(t, parsedTime.Minute(), nextTask.RunAt.Minute())

		assert.Equal(t, 3, int(nextPayload.Season))
		assert.Equal(t, 1, int(nextPayload.Week))
	}
}

func getConquestV2SendRewardTask(accountID proto.AccountID) (*data.Task, *jobqueue.ConquestV2SendRewardTask, error) {
	var task *data.Task

	err := data.DB.Tasks(nil).Find(db.Cond{"queue": jobqueue.ConquestV2SendRewardQueue, "account_id": accountID}).One(&task)
	if err != nil {
		return nil, nil, fmt.Errorf("find task: %w", err)
	}

	var conquestV2SendRewardTask *jobqueue.ConquestV2SendRewardTask

	err = json.Unmarshal(task.Payload, &conquestV2SendRewardTask)
	if err != nil {
		return nil, nil, fmt.Errorf("decode payload: %w", err)
	}

	return task, conquestV2SendRewardTask, nil
}

func getConquestV2PoolRecalculateTask() (*data.Task, *jobqueue.ConquestV2PoolRecalculateTask, error) {
	var task *data.Task

	err := data.DB.Tasks(nil).Find(db.Cond{"queue": jobqueue.ConquestV2PoolWorkGroup}).One(&task)
	if err != nil {
		return nil, nil, fmt.Errorf("find task: %w", err)
	}

	var conquestV2PoolRecalculateTask *jobqueue.ConquestV2PoolRecalculateTask

	err = json.Unmarshal(task.Payload, &conquestV2PoolRecalculateTask)
	if err != nil {
		return nil, nil, fmt.Errorf("decode payload: %w", err)
	}

	return task, conquestV2PoolRecalculateTask, nil
}
