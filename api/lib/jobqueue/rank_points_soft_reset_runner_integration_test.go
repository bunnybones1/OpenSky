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
	"github.com/horizon-games/OpenSky/api/lib/ranking"
	"github.com/horizon-games/OpenSky/api/proto"
)

func TestRankPointsSoftResetTask(t *testing.T) {
	var task *data.Task

	var taskPayload jobqueue.RankPointsSoftResetTask

	var accountID1, accountID2, accountID3, accountID4, accountID5 proto.AccountID

	mode := proto.GameMode_RANKED_CONSTRUCTED

	season := uint16(11)

	{
		{
			taskPayload = jobqueue.RankPointsSoftResetTask{
				Season: season,
				Week:   2,
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

			accountID1, _, err = apitest.CreateRandomAccount("TestRankPointsSoftResetTask-1")
			require.NoError(t, err)

			accountID2, _, err = apitest.CreateRandomAccount("TestRankPointsSoftResetTask-2")
			require.NoError(t, err)

			accountID3, _, err = apitest.CreateRandomAccount("TestRankPointsSoftResetTask-3")
			require.NoError(t, err)

			accountID4, _, err = apitest.CreateRandomAccount("TestRankPointsSoftResetTask-4")
			require.NoError(t, err)

			accountID5, _, err = apitest.CreateRandomAccount("TestRankPointsSoftResetTask-5")
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
				stats.PlayerRankState = newRankStateWithRP(*stats.Score)

				err = data.DB.Save(stats)
				require.NoError(t, err)
			}
			// Prophet I
			{
				stats, err := data.DB.AccountStats().FindOrCreateByAccountIDAndMode(accountID2, mode, season)
				require.NoError(t, err)

				stats.Score = new(int32)
				*stats.Score = 970

				stats.PlayerRank = proto.PlayerRank_EXPERT
				stats.PlayerRankStage = proto.PlayerRankStage_STAGE_I
				stats.PlayerRankState = newRankStateWithRP(*stats.Score)

				err = data.DB.Save(stats)
				require.NoError(t, err)
			}
			// Master
			{
				stats, err := data.DB.AccountStats().FindOrCreateByAccountIDAndMode(accountID3, mode, season)
				require.NoError(t, err)

				stats.Score = new(int32)
				*stats.Score = 1250

				stats.PlayerRank = proto.PlayerRank_MASTER
				stats.PlayerRankStage = proto.PlayerRankStage_STAGE_NONE
				stats.PlayerRankState = newRankStateWithRP(*stats.Score)

				err = data.DB.Save(stats)
				require.NoError(t, err)
			}
			// Grandmaster [1]
			{
				stats, err := data.DB.AccountStats().FindOrCreateByAccountIDAndMode(accountID4, mode, season)
				require.NoError(t, err)

				stats.Score = new(int32)
				*stats.Score = 1500

				stats.PlayerRank = proto.PlayerRank_GRANDWEAVER
				stats.PlayerRankStage = proto.PlayerRankStage_STAGE_NONE
				stats.PlayerRankState = newRankStateWithRP(*stats.Score)

				err = data.DB.Save(stats)
				require.NoError(t, err)
			}
			// Grandmaster [2]
			{
				stats, err := data.DB.AccountStats().FindOrCreateByAccountIDAndMode(accountID5, mode, season)
				require.NoError(t, err)

				stats.Score = new(int32)
				*stats.Score = 1600

				stats.PlayerRank = proto.PlayerRank_GRANDWEAVER
				stats.PlayerRankStage = proto.PlayerRankStage_STAGE_NONE
				stats.PlayerRankState = newRankStateWithRP(*stats.Score)

				err = data.DB.Save(stats)
				require.NoError(t, err)
			}
		}
	}

	// Execute task
	runner, err := jobqueue.NewRankPointsSoftResetRunner()
	require.NoError(t, err)

	err = runner.RunTasks(context.Background(), data.DB.Session, []*data.Task{task})
	require.NoError(t, err)

	// Check stats after running task

	{
		// Trainee II
		{
			stats, err := data.DB.AccountStats().FindOrCreateByAccountIDAndMode(accountID1, mode, season)
			require.NoError(t, err)

			assert.Equal(t, int32(489), *stats.Score, "no change expected")
			assert.Equal(t, proto.PlayerRank_TRAINEE, stats.PlayerRank, "no change expected")
			assert.Equal(t, proto.PlayerRankStage_STAGE_II, stats.PlayerRankStage, "no change expected")
		}
		// Master I
		{
			stats, err := data.DB.AccountStats().FindOrCreateByAccountIDAndMode(accountID2, mode, season)
			require.NoError(t, err)

			assert.Equal(t, int32(970), *stats.Score, "no change expected")
			assert.Equal(t, proto.PlayerRank_EXPERT, stats.PlayerRank, "no change expected")
			assert.Equal(t, proto.PlayerRankStage_STAGE_I, stats.PlayerRankStage, "no change expected")
		}
		// Legend
		{
			stats, err := data.DB.AccountStats().FindOrCreateByAccountIDAndMode(accountID3, mode, season)
			require.NoError(t, err)

			assert.Equal(t, int32(1250), *stats.Score)
			assert.Equal(t, proto.PlayerRank_GRANDWEAVER, stats.PlayerRank, "no change expected")
			assert.Equal(t, proto.PlayerRankStage_STAGE_NONE, stats.PlayerRankStage, "no change expected")
		}
		// Grandmaster [1]
		{
			stats, err := data.DB.AccountStats().FindOrCreateByAccountIDAndMode(accountID4, mode, season)
			require.NoError(t, err)

			assert.Equal(t, int32(1400), *stats.Score)
			assert.Equal(t, proto.PlayerRank_GRANDWEAVER, stats.PlayerRank, "no change expected")
			assert.Equal(t, proto.PlayerRankStage_STAGE_NONE, stats.PlayerRankStage, "no change expected")
		}
		// Grandmaster [2]
		{
			stats, err := data.DB.AccountStats().FindOrCreateByAccountIDAndMode(accountID5, mode, season)
			require.NoError(t, err)

			assert.Equal(t, int32(1400), *stats.Score)
			assert.Equal(t, proto.PlayerRank_GRANDWEAVER, stats.PlayerRank, "no change expected")
			assert.Equal(t, proto.PlayerRankStage_STAGE_NONE, stats.PlayerRankStage, "no change expected")
		}
	}

	{
		// Enqueue next task
		err := data.DB.Tasks(data.DB.Session).EnqueueTask(jobqueue.RankPointsSoftResetGroup, jobqueue.RankPointsSoftResetTask{
			Season: 11,
			Week:   3,
		}, nil, nil)
		assert.NoError(t, err)
	}

	// Check next task
	{
		nextTask, nextPayload, err := getRankPointsSoftResetTask()
		require.NoError(t, err)

		assert.Equal(t, uint16(11), nextPayload.Season)
		assert.Equal(t, uint8(3), nextPayload.Week)

		task = nextTask // update task
	}

	// Run again
	err = runner.RunTasks(context.Background(), data.DB.Session, []*data.Task{task})
	require.NoError(t, err)

	{
		// Enqueue next task
		err := data.DB.Tasks(data.DB.Session).EnqueueTask(jobqueue.RankPointsSoftResetGroup, jobqueue.RankPointsSoftResetTask{
			Season: 11,
			Week:   4,
		}, nil, nil)
		assert.NoError(t, err)
	}

	// Check next task
	{
		nextTask, nextPayload, err := getRankPointsSoftResetTask()
		require.NoError(t, err)

		assert.Equal(t, uint16(11), nextPayload.Season)
		assert.Equal(t, uint8(4), nextPayload.Week)

		task = nextTask // update task
	}

	// Run again
	err = runner.RunTasks(context.Background(), data.DB.Session, []*data.Task{task})
	require.Error(t, err, "soft reset should not run on week 4")

	{
		// Enqueue next task
		err := data.DB.Tasks(data.DB.Session).EnqueueTask(jobqueue.RankPointsSoftResetGroup, jobqueue.RankPointsSoftResetTask{
			Season: 12,
			Week:   1,
		}, nil, nil)
		assert.NoError(t, err)
	}

	// Check next task
	{
		nextTask, nextPayload, err := getRankPointsSoftResetTask()
		require.NoError(t, err)

		assert.Equal(t, uint16(12), nextPayload.Season)
		assert.Equal(t, uint8(1), nextPayload.Week)

		task = nextTask // update task
	}

	// Run again
	err = runner.RunTasks(context.Background(), data.DB.Session, []*data.Task{task})
	require.NoError(t, err)

	{
		// Enqueue next task
		err := data.DB.Tasks(data.DB.Session).EnqueueTask(jobqueue.RankPointsSoftResetGroup, jobqueue.RankPointsSoftResetTask{
			Season: 12,
			Week:   2,
		}, nil, nil)
		assert.NoError(t, err)
	}

	// Check next task
	{
		_, nextPayload, err := getRankPointsSoftResetTask()
		require.NoError(t, err)

		assert.Equal(t, uint16(12), nextPayload.Season)
		assert.Equal(t, uint8(2), nextPayload.Week)
	}
}

func newRankStateWithRP(rp int32) proto.RankState {
	initialRankState := ranking.InitialRankState()
	initialRankState.Win = ranking.Win
	initialRankState.RP = rp
	return proto.RankState{*initialRankState}
}

func getRankPointsSoftResetTask() (*data.Task, *jobqueue.RankPointsSoftResetTask, error) {
	var task *data.Task

	err := data.DB.Tasks().Find(db.Cond{
		"queue":  jobqueue.RankPointsSoftResetGroup,
		"status": proto.TaskStatus_PENDING,
	}).OrderBy("-id").One(&task)
	if err != nil {
		return nil, nil, fmt.Errorf("find task: %w", err)
	}

	var rankPointsSoftResetTask *jobqueue.RankPointsSoftResetTask

	err = json.Unmarshal(task.Payload, &rankPointsSoftResetTask)
	if err != nil {
		return nil, nil, fmt.Errorf("decode payload: %w", err)
	}

	return task, rankPointsSoftResetTask, nil
}
