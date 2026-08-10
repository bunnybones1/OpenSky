//go:build integration

package rpc_test

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/upper/db/v4"
	"go.uber.org/mock/gomock"

	"github.com/horizon-games/OpenSky/api/apitest"
	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/lib/quests"
	"github.com/horizon-games/OpenSky/api/proto"
	"github.com/horizon-games/OpenSky/api/rpc/mock"
)

func TestListQuests(t *testing.T) {
	var questsLister *mock.MockQuestsLister

	var accountID, adminAccountID proto.AccountID

	var address, anotherAddress proto.Hash

	// Setup
	{
		// Account
		{
			var err error

			accountID, address, err = apitest.CreateRandomAccount("TestListQuests-1")
			require.NoError(t, err)

			_, anotherAddress, err = apitest.CreateRandomAccount("TestListQuests-2")
			require.NoError(t, err)

			adminAccountID, err = apitest.CreateRandomAdminAccount("TestListQuests-admin")
			require.NoError(t, err)
		}

		// Mocks
		{
			ctrl := gomock.NewController(t)

			questsLister = mock.NewMockQuestsLister(ctrl)

			apiService := apitest.APIService()

			originalQuestsLister := apiService.RPC.QuestLister

			apiService.RPC.QuestLister = questsLister

			t.Cleanup(func() {
				apiService.RPC.QuestLister = originalQuestsLister
			})
		}
	}

	expectedQuests := []*proto.Quest{{
		ID: 1,
	}}

	t.Run("player", func(t *testing.T) {
		ctx := apitest.AccountContext(accountID)

		questsLister.EXPECT().List(gomock.Any(), gomock.Any(), accountID).Return(expectedQuests, nil)

		quests, rewards, err := apitest.Client().ListQuests(ctx, nil)
		require.NoError(t, err)
		require.NotNil(t, quests)

		assert.Equal(t, expectedQuests, quests)
		assert.Empty(t, rewards)
	})

	t.Run("admin with player's address", func(t *testing.T) {
		ctx := apitest.AccountContext(adminAccountID)

		questsLister.EXPECT().List(gomock.Any(), gomock.Any(), accountID).Return(expectedQuests, nil)

		addressString := address.String()

		quests, rewards, err := apitest.Client().ListQuests(ctx, &addressString)
		require.NoError(t, err)
		require.NotNil(t, quests)

		assert.Equal(t, expectedQuests, quests)
		assert.Empty(t, rewards)
	})

	t.Run("player with another player's address", func(t *testing.T) {
		ctx := apitest.AccountContext(accountID)

		questsLister.EXPECT().List(gomock.Any(), gomock.Any(), accountID).Return(expectedQuests, nil)

		addressString := anotherAddress.String()

		quests, rewards, err := apitest.Client().ListQuests(ctx, &addressString)
		require.NoError(t, err)
		require.NotNil(t, quests)

		assert.Equal(t, expectedQuests, quests)
		assert.Empty(t, rewards)
	})
}

