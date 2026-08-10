//go:build integration

package jobqueue_test

import (
	"context"
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

func TestPushNotificationsRunner(t *testing.T) {
	var pushNotifier *mock.MockPushNotifier

	var accountID proto.AccountID

	var task *data.Task

	// Setup
	{
		// Mocks
		{
			ctrl := gomock.NewController(t)

			pushNotifier = mock.NewMockPushNotifier(ctrl)
		}

		// Account
		{
			var err error

			accountID, _, err = apitest.CreateRandomAccount("TestPushNotificationsRunner")
			require.NoError(t, err)
		}

		// Task
		{
			task = &data.Task{
				Task: &proto.Task{
					Status:    proto.TaskStatus_PENDING,
					CreatedAt: data.TimeNowUTCPtr(),
					RunAt:     data.TimeNowUTCPtr(),
				},
			}
		}

		// Notifications
		{
			_, err := data.DB.Notifications().CreateLeaderboardRewardNotification(&proto.NotificationLeaderboardReward{}, accountID, nil, nil)
			require.NoError(t, err)

			_, err = data.DB.Notifications().CreateConquestV2RewardNotification(&proto.NotificationConquestV2Reward{}, accountID, nil, nil)
			require.NoError(t, err)

			t.Cleanup(func() {
				err := data.DB.Notifications(nil).Truncate()
				require.NoError(t, err)
			})
		}
	}

	runner, err := jobqueue.NewPushNotificationsRunner(pushNotifier)
	require.NoError(t, err)

	pushNotifier.EXPECT().Send(gomock.Any(), []proto.AccountID{accountID}, "Your leaderboard rewards are waiting!")
	pushNotifier.EXPECT().Send(gomock.Any(), []proto.AccountID{accountID}, "Your conquest treasure is waiting!")

	err = runner.RunTasks(context.Background(), data.DB.Session, []*data.Task{task})
	require.NoError(t, err)

	assert.Equal(t, proto.TaskStatus_PENDING, task.Status)
	assert.True(t, data.TimeNowUTC().Before(*task.RunAt))
}
