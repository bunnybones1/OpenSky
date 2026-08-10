//go:build integration

package quests_test

import (
	"context"
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

func TestReRoller(t *testing.T) {
	var accountID proto.AccountID

	var dueChecker *mock.MockDueChecker

	var assigner *mock.MockAssigner

	var metricsCollector *mock.MockMetricsCollector

	var analyticsTracker *analyticsMock.MockTracker

	// Setup
	{
		// Accounts
		{
			var err error

			accountID, _, err = apitest.CreateRandomAccount("TestReRoller")
			require.NoError(t, err)
		}

		// Mocks
		{
			ctrl := gomock.NewController(t)

			dueChecker = mock.NewMockDueChecker(ctrl)
			assigner = mock.NewMockAssigner(ctrl)
			metricsCollector = mock.NewMockMetricsCollector(ctrl)
			analyticsTracker = analyticsMock.NewMockTracker(ctrl)
		}
	}

	reRoller := quests.NewReRoller(apitest.NewLogger(), analyticsTracker, dueChecker, assigner, metricsCollector)
	ctx := context.Background()

	t.Run("auto re-roll", func(t *testing.T) {
		periodicity := proto.QuestPeriodicity_WEEKLY
		currentPeriod := quests.GetCurrentPeriod(periodicity)
		position := data.QuestPositionTwo
		questType := proto.QuestType(1)

		t.Run("fails when the quest is not due to auto re-roll", func(t *testing.T) {
			spec := &data.QuestSpec{
				Periodicity: periodicity,
			}

			assignment := &data.QuestAssignment{
				Period: currentPeriod,
			}

			dueChecker.EXPECT().IsDueToAutoReRoll(spec, assignment).Return(false)

			quest, err := reRoller.AutoReRoll(ctx, data.DB.Session, spec, assignment)
			require.ErrorContains(t, err, "quest is not due to auto re-roll")
			assert.Nil(t, quest)
		})

		t.Run("sets the former quest as failed when it is in progress", func(t *testing.T) {
			var assignment *data.QuestAssignment

			spec := &data.QuestSpec{
				Periodicity: periodicity,
				Position:    position,
				Rerollable:  true,
			}

			// Setup
			{
				// Quest assignments
				{
					assignment = &data.QuestAssignment{
						AccountID:   accountID,
						QuestType:   questType,
						Periodicity: spec.Periodicity,
						Position:    spec.Position,
						Period:      currentPeriod - 1,
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

			expectedQuest := &proto.Quest{ID: 10}

			dueChecker.EXPECT().IsDueToAutoReRoll(spec, assignment).Return(true)

			assigner.EXPECT().RollNew(data.DB.Session, accountID, spec.Periodicity, spec.Position, spec, assignment).Return(expectedQuest, nil)

			metricsCollector.EXPECT().TrackQuestAutoReRoll(assignment.Periodicity, assignment.Position)
			analyticsTracker.EXPECT().TrackRerollQuest(gomock.Any(), accountID, gomock.Any())

			quest, err := reRoller.AutoReRoll(ctx, data.DB.Session, spec, assignment)
			require.NoError(t, err)
			assert.Equal(t, expectedQuest, quest)

			result, err := data.DB.QuestsAssignments().FindOne(db.Cond{"id": assignment.ID})
			require.NoError(t, err)
			require.NotNil(t, result)
			assert.Equal(t, data.QuestStatusFailed, result.Status)
		})
	})

	t.Run("manual re-roll", func(t *testing.T) {
		periodicity := proto.QuestPeriodicity_WEEKLY
		currentPeriod := quests.GetCurrentPeriod(periodicity)
		position := data.QuestPositionTwo
		questType := proto.QuestType(1)

		t.Run("fails when it is not in progress", func(t *testing.T) {
			var assignment *data.QuestAssignment

			var spec *data.QuestSpec

			// Setup
			{
				// Quest specs
				{
					spec = &data.QuestSpec{
						QuestType:   questType,
						Periodicity: periodicity,
						Position:    position,
						Rerollable:  true,
					}
					err := data.DB.Save(spec)
					require.NoError(t, err)
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

			gainedRewards, quest, err := reRoller.ManualReRoll(ctx, data.DB.Session, accountID, assignment.ID)
			require.ErrorContains(t, err, "the quest is not in progress")
			assert.Empty(t, quest)
			assert.Empty(t, gainedRewards)
		})

		t.Run("sets the former quest as failed", func(t *testing.T) {
			var assignment *data.QuestAssignment

			var spec *data.QuestSpec

			// Setup
			{
				// Quest specs
				{
					spec = &data.QuestSpec{
						QuestType:   proto.QuestType(1),
						Periodicity: periodicity,
						Position:    position,
						Rerollable:  true,
					}
					err := data.DB.Save(spec)
					require.NoError(t, err)
				}

				// Quest assignments
				{
					assignment = &data.QuestAssignment{
						AccountID:   accountID,
						QuestType:   spec.QuestType,
						Periodicity: spec.Periodicity,
						Position:    spec.Position,
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

			expectedQuest := &proto.Quest{ID: 10}

			assigner.EXPECT().RollNew(data.DB.Session, accountID, spec.Periodicity, spec.Position, spec, gomock.Any()).Return(expectedQuest, nil)

			metricsCollector.EXPECT().TrackQuestManualReRoll(assignment.Periodicity, assignment.Position, uint16(1))
			analyticsTracker.EXPECT().TrackRerollQuest(gomock.Any(), accountID, gomock.Any())

			gainedRewards, quest, err := reRoller.ManualReRoll(ctx, data.DB.Session, accountID, assignment.ID)
			require.NoError(t, err)
			assert.Equal(t, expectedQuest, quest)
			assert.Empty(t, gainedRewards)

			result, err := data.DB.QuestsAssignments().FindOne(db.Cond{"id": assignment.ID})
			require.NoError(t, err)
			require.NotNil(t, result)
			assert.Equal(t, data.QuestStatusFailed, result.Status)
		})

		t.Run("allows to re-roll once per period for each periodicity and twice when the player has skypass premium", func(t *testing.T) {
			tests := []proto.QuestPeriodicity{
				proto.QuestPeriodicity_DAILY,
				proto.QuestPeriodicity_WEEKLY,
				proto.QuestPeriodicity_SEASONAL,
			}

			expectedQuest := &proto.Quest{ID: 10}

			for _, periodicity := range tests {
				var assignment1, assignment2, assignment3 *data.QuestAssignment

				var spec1, spec2, spec3 *data.QuestSpec

				// Setup
				{
					// Quest specs
					{
						spec1 = &data.QuestSpec{
							QuestType:   proto.QuestType(1),
							Periodicity: periodicity,
							Position:    data.QuestPositionOne,
							Rerollable:  true,
						}
						err := data.DB.Save(spec1)
						require.NoError(t, err)

						spec2 = &data.QuestSpec{
							QuestType:   proto.QuestType(2),
							Periodicity: periodicity,
							Position:    data.QuestPositionTwo,
							Rerollable:  true,
						}
						err = data.DB.Save(spec2)
						require.NoError(t, err)

						spec3 = &data.QuestSpec{
							QuestType:   proto.QuestType(3),
							Periodicity: periodicity,
							Position:    data.QuestPositionThree,
							Rerollable:  true,
						}
						err = data.DB.Save(spec3)
						require.NoError(t, err)

						t.Cleanup(func() {
							err := data.DB.QuestsSpecs().Find(db.Cond{
								"quest_type": db.In(spec1.QuestType, spec2.QuestType, spec3.QuestType),
							}).Delete()
							require.NoError(t, err)
						})
					}

					// Quest assignments
					{
						assignment1 = &data.QuestAssignment{
							AccountID:   accountID,
							QuestType:   spec1.QuestType,
							Periodicity: spec1.Periodicity,
							Position:    spec1.Position,
							Period:      quests.GetCurrentPeriod(spec1.Periodicity),
							Status:      data.QuestStatusInProgress,
						}
						err := data.DB.Save(assignment1)
						require.NoError(t, err)

						assignment2 = &data.QuestAssignment{
							AccountID:   accountID,
							QuestType:   spec2.QuestType,
							Periodicity: spec2.Periodicity,
							Position:    spec2.Position,
							Period:      quests.GetCurrentPeriod(spec2.Periodicity),
							Status:      data.QuestStatusInProgress,
						}
						err = data.DB.Save(assignment2)
						require.NoError(t, err)

						assignment3 = &data.QuestAssignment{
							AccountID:   accountID,
							QuestType:   spec3.QuestType,
							Periodicity: spec3.Periodicity,
							Position:    spec3.Position,
							Period:      quests.GetCurrentPeriod(spec3.Periodicity),
							Status:      data.QuestStatusInProgress,
						}
						err = data.DB.Save(assignment3)
						require.NoError(t, err)

						t.Cleanup(func() {
							err := data.DB.QuestsAssignments().Truncate()
							require.NoError(t, err)
						})
					}

					// Skypass stats
					{
						err := data.DB.SkypassSeasonStats().UnsetPremium(accountID, data.CurrentSeason())
						require.NoError(t, err)
					}
				}

				t.Run(periodicity.String(), func(t *testing.T) {
					assigner.EXPECT().RollNew(data.DB.Session, accountID, spec1.Periodicity, spec1.Position, spec1, gomock.Any()).Return(expectedQuest, nil)

					metricsCollector.EXPECT().TrackQuestManualReRoll(assignment1.Periodicity, assignment1.Position, uint16(1))
					analyticsTracker.EXPECT().TrackRerollQuest(gomock.Any(), accountID, gomock.Any())

					_, quest, err := reRoller.ManualReRoll(ctx, data.DB.Session, accountID, assignment1.ID)
					require.NoError(t, err)
					assert.Equal(t, expectedQuest, quest)

					_, quest, err = reRoller.ManualReRoll(ctx, data.DB.Session, accountID, assignment2.ID)
					require.ErrorContains(t, err, "no available re-roll")
					assert.Nil(t, quest)

					err = data.DB.SkypassSeasonStats().SetPremium(accountID, data.CurrentSeason())
					require.NoError(t, err)

					assigner.EXPECT().RollNew(data.DB.Session, accountID, spec2.Periodicity, spec2.Position, spec2, gomock.Any()).Return(expectedQuest, nil)

					metricsCollector.EXPECT().TrackQuestManualReRoll(assignment2.Periodicity, assignment2.Position, uint16(2))
					analyticsTracker.EXPECT().TrackRerollQuest(gomock.Any(), accountID, gomock.Any())

					_, quest, err = reRoller.ManualReRoll(ctx, data.DB.Session, accountID, assignment2.ID)
					require.NoError(t, err)
					assert.Equal(t, expectedQuest, quest)

					_, quest, err = reRoller.ManualReRoll(ctx, data.DB.Session, accountID, assignment3.ID)
					require.ErrorContains(t, err, "no available re-roll")
					assert.Nil(t, quest)
				})
			}
		})

		t.Run("increases amount of re-rolls", func(t *testing.T) {
			var assignment *data.QuestAssignment

			var spec *data.QuestSpec

			// Setup
			{
				// Quest specs
				{
					spec = &data.QuestSpec{
						QuestType:   questType,
						Periodicity: periodicity,
						Position:    position,
						Rerollable:  true,
					}
					err := data.DB.Save(spec)
					require.NoError(t, err)
				}

				// Quest assignments
				{
					assignment = &data.QuestAssignment{
						AccountID:   accountID,
						QuestType:   spec.QuestType,
						Periodicity: spec.Periodicity,
						Position:    spec.Position,
						Period:      currentPeriod,
						Status:      data.QuestStatusInProgress,
						ReRolls:     0,
					}
					err := data.DB.Save(assignment)
					require.NoError(t, err)

					t.Cleanup(func() {
						err := data.DB.QuestsAssignments().Truncate()
						require.NoError(t, err)
					})
				}
			}

			expectedQuest := &proto.Quest{ID: 10}

			assigner.EXPECT().RollNew(data.DB.Session, accountID, spec.Periodicity, spec.Position, spec, gomock.Any()).Return(expectedQuest, nil)

			metricsCollector.EXPECT().TrackQuestManualReRoll(assignment.Periodicity, assignment.Position, uint16(1))
			analyticsTracker.EXPECT().TrackRerollQuest(gomock.Any(), accountID, gomock.Any())

			_, quest, err := reRoller.ManualReRoll(ctx, data.DB.Session, accountID, assignment.ID)
			require.NoError(t, err)
			assert.Equal(t, expectedQuest, quest)

			storedAssignment, err := data.DB.QuestsAssignments().FindOne(db.Cond{"id": assignment.ID})
			require.NoError(t, err)
			require.NotNil(t, storedAssignment)
			assert.Equal(t, 1, int(storedAssignment.ReRolls))
		})
	})
}
