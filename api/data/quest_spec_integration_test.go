//go:build integration

package data_test

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/proto"
)

func TestQuestsSpecsStore(t *testing.T) {
	t.Run("find by quest type", func(t *testing.T) {
		var spec1, spec2, spec3 *data.QuestSpec

		// Setup
		{
			periodicity := proto.QuestPeriodicity_WEEKLY
			position := data.QuestPositionTwo

			spec1 = &data.QuestSpec{
				QuestType:   proto.QuestType(1),
				Periodicity: periodicity,
				Position:    position,
			}
			err := data.DB.Save(spec1)
			require.NoError(t, err)

			spec2 = &data.QuestSpec{
				QuestType:   proto.QuestType(2),
				Periodicity: periodicity,
				Position:    position,
			}
			err = data.DB.Save(spec2)
			require.NoError(t, err)

			spec3 = &data.QuestSpec{
				QuestType:   proto.QuestType(3),
				Periodicity: periodicity,
				Position:    position,
			}
			err = data.DB.Save(spec3)
			require.NoError(t, err)

			t.Cleanup(func() {
				err := data.DB.QuestsSpecs().Truncate()
				require.NoError(t, err)
			})
		}

		specs, err := data.DB.QuestsSpecs().FindByQuestType(spec1.QuestType, spec3.QuestType)
		require.NoError(t, err)
		assert.Len(t, specs, 2)
		assert.Contains(t, specs, spec1)
		assert.NotContains(t, specs, spec2)
		assert.Contains(t, specs, spec3)
	})

	t.Run("find by quest assignments", func(t *testing.T) {
		var spec1, spec2, spec3 *data.QuestSpec

		// Setup
		{
			periodicity := proto.QuestPeriodicity_WEEKLY
			position := data.QuestPositionTwo

			spec1 = &data.QuestSpec{
				QuestType:   proto.QuestType(1),
				Periodicity: periodicity,
				Position:    position,
			}
			err := data.DB.Save(spec1)
			require.NoError(t, err)

			spec2 = &data.QuestSpec{
				QuestType:   proto.QuestType(2),
				Periodicity: periodicity,
				Position:    position,
			}
			err = data.DB.Save(spec2)
			require.NoError(t, err)

			spec3 = &data.QuestSpec{
				QuestType:   proto.QuestType(3),
				Periodicity: periodicity,
				Position:    position,
			}
			err = data.DB.Save(spec3)
			require.NoError(t, err)

			t.Cleanup(func() {
				err := data.DB.QuestsSpecs().Truncate()
				require.NoError(t, err)
			})
		}

		assignment1 := &data.QuestAssignment{QuestType: spec1.QuestType}
		assignment3 := &data.QuestAssignment{QuestType: spec3.QuestType}

		specs, err := data.DB.QuestsSpecs().FindByQuestAssignments(assignment1, assignment3)
		require.NoError(t, err)
		assert.Len(t, specs, 2)
		assert.Contains(t, specs, spec1)
		assert.NotContains(t, specs, spec2)
		assert.Contains(t, specs, spec3)
	})
}

