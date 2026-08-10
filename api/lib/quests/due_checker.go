package quests

import "github.com/horizon-games/OpenSky/api/data"

type DueCheckerImpl struct {
}

func NewDueChecker() *DueCheckerImpl {
	return &DueCheckerImpl{}
}

func (c *DueCheckerImpl) IsDueToAutoReRoll(spec *data.QuestSpec, assignment *data.QuestAssignment) bool {
	if !spec.Rerollable {
		if assignment.IsInProgress() {
			return false
		}

		if spec.EpicType != nil && spec.EpicIndex != nil && spec.EpicLength != nil && *spec.EpicIndex < *spec.EpicLength {
			return false
		}
	}

	if assignment.IsCompleted() {
		return false
	}

	currentPeriod := GetCurrentPeriod(assignment.Periodicity)

	return assignment.Period < currentPeriod
}

func (c *DueCheckerImpl) IsDueToCopyToCurrentPeriod(spec *data.QuestSpec, assignment *data.QuestAssignment) bool {
	if spec.Rerollable {
		return false
	}

	if assignment.Status != data.QuestStatusInProgress {
		return false
	}

	currentPeriod := GetCurrentPeriod(assignment.Periodicity)

	return assignment.Period < currentPeriod
}