func TestClaimQuestRewards(t *testing.T) {
	var questsClaimer *mock.MockQuestsClaimer

	var accountID, adminAccountID proto.AccountID

	var address, anotherAddress proto.Hash

	// Setup
	{
		// Account
		{
			var err error

			accountID, address, err = apitest.CreateRandomAccount("TestClaimQuestRewards-1")
			require.NoError(t, err)

			_, anotherAddress, err = apitest.CreateRandomAccount("TestClaimQuestRewards-2")
			require.NoError(t, err)

			adminAccountID, err = apitest.CreateRandomAdminAccount("TestClaimQuestRewards-admin")
			require.NoError(t, err)
		}

		// Mocks
		{
			ctrl := gomock.NewController(t)

			questsClaimer = mock.NewMockQuestsClaimer(ctrl)

			apiService := apitest.APIService()

			originalQuestsClaimer := apiService.RPC.QuestClaimer

			apiService.RPC.QuestClaimer = questsClaimer

			t.Cleanup(func() {
				apiService.RPC.QuestClaimer = originalQuestsClaimer
			})
		}
	}

	questIDs := []uint64{1, 2}
	expectedRewards := []*proto.Reward{{Type: proto.RewardType_EXP}}
	expectedQuests := []*proto.Quest{{ID: 10}}

	t.Run("player", func(t *testing.T) {
		ctx := apitest.AccountContext(accountID)

		questsClaimer.EXPECT().ManualClaim(gomock.Any(), gomock.Any(), accountID, questIDs).Return(expectedRewards, expectedQuests, nil)

		quest, rewards, err := apitest.Client().ClaimQuestRewards(ctx, questIDs, nil)
		require.NoError(t, err)
		require.NotEmpty(t, quest)
		require.NotEmpty(t, rewards)

		assert.Equal(t, expectedQuests[0], quest)
		assert.Equal(t, expectedRewards, rewards)
	})

	t.Run("admin with player's address", func(t *testing.T) {
		ctx := apitest.AccountContext(adminAccountID)

		questsClaimer.EXPECT().ManualClaim(gomock.Any(), gomock.Any(), accountID, questIDs).Return(expectedRewards, expectedQuests, nil)

		addressString := address.String()

		quest, rewards, err := apitest.Client().ClaimQuestRewards(ctx, questIDs, &addressString)
		require.NoError(t, err)
		require.NotEmpty(t, quest)
		require.NotEmpty(t, rewards)

		assert.Equal(t, expectedQuests[0], quest)
		assert.Equal(t, expectedRewards, rewards)
	})

	t.Run("player with another player's address", func(t *testing.T) {
		ctx := apitest.AccountContext(accountID)

		questsClaimer.EXPECT().ManualClaim(gomock.Any(), gomock.Any(), accountID, questIDs).Return(expectedRewards, expectedQuests, nil)

		addressString := anotherAddress.String()

		quest, rewards, err := apitest.Client().ClaimQuestRewards(ctx, questIDs, &addressString)
		require.NoError(t, err)
		require.NotEmpty(t, quest)
		require.NotEmpty(t, rewards)

		assert.Equal(t, expectedQuests[0], quest)
		assert.Equal(t, expectedRewards, rewards)
	})
}

func TestReRollQuest(t *testing.T) {
	var questsReRoller *mock.MockQuestsReRoller

	var accountID proto.AccountID

	// Setup
	{
		// Account
		{
			var err error

			accountID, _, err = apitest.CreateRandomAccount("TestReRollQuest")
			require.NoError(t, err)
		}

		// Mocks
		{
			ctrl := gomock.NewController(t)

			questsReRoller = mock.NewMockQuestsReRoller(ctrl)

			apiService := apitest.APIService()

			originalQuestsReRoller := apiService.RPC.QuestReRoller

			apiService.RPC.QuestReRoller = questsReRoller

			t.Cleanup(func() {
				apiService.RPC.QuestReRoller = originalQuestsReRoller
			})
		}
	}

	questID := uint64(1)
	expectedQuest := &proto.Quest{ID: 1}
	expectedRewards := []*proto.Reward{{Type: proto.RewardType_EXP}}

	ctx := apitest.AccountContext(accountID)

	questsReRoller.EXPECT().ManualReRoll(gomock.Any(), gomock.Any(), accountID, questID).Return(expectedRewards, expectedQuest, nil)

	quest, rewards, err := apitest.Client().ReRollQuest(ctx, questID)
	require.NoError(t, err)
	require.NotEmpty(t, quest)
	require.NotEmpty(t, rewards)

	assert.Equal(t, expectedQuest, quest)
	assert.Equal(t, expectedRewards, rewards)
}

func TestSetQuestsAsSeen(t *testing.T) {
	var accountID proto.AccountID

	var assignment *data.QuestAssignment

	// Setup
	{
		// Account
		{
			var err error

			accountID, _, err = apitest.CreateRandomAccount("TestSetQuestsAsSeen")
			require.NoError(t, err)
		}

		// Quest assignments
		{
			assignment = &data.QuestAssignment{
				AccountID:   accountID,
				QuestType:   proto.QuestType(1),
				Periodicity: proto.QuestPeriodicity_DAILY,
				Position:    data.QuestPositionOne,
				Period:      1,
				Status:      data.QuestStatusInProgress,
			}
			err := data.DB.Save(assignment)
			require.NoError(t, err)

			t.Cleanup(func() {
				err := data.DB.QuestsAssignments().Truncate()
				require.NoError(t, err)
			})
		}
	}

	ctx := apitest.AccountContext(accountID)

	ok, err := apitest.Client().SetQuestsAsSeen(ctx, []uint64{assignment.ID})
	require.NoError(t, err)
	require.True(t, ok)

	storedAssignment, err := data.DB.QuestsAssignments().FindOne(db.Cond{"id": assignment.ID})
	require.NoError(t, err)
	require.NotNil(t, storedAssignment)
	assert.False(t, storedAssignment.IsNew)
}

