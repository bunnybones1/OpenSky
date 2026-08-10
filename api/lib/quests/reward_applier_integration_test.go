//go:build integration

package quests_test

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/upper/db/v4"
	"go.uber.org/mock/gomock"

	"github.com/horizon-games/OpenSky/api/apitest"
	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/lib/quests"
	"github.com/horizon-games/OpenSky/api/lib/quests/mock"
	"github.com/horizon-games/OpenSky/api/proto"
)

func TestRewardApplier(t *testing.T) {
	var accountID proto.AccountID

	var xpUpdater *mock.MockXPUpdater

	// Setup
	{
		// Accounts
		{
			var err error

			accountID, _, err = apitest.CreateRandomAccount("TestRewardApplier")
			require.NoError(t, err)
		}

		// Mocks
		{
			ctrl := gomock.NewController(t)

			xpUpdater = mock.NewMockXPUpdater(ctrl)
		}
	}

	applier := quests.NewRewardApplier(xpUpdater)

	t.Run("xp", func(t *testing.T) {
		// Setup
		{
			t.Cleanup(func() {
				err := data.DB.FeedEvents().Find(db.Cond{"account_id": accountID}).Delete()
				require.NoError(t, err)
			})
		}

		itemType := proto.ItemType_SW_XP
		amount := uint16(10)

		questReward := &proto.QuestReward{
			ItemType: &itemType,
			Amount:   amount,
		}

		expectedFeedEvent := &proto.FeedEvent{
			AccountID: accountID,
			Type:      proto.FeedEventType_LEVELUP,
		}

		expectedReward := &proto.Reward{
			AccountID: accountID,
			Type:      proto.RewardType_RANK,
		}

		xpUpdater.EXPECT().UpdateFromQuest(data.DB.Session, accountID, questReward).Return([]*proto.FeedEvent{expectedFeedEvent}, []*proto.Reward{expectedReward}, nil)

		gainedRewards, err := applier.ApplyReward(data.DB.Session, accountID, questReward)
		require.NoError(t, err)

		require.Len(t, gainedRewards, 2)

		var rewardFound bool

		for _, gainedReward := range gainedRewards {
			if gainedReward.Type == proto.RewardType_EXP {
				assert.Equal(t, int(amount), int(gainedReward.Exp.Amount))
				rewardFound = true
			}
		}

		assert.True(t, rewardFound, "xp reward")
		assert.Contains(t, gainedRewards, expectedReward)

		feedEvent, err := data.DB.FeedEvents().FindOne(db.Cond{"account_id": accountID, "event_type": expectedFeedEvent.Type})
		require.NoError(t, err)
		assert.NotNil(t, feedEvent)
	})

	t.Run("fails when the reward is not supported", func(t *testing.T) {
		itemType := proto.ItemType_USDC

		reward := &proto.QuestReward{
			ItemType: &itemType,
			Amount:   10,
		}

		gainedRewards, err := applier.ApplyReward(data.DB.Session, accountID, reward)
		require.ErrorContains(t, err, "unsupported item type")
		assert.Empty(t, gainedRewards)
	})
}
