package data_test

import (
	"fmt"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/proto"
)

func TestNewQuest(t *testing.T) {
	epicType := proto.EpicType(10)
	epicLength := uint16(5)
	epicIndex := uint16(2)
	rewardType := proto.ItemType_SW_XP
	spec := &data.QuestSpec{
		QuestType:   proto.QuestType(1),
		Periodicity: proto.QuestPeriodicity_WEEKLY,
		Position:    data.QuestPositionTwo,
		EpicType:    &epicType,
		EpicIndex:   &epicIndex,
		EpicLength:  &epicLength,
		Reward: proto.QuestReward{
			ItemType: &rewardType,
			Amount:   4,
		},
	}

	assignment := &data.QuestAssignment{
		ID:          100,
		QuestType:   spec.QuestType,
		Periodicity: spec.Periodicity,
		Position:    spec.Position,
		Progress:    20,
	}

	t.Run("fails when quest spec is nil", func(t *testing.T) {
		quest, err := data.NewQuest(nil, assignment, nil)
		require.ErrorContains(t, err, "quest spec cannot be nil")
		assert.Nil(t, quest)
	})

	t.Run("fails when quest assignment is nil", func(t *testing.T) {
		quest, err := data.NewQuest(spec, nil, nil)
		require.ErrorContains(t, err, "quest assignment cannot be nil")
		assert.Nil(t, quest)
	})

	t.Run("success", func(t *testing.T) {
		quest, err := data.NewQuest(spec, assignment, nil)
		require.NoError(t, err)

		assert.Equal(t, assignment.ID, quest.ID)
		assert.Equal(t, assignment.Position.Uint16(), quest.Position)
		assert.Equal(t, assignment.QuestType, *quest.QuestType)
		assert.Equal(t, spec.EpicType, quest.EpicType)
		assert.Equal(t, spec.EpicIndex, quest.EpicIndex)
		assert.Equal(t, spec.EpicLength, quest.EpicLength)
		assert.Equal(t, assignment.Progress, quest.Progress)
		assert.Equal(t, spec.EndProgress, quest.EndProgress)
		assert.Equal(t, spec.Reward, *quest.Reward)
		assert.Equal(t, assignment.Periodicity, *quest.Periodicity)
		assert.False(t, quest.IsClaimable)
		assert.False(t, quest.IsClaimed)
		assert.False(t, quest.IsNew)
	})

	t.Run("is claimable when assignment is completed", func(t *testing.T) {
		assignment := &data.QuestAssignment{
			ID:          100,
			QuestType:   spec.QuestType,
			Periodicity: spec.Periodicity,
			Position:    spec.Position,
			Progress:    20,
			Status:      data.QuestStatusCompleted,
		}

		quest, err := data.NewQuest(spec, assignment, nil)
		require.NoError(t, err)

		assert.True(t, quest.IsClaimable)
	})

	t.Run("is not claimable when assignment is claimed", func(t *testing.T) {
		assignment := &data.QuestAssignment{
			ID:          100,
			QuestType:   spec.QuestType,
			Periodicity: spec.Periodicity,
			Position:    spec.Position,
			Progress:    20,
			Status:      data.QuestStatusClaimed,
		}

		quest, err := data.NewQuest(spec, assignment, nil)
		require.NoError(t, err)

		assert.False(t, quest.IsClaimable)
	})

	t.Run("is claimed when assignment is claimed", func(t *testing.T) {
		assignment := &data.QuestAssignment{
			ID:          100,
			QuestType:   spec.QuestType,
			Periodicity: spec.Periodicity,
			Position:    spec.Position,
			Progress:    20,
			Status:      data.QuestStatusClaimed,
		}

		quest, err := data.NewQuest(spec, assignment, nil)
		require.NoError(t, err)

		assert.True(t, quest.IsClaimed)
	})

	t.Run("is re-rollable", func(t *testing.T) {
		tests := []struct {
			rerolls            uint16
			skypassPremiun     bool
			specRerollable     bool
			expectedRerollable bool
		}{
			{
				rerolls:            0,
				skypassPremiun:     false,
				specRerollable:     true,
				expectedRerollable: true,
			},
			{
				rerolls:            1,
				skypassPremiun:     false,
				specRerollable:     true,
				expectedRerollable: false,
			},
			{
				rerolls:            1,
				skypassPremiun:     true,
				specRerollable:     true,
				expectedRerollable: true,
			},
			{
				rerolls:            2,
				skypassPremiun:     true,
				specRerollable:     true,
				expectedRerollable: false,
			},
		}

		for _, tt := range tests {
			t.Run(fmt.Sprintf(
				"%t when num of rerolls is %d and skypass premium is %t and spec rerollable is %t",
				tt.expectedRerollable,
				tt.rerolls,
				tt.skypassPremiun,
				tt.specRerollable,
			), func(t *testing.T) {
				spec := &data.QuestSpec{
					QuestType:   proto.QuestType(1),
					Periodicity: proto.QuestPeriodicity_WEEKLY,
					Position:    data.QuestPositionTwo,
					Rerollable:  tt.specRerollable,
				}

				assignment := &data.QuestAssignment{
					QuestType:   spec.QuestType,
					Periodicity: spec.Periodicity,
					Position:    spec.Position,
					ReRolls:     tt.rerolls,
				}

				skypassStats := &data.SkypassSeasonStat{
					HasPremium: tt.skypassPremiun,
				}

				quest, err := data.NewQuest(spec, assignment, skypassStats)
				require.NoError(t, err)

				assert.Equal(t, tt.expectedRerollable, quest.IsRerollable)
			})
		}
	})

	t.Run("is new when assignment is new", func(t *testing.T) {
		assignment := &data.QuestAssignment{
			ID:          100,
			QuestType:   spec.QuestType,
			Periodicity: spec.Periodicity,
			Position:    spec.Position,
			Progress:    20,
			IsNew:       true,
		}

		quest, err := data.NewQuest(spec, assignment, nil)
		require.NoError(t, err)

		assert.True(t, quest.IsNew)
	})
}
