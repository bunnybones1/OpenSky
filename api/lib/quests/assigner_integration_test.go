//go:build integration

package quests_test

import (
	"testing"

	"github.com/0xsequence/go-sequence/lib/prototyp"
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

func TestAssigner(t *testing.T) {
	var accountID proto.AccountID

	var metricsCollector *mock.MockMetricsCollector

	// Setup
	{
		// Accounts
		{
			var err error
			accountID, _, err = apitest.CreateRandomAccount("TestAssigner")
			require.NoError(t, err)
		}

		// Mocks
		{
			ctrl := gomock.NewController(t)

			metricsCollector = mock.NewMockMetricsCollector(ctrl)
		}
	}

	periodicity := proto.QuestPeriodicity_WEEKLY
	currentPeriod := quests.GetCurrentPeriod(periodicity)
	position := data.QuestPositionTwo

	assigner := quests.NewAssigner(metricsCollector)

	t.Run("rolls new quest", func(t *testing.T) {
		t.Run("cannot pick the same epic", func(t *testing.T) {
			var assignment *data.QuestAssignment

			var spec1Epic1, spec3, spec2Epic1 *data.QuestSpec

			// Setup
			{
				// Quest specs
				{
					epicType1 := proto.EpicType(1)
					epicLength := uint16(2)

					spec1Epic1Index := uint16(1)
					spec1Epic1 = &data.QuestSpec{
						QuestType:   proto.QuestType(1),
						EpicType:    &epicType1,
						EpicIndex:   &spec1Epic1Index,
						EpicLength:  &epicLength,
						Periodicity: periodicity,
						Position:    position,
						EndProgress: 1,
					}
					err := data.DB.Save(spec1Epic1)
					require.NoError(t, err)

					spec3 = &data.QuestSpec{
						QuestType:   proto.QuestType(2),
						Periodicity: periodicity,
						Position:    position,
						EndProgress: 1,
					}
					err = data.DB.Save(spec3)
					require.NoError(t, err)

					spec2Epic1Index := uint16(2)
					spec2Epic1 = &data.QuestSpec{
						QuestType:   proto.QuestType(3),
						EpicType:    &epicType1,
						EpicIndex:   &spec2Epic1Index,
						EpicLength:  &epicLength,
						Periodicity: periodicity,
						Position:    position,
						Rerollable:  true,
						EndProgress: 1,
					}
					err = data.DB.Save(spec2Epic1)
					require.NoError(t, err)

					t.Cleanup(func() {
						err := data.DB.QuestsSpecs().Truncate()
						require.NoError(t, err)
					})
				}

				// Quest assignments
				{
					assignment = &data.QuestAssignment{
						AccountID:   accountID,
						QuestType:   spec1Epic1.QuestType,
						Periodicity: spec1Epic1.Periodicity,
						Position:    spec1Epic1.Position,
						Period:      currentPeriod,
						Status:      data.QuestStatusClaimed,
						Active:      true,
					}
					err := data.DB.Save(assignment)
					require.NoError(t, err)

					t.Cleanup(func() {
						err := data.DB.QuestsAssignments().Truncate()
						require.NoError(t, err)
					})
				}
			}

			quest, err := assigner.RollNew(data.DB.Session, accountID, spec1Epic1.Periodicity, spec1Epic1.Position, spec1Epic1, assignment)
			require.NoError(t, err)
			require.NotNil(t, quest)

			require.NotZero(t, quest.ID)
			assert.Equal(t, spec3.QuestType, *quest.QuestType)
			assert.Zero(t, quest.Progress)

			checkNewQuestAssignment(t, accountID, quest.ID)

			assert.False(t, assignment.Active)
			oldAssignment, err := data.DB.QuestsAssignments().FindOne(db.Cond{"id": assignment.ID})
			require.NoError(t, err)
			require.NotNil(t, oldAssignment)
			assert.False(t, oldAssignment.Active)
		})

		t.Run("cannot pick the same quest in the same period", func(t *testing.T) {
			var assignment *data.QuestAssignment

			var spec1, spec2 *data.QuestSpec

			// Setup
			{
				// Quest specs
				{
					spec1 = &data.QuestSpec{
						QuestType:   proto.QuestType(1),
						Periodicity: periodicity,
						Position:    position,
						Rerollable:  true,
						EndProgress: 1,
					}
					err := data.DB.Save(spec1)
					require.NoError(t, err)

					spec2 = &data.QuestSpec{
						QuestType:   proto.QuestType(2),
						Periodicity: periodicity,
						Position:    position,
						EndProgress: 1,
					}
					err = data.DB.Save(spec2)
					require.NoError(t, err)

					t.Cleanup(func() {
						err := data.DB.QuestsSpecs().Truncate()
						require.NoError(t, err)
					})
				}

				// Quest assignments
				{
					assignment = &data.QuestAssignment{
						AccountID:   accountID,
						QuestType:   spec1.QuestType,
						Periodicity: spec1.Periodicity,
						Position:    spec1.Position,
						Period:      currentPeriod,
						Status:      data.QuestStatusClaimed,
						Active:      true,
					}
					err := data.DB.Save(assignment)
					require.NoError(t, err)

					assignment2 := &data.QuestAssignment{
						AccountID:   accountID,
						QuestType:   spec2.QuestType,
						Periodicity: spec2.Periodicity,
						Position:    spec2.Position,
						Period:      currentPeriod - 1,
						Status:      data.QuestStatusFailed,
					}
					err = data.DB.Save(assignment2)
					require.NoError(t, err)

					t.Cleanup(func() {
						err := data.DB.QuestsAssignments().Truncate()
						require.NoError(t, err)
					})
				}
			}

			quest, err := assigner.RollNew(data.DB.Session, accountID, spec1.Periodicity, spec1.Position, spec1, assignment)
			require.NoError(t, err)
			require.NotNil(t, quest)

			require.NotZero(t, quest.ID)
			assert.Equal(t, spec2.QuestType, *quest.QuestType)
			assert.Zero(t, quest.Progress)

			checkNewQuestAssignment(t, accountID, quest.ID)

			assert.False(t, assignment.Active)
			oldAssignment, err := data.DB.QuestsAssignments().FindOne(db.Cond{"id": assignment.ID})
			require.NoError(t, err)
			require.NotNil(t, oldAssignment)
			assert.False(t, oldAssignment.Active)
		})

		t.Run("can pick the same quest as the last period when there are no other quests", func(t *testing.T) {
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
						EndProgress: 1,
					}
					err := data.DB.Save(spec)
					require.NoError(t, err)

					t.Cleanup(func() {
						err := data.DB.QuestsSpecs().Truncate()
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
						Status:      data.QuestStatusFailed,
						Active:      true,
					}
					err := data.DB.Save(assignment)
					require.NoError(t, err)

					t.Cleanup(func() {
						err := data.DB.QuestsAssignments().Truncate()
						require.NoError(t, err)
					})
				}
			}

			quest, err := assigner.RollNew(data.DB.Session, accountID, periodicity, position, spec, assignment)
			require.NoError(t, err)
			require.NotNil(t, quest)

			require.NotZero(t, quest.ID)
			assert.NotEqual(t, assignment.ID, quest.ID)
			assert.Equal(t, spec.QuestType, *quest.QuestType)
			assert.Zero(t, quest.Progress)

			checkNewQuestAssignment(t, accountID, quest.ID)

			assert.False(t, assignment.Active)
			oldAssignment, err := data.DB.QuestsAssignments().FindOne(db.Cond{"id": assignment.ID})
			require.NoError(t, err)
			require.NotNil(t, oldAssignment)
			assert.False(t, oldAssignment.Active)
		})

		t.Run("does not pick any quest when all quests have been assigned current period already", func(t *testing.T) {
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
					}
					err := data.DB.Save(spec)
					require.NoError(t, err)

					t.Cleanup(func() {
						err := data.DB.QuestsSpecs().Truncate()
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
						Status:      data.QuestStatusFailed,
						Active:      true,
					}
					err := data.DB.Save(assignment)
					require.NoError(t, err)

					t.Cleanup(func() {
						err := data.DB.QuestsAssignments().Truncate()
						require.NoError(t, err)
					})
				}
			}

			quest, err := assigner.RollNew(data.DB.Session, accountID, periodicity, position, spec, assignment)
			require.NoError(t, err)
			require.Nil(t, quest)

			assert.False(t, assignment.Active)
		})

		t.Run("can pick epic with index 1 only", func(t *testing.T) {
			var assignment *data.QuestAssignment

			var spec1, spec2, spec3 *data.QuestSpec

			// Setup
			{
				// Quest specs
				{
					epicType1 := proto.EpicType(1)
					epicLength := uint16(3)

					spec1 = &data.QuestSpec{
						QuestType:   proto.QuestType(1),
						Periodicity: periodicity,
						Position:    position,
						Rerollable:  true,
						EndProgress: 1,
					}
					err := data.DB.Save(spec1)
					require.NoError(t, err)

					index1 := uint16(1)
					spec2 = &data.QuestSpec{
						QuestType:   proto.QuestType(2),
						EpicType:    &epicType1,
						EpicIndex:   &index1,
						EpicLength:  &epicLength,
						Periodicity: periodicity,
						Position:    position,
						EndProgress: 1,
					}
					err = data.DB.Save(spec2)
					require.NoError(t, err)

					index2 := uint16(2)
					spec3 = &data.QuestSpec{
						QuestType:   proto.QuestType(3),
						EpicType:    &epicType1,
						EpicIndex:   &index2,
						EpicLength:  &epicLength,
						Periodicity: periodicity,
						Position:    position,
						EndProgress: 1,
					}
					err = data.DB.Save(spec3)
					require.NoError(t, err)

					t.Cleanup(func() {
						err := data.DB.QuestsSpecs().Truncate()
						require.NoError(t, err)
					})
				}

				// Quest assignments
				{
					assignment = &data.QuestAssignment{
						AccountID:   accountID,
						QuestType:   spec1.QuestType,
						Periodicity: spec1.Periodicity,
						Position:    spec1.Position,
						Period:      currentPeriod,
						Status:      data.QuestStatusClaimed,
						Active:      true,
					}
					err := data.DB.Save(assignment)
					require.NoError(t, err)

					t.Cleanup(func() {
						err := data.DB.QuestsAssignments().Truncate()
						require.NoError(t, err)
					})
				}
			}

			quest, err := assigner.RollNew(data.DB.Session, accountID, spec1.Periodicity, spec1.Position, spec1, assignment)
			require.NoError(t, err)
			require.NotNil(t, quest)

			require.NotZero(t, quest.ID)
			assert.Equal(t, spec2.QuestType, *quest.QuestType)
			assert.Zero(t, quest.Progress)

			checkNewQuestAssignment(t, accountID, quest.ID)
			assert.True(t, quest.IsNew)

			assert.False(t, assignment.Active)
			oldAssignment, err := data.DB.QuestsAssignments().FindOne(db.Cond{"id": assignment.ID})
			require.NoError(t, err)
			require.NotNil(t, oldAssignment)
			assert.False(t, oldAssignment.Active)
		})

		t.Run("sets the same amount of re-rolls as other quests in the same period and periodicity", func(t *testing.T) {
			var assignment *data.QuestAssignment

			var spec1, spec2 *data.QuestSpec

			// Setup
			{
				// Quest specs
				{
					spec1 = &data.QuestSpec{
						QuestType:   proto.QuestType(1),
						Periodicity: periodicity,
						Position:    data.QuestPositionOne,
						EndProgress: 1,
					}
					err := data.DB.Save(spec1)
					require.NoError(t, err)

					spec2 = &data.QuestSpec{
						QuestType:   proto.QuestType(2),
						Periodicity: periodicity,
						Position:    data.QuestPositionTwo,
						EndProgress: 1,
					}
					err = data.DB.Save(spec2)
					require.NoError(t, err)

					t.Cleanup(func() {
						err := data.DB.QuestsSpecs().Truncate()
						require.NoError(t, err)
					})
				}

				// Quest assignments
				{
					assignment = &data.QuestAssignment{
						AccountID:   accountID,
						QuestType:   spec1.QuestType,
						Periodicity: spec1.Periodicity,
						Position:    spec1.Position,
						Period:      currentPeriod,
						Status:      data.QuestStatusClaimed,
						Active:      true,
						ReRolls:     3,
					}
					err := data.DB.Save(assignment)
					require.NoError(t, err)

					t.Cleanup(func() {
						err := data.DB.QuestsAssignments().Truncate()
						require.NoError(t, err)
					})
				}
			}

			quest, err := assigner.RollNew(data.DB.Session, accountID, periodicity, data.QuestPositionTwo, spec1, assignment)
			require.NoError(t, err)
			require.NotNil(t, quest)

			require.NotZero(t, quest.ID)
			assert.Equal(t, spec2.QuestType, *quest.QuestType)
			assert.Zero(t, quest.Progress)

			newAssignment, err := data.DB.QuestsAssignments().FindOne(db.Cond{"id": quest.ID})
			require.NoError(t, err)
			require.NotNil(t, newAssignment)
			assert.Equal(t, assignment.ReRolls, newAssignment.ReRolls)
			assert.Equal(t, spec2.Periodicity, newAssignment.Periodicity)
			assert.Equal(t, spec2.Position, newAssignment.Position)
			assert.True(t, newAssignment.IsNew)

			checkNewQuestAssignment(t, accountID, quest.ID)

			assert.False(t, assignment.Active)
			oldAssignment, err := data.DB.QuestsAssignments().FindOne(db.Cond{"id": assignment.ID})
			require.NoError(t, err)
			require.NotNil(t, oldAssignment)
			assert.False(t, oldAssignment.Active)
		})

		t.Run("fails when there is another quest with the same periodicity and period and position in progress", func(t *testing.T) {
			var assignment *data.QuestAssignment

			// Setup
			{
				var spec *data.QuestSpec

				// Quest specs
				{
					spec = &data.QuestSpec{
						QuestType:   proto.QuestType(1),
						Periodicity: periodicity,
						Position:    position,
					}
					err := data.DB.Save(spec)
					require.NoError(t, err)

					t.Cleanup(func() {
						err := data.DB.QuestsSpecs().Truncate()
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
						Status:      data.QuestStatusInProgress,
						Active:      true,
					}
					err := data.DB.Save(assignment)
					require.NoError(t, err)

					t.Cleanup(func() {
						err := data.DB.QuestsAssignments().Truncate()
						require.NoError(t, err)
					})
				}
			}

			quest, err := assigner.RollNew(data.DB.Session, accountID, periodicity, position, nil, nil)
			require.ErrorContains(t, err, "the position already has a quest")
			require.Nil(t, quest)

			assert.True(t, assignment.Active)
		})

		t.Run("checks requirements", func(t *testing.T) {
			t.Run("hero", func(t *testing.T) {
				hero := proto.Hero_SAMYA

				var spec *data.QuestSpec

				// Setup
				{
					// Quest specs
					{
						spec = &data.QuestSpec{
							QuestType:    proto.QuestType(1),
							Periodicity:  periodicity,
							Position:     position,
							RequiredHero: &hero,
							EndProgress:  1,
						}
						err := data.DB.Save(spec)
						require.NoError(t, err)

						t.Cleanup(func() {
							err := data.DB.QuestsSpecs().Truncate()
							require.NoError(t, err)
						})
					}
				}

				t.Run("cannot roll the quest when the hero is not owned", func(t *testing.T) {
					quest, err := assigner.RollNew(data.DB.Session, accountID, periodicity, position, nil, nil)
					require.NoError(t, err)
					require.Nil(t, quest)
				})

				t.Run("can roll the quest when the hero is owned", func(t *testing.T) {
					// Setup
					{
						// Items
						{
							item := &data.Item{Item: &proto.Item{
								AccountID: accountID,
								ItemType:  proto.ItemType_SW_HERO,
								TokenID:   uint64(hero),
								Balance:   prototyp.NewBigInt(1),
							}}
							err := data.DB.Save(item)
							require.NoError(t, err)

							t.Cleanup(func() {
								err := data.DB.Items().Find(db.Cond{"account_id": accountID, "item_type": proto.ItemType_SW_HERO}).Delete()
								require.NoError(t, err)
							})
						}

						// Quest assignments
						{
							t.Cleanup(func() {
								err := data.DB.QuestsAssignments().Truncate()
								require.NoError(t, err)
							})
						}
					}

					quest, err := assigner.RollNew(data.DB.Session, accountID, periodicity, position, nil, nil)
					require.NoError(t, err)
					require.NotNil(t, quest)

					require.NotZero(t, quest.ID)
					assert.Equal(t, spec.QuestType, *quest.QuestType)
					assert.Zero(t, quest.Progress)

					checkNewQuestAssignment(t, accountID, quest.ID)
				})
			})

			t.Run("cards", func(t *testing.T) {
				card1ID := uint64(11)
				card2ID := uint64(12)
				card3ID := uint64(13)

				var spec *data.QuestSpec

				// Setup
				{
					// Quest specs
					{
						spec = &data.QuestSpec{
							QuestType:     proto.QuestType(1),
							Periodicity:   periodicity,
							Position:      position,
							RequiredCards: []uint64{card1ID, card2ID, card3ID},
							EndProgress:   1,
						}
						err := data.DB.Save(spec)
						require.NoError(t, err)

						t.Cleanup(func() {
							err := data.DB.QuestsSpecs().Truncate()
							require.NoError(t, err)
						})
					}
				}

				t.Run("cannot roll the quest when either of cards is not owned", func(t *testing.T) {
					// Setup
					{
						// Items
						{
							item := &data.Item{Item: &proto.Item{
								AccountID: accountID,
								ItemType:  proto.ItemType_SW_BASE_CARDS,
								TokenID:   card1ID,
								Balance:   prototyp.NewBigInt(1),
							}}
							err := data.DB.Save(item)
							require.NoError(t, err)

							t.Cleanup(func() {
								err := data.DB.Items().Find(db.Cond{"account_id": accountID}).Delete()
								require.NoError(t, err)
							})
						}
					}

					quest, err := assigner.RollNew(data.DB.Session, accountID, periodicity, position, nil, nil)
					require.NoError(t, err)
					require.Nil(t, quest)
				})

				t.Run("can roll the quest when all cards are owned", func(t *testing.T) {
					// Setup
					{
						// Items
						{
							item := &data.Item{Item: &proto.Item{
								AccountID: accountID,
								ItemType:  proto.ItemType_SW_BASE_CARDS,
								TokenID:   card1ID,
								Balance:   prototyp.NewBigInt(1),
							}}
							err := data.DB.Save(item)
							require.NoError(t, err)

							item = &data.Item{Item: &proto.Item{
								AccountID: accountID,
								ItemType:  proto.ItemType_SW_SILVER_CARDS,
								TokenID:   card2ID,
								Balance:   prototyp.NewBigInt(1),
							}}
							err = data.DB.Save(item)
							require.NoError(t, err)

							item = &data.Item{Item: &proto.Item{
								AccountID: accountID,
								ItemType:  proto.ItemType_SW_GOLD_CARDS,
								TokenID:   card3ID,
								Balance:   prototyp.NewBigInt(1),
							}}
							err = data.DB.Save(item)
							require.NoError(t, err)

							t.Cleanup(func() {
								err := data.DB.Items().Find(db.Cond{"account_id": accountID}).Delete()
								require.NoError(t, err)
							})
						}

						// Quest assignments
						{
							t.Cleanup(func() {
								err := data.DB.QuestsAssignments().Truncate()
								require.NoError(t, err)
							})
						}
					}

					quest, err := assigner.RollNew(data.DB.Session, accountID, periodicity, position, nil, nil)
					require.NoError(t, err)
					require.NotNil(t, quest)

					require.NotZero(t, quest.ID)
					assert.Equal(t, spec.QuestType, *quest.QuestType)
					assert.Zero(t, quest.Progress)

					checkNewQuestAssignment(t, accountID, quest.ID)
				})
			})

			t.Run("minimal level", func(t *testing.T) {
				minimalLevel := uint16(10)

				var spec *data.QuestSpec

				// Setup
				{
					// Quest specs
					{
						spec = &data.QuestSpec{
							QuestType:        proto.QuestType(1),
							Periodicity:      periodicity,
							Position:         position,
							RequiredMinLevel: &minimalLevel,
							EndProgress:      1,
						}
						err := data.DB.Save(spec)
						require.NoError(t, err)

						t.Cleanup(func() {
							err := data.DB.QuestsSpecs().Truncate()
							require.NoError(t, err)
						})
					}
				}

				t.Run("cannot roll the quest when the account level is lower than minimal level", func(t *testing.T) {
					// Setup
					{
						// Accounts
						{
							account, err := data.DB.Accounts().FindByID(accountID)
							require.NoError(t, err)

							account.Level = minimalLevel - 1

							err = data.DB.Save(account)
							require.NoError(t, err)
						}
					}

					quest, err := assigner.RollNew(data.DB.Session, accountID, periodicity, position, nil, nil)
					require.NoError(t, err)
					require.Nil(t, quest)
				})

				t.Run("can roll the quest when the account level is equal to minimal level", func(t *testing.T) {
					// Setup
					{
						// Accounts
						{
							account, err := data.DB.Accounts().FindByID(accountID)
							require.NoError(t, err)

							account.Level = minimalLevel

							err = data.DB.Save(account)
							require.NoError(t, err)
						}

						// Quest assignments
						{
							t.Cleanup(func() {
								err := data.DB.QuestsAssignments().Truncate()
								require.NoError(t, err)
							})
						}
					}

					quest, err := assigner.RollNew(data.DB.Session, accountID, periodicity, position, nil, nil)
					require.NoError(t, err)
					require.NotNil(t, quest)

					require.NotZero(t, quest.ID)
					assert.Equal(t, spec.QuestType, *quest.QuestType)
					assert.Zero(t, quest.Progress)

					checkNewQuestAssignment(t, accountID, quest.ID)
				})

				t.Run("can roll the quest when the account level is higher than minimal level", func(t *testing.T) {
					// Setup
					{
						// Accounts
						{
							account, err := data.DB.Accounts().FindByID(accountID)
							require.NoError(t, err)

							account.Level = minimalLevel + 1

							err = data.DB.Save(account)
							require.NoError(t, err)
						}

						// Quest assignments
						{
							t.Cleanup(func() {
								err := data.DB.QuestsAssignments().Truncate()
								require.NoError(t, err)
							})
						}
					}

					quest, err := assigner.RollNew(data.DB.Session, accountID, periodicity, position, nil, nil)
					require.NoError(t, err)
					require.NotNil(t, quest)

					require.NotZero(t, quest.ID)
					assert.Equal(t, spec.QuestType, *quest.QuestType)
					assert.Zero(t, quest.Progress)

					checkNewQuestAssignment(t, accountID, quest.ID)
				})
			})

			t.Run("maximal level", func(t *testing.T) {
				maximalLevel := uint16(10)

				var spec *data.QuestSpec

				// Setup
				{
					// Quest specs
					{
						spec = &data.QuestSpec{
							QuestType:        proto.QuestType(1),
							Periodicity:      periodicity,
							Position:         position,
							RequiredMaxLevel: &maximalLevel,
							EndProgress:      1,
						}
						err := data.DB.Save(spec)
						require.NoError(t, err)

						t.Cleanup(func() {
							err := data.DB.QuestsSpecs().Truncate()
							require.NoError(t, err)
						})
					}
				}

				t.Run("cannot roll the quest when the account level is higher than maximal level", func(t *testing.T) {
					// Setup
					{
						// Accounts
						{
							account, err := data.DB.Accounts().FindByID(accountID)
							require.NoError(t, err)

							account.Level = maximalLevel + 1

							err = data.DB.Save(account)
							require.NoError(t, err)
						}
					}

					quest, err := assigner.RollNew(data.DB.Session, accountID, periodicity, position, nil, nil)
					require.NoError(t, err)
					require.Nil(t, quest)
				})

				t.Run("can roll the quest when the account level is equal to minimal level", func(t *testing.T) {
					// Setup
					{
						// Accounts
						{
							account, err := data.DB.Accounts().FindByID(accountID)
							require.NoError(t, err)

							account.Level = maximalLevel

							err = data.DB.Save(account)
							require.NoError(t, err)
						}

						// Quest assignments
						{
							t.Cleanup(func() {
								err := data.DB.QuestsAssignments().Truncate()
								require.NoError(t, err)
							})
						}
					}

					quest, err := assigner.RollNew(data.DB.Session, accountID, periodicity, position, nil, nil)
					require.NoError(t, err)
					require.NotNil(t, quest)

					require.NotZero(t, quest.ID)
					assert.Equal(t, spec.QuestType, *quest.QuestType)
					assert.Zero(t, quest.Progress)

					checkNewQuestAssignment(t, accountID, quest.ID)
				})

				t.Run("can roll the quest when the account level is lower than maximal level", func(t *testing.T) {
					// Setup
					{
						// Accounts
						{
							account, err := data.DB.Accounts().FindByID(accountID)
							require.NoError(t, err)

							account.Level = maximalLevel - 1

							err = data.DB.Save(account)
							require.NoError(t, err)
						}

						// Quest assignments
						{
							t.Cleanup(func() {
								err := data.DB.QuestsAssignments().Truncate()
								require.NoError(t, err)
							})
						}
					}

					quest, err := assigner.RollNew(data.DB.Session, accountID, periodicity, position, nil, nil)
					require.NoError(t, err)
					require.NotNil(t, quest)

					require.NotZero(t, quest.ID)
					assert.Equal(t, spec.QuestType, *quest.QuestType)
					assert.Zero(t, quest.Progress)

					checkNewQuestAssignment(t, accountID, quest.ID)
				})
			})

			t.Run("checks all quests in the epic", func(t *testing.T) {
				hero1 := proto.Hero_SAMYA
				hero2 := proto.Hero_BOURAN

				var spec1 *data.QuestSpec

				// Setup
				{
					// Items
					{
						item := &data.Item{Item: &proto.Item{
							AccountID: accountID,
							ItemType:  proto.ItemType_SW_HERO,
							TokenID:   uint64(hero1),
							Balance:   prototyp.NewBigInt(1),
						}}
						err := data.DB.Save(item)
						require.NoError(t, err)

						t.Cleanup(func() {
							err := data.DB.Items().Find(db.Cond{"account_id": accountID, "item_type": proto.ItemType_SW_HERO}).Delete()
							require.NoError(t, err)
						})
					}

					// Quest specs
					{
						epicType := proto.EpicType(1)
						epicLength := uint16(2)

						index1 := uint16(1)
						spec1 = &data.QuestSpec{
							QuestType:    proto.QuestType(1),
							Periodicity:  periodicity,
							Position:     position,
							EpicType:     &epicType,
							EpicLength:   &epicLength,
							EpicIndex:    &index1,
							RequiredHero: &hero1,
							EndProgress:  1,
						}
						err := data.DB.Save(spec1)
						require.NoError(t, err)

						index2 := uint16(2)
						spec2 := &data.QuestSpec{
							QuestType:    proto.QuestType(2),
							Periodicity:  periodicity,
							Position:     position,
							EpicType:     &epicType,
							EpicLength:   &epicLength,
							EpicIndex:    &index2,
							RequiredHero: &hero2,
							EndProgress:  1,
						}
						err = data.DB.Save(spec2)
						require.NoError(t, err)

						t.Cleanup(func() {
							err := data.DB.QuestsSpecs().Truncate()
							require.NoError(t, err)
						})
					}
				}

				t.Run("cannot roll the epic quest when not all epic quests meet requirements", func(t *testing.T) {
					quest, err := assigner.RollNew(data.DB.Session, accountID, periodicity, position, nil, nil)
					require.NoError(t, err)
					require.Nil(t, quest)
				})

				t.Run("can roll the quest when all epic quests meet requirements", func(t *testing.T) {
					// Setup
					{
						// Items
						{
							item := &data.Item{Item: &proto.Item{
								AccountID: accountID,
								ItemType:  proto.ItemType_SW_HERO,
								TokenID:   uint64(hero2),
								Balance:   prototyp.NewBigInt(1),
							}}
							err := data.DB.Save(item)
							require.NoError(t, err)
						}

						// Quest assignments
						{
							t.Cleanup(func() {
								err := data.DB.QuestsAssignments().Truncate()
								require.NoError(t, err)
							})
						}
					}

					quest, err := assigner.RollNew(data.DB.Session, accountID, periodicity, position, nil, nil)
					require.NoError(t, err)
					require.NotNil(t, quest)

					require.NotZero(t, quest.ID)
					assert.Equal(t, spec1.QuestType, *quest.QuestType)
					assert.Zero(t, quest.Progress)

					checkNewQuestAssignment(t, accountID, quest.ID)
				})
			})
		})

		t.Run("can have pre-set progress", func(t *testing.T) {
			tests := []struct {
				desc             string
				startProgress    uint16
				endProgress      uint16
				expectedStatus   data.QuestStatus
				expectedProgress uint16
			}{
				{
					desc:             "is in progress when start progress is less than end progress",
					startProgress:    5,
					endProgress:      10,
					expectedStatus:   data.QuestStatusInProgress,
					expectedProgress: 5,
				},
				{
					desc:             "is completed when start progress is equal or higher than end progress",
					startProgress:    11,
					endProgress:      10,
					expectedStatus:   data.QuestStatusCompleted,
					expectedProgress: 10,
				},
			}

			for _, tt := range tests {
				t.Run(tt.desc, func(t *testing.T) {
					var spec *data.QuestSpec

					// Setup
					{
						spec = &data.QuestSpec{
							QuestType:     proto.QuestType(1),
							Periodicity:   periodicity,
							Position:      position,
							StartProgress: tt.startProgress,
							EndProgress:   tt.endProgress,
						}
						err := data.DB.Save(spec)
						require.NoError(t, err)

						t.Cleanup(func() {
							err := data.DB.QuestsSpecs().Truncate()
							require.NoError(t, err)
							err = data.DB.QuestsAssignments().Truncate()
							require.NoError(t, err)
						})
					}

					quest, err := assigner.RollNew(data.DB.Session, accountID, periodicity, position, nil, nil)
					require.NoError(t, err)
					require.NotNil(t, quest)

					assignment, err := data.DB.QuestsAssignments().FindOne(db.Cond{"id": quest.ID})
					require.NoError(t, err)
					assert.Equal(t, tt.expectedStatus, assignment.Status)
					assert.Equal(t, tt.expectedProgress, assignment.Progress)
				})
			}
		})
	})

	t.Run("move up in epic", func(t *testing.T) {
		t.Run("fails when it is not epic", func(t *testing.T) {
			spec := &data.QuestSpec{
				QuestType:   proto.QuestType(1),
				Periodicity: periodicity,
				Position:    position,
			}

			assignment := &data.QuestAssignment{
				AccountID: accountID,
				QuestType: spec.QuestType,
				Period:    currentPeriod,
				Status:    data.QuestStatusClaimed,
				Active:    true,
			}

			quest, err := assigner.MoveUpInEpic(data.DB.Session, spec, assignment)
			require.ErrorContains(t, err, "it is not epic")
			require.Nil(t, quest)

			assert.True(t, assignment.Active)
		})

		t.Run("fails when it is the last epic quest", func(t *testing.T) {
			epicType := proto.EpicType(1)
			epicIndex := uint16(2)
			epicLength := uint16(2)

			spec := &data.QuestSpec{
				QuestType:   proto.QuestType(1),
				EpicType:    &epicType,
				EpicIndex:   &epicIndex,
				EpicLength:  &epicLength,
				Periodicity: periodicity,
				Position:    position,
			}

			assignment := &data.QuestAssignment{
				AccountID: accountID,
				QuestType: spec.QuestType,
				Period:    currentPeriod,
				Status:    data.QuestStatusClaimed,
				Active:    true,
			}

			quest, err := assigner.MoveUpInEpic(data.DB.Session, spec, assignment)
			require.ErrorContains(t, err, "epic does not have more quests")
			require.Nil(t, quest)

			assert.True(t, assignment.Active)
		})

		t.Run("moves up to the next quest in the epic", func(t *testing.T) {
			var assignment *data.QuestAssignment

			var spec1, spec2 *data.QuestSpec

			// Setup
			{
				// Quest specs
				{
					epicType := proto.EpicType(1)
					epicLength := uint16(2)

					spec1EpicIndex := uint16(1)
					spec1 = &data.QuestSpec{
						QuestType:   proto.QuestType(1),
						EpicType:    &epicType,
						EpicIndex:   &spec1EpicIndex,
						EpicLength:  &epicLength,
						Periodicity: periodicity,
						Position:    position,
						EndProgress: 1,
					}
					err := data.DB.Save(spec1)
					require.NoError(t, err)

					spec2EpicIndex := uint16(2)
					spec2 = &data.QuestSpec{
						QuestType:   proto.QuestType(3),
						EpicType:    &epicType,
						EpicIndex:   &spec2EpicIndex,
						EpicLength:  &epicLength,
						Periodicity: periodicity,
						Position:    position,
						Rerollable:  true,
						EndProgress: 1,
					}
					err = data.DB.Save(spec2)
					require.NoError(t, err)

					t.Cleanup(func() {
						err := data.DB.QuestsSpecs().Truncate()
						require.NoError(t, err)
					})
				}

				// Quest assignments
				{
					assignment = &data.QuestAssignment{
						AccountID:   accountID,
						QuestType:   spec1.QuestType,
						Periodicity: spec1.Periodicity,
						Position:    spec1.Position,
						Period:      currentPeriod,
						ReRolls:     3,
						Status:      data.QuestStatusClaimed,
						Active:      true,
					}
					err := data.DB.Save(assignment)
					require.NoError(t, err)

					t.Cleanup(func() {
						err := data.DB.QuestsAssignments().Truncate()
						require.NoError(t, err)
					})
				}
			}

			metricsCollector.EXPECT().TrackQuestMoveUpInEpic(assignment.Periodicity, assignment.Position)

			quest, err := assigner.MoveUpInEpic(data.DB.Session, spec1, assignment)
			require.NoError(t, err)
			require.NotNil(t, quest)

			require.NotZero(t, quest.ID)
			assert.Equal(t, spec2.QuestType, *quest.QuestType)
			assert.Zero(t, quest.Progress)

			newAssignment, err := data.DB.QuestsAssignments().FindOne(db.Cond{"id": quest.ID})
			require.NoError(t, err)
			assert.Equal(t, assignment.ReRolls, newAssignment.ReRolls)
			assert.Equal(t, spec1.Periodicity, newAssignment.Periodicity)
			assert.Equal(t, spec1.Position, newAssignment.Position)
			assert.True(t, newAssignment.IsNew)

			checkNewQuestAssignment(t, accountID, quest.ID)

			assert.False(t, assignment.Active)
			oldAssignment, err := data.DB.QuestsAssignments().FindOne(db.Cond{"id": assignment.ID})
			require.NoError(t, err)
			require.NotNil(t, oldAssignment)
			assert.False(t, oldAssignment.Active)
		})

		t.Run("can have pre-set progress", func(t *testing.T) {
			var spec1 *data.QuestSpec

			epicType := proto.EpicType(1)
			epicLength := uint16(2)

			// Setup
			{
				// Quest specs
				{
					spec1EpicIndex := uint16(1)
					spec1 = &data.QuestSpec{
						QuestType:   proto.QuestType(1),
						EpicType:    &epicType,
						EpicIndex:   &spec1EpicIndex,
						EpicLength:  &epicLength,
						Periodicity: periodicity,
						Position:    position,
						EndProgress: 1,
					}
					err := data.DB.Save(spec1)
					require.NoError(t, err)

					t.Cleanup(func() {
						err := data.DB.QuestsSpecs().Truncate()
						require.NoError(t, err)
					})
				}
			}

			tests := []struct {
				desc             string
				startProgress    uint16
				endProgress      uint16
				expectedStatus   data.QuestStatus
				expectedProgress uint16
			}{
				{
					desc:             "is in progress when start progress is less than end progress",
					startProgress:    5,
					endProgress:      10,
					expectedStatus:   data.QuestStatusInProgress,
					expectedProgress: 5,
				},
				{
					desc:             "is completed when start progress is equal or higher than end progress",
					startProgress:    11,
					endProgress:      10,
					expectedStatus:   data.QuestStatusCompleted,
					expectedProgress: 10,
				},
			}

			for _, tt := range tests {
				t.Run(tt.desc, func(t *testing.T) {
					var assignment *data.QuestAssignment

					var spec2 *data.QuestSpec

					// Setup
					{
						// Quest specs
						{
							spec2EpicIndex := uint16(2)
							spec2 = &data.QuestSpec{
								QuestType:     proto.QuestType(3),
								EpicType:      &epicType,
								EpicIndex:     &spec2EpicIndex,
								EpicLength:    &epicLength,
								Periodicity:   periodicity,
								Position:      position,
								Rerollable:    true,
								StartProgress: tt.startProgress,
								EndProgress:   tt.endProgress,
							}
							err := data.DB.Save(spec2)
							require.NoError(t, err)

							t.Cleanup(func() {
								err := data.DB.QuestsSpecs().Find(db.Cond{"quest_type": spec2.QuestType}).Delete()
								require.NoError(t, err)
							})
						}

						// Quest assignments
						{
							assignment = &data.QuestAssignment{
								AccountID:   accountID,
								QuestType:   spec1.QuestType,
								Periodicity: spec1.Periodicity,
								Position:    spec1.Position,
								Period:      currentPeriod,
								ReRolls:     3,
								Status:      data.QuestStatusClaimed,
								Active:      true,
							}
							err := data.DB.Save(assignment)
							require.NoError(t, err)

							t.Cleanup(func() {
								err := data.DB.QuestsAssignments().Truncate()
								require.NoError(t, err)
							})
						}
					}

					metricsCollector.EXPECT().TrackQuestMoveUpInEpic(assignment.Periodicity, assignment.Position)

					quest, err := assigner.MoveUpInEpic(data.DB.Session, spec1, assignment)
					require.NoError(t, err)
					require.NotNil(t, quest)

					newAssignment, err := data.DB.QuestsAssignments().FindOne(db.Cond{"id": quest.ID})
					require.NoError(t, err)
					assert.Equal(t, tt.expectedStatus, newAssignment.Status)
					assert.Equal(t, tt.expectedProgress, newAssignment.Progress)
				})
			}
		})
	})

	t.Run("copy to current period", func(t *testing.T) {
		var assignment1, assignment2 *data.QuestAssignment

		var spec1, spec2 *data.QuestSpec

		// Setup
		{
			// Quest specs
			{
				spec1 = &data.QuestSpec{
					QuestType:   proto.QuestType(1),
					Periodicity: periodicity,
					Position:    data.QuestPositionOne,
				}
				err := data.DB.Save(spec1)
				require.NoError(t, err)

				spec2 = &data.QuestSpec{
					QuestType:   proto.QuestType(2),
					Periodicity: periodicity,
					Position:    data.QuestPositionTwo,
				}
				err = data.DB.Save(spec2)
				require.NoError(t, err)

				t.Cleanup(func() {
					err := data.DB.QuestsSpecs().Truncate()
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
					Period:      currentPeriod - 1,
					ReRolls:     3,
					Status:      data.QuestStatusInProgress,
					Active:      true,
				}
				err := data.DB.Save(assignment1)
				require.NoError(t, err)

				assignment2 = &data.QuestAssignment{
					AccountID:   accountID,
					QuestType:   spec2.QuestType,
					Periodicity: spec2.Periodicity,
					Position:    spec2.Position,
					Period:      currentPeriod,
					ReRolls:     1,
					Status:      data.QuestStatusInProgress,
					Active:      true,
				}
				err = data.DB.Save(assignment2)
				require.NoError(t, err)

				t.Cleanup(func() {
					err := data.DB.QuestsAssignments().Truncate()
					require.NoError(t, err)
				})
			}
		}

		assignment1.IsNew = false

		metricsCollector.EXPECT().TrackQuestCopyToCurrentPeriod(assignment1.Periodicity, assignment1.Position)

		quest, err := assigner.CopyToCurrentPeriod(data.DB.Session, spec1, assignment1)
		require.NoError(t, err)
		require.NotNil(t, quest)

		require.NotZero(t, quest.ID)
		assert.Equal(t, spec1.QuestType, *quest.QuestType)
		assert.Zero(t, quest.Progress)
		assert.False(t, quest.IsNew)

		newAssignment, err := data.DB.QuestsAssignments().FindOne(db.Cond{"id": quest.ID})
		require.NoError(t, err)
		assert.Equal(t, assignment2.ReRolls, newAssignment.ReRolls)
		assert.Equal(t, currentPeriod, newAssignment.Period)
		assert.Equal(t, assignment1.Progress, newAssignment.Progress)
		assert.Equal(t, spec1.Periodicity, newAssignment.Periodicity)
		assert.Equal(t, spec1.Position, newAssignment.Position)
		assert.Equal(t, currentPeriod, newAssignment.Period)
		assert.True(t, newAssignment.Active)
		assert.False(t, newAssignment.IsNew)

		oldAssignment, err := data.DB.QuestsAssignments().FindOne(db.Cond{"id": assignment1.ID})
		require.NoError(t, err)
		assert.Equal(t, data.QuestStatusFailed, oldAssignment.Status)
		assert.False(t, oldAssignment.Active)

		checkNewQuestAssignment(t, accountID, quest.ID)
	})
}

func checkNewQuestAssignment(t *testing.T, accountID proto.AccountID, id uint64) {
	require.NotZero(t, id)

	assignment, err := data.DB.QuestsAssignments().FindOne(db.Cond{"id": id})
	require.NoError(t, err)
	require.NotNil(t, assignment)

	assert.Equal(t, accountID, assignment.AccountID)
	assert.Equal(t, data.QuestStatusInProgress, assignment.Status)
	assert.True(t, assignment.Active)
	assert.Zero(t, assignment.Progress)
	assert.Nil(t, assignment.ClaimedAt)
	assert.Empty(t, assignment.Rewards)
}
