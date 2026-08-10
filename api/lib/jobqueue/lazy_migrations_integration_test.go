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

func TestLazyMigrationRunner(t *testing.T) {
	var accountID proto.AccountID

	// Setup
	{
		// Accounts
		{
			var err error
			accountID, _, err = apitest.CreateRandomAccount("TestLazyMigrationRunner")
			require.NoError(t, err)
		}
	}

	runner := jobqueue.NewLazyMigrationRunner()

	ctx := context.Background()

	t.Run("migration of starter deck v1 gets paused", func(t *testing.T) {
		var task *data.Task

		// Setup
		{
			// Tasks
			{
				taskPayload := &jobqueue.LazyMigrationTask{
					AccountID: accountID,
					Migration: jobqueue.StarterDeckMigration,
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

		err := runner.RunTasks(ctx, data.DB.Session, []*data.Task{task})
		require.NoError(t, err)

		assert.Equal(t, proto.TaskStatus_PAUSED, task.Status)
	})

	t.Run("migrates starter decks v2", func(t *testing.T) {
		var task *data.Task

		// Setup
		{
			// Starter decks
			{
				err := data.CreateStarterDecks(data.DB, accountID)
				require.NoError(t, err)

				starterDecks := data.GetStarterDecks()
				var unlocked int
				for _, deck := range starterDecks {
					if deck.DeckType == proto.DeckType_UNLOCKED_STARTER {
						continue
					}

					err := data.UnlockHero(data.DB, accountID, data.DeckClassHero(deck.Class))
					require.NoError(t, err)

					_, _, err = data.UnlockStarterDeckByDeckClass(data.DB, accountID, deck.Class)
					require.NoError(t, err)

					unlocked++

					if unlocked == 2 {
						break
					}
				}

				// Delete STR deck to make sure it gets created too.
				err = data.DB.Decks().Find(db.Cond{
					"account_id": accountID,
					"deck_type":  proto.DeckType_UNLOCKED_STARTER,
					"class":      proto.DeckClass_STR,
				}).Delete()
				require.NoError(t, err)
			}

			// Heroes
			{
				// Earlier created accounts dont have ADA in items, this is to make sure the task adds it there.
				err := data.DB.Items().Find(db.Cond{
					"account_id": accountID,
					"item_type":  proto.ItemType_SW_HERO,
					"token_id":   proto.Hero_ADA,
				}).Delete()
				require.NoError(t, err)
			}

			// Tasks
			{
				taskPayload := &jobqueue.LazyMigrationTask{
					AccountID: accountID,
					Migration: jobqueue.StarterDeckV2Migration,
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

		var decks []*data.Deck

		err := data.DB.Decks().Find(db.Cond{"account_id": accountID}).All(&decks)
		require.NoError(t, err)

		var unlockedDecks, lockedDecks []*data.Deck

		for _, deck := range decks {
			switch deck.DeckType {
			case proto.DeckType_UNLOCKED_STARTER:
				unlockedDecks = append(unlockedDecks, deck)
			case proto.DeckType_LOCKED_STARTER:
				lockedDecks = append(lockedDecks, deck)
			}
		}

		require.Len(t, unlockedDecks, 2)
		require.Len(t, lockedDecks, 2)

		err = runner.RunTasks(ctx, data.DB.Session, []*data.Task{task})
		require.NoError(t, err)

		assert.Equal(t, proto.TaskStatus_COMPLETED, task.Status)

		t.Run("previously unlocked decks still exist but not being a starter decks anymore", func(t *testing.T) {
			for _, unlockedDeck := range unlockedDecks {
				deck, err := data.DB.Decks().FindOne(db.Cond{"uuid": unlockedDeck.UUID})
				require.NoError(t, err)
				assert.Equal(t, proto.DeckType_CUSTOM, deck.DeckType)
			}
		})

		t.Run("previously locked decks do not exist", func(t *testing.T) {
			for _, lockedDeck := range lockedDecks {
				_, err := data.DB.Decks().FindOne(db.Cond{"uuid": lockedDeck.UUID})
				require.ErrorIs(t, err, db.ErrNoMoreRows)
			}
		})

		t.Run("new starter decks exist and the same classes are unlocked and locked as before", func(t *testing.T) {
			for _, unlockedDeck := range unlockedDecks {
				deck, err := data.DB.Decks().FindOne(db.Cond{
					"account_id": accountID,
					"class":      unlockedDeck.Class,
					"deck_type":  proto.DeckType_UNLOCKED_STARTER,
				})
				require.NoError(t, err)
				assert.NotNil(t, deck)
			}

			for _, lockedDeck := range lockedDecks {
				deck, err := data.DB.Decks().FindOne(db.Cond{
					"account_id": accountID,
					"class":      lockedDeck.Class,
					"deck_type":  proto.DeckType_LOCKED_STARTER,
				})
				require.NoError(t, err)
				assert.NotNil(t, deck)
			}

			deck, err := data.DB.Decks().FindOne(db.Cond{
				"account_id": accountID,
				"class":      proto.DeckClass_STR,
				"deck_type":  proto.DeckType_UNLOCKED_STARTER,
			})
			require.NoError(t, err)
			assert.NotNil(t, deck)
		})

		t.Run("hero Ada is added", func(t *testing.T) {
			item, err := data.DB.Items().FindAccountItem(accountID, proto.ItemType_SW_HERO, uint64(proto.Hero_ADA))
			require.NoError(t, err)
			assert.NotNil(t, item)
		})
	})
}
