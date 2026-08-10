//go:build integration

package jobqueue_test

import (
	"context"
	"encoding/json"
	"fmt"
	"testing"

	"github.com/stretchr/testify/require"
	"github.com/upper/db/v4"

	"github.com/stretchr/testify/assert"

	"github.com/horizon-games/OpenSky/api/apitest"
	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/lib/jobqueue"
	"github.com/horizon-games/OpenSky/api/proto"
)

func TestRankPointsHardResetTask(t *testing.T) {
	var task *data.Task

	var taskPayload jobqueue.RankPointsHardResetTask

	var accountID1, accountID2, accountID3, accountID4, accountID5 proto.AccountID

	mode := proto.GameMode_RANKED_CONSTRUCTED

	season := uint16(11)

	{
		{
			taskPayload = jobqueue.RankPointsHardResetTask{
				Season: season,
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

		// Add accounts
		{
			var err error

			accountID1, _, err = apitest.CreateRandomAccount("TestRankPointsHardResetTask-1")
			require.NoError(t, err)

			accountID2, _, err = apitest.CreateRandomAccount("TestRankPointsHardResetTask-2")
			require.NoError(t, err)

			accountID3, _, err = apitest.CreateRandomAccount("TestRankPointsHardResetTask-3")
			require.NoError(t, err)

			accountID4, _, err = apitest.CreateRandomAccount("TestRankPointsHardResetTask-4")
			require.NoError(t, err)

			accountID5, _, err = apitest.CreateRandomAccount("TestRankPointsHardResetTask-5")
			require.NoError(t, err)
		}

		// Add stats
		{
			// Trainee II
			{
				stats, err := data.DB.AccountStats().FindOrCreateByAccountIDAndMode(accountID1, mode, season)
				require.NoError(t, err)

				stats.Score = new(int32)
				*stats.Score = 489

				stats.PlayerRank = proto.PlayerRank_TRAINEE
				stats.PlayerRankStage = proto.PlayerRankStage_STAGE_II

				err = data.DB.Save(stats)
				require.NoError(t, err)
			}
			// Expert I
			{
				stats, err := data.DB.AccountStats().FindOrCreateByAccountIDAndMode(accountID2, mode, season)
				require.NoError(t, err)

				stats.Score = new(int32)
				*stats.Score = 970

				stats.PlayerRank = proto.PlayerRank_EXPERT
				stats.PlayerRankStage = proto.PlayerRankStage_STAGE_I

				err = data.DB.Save(stats)
				require.NoError(t, err)
			}
			// Master
			{
				stats, err := data.DB.AccountStats().FindOrCreateByAccountIDAndMode(accountID3, mode, season)
				require.NoError(t, err)

				stats.Score = new(int32)
				*stats.Score = 1200

				stats.PlayerRank = proto.PlayerRank_MASTER
				stats.PlayerRankStage = proto.PlayerRankStage_STAGE_NONE

				err = data.DB.Save(stats)
				require.NoError(t, err)
			}
			// Grandweaver [1]
			{
				stats, err := data.DB.AccountStats().FindOrCreateByAccountIDAndMode(accountID4, mode, season)
				require.NoError(t, err)

				stats.Score = new(int32)
				*stats.Score = 1400

				stats.PlayerRank = proto.PlayerRank_GRANDWEAVER
				stats.PlayerRankStage = proto.PlayerRankStage_STAGE_NONE

				err = data.DB.Save(stats)
				require.NoError(t, err)
			}
			// Grandweaver [2]
			{
				stats, err := data.DB.AccountStats().FindOrCreateByAccountIDAndMode(accountID5, mode, season)
				require.NoError(t, err)

				stats.Score = new(int32)
				*stats.Score = 1400

				stats.PlayerRank = proto.PlayerRank_GRANDWEAVER
				stats.PlayerRankStage = proto.PlayerRankStage_STAGE_NONE

				err = data.DB.Save(stats)
				require.NoError(t, err)
			}
		}
	}

	// Execute task
	runner, err := jobqueue.NewRankPointsHardResetRunner()
	require.NoError(t, err)

	err = runner.RunTasks(context.Background(), data.DB.Session, []*data.Task{task})
	require.NoError(t, err)

	// Check stats after running task
	{
		{
			stats, err := data.DB.AccountStats().FindOrCreateByAccountIDAndMode(accountID1, mode, season+1)
			require.NoError(t, err)

			assert.Equal(t, int32(350), *stats.Score)
			assert.Equal(t, proto.PlayerRank_TRAINEE, stats.PlayerRank)
			assert.Equal(t, proto.PlayerRankStage_STAGE_I, stats.PlayerRankStage)
		}
		{
			stats, err := data.DB.AccountStats().FindOrCreateByAccountIDAndMode(accountID2, mode, season+1)
			require.NoError(t, err)

			assert.Equal(t, int32(750), *stats.Score)
			assert.Equal(t, proto.PlayerRank_APPRENTICE, stats.PlayerRank)
			assert.Equal(t, proto.PlayerRankStage_STAGE_II, stats.PlayerRankStage)
		}
		{
			stats, err := data.DB.AccountStats().FindOrCreateByAccountIDAndMode(accountID3, mode, season+1)
			require.NoError(t, err)

			assert.Equal(t, int32(900), *stats.Score)
			assert.Equal(t, proto.PlayerRank_EXPERT, stats.PlayerRank)
			assert.Equal(t, proto.PlayerRankStage_STAGE_I, stats.PlayerRankStage)
		}
		{
			stats, err := data.DB.AccountStats().FindOrCreateByAccountIDAndMode(accountID4, mode, season+1)
			require.NoError(t, err)

			assert.Equal(t, int32(1000), *stats.Score)
			assert.Equal(t, proto.PlayerRank_EXPERT, stats.PlayerRank)
			assert.Equal(t, proto.PlayerRankStage_STAGE_II, stats.PlayerRankStage)
		}
		{
			stats, err := data.DB.AccountStats().FindOrCreateByAccountIDAndMode(accountID5, mode, season+1)
			require.NoError(t, err)

			assert.Equal(t, int32(1000), *stats.Score)
			assert.Equal(t, proto.PlayerRank_EXPERT, stats.PlayerRank)
			assert.Equal(t, proto.PlayerRankStage_STAGE_II, stats.PlayerRankStage)
		}
	}

	{
		// Enqueue next task
		err := data.DB.Tasks(data.DB.Session).EnqueueTask(jobqueue.RankPointsHardResetGroup, jobqueue.RankPointsHardResetTask{
			Season: 12,
		}, nil, nil)
		assert.NoError(t, err)
	}

	// Check next task
	{
		nextTask, nextPayload, err := getRankPointsHardResetTask()
		require.NoError(t, err)

		assert.Equal(t, uint16(12), nextPayload.Season)

		task = nextTask // update task
	}

	// Run again
	err = runner.RunTasks(context.Background(), data.DB.Session, []*data.Task{task})
	require.NoError(t, err)

	{
		// Enqueue next task
		err := data.DB.Tasks(data.DB.Session).EnqueueTask(jobqueue.RankPointsHardResetGroup, jobqueue.RankPointsHardResetTask{
			Season: 13,
		}, nil, nil)
		assert.NoError(t, err)
	}

	// Check next task
	{
		nextTask, nextPayload, err := getRankPointsHardResetTask()
		require.NoError(t, err)

		assert.Equal(t, uint16(13), nextPayload.Season)

		task = nextTask // update task
	}
}

func getRankPointsHardResetTask() (*data.Task, *jobqueue.RankPointsHardResetTask, error) {
	var task *data.Task

	err := data.DB.Tasks().Find(db.Cond{
		"queue":  jobqueue.RankPointsHardResetGroup,
		"status": proto.TaskStatus_PENDING,
	}).OrderBy("-id").One(&task)
	if err != nil {
		return nil, nil, fmt.Errorf("find task: %w", err)
	}

	var rankPointsHardResetTask *jobqueue.RankPointsHardResetTask

	err = json.Unmarshal(task.Payload, &rankPointsHardResetTask)
	if err != nil {
		return nil, nil, fmt.Errorf("decode payload: %w", err)
	}

	return task, rankPointsHardResetTask, nil
}
