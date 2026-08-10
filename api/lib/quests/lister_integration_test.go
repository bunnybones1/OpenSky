//go:build integration

package quests_test

import (
	"context"
	"testing"

	"github.com/rs/zerolog"
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

func TestLister(t *testing.T) {
	var accountID proto.AccountID

	var dueChecker *mock.MockDueChecker

	var reRoller *mock.MockReRoller

	var assigner *mock.MockAssigner

	// Setup
	{
		// Accounts
		{
			var err error

			accountID, _, err = apitest.CreateRandomAccount("TestLister")
			require.NoError(t, err)
		}

		// Mocks
		{
			ctrl := gomock.NewController(t)

			dueChecker = mock.NewMockDueChecker(ctrl)
			reRoller = mock.NewMockReRoller(ctrl)
			assigner = mock.NewMockAssigner(ctrl)
		}
	}

	lister := quests.NewLister(zerolog.Nop(), dueChecker, reRoller, assigner)

	ctx := context.Background()

	t.Run("list", func(t *testing.T) {
		specs := make(map[proto.QuestPeriodicity]map[data.QuestPosition]*data.QuestSpec)

		periodicities := []proto.QuestPeriodicity{
			proto.QuestPeriodicity_DAILY,
			proto.QuestPeriodicity_WEEKLY,
			proto.QuestPeriodicity_SEASONAL,
		}

		positions := []data.QuestPosition{
			data.QuestPositionOne,
			data.QuestPositionTwo,
			data.QuestPositionThree,
		}

		// Setup
		{
			// Quest specs
			{
				specNum := 900
				for _, periodicity := range periodicities {
					specs[periodicity] = make(map[data.QuestPosition]*data.QuestSpec)

					for _, position := range positions {
						specNum++

						spec := &data.QuestSpec{
							QuestType:   proto.QuestType(specNum),
							Periodicity: periodicity,
							Position:    position,
						}
						err := data.DB.Save(spec)
						require.NoError(t, err)

						specs[periodicity][position] = spec
					}
				}

				t.Cleanup(func() {
					err := data.DB.QuestsSpecs().Truncate()
					require.NoError(t, err)
				})
			}
		}

		t.Run("lists active quests", func(t *testing.T) {
			// Setup
			{
				// Quest assignments
				{
					for _, difficulties := range specs {
						for _, spec := range difficulties {
							assignment := &data.QuestAssignment{
								AccountID:   accountID,
								QuestType:   spec.QuestType,
								Periodicity: spec.Periodicity,
								Position:    spec.Position,
								Status:      data.QuestStatusInProgress,
								Active:      true,
								Period:      quests.GetCurrentPeriod(spec.Periodicity),
							}
							err := data.DB.Save(assignment)
							require.NoError(t, err)
						}
					}

					t.Cleanup(func() {
						err := data.DB.QuestsAssignments().Find(db.Cond{"account_id": accountID}).Delete()
						require.NoError(t, err)
					})
				}
			}

			dueChecker.EXPECT().
				IsDueToAutoReRoll(gomock.Any(), gomock.Any()).
				DoAndReturn(func(questSpec *data.QuestSpec, questAssignment *data.QuestAssignment) bool {
					assert.Equal(t, questSpec.QuestType, questAssignment.QuestType)

					return false
				}).
				Times(9)

			dueChecker.EXPECT().
				IsDueToCopyToCurrentPeriod(gomock.Any(), gomock.Any()).
				DoAndReturn(func(questSpec *data.QuestSpec, questAssignment *data.QuestAssignment) bool {
					assert.Equal(t, questSpec.QuestType, questAssignment.QuestType)

					return false
				}).
				Times(9)

			quests, err := lister.List(ctx, data.DB.Session, accountID)
			require.NoError(t, err)
			require.NotEmpty(t, quests)

			assert.Len(t, quests, 9)

			for _, periodicity := range periodicities {
				for _, position := range positions {
					var found bool

					for _, quest := range quests {
						if quest.Position == position.Uint16() && *quest.Periodicity == periodicity {
							spec := specs[*quest.Periodicity][data.QuestPosition(quest.Position)]
							assert.NotNil(t, spec)

							found = true

							break
						}
					}

					assert.True(t, found)
				}
			}
		})

		t.Run("re-rolls and lists quests when they are due to auto re-roll", func(t *testing.T) {
			// Setup
			{
				// Quest assignments
				{
					for _, positions := range specs {
						for _, spec := range positions {
							assignment := &data.QuestAssignment{
								AccountID:   accountID,
								QuestType:   spec.QuestType,
								Periodicity: spec.Periodicity,
								Position:    spec.Position,
								Status:      data.QuestStatusInProgress,
								Active:      true,
								Period:      quests.GetCurrentPeriod(spec.Periodicity),
							}
							err := data.DB.Save(assignment)
							require.NoError(t, err)
						}
					}

					t.Cleanup(func() {
						err := data.DB.QuestsAssignments().Find(db.Cond{"account_id": accountID}).Delete()
						require.NoError(t, err)
					})
				}
			}

			expectedReRolledQuests := map[proto.QuestType]*proto.Quest{
				proto.QuestType(903): {ID: 100001},
				proto.QuestType(905): {ID: 100002},
			}

			dueChecker.EXPECT().
				IsDueToAutoReRoll(gomock.Any(), gomock.Any()).
				DoAndReturn(func(questSpec *data.QuestSpec, questAssignment *data.QuestAssignment) bool {
					assert.Equal(t, questSpec.QuestType, questAssignment.QuestType)

					if _, ok := expectedReRolledQuests[questSpec.QuestType]; ok {
						return true
					}

					return false
				}).
				Times(9)

			dueChecker.EXPECT().IsDueToCopyToCurrentPeriod(gomock.Any(), gomock.Any()).Return(false).Times(7)

			reRoller.EXPECT().
				AutoReRoll(ctx, data.DB.Session, gomock.Any(), gomock.Any()).
				DoAndReturn(func(ctx context.Context, sess db.Session, questSpec *data.QuestSpec, questAssignment *data.QuestAssignment) (*proto.Quest, error) {
					assert.Equal(t, questSpec.QuestType, questAssignment.QuestType)

					if _, ok := expectedReRolledQuests[questSpec.QuestType]; ok {
						expectedReRolledQuests[questSpec.QuestType].Periodicity = &questSpec.Periodicity
						expectedReRolledQuests[questSpec.QuestType].Position = questSpec.Position.Uint16()

						return expectedReRolledQuests[questSpec.QuestType], nil
					}

					return nil, nil
				}).
				Times(2)

			quests, err := lister.List(ctx, data.DB.Session, accountID)
			require.NoError(t, err)
			require.NotEmpty(t, quests)

			assert.Len(t, quests, 9)

			for _, periodicity := range periodicities {
				for _, position := range positions {
					var found bool

					for _, quest := range quests {
						if quest.Position == position.Uint16() && *quest.Periodicity == periodicity {
							spec := specs[*quest.Periodicity][data.QuestPosition(quest.Position)]
							assert.NotNil(t, spec)

							found = true

							break
						}
					}

					assert.True(t, found)
				}
			}

			for _, expectedQuest := range expectedReRolledQuests {
				assert.Contains(t, quests, expectedQuest)
			}
		})

		t.Run("rolls new ones and lists quests when they are missing in the position", func(t *testing.T) {
			missing := map[proto.QuestPeriodicity][]data.QuestPosition{
				proto.QuestPeriodicity_DAILY: {
					data.QuestPositionTwo,
				},
				proto.QuestPeriodicity_WEEKLY: positions,
			}

			// Setup
			{
				// Quest assignments
				{
					for _, positions := range specs {
						i := 1
						for _, spec := range positions {
							var skip bool

							if _, ok := missing[spec.Periodicity]; ok {
								for _, position := range missing[spec.Periodicity] {
									if i == int(position) {
										skip = true

										break
									}
								}
							}

							if skip {
								i++

								continue
							}

							assignment := &data.QuestAssignment{
								AccountID:   accountID,
								QuestType:   spec.QuestType,
								Periodicity: spec.Periodicity,
								Position:    spec.Position,
								Status:      data.QuestStatusInProgress,
								Active:      true,
								Period:      quests.GetCurrentPeriod(spec.Periodicity),
							}
							err := data.DB.Save(assignment)
							require.NoError(t, err)

							i++
						}
					}

					t.Cleanup(func() {
						err := data.DB.QuestsAssignments().Find(db.Cond{"account_id": accountID}).Delete()
						require.NoError(t, err)
					})
				}
			}

			expectedRolledMissingQuests := []*proto.Quest{
				{ID: 100001},
				{ID: 100002},
				{ID: 100003},
				{ID: 100004},
			}

			dueChecker.EXPECT().IsDueToAutoReRoll(gomock.Any(), gomock.Any()).Return(false).Times(5)

			dueChecker.EXPECT().IsDueToCopyToCurrentPeriod(gomock.Any(), gomock.Any()).Return(false).Times(5)

			var rolledMissingCounter int

			assigner.EXPECT().
				RollNew(data.DB.Session, accountID, gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
				DoAndReturn(func(_ db.Session, _ proto.AccountID, periodicity proto.QuestPeriodicity, position data.QuestPosition, _ *data.QuestSpec, _ *data.QuestAssignment) (*proto.Quest, error) {
					if quest := expectedRolledMissingQuests[rolledMissingCounter]; quest != nil {
						quest.Periodicity = &periodicity
						quest.Position = position.Uint16()

						rolledMissingCounter++

						return quest, nil
					}

					t.Fail()

					return nil, nil
				}).
				Times(4)

			quests, err := lister.List(ctx, data.DB.Session, accountID)
			require.NoError(t, err)
			require.NotEmpty(t, quests)

			assert.Len(t, quests, 9)

			for _, periodicity := range periodicities {
				for _, position := range positions {
					var found bool

					for _, quest := range quests {
						if quest.Position == position.Uint16() && *quest.Periodicity == periodicity {
							found = true

							break
						}
					}

					assert.True(t, found)
				}
			}

			for _, expectedQuest := range expectedRolledMissingQuests {
				assert.Contains(t, quests, expectedQuest)
			}
		})

		t.Run("copies non-rerollable to current period and lists quests when they are non-rerollable and not complete yet", func(t *testing.T) {
			// Setup
			{
				// Quest assignments
				{
					for _, positions := range specs {
						for _, spec := range positions {
							assignment := &data.QuestAssignment{
								AccountID:   accountID,
								QuestType:   spec.QuestType,
								Periodicity: spec.Periodicity,
								Position:    spec.Position,
								Status:      data.QuestStatusInProgress,
								Active:      true,
								Period:      quests.GetCurrentPeriod(spec.Periodicity),
							}
							err := data.DB.Save(assignment)
							require.NoError(t, err)
						}
					}

					t.Cleanup(func() {
						err := data.DB.QuestsAssignments().Find(db.Cond{"account_id": accountID}).Delete()
						require.NoError(t, err)
					})
				}
			}

			expectedCopiedQuests := map[proto.QuestType]*proto.Quest{
				proto.QuestType(903): {ID: 100001},
				proto.QuestType(905): {ID: 100002},
			}

			dueChecker.EXPECT().IsDueToAutoReRoll(gomock.Any(), gomock.Any()).Return(false).Times(9)

			dueChecker.EXPECT().
				IsDueToCopyToCurrentPeriod(gomock.Any(), gomock.Any()).
				DoAndReturn(func(questSpec *data.QuestSpec, questAssignment *data.QuestAssignment) bool {
					assert.Equal(t, questSpec.QuestType, questAssignment.QuestType)

					if _, ok := expectedCopiedQuests[questSpec.QuestType]; ok {
						return true
					}

					return false
				}).
				Times(9)

			assigner.EXPECT().
				CopyToCurrentPeriod(data.DB.Session, gomock.Any(), gomock.Any()).
				DoAndReturn(func(sess db.Session, questSpec *data.QuestSpec, questAssignment *data.QuestAssignment) (*proto.Quest, error) {
					assert.Equal(t, questSpec.QuestType, questAssignment.QuestType)

					if _, ok := expectedCopiedQuests[questSpec.QuestType]; ok {
						expectedCopiedQuests[questSpec.QuestType].Periodicity = &questSpec.Periodicity
						expectedCopiedQuests[questSpec.QuestType].Position = questSpec.Position.Uint16()

						return expectedCopiedQuests[questSpec.QuestType], nil
					}

					return nil, nil
				}).
				Times(2)

			quests, err := lister.List(ctx, data.DB.Session, accountID)
			require.NoError(t, err)
			require.NotEmpty(t, quests)

			assert.Len(t, quests, 9)

			for _, periodicity := range periodicities {
				for _, position := range positions {
					var found bool

					for _, quest := range quests {
						if quest.Position == position.Uint16() && *quest.Periodicity == periodicity {
							spec := specs[*quest.Periodicity][data.QuestPosition(quest.Position)]
							assert.NotNil(t, spec)

							found = true

							break
						}
					}

					assert.True(t, found)
				}
			}

			for _, expectedQuest := range expectedCopiedQuests {
				assert.Contains(t, quests, expectedQuest)
			}
		})
	})

	t.Run("list epic chain", func(t *testing.T) {
		epicType := proto.EpicType(1)

		var specs []*data.QuestSpec

		// Setup
		{
			// Quest specs
			{
				epicLength := uint16(3)
				for i := 1; i <= int(epicLength); i++ {
					epicIndex := uint16(i)
					spec := &data.QuestSpec{
						QuestType:   proto.QuestType(i),
						EpicType:    &epicType,
						EpicIndex:   &epicIndex,
						EpicLength:  &epicLength,
						Periodicity: proto.QuestPeriodicity_DAILY,
						Position:    data.QuestPositionOne,
					}

					err := data.DB.Save(spec)
					require.NoError(t, err)

					specs = append(specs, spec)
				}

				t.Cleanup(func() {
					err := data.DB.QuestsSpecs().Truncate()
					require.NoError(t, err)
				})
			}
		}

		t.Run("when no quest is active there", func(t *testing.T) {
			quests, err := lister.ListEpicChain(data.DB, accountID, epicType)
			require.NoError(t, err)
			require.Len(t, quests, len(specs))

			for i, spec := range specs {
				assert.Equal(t, 0, int(quests[i].ID))
				assert.Equal(t, spec.QuestType, *quests[i].QuestType)
			}
		})

		t.Run("when there is active quest", func(t *testing.T) {
			var assignments []*data.QuestAssignment

			// Setup
			{
				// Quest assignments
				{
					for i := 0; i < len(specs); i++ {
						status := data.QuestStatusClaimed
						active := false

						if i == 1 {
							status = data.QuestStatusInProgress
							active = true
						}

						if i > 1 {
							assignments = append(assignments, nil)
							continue
						}

						spec := specs[i]

						assignment := &data.QuestAssignment{
							AccountID:   accountID,
							QuestType:   spec.QuestType,
							Periodicity: spec.Periodicity,
							Position:    spec.Position,
							Status:      status,
							Active:      active,
							Period:      quests.GetCurrentPeriod(spec.Periodicity),
							ClaimedAt:   data.TimeNowUTCPtr(),
						}
						err := data.DB.Save(assignment)
						require.NoError(t, err)

						assignments = append(assignments, assignment)
					}

					t.Cleanup(func() {
						err := data.DB.QuestsAssignments().Find(db.Cond{"account_id": accountID}).Delete()
						require.NoError(t, err)
					})
				}
			}

			quests, err := lister.ListEpicChain(data.DB, accountID, epicType)
			require.NoError(t, err)
			require.Len(t, quests, len(specs))

			for i, quest := range quests {
				spec := specs[i]
				assignment := assignments[i]

				switch i {
				case 0:
					assert.Equal(t, assignment.ID, quest.ID)
					assert.Equal(t, spec.QuestType, *quest.QuestType)
					assert.False(t, quest.IsClaimable)
					assert.True(t, quest.IsClaimed)
				case 1:
					assert.Equal(t, assignment.ID, quest.ID)
					assert.Equal(t, spec.QuestType, *quest.QuestType)
					assert.False(t, quest.IsClaimed)
				default:
					assert.Equal(t, 0, int(quest.ID))
					assert.Equal(t, spec.QuestType, *quest.QuestType)
				}
			}
		})
	})
}
