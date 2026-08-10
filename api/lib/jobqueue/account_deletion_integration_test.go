//go:build integration

package jobqueue_test

import (
	"context"
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/horizon-games/OpenSky/api/apitest"
	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/lib/jobqueue"
	"github.com/horizon-games/OpenSky/api/proto"
)

func TestAccountDeletionRunner(t *testing.T) {
	runner, err := jobqueue.NewAccountDeletionRunner()
	require.NoError(t, err)

	t.Run("successfully soft-deletes account", func(t *testing.T) {
		var accountID proto.AccountID

		season := uint16(1)

		// Setup
		{
			// Accounts
			{
				var err error

				accountID, err = apitest.CreateRandomAccountWithStatus("TestAccountDeletionRunner", proto.AccountStatus_TO_DELETE)
				require.NoError(t, err)
			}

			// Change setting to non-default
			{
				account, err := data.DB.Accounts(nil).FindByID(accountID)
				require.NoError(t, err)

				account.PrivateSettings.HidePlayerNames = data.SetBoolPointer(true)
				err = data.DB.Save(account)
				require.NoError(t, err)
			}

			// Create account stats
			{
				err := data.DB.AccountStats(nil).InsertReturning(&proto.AccountStat{
					AccountID: accountID,
					Status:    proto.AccountStatus_TO_DELETE,
					Season:    &season,
				})
				require.NoError(t, err)
			}
		}

		payload, err := json.Marshal(jobqueue.AccountDeletionTask{AccountID: accountID})
		require.NoError(t, err)

		tasks := []*data.Task{
			{Task: &proto.Task{
				Status:    proto.TaskStatus_PENDING,
				Payload:   payload,
				CreatedAt: data.TimeNowUTCPtr(),
			}},
		}

		err = runner.RunTasks(context.Background(), data.DB.Session, tasks)
		require.NoError(t, err)

		assert.Equal(t, proto.TaskStatus_COMPLETED, tasks[0].Status)

		account, err := data.DB.Accounts(nil).FindByID(accountID)
		require.NoError(t, err)

		assert.Equal(t, proto.AccountStatus_DELETED, account.Status)
		assert.Contains(t, account.Name, "Deleted-")
		assert.Equal(t, false, *account.PrivateSettings.HidePlayerNames)

		accountStats, err := data.DB.AccountStats(nil).FindByAccountID(accountID, season)
		require.NoError(t, err)

		assert.Equal(t, proto.AccountStatus_DELETED, accountStats[0].Status)
	})

	t.Run("fails when the account is not flagged for deletion", func(t *testing.T) {
		var accountID proto.AccountID

		// Setup
		{
			var err error
			accountID, err = apitest.CreateRandomAccountWithStatus("AccountDeletionRunner", proto.AccountStatus_ACTIVE)
			require.NoError(t, err)
		}

		payload, err := json.Marshal(jobqueue.AccountDeletionTask{AccountID: accountID})
		require.NoError(t, err)

		tasks := []*data.Task{
			{Task: &proto.Task{
				Status:  proto.TaskStatus_PENDING,
				Payload: payload,
			}},
		}

		err = runner.RunTasks(context.Background(), data.DB.Session, tasks)
		require.ErrorContains(t, err, "account is not flagged for deletion")

		assert.Equal(t, proto.TaskStatus_FAILED, tasks[0].Status)

		account, err := data.DB.Accounts(nil).FindByID(accountID)
		require.NoError(t, err)

		assert.Equal(t, proto.AccountStatus_ACTIVE, account.Status)
	})
}
