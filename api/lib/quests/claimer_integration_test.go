//go:build integration

package quests_test

import (
	"context"
	"fmt"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/upper/db/v4"
	"go.uber.org/mock/gomock"

	"github.com/horizon-games/OpenSky/api/apitest"
	"github.com/horizon-games/OpenSky/api/data"
	analyticsMock "github.com/horizon-games/OpenSky/api/lib/analytics/mock"
	"github.com/horizon-games/OpenSky/api/lib/quests"
	"github.com/horizon-games/OpenSky/api/lib/quests/mock"
	"github.com/horizon-games/OpenSky/api/proto"
)

func TestClaimer(t *testing.T) {
	accountID := apitest.RandomAccountID()

	var rewardApplier *mock.MockRewardApplier

	var metricsCollector *mock.MockMetricsCollector

	var analyticsTracker *analyticsMock.MockTracker

	var dueChecker *mock.MockDueChecker

	var reRoller *mock.MockReRoller

	var assigner *mock.MockAssigner

	var spec *data.QuestSpec

	// Setup
	{
		// Quest specs
		{
			itemType := proto.ItemType_SW_XP

			spec = &data.QuestSpec{
				QuestType: proto.QuestType(1),
				Reward: proto.QuestReward{
					ItemType: &itemType,
					Amount:   10,
				},
				Periodicity: proto.QuestPeriodicity_WEEKLY,
				Position:    data.QuestPositionTwo,
			}
			err := data.DB.Save(spec)
			require.NoError(t, err)

			t.Cleanup(func() {
				err := data.DB.QuestsSpecs().Truncate()
				require.NoError(t, err)
			})
		}

		// Mocks
		{
			ctrl := gomock.NewController(t)

			rewardApplier = mock.NewMockRewardApplier(ctrl)
			dueChecker = mock.NewMockDueChecker(ctrl)
			reRoller = mock.NewMockReRoller(ctrl)
			assigner = mock.NewMockAssigner(ctrl)
			metricsCollector = mock.NewMockMetricsCollector(ctrl)
			analyticsTracker = analyticsMock.NewMockTracker(ctrl)
		}
	}

	currentPeriod := quests.GetCurrentPeriod(spec.Periodicity)

	claimer := quests.NewClaimer(apitest.NewLogger(), analyticsTracker, rewardApplier, dueChecker, reRoller, assigner, metricsCollector)

	ctx := context.Background()

	t.Run("manual claim", func(t *testing.T) {
		t.Run("fails when the quest is not completed", func(t *testing.T) {
			var assignment *data.QuestAssignment

			// Setup
			{
				// Quest assignments
				{
					assignment = &data.QuestAssignment{
						AccountID:   accountID,
						QuestType:   proto.QuestType(1),
						Periodicity: proto.QuestPeriodicity_WEEKLY,
						Position:    data.QuestPositionTwo,
						Period:      currentPeriod,
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

			gainedRewards, _, err := claimer.ManualClaim(ctx, data.DB.Session, accountID, []uint64{assignment.ID})
			require.ErrorContains(t, err, "quest must be completed")
			assert.Empty(t, gainedRewards)
		})

		t.Run("claims reward", func(t *testing.T) {
			var assignment *data.QuestAssignment

			// Setup
			{
				// Quest assignments
				{
					assignment = &data.QuestAssignment{
						AccountID:   accountID,
						QuestType:   spec.QuestType,
						Periodicity: proto.QuestPeriodicity_WEEKLY,
						Position:    data.QuestPositionTwo,
						Period:      currentPeriod,
						Status:      data.QuestStatusCompleted,
					}
					err := data.DB.Save(assignment)
					require.NoError(t, err)

					t.Cleanup(func() {
						err := data.DB.QuestsAssignments().Truncate()
						require.NoError(t, err)
					})
				}
			}

			expectedGainedRewards := []*proto.Reward{
				{
					AccountID: accountID,
					Type:      proto.RewardType_EXP,
					Exp: &proto.RewardExp{
						Amount: uint64(spec.Reward.Amount),
					},
				},
			}

			rewardApplier.EXPECT().ApplyReward(data.DB.Session, accountID, &spec.Reward).Return(expectedGainedRewards, nil)

			dueChecker.EXPECT().IsDueToAutoReRoll(spec, gomock.Any()).Return(false)

			metricsCollector.EXPECT().TrackQuestManualClaim(assignment.Periodicity)

			analyticsTracker.EXPECT().TrackCompletedQuestClaim(gomock.Any(), accountID, gomock.Any())

			gainedRewards, _, err := claimer.ManualClaim(ctx, data.DB.Session, accountID, []uint64{assignment.ID})
			require.NoError(t, err)
			require.Equal(t, expectedGainedRewards, gainedRewards)

			storedAssignment, err := data.DB.QuestsAssignments().FindOne(db.Cond{"id": assignment.ID})
			require.NoError(t, err)
			require.NotNil(t, storedAssignment)
			assert.Equal(t, data.QuestStatusClaimed, storedAssignment.Status)
			assert.NotNil(t, storedAssignment.ClaimedAt)
			assert.Equal(t, data.QuestAssignmentRewards(expectedGainedRewards), storedAssignment.Rewards)
		})

		t.Run("claims reward and re-rolls new quest when it is due to re-roll", func(t *testing.T) {
			var assignment *data.QuestAssignment

			var spec *data.QuestSpec

			// Setup
			{
				// Quest specs
				{
					itemType := proto.ItemType_SW_XP

					spec = &data.QuestSpec{
						QuestType: proto.QuestType(2),
						Reward: proto.QuestReward{
							ItemType: &itemType,
							Amount:   20,
						},
						Periodicity: proto.QuestPeriodicity_WEEKLY,
						Position:    data.QuestPositionTwo,
					}
					err := data.DB.Save(spec)
					require.NoError(t, err)

					t.Cleanup(func() {
						err := data.DB.QuestsSpecs().Find(db.Cond{"quest_type": spec.QuestType}).Delete()
						require.NoError(t, err)
					})
				}

				// Quest assignments
				{
					assignment = &data.QuestAssignment{
						AccountID:   accountID,
						QuestType:   spec.QuestType,
						Periodicity: spec.Periodicity,
						Position:    spec.Position,
						Period:      currentPeriod - 1,
						Status:      data.QuestStatusCompleted,
					}
					err := data.DB.Save(assignment)
					require.NoError(t, err)

					t.Cleanup(func() {
						err := data.DB.QuestsAssignments().Truncate()
						require.NoError(t, err)
					})
				}
			}

			expectedGainedRewards := []*proto.Reward{
				{
					AccountID: accountID,
					Type:      proto.RewardType_EXP,
					Exp: &proto.RewardExp{
						Amount: uint64(spec.Reward.Amount),
					},
				},
			}

			expecteQuest := &proto.Quest{ID: 10}

			rewardApplier.EXPECT().ApplyReward(data.DB.Session, accountID, &spec.Reward).Return(expectedGainedRewards, nil)
			dueChecker.EXPECT().IsDueToAutoReRoll(spec, gomock.Any()).DoAndReturn(
				func(_ *data.QuestSpec, a *data.QuestAssignment) bool {
					assert.Equal(t, assignment.ID, a.ID)

					return true
				})
			reRoller.EXPECT().AutoReRoll(ctx, data.DB.Session, spec, gomock.Any()).DoAndReturn(
				func(_ context.Context, _ db.Session, _ *data.QuestSpec, a *data.QuestAssignment) (*proto.Quest, error) {
					assert.Equal(t, assignment.ID, a.ID)

					return expecteQuest, nil
				})
			metricsCollector.EXPECT().TrackQuestManualClaim(assignment.Periodicity)

			analyticsTracker.EXPECT().TrackCompletedQuestClaim(gomock.Any(), accountID, gomock.Any())

			gainedRewards, quests, err := claimer.ManualClaim(ctx, data.DB.Session, accountID, []uint64{assignment.ID})
			require.NoError(t, err)
			require.Equal(t, expectedGainedRewards, gainedRewards)
			assert.Len(t, quests, 1)
			assert.Contains(t, quests, expecteQuest)

			storedAssignment, err := data.DB.QuestsAssignments().FindOne(db.Cond{"id": assignment.ID})
			require.NoError(t, err)
			require.NotNil(t, storedAssignment)
			assert.Equal(t, data.QuestStatusClaimed, storedAssignment.Status)
			assert.NotNil(t, storedAssignment.ClaimedAt)
			assert.Equal(t, data.QuestAssignmentRewards(expectedGainedRewards), storedAssignment.Rewards)
		})

		t.Run("claims reward and gets next quest in the epic", func(t *testing.T) {
			var assignment *data.QuestAssignment

			var spec *data.QuestSpec

			// Setup
			{
				// Quest specs
				{
					epicType := proto.EpicType(1)
					epicIndex := uint16(1)
					epicLength := uint16(2)
					itemType := proto.ItemType_SW_XP

					spec = &data.QuestSpec{
						QuestType:  proto.QuestType(2),
						EpicType:   &epicType,
						EpicIndex:  &epicIndex,
						EpicLength: &epicLength,
						Reward: proto.QuestReward{
							ItemType: &itemType,
							Amount:   20,
						},
						Periodicity: proto.QuestPeriodicity_WEEKLY,
						Position:    data.QuestPositionTwo,
					}
					err := data.DB.Save(spec)
					require.NoError(t, err)

					t.Cleanup(func() {
						err := data.DB.QuestsSpecs().Find(db.Cond{"quest_type": spec.QuestType}).Delete()
						require.NoError(t, err)
					})
				}

				// Quest assignments
				{
					assignment = &data.QuestAssignment{
						AccountID:   accountID,
						QuestType:   spec.QuestType,
						Periodicity: spec.Periodicity,
						Position:    spec.Position,
						Period:      currentPeriod,
						Status:      data.QuestStatusCompleted,
					}
					err := data.DB.Save(assignment)
					require.NoError(t, err)

					t.Cleanup(func() {
						err := data.DB.QuestsAssignments().Truncate()
						require.NoError(t, err)
					})
				}
			}

			expectedGainedRewards := []*proto.Reward{
				{
					AccountID: accountID,
					Type:      proto.RewardType_EXP,
					Exp: &proto.RewardExp{
						Amount: uint64(spec.Reward.Amount),
					},
				},
			}

			expecteQuest := &proto.Quest{ID: 10}

			rewardApplier.EXPECT().ApplyReward(data.DB.Session, accountID, &spec.Reward).Return(expectedGainedRewards, nil)
			dueChecker.EXPECT().IsDueToAutoReRoll(spec, gomock.Any()).Return(false)
			assigner.EXPECT().MoveUpInEpic(data.DB.Session, spec, gomock.Any()).DoAndReturn(
				func(_ db.Session, _ *data.QuestSpec, a *data.QuestAssignment) (*proto.Quest, error) {
					assert.Equal(t, assignment.ID, a.ID)

					return expecteQuest, nil
				})

			analyticsTracker.EXPECT().TrackCompletedQuestClaim(gomock.Any(), accountID, gomock.Any())
			metricsCollector.EXPECT().TrackQuestManualClaim(assignment.Periodicity)

			gainedRewards, quests, err := claimer.ManualClaim(ctx, data.DB.Session, accountID, []uint64{assignment.ID})
			require.NoError(t, err)
			require.Equal(t, expectedGainedRewards, gainedRewards)
			assert.Len(t, quests, 1)
			assert.Contains(t, quests, expecteQuest)

			storedAssignment, err := data.DB.QuestsAssignments().FindOne(db.Cond{"id": assignment.ID})
			require.NoError(t, err)
			require.NotNil(t, storedAssignment)
			assert.Equal(t, data.QuestStatusClaimed, storedAssignment.Status)
			assert.NotNil(t, storedAssignment.ClaimedAt)
			assert.Equal(t, data.QuestAssignmentRewards(expectedGainedRewards), storedAssignment.Rewards)
		})

		t.Run("claims reward and does not get next quest in the epic when it is the last epic quest", func(t *testing.T) {
			var assignment *data.QuestAssignment

			var spec *data.QuestSpec

			// Setup
			{
				// Quest specs
				{
					epicType := proto.EpicType(1)
					epicIndex := uint16(2)
					epicLength := uint16(2)
					itemType := proto.ItemType_SW_XP

					spec = &data.QuestSpec{
						QuestType:  proto.QuestType(2),
						EpicType:   &epicType,
						EpicIndex:  &epicIndex,
						EpicLength: &epicLength,
						Reward: proto.QuestReward{
							ItemType: &itemType,
							Amount:   20,
						},
						Periodicity: proto.QuestPeriodicity_WEEKLY,
						Position:    data.QuestPositionTwo,
					}
					err := data.DB.Save(spec)
					require.NoError(t, err)

					t.Cleanup(func() {
						err := data.DB.QuestsSpecs().Find(db.Cond{"quest_type": spec.QuestType}).Delete()
						require.NoError(t, err)
					})
				}

				// Quest assignments
				{
					assignment = &data.QuestAssignment{
						AccountID:   accountID,
						QuestType:   spec.QuestType,
						Periodicity: spec.Periodicity,
						Position:    spec.Position,
						Period:      currentPeriod,
						Status:      data.QuestStatusCompleted,
					}
					err := data.DB.Save(assignment)
					require.NoError(t, err)

					t.Cleanup(func() {
						err := data.DB.QuestsAssignments().Truncate()
						require.NoError(t, err)
					})
				}
			}

			expectedGainedRewards := []*proto.Reward{
				{
					AccountID: accountID,
					Type:      proto.RewardType_EXP,
					Exp: &proto.RewardExp{
						Amount: uint64(spec.Reward.Amount),
					},
				},
			}

			rewardApplier.EXPECT().ApplyReward(data.DB.Session, accountID, &spec.Reward).Return(expectedGainedRewards, nil)

			dueChecker.EXPECT().IsDueToAutoReRoll(spec, gomock.Any()).Return(false)

			metricsCollector.EXPECT().TrackQuestManualClaim(assignment.Periodicity)
			analyticsTracker.EXPECT().TrackCompletedQuestClaim(gomock.Any(), accountID, gomock.Any())

			gainedRewards, quests, err := claimer.ManualClaim(ctx, data.DB.Session, accountID, []uint64{assignment.ID})
			require.NoError(t, err)
			require.Equal(t, expectedGainedRewards, gainedRewards)
			require.Empty(t, quests)

			storedAssignment, err := data.DB.QuestsAssignments().FindOne(db.Cond{"id": assignment.ID})
			require.NoError(t, err)
			require.NotNil(t, storedAssignment)
			assert.Equal(t, data.QuestStatusClaimed, storedAssignment.Status)
			assert.NotNil(t, storedAssignment.ClaimedAt)
			assert.Equal(t, data.QuestAssignmentRewards(expectedGainedRewards), storedAssignment.Rewards)
		})

		t.Run("fails when reward applier fails", func(t *testing.T) {
			var assignment *data.QuestAssignment

			// Setup
			{
				// Quest assignments
				{
					assignment = &data.QuestAssignment{
						AccountID:   accountID,
						QuestType:   spec.QuestType,
						Periodicity: proto.QuestPeriodicity_WEEKLY,
						Position:    data.QuestPositionTwo,
						Period:      currentPeriod,
						Status:      data.QuestStatusCompleted,
					}
					err := data.DB.Save(assignment)
					require.NoError(t, err)

					t.Cleanup(func() {
						err := data.DB.QuestsAssignments().Truncate()
						require.NoError(t, err)
					})
				}
			}

			expectedErr := fmt.Errorf("some error")

			rewardApplier.EXPECT().ApplyReward(data.DB.Session, accountID, &spec.Reward).Return(nil, expectedErr)

			gainedRewards, _, err := claimer.ManualClaim(ctx, data.DB.Session, accountID, []uint64{assignment.ID})
			require.ErrorIs(t, err, expectedErr)
			require.Empty(t, gainedRewards)

			storedAssignment, err := data.DB.QuestsAssignments().FindOne(db.Cond{"id": assignment.ID})
			require.NoError(t, err)
			require.NotNil(t, storedAssignment)
			assert.Equal(t, assignment.Status, storedAssignment.Status)
			assert.Nil(t, storedAssignment.ClaimedAt)
			assert.Empty(t, storedAssignment.Rewards)
		})
	})
}
