package quests

import (
	"context"
	"errors"
	"fmt"

	"github.com/rs/zerolog"
	"github.com/upper/db/v4"

	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/proto"
)

type Lister struct {
	logger     zerolog.Logger
	dueChecker DueChecker
	reRoller   ReRoller
	assigner   Assigner
}

func NewLister(logger zerolog.Logger, dueChecker DueChecker, roller ReRoller, assigner Assigner) *Lister {
	return &Lister{
		logger:     logger.With().Str("fn", "quests.Lister").Logger(),
		dueChecker: dueChecker,
		reRoller:   roller,
		assigner:   assigner,
	}
}

func (l *Lister) List(ctx context.Context, sess db.Session, accountID proto.AccountID) ([]*proto.Quest, error) {
	assignments, err := data.DB.QuestsAssignments(sess).FindActive(accountID)
	if err != nil {
		return nil, fmt.Errorf("find quest assignments in progress: %w", err)
	}

	specs, err := data.DB.QuestsSpecs(sess).FindByQuestAssignments(assignments...)
	if err != nil {
		return nil, fmt.Errorf("find quest specs by quest assignments: %w", err)
	}

	skypassStats, err := data.DB.SkypassSeasonStats(sess).FindOrCreate(accountID, data.CurrentSeason())
	if err != nil {
		return nil, fmt.Errorf("find skypass stats: %w", err)
	}

	quests, questsToReRoll, questsToCopy, err := l.makeQuests(assignments, specs, skypassStats)
	if err != nil {
		return nil, fmt.Errorf("make quests: %w", err)
	}

	newQuests, err := l.reRoll(ctx, sess, questsToReRoll)
	if err != nil {
		return nil, fmt.Errorf("re-roll: %w", err)
	}

	quests = append(quests, newQuests...)

	newQuests, err = l.copy(sess, questsToCopy)
	if err != nil {
		return nil, fmt.Errorf("copy: %w", err)
	}

	quests = append(quests, newQuests...)

	newQuests, err = l.rollMissing(sess, accountID, quests)
	if err != nil {
		return nil, fmt.Errorf("roll missing: %w", err)
	}

	quests = append(quests, newQuests...)

	return quests, nil
}

func (l *Lister) makeQuests(assignments []*data.QuestAssignment, specs []*data.QuestSpec, skypassStats *data.SkypassSeasonStat) ([]*proto.Quest, []questWrapper, []questWrapper, error) {
	assignmentsByType := make(map[proto.QuestType]*data.QuestAssignment)

	for _, assignment := range assignments {
		assignmentsByType[assignment.QuestType] = assignment
	}

	var quests []*proto.Quest

	var questsToReRoll, questsToCopy []questWrapper

	for _, spec := range specs {
		assignment := assignmentsByType[spec.QuestType]

		if l.dueChecker.IsDueToAutoReRoll(spec, assignment) {
			questsToReRoll = append(questsToReRoll, questWrapper{
				assignment: assignment,
				spec:       spec,
			})

			continue
		}

		if l.dueChecker.IsDueToCopyToCurrentPeriod(spec, assignment) {
			questsToCopy = append(questsToCopy, questWrapper{
				assignment: assignment,
				spec:       spec,
			})

			continue
		}

		quest, err := data.NewQuest(spec, assignmentsByType[spec.QuestType], skypassStats)
		if err != nil {
			return nil, nil, nil, fmt.Errorf("instantiate quest: %w", err)
		}

		quests = append(quests, quest)
	}

	return quests, questsToReRoll, questsToCopy, nil
}

func (l *Lister) reRoll(ctx context.Context, sess db.Session, questsToReRoll []questWrapper) ([]*proto.Quest, error) {
	var quests []*proto.Quest

	for _, questToReRoll := range questsToReRoll {
		quest, err := l.reRoller.AutoReRoll(ctx, sess, questToReRoll.spec, questToReRoll.assignment)
		if err != nil {
			return nil, fmt.Errorf("auto re-roll quest ID %d: %w", questToReRoll.assignment.ID, err)
		}

		if quest == nil {
			continue
		}

		quests = append(quests, quest)
	}

	return quests, nil
}

func (l *Lister) copy(sess db.Session, questsToCopy []questWrapper) ([]*proto.Quest, error) {
	var quests []*proto.Quest

	for _, questToCopy := range questsToCopy {
		quest, err := l.assigner.CopyToCurrentPeriod(sess, questToCopy.spec, questToCopy.assignment)
		if err != nil {
			return nil, fmt.Errorf("copy quest ID %d: %w", questToCopy.assignment.ID, err)
		}

		if quest == nil {
			continue
		}

		quests = append(quests, quest)
	}

	return quests, nil
}

