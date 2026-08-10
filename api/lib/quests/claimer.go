package quests

import (
	"context"
	"fmt"

	"github.com/rs/zerolog"
	"github.com/upper/db/v4"

	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/lib/analytics"
	"github.com/horizon-games/OpenSky/api/proto"
)

type ClaimerImpl struct {
	logger           zerolog.Logger
	rewardApplier    RewardApplier
	dueChecker       DueChecker
	reRoller         ReRoller
	assigner         Assigner
	metricsCollector MetricsCollector
	analyticsTracker analytics.Tracker
}

func NewClaimer(
	logger zerolog.Logger,
	analyticsTracker analytics.Tracker,
	rewardApplier RewardApplier,
	dueChecker DueChecker,
	reRoller ReRoller,
	assigner Assigner,
	metricsCollector MetricsCollector,
) *ClaimerImpl {
	return &ClaimerImpl{
		logger:           logger,
		analyticsTracker: analyticsTracker,
		rewardApplier:    rewardApplier,
		dueChecker:       dueChecker,
		reRoller:         reRoller,
		assigner:         assigner,
		metricsCollector: metricsCollector,
	}
}

func (c *ClaimerImpl) ManualClaim(ctx context.Context, sess db.Session, accountID proto.AccountID, ids []uint64) ([]*proto.Reward, []*proto.Quest, error) {
	var gainedRewards []*proto.Reward

	var quests []*proto.Quest

	var assignments []*data.QuestAssignment

	err := data.DB.QuestsAssignments(sess).Find(db.Cond{
		"account_id": accountID,
		"id":         db.AnyOf(ids),
	}).All(&assignments)
	if err != nil {
		return nil, nil, fmt.Errorf("find quest assignments: %w", err)
	}

	for _, assignment := range assignments {
		specs, err := data.DB.QuestsSpecs(sess).FindByQuestAssignments(assignment)
		if err != nil {
			return nil, nil, fmt.Errorf("find spec: %w", err)
		}

		if len(specs) != 1 {
			return nil, nil, fmt.Errorf("unexpected amount of quest specs: %d", len(specs))
		}

		spec := specs[0]

		newGainedRewards, err := c.claimRewardsBySpecAndAssignment(sess, spec, assignment)
		if err != nil {
			return nil, nil, fmt.Errorf("claim reward %s: %w", spec.Reward.ItemType, err)
		}

		gainedRewards = append(gainedRewards, newGainedRewards...)

		if c.dueChecker.IsDueToAutoReRoll(spec, assignment) {
			quest, err := c.reRoller.AutoReRoll(ctx, sess, spec, assignment)
			if err != nil {
				return nil, nil, fmt.Errorf("auto re-roll: %w", err)
			}

			quests = append(quests, quest)
		}

		if spec.EpicType != nil && *spec.EpicIndex < *spec.EpicLength {
			quest, err := c.assigner.MoveUpInEpic(sess, spec, assignment)
			if err != nil {
				return nil, nil, fmt.Errorf("move up in epic: %w", err)
			}

			quests = append(quests, quest)
		}

		if err := c.analyticsTracker.TrackCompletedQuestClaim(nil, accountID, assignment); err != nil {
			c.logger.Err(err).Msg("TrackCompletedQuestClaim")
		}

		c.metricsCollector.TrackQuestManualClaim(assignment.Periodicity)
	}

	return gainedRewards, quests, nil
}

func (c *ClaimerImpl) claimRewardsBySpecAndAssignment(sess db.Session, spec *data.QuestSpec, assignment *data.QuestAssignment) ([]*proto.Reward, error) {
	if spec == nil {
		return nil, fmt.Errorf("quest spec cannot be nil")
	}

	if assignment == nil {
		return nil, fmt.Errorf("quest assignment cannot be nil")
	}

	if !assignment.IsCompleted() {
		return nil, fmt.Errorf("quest must be completed")
	}

	gainedRewards, err := c.rewardApplier.ApplyReward(sess, assignment.AccountID, &spec.Reward)
	if err != nil {
		return nil, fmt.Errorf("apply reward %s: %w", spec.Reward.ItemType, err)
	}

	assignment.Rewards = gainedRewards
	assignment.Status = data.QuestStatusClaimed
	assignment.ClaimedAt = data.TimeNowUTCPtr()

	if err := sess.Save(assignment); err != nil {
		return nil, fmt.Errorf("save assignment: %w", err)
	}

	return gainedRewards, nil
}

//go:generate go run go.uber.org/mock/mockgen -destination ./mock/reward_applier.go -package mock . RewardApplier
type RewardApplier interface {
	ApplyReward(db.Session, proto.AccountID, *proto.QuestReward) ([]*proto.Reward, error)
}