func TestQuestSpec(t *testing.T) {
	t.Run("validate", func(t *testing.T) {
		t.Run("periodicity", func(t *testing.T) {
			t.Run("fails when the periodicity is unknown", func(t *testing.T) {
				spec := &data.QuestSpec{
					Periodicity: proto.QuestPeriodicity_UNKNOWN,
				}

				err := spec.Validate()
				require.ErrorContains(t, err, "invalid periodicity")
			})

			t.Run("fails when the periodicity is unsupported", func(t *testing.T) {
				spec := &data.QuestSpec{
					Periodicity: proto.QuestPeriodicity(4),
				}

				err := spec.Validate()
				require.ErrorContains(t, err, "invalid periodicity")
			})
		})

		t.Run("position", func(t *testing.T) {
			t.Run("fails when the position is unknown", func(t *testing.T) {
				spec := &data.QuestSpec{
					Periodicity: proto.QuestPeriodicity_DAILY,
					Position:    data.QuestPositionUnknown,
				}

				err := spec.Validate()
				require.ErrorContains(t, err, "invalid position")
			})

			t.Run("fails when the position is higher than 3", func(t *testing.T) {
				spec := &data.QuestSpec{
					Periodicity: proto.QuestPeriodicity_DAILY,
					Position:    data.QuestPosition(4),
				}

				err := spec.Validate()
				require.ErrorContains(t, err, "invalid position")
			})
		})

		t.Run("epic", func(t *testing.T) {
			t.Run("fails when epic type is unknown", func(t *testing.T) {
				epicType := proto.EpicType_UNKNOWN
				spec := &data.QuestSpec{
					Periodicity: proto.QuestPeriodicity_DAILY,
					Position:    data.QuestPositionTwo,
					EpicType:    &epicType,
				}

				err := spec.Validate()
				require.ErrorContains(t, err, "invalid epic type")
			})

			t.Run("fails when epic index is not set when epic type is set", func(t *testing.T) {
				epicType := proto.EpicType(1)
				spec := &data.QuestSpec{
					Periodicity: proto.QuestPeriodicity_DAILY,
					Position:    data.QuestPositionTwo,
					EpicType:    &epicType,
				}

				err := spec.Validate()
				require.ErrorContains(t, err, "epic index is missing")
			})

			t.Run("fails when epic index is not higher than 0 when epic type is set", func(t *testing.T) {
				epicType := proto.EpicType(1)
				index := uint16(0)
				spec := &data.QuestSpec{
					Periodicity: proto.QuestPeriodicity_DAILY,
					Position:    data.QuestPositionTwo,
					EpicType:    &epicType,
					EpicIndex:   &index,
				}

				err := spec.Validate()
				require.ErrorContains(t, err, "epic index cannot be 0")
			})

			t.Run("fails when epic length is not set when epic type is set", func(t *testing.T) {
				epicType := proto.EpicType(1)
				index := uint16(1)
				spec := &data.QuestSpec{
					Periodicity: proto.QuestPeriodicity_DAILY,
					Position:    data.QuestPositionTwo,
					EpicType:    &epicType,
					EpicIndex:   &index,
				}

				err := spec.Validate()
				require.ErrorContains(t, err, "epic length is missing")
			})

			t.Run("fails when epic length is not higher than 0 when epic type is set", func(t *testing.T) {
				epicType := proto.EpicType(1)
				index := uint16(1)
				length := uint16(0)
				spec := &data.QuestSpec{
					Periodicity: proto.QuestPeriodicity_DAILY,
					Position:    data.QuestPositionTwo,
					EpicType:    &epicType,
					EpicIndex:   &index,
					EpicLength:  &length,
				}

				err := spec.Validate()
				require.ErrorContains(t, err, "epic length cannot be 0")
			})

			t.Run("fails when epic length is lower than epic index when epic type is set", func(t *testing.T) {
				epicType := proto.EpicType(1)
				index := uint16(2)
				length := uint16(1)
				spec := &data.QuestSpec{
					Periodicity: proto.QuestPeriodicity_DAILY,
					Position:    data.QuestPositionTwo,
					EpicType:    &epicType,
					EpicIndex:   &index,
					EpicLength:  &length,
				}

				err := spec.Validate()
				require.ErrorContains(t, err, "epic length cannot be lower than epic index")
			})
		})

		t.Run("required hero", func(t *testing.T) {
			t.Run("fails when the required hero exists and it is unknown", func(t *testing.T) {
				hero := proto.Hero_UNKNOWN
				spec := &data.QuestSpec{
					Periodicity:  proto.QuestPeriodicity_DAILY,
					Position:     data.QuestPositionOne,
					RequiredHero: &hero,
				}

				err := spec.Validate()
				require.ErrorContains(t, err, "invalid required hero")
			})
		})
	})
}