func TestGetQuestsAutoRerollTime(t *testing.T) {
	var accountID proto.AccountID

	// Setup
	{
		// Account
		{
			var err error

			accountID, _, err = apitest.CreateRandomAccount("TestGetQuestsAutoRerollTime")
			require.NoError(t, err)
		}
	}

	ctx := apitest.AccountContext(accountID)

	result, err := apitest.Client().GetQuestsAutoRerollTime(ctx)
	require.NoError(t, err)
	require.NotNil(t, result)

	currentDailyPeriod := quests.GetCurrentPeriod(proto.QuestPeriodicity_DAILY)
	currentWeeklyPeriod := quests.GetCurrentPeriod(proto.QuestPeriodicity_WEEKLY)
	currentSeasonalPeriod := quests.GetCurrentPeriod(proto.QuestPeriodicity_SEASONAL)

	assert.Equal(t, currentDailyPeriod+1, quests.GetPeriodInTime(proto.QuestPeriodicity_DAILY, result.Daily))
	assert.Equal(t, currentWeeklyPeriod+1, quests.GetPeriodInTime(proto.QuestPeriodicity_WEEKLY, result.Weekly))
	assert.Equal(t, currentSeasonalPeriod+1, quests.GetPeriodInTime(proto.QuestPeriodicity_SEASONAL, result.Seasonal))
}

func TestGetEpicQuestChain(t *testing.T) {
	var questsLister *mock.MockQuestsLister

	var accountID proto.AccountID

	// Setup
	{
		// Account
		{
			var err error

			accountID, _, err = apitest.CreateRandomAccount("TestGetEpicQuestChain-1")
			require.NoError(t, err)
		}

		// Mocks
		{
			ctrl := gomock.NewController(t)

			questsLister = mock.NewMockQuestsLister(ctrl)

			apiService := apitest.APIService()

			originalQuestsLister := apiService.RPC.QuestLister

			apiService.RPC.QuestLister = questsLister

			t.Cleanup(func() {
				apiService.RPC.QuestLister = originalQuestsLister
			})
		}
	}

	expectedQuests := []*proto.Quest{{
		ID: 1,
	}}

	epicType := proto.EpicType(1)
	ctx := apitest.AccountContext(accountID)

	questsLister.EXPECT().ListEpicChain(gomock.Any(), accountID, epicType).Return(expectedQuests, nil)

	quests, err := apitest.Client().GetEpicQuestChain(ctx, &epicType)
	require.NoError(t, err)
	require.NotNil(t, quests)

	assert.Equal(t, expectedQuests, quests)
}

func TestGMCompleteQuest(t *testing.T) {
	var accountID, adminAccountID proto.AccountID

	var address, anotherAddress proto.Hash

	var assignment *data.QuestAssignment

	// Setup
	{
		// Account
		{
			var err error

			accountID, address, err = apitest.CreateRandomAccount("TestGMCompleteQuest-1")
			require.NoError(t, err)

			_, anotherAddress, err = apitest.CreateRandomAccount("TestGMCompleteQuest-2")
			require.NoError(t, err)

			adminAccountID, err = apitest.CreateRandomAdminAccount("TestGMCompleteQuest-admin")
			require.NoError(t, err)
		}

		// Quest assignments
		{
			assignment = &data.QuestAssignment{
				AccountID:   accountID,
				QuestType:   proto.QuestType(1),
				Periodicity: proto.QuestPeriodicity_DAILY,
				Position:    data.QuestPositionOne,
				Period:      1,
				Status:      data.QuestStatusInProgress,
			}
			err := data.DB.Save(assignment)
			require.NoError(t, err)

			t.Cleanup(func() {
				err := data.DB.QuestsAssignments().Truncate()
				require.NoError(t, err)
			})
		}
	}

	t.Run("player", func(t *testing.T) {
		ctx := apitest.AccountContext(accountID)

		ok, err := apitest.Client().GMCompleteQuest(ctx, nil, assignment.ID)
		require.ErrorContains(t, err, "unauthorized")
		require.False(t, ok)
	})

	t.Run("admin with player's address", func(t *testing.T) {
		ctx := apitest.AccountContext(adminAccountID)

		addressString := address.String()

		ok, err := apitest.Client().GMCompleteQuest(ctx, &addressString, assignment.ID)
		require.NoError(t, err)
		require.True(t, ok)

		storedAssignment, err := data.DB.QuestsAssignments().FindOne(db.Cond{"id": assignment.ID})
		require.NoError(t, err)
		require.NotNil(t, storedAssignment)
		assert.Equal(t, data.QuestStatusCompleted, storedAssignment.Status)
	})

	t.Run("player with another player's address", func(t *testing.T) {
		ctx := apitest.AccountContext(accountID)

		addressString := anotherAddress.String()

		ok, err := apitest.Client().GMCompleteQuest(ctx, &addressString, assignment.ID)
		require.ErrorContains(t, err, "unauthorized")
		require.False(t, ok)
	})
}

