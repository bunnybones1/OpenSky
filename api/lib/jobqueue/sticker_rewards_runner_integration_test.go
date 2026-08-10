//go:build integration

package jobqueue_test

import (
	"context"
	"encoding/json"
	"fmt"
	"math/big"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/upper/db/v4"

	"github.com/horizon-games/OpenSky/api/apitest"
	"github.com/horizon-games/OpenSky/api/config"
	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/lib/jobqueue"
	"github.com/horizon-games/OpenSky/api/proto"
)

func TestStickerRewardsRunner(t *testing.T) {
	var accountID, invitedID1 proto.AccountID

	season := data.CurrentSeason()
	times := uint64(3)

	var task *data.Task

	var taskPayload jobqueue.StickerRewardsTask

	// Setup
	{
		// Account
		{
			var err error

			accountID, _, err = apitest.CreateRandomAccount("TestStickerRewardsRunner")
			require.NoError(t, err)

			invitedID1 = createInvitedAccount(t, "TestStickerRewardsRunner-invited-1", accountID)
		}

		// Levels per season
		{
			createLevelsPerSeason(t, invitedID1, accountID, season-1, 2, 2, 0) // carries over
		}

		// Sticker points
		{
			err := data.DB.Items().GainStickerPoints(accountID, big.NewInt(10), proto.TransactionType_SKYWEAVER, "")
			require.NoError(t, err)
		}

		// Task
		{
			taskPayload = jobqueue.StickerRewardsTask{
				Season: season,
				Times:  times,
			}

			payloadJSON, err := json.Marshal(taskPayload)
			require.NoError(t, err)

			task = &data.Task{
				Task: &proto.Task{
					Status:  proto.TaskStatus_PENDING,
					Payload: payloadJSON,
					RunAt:   data.TimeNowUTCPtr(),
				},
			}
		}

		// Stickers
		{
			sticker1 := &data.Sticker{Sticker: &proto.Sticker{
				RequiredPoints: 10,
				TokenID:        1,
				Season:         season,
			}}
			err := data.DB.Save(sticker1)
			require.NoError(t, err)

			sticker2 := &data.Sticker{Sticker: &proto.Sticker{
				RequiredPoints: 20,
				TokenID:        2,
				Season:         season,
			}}
			err = data.DB.Save(sticker2)
			require.NoError(t, err)

			t.Cleanup(func() {
				err := data.DB.Stickers().Truncate()
				require.NoError(t, err)
			})
		}
	}

	checkForPendingRewardsMinutes := uint(data.SeasonStartTime(season+1).Sub(data.TimeNowUTC())/time.Minute) + 10
	cfg := config.OpenSkyStickerRewardsConfig{
		CheckForPendingRewardsMinutes: checkForPendingRewardsMinutes,
	}

	runner := jobqueue.NewStickerRewardsRunner(cfg)

	err := runner.RunTasks(context.Background(), data.DB.Session, []*data.Task{task})
	require.NoError(t, err)

	assert.Equal(t, proto.TaskStatus_COMPLETED, task.Status)

	stickerRewardsTask, stickerRewardsTaskPayload, err := getStickerRewardsTask()
	require.NoError(t, err)

	assert.WithinDuration(t, data.TimeNowUTC().Add(time.Duration(checkForPendingRewardsMinutes)*time.Minute), *stickerRewardsTask.RunAt, 10*time.Minute)

	assert.Equal(t, season+1, stickerRewardsTaskPayload.Season)
	assert.Equal(t, times+1, stickerRewardsTaskPayload.Times)

	_, grantStickerRewardsTaskPayload, err := apitest.GetTask[jobqueue.GrantStickerRewardsTask](jobqueue.GrantStickerRewardsWorkGroup, &accountID)
	require.NoError(t, err)

	assert.Equal(t, accountID, grantStickerRewardsTaskPayload.AccountID)
	assert.Equal(t, season, grantStickerRewardsTaskPayload.Season)
	assert.Equal(t, times, grantStickerRewardsTaskPayload.Times)

	var levelsPerSeason *proto.LevelsPerSeason

	err = data.DB.LevelsPerSeason().Find(db.Cond{"account_id": invitedID1, "inviter_id": accountID, "season": season}).One(&levelsPerSeason)
	require.NoError(t, err)

	assert.Equal(t, 0, int(levelsPerSeason.Levels))
	assert.Equal(t, 4, int(levelsPerSeason.PointsCarried))
	assert.Equal(t, 0, int(levelsPerSeason.PointsSpent))
}

func createInvitedAccount(t *testing.T, name string, inviterID proto.AccountID) proto.AccountID {
	accountID, _, err := apitest.CreateRandomAccount(name)
	require.NoError(t, err)

	account, err := data.DB.Accounts().FindByID(accountID)
	require.NoError(t, err)
	require.NotNil(t, account)

	account.InvitedByID = &inviterID
	err = data.DB.Save(account)
	require.NoError(t, err)

	return accountID
}

func createLevelsPerSeason(t *testing.T, accountID, inviterID proto.AccountID, season uint16, levels, carried, spent uint64) {
	_, err := data.DB.SQL().InsertInto("levels_per_season").Values(&proto.LevelsPerSeason{
		AccountID:     accountID,
		InviterID:     inviterID,
		Season:        season,
		Levels:        levels,
		PointsCarried: carried,
		PointsSpent:   spent,
	}).Exec()
	require.NoError(t, err)
}

func getStickerRewardsTask() (*data.Task, *jobqueue.StickerRewardsTask, error) {
	var task *data.Task

	err := data.DB.Tasks(nil).Find(db.Cond{"queue": jobqueue.StickerRewardsWorkGroup}).One(&task)
	if err != nil {
		return nil, nil, fmt.Errorf("find task: %w", err)
	}

	var payload *jobqueue.StickerRewardsTask

	err = json.Unmarshal(task.Payload, &payload)
	if err != nil {
		return nil, nil, fmt.Errorf("decode payload: %w", err)
	}

	return task, payload, nil
}
