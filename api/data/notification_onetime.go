package data

import (
	"github.com/upper/db/v4"

	"github.com/horizon-games/OpenSky/api/proto"
)

type NotificationOneTime struct {
	*proto.NotificationOneTime
}

func (n *NotificationOneTime) Store(sess db.Session) db.Store {
	return DB.NotificationsOneTime(sess)
}

func (n *NotificationOneTime) Validate() error {
	return nil
}

func (n *NotificationOneTime) BeforeCreate(_ db.Session) error {
	n.UpdatedAt = TimeNowUTCPtr()

	return nil
}

func (n *NotificationOneTime) BeforeUpdate(_ db.Session) error {
	n.UpdatedAt = TimeNowUTCPtr()

	return nil
}

var (
	_ interface {
		db.Record
		db.Validator
		db.BeforeCreateHook
		db.BeforeUpdateHook
	} = &NotificationOneTime{}
)

type NotificationsOneTimeStore struct {
	db.Collection
}

func (s *NotificationsOneTimeStore) ListValid(excludeIDs []uint64) ([]*NotificationOneTime, error) {
	var notifications []*NotificationOneTime

	cond := db.And(
		db.Or(
			db.Cond{"valid_from": db.IsNull()},
			db.Cond{"valid_from": db.Lte(TimeNowUTC())},
		),
		db.Or(
			db.Cond{"expires_at": db.IsNull()},
			db.Cond{"expires_at": db.Gte(TimeNowUTC())},
		),
	)

	if len(excludeIDs) > 0 {
		cond = cond.And(db.Cond{"id": db.NotAnyOf(excludeIDs)})
	}

	err := s.Find(cond).OrderBy("valid_from", "created_at").All(&notifications)
	if err != nil {
		return nil, err
	}

	return notifications, nil
}
