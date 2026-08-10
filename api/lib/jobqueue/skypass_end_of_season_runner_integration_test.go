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

	"github.com/horizon-games/OpenSky/api/apitest"
	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/lib/jobqueue"
	"github.com/horizon-games/OpenSky/api/proto"
)

func TestSkypassEndOfSeasonRunner(t *testing.T) {
	var task *data.Task

	var accountID1, accountID2, accountID3 proto.AccountID

	season := data.CurrentSeason() - 1

	// Setup
	{
		// Account
		{
			var err error

			accountID1, _, err = apitest.CreateRandomAccount("TestSkypassEndOfSeasonRunner-1")
			require.NoError(t, err)

			accountID2, _, err = apitest.CreateRandomAccount("TestSkypassEndOfSeasonRunner-2")
			require.NoError(t, err)

			accountID3, _, err = apitest.CreateRandomAccount("TestSkypassEndOfSeasonRunner-3")
			require.NoError(t, err)
		}

		// Skypass season stats
		{
			seasonStat, err := data.DB.SkypassSeasonStats().FindOrCreate(accountID1, season)
			require.NoError(t, err)
			seasonStat.InitialAccountLevel = 0
			seasonStat.AchievedAccountLevel = 1
			err = data.DB.Save(seasonStat)
			require.NoError(t, err)

			seasonStat, err = data.DB.SkypassSeasonStats().FindOrCreate(accountID2, season)
			require.NoError(t, err)
			seasonStat.InitialAccountLevel = 2
			seasonStat.AchievedAccountLevel = 4
			err = data.DB.Save(seasonStat)
			require.NoError(t, err)

			seasonStat, err = data.DB.SkypassSeasonStats().FindOrCreate(accountID3, season)
			require.NoError(t, err)
			seasonStat.InitialAccountLevel = 6
			seasonStat.AchievedAccountLevel = 6
			err = data.DB.Save(seasonStat)
			require.NoError(t, err)
		}

		// Tasks
		{
			taskPayload := &jobqueue.SkypassEndOfSeasonTask{
				Season: season,
			}

			payloadJSON, err := json.Marshal(taskPayload)
			require.NoError(t, err)

			task = &data.Task{
				Task: &proto.Task{
					Payload: payloadJSON,
				},
			}
		}
	}

	ctx := context.Background()

	runner := jobqueue.NewSkypassEndOfSeasonRunner()

	err := runner.RunTasks(ctx, data.DB.Session, []*data.Task{task})
	require.NoError(t, err)

	assert.Equal(t, proto.TaskStatus_COMPLETED, task.Status)

	resultTask, resultTaskPayload, err := getSkypassEndOfSeasonTask()
	require.NoError(t, err)

	assert.Equal(t, data.CurrentSeason(), resultTaskPayload.Season)
	assert.WithinDuration(t, time.Unix(data.CurrentSeasonEnd(), 0), *resultTask.RunAt, time.Minute)

	_, taskPayload1, err := getSkypassAutoClaimTask(accountID1)
	require.NoError(t, err)
	assert.Equal(t, accountID1, taskPayload1.AccountID)
	assert.Equal(t, season, taskPayload1.Season)

	_, taskPayload2, err := getSkypassAutoClaimTask(accountID2)
	require.NoError(t, err)
	assert.Equal(t, accountID2, taskPayload2.AccountID)
	assert.Equal(t, season, taskPayload2.Season)

	_, _, err = getSkypassAutoClaimTask(accountID3)
	require.ErrorIs(t, err, db.ErrNoMoreRows)
}

func getSkypassEndOfSeasonTask() (*data.Task, *jobqueue.SkypassEndOfSeasonTask, error) {
	var task *data.Task

	err := data.DB.Tasks(nil).Find(db.Cond{"queue": jobqueue.SkypassEndOfSeasonWorkGroup}).One(&task)
	if err != nil {
		return nil, nil, fmt.Errorf("find task: %w", err)
	}

	var taskPayload *jobqueue.SkypassEndOfSeasonTask

	err = json.Unmarshal(task.Payload, &taskPayload)
	if err != nil {
		return nil, nil, fmt.Errorf("decode payload: %w", err)
	}

	return task, taskPayload, nil
}

func getSkypassAutoClaimTask(accountID proto.AccountID) (*data.Task, *jobqueue.SkypassAutoClaimTask, error) {
	var task *data.Task

	err := data.DB.Tasks(nil).Find(db.Cond{
		"queue":      jobqueue.SkypassAutoClaimWorkGroup,
		"account_id": accountID,
	}).One(&task)
	if err != nil {
		return nil, nil, fmt.Errorf("find task: %w", err)
	}

	var taskPayload *jobqueue.SkypassAutoClaimTask

	err = json.Unmarshal(task.Payload, &taskPayload)
	if err != nil {
		return nil, nil, fmt.Errorf("decode payload: %w", err)
	}

	return task, taskPayload, nil
}
