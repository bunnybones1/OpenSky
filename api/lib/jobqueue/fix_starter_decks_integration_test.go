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

func TestFixStarterDecksTask(t *testing.T) {
	accountID := apitest.RandomAccountID()

	t.Run("can be enqueued", func(t *testing.T) {
		err := data.DB.Tasks().EnqueueTask(jobqueue.FixStarterDecksWorkGroup, &jobqueue.FixStarterDecksTask{
			AccountID: accountID,
			CreatedAt: data.TimeNowUTC(),
		}, nil, &accountID)
		require.NoError(t, err)
	})
}

func TestFixStarterDecksRunner(t *testing.T) {
	var accountID proto.AccountID

	var deck *data.Deck

	var task *data.Task

	// Setup
	{
		// Accounts
		{
			var err error
			accountID, _, err = apitest.CreateRandomAccount("TestFixStarterDecksRunner")
			require.NoError(t, err)
		}

		// Starter decks
		{
			err := data.CreateStarterDecks(data.DB, accountID)
			require.NoError(t, err)
		}

		// Items
		{
			var err error

			deck, err = data.DB.Decks().FindOne(db.Cond{"account_id": accountID, "class": proto.DeckClass_STR})
			require.NoError(t, err)
			require.NotNil(t, deck)

			err = data.DB.Items().Find(db.Cond{
				"account_id": accountID,
				"item_type":  proto.ItemType_SW_BASE_CARDS,
				"token_id":   db.AnyOf(deck.CardIDs[3:]),
			}).Delete()
			require.NoError(t, err)
		}

		// Tasks
		{
			taskPayload := &jobqueue.FixStarterDecksTask{
				AccountID: accountID,
				CreatedAt: data.TimeNowUTC(),
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

	count, err := data.DB.Items().Find(db.Cond{
		"account_id": accountID,
		"item_type":  proto.ItemType_SW_BASE_CARDS,
		"token_id":   db.AnyOf(deck.CardIDs),
	}).Count()
	require.NoError(t, err)
	require.Less(t, int(count), len(deck.CardIDs))

	runner := jobqueue.NewFixStarterDecksRunner()

	ctx := context.Background()

	err = runner.RunTasks(ctx, data.DB.Session, []*data.Task{task})
	require.NoError(t, err)

	assert.Equal(t, proto.TaskStatus_COMPLETED, task.Status)

	count, err = data.DB.Items().Find(db.Cond{
		"account_id": accountID,
		"item_type":  proto.ItemType_SW_BASE_CARDS,
		"token_id":   db.AnyOf(deck.CardIDs),
	}).Count()
	require.NoError(t, err)
	require.Equal(t, int(count), len(deck.CardIDs))
}