func (l *Lister) rollMissing(sess db.Session, accountID proto.AccountID, quests []*proto.Quest) ([]*proto.Quest, error) {
	var newQuests []*proto.Quest

	layoutForMissingQuests := map[proto.QuestPeriodicity]map[data.QuestPosition]bool{
		proto.QuestPeriodicity_DAILY: {
			data.QuestPositionOne:   true,
			data.QuestPositionTwo:   true,
			data.QuestPositionThree: true,
		},
		proto.QuestPeriodicity_WEEKLY: {
			data.QuestPositionOne:   true,
			data.QuestPositionTwo:   true,
			data.QuestPositionThree: true,
		},
		proto.QuestPeriodicity_SEASONAL: {
			data.QuestPositionOne:   true,
			data.QuestPositionTwo:   true,
			data.QuestPositionThree: true,
		},
	}

	for _, quest := range quests {
		layoutForMissingQuests[*quest.Periodicity][data.QuestPosition(quest.Position)] = false
	}

	for periodicity, positions := range layoutForMissingQuests {
		for position, isMissing := range positions {
			if isMissing {
				quest, err := l.assigner.RollNew(sess, accountID, periodicity, position, nil, nil)
				if err != nil {
					l.logger.Err(err).
						Uint64("acount_id", accountID.UInt64()).
						Stringer("periodicity", periodicity).
						Uint16("position", position.Uint16()).
						Msg("roll new quest")

					continue
				}

				if quest != nil {
					newQuests = append(newQuests, quest)
				}
			}
		}
	}

	return newQuests, nil
}

func (l *Lister) ListEpicChain(sess db.Session, accountID proto.AccountID, epicType proto.EpicType) ([]*proto.Quest, error) {
	if epicType == proto.EpicType_UNKNOWN {
		return nil, fmt.Errorf("epic type cannot be unknown")
	}

	skypassStats, err := data.DB.SkypassSeasonStats(sess).FindOrCreate(accountID, data.CurrentSeason())
	if err != nil {
		return nil, fmt.Errorf("find or create skypass season stats: %w", err)
	}

	var specs []*data.QuestSpec

	err = data.DB.QuestsSpecs(sess).Find(db.Cond{
		"epic_type": epicType,
	}).OrderBy("epic_index").All(&specs)
	if err != nil {
		return nil, fmt.Errorf("find quest specs: %w", err)
	}

	var questTypes []proto.QuestType

	for _, spec := range specs {
		questTypes = append(questTypes, spec.QuestType)
	}

	activeAssignment, err := data.DB.QuestsAssignments(sess).FindOne(db.Cond{
		"account_id": accountID,
		"quest_type": db.AnyOf(questTypes),
		"active":     true,
	})
	if err != nil && !errors.Is(err, db.ErrNoMoreRows) {
		return nil, fmt.Errorf("find active quest assignment: %w", err)
	}

	var activeSpec *data.QuestSpec

	if activeAssignment != nil && !errors.Is(err, db.ErrNoMoreRows) {
		for _, spec := range specs {
			if spec.QuestType == activeAssignment.QuestType {
				activeSpec = spec
				break
			}
		}
	}

	var quests []*proto.Quest

	for _, spec := range specs {
		assignment := &data.QuestAssignment{
			QuestType:   spec.QuestType,
			Periodicity: spec.Periodicity,
			Position:    spec.Position,
		}

		if activeSpec != nil {
			if *spec.EpicIndex < *activeSpec.EpicIndex {
				var latestAssignment *data.QuestAssignment

				err := data.DB.QuestsAssignments(sess).Find(db.Cond{
					"account_id": accountID,
					"quest_type": spec.QuestType,
				}).OrderBy("-id").One(&latestAssignment)
				if err != nil && !errors.Is(err, db.ErrNoMoreRows) {
					return nil, fmt.Errorf("find latest quest assignment: %w", err)
				}

				if latestAssignment != nil && !errors.Is(err, db.ErrNoMoreRows) {
					assignment = latestAssignment
				}
			}

			if *spec.EpicIndex == *activeSpec.EpicIndex {
				assignment = activeAssignment
			}
		}

		quest, err := data.NewQuest(spec, assignment, skypassStats)
		if err != nil {
			return nil, fmt.Errorf("new quest: %w", err)
		}

		quests = append(quests, quest)
	}

	return quests, nil
}

type questWrapper struct {
	assignment *data.QuestAssignment
	spec       *data.QuestSpec
}

//go:generate go run go.uber.org/mock/mockgen -destination ./mock/due_checker.go -package mock . DueChecker
type DueChecker interface {
	IsDueToAutoReRoll(*data.QuestSpec, *data.QuestAssignment) bool
	IsDueToCopyToCurrentPeriod(*data.QuestSpec, *data.QuestAssignment) bool
}

//go:generate go run go.uber.org/mock/mockgen -destination ./mock/reroller.go -package mock . ReRoller
type ReRoller interface {
	AutoReRoll(context.Context, db.Session, *data.QuestSpec, *data.QuestAssignment) (*proto.Quest, error)
}
