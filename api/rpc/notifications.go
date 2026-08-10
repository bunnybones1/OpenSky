package rpc

import (
	"context"
	"sort"

	"github.com/upper/db/v4"

	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/proto"
	"github.com/horizon-games/OpenSky/api/rpc/rctx"
)

func (s *Server) ListNotifications(ctx context.Context) ([]*proto.Notification, error) {
	oplog := rctx.Logger(ctx)
	repo := rctx.DBContext(ctx)

	account, ok := rctx.CurrentAccount(ctx)
	if !ok {
		return nil, proto.ErrorInvalidArgument("session", "missing account")
	}

	err := s.OneTimeNotificationChecker.Check(account)
	if err != nil {
		oplog.Err(err).Msgf("check one time notifications")

		return nil, proto.ErrorInternal("check one time notifications")
	}

	notifications, err := repo.Notifications().ListValidNotSeen(account.ID)
	if err != nil {
		oplog.Err(err).Msgf("list valid notifications")

		return nil, proto.ErrorInternal("list valid notifications failed")
	}

	var response []*proto.Notification

	for _, notification := range notifications {
		response = append(response, notification.Notification)
	}

	return response, nil
}

func (s *Server) SetNotificationsAsSeen(ctx context.Context, notificationsIDs []uint64) (bool, error) {
	oplog := rctx.Logger(ctx)
	repo := rctx.DBContext(ctx)

	account, ok := rctx.CurrentAccount(ctx)
	if !ok {
		return false, proto.ErrorInvalidArgument("session", "missing account")
	}

	if len(notificationsIDs) == 0 {
		return false, proto.ErrorInvalidArgument("notifications", "cannot be empty")
	}

	notifications, err := repo.Notifications().FindAll(db.Cond{
		"account_id": account.ID,
		"seen_at":    db.IsNull(),
		"id":         db.AnyOf(notificationsIDs),
	})
	if err != nil {
		oplog.Err(err).Msgf("find notifications")

		return false, proto.ErrorInternal("find notifications failed")
	}

	for _, notification := range notifications {
		notification.SeenAt = data.TimeNowUTCPtr()

		if err := repo.Save(notification); err != nil {
			oplog.Err(err).Msgf("save notification")

			return false, proto.ErrorInternal("save notification")
		}
	}

	return true, nil
}

func (s *Server) GMCreateOneTimeNotification(ctx context.Context, notification *proto.NotificationOneTime) (*proto.NotificationOneTime, error) {
	oplog := rctx.Logger(ctx)
	repo := rctx.DBContext(ctx)

	account, ok := rctx.CurrentAccount(ctx)
	if !ok {
		return nil, proto.ErrorInvalidArgument("session", "missing account")
	}

	notification.ID = 0
	notification.CreatedAt = nil
	notification.UpdatedBy = &account.ID

	err := repo.Save(&data.NotificationOneTime{NotificationOneTime: notification})
	if err != nil {
		oplog.Err(err).Msgf("save one time notification")

		return nil, proto.ErrorInternal("save one time notification: %v", err)
	}

	var newNotification *data.NotificationOneTime

	err = repo.NotificationsOneTime().Find(db.Cond{"id": notification.ID}).One(&newNotification)
	if err != nil {
		oplog.Err(err).Msgf("find one time notification")

		return nil, proto.ErrorInternal("find one time notification: %v", err)
	}

	return newNotification.NotificationOneTime, nil
}

func (s *Server) GMListOneTimeNotifications(ctx context.Context) ([]*proto.NotificationOneTime, error) {
	oplog := rctx.Logger(ctx)
	repo := rctx.DBContext(ctx)

	_, ok := rctx.CurrentAccount(ctx)
	if !ok {
		return nil, proto.ErrorInvalidArgument("session", "missing account")
	}

	var notifications []*data.NotificationOneTime

	err := repo.NotificationsOneTime().Find().All(&notifications)
	if err != nil {
		oplog.Err(err).Msgf("find all one time notifications")

		return nil, proto.ErrorInternal("find all one time notifications: %v", err)
	}

	var notificationsProto []*proto.NotificationOneTime

	for _, notification := range notifications {
		notificationsProto = append(notificationsProto, notification.NotificationOneTime)
	}

	sort.SliceStable(notificationsProto, func(i, j int) bool {
		return notificationsProto[i].ID > notificationsProto[j].ID
	})

	return notificationsProto, nil
}

func (s *Server) GMUpdateOneTimeNotification(ctx context.Context, notification *proto.NotificationOneTime) (*proto.NotificationOneTime, error) {
	oplog := rctx.Logger(ctx)
	repo := rctx.DBContext(ctx)

	account, ok := rctx.CurrentAccount(ctx)
	if !ok {
		return nil, proto.ErrorInvalidArgument("session", "missing account")
	}

	var existingNotification *data.NotificationOneTime

	err := repo.NotificationsOneTime().Find(db.Cond{"id": notification.ID}).One(&existingNotification)
	if err != nil {
		oplog.Err(err).Msgf("find one time notification")

		return nil, proto.ErrorInternal("find one time notification: %v", err)
	}

	if existingNotification == nil {
		return nil, proto.ErrorInternal("one time notification does not exist")
	}

	existingNotification.Name = notification.Name
	existingNotification.Data = notification.Data
	existingNotification.Filter = notification.Filter
	existingNotification.ValidFrom = notification.ValidFrom
	existingNotification.ExpiresAt = notification.ExpiresAt
	existingNotification.UpdatedBy = &account.ID

	err = repo.Save(existingNotification)
	if err != nil {
		oplog.Err(err).Msgf("save one time notification")

		return nil, proto.ErrorInternal("save one time notification: %v", err)
	}

	return existingNotification.NotificationOneTime, nil
}

func (s *Server) GMDeleteOneTimeNotification(ctx context.Context, id uint64) (bool, error) {
	oplog := rctx.Logger(ctx)
	repo := rctx.DBContext(ctx)

	_, ok := rctx.CurrentAccount(ctx)
	if !ok {
		return false, proto.ErrorInvalidArgument("session", "missing account")
	}

	err := repo.NotificationsOneTime().Find(db.Cond{"id": id}).Delete()
	if err != nil {
		oplog.Err(err).Msgf("delete one time notification")

		return false, proto.ErrorInternal("delete one time notification: %v", err)
	}

	return true, nil
}

// OneTimeNotificationChecker checks one time notifications.
//
//go:generate go run go.uber.org/mock/mockgen -destination ./mock/onetime_notification_checker.go -package mock . OneTimeNotificationChecker
type OneTimeNotificationChecker interface {
	Check(*data.Account) error
}
