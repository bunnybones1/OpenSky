//go:build integration

package data_test

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/upper/db/v4"

	"github.com/horizon-games/OpenSky/api/apitest"
	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/proto"
)

func TestQuestsAssignmentsStore(t *testing.T) {
	accountID := apitest.RandomAccountID()

	t.Run("find one", func(t *testing.T) {
		t.Run("finds when exists", func(t *testing.T) {
			var assignment *data.QuestAssignment

			// Setup
			{
				assignment = &data.QuestAssignment{
					AccountID:   accountID,
					QuestType:   proto.QuestType(1),
					Periodicity: proto.QuestPeriodicity_DAILY,
					Position:    data.QuestPositionTwo,
					Period:      1,
					Status:      data.QuestStatusInProgress,
				}

				err := data.DB.Save(assignment)
				require.NoError(t, err)

				t.Cleanup(func() {
					err := data.DB.QuestsAssignments().Find(db.Cond{"account_id": accountID}).Delete()
					require.NoError(t, err)
				})
			}

			result, err := data.DB.QuestsAssignments().FindOne(db.Cond{"id": assignment.ID})
			require.NoError(t, err)
			assert.Equal(t, assignment, result)
		})

		t.Run("does not find when does not exist", func(t *testing.T) {
			result, err := data.DB.QuestsAssignments().FindOne(db.Cond{"id": 999})
			require.ErrorIs(t, err, db.ErrNoMoreRows)
			assert.Nil(t, result)
		})
	})

	t.Run("find active", func(t *testing.T) {
		t.Run("finds when exists", func(t *testing.T) {
			var assignment1, assignment2, assignment3 *data.QuestAssignment

			// Setup
			{
				assignment1 = &data.QuestAssignment{
					AccountID:   accountID,
					QuestType:   proto.QuestType(1),
					Periodicity: proto.QuestPeriodicity_DAILY,
					Position:    data.QuestPositionOne,
					Period:      1,
					Status:      data.QuestStatusInProgress,
					Active:      true,
				}
				err := data.DB.Save(assignment1)
				require.NoError(t, err)

				assignment2 = &data.QuestAssignment{
					AccountID:   accountID,
					QuestType:   proto.QuestType(1),
					Periodicity: proto.QuestPeriodicity_DAILY,
					Position:    data.QuestPositionTwo,
					Period:      1,
					Status:      data.QuestStatusCompleted,
					Active:      true,
				}
				err = data.DB.Save(assignment2)
				require.NoError(t, err)

				assignment3 = &data.QuestAssignment{
					AccountID:   accountID,
					QuestType:   proto.QuestType(1),
					Periodicity: proto.QuestPeriodicity_DAILY,
					Position:    data.QuestPositionTwo,
					Period:      1,
					Status:      data.QuestStatusCompleted,
					Active:      false,
				}
				err = data.DB.Save(assignment3)
				require.NoError(t, err)

				t.Cleanup(func() {
					err := data.DB.QuestsAssignments().Find(db.Cond{"account_id": accountID}).Delete()
					require.NoError(t, err)
				})
			}

			assignments, err := data.DB.QuestsAssignments().FindActive(accountID)
			require.NoError(t, err)
			assert.Len(t, assignments, 2)
			assert.Contains(t, assignments, assignment1)
			assert.Contains(t, assignments, assignment2)
		})

		t.Run("does not find when does not exist", func(t *testing.T) {
			var assignment *data.QuestAssignment

			// Setup
			{
				assignment = &data.QuestAssignment{
					AccountID:   accountID,
					QuestType:   proto.QuestType(1),
					Periodicity: proto.QuestPeriodicity_DAILY,
					Position:    data.QuestPositionTwo,
					Period:      1,
					Status:      data.QuestStatusCompleted,
				}

				err := data.DB.Save(assignment)
				require.NoError(t, err)

				t.Cleanup(func() {
					err := data.DB.QuestsAssignments().Find(db.Cond{"account_id": accountID}).Delete()
					require.NoError(t, err)
				})
			}

			assignments, err := data.DB.QuestsAssignments().FindActive(accountID)
			require.NoError(t, err)
			assert.Empty(t, assignments)
		})
	})

	t.Run("increment re-rolls", func(t *testing.T) {
		var assignment1, assignment2, assignment3, assignment4 *data.QuestAssignment

		currentPeriod := uint16(10)
		originalReRolls := uint16(1)

		// Setup
		{
			assignment1 = &data.QuestAssignment{
				AccountID:   accountID,
				QuestType:   proto.QuestType(1),
				Periodicity: proto.QuestPeriodicity_DAILY,
				Position:    data.QuestPositionOne,
				Period:      currentPeriod,
				Status:      data.QuestStatusInProgress,
				ReRolls:     originalReRolls,
			}

			err := data.DB.Save(assignment1)
			require.NoError(t, err)

			assignment2 = &data.QuestAssignment{
				AccountID:   accountID,
				QuestType:   proto.QuestType(2),
				Periodicity: proto.QuestPeriodicity_DAILY,
				Position:    data.QuestPositionTwo,
				Period:      currentPeriod,
				Status:      data.QuestStatusInProgress,
				ReRolls:     originalReRolls,
			}

			err = data.DB.Save(assignment2)
			require.NoError(t, err)

			assignment3 = &data.QuestAssignment{
				AccountID:   accountID,
				QuestType:   proto.QuestType(3),
				Periodicity: proto.QuestPeriodicity_WEEKLY,
				Position:    data.QuestPositionTwo,
				Period:      currentPeriod,
				Status:      data.QuestStatusInProgress,
				ReRolls:     originalReRolls,
			}

			err = data.DB.Save(assignment3)
			require.NoError(t, err)

			assignment4 = &data.QuestAssignment{
				AccountID:   accountID,
				QuestType:   proto.QuestType(4),
				Periodicity: proto.QuestPeriodicity_DAILY,
				Position:    data.QuestPositionTwo,
				Period:      currentPeriod - 1,
				Status:      data.QuestStatusFailed,
				ReRolls:     originalReRolls,
			}

			err = data.DB.Save(assignment4)
			require.NoError(t, err)

			t.Cleanup(func() {
				err := data.DB.QuestsAssignments().Find(db.Cond{"account_id": accountID}).Delete()
				require.NoError(t, err)
			})
		}

		expectedReRolls := originalReRolls + 1

		err := data.DB.QuestsAssignments().IncrementReRolls(assignment1)
		require.NoError(t, err)

		assert.Equal(t, expectedReRolls, assignment1.ReRolls)

		updatedAssignment1, err := data.DB.QuestsAssignments().FindOne(db.Cond{"id": assignment1.ID})
		require.NoError(t, err)
		require.NotNil(t, updatedAssignment1)
		assert.Equal(t, expectedReRolls, updatedAssignment1.ReRolls)

		updatedAssignment2, err := data.DB.QuestsAssignments().FindOne(db.Cond{"id": assignment2.ID})
		require.NoError(t, err)
		require.NotNil(t, updatedAssignment2)
		assert.Equal(t, expectedReRolls, updatedAssignment2.ReRolls)

		updatedAssignment3, err := data.DB.QuestsAssignments().FindOne(db.Cond{"id": assignment3.ID})
		require.NoError(t, err)
		require.NotNil(t, updatedAssignment3)
		assert.Equal(t, originalReRolls, updatedAssignment3.ReRolls)

		updatedAssignment4, err := data.DB.QuestsAssignments().FindOne(db.Cond{"id": assignment4.ID})
		require.NoError(t, err)
		require.NotNil(t, updatedAssignment4)
		assert.Equal(t, originalReRolls, updatedAssignment4.ReRolls)
	})

	t.Run("reset re-rolls", func(t *testing.T) {
		var assignment1, assignment2, assignment3, assignment4 *data.QuestAssignment

		currentPeriod := uint16(10)
		originalReRolls := uint16(1)

		// Setup
		{
			assignment1 = &data.QuestAssignment{
				AccountID:   accountID,
				QuestType:   proto.QuestType(1),
				Periodicity: proto.QuestPeriodicity_DAILY,
				Position:    data.QuestPositionOne,
				Period:      currentPeriod,
				Status:      data.QuestStatusInProgress,
				ReRolls:     originalReRolls,
			}

			err := data.DB.Save(assignment1)
			require.NoError(t, err)

			assignment2 = &data.QuestAssignment{
				AccountID:   accountID,
				QuestType:   proto.QuestType(2),
				Periodicity: proto.QuestPeriodicity_DAILY,
				Position:    data.QuestPositionTwo,
				Period:      currentPeriod,
				Status:      data.QuestStatusInProgress,
				ReRolls:     originalReRolls,
			}

			err = data.DB.Save(assignment2)
			require.NoError(t, err)

			assignment3 = &data.QuestAssignment{
				AccountID:   accountID,
				QuestType:   proto.QuestType(3),
				Periodicity: proto.QuestPeriodicity_WEEKLY,
				Position:    data.QuestPositionTwo,
				Period:      currentPeriod,
				Status:      data.QuestStatusInProgress,
				ReRolls:     originalReRolls,
			}

			err = data.DB.Save(assignment3)
			require.NoError(t, err)

			assignment4 = &data.QuestAssignment{
				AccountID:   accountID,
				QuestType:   proto.QuestType(4),
				Periodicity: proto.QuestPeriodicity_DAILY,
				Position:    data.QuestPositionTwo,
				Period:      currentPeriod - 1,
				Status:      data.QuestStatusFailed,
				ReRolls:     originalReRolls,
			}

			err = data.DB.Save(assignment4)
			require.NoError(t, err)

			t.Cleanup(func() {
				err := data.DB.QuestsAssignments().Find(db.Cond{"account_id": accountID}).Delete()
				require.NoError(t, err)
			})
		}

		err := data.DB.QuestsAssignments().ResetReRolls(assignment1.AccountID, assignment1.Periodicity, assignment1.Period)
		require.NoError(t, err)

		updatedAssignment1, err := data.DB.QuestsAssignments().FindOne(db.Cond{"id": assignment1.ID})
		require.NoError(t, err)
		require.NotNil(t, updatedAssignment1)
		assert.Zero(t, updatedAssignment1.ReRolls)

		updatedAssignment2, err := data.DB.QuestsAssignments().FindOne(db.Cond{"id": assignment2.ID})
		require.NoError(t, err)
		require.NotNil(t, updatedAssignment2)
		assert.Zero(t, updatedAssignment2.ReRolls)

		updatedAssignment3, err := data.DB.QuestsAssignments().FindOne(db.Cond{"id": assignment3.ID})
		require.NoError(t, err)
		require.NotNil(t, updatedAssignment3)
		assert.Equal(t, originalReRolls, updatedAssignment3.ReRolls)

		updatedAssignment4, err := data.DB.QuestsAssignments().FindOne(db.Cond{"id": assignment4.ID})
		require.NoError(t, err)
		require.NotNil(t, updatedAssignment4)
		assert.Equal(t, originalReRolls, updatedAssignment4.ReRolls)
	})

	t.Run("find latest re-rolls", func(t *testing.T) {
		t.Run("finds stored value when exists", func(t *testing.T) {
			var assignment1 *data.QuestAssignment

			currentPeriod := uint16(10)
			expectedReRolls := uint16(1)

			// Setup
			{
				assignment1 = &data.QuestAssignment{
					AccountID:   accountID,
					QuestType:   proto.QuestType(1),
					Periodicity: proto.QuestPeriodicity_DAILY,
					Position:    data.QuestPositionOne,
					Period:      currentPeriod,
					Status:      data.QuestStatusInProgress,
					ReRolls:     expectedReRolls,
				}

				err := data.DB.Save(assignment1)
				require.NoError(t, err)

				assignment2 := &data.QuestAssignment{
					AccountID:   accountID,
					QuestType:   proto.QuestType(2),
					Periodicity: proto.QuestPeriodicity_DAILY,
					Position:    data.QuestPositionTwo,
					Period:      currentPeriod,
					Status:      data.QuestStatusInProgress,
					ReRolls:     expectedReRolls,
				}

				err = data.DB.Save(assignment2)
				require.NoError(t, err)

				assignment3 := &data.QuestAssignment{
					AccountID:   accountID,
					QuestType:   proto.QuestType(3),
					Periodicity: proto.QuestPeriodicity_WEEKLY,
					Position:    data.QuestPositionTwo,
					Period:      currentPeriod,
					Status:      data.QuestStatusInProgress,
					ReRolls:     expectedReRolls + 1,
				}

				err = data.DB.Save(assignment3)
				require.NoError(t, err)

				t.Cleanup(func() {
					err := data.DB.QuestsAssignments().Find(db.Cond{"account_id": accountID}).Delete()
					require.NoError(t, err)
				})
			}

			result, err := data.DB.QuestsAssignments().FindLatestReRolls(accountID, assignment1.Periodicity, currentPeriod)
			require.NoError(t, err)

			assert.Equal(t, expectedReRolls, result)
		})

		t.Run("returns 0 when does not exist", func(t *testing.T) {
			result, err := data.DB.QuestsAssignments().FindLatestReRolls(accountID, proto.QuestPeriodicity_WEEKLY, 1)
			require.NoError(t, err)

			assert.Equal(t, uint16(0), result)
		})
	})

	t.Run("find quest types in period", func(t *testing.T) {
		var assignment1, assignment2, assignment3, assignment4 *data.QuestAssignment

		currentPeriod := uint16(10)

		// Setup
		{
			assignment1 = &data.QuestAssignment{
				AccountID:   accountID,
				QuestType:   proto.QuestType(1),
				Periodicity: proto.QuestPeriodicity_DAILY,
				Position:    data.QuestPositionOne,
				Period:      currentPeriod,
				Status:      data.QuestStatusInProgress,
			}

			err := data.DB.Save(assignment1)
			require.NoError(t, err)

			assignment2 = &data.QuestAssignment{
				AccountID:   accountID,
				QuestType:   proto.QuestType(2),
				Periodicity: proto.QuestPeriodicity_DAILY,
				Position:    data.QuestPositionTwo,
				Period:      currentPeriod,
				Status:      data.QuestStatusInProgress,
			}

			err = data.DB.Save(assignment2)
			require.NoError(t, err)

			assignment3 = &data.QuestAssignment{
				AccountID:   accountID,
				QuestType:   proto.QuestType(3),
				Periodicity: proto.QuestPeriodicity_WEEKLY,
				Position:    data.QuestPositionTwo,
				Period:      currentPeriod,
				Status:      data.QuestStatusInProgress,
			}

			err = data.DB.Save(assignment3)
			require.NoError(t, err)

			assignment4 = &data.QuestAssignment{
				AccountID:   accountID,
				QuestType:   proto.QuestType(4),
				Periodicity: proto.QuestPeriodicity_DAILY,
				Position:    data.QuestPositionTwo,
				Period:      currentPeriod - 1,
				Status:      data.QuestStatusInProgress,
			}

			err = data.DB.Save(assignment4)
			require.NoError(t, err)

			t.Cleanup(func() {
				err := data.DB.QuestsAssignments().Find(db.Cond{"account_id": accountID}).Delete()
				require.NoError(t, err)
			})
		}

		result, err := data.DB.QuestsAssignments().FindQuestTypesInPeriod(accountID, assignment1.Periodicity, currentPeriod)
		require.NoError(t, err)
		require.NotEmpty(t, result)

		assert.Contains(t, result, assignment1.QuestType)
		assert.Contains(t, result, assignment2.QuestType)
		assert.NotContains(t, result, assignment3.QuestType)
		assert.NotContains(t, result, assignment4.QuestType)
	})

	t.Run("set as seen", func(t *testing.T) {
		var assignment1, assignment2, assignment3, assignment4 *data.QuestAssignment

		anotherAccountID := apitest.RandomAccountID()

		currentPeriod := uint16(10)

		// Setup
		{
			assignment1 = &data.QuestAssignment{
				AccountID:   accountID,
				QuestType:   proto.QuestType(1),
				Periodicity: proto.QuestPeriodicity_DAILY,
				Position:    data.QuestPositionOne,
				Period:      currentPeriod,
				Status:      data.QuestStatusInProgress,
				ReRolls:     currentPeriod,
			}

			err := data.DB.Save(assignment1)
			require.NoError(t, err)

			assignment2 = &data.QuestAssignment{
				AccountID:   accountID,
				QuestType:   proto.QuestType(2),
				Periodicity: proto.QuestPeriodicity_DAILY,
				Position:    data.QuestPositionTwo,
				Period:      currentPeriod,
				Status:      data.QuestStatusInProgress,
				ReRolls:     currentPeriod,
			}

			err = data.DB.Save(assignment2)
			require.NoError(t, err)

			assignment3 = &data.QuestAssignment{
				AccountID:   accountID,
				QuestType:   proto.QuestType(3),
				Periodicity: proto.QuestPeriodicity_WEEKLY,
				Position:    data.QuestPositionTwo,
				Period:      currentPeriod,
				Status:      data.QuestStatusInProgress,
				ReRolls:     currentPeriod,
			}

			err = data.DB.Save(assignment3)
			require.NoError(t, err)

			assignment4 = &data.QuestAssignment{
				AccountID:   anotherAccountID,
				QuestType:   proto.QuestType(3),
				Periodicity: proto.QuestPeriodicity_WEEKLY,
				Position:    data.QuestPositionTwo,
				Period:      currentPeriod,
				Status:      data.QuestStatusInProgress,
				ReRolls:     currentPeriod,
			}

			err = data.DB.Save(assignment4)
			require.NoError(t, err)

			t.Cleanup(func() {
				err := data.DB.QuestsAssignments().Find(db.Cond{"account_id": accountID}).Delete()
				require.NoError(t, err)
			})
		}

		err := data.DB.QuestsAssignments().SetAsSeen(accountID, []uint64{assignment1.ID, assignment3.ID, assignment4.ID})
		require.NoError(t, err)

		storedAssignment1, err := data.DB.QuestsAssignments().FindOne(db.Cond{"id": assignment1.ID})
		require.NoError(t, err)
		require.NotNil(t, storedAssignment1)
		assert.False(t, storedAssignment1.IsNew)

		storedAssignment2, err := data.DB.QuestsAssignments().FindOne(db.Cond{"id": assignment2.ID})
		require.NoError(t, err)
		require.NotNil(t, storedAssignment2)
		assert.True(t, storedAssignment2.IsNew)

		storedAssignment3, err := data.DB.QuestsAssignments().FindOne(db.Cond{"id": assignment3.ID})
		require.NoError(t, err)
		require.NotNil(t, storedAssignment3)
		assert.False(t, storedAssignment3.IsNew)

		storedAssignment4, err := data.DB.QuestsAssignments().FindOne(db.Cond{"id": assignment4.ID})
		require.NoError(t, err)
		require.NotNil(t, storedAssignment4)
		assert.True(t, storedAssignment4.IsNew)
	})
}

