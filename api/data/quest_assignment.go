package data

import (
	"database/sql/driver"
	"errors"
	"fmt"
	"time"

	"github.com/upper/db/v4"
	"github.com/upper/db/v4/adapter/postgresql"

	"github.com/horizon-games/OpenSky/api/proto"
)

type QuestAssignment struct {
	ID          uint64                 `db:"id,omitempty"`
	AccountID   proto.AccountID        `db:"account_id"`
	QuestType   proto.QuestType        `db:"quest_type"`
	Periodicity proto.QuestPeriodicity `db:"periodicity"`
	Position    QuestPosition          `db:"position"`
	Period      uint16                 `db:"period"`
	Status      QuestStatus            `db:"status"`
	Active      bool                   `db:"active"`
	Progress    uint16                 `db:"progress"`
	ClaimedAt   *time.Time             `db:"claimed_at,omitempty"`
	Rewards     QuestAssignmentRewards `db:"rewards,omitempty"`
	ReRolls     uint16                 `db:"rerolls"`
	IsNew       bool                   `db:"is_new"`
	CreatedAt   *time.Time             `db:"created_at,omitempty"`
}

func (a *QuestAssignment) Store(sess db.Session) db.Store {
	return DB.QuestsAssignments(sess)
}

func (a *QuestAssignment) Validate() error {
	if !a.AccountID.IsValid() {
		return fmt.Errorf("invalid account ID %d", a.AccountID)
	}

	if a.QuestType == proto.QuestType_UNKNOWN {
		return fmt.Errorf("invalid quest type %s", a.QuestType)
	}

	if a.Periodicity == proto.QuestPeriodicity_UNKNOWN || a.Periodicity > proto.QuestPeriodicity_SEASONAL {
		return fmt.Errorf("invalid periodicity %d", a.Periodicity)
	}

	if a.Position == QuestPositionUnknown || a.Position > QuestPositionThree {
		return fmt.Errorf("invalid position %d", a.Position)
	}

	if a.Period == 0 {
		return fmt.Errorf("period cannot be 0")
	}

	if a.Status == QuestStatusUnknown || a.Status > QuestStatusFailed {
		return fmt.Errorf("invalid status %d", a.Status)
	}

	return nil
}

func (a *QuestAssignment) BeforeCreate(_ db.Session) error {
	if a.ID == 0 {
		a.IsNew = true
	}

	return nil
}

func (a *QuestAssignment) IsInProgress() bool {
	return a.Status == QuestStatusInProgress
}

func (a *QuestAssignment) IsCompleted() bool {
	return a.Status == QuestStatusCompleted
}

func (a *QuestAssignment) IsClaimed() bool {
	return a.Status == QuestStatusClaimed
}

var (
	_ interface {
		db.Record
		db.Validator
		db.BeforeCreateHook
	} = &QuestAssignment{}
)

type QuestAssignmentRewards []*proto.Reward

func (r QuestAssignmentRewards) Value() (driver.Value, error) {
	return postgresql.JSONBValue(r)
}

func (r *QuestAssignmentRewards) Scan(src interface{}) error {
	return postgresql.ScanJSONB(r, src)
}

type QuestStatus uint16

func (s QuestStatus) String() string {
	return questStatusToString[s]
}

const (
	QuestStatusUnknown    QuestStatus = 0
	QuestStatusInProgress QuestStatus = 1
	QuestStatusCompleted  QuestStatus = 2
	QuestStatusClaimed    QuestStatus = 3
	QuestStatusFailed     QuestStatus = 4
)

var questStatusToString = map[QuestStatus]string{
	QuestStatusUnknown:    "UNKNOWN",
	QuestStatusInProgress: "IN_PROGRESS",
	QuestStatusCompleted:  "COMPLETED",
	QuestStatusClaimed:    "CLAIMED",
	QuestStatusFailed:     "FAILED",
}

type QuestsAssignmentsStore struct {
	db.Collection
}

func (s *QuestsAssignmentsStore) FindOne(conds ...interface{}) (*QuestAssignment, error) {
	var assignment *QuestAssignment

	if err := s.Find(conds...).One(&assignment); err != nil {
		return nil, fmt.Errorf("find: %w", err)
	}

	return assignment, nil
}

func (s *QuestsAssignmentsStore) FindActive(accountID proto.AccountID) ([]*QuestAssignment, error) {
	var assignments []*QuestAssignment

	err := s.Find(db.Cond{
		"account_id": accountID,
		"active":     true,
	}).All(&assignments)
	if err != nil {
		return nil, fmt.Errorf("find: %w", err)
	}

	return assignments, nil
}

func (s *QuestsAssignmentsStore) IncrementReRolls(assignment *QuestAssignment) error {
	_, err := s.Session().SQL().Exec(`
		UPDATE quests_assignments
		SET rerolls = rerolls + 1
		WHERE account_id = ?
			AND period = ?
			AND periodicity = ?
			AND rerolls = ?
	`, assignment.AccountID, assignment.Period, assignment.Periodicity, assignment.ReRolls)
	if err != nil {
		return fmt.Errorf("update quests assignments: %w", err)
	}

	assignment.ReRolls++

	_, err = s.Session().SQL().Exec(`
		INSERT INTO quests_rerolls (account_id, quests_assignments_id, reroll)
			VALUES(?, ?, ?)
	`, assignment.AccountID, assignment.ID, assignment.ReRolls)
	if err != nil {
		return fmt.Errorf("insert: %w", err)
	}

	return nil
}

func (s *QuestsAssignmentsStore) ResetReRolls(accountID proto.AccountID, periodicity proto.QuestPeriodicity, period uint16) error {
	_, err := s.Session().SQL().Exec(`
		UPDATE quests_assignments
		SET rerolls = 0
		WHERE account_id = ?
			AND period = ?
			AND periodicity = ?
	`, accountID, period, periodicity)
	if err != nil {
		return fmt.Errorf("update quests assignments: %w", err)
	}

	return nil
}

func (s *QuestsAssignmentsStore) FindLatestReRolls(accountID proto.AccountID, periodicity proto.QuestPeriodicity, period uint16) (uint16, error) {
	assignment, err := s.FindOne(db.Cond{
		"account_id":  accountID,
		"periodicity": periodicity,
		"period":      period,
	})
	if err != nil && !errors.Is(err, db.ErrNoMoreRows) {
		return 0, fmt.Errorf("query period: %w", err)
	}

	if assignment == nil || errors.Is(err, db.ErrNoMoreRows) {
		return 0, nil
	}

	return assignment.ReRolls, nil
}

func (s *QuestsAssignmentsStore) FindQuestTypesInPeriod(accountID proto.AccountID, periodicity proto.QuestPeriodicity, period uint16) ([]proto.QuestType, error) {
	var assignments []*QuestAssignment

	err := s.Find(db.Cond{
		"account_id":  accountID,
		"periodicity": periodicity,
		"period":      period,
	}).All(&assignments)
	if err != nil && !errors.Is(err, db.ErrNoMoreRows) {
		return nil, fmt.Errorf("find: %w", err)
	}

	var questTypes []proto.QuestType

	for _, assignment := range assignments {
		questTypes = append(questTypes, assignment.QuestType)
	}

	return questTypes, nil
}

func (s *QuestsAssignmentsStore) SetAsSeen(accountID proto.AccountID, ids []uint64) error {
	_, err := s.Session().SQL().Exec(`
		UPDATE quests_assignments
		SET is_new = false
		WHERE account_id = ?
			AND id IN ?
	`, accountID, ids)
	if err != nil {
		return fmt.Errorf("update quests assignments: %w", err)
	}

	return nil
}
