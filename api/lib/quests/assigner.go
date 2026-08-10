package quests

import (
	"fmt"
	"math/rand"

	"github.com/upper/db/v4"

	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/proto"
)

type AssignerImpl struct {
	metricsCollector MetricsCollector
}

func NewAssigner(metricsCollector MetricsCollector) *AssignerImpl {
	return &AssignerImpl{
		metricsCollector: metricsCollector,
	}
}

func (a *AssignerImpl) RollNew(
	sess db.Session,
	accountID proto.AccountID,
	periodicity proto.QuestPeriodicity,
	position data.QuestPosition,
	prevSpec *data.QuestSpec,
	prevAssignment *data.QuestAssignment,
) (*proto.Quest, error) {
	period := GetCurrentPeriod(periodicity)

	if prevAssignment == nil {
		exists, err := data.DB.QuestsAssignments(sess).Find(db.Cond{
			"account_id":  accountID,
			"periodicity": periodicity,
			"position":    position,
			"period":      period,
			"active":      true,
		}).Exists()
		if err != nil {
			return nil, fmt.Errorf("find if exists: %w", err)
		}

		if exists {
			return nil, fmt.Errorf("the position already has a quest")
		}
	}

	if prevAssignment != nil {
		prevAssignment.Active = false

		if err := sess.Save(prevAssignment); err != nil {
			return nil, fmt.Errorf("save previous quest assignment: %w", err)
		}
	}

	newSpecs, err := a.newSpecs(sess, accountID, periodicity, position, prevSpec, period)
	if err != nil {
		return nil, fmt.Errorf("find new quest specs with previous spec constraints: %w", err)
	}

	// This is an exception for cases when there is not enough quest specs for the periodicity and position
	// and so the only option is to pick the same quest spec as the last period.
	if len(newSpecs) == 0 && prevAssignment != nil && prevAssignment.Period < period {
		newSpecs, err = a.newSpecs(sess, accountID, periodicity, position, nil, period)
		if err != nil {
			return nil, fmt.Errorf("find new quest specs without previous spec constraints: %w", err)
		}
	}

	if len(newSpecs) == 0 {
		return nil, nil
	}

	// Pick random spec.
	newSpec := newSpecs[rand.Intn(len(newSpecs))]

	// Some quests can be pre-completed
	status := data.QuestStatusInProgress
	progress := newSpec.StartProgress

	if newSpec.StartProgress >= newSpec.EndProgress {
		status = data.QuestStatusCompleted
		progress = newSpec.EndProgress
	}

	rerolls, err := data.DB.QuestsAssignments(sess).FindLatestReRolls(accountID, periodicity, period)
	if err != nil {
		return nil, fmt.Errorf("find latest re-rolls: %w", err)
	}

	newAssignment := &data.QuestAssignment{
		AccountID:   accountID,
		QuestType:   newSpec.QuestType,
		Periodicity: newSpec.Periodicity,
		Position:    newSpec.Position,
		Period:      period,
		Status:      status,
		Active:      true,
		ReRolls:     rerolls,
		Progress:    progress,
	}

	if err := sess.Save(newAssignment); err != nil {
		return nil, fmt.Errorf("save new quest assignment: %w", err)
	}

	skypassStats, err := data.DB.SkypassSeasonStats(sess).FindOrCreate(accountID, data.CurrentSeason())
	if err != nil {
		return nil, fmt.Errorf("find skypass stats: %w", err)
	}

	quest, err := data.NewQuest(newSpec, newAssignment, skypassStats)
	if err != nil {
		return nil, fmt.Errorf("instantiate quest: %w", err)
	}

	return quest, nil
}

func (a *AssignerImpl) newSpecs(
	sess db.Session,
	accountID proto.AccountID,
	periodicity proto.QuestPeriodicity,
	position data.QuestPosition,
	prevSpec *data.QuestSpec,
	period uint16,
) ([]*data.QuestSpec, error) {
	var specs []*data.QuestSpec

	conds := db.And(
		db.Cond{
			"periodicity": periodicity,
			"position":    position,
		},
	)

	questTypesInPeriod, err := data.DB.QuestsAssignments(sess).FindQuestTypesInPeriod(accountID, periodicity, period)
	if err != nil {
		return nil, fmt.Errorf("find quest types in period: %w", err)
	}

	if prevSpec != nil {
		questTypesInPeriod = append(questTypesInPeriod, prevSpec.QuestType)

		if prevSpec.EpicType != nil {
			conds = conds.And(db.Or(
				db.Cond{"epic_type": db.NotEq(prevSpec.EpicType)},
				db.Cond{"epic_type": db.IsNull()},
			))
		}
	}

	if len(questTypesInPeriod) > 0 {
		conds = conds.And(db.Cond{"quest_type": db.NotAnyOf(questTypesInPeriod)})
	}

	if err := data.DB.QuestsSpecs(sess).Find(conds).All(&specs); err != nil {
		return nil, fmt.Errorf("find quest spec: %w", err)
	}

	specs, err = a.filterWithValidRequirements(sess, accountID, specs)
	if err != nil {
		return nil, fmt.Errorf("filter with valid requirements: %w", err)
	}

	return specs, nil
}

