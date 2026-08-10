package data

import (
	"fmt"

	"github.com/horizon-games/OpenSky/api/proto"
)

const (
	QuestFreeReRolls           uint16 = 1
	QuestSkypassPremiumReRolls uint16 = 1
)

func NewQuest(spec *QuestSpec, assignment *QuestAssignment, skypassStats *SkypassSeasonStat) (*proto.Quest, error) {
	if spec == nil {
		return nil, fmt.Errorf("quest spec cannot be nil")
	}

	if assignment == nil {
		return nil, fmt.Errorf("quest assignment cannot be nil")
	}

	rerolls := QuestFreeReRolls

	if skypassStats != nil && skypassStats.HasPremium {
		rerolls += QuestSkypassPremiumReRolls
	}

	var isRerollable bool

	if spec.Rerollable && assignment.ReRolls < rerolls {
		isRerollable = true
	}

	return &proto.Quest{
		ID:           assignment.ID,
		Position:     assignment.Position.Uint16(),
		QuestType:    &assignment.QuestType,
		EpicType:     spec.EpicType,
		EpicIndex:    spec.EpicIndex,
		EpicLength:   spec.EpicLength,
		Progress:     assignment.Progress,
		EndProgress:  spec.EndProgress,
		Reward:       &spec.Reward,
		Periodicity:  &assignment.Periodicity,
		IsRerollable: isRerollable,
		IsClaimable:  assignment.IsCompleted(),
		IsClaimed:    assignment.IsClaimed(),
		IsNew:        assignment.IsNew,
	}, nil
}
