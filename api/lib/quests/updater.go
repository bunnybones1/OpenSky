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

type Updater struct {
	logger           zerolog.Logger
	analyticsTracker analytics.Tracker
}

func NewUpdater(logger zerolog.Logger, analyticsTracker analytics.Tracker) *Updater {
	return &Updater{
		analyticsTracker: analyticsTracker,
	}
}

func (u *Updater) UpdateFromMatch(ctx context.Context, sess db.Session, accountID proto.AccountID, progress map[uint64]uint16) error {
	for questID, questProgress := range progress {
		assignment, err := data.DB.QuestsAssignments(sess).FindOne(db.Cond{
			"id":         questID,
			"account_id": accountID,
		})
		if err != nil {
			return fmt.Errorf("find quest assignment with ID %d: %w", questID, err)
		}

		specs, err := data.DB.QuestsSpecs(sess).FindByQuestAssignments(assignment)
		if err != nil {
			return fmt.Errorf("find quest specs with quest type %s: %w", assignment.QuestType, err)
		}

		if len(specs) == 0 {
			return fmt.Errorf("quest spec with quest type %s has not been found", assignment.QuestType)
		}

		spec := specs[0]

		if assignment.Status == data.QuestStatusInProgress {
			assignment.Progress += questProgress

			if assignment.Progress >= spec.EndProgress {
				assignment.Progress = spec.EndProgress
				assignment.Status = data.QuestStatusCompleted
			}

			if err := u.analyticsTracker.TrackQuestCompletion(nil, accountID, assignment); err != nil {
				// log and continue (not a fatal error)
				u.logger.Err(err).Msg("TrackQuestCompletion")
			}

			if err := sess.Save(assignment); err != nil {
				return fmt.Errorf("save: %w", err)
			}
		}
	}

	return nil
}