func (a *AssignerImpl) filterWithValidRequirements(sess db.Session, accountID proto.AccountID, specs []*data.QuestSpec) ([]*data.QuestSpec, error) {
	var validSpecs []*data.QuestSpec

	specsByEpic := make(map[proto.EpicType][]*data.QuestSpec)

	for _, spec := range specs {
		if spec.EpicType != nil && *spec.EpicIndex > 1 {
			specsByEpic[*spec.EpicType] = append(specsByEpic[*spec.EpicType], spec)
		}
	}

	unlockedHeroes, err := a.getUnlockedHeroes(sess, accountID)
	if err != nil {
		return nil, fmt.Errorf("get unlocked heroes: %w", err)
	}

	unlockedCardIDs, err := a.getUnlockedCardIDs(sess, accountID)
	if err != nil {
		return nil, fmt.Errorf("get unlocked card IDs: %w", err)
	}

	account, err := data.DB.Accounts(sess).FindByID(accountID)
	if err != nil {
		return nil, fmt.Errorf("find account: %w", err)
	}

	for _, spec := range specs {
		if spec.EpicType != nil && *spec.EpicIndex > 1 {
			continue
		}

		if !a.areRequirementsMet(spec, unlockedHeroes, unlockedCardIDs, account) {
			continue
		}

		if spec.EpicType != nil {
			valid := true

			for _, epicSpec := range specsByEpic[*spec.EpicType] {
				if !a.areRequirementsMet(epicSpec, unlockedHeroes, unlockedCardIDs, account) {
					valid = false
					break
				}
			}

			if !valid {
				continue
			}
		}

		validSpecs = append(validSpecs, spec)
	}

	return validSpecs, nil
}

func (a *AssignerImpl) getUnlockedHeroes(sess db.Session, accountID proto.AccountID) (map[proto.Hero]bool, error) {
	items, err := data.DB.Items(sess).FindAccountItems(accountID, proto.ItemType_SW_HERO)
	if err != nil {
		return nil, fmt.Errorf("find account items: %w", err)
	}

	unlockedHeroes := make(map[proto.Hero]bool)

	for _, item := range items {
		if item.Balance.Uint64() > 0 {
			unlockedHeroes[proto.Hero(item.TokenID)] = true
		}
	}

	return unlockedHeroes, nil
}

func (a *AssignerImpl) getUnlockedCardIDs(sess db.Session, accountID proto.AccountID) (map[uint64]bool, error) {
	items, err := data.DB.Items(sess).FindAccountItems(accountID, proto.ItemType_SW_BASE_CARDS, proto.ItemType_SW_SILVER_CARDS, proto.ItemType_SW_GOLD_CARDS)
	if err != nil {
		return nil, fmt.Errorf("find account items: %w", err)
	}

	unlockedCardIDs := make(map[uint64]bool)

	for _, item := range items {
		if item.Balance.Uint64() > 0 {
			unlockedCardIDs[item.TokenID] = true
		}
	}

	return unlockedCardIDs, nil
}

func (a *AssignerImpl) areRequirementsMet(
	spec *data.QuestSpec,
	unlockedHeroes map[proto.Hero]bool,
	unlockedCardIDs map[uint64]bool,
	account *data.Account,
) bool {
	if spec.RequiredHero != nil && !unlockedHeroes[*spec.RequiredHero] {
		return false
	}

	if len(spec.RequiredCards) > 0 {
		valid := true

		for _, cardID := range spec.RequiredCards {
			if !unlockedCardIDs[cardID] {
				valid = false
				break
			}
		}

		if !valid {
			return false
		}
	}

	if spec.RequiredMinLevel != nil && account.Level < *spec.RequiredMinLevel {
		return false
	}

	if spec.RequiredMaxLevel != nil && account.Level > *spec.RequiredMaxLevel {
		return false
	}

	return true
}

