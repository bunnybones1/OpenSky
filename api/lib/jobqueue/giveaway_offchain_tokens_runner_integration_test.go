//go:build integration

package jobqueue_test

import (
	"context"
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/upper/db/v4"

	"github.com/horizon-games/OpenSky/api/apitest"
	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/lib/jobqueue"
	"github.com/horizon-games/OpenSky/api/proto"
)

func TestGiveawayOffChainTokensTask(t *testing.T) {
	accountID := apitest.RandomAccountID()

	t.Run("can be enqueued", func(t *testing.T) {
		err := data.DB.Tasks().EnqueueTask(jobqueue.GiveawayOffChainTokensWorkGroup, &jobqueue.GiveawayOffChainTokensTask{
			AccountID: accountID,
			Tokens: map[proto.ItemType]map[uint64]uint64{
				proto.ItemType_SW_TITLES: {1: 2},
			},
			CreatedAt: data.TimeNowUTC(),
		}, nil, &accountID)
		require.NoError(t, err)
	})
}

func TestGiveawayOffChainTokensRunner(t *testing.T) {
	var accountID proto.AccountID

	var task *data.Task

	// Setup
	{
		// Accounts
		{
			var err error
			accountID, _, err = apitest.CreateRandomAccount("TestGiveawayOffChainTokensRunner")
			require.NoError(t, err)
		}

		// Tasks
		{
			taskPayload := &jobqueue.GiveawayOffChainTokensTask{
				AccountID: accountID,
				Tokens: map[proto.ItemType]map[uint64]uint64{
					proto.ItemType_SW_TITLES: {2: 3},
				},
				CreatedAt: data.TimeNowUTC(),
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
	}

	item, err := data.DB.Items().FindAccountItem(accountID, proto.ItemType_SW_TITLES, 2)
	require.ErrorIs(t, err, db.ErrNoMoreRows)
	assert.Nil(t, item)

	runner := jobqueue.NewGiveawayOffChainTokensRunner()

	ctx := context.Background()

	err = runner.RunTasks(ctx, data.DB.Session, []*data.Task{task})
	require.NoError(t, err)

	assert.Equal(t, proto.TaskStatus_COMPLETED, task.Status)

	item, err = data.DB.Items().FindAccountItem(accountID, proto.ItemType_SW_TITLES, 2)
	require.NoError(t, err)
	assert.NotNil(t, item)
	assert.Equal(t, int64(3), item.Balance.Int64())
}