func TestGMDeleteQuest(t *testing.T) {
	var accountID, adminAccountID proto.AccountID

	var address, anotherAddress proto.Hash

	var assignment *data.QuestAssignment

	// Setup
	{
		// Account
		{
			var err error

			accountID, address, err = apitest.CreateRandomAccount("GMDeleteQuest-1")
			require.NoError(t, err)

			_, anotherAddress, err = apitest.CreateRandomAccount("GMDeleteQuest-2")
			require.NoError(t, err)

			adminAccountID, err = apitest.CreateRandomAdminAccount("GMDeleteQuest-admin")
			require.NoError(t, err)
		}

		// Quest assignments
		{
			assignment = &data.QuestAssignment{
				AccountID:   accountID,
				QuestType:   proto.QuestType(1),
				Periodicity: proto.QuestPeriodicity_DAILY,
				Position:    data.QuestPositionOne,
				Period:      1,
				Status:      data.QuestStatusInProgress,
			}
			err := data.DB.Save(assignment)
			require.NoError(t, err)

			t.Cleanup(func() {
				err := data.DB.QuestsAssignments().Truncate()
				require.NoError(t, err)
			})
		}
	}

	t.Run("player", func(t *testing.T) {
		ctx := apitest.AccountContext(accountID)

		ok, err := apitest.Client().GMDeleteQuest(ctx, nil, assignment.ID)
		require.ErrorContains(t, err, "unauthorized")
		require.False(t, ok)
	})

	t.Run("admin with player's address", func(t *testing.T) {
		ctx := apitest.AccountContext(adminAccountID)

		addressString := address.String()

		ok, err := apitest.Client().GMDeleteQuest(ctx, &addressString, assignment.ID)
		require.NoError(t, err)
		require.True(t, ok)

		storedAssignment, err := data.DB.QuestsAssignments().FindOne(db.Cond{"id": assignment.ID})
		require.ErrorIs(t, err, db.ErrNoMoreRows)
		require.Nil(t, storedAssignment)
	})

	t.Run("player with another player's address", func(t *testing.T) {
		ctx := apitest.AccountContext(accountID)

		addressString := anotherAddress.String()

		ok, err := apitest.Client().GMDeleteQuest(ctx, &addressString, assignment.ID)
		require.ErrorContains(t, err, "unauthorized")
		require.False(t, ok)
	})
}

