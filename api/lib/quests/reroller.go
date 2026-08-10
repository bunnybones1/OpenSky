package quests

import (
	"context"
	"errors"
	"fmt"

	"github.com/rs/zerolog"
	"github.com/upper/db/v4"

	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/lib/analytics"
	"github.com/horizon-games/OpenSky/api/proto"
)

type ReRollerImpl struct {
	logger           zerolog.Logger
	analyticsTracker analytics.Tracker
	dueChecker       DueChecker
	assigner         Assigner
	metricsCollector MetricsCollector
}

func NewReRoller(logger zerolog.Logger, analyticsTracker analytics.Tracker, dueChecker DueChecker, assigner Assigner, metricsCollector MetricsCollector) *ReRollerImpl {
	return &ReRollerImpl{
		logger:           logger,
		analyticsTracker: analyticsTracker,
		dueChecker:       dueChecker,
		assigner:         assigner,
		metricsCollector: metricsCollector,
	}
}

func (r *ReRollerImpl) AutoReRoll(ctx context.Context, sess db.Session, spec *data.QuestSpec, assignment *data.QuestAssignment) (*proto.Quest, error) {
	if !r.dueChecker.IsDueToAutoReRoll(spec, assignment) {
		return nil, fmt.Errorf("quest is not due to auto re-roll")
	}

	if assignment.IsInProgress() {
		assignment.Status = data.QuestStatusFailed

		if err := sess.Save(assignment); err != nil {
			return nil, fmt.Errorf("save failed quest: %w", err)
		}
	}

	quest, err := r.assigner.RollNew(sess, assignment.AccountID, assignment.Periodicity, assignment.Position, spec, assignment)
	if err != nil {
		return nil, fmt.Errorf("roll new: %w", err)
	}

	r.metricsCollector.TrackQuestAutoReRoll(assignment.Periodicity, assignment.Position)

	if err := r.analyticsTracker.TrackRerollQuest(nil, assignment.AccountID, assignment); err != nil {
		r.logger.Err(err).Msg("TrackRerollQuest")
	}

	return quest, nil
}

func (r *ReRollerImpl) ManualReRoll(ctx context.Context, sess db.Session, accountID proto.AccountID, id uint64) ([]*proto.Reward, *proto.Quest, error) {
	var gainedRewards []*proto.Reward

	assignment, err := data.DB.QuestsAssignments(sess).FindOne(db.Cond{
		"account_id": accountID,
		"id":         id,
	})
	if err != nil && !errors.Is(err, db.ErrNoMoreRows) {
		return nil, nil, fmt.Errorf("find quest assignment: %w", err)
	}

	if assignment == nil || errors.Is(err, db.ErrNoMoreRows) {
		return nil, nil, fmt.Errorf("quest assignment does not exist, ID: %d", id)
	}

	specs, err := data.DB.QuestsSpecs(sess).FindByQuestAssignments(assignment)
	if err != nil {
		return nil, nil, fmt.Errorf("find spec: %w", err)
	}

	if len(specs) != 1 {
		return nil, nil, fmt.Errorf("unexpected amount of quest specs: %d", len(specs))
	}

	spec := specs[0]

	skypassStats, err := data.DB.SkypassSeasonStats(sess).FindOrCreate(accountID, data.CurrentSeason())
	if err != nil {
		return nil, nil, fmt.Errorf("find skypass stats: %w", err)
	}

	quest, err := data.NewQuest(spec, assignment, skypassStats)
	if err != nil {
		return nil, nil, fmt.Errorf("make quest: %w", err)
	}

	if !quest.IsRerollable {
		return nil, nil, fmt.Errorf("no available re-roll")
	}

	if !assignment.IsInProgress() {
		return nil, nil, fmt.Errorf("the quest is not in progress: %d", assignment.ID)
	}

	assignment.Status = data.QuestStatusFailed

	if err := sess.Save(assignment); err != nil {
		return nil, nil, fmt.Errorf("save failed quest: %w", err)
	}

	if err := data.DB.QuestsAssignments(sess).IncrementReRolls(assignment); err != nil {
		return nil, nil, fmt.Errorf("update re-rolls: %w", err)
	}

	quest, err = r.assigner.RollNew(sess, assignment.AccountID, assignment.Periodicity, assignment.Position, spec, assignment)
	if err != nil {
		return nil, nil, fmt.Errorf("roll new: %w", err)
	}

	r.metricsCollector.TrackQuestManualReRoll(assignment.Periodicity, assignment.Position, assignment.ReRolls)

	if err := r.analyticsTracker.TrackRerollQuest(nil, assignment.AccountID, assignment); err != nil {
		r.logger.Err(err).Msg("TrackRerollQuest")
	}

	return gainedRewards, quest, nil
}

//go:generate go run go.uber.org/mock/mockgen -destination ./mock/assigner.go -package mock . Assigner
type Assigner interface {
	RollNew(sess db.Session, accountID proto.AccountID, periodicity proto.QuestPeriodicity, position data.QuestPosition, prevSpec *data.QuestSpec, prevAssignment *data.QuestAssignment) (*proto.Quest, error)
	MoveUpInEpic(db.Session, *data.QuestSpec, *data.QuestAssignment) (*proto.Quest, error)
	CopyToCurrentPeriod(db.Session, *data.QuestSpec, *data.QuestAssignment) (*proto.Quest, error)
}
