//go:build integration

package conquest_test

import (
	"context"
	"math/big"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/upper/db/v4"
	"go.uber.org/mock/gomock"

	"github.com/horizon-games/OpenSky/api/apitest"
	"github.com/horizon-games/OpenSky/api/config"
	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/lib/conquest"
	"github.com/horizon-games/OpenSky/api/lib/conquest/mock"
	"github.com/horizon-games/OpenSky/api/lib/jobqueue"
	"github.com/horizon-games/OpenSky/api/proto"
)

func TestStateManager(t *testing.T) {
	var accountID proto.AccountID

	var metricsCollector *mock.MockMetricsCollector

	// Setup
	{
		// Accounts
		{
			var err error
			accountID, _, err = apitest.CreateRandomAccount("TestStateManager")
			require.NoError(t, err)
		}

		// Ranks
		{
			accountStats := &data.AccountStat{AccountStat: &proto.AccountStat{
				AccountID:  accountID,
				GameMode:   proto.GameMode_RANKED_CONSTRUCTED,
				PlayerRank: proto.PlayerRank_TRAINEE,
			}}
			err := data.DB.Save(accountStats)
			require.NoError(t, err)
		}

		// Mocks
		{
			ctrl := gomock.NewController(t)

			metricsCollector = mock.NewMockMetricsCollector(ctrl)
		}
	}

	cfg := config.OpenSkyConquestV2Config{}

	stateManager := conquest.NewStateManager(cfg, metricsCollector)

	ctx := context.Background()
	gameMode := proto.GameMode_CONQUEST_CONSTRUCTED
	hero := proto.Hero_SAMYA

	t.Run("enter", func(t *testing.T) {
		hero := proto.Hero_SAMYA

		t.Run("enters a conquest when there are conquest tickets and no conquest is in progress", func(t *testing.T) {
			// Setup
			{
				// Conquest tickets
				{
					err := data.DB.Items().GainConquestTickets(accountID, big.NewInt(2), proto.TransactionType_GIVEAWAY, "")
					require.NoError(t, err)

					t.Cleanup(func() {
						err := data.DB.Items().Find(db.Cond{"account_id": accountID}).Delete()
						require.NoError(t, err)
					})
				}

				t.Cleanup(func() {
					err := data.DB.Conquests().Truncate()
					require.NoError(t, err)
				})
			}

			metricsCollector.EXPECT().TrackConquestEntered(hero)

			entered, err := stateManager.Enter(ctx, accountID, hero)
			require.NoError(t, err)
			assert.True(t, entered)

			conquest, err := data.DB.Conquests().FindInProgress(accountID)
			require.NoError(t, err)
			assert.NotNil(t, conquest)

			conquestTickets, err := data.DB.Items().GetConquestTickets(accountID)
			require.NoError(t, err)
			assert.Equal(t, 1, int(conquestTickets))
		})

		t.Run("returns true when there is a conquest in progress", func(t *testing.T) {
			// Setup
			{
				// Conquests
				{
					conquest := &data.Conquest{Conquest: &proto.Conquest{
						Status:    proto.ConquestStatus_IN_PROGRESS,
						AccountID: accountID,
						Nonce:     1,
						Mode:      proto.GameMode_CONQUEST_CONSTRUCTED,
						Hero:      hero,
					}}
					err := data.DB.Save(conquest)
					require.NoError(t, err)
				}

				// Conquest tickets
				{
					err := data.DB.Items().GainConquestTickets(accountID, big.NewInt(2), proto.TransactionType_GIVEAWAY, "")
					require.NoError(t, err)

					t.Cleanup(func() {
						err := data.DB.Items().Find(db.Cond{"account_id": accountID}).Delete()
						require.NoError(t, err)
					})
				}

				t.Cleanup(func() {
					err := data.DB.Conquests().Truncate()
					require.NoError(t, err)
				})
			}

			entered, err := stateManager.Enter(ctx, accountID, hero)
			require.NoError(t, err)
			assert.True(t, entered)

			count, err := data.DB.Conquests().Find(db.Cond{"account_id": accountID}).Count()
			require.NoError(t, err)
			assert.Equal(t, 1, int(count))

			conquestTickets, err := data.DB.Items().GetConquestTickets(accountID)
			require.NoError(t, err)
			assert.Equal(t, 2, int(conquestTickets))
		})

		t.Run("fails when hero is unknown", func(t *testing.T) {
			entered, err := stateManager.Enter(ctx, accountID, proto.Hero_UNKNOWN)
			require.ErrorContains(t, err, "hero is missing")
			assert.False(t, entered)

			conquest, err := data.DB.Conquests().FindInProgress(accountID)
			require.NoError(t, err)
			assert.Nil(t, conquest)
		})

		t.Run("fails when the account has not reached a proper rank", func(t *testing.T) {
			var accountID proto.AccountID

			// Setup
			{
				// Accounts
				{
					var err error
					accountID, _, err = apitest.CreateRandomAccount("TestEnterer-low-rank")
					require.NoError(t, err)
				}

				// Ranks
				{
					accountStats := &data.AccountStat{AccountStat: &proto.AccountStat{
						AccountID:  accountID,
						GameMode:   proto.GameMode_RANKED_CONSTRUCTED,
						PlayerRank: proto.PlayerRank_UNRANKED,
					}}
					err := data.DB.Save(accountStats)
					require.NoError(t, err)
				}

				t.Cleanup(func() {
					err := data.DB.Conquests().Truncate()
					require.NoError(t, err)
				})
			}

			entered, err := stateManager.Enter(ctx, accountID, hero)
			require.ErrorContains(t, err, "the rank is too low")
			assert.False(t, entered)

			conquest, err := data.DB.Conquests().FindInProgress(accountID)
			require.NoError(t, err)
			assert.Nil(t, conquest)
		})

		t.Run("fails when there are no conquest tickets", func(t *testing.T) {
			entered, err := stateManager.Enter(ctx, accountID, hero)
			require.ErrorContains(t, err, "not enough conquest tickets")
			assert.False(t, entered)

			conquest, err := data.DB.Conquests().FindInProgress(accountID)
			require.NoError(t, err)
			assert.Nil(t, conquest)
		})
	})

	t.Run("update progress", func(t *testing.T) {
		t.Run("updates progress and keeps in progress when conquest can have more matches", func(t *testing.T) {
			var conquestID uint64

			// Setup
			{
				// Conquests
				{
					conquest := &data.Conquest{Conquest: &proto.Conquest{
						Status:    proto.ConquestStatus_IN_PROGRESS,
						AccountID: accountID,
						Mode:      gameMode,
						Hero:      hero,
						MatchProgress: map[uint64]proto.ConquestMatchResult{
							1: proto.ConquestMatchResult_WIN,
							2: proto.ConquestMatchResult_WIN,
						},
					}}
					err := data.DB.Save(conquest)
					require.NoError(t, err)

					conquestID = conquest.ID

					t.Cleanup(func() {
						err := data.DB.Conquests().Find(db.Cond{"account_id": accountID}).Delete()
						require.NoError(t, err)
					})
				}
			}

			matchID := uint64(3)
			matchResult := proto.ConquestMatchResult_DRAW

			events, rewards, err := stateManager.UpdateProgress(ctx, data.DB.Session, accountID, matchID, matchResult)
			require.NoError(t, err)
			assert.Empty(t, events)
			assert.Empty(t, rewards)

			conquest, err := data.DB.Conquests().FindInProgress(accountID)
			require.NoError(t, err)
			require.NotNil(t, conquest)

			assert.Equal(t, conquestID, conquest.ID)
			assert.Equal(t, matchResult, conquest.MatchProgress[matchID])
			assert.Equal(t, proto.ConquestStatus_IN_PROGRESS, conquest.Status)
			assert.True(t, conquest.CanHaveMoreMatches())

			_, _, err = apitest.GetTask[jobqueue.ExitConquestTask](jobqueue.ExitConquestQueue, &accountID)
			require.ErrorIs(t, err, db.ErrNoMoreRows)
		})

		t.Run("updates progress and exits when conquest cannot have more matches", func(t *testing.T) {
			matchID := uint64(4)

			t.Run("does not schedule exit conquest when there is no victory", func(t *testing.T) {
				var conquestID uint64

				// Setup
				{
					// Conquests
					{
						conquest := &data.Conquest{Conquest: &proto.Conquest{
							Status:    proto.ConquestStatus_IN_PROGRESS,
							AccountID: accountID,
							Mode:      gameMode,
							Hero:      hero,
						}}
						err := data.DB.Save(conquest)
						require.NoError(t, err)

						conquestID = conquest.ID

						t.Cleanup(func() {
							err := data.DB.Conquests().Find(db.Cond{"account_id": accountID}).Delete()
							require.NoError(t, err)
						})
					}
				}

				matchResult := proto.ConquestMatchResult_LOSS

				metricsCollector.EXPECT().TrackConquestExited(0)
				metricsCollector.EXPECT().TrackConquestCompleted()

				events, rewards, err := stateManager.UpdateProgress(ctx, data.DB.Session, accountID, matchID, matchResult)
				require.NoError(t, err)

				require.Empty(t, events)
				require.Empty(t, rewards)

				conquest, err := data.DB.Conquests().FindOne(db.Cond{"account_id": accountID})
				require.NoError(t, err)
				require.NotNil(t, conquest)

				assert.Equal(t, conquestID, conquest.ID)
				assert.Equal(t, matchResult, conquest.MatchProgress[matchID])
				assert.Equal(t, proto.ConquestStatus_COMPLETED, conquest.Status)
				assert.False(t, conquest.CanHaveMoreMatches())

				_, _, err = apitest.GetTask[jobqueue.ExitConquestTask](jobqueue.ExitConquestQueue, &accountID)
				require.ErrorIs(t, err, db.ErrNoMoreRows)
			})

			t.Run("schedules exit conquest with 1 silver card when there is 1 victory", func(t *testing.T) {
				var conquestID uint64

				// Setup
				{
					// Conquests
					{
						conquest := &data.Conquest{Conquest: &proto.Conquest{
							Status:    proto.ConquestStatus_IN_PROGRESS,
							AccountID: accountID,
							Mode:      gameMode,
							Hero:      hero,
							MatchProgress: map[uint64]proto.ConquestMatchResult{
								1: proto.ConquestMatchResult_WIN,
							},
						}}
						err := data.DB.Save(conquest)
						require.NoError(t, err)

						conquestID = conquest.ID

						t.Cleanup(func() {
							err := data.DB.Conquests().Find(db.Cond{"account_id": accountID}).Delete()
							require.NoError(t, err)
						})
					}

					t.Cleanup(func() {
						cleanupConquestStateTasks(t, accountID)
					})
				}

				matchResult := proto.ConquestMatchResult_LOSS

				metricsCollector.EXPECT().TrackConquestExited(1)

				events, rewards, err := stateManager.UpdateProgress(ctx, data.DB.Session, accountID, matchID, matchResult)
				require.NoError(t, err)

				require.Len(t, events, 1)
				assert.Equal(t, proto.FeedEventType_REWARD, events[0].Type)
				assert.Len(t, events[0].TokenIDs, 1)

				require.Len(t, rewards, 1)
				assert.Equal(t, proto.RewardType_CARD, rewards[0].Type)
				assert.Equal(t, proto.ItemType_SW_SILVER_CARDS, rewards[0].Card.Item.ItemType)
				assert.NotZero(t, rewards[0].Card.Card.ID)

				conquest, err := data.DB.Conquests().FindOne(db.Cond{"account_id": accountID})
				require.NoError(t, err)
				require.NotNil(t, conquest)

				assert.Equal(t, conquestID, conquest.ID)
				assert.Equal(t, matchResult, conquest.MatchProgress[matchID])
				assert.Equal(t, proto.ConquestStatus_REWARDS_PENDING, conquest.Status)
				assert.False(t, conquest.CanHaveMoreMatches())

				task, taskPayload, err := apitest.GetTask[jobqueue.ExitConquestTask](jobqueue.ExitConquestQueue, &accountID)
				require.NoError(t, err)

				require.NotNil(t, task)
				assert.Equal(t, proto.TaskStatus_PENDING, task.Status)

				require.NotNil(t, taskPayload)
				assert.Len(t, taskPayload.SilverCardIDs, 1)
				assert.Len(t, taskPayload.GoldCardIDs, 0)
			})

			t.Run("schedules exit conquest with 2 silver cards when there are 2 victories", func(t *testing.T) {
				var conquestID uint64

				// Setup
				{
					// Conquests
					{
						conquest := &data.Conquest{Conquest: &proto.Conquest{
							Status:    proto.ConquestStatus_IN_PROGRESS,
							AccountID: accountID,
							Mode:      gameMode,
							Hero:      hero,
							MatchProgress: map[uint64]proto.ConquestMatchResult{
								1: proto.ConquestMatchResult_WIN,
								2: proto.ConquestMatchResult_WIN,
							},
						}}
						err := data.DB.Save(conquest)
						require.NoError(t, err)

						conquestID = conquest.ID

						t.Cleanup(func() {
							err := data.DB.Conquests().Find(db.Cond{"account_id": accountID}).Delete()
							require.NoError(t, err)
						})
					}

					t.Cleanup(func() {
						cleanupConquestStateTasks(t, accountID)
					})
				}

				matchResult := proto.ConquestMatchResult_LOSS

				metricsCollector.EXPECT().TrackConquestExited(2)

				events, rewards, err := stateManager.UpdateProgress(ctx, data.DB.Session, accountID, matchID, matchResult)
				require.NoError(t, err)

				require.Len(t, events, 1)
				assert.Equal(t, proto.FeedEventType_REWARD, events[0].Type)
				assert.Len(t, events[0].TokenIDs, 2)

				require.Len(t, rewards, 2)
				assert.Equal(t, proto.RewardType_CARD, rewards[0].Type)
				assert.Equal(t, proto.ItemType_SW_SILVER_CARDS, rewards[0].Card.Item.ItemType)
				assert.NotZero(t, rewards[0].Card.Card.ID)
				assert.Equal(t, proto.RewardType_CARD, rewards[1].Type)
				assert.Equal(t, proto.ItemType_SW_SILVER_CARDS, rewards[1].Card.Item.ItemType)
				assert.NotZero(t, rewards[1].Card.Card.ID)

				conquest, err := data.DB.Conquests().FindOne(db.Cond{"account_id": accountID})
				require.NoError(t, err)
				require.NotNil(t, conquest)

				assert.Equal(t, conquestID, conquest.ID)
				assert.Equal(t, matchResult, conquest.MatchProgress[matchID])
				assert.Equal(t, proto.ConquestStatus_REWARDS_PENDING, conquest.Status)
				assert.False(t, conquest.CanHaveMoreMatches())

				task, taskPayload, err := apitest.GetTask[jobqueue.ExitConquestTask](jobqueue.ExitConquestQueue, &accountID)
				require.NoError(t, err)

				require.NotNil(t, task)
				assert.Equal(t, proto.TaskStatus_PENDING, task.Status)

				require.NotNil(t, taskPayload)
				assert.Len(t, taskPayload.SilverCardIDs, 2)
				assert.Len(t, taskPayload.GoldCardIDs, 0)
			})

			t.Run("schedules exit conquest with 1 silver card and 1 gold card when there are 3 victories", func(t *testing.T) {
				var conquestID uint64

				// Setup
				{
					// Conquests
					{
						conquest := &data.Conquest{Conquest: &proto.Conquest{
							Status:    proto.ConquestStatus_IN_PROGRESS,
							AccountID: accountID,
							Mode:      gameMode,
							Hero:      hero,
							MatchProgress: map[uint64]proto.ConquestMatchResult{
								1: proto.ConquestMatchResult_WIN,
								2: proto.ConquestMatchResult_WIN,
							},
						}}
						err := data.DB.Save(conquest)
						require.NoError(t, err)

						conquestID = conquest.ID

						t.Cleanup(func() {
							err := data.DB.Conquests().Find(db.Cond{"account_id": accountID}).Delete()
							require.NoError(t, err)
						})
					}

					t.Cleanup(func() {
						cleanupConquestStateTasks(t, accountID)
					})
				}

				matchResult := proto.ConquestMatchResult_WIN

				metricsCollector.EXPECT().TrackConquestExited(3)

				events, rewards, err := stateManager.UpdateProgress(ctx, data.DB.Session, accountID, matchID, matchResult)
				require.NoError(t, err)

				require.Len(t, events, 2)
				assert.Equal(t, proto.FeedEventType_REWARD, events[0].Type)
				assert.Len(t, events[0].TokenIDs, 1)
				assert.Equal(t, proto.FeedEventType_DELAYED_REWARD, events[1].Type)
				assert.Len(t, events[1].TokenIDs, 1)

				require.Len(t, rewards, 2)
				assert.Equal(t, proto.RewardType_CARD, rewards[0].Type)
				assert.Equal(t, proto.ItemType_SW_SILVER_CARDS, rewards[0].Card.Item.ItemType)
				assert.NotZero(t, rewards[0].Card.Card.ID)
				assert.Equal(t, proto.RewardType_CARD, rewards[1].Type)
				assert.Equal(t, proto.ItemType_SW_GOLD_CARDS, rewards[1].Card.Item.ItemType)
				assert.NotZero(t, rewards[1].Card.Card.ID)

				conquest, err := data.DB.Conquests().FindOne(db.Cond{"account_id": accountID})
				require.NoError(t, err)
				require.NotNil(t, conquest)

				assert.Equal(t, conquestID, conquest.ID)
				assert.Equal(t, matchResult, conquest.MatchProgress[matchID])
				assert.Equal(t, proto.ConquestStatus_REWARDS_PENDING, conquest.Status)
				assert.False(t, conquest.CanHaveMoreMatches())

				task, taskPayload, err := apitest.GetTask[jobqueue.ExitConquestTask](jobqueue.ExitConquestQueue, &accountID)
				require.NoError(t, err)

				require.NotNil(t, task)
				assert.Equal(t, proto.TaskStatus_PENDING, task.Status)

				require.NotNil(t, taskPayload)
				assert.Len(t, taskPayload.SilverCardIDs, 1)
				assert.Len(t, taskPayload.GoldCardIDs, 1)
			})
		})

		t.Run("fails when there is no conquest in progress", func(t *testing.T) {
			var accountID proto.AccountID

			// Setup
			{
				// Accounts
				{
					var err error
					accountID, _, err = apitest.CreateRandomAccount("TestStateManager-2")
					require.NoError(t, err)
				}
			}

			matchID := uint64(1)
			matchResult := proto.ConquestMatchResult_WIN

			events, rewards, err := stateManager.UpdateProgress(ctx, data.DB.Session, accountID, matchID, matchResult)
			require.ErrorContains(t, err, "there is no conquest in progress")
			assert.Empty(t, events)
			assert.Empty(t, rewards)
		})
	})

	t.Run("complete", func(t *testing.T) {
		t.Run("success", func(t *testing.T) {
			var conquestID uint64

			// Setup
			{
				// Conquests
				{
					conquest := &data.Conquest{Conquest: &proto.Conquest{
						Status:    proto.ConquestStatus_IN_PROGRESS,
						AccountID: accountID,
						Mode:      gameMode,
						Hero:      hero,
						MatchProgress: map[uint64]proto.ConquestMatchResult{
							1: proto.ConquestMatchResult_WIN,
							2: proto.ConquestMatchResult_WIN,
							3: proto.ConquestMatchResult_LOSS,
						},
					}}
					err := data.DB.Save(conquest)
					require.NoError(t, err)

					conquestID = conquest.ID

					t.Cleanup(func() {
						err := data.DB.Conquests().Find(db.Cond{"account_id": accountID}).Delete()
						require.NoError(t, err)
					})
				}
			}

			metricsCollector.EXPECT().TrackConquestCompleted()

			err := stateManager.Complete(ctx, data.DB.Session, accountID, conquestID)
			require.NoError(t, err)

			conquest, err := data.DB.Conquests().FindOne(db.Cond{"id": conquestID})
			require.NoError(t, err)

			assert.Equal(t, proto.ConquestStatus_COMPLETED, conquest.Status)
		})

		t.Run("fails when the conquest can have more matches", func(t *testing.T) {
			var conquestID uint64

			// Setup
			{
				// Conquests
				{
					conquest := &data.Conquest{Conquest: &proto.Conquest{
						Status:    proto.ConquestStatus_IN_PROGRESS,
						AccountID: accountID,
						Mode:      gameMode,
						Hero:      hero,
						MatchProgress: map[uint64]proto.ConquestMatchResult{
							1: proto.ConquestMatchResult_WIN,
							2: proto.ConquestMatchResult_WIN,
						},
					}}
					err := data.DB.Save(conquest)
					require.NoError(t, err)

					conquestID = conquest.ID

					t.Cleanup(func() {
						err := data.DB.Conquests().Find(db.Cond{"account_id": accountID}).Delete()
						require.NoError(t, err)
					})
				}
			}

			err := stateManager.Complete(ctx, data.DB.Session, accountID, conquestID)
			require.ErrorContains(t, err, "can have more matches")

			conquest, err := data.DB.Conquests().FindOne(db.Cond{"id": conquestID})
			require.NoError(t, err)

			assert.Equal(t, proto.ConquestStatus_IN_PROGRESS, conquest.Status)
		})

		t.Run("fails when the conquest does not exist", func(t *testing.T) {
			err := stateManager.Complete(ctx, data.DB.Session, accountID, 999)
			require.ErrorContains(t, err, "does not exist")
		})
	})
}

func cleanupConquestStateTasks(t *testing.T, accountID proto.AccountID) {
	result := data.DB.Tasks(nil).Find(db.Cond{"account_id": accountID, "queue": db.In(jobqueue.ExitConquestQueue, jobqueue.TxnStatusGroup)})

	err := result.Delete()
	require.NoError(t, err)
}