func TestGMResetQuestReRolls(t *testing.T) {
	var accountID, adminAccountID proto.AccountID

	var address, anotherAddress proto.Hash

	var assignment1, assignment2 *data.QuestAssignment

	// Setup
	{
		// Account
		{
			var err error

			accountID, address, err = apitest.CreateRandomAccount("GMResetQuestReRolls-1")
			require.NoError(t, err)

			_, anotherAddress, err = apitest.CreateRandomAccount("GMResetQuestReRolls-2")
			require.NoError(t, err)

			adminAccountID, err = apitest.CreateRandomAdminAccount("GMResetQuestReRolls-admin")
			require.NoError(t, err)
		}

		// Quest assignments
		{
			assignment1 = &data.QuestAssignment{
				AccountID:   accountID,
				QuestType:   proto.QuestType(1),
				Periodicity: proto.QuestPeriodicity_DAILY,
				Position:    data.QuestPositionOne,
				Period:      quests.GetCurrentPeriod(proto.QuestPeriodicity_DAILY),
				Status:      data.QuestStatusInProgress,
				ReRolls:     1,
			}
			err := data.DB.Save(assignment1)
			require.NoError(t, err)

			assignment2 = &data.QuestAssignment{
				AccountID:   accountID,
				QuestType:   proto.QuestType(1),
				Periodicity: proto.QuestPeriodicity_WEEKLY,
				Position:    data.QuestPositionOne,
				Period:      quests.GetCurrentPeriod(proto.QuestPeriodicity_WEEKLY),
				Status:      data.QuestStatusInProgress,
				ReRolls:     2,
			}
			err = data.DB.Save(assignment2)
			require.NoError(t, err)

			t.Cleanup(func() {
				err := data.DB.QuestsAssignments().Truncate()
				require.NoError(t, err)
			})
		}
	}

	t.Run("player", func(t *testing.T) {
		ctx := apitest.AccountContext(accountID)

		ok, err := apitest.Client().GMResetQuestReRolls(ctx, nil, &assignment1.Periodicity)
		require.ErrorContains(t, err, "unauthorized")
		require.False(t, ok)
	})

	t.Run("admin with player's address", func(t *testing.T) {
		ctx := apitest.AccountContext(adminAccountID)

		addressString := address.String()

		ok, err := apitest.Client().GMResetQuestReRolls(ctx, &addressString, &assignment1.Periodicity)
		require.NoError(t, err)
		require.True(t, ok)

		storedAssignment, err := data.DB.QuestsAssignments().FindOne(db.Cond{"id": assignment1.ID})
		require.NoError(t, err)
		require.NotNil(t, storedAssignment)
		assert.Zero(t, storedAssignment.ReRolls)

		storedAssignment, err = data.DB.QuestsAssignments().FindOne(db.Cond{"id": assignment2.ID})
		require.NoError(t, err)
		require.NotNil(t, storedAssignment)
		assert.NotZero(t, storedAssignment.ReRolls)
	})

	t.Run("player with another player's address", func(t *testing.T) {
		ctx := apitest.AccountContext(accountID)

		addressString := anotherAddress.String()

		ok, err := apitest.Client().GMResetQuestReRolls(ctx, &addressString, &assignment1.Periodicity)
		require.ErrorContains(t, err, "unauthorized")
		require.False(t, ok)
	})
}

// Covers issue https://github.com/horizon-games/issue-tracker/issues/12091
func TestQuestFromLastPeriodCanBeAssignedAgainWhenNoOtherAvailable(t *testing.T) {
	var accountID proto.AccountID

	var address proto.Hash

	var questAssignment *data.QuestAssignment

	// Setup
	{
		var questSpec *data.QuestSpec

		// Account
		{
			var err error

			accountID, address, err = apitest.CreateRandomAccount("TestIssue12091")
			require.NoError(t, err)
		}

		// Quest specs
		{
			questSpec = &data.QuestSpec{
				QuestType:   proto.QuestType(42),
				Periodicity: proto.QuestPeriodicity_SEASONAL,
				Position:    data.QuestPositionOne,
				Rerollable:  true,
			}
			err := data.DB.Save(questSpec)
			require.NoError(t, err)

			t.Cleanup(func() {
				err := data.DB.QuestsSpecs().Truncate()
				require.NoError(t, err)
			})
		}

		// Quest assignments
		{
			questAssignment = &data.QuestAssignment{
				AccountID:   accountID,
				QuestType:   questSpec.QuestType,
				Periodicity: questSpec.Periodicity,
				Position:    questSpec.Position,
				Period:      data.CurrentSeason() - 1,
				Status:      data.QuestStatusInProgress,
				Active:      true,
			}
			err := data.DB.Save(questAssignment)
			require.NoError(t, err)

			t.Cleanup(func() {
				err := data.DB.QuestsAssignments().Truncate()
				require.NoError(t, err)
			})
		}

		t.Cleanup(func() {
			var err error

			err = data.DB.QuestsAssignments().Truncate()
			require.NoError(t, err)

			err = data.DB.QuestsSpecs().Truncate()
			require.NoError(t, err)
		})
	}

	ctx := apitest.AccountContext(accountID)
	addressString := address.String()

	quests, _, err := apitest.Client().ListQuests(ctx, &addressString)
	require.NoError(t, err)

	require.Len(t, quests, 1)
	assert.NotEqual(t, questAssignment.ID, quests[0])
	assert.Equal(t, questAssignment.QuestType, *quests[0].QuestType)
}
