//go:build integration

package jobqueue_test

import (
	"context"
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/mock/gomock"

	"github.com/horizon-games/OpenSky/api/apitest"
	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/lib/jobqueue"
	"github.com/horizon-games/OpenSky/api/lib/jobqueue/mock"
	"github.com/horizon-games/OpenSky/api/proto"
)

func TestSkypassAutoClaimRunner(t *testing.T) {
	var task *data.Task

	var accountID proto.AccountID

	season := uint16(16)

	var skypassRewardLister *mock.MockSkypassRewardLister

	var skypassRewardClaimer *mock.MockSkypassRewardClaimer

	// Setup
	{
		// Account
		{
			var err error

			accountID, _, err = apitest.CreateRandomAccount("TestSkypassAutoClaimRunner")
			require.NoError(t, err)
		}

		// Tasks
		{
			taskPayload := &jobqueue.SkypassAutoClaimTask{
				AccountID: accountID,
				Season:    season,
			}

			payloadJSON, err := json.Marshal(taskPayload)
			require.NoError(t, err)

			task = &data.Task{
				Task: &proto.Task{
					Payload:   payloadJSON,
					CreatedAt: data.TimeNowUTCPtr(),
				},
			}
		}

		// Mocks
		{
			ctrl := gomock.NewController(t)

			skypassRewardLister = mock.NewMockSkypassRewardLister(ctrl)
			skypassRewardClaimer = mock.NewMockSkypassRewardClaimer(ctrl)
		}
	}

	ctx := context.Background()

	skypassRewardLister.EXPECT().ListBySeason(gomock.Any(), accountID, season).Return([]*proto.SkypassLevel{
		{
			Earned: true,
			Rewards: []*proto.SkypassReward{
				{
					ID:        1,
					Claimable: false,
				},
				{
					ID:        2,
					Claimable: true,
					Claimed:   true,
				},
				{
					ID:        3,
					Claimable: true,
					Claimed:   false,
				},
			},
		},
		{
			Earned: false,
			Rewards: []*proto.SkypassReward{
				{
					ID:        4,
					Claimable: true,
					Claimed:   false,
				},
			},
		},
	}, nil)

	skypassRewardClaimer.EXPECT().ClaimRewards(gomock.Any(), accountID, []uint64{3})

	runner := jobqueue.NewSkypassAutoClaimRunner(skypassRewardLister, skypassRewardClaimer)

	err := runner.RunTasks(ctx, data.DB.Session, []*data.Task{task})
	require.NoError(t, err)

	assert.Equal(t, proto.TaskStatus_COMPLETED, task.Status)

	seasonStat, err := data.DB.SkypassSeasonStats().FindOrCreate(accountID, season)
	require.NoError(t, err)
	assert.True(t, seasonStat.AutoClaimed)

	notifications, err := data.DB.Notifications().ListValidNotSeen(accountID)
	require.NoError(t, err)

	require.Len(t, notifications, 1)
	notification := notifications[0]

	var notificationData map[string]string

	err = json.Unmarshal(notification.OneTime.Data.RawMessage, &notificationData)
	require.NoError(t, err)

	assert.Equal(t, proto.NotificationType_ONE_TIME, *notification.Type)
	assert.Equal(t, 0, int(notification.OneTime.ID))
	assert.Equal(t, "Autoclaimed Rewards", notification.OneTime.Name)
	assert.Equal(t, "ALL AVAILABLE UNCLAIMED REWARDS WERE AUTO-CLAIMED!", notificationData["title"])
	assert.Equal(t, "SKYPASS SEASON 16: HEX COMPLETE!", notificationData["subtitle"])
	assert.Equal(t, "webapp/backgrounds/spbg-all-claimed.webp", notificationData["background"])
}
