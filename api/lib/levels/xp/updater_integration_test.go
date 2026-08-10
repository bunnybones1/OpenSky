//go:build integration

package xp_test

import (
	"fmt"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/upper/db/v4"
	"go.uber.org/mock/gomock"

	"github.com/horizon-games/OpenSky/api/apitest"
	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/lib/levels/xp"
	"github.com/horizon-games/OpenSky/api/lib/levels/xp/mock"
	"github.com/horizon-games/OpenSky/api/proto"
)

func TestUpdater(t *testing.T) {
	var leveller *mock.MockLeveller

	// Setup
	{
		// Mocks
		{
			ctrl := gomock.NewController(t)

			leveller = mock.NewMockLeveller(ctrl)
		}
	}

	updater := xp.NewUpdater(leveller)

	t.Run("update from match", func(t *testing.T) {
		var account1, account2 *data.Account

		// Setup
		{
			// Accounts
			{
				accountID1, _, err := apitest.CreateRandomAccount("TestUpdater1")
				require.NoError(t, err)

				account1, err = data.DB.Accounts().FindByID(accountID1)
				require.NoError(t, err)

				accountID2, _, err := apitest.CreateRandomAccount("TestUpdater2")
				require.NoError(t, err)

				account2, err = data.DB.Accounts().FindByID(accountID2)
				require.NoError(t, err)
			}
		}

		reward1 := &proto.Reward{
			AccountID: account1.ID,
			Type:      proto.RewardType_EXP,
			Exp:       &proto.RewardExp{Amount: 10},
		}
		event1 := &proto.FeedEvent{
			AccountID: account1.ID,
		}
		reward2 := &proto.Reward{
			AccountID: account2.ID,
			Type:      proto.RewardType_EXP,
			Exp:       &proto.RewardExp{Amount: 20},
		}
		event2 := &proto.FeedEvent{
			AccountID: account2.ID,
		}

		t.Run("updates xp and returns events from leveling up", func(t *testing.T) {
			match := &data.Match{Match: &proto.Match{}}

			leveller.EXPECT().LevelUp(data.DB.Session, account1).Return([]*proto.FeedEvent{event1}, nil, nil)
			leveller.EXPECT().LevelUp(data.DB.Session, account2).Return([]*proto.FeedEvent{event2}, nil, nil)

			events, rewards, err := updater.UpdateFromMatch(data.DB.Session, match, account1, account2, reward1.Exp.Amount, reward2.Exp.Amount)
			require.NoError(t, err)

			require.Len(t, events, 2)
			assert.Contains(t, events, event1)
			assert.Contains(t, events, event2)
			assert.Zero(t, rewards)

			xp, err := data.DB.Items().GetXP(account1.ID)
			require.NoError(t, err)
			assert.Equal(t, reward1.Exp.Amount, xp)

			xp, err = data.DB.Items().GetXP(account2.ID)
			require.NoError(t, err)
			assert.Equal(t, reward2.Exp.Amount, xp)
		})

		t.Run("ignores zero rewards and nil accounts", func(t *testing.T) {
			match := &data.Match{Match: &proto.Match{}}

			events, rewards, err := updater.UpdateFromMatch(data.DB.Session, match, account1, nil, 0, 0)
			require.NoError(t, err)
			assert.Empty(t, events)
			assert.Empty(t, rewards)
		})

		t.Run("fails when xp for the same match has been already provided", func(t *testing.T) {
			match := &data.Match{Match: &proto.Match{
				ID: 1,
			}}

			leveller.EXPECT().LevelUp(data.DB.Session, account1).Return([]*proto.FeedEvent{event1}, nil, nil)

			events, rewards, err := updater.UpdateFromMatch(data.DB.Session, match, account1, account2, 10, 0)
			require.NoError(t, err)

			require.Len(t, events, 1)
			require.Len(t, rewards, 0)
			assert.Contains(t, events, event1)

			events, rewards, err = updater.UpdateFromMatch(data.DB.Session, match, account1, account2, 10, 0)
			require.ErrorContains(t, err, "gain xp")
			assert.Empty(t, events)
			assert.Empty(t, rewards)
		})

		t.Run("fails when leveling up fails", func(t *testing.T) {
			match := &data.Match{Match: &proto.Match{}}

			someError := fmt.Errorf("some error")

			leveller.EXPECT().LevelUp(data.DB.Session, account1).Return(nil, nil, someError)

			events, rewards, err := updater.UpdateFromMatch(data.DB.Session, match, account1, account2, 10, 0)
			require.ErrorIs(t, err, someError)
			assert.Empty(t, events)
			assert.Empty(t, rewards)
		})

		t.Run("fails when match is nil", func(t *testing.T) {
			events, rewards, err := updater.UpdateFromMatch(data.DB.Session, nil, account1, account2, 0, 0)
			require.ErrorContains(t, err, "match cannot be nil")
			assert.Empty(t, events)
			assert.Empty(t, rewards)
		})
	})

	t.Run("update from quest", func(t *testing.T) {
		var accountID proto.AccountID

		// Setup
		{
			// Accounts
			{
				var err error

				accountID, _, err = apitest.CreateRandomAccount("TestUpdater3")
				require.NoError(t, err)
			}
		}

		event := &proto.FeedEvent{
			AccountID: accountID,
		}

		reward := &proto.Reward{
			AccountID: accountID,
			Type:      proto.RewardType_RANK,
		}

		xpItemType := proto.ItemType_SW_XP

		t.Run("updates xp and returns events from leveling up", func(t *testing.T) {
			questReward := &proto.QuestReward{
				ItemType: &xpItemType,
				Amount:   10,
			}

			leveller.EXPECT().LevelUp(data.DB.Session, gomock.Any()).DoAndReturn(func(_ db.Session, account *data.Account) ([]*proto.FeedEvent, []*proto.Reward, error) {
				return []*proto.FeedEvent{event}, []*proto.Reward{reward}, nil
			})

			events, rewards, err := updater.UpdateFromQuest(data.DB.Session, accountID, questReward)
			require.NoError(t, err)

			require.Len(t, events, 1)
			assert.Contains(t, events, event)

			require.Len(t, rewards, 1)
			assert.Contains(t, rewards, reward)

			xp, err := data.DB.Items().GetXP(accountID)
			require.NoError(t, err)
			assert.Equal(t, int(questReward.Amount), int(xp))
		})

		t.Run("fails when leveling up fails", func(t *testing.T) {
			questReward := &proto.QuestReward{
				ItemType: &xpItemType,
				Amount:   10,
			}

			someError := fmt.Errorf("some error")

			leveller.EXPECT().LevelUp(data.DB.Session, gomock.Any()).Return(nil, nil, someError)

			events, rewards, err := updater.UpdateFromQuest(data.DB.Session, accountID, questReward)
			require.ErrorIs(t, err, someError)
			assert.Empty(t, events)
			assert.Empty(t, rewards)
		})

		t.Run("fails when quest reward is nil", func(t *testing.T) {
			events, rewards, err := updater.UpdateFromQuest(data.DB.Session, accountID, nil)
			require.ErrorContains(t, err, "quest reward cannot be nil")
			assert.Empty(t, events)
			assert.Empty(t, rewards)
		})

		t.Run("fails when quest reward item type is nil", func(t *testing.T) {
			questReward := &proto.QuestReward{
				Amount: 10,
			}

			events, rewards, err := updater.UpdateFromQuest(data.DB.Session, accountID, questReward)
			require.ErrorContains(t, err, "quest reward is not xp")
			assert.Empty(t, events)
			assert.Empty(t, rewards)
		})

		t.Run("fails when quest reward item type is not xp", func(t *testing.T) {
			anotherItemType := proto.ItemType_USDC
			questReward := &proto.QuestReward{
				ItemType: &anotherItemType,
				Amount:   10,
			}

			events, rewards, err := updater.UpdateFromQuest(data.DB.Session, accountID, questReward)
			require.ErrorContains(t, err, "quest reward is not xp")
			assert.Empty(t, events)
			assert.Empty(t, rewards)
		})

		t.Run("fails when quest reward amount is zero", func(t *testing.T) {
			questReward := &proto.QuestReward{
				ItemType: &xpItemType,
			}

			events, rewards, err := updater.UpdateFromQuest(data.DB.Session, accountID, questReward)
			require.ErrorContains(t, err, "quest reward has 0 amount")
			assert.Empty(t, events)
			assert.Empty(t, rewards)
		})
	})
}