func TestQuestAssignment(t *testing.T) {
	accountID := apitest.RandomAccountID()

	t.Run("validate", func(t *testing.T) {
		t.Run("account ID", func(t *testing.T) {
			t.Run("fails when the account account ID is invalid", func(t *testing.T) {
				assignment := &data.QuestAssignment{
					AccountID: 0,
				}

				err := assignment.Validate()
				require.ErrorContains(t, err, "invalid account ID")
			})
		})

		t.Run("quest type", func(t *testing.T) {
			t.Run("fails when the quest type is unknown", func(t *testing.T) {
				assignment := &data.QuestAssignment{
					AccountID: accountID,
					QuestType: proto.QuestType_UNKNOWN,
				}

				err := assignment.Validate()
				require.ErrorContains(t, err, "invalid quest type")
			})
		})

		t.Run("periodicity", func(t *testing.T) {
			t.Run("fails when the periodicity is unknown", func(t *testing.T) {
				assignment := &data.QuestAssignment{
					AccountID:   accountID,
					QuestType:   proto.QuestType(1),
					Periodicity: proto.QuestPeriodicity_UNKNOWN,
				}

				err := assignment.Validate()
				require.ErrorContains(t, err, "invalid periodicity")
			})

			t.Run("fails when the periodicity is unsupported", func(t *testing.T) {
				assignment := &data.QuestAssignment{
					AccountID:   accountID,
					QuestType:   proto.QuestType(1),
					Periodicity: proto.QuestPeriodicity(4),
				}

				err := assignment.Validate()
				require.ErrorContains(t, err, "invalid periodicity")
			})
		})

		t.Run("position", func(t *testing.T) {
			t.Run("fails when the position is unknown", func(t *testing.T) {
				assignment := &data.QuestAssignment{
					AccountID:   accountID,
					QuestType:   proto.QuestType(1),
					Periodicity: proto.QuestPeriodicity_DAILY,
					Position:    data.QuestPositionUnknown,
				}

				err := assignment.Validate()
				require.ErrorContains(t, err, "invalid position")
			})

			t.Run("fails when the position is higher than 3", func(t *testing.T) {
				assignment := &data.QuestAssignment{
					AccountID:   accountID,
					QuestType:   proto.QuestType(1),
					Periodicity: proto.QuestPeriodicity_DAILY,
					Position:    data.QuestPosition(4),
				}

				err := assignment.Validate()
				require.ErrorContains(t, err, "invalid position")
			})
		})

		t.Run("period", func(t *testing.T) {
			t.Run("fails when the period is 0", func(t *testing.T) {
				assignment := &data.QuestAssignment{
					AccountID:   accountID,
					QuestType:   proto.QuestType(1),
					Periodicity: proto.QuestPeriodicity_DAILY,
					Position:    data.QuestPositionTwo,
					Period:      0,
				}

				err := assignment.Validate()
				require.ErrorContains(t, err, "period cannot be 0")
			})
		})

		t.Run("status", func(t *testing.T) {
			t.Run("fails when the status is unknown", func(t *testing.T) {
				assignment := &data.QuestAssignment{
					AccountID:   accountID,
					QuestType:   proto.QuestType(1),
					Periodicity: proto.QuestPeriodicity_DAILY,
					Position:    data.QuestPositionTwo,
					Period:      1,
					Status:      data.QuestStatusUnknown,
				}

				err := assignment.Validate()
				require.ErrorContains(t, err, "invalid status")
			})

			t.Run("fails when the status is unsupported", func(t *testing.T) {
				assignment := &data.QuestAssignment{
					AccountID:   accountID,
					QuestType:   proto.QuestType(1),
					Periodicity: proto.QuestPeriodicity_DAILY,
					Position:    data.QuestPositionTwo,
					Period:      1,
					Status:      data.QuestStatus(5),
				}

				err := assignment.Validate()
				require.ErrorContains(t, err, "invalid status")
			})
		})
	})
}
