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
	"github.com/horizon-games/OpenSky/api/proto"
)

func TestUpdater(t *testing.T) {
	accountID := apitest.RandomAccountID()

	var spec *data.QuestSpec

	var analyticsTracker *analyticsMock.MockTracker

	// Setup
	{
		// Quest specs
		{
			spec = &data.QuestSpec{
				QuestType:   proto.QuestType(1),
				Periodicity: proto.QuestPeriodicity_WEEKLY,
				Position:    data.QuestPositionTwo,
				EndProgress: 10,
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

			analyticsTracker = analyticsMock.NewMockTracker(ctrl)
		}
	}

	updater := quests.NewUpdater(apitest.NewLogger(), analyticsTracker)

	ctx := context.Background()

	t.Run("updates the progress", func(t *testing.T) {
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

		progress := map[uint64]uint16{
			assignment.ID: spec.EndProgress - 1,
		}

		analyticsTracker.EXPECT().TrackQuestCompletion(gomock.Any(), accountID, gomock.Any())

		err := updater.UpdateFromMatch(ctx, data.DB.Session, accountID, progress)
		require.NoError(t, err)

		storedAssignment, err := data.DB.QuestsAssignments().FindOne(db.Cond{"id": assignment.ID})
		require.NoError(t, err)
		require.NotNil(t, storedAssignment)
		assert.Equal(t, progress[assignment.ID], storedAssignment.Progress)
		assert.Equal(t, data.QuestStatusInProgress, storedAssignment.Status)
	})

	t.Run("sets the quest as completed when the progress is equal or higher then the end progress", func(t *testing.T) {
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

		progress := map[uint64]uint16{
			assignment.ID: spec.EndProgress + 1,
		}

		analyticsTracker.EXPECT().TrackQuestCompletion(gomock.Any(), accountID, gomock.Any())

		err := updater.UpdateFromMatch(ctx, data.DB.Session, accountID, progress)
		require.NoError(t, err)

		storedAssignment, err := data.DB.QuestsAssignments().FindOne(db.Cond{"id": assignment.ID})
		require.NoError(t, err)
		require.NotNil(t, storedAssignment)
		assert.Equal(t, spec.EndProgress, storedAssignment.Progress)
		assert.Equal(t, data.QuestStatusCompleted, storedAssignment.Status)
	})
}
