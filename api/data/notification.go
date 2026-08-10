package data

import (
	"fmt"
	"time"

	"github.com/upper/db/v4"

	"github.com/horizon-games/OpenSky/api/proto"
)

type Notification struct {
	*proto.Notification
}

func (n *Notification) Store(sess db.Session) db.Store {
	return DB.Notifications(sess)
}

func (n *Notification) Validate() error {
	switch *n.Type {
	case proto.NotificationType_LEADERBOARD_REWARD:
		if n.LeaderboardReward == nil {
			return fmt.Errorf("field `LeaderboardReward` cannot be nil")
		}
	case proto.NotificationType_CONQUEST_V2_REWARD:
		if n.ConquestV2Reward == nil {
			return fmt.Errorf("field `ConquestV2Reward` cannot be nil")
		}
	case proto.NotificationType_ONE_TIME:
		if n.OneTime == nil {
			return fmt.Errorf("field `OneTime` cannot be nil")
		}
	case proto.NotificationType_SKYPASS_LEVEL_INTRODUCTION:
	case proto.NotificationType_SEASON_START:
		if n.SeasonStart == nil {
			return fmt.Errorf("field `SeasonStart` cannot be nil")
		}
	default:
		return fmt.Errorf("unsupported notification type %q", n.Type)
	}

	return nil
}

// BeforeCreate satisfies db.BeforeCreateHook.
func (n *Notification) BeforeCreate(_ db.Session) error {
	if err := n.beforeSave(); err != nil {
		return err
	}

	return nil
}

// BeforeUpdate satisfies db.BeforeUpdateHook.
func (n *Notification) BeforeUpdate(_ db.Session) error {
	if err := n.beforeSave(); err != nil {
		return err
	}

	return nil
}

func (n *Notification) beforeSave() error {
	switch *n.Type {
	case proto.NotificationType_LEADERBOARD_REWARD:
		n.Data = &proto.NotificationData{
			Type:              n.Type,
			LeaderboardReward: n.LeaderboardReward,
		}
	case proto.NotificationType_CONQUEST_V2_REWARD:
		n.Data = &proto.NotificationData{
			Type:             n.Type,
			ConquestV2Reward: n.ConquestV2Reward,
		}
	case proto.NotificationType_ONE_TIME:
		n.Data = &proto.NotificationData{
			Type:    n.Type,
			OneTime: n.OneTime,
		}
	case proto.NotificationType_SKYPASS_LEVEL_INTRODUCTION:
	case proto.NotificationType_SEASON_START:
		n.Data = &proto.NotificationData{
			Type:        n.Type,
			SeasonStart: n.SeasonStart,
		}
	default:
		return fmt.Errorf("%w: %s", proto.ErrUnsupportedNotificationType, n.Type)
	}

	return nil
}

func (n *Notification) afterFind() error {
	switch *n.Type {
	case proto.NotificationType_LEADERBOARD_REWARD:
		n.LeaderboardReward = n.Data.LeaderboardReward
	case proto.NotificationType_CONQUEST_V2_REWARD:
		n.ConquestV2Reward = n.Data.ConquestV2Reward
	case proto.NotificationType_ONE_TIME:
		n.OneTime = n.Data.OneTime
	case proto.NotificationType_SKYPASS_LEVEL_INTRODUCTION:
	case proto.NotificationType_SEASON_START:
		n.SeasonStart = n.Data.SeasonStart
	default:
		return fmt.Errorf("%w: %s", proto.ErrUnsupportedNotificationType, n.Type)
	}

	return nil
}

var (
	_ interface {
		db.Record
		db.Validator
		db.BeforeCreateHook
		db.BeforeUpdateHook
	} = &Notification{}
)

type NotificationsStore struct {
	db.Collection
}

func (s *NotificationsStore) ListValidNotSeen(accountID proto.AccountID) ([]*Notification, error) {
	var notifications []*Notification

	err := s.Find(db.And(
		db.Cond{
			"account_id": accountID,
			"seen_at":    db.IsNull(),
		}),
		db.Or(
			db.Cond{"valid_from": db.IsNull()},
			db.Cond{"valid_from": db.Lte(TimeNowUTC())},
		),
		db.Or(
			db.Cond{"expires_at": db.IsNull()},
			db.Cond{"expires_at": db.Gte(TimeNowUTC())},
		),
	).OrderBy("valid_from", "created_at").All(&notifications)
	if err != nil {
		return nil, err
	}

	for _, notification := range notifications {
		if err := notification.afterFind(); err != nil {
			return nil, fmt.Errorf("after find: %w", err)
		}
	}

	return notifications, nil
}

func (s *NotificationsStore) ListValidOnetime(accountID proto.AccountID) ([]*Notification, error) {
	var notifications []*Notification

	err := s.Find(db.And(
		db.Cond{
			"account_id": accountID,
			"type":       proto.NotificationType_ONE_TIME,
		}),
		db.Or(
			db.Cond{"valid_from": db.IsNull()},
			db.Cond{"valid_from": db.Lte(TimeNowUTC())},
		),
		db.Or(
			db.Cond{"expires_at": db.IsNull()},
			db.Cond{"expires_at": db.Gte(TimeNowUTC())},
		),
	).OrderBy("valid_from", "created_at").All(&notifications)
	if err != nil {
		return nil, err
	}

	for _, notification := range notifications {
		if err := notification.afterFind(); err != nil {
			return nil, fmt.Errorf("after find: %w", err)
		}
	}

	return notifications, nil
}