func (a *AssignerImpl) MoveUpInEpic(sess db.Session, spec *data.QuestSpec, assignment *data.QuestAssignment) (*proto.Quest, error) {
	if spec == nil {
		return nil, fmt.Errorf("quest spec is nil")
	}

	if assignment == nil {
		return nil, fmt.Errorf("quest assignment is nil")
	}

	if spec.EpicType == nil {
		return nil, fmt.Errorf("it is not epic")
	}

	if *spec.EpicIndex >= *spec.EpicLength {
		return nil, fmt.Errorf("epic does not have more quests")
	}

	var newSpecs []*data.QuestSpec

	conds := db.And(db.Cond{
		"epic_type":  db.Eq(spec.EpicType),
		"epic_index": *spec.EpicIndex + 1,
	})

	if err := data.DB.QuestsSpecs(sess).Find(conds).All(&newSpecs); err != nil {
		return nil, fmt.Errorf("find quest spec: %w", err)
	}

	if len(newSpecs) == 0 {
		return nil, fmt.Errorf("next quest has not been found")
	}

	assignment.Active = false

	if err := sess.Save(assignment); err != nil {
		return nil, fmt.Errorf("save old quest assignment: %w", err)
	}

	newSpec := newSpecs[0]

	// Some quests can be pre-completed
	status := data.QuestStatusInProgress
	progress := newSpec.StartProgress

	if newSpec.StartProgress >= newSpec.EndProgress {
		status = data.QuestStatusCompleted
		progress = newSpec.EndProgress
	}

	newAssignment := &data.QuestAssignment{
		AccountID:   assignment.AccountID,
		QuestType:   newSpec.QuestType,
		Periodicity: assignment.Periodicity,
		Position:    assignment.Position,
		Period:      assignment.Period,
		Status:      status,
		Active:      true,
		ReRolls:     assignment.ReRolls,
		Progress:    progress,
	}

	if err := sess.Save(newAssignment); err != nil {
		return nil, fmt.Errorf("save new quest assignment: %w", err)
	}

	skypassStats, err := data.DB.SkypassSeasonStats(sess).FindOrCreate(assignment.AccountID, data.CurrentSeason())
	if err != nil {
		return nil, fmt.Errorf("find skypass stats: %w", err)
	}

	quest, err := data.NewQuest(newSpec, newAssignment, skypassStats)
	if err != nil {
		return nil, fmt.Errorf("instantiate quest: %w", err)
	}

	a.metricsCollector.TrackQuestMoveUpInEpic(assignment.Periodicity, assignment.Position)

	return quest, nil
}

func (a *AssignerImpl) CopyToCurrentPeriod(sess db.Session, spec *data.QuestSpec, assignment *data.QuestAssignment) (*proto.Quest, error) {
	if spec == nil {
		return nil, fmt.Errorf("quest spec is nil")
	}

	if assignment == nil {
		return nil, fmt.Errorf("quest assignment is nil")
	}

	status := assignment.Status

	assignment.Status = data.QuestStatusFailed
	assignment.Active = false

	if err := sess.Save(assignment); err != nil {
		return nil, fmt.Errorf("save old quest assignment: %w", err)
	}

	period := GetCurrentPeriod(assignment.Periodicity)

	rerolls, err := data.DB.QuestsAssignments(sess).FindLatestReRolls(assignment.AccountID, assignment.Periodicity, period)
	if err != nil {
		return nil, fmt.Errorf("find latest re-rolls: %w", err)
	}

	newAssignment := &data.QuestAssignment{
		AccountID:   assignment.AccountID,
		QuestType:   assignment.QuestType,
		Periodicity: assignment.Periodicity,
		Position:    assignment.Position,
		Period:      period,
		Status:      status,
		Active:      true,
		ReRolls:     rerolls,
		Progress:    assignment.Progress,
	}

	if err := sess.Save(newAssignment); err != nil {
		return nil, fmt.Errorf("save new quest assignment: %w", err)
	}

	if !assignment.IsNew {
		if err := data.DB.QuestsAssignments(sess).SetAsSeen(newAssignment.AccountID, []uint64{newAssignment.ID}); err != nil {
			return nil, fmt.Errorf("set new assignment as seen: %w", err)
		}

		newAssignment.IsNew = false
	}

	skypassStats, err := data.DB.SkypassSeasonStats(sess).FindOrCreate(assignment.AccountID, data.CurrentSeason())
	if err != nil {
		return nil, fmt.Errorf("find skypass stats: %w", err)
	}

	quest, err := data.NewQuest(spec, newAssignment, skypassStats)
	if err != nil {
		return nil, fmt.Errorf("instantiate quest: %w", err)
	}

	a.metricsCollector.TrackQuestCopyToCurrentPeriod(assignment.Periodicity, assignment.Position)

	return quest, nil
}
