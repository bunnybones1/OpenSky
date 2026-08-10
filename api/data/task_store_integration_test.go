//go:build integration

package data_test

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/upper/db/v4"

	"github.com/horizon-games/OpenSky/api/apitest"
	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/lib/jobqueue"
	"github.com/horizon-games/OpenSky/api/proto"
)

func TestTaskStore(t *testing.T) {
	var accountID proto.AccountID

	// Setup
	{
		// Accounts
		{
			var err error

			accountID, _, err = apitest.CreateRandomAccount("TestTaskStore")
			require.NoError(t, err)
		}
	}

	t.Run("enqueue task ignoring duplicates", func(t *testing.T) {
		t.Run("does not fail when there is a duplicate", func(t *testing.T) {
			queue := jobqueue.DetectSharedIPsQueue
			payload := jobqueue.DetectSharedIPs{
				AccountID: accountID,
				CreatedAt: data.TimeNowUTC(),
			}

			err := data.DB.Tasks().EnqueueTaskIgnoringDuplicates(queue, payload, nil, &accountID)
			require.NoError(t, err)

			exists, err := data.DB.Tasks().Find(db.Cond{
				"queue":      jobqueue.DetectSharedIPsQueue,
				"account_id": accountID,
			}).Exists()
			require.NoError(t, err)
			assert.True(t, exists)

			err = data.DB.Tasks().EnqueueTaskIgnoringDuplicates(queue, payload, nil, &accountID)
			require.NoError(t, err)
		})
	})
}