func (s *NotificationsStore) CreateLeaderboardRewardNotification(data *proto.NotificationLeaderboardReward, accountID proto.AccountID, validFrom, expiresAt *time.Time) (uint64, error) {
	notificationType := proto.NotificationType_LEADERBOARD_REWARD

	notification := &Notification{
		Notification: &proto.Notification{
			AccountID:         accountID,
			Type:              &notificationType,
			LeaderboardReward: data,
			ValidFrom:         validFrom,
			ExpiresAt:         expiresAt,
			PushEnabled:       true,
		},
	}

	err := s.Session().Save(notification)
	if err != nil {
		return 0, fmt.Errorf("save: %w", err)
	}

	return notification.ID, nil
}

func (s *NotificationsStore) CreateConquestV2RewardNotification(data *proto.NotificationConquestV2Reward, accountID proto.AccountID, validFrom, expiresAt *time.Time) (uint64, error) {
	notificationType := proto.NotificationType_CONQUEST_V2_REWARD

	notification := &Notification{
		Notification: &proto.Notification{
			AccountID:        accountID,
			Type:             &notificationType,
			ConquestV2Reward: data,
			ValidFrom:        validFrom,
			ExpiresAt:        expiresAt,
			PushEnabled:      true,
		},
	}

	err := s.Session().Save(notification)
	if err != nil {
		return 0, fmt.Errorf("save: %w", err)
	}

	return notification.ID, nil
}

func (s *NotificationsStore) CreateOneTimeNotification(data *proto.NotificationOneTime, accountID proto.AccountID) (uint64, error) {
	if data == nil {
		return 0, fmt.Errorf("data cannot be nill")
	}

	notificationType := proto.NotificationType_ONE_TIME

	notification := &Notification{
		Notification: &proto.Notification{
			AccountID: accountID,
			Type:      &notificationType,
			OneTime: &proto.NotificationOneTimeWrapper{
				ID:   data.ID,
				Name: data.Name,
				Data: data.Data,
			},
			ValidFrom:   data.ValidFrom,
			ExpiresAt:   data.ExpiresAt,
			PushEnabled: false,
		},
	}

	err := s.Session().Save(notification)
	if err != nil {
		return 0, fmt.Errorf("save: %w", err)
	}

	return notification.ID, nil
}

func (s *NotificationsStore) CreateSkypassLevelIntroductionNotification(accountID proto.AccountID, validFrom, expiresAt *time.Time) (uint64, error) {
	notificationType := proto.NotificationType_SKYPASS_LEVEL_INTRODUCTION

	notification := &Notification{
		Notification: &proto.Notification{
			AccountID: accountID,
			Type:      &notificationType,
			ValidFrom: validFrom,
			ExpiresAt: expiresAt,
		},
	}

	err := s.Session().Save(notification)
	if err != nil {
		return 0, fmt.Errorf("save: %w", err)
	}

	return notification.ID, nil
}

func (s *NotificationsStore) CreateSeasonStartNotification(data *proto.NotificationSeasonStart, accountID proto.AccountID, validFrom, expiresAt *time.Time) (uint64, error) {
	notificationType := proto.NotificationType_SEASON_START

	notification := &Notification{
		Notification: &proto.Notification{
			AccountID:   accountID,
			Type:        &notificationType,
			SeasonStart: data,
			ValidFrom:   validFrom,
			ExpiresAt:   expiresAt,
		},
	}

	err := s.Session().Save(notification)
	if err != nil {
		return 0, fmt.Errorf("save: %w", err)
	}

	return notification.ID, nil
}

func (s *NotificationsStore) ListValidForPush() ([]*Notification, error) {
	var notifications []*Notification

	err := s.Find(db.And(
		db.Cond{
			"push_enabled": true,
			"pushed_at":    db.IsNull(),
		}),
		db.Or(
			db.Cond{"valid_from": db.IsNull()},
			db.Cond{"valid_from": db.Lte(TimeNowUTC())},
		),
		db.Or(
			db.Cond{"expires_at": db.IsNull()},
			db.Cond{"expires_at": db.Gte(TimeNowUTC())},
		),
	).OrderBy("valid_from", "created_at").All(&notifications)
	if err != nil {
		return nil, err
	}

	for _, notification := range notifications {
		if err := notification.afterFind(); err != nil {
			return nil, fmt.Errorf("after find: %w", err)
		}
	}

	return notifications, nil
}

func (s *NotificationsStore) FindAll(conds ...interface{}) ([]*Notification, error) {
	var notifications []*Notification

	err := s.Find(conds...).All(&notifications)
	if err != nil {
		return nil, err
	}

	for _, notification := range notifications {
		err := notification.afterFind()
		if err != nil {
			return nil, fmt.Errorf("after find: %w", err)
		}
	}

	return notifications, nil
}

func (s *NotificationsStore) FindOne(conds ...interface{}) (*Notification, error) {
	var notification *Notification

	err := s.Find(conds...).One(&notification)
	if err != nil {
		return nil, err
	}

	if notification != nil {
		err := notification.afterFind()
		if err != nil {
			return nil, fmt.Errorf("after find: %w", err)
		}
	}

	return notification, nil
}
