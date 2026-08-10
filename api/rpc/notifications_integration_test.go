//go:build integration

package rpc_test

import (
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

func TestListNotifications(t *testing.T) {
	var accountID proto.AccountID

	var oneTimeNotificationChecker *mock.MockOneTimeNotificationChecker

	// Setup
	{
		// Account
		{
			var err error

			accountID, _, err = apitest.CreateRandomAccount("TestListNotifications")
			require.NoError(t, err)
		}

		// Notifications
		{
			_, err := data.DB.Notifications().CreateLeaderboardRewardNotification(&proto.NotificationLeaderboardReward{}, accountID, nil, nil)
			require.NoError(t, err)

			t.Cleanup(func() {
				err := data.DB.Notifications().Find(db.Cond{"account_id": accountID}).Delete()
				require.NoError(t, err)
			})
		}

		// Mocks
		{
			ctrl := gomock.NewController(t)

			oneTimeNotificationChecker = mock.NewMockOneTimeNotificationChecker(ctrl)

			apiService := apitest.APIService()

			originalOneTimeNotificationsChecker := apiService.RPC.OneTimeNotificationChecker

			apiService.RPC.OneTimeNotificationChecker = oneTimeNotificationChecker

			t.Cleanup(func() {
				apiService.RPC.OneTimeNotificationChecker = originalOneTimeNotificationsChecker
			})
		}
	}

	ctx := apitest.AccountContext(accountID)
	ctx = apitest.DBContext(ctx)

	oneTimeNotificationChecker.EXPECT().Check(gomock.Any()).Do(func(account *data.Account) {
		assert.Equal(t, accountID, account.ID)
	})

	notifications, err := apitest.Client().ListNotifications(ctx)
	require.NoError(t, err)
	assert.NotEmpty(t, notifications)
}

func TestSetNotificationsAsSeen(t *testing.T) {
	var accountID proto.AccountID

	var notificationIDs []uint64

	// Setup
	{
		// Account
		{
			var err error

			accountID, _, err = apitest.CreateRandomAccount("TestSetNotificationsAsSeen")
			require.NoError(t, err)
		}

		// Notifications
		{
			id, err := data.DB.Notifications().CreateLeaderboardRewardNotification(&proto.NotificationLeaderboardReward{}, accountID, nil, nil)
			require.NoError(t, err)

			notificationIDs = append(notificationIDs, id)

			id, err = data.DB.Notifications().CreateLeaderboardRewardNotification(&proto.NotificationLeaderboardReward{}, accountID, nil, nil)
			require.NoError(t, err)

			notificationIDs = append(notificationIDs, id)

			t.Cleanup(func() {
				err := data.DB.Notifications().Find(db.Cond{"account_id": accountID}).Delete()
				require.NoError(t, err)
			})
		}
	}

	ctx := apitest.AccountContext(accountID)
	ctx = apitest.DBContext(ctx)

	count, err := data.DB.Notifications().Find(db.Cond{"account_id": accountID, "seen_at": db.IsNull()}).Count()
	require.NoError(t, err)
	assert.Equal(t, 2, int(count))

	ok, err := apitest.Client().SetNotificationsAsSeen(ctx, notificationIDs[0:1])
	require.NoError(t, err)
	assert.True(t, ok)

	count, err = data.DB.Notifications().Find(db.Cond{"account_id": accountID, "seen_at": db.IsNull()}).Count()
	require.NoError(t, err)
	assert.Equal(t, 1, int(count))
}

func TestGMCreateOneTimeNotification(t *testing.T) {
	var accountID proto.AccountID

	// Setup
	{
		// Account
		{
			var err error
			accountID, err = apitest.CreateRandomAdminAccount("TestGMCreateOneTimeNotification")
			require.NoError(t, err)
		}

		t.Cleanup(func() {
			err := data.DB.NotificationsOneTime().Find().Delete()
			require.NoError(t, err)
		})
	}

	ctx := apitest.AccountContext(accountID)

	createdAt := data.TimeNowUTC().Add(-time.Hour)
	validFrom := data.TimeNowUTC().Add(time.Minute)
	expiresAt := data.TimeNowUTC().Add(time.Hour)
	inputNotification := &proto.NotificationOneTime{
		ID:        9999,
		Name:      "some name",
		Data:      &proto.NotificationOneTimeData{RawMessage: []byte(`["a","b"]`)},
		Filter:    &proto.NotificationOneTimeFilter{RawMessage: []byte(`{"age":[{"==":"1h"}]}`)},
		CreatedAt: &createdAt,
		ValidFrom: &validFrom,
		ExpiresAt: &expiresAt,
	}

	notification, err := apitest.Client().GMCreateOneTimeNotification(ctx, inputNotification)
	require.NoError(t, err)

	assert.NotEqual(t, inputNotification.ID, notification.ID)
	assert.Equal(t, inputNotification.Name, notification.Name)
	assert.Equal(t, inputNotification.Data, notification.Data)
	assert.Equal(t, inputNotification.Filter, notification.Filter)
	assert.NotEqual(t, inputNotification.CreatedAt, notification.CreatedAt)
	assert.Equal(t, inputNotification.ValidFrom, notification.ValidFrom)
	assert.Equal(t, inputNotification.ExpiresAt, notification.ExpiresAt)
	assert.Equal(t, accountID, *notification.UpdatedBy)

	exists, err := data.DB.NotificationsOneTime().Find(db.Cond{"id": notification.ID}).Exists()
	require.NoError(t, err)
	assert.True(t, exists)
}

func TestGMListOneTimeNotifications(t *testing.T) {
	var accountID proto.AccountID

	var notification *data.NotificationOneTime

	// Setup
	{
		// Account
		{
			var err error
			accountID, err = apitest.CreateRandomAdminAccount("TestGMListOneTimeNotifications")
			require.NoError(t, err)
		}

		// One Time Notifications
		{
			createdAt := data.TimeNowUTC().Add(-time.Hour)
			validFrom := data.TimeNowUTC().Add(-time.Hour)
			expiresAt := data.TimeNowUTC().Add(-time.Minute)
			notification = &data.NotificationOneTime{
				NotificationOneTime: &proto.NotificationOneTime{
					Name:      "some name",
					Data:      &proto.NotificationOneTimeData{RawMessage: []byte(`["a","b"]`)},
					Filter:    &proto.NotificationOneTimeFilter{RawMessage: []byte(`{"age": [{"==": "1h"}]}`)},
					CreatedAt: &createdAt,
					ValidFrom: &validFrom,
					ExpiresAt: &expiresAt,
				},
			}

			err := data.DB.Save(notification)
			require.NoError(t, err)

			t.Cleanup(func() {
				err := data.DB.NotificationsOneTime().Find().Delete()
				require.NoError(t, err)
			})
		}
	}

	ctx := apitest.AccountContext(accountID)

	notifications, err := apitest.Client().GMListOneTimeNotifications(ctx)
	require.NoError(t, err)

	require.Len(t, notifications, 1)
	assert.Equal(t, notification.ID, notifications[0].ID)
}

func TestGMUpdateOneTimeNotification(t *testing.T) {
	var accountID proto.AccountID

	var notification *data.NotificationOneTime

	// Setup
	{
		// Account
		{
			var err error
			accountID, err = apitest.CreateRandomAdminAccount("TestGMUpdateOneTimeNotification")
			require.NoError(t, err)
		}

		// One Time Notifications
		{
			notification = &data.NotificationOneTime{
				NotificationOneTime: &proto.NotificationOneTime{
					Name:   "some name",
					Data:   &proto.NotificationOneTimeData{RawMessage: []byte(`["a","b"]`)},
					Filter: &proto.NotificationOneTimeFilter{RawMessage: []byte(`{"age":[{"==":"1h"}]}`)},
				},
			}

			err := data.DB.Save(notification)
			require.NoError(t, err)

			t.Cleanup(func() {
				err := data.DB.NotificationsOneTime().Find().Delete()
				require.NoError(t, err)
			})
		}
	}

	ctx := apitest.AccountContext(accountID)

	createdAt := data.TimeNowUTC().Add(-time.Hour)
	validFrom := data.TimeNowUTC().Add(time.Minute)
	expiresAt := data.TimeNowUTC().Add(time.Hour)
	inputNotification := &proto.NotificationOneTime{
		ID:        notification.ID,
		Name:      "another name",
		Data:      &proto.NotificationOneTimeData{RawMessage: []byte(`["a","b","c"]`)},
		Filter:    &proto.NotificationOneTimeFilter{RawMessage: []byte(`{"age":[{"==":"2h"}]}`)},
		CreatedAt: &createdAt,
		ValidFrom: &validFrom,
		ExpiresAt: &expiresAt,
	}

	result, err := apitest.Client().GMUpdateOneTimeNotification(ctx, inputNotification)
	require.NoError(t, err)

	assert.Equal(t, inputNotification.ID, result.ID)
	assert.Equal(t, inputNotification.Name, result.Name)
	assert.Equal(t, inputNotification.Data, result.Data)
	assert.Equal(t, inputNotification.Filter, result.Filter)
	assert.NotEqual(t, inputNotification.CreatedAt, result.CreatedAt)
	assert.Equal(t, inputNotification.ValidFrom, result.ValidFrom)
	assert.Equal(t, inputNotification.ExpiresAt, result.ExpiresAt)
	assert.Equal(t, accountID, *result.UpdatedBy)
}

func TestGMDeleteOneTimeNotification(t *testing.T) {
	var accountID proto.AccountID

	var notification *data.NotificationOneTime

	// Setup
	{
		// Account
		{
			var err error
			accountID, err = apitest.CreateRandomAdminAccount("TestGMDeleteOneTimeNotification")
			require.NoError(t, err)
		}

		// One Time Notifications
		{
			notification = &data.NotificationOneTime{
				NotificationOneTime: &proto.NotificationOneTime{
					Name:   "some name",
					Data:   &proto.NotificationOneTimeData{RawMessage: []byte(`["a","b"]`)},
					Filter: &proto.NotificationOneTimeFilter{RawMessage: []byte(`{"age": [{"==": "1h"}]}`)},
				},
			}

			err := data.DB.Save(notification)
			require.NoError(t, err)

			t.Cleanup(func() {
				err := data.DB.NotificationsOneTime().Find().Delete()
				require.NoError(t, err)
			})
		}
	}

	ctx := apitest.AccountContext(accountID)

	ok, err := apitest.Client().GMDeleteOneTimeNotification(ctx, notification.ID)
	require.NoError(t, err)
	assert.True(t, ok)

	exists, err := data.DB.NotificationsOneTime().Find(db.Cond{"id": notification.ID}).Exists()
	require.NoError(t, err)
	assert.False(t, exists)
}
