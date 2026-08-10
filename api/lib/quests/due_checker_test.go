package quests_test

import (
	"fmt"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"

	"github.com/horizon-games/OpenSky/api/apitest"
	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/lib/quests"
	"github.com/horizon-games/OpenSky/api/proto"
)

func TestDueChecker(t *testing.T) {
	accountID := apitest.RandomAccountID()

	dueChecker := quests.NewDueChecker()

	t.Run("is due to auto re-roll", func(t *testing.T) {
		t.Run("for certain times in a period", func(t *testing.T) {
			tests := []struct {
				periodicity proto.QuestPeriodicity
				afterReset  time.Duration
				rerollable  bool
				status      data.QuestStatus
				expectedDue bool
			}{
				{
					periodicity: proto.QuestPeriodicity_DAILY,
					afterReset:  23 * time.Hour, // 1 hour less
					rerollable:  true,
					status:      data.QuestStatusInProgress,
					expectedDue: false,
				},
				{
					periodicity: proto.QuestPeriodicity_DAILY,
					afterReset:  25 * time.Hour, // 1 hour more
					rerollable:  true,
					status:      data.QuestStatusInProgress,
					expectedDue: true,
				},
				{
					periodicity: proto.QuestPeriodicity_DAILY,
					afterReset:  25 * time.Hour, // 1 hour more
					rerollable:  false,
					status:      data.QuestStatusInProgress,
					expectedDue: false,
				},
				{
					periodicity: proto.QuestPeriodicity_DAILY,
					afterReset:  25 * time.Hour, // 1 hour more
					rerollable:  false,
					status:      data.QuestStatusCompleted,
					expectedDue: false,
				},
				{
					periodicity: proto.QuestPeriodicity_DAILY,
					afterReset:  25 * time.Hour, // 1 hour more
					rerollable:  false,
					status:      data.QuestStatusClaimed,
					expectedDue: true,
				},
				{
					periodicity: proto.QuestPeriodicity_WEEKLY,
					afterReset:  6 * 24 * time.Hour, // 1 day less
					rerollable:  true,
					status:      data.QuestStatusInProgress,
					expectedDue: false,
				},
				{
					periodicity: proto.QuestPeriodicity_WEEKLY,
					afterReset:  8 * 24 * time.Hour, // 1 day more
					rerollable:  true,
					status:      data.QuestStatusInProgress,
					expectedDue: true,
				},
				{
					periodicity: proto.QuestPeriodicity_WEEKLY,
					afterReset:  8 * 24 * time.Hour, // 1 day more
					rerollable:  false,
					status:      data.QuestStatusInProgress,
					expectedDue: false,
				},
				{
					periodicity: proto.QuestPeriodicity_SEASONAL,
					afterReset:  27 * 24 * time.Hour, // 1 day less
					rerollable:  true,
					status:      data.QuestStatusInProgress,
					expectedDue: false,
				},
				{
					periodicity: proto.QuestPeriodicity_SEASONAL,
					afterReset:  29 * 24 * time.Hour, // 1 day more
					rerollable:  true,
					status:      data.QuestStatusInProgress,
					expectedDue: true,
				},
				{
					periodicity: proto.QuestPeriodicity_SEASONAL,
					afterReset:  29 * 24 * time.Hour, // 1 day more
					rerollable:  false,
					status:      data.QuestStatusInProgress,
					expectedDue: false,
				},
			}

			nextDailyReset, nextWeeklyReset, nextSeasonalReset := getNextResets(data.TimeNowUTC())

			for _, tt := range tests {
				t.Run(fmt.Sprintf(
					"%t when %s is %s after reset and rerollable is %t and status is %s",
					tt.expectedDue,
					tt.periodicity,
					tt.afterReset,
					tt.rerollable,
					tt.status,
				), func(t *testing.T) {
					spec := &data.QuestSpec{
						Periodicity: tt.periodicity,
						Rerollable:  tt.rerollable,
					}

					var nextReset time.Time

					switch tt.periodicity {
					case proto.QuestPeriodicity_DAILY:
						nextReset = nextDailyReset
					case proto.QuestPeriodicity_WEEKLY:
						nextReset = nextWeeklyReset
					case proto.QuestPeriodicity_SEASONAL:
						nextReset = nextSeasonalReset
					default:
						t.Errorf("unsupported periodicity: %s", tt.periodicity)
					}

					createdAt := nextReset.Add(-1 * tt.afterReset)

					assignment := &data.QuestAssignment{
						Periodicity: spec.Periodicity,
						Period:      quests.GetPeriodInTime(spec.Periodicity, createdAt),
						Status:      tt.status,
					}

					result := dueChecker.IsDueToAutoReRoll(spec, assignment)
					assert.Equal(t, tt.expectedDue, result)
				})
			}
		})

		t.Run("when it is epic quest and it is not re-rollable", func(t *testing.T) {
			periodicity := proto.QuestPeriodicity_WEEKLY
			currentPeriod := quests.GetCurrentPeriod(periodicity)
			previousPeriod := currentPeriod - 1

			t.Run("false when it is not the last quest", func(t *testing.T) {
				epicType := proto.EpicType(1)
				epicIndex := uint16(1)
				epicLength := uint16(2)
				spec := &data.QuestSpec{
					QuestType:  proto.QuestType(1),
					EpicType:   &epicType,
					EpicIndex:  &epicIndex,
					EpicLength: &epicLength,
					Rerollable: false,
				}

				assignment := &data.QuestAssignment{
					AccountID: accountID,
					QuestType: spec.QuestType,
					Status:    data.QuestStatusCompleted,
				}

				result := dueChecker.IsDueToAutoReRoll(spec, assignment)
				assert.False(t, result)
			})

			t.Run("when it is the last epic quest", func(t *testing.T) {
				epicType := proto.EpicType(1)
				epicIndex := uint16(2)
				epicLength := uint16(2)
				spec := &data.QuestSpec{
					QuestType:   proto.QuestType(1),
					EpicType:    &epicType,
					EpicIndex:   &epicIndex,
					EpicLength:  &epicLength,
					Periodicity: periodicity,
					Rerollable:  false,
				}

				t.Run("false when it is in progress", func(t *testing.T) {
					assignment := &data.QuestAssignment{
						AccountID: accountID,
						QuestType: spec.QuestType,
						Status:    data.QuestStatusInProgress,
					}

					result := dueChecker.IsDueToAutoReRoll(spec, assignment)
					assert.False(t, result)
				})

				t.Run("when it is in the previous period", func(t *testing.T) {
					t.Run("false when it is completed", func(t *testing.T) {
						assignment := &data.QuestAssignment{
							AccountID:   accountID,
							QuestType:   spec.QuestType,
							Periodicity: spec.Periodicity,
							Position:    spec.Position,
							Period:      previousPeriod,
							Status:      data.QuestStatusCompleted,
						}

						result := dueChecker.IsDueToAutoReRoll(spec, assignment)
						assert.False(t, result)
					})

					t.Run("true when it is claimed", func(t *testing.T) {
						assignment := &data.QuestAssignment{
							AccountID:   accountID,
							QuestType:   spec.QuestType,
							Periodicity: spec.Periodicity,
							Position:    spec.Position,
							Period:      previousPeriod,
							Status:      data.QuestStatusClaimed,
						}

						result := dueChecker.IsDueToAutoReRoll(spec, assignment)
						assert.True(t, result)
					})
				})

				t.Run("when it is in the current period", func(t *testing.T) {
					t.Run("false when it is completed", func(t *testing.T) {
						assignment := &data.QuestAssignment{
							AccountID:   accountID,
							QuestType:   spec.QuestType,
							Periodicity: spec.Periodicity,
							Position:    spec.Position,
							Period:      currentPeriod,
							Status:      data.QuestStatusCompleted,
						}

						result := dueChecker.IsDueToAutoReRoll(spec, assignment)
						assert.False(t, result)
					})

					t.Run("false when it is claimed", func(t *testing.T) {
						assignment := &data.QuestAssignment{
							AccountID:   accountID,
							QuestType:   spec.QuestType,
							Periodicity: spec.Periodicity,
							Position:    spec.Position,
							Period:      currentPeriod,
							Status:      data.QuestStatusClaimed,
						}

						result := dueChecker.IsDueToAutoReRoll(spec, assignment)
						assert.False(t, result)
					})
				})
			})
		})
	})

	t.Run("is due to copy to current period", func(t *testing.T) {
		periodicity := proto.QuestPeriodicity_DAILY
		currentPeriod := quests.GetCurrentPeriod(periodicity)

		tests := []struct {
			period      uint16
			status      data.QuestStatus
			rerollable  bool
			expectedDue bool
		}{
			{
				period:      currentPeriod - 1,
				status:      data.QuestStatusInProgress,
				rerollable:  false,
				expectedDue: true,
			},
			{
				period:      currentPeriod - 1,
				status:      data.QuestStatusCompleted,
				rerollable:  false,
				expectedDue: false,
			},
			{
				period:      currentPeriod - 1,
				status:      data.QuestStatusClaimed,
				rerollable:  false,
				expectedDue: false,
			},
			{
				period:      currentPeriod - 1,
				status:      data.QuestStatusFailed,
				rerollable:  false,
				expectedDue: false,
			},
			{
				period:      currentPeriod - 1,
				status:      data.QuestStatusInProgress,
				rerollable:  true,
				expectedDue: false,
			},
			{
				period:      currentPeriod - 1,
				status:      data.QuestStatusCompleted,
				rerollable:  true,
				expectedDue: false,
			},
			{
				period:      currentPeriod,
				status:      data.QuestStatusInProgress,
				rerollable:  false,
				expectedDue: false,
			},
		}

		for _, tt := range tests {
			t.Run(fmt.Sprintf("%t when the status is %s and rerollable is %t and is period old %t", tt.expectedDue, tt.status, tt.rerollable, tt.period < currentPeriod), func(t *testing.T) {
				spec := &data.QuestSpec{
					QuestType:   proto.QuestType(1),
					Periodicity: periodicity,
					Position:    data.QuestPositionTwo,
					Rerollable:  tt.rerollable,
				}

				assignment := &data.QuestAssignment{
					QuestType:   spec.QuestType,
					Periodicity: spec.Periodicity,
					Position:    spec.Position,
					Period:      tt.period,
					Status:      tt.status,
				}

				isDue := dueChecker.IsDueToCopyToCurrentPeriod(spec, assignment)
				assert.Equal(t, tt.expectedDue, isDue)
			})
		}
	})
}
