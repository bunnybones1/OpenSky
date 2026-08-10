//go:build integration

package onetimenotification_test

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/upper/db/v4"
	"go.uber.org/mock/gomock"

	"github.com/horizon-games/OpenSky/api/apitest"
	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/lib/notification/onetimenotification"
	"github.com/horizon-games/OpenSky/api/lib/notification/onetimenotification/mock"
	"github.com/horizon-games/OpenSky/api/proto"
)

func TestNotificationChecker(t *testing.T) {
	var accountValidator *mock.MockAccountValidator

	var account *data.Account

	// Setup
	{
		// Accounts
		{
			accountID, _, err := apitest.CreateRandomAccount("TestNotificationChecker")
			require.NoError(t, err)

			account, err = data.DB.Accounts().FindByID(accountID)
			require.NoError(t, err)
		}

		// Mocks
		{
			ctrl := gomock.NewController(t)

			accountValidator = mock.NewMockAccountValidator(ctrl)
		}
	}

	checker := onetimenotification.NewNotificationChecker(accountValidator)

	t.Run("creates new notifications that account does not have yet", func(t *testing.T) {
		// Setup
		{
			var oneTimeNotification1, oneTimeNotification2 *data.NotificationOneTime

			// OneTime Notifications
			{
				oneTimeNotification1 = &data.NotificationOneTime{
					NotificationOneTime: &proto.NotificationOneTime{
						Name: "a",
					},
				}
				err := data.DB.Save(oneTimeNotification1)
				require.NoError(t, err)

				oneTimeNotification2 = &data.NotificationOneTime{
					NotificationOneTime: &proto.NotificationOneTime{
						Name: "b",
					},
				}
				err = data.DB.Save(oneTimeNotification2)
				require.NoError(t, err)

				t.Cleanup(func() {
					err := data.DB.NotificationsOneTime().Find().Delete()
					require.NoError(t, err)
				})
			}

			// Notifications
			{
				_, err := data.DB.Notifications().CreateOneTimeNotification(oneTimeNotification1.NotificationOneTime, account.ID)
				require.NoError(t, err)

				t.Cleanup(func() {
					err := data.DB.Notifications().Find().Delete()
					require.NoError(t, err)
				})
			}
		}

		count, err := data.DB.Notifications().Find(db.Cond{"account_id": account.ID}).Count()
		require.NoError(t, err)
		assert.Equal(t, 1, int(count))

		err = checker.Check(account)
		require.NoError(t, err)

		count, err = data.DB.Notifications().Find(db.Cond{"account_id": account.ID}).Count()
		require.NoError(t, err)
		assert.Equal(t, 2, int(count))
	})

	t.Run("does not create new notification when it is not eligible based on filter", func(t *testing.T) {
		var rules []byte

		// Setup
		{
			// OneTime Notifications
			{
				rules = []byte(`{"age": {">": "1h"}}`)
				oneTimeNotification := &data.NotificationOneTime{
					NotificationOneTime: &proto.NotificationOneTime{
						Name:   "a",
						Filter: &proto.NotificationOneTimeFilter{RawMessage: rules},
					},
				}
				err := data.DB.Save(oneTimeNotification)
				require.NoError(t, err)

				t.Cleanup(func() {
					err := data.DB.NotificationsOneTime().Find().Delete()
					require.NoError(t, err)
				})
			}
		}

		accountValidator.EXPECT().IsValid(rules, account).Return(false, nil)

		err := checker.Check(account)
		require.NoError(t, err)

		count, err := data.DB.Notifications().Find(db.Cond{"account_id": account.ID}).Count()
		require.NoError(t, err)
		assert.Equal(t, 0, int(count))
	})
}
