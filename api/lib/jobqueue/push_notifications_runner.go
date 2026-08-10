package jobqueue

import (
	"context"
	"fmt"
	"time"

	"github.com/upper/db/v4"

	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/proto"
)

var _ Runner = &PushNotificationsRunner{}

const (
	PushNotificationsWorkGroup  = "push-notifications"
	PushNotificationsRetryDelay = 10 // in seconds
	PushNotificationsMaxRetries = 5

	PushNotificationsIntervalSeconds = 10

	// TODO: TRANSLATION
	leaderboardRewardPushNotificationText = "Your leaderboard rewards are waiting!"
	// TODO: TRANSLATION
	conquestV2RewardPushNotificationText = "Your conquest treasure is waiting!"
)

type PushNotificationsRunner struct {
	ticker       *time.Ticker
	pushNotifier PushNotifier
}

// NewPushNotificationsRunner instantiates a new PushNotificationsRunner.
func NewPushNotificationsRunner(pushNotifier PushNotifier) (*PushNotificationsRunner, error) {
	return &PushNotificationsRunner{
		pushNotifier: pushNotifier,
	}, nil
}

func (r *PushNotificationsRunner) WorkGroup() string {
	return PushNotificationsWorkGroup
}

func (r *PushNotificationsRunner) Queues() []string {
	return []string{PushNotificationsWorkGroup}
}

func (r *PushNotificationsRunner) MaxBatchSize() int {
	return 1
}

func (r *PushNotificationsRunner) Tick() <-chan time.Time {
	if r.ticker == nil {
		r.ticker = time.NewTicker(30 * time.Second)
	}

	return r.ticker.C
}

func (r *PushNotificationsRunner) RunTasks(ctx context.Context, sess db.Session, tasks []*data.Task) error {
	notifications, err := data.DB.Notifications(sess).ListValidForPush()
	if err != nil {
		UpdateFailedTasks(tasks, PushNotificationsRetryDelay, PushNotificationsMaxRetries)
		return fmt.Errorf("list notifications: %w", err)
	}

	err = r.handleLeaderboardRewards(ctx, notifications)
	if err != nil {
		UpdateFailedTasks(tasks, PushNotificationsRetryDelay, PushNotificationsMaxRetries)
		return fmt.Errorf("handle leaderboard rewards: %w", err)
	}

	err = r.handleConquestV2Rewards(ctx, notifications)
	if err != nil {
		UpdateFailedTasks(tasks, PushNotificationsRetryDelay, PushNotificationsMaxRetries)
		return fmt.Errorf("handle conquest v2 rewards: %w", err)
	}

	for _, notification := range notifications {
		err := sess.Save(notification)
		if err != nil {
			UpdateFailedTasks(tasks, PushNotificationsRetryDelay, PushNotificationsMaxRetries)
			return fmt.Errorf("save notification: %w", err)
		}
	}

	runAt := data.TimeNowUTC().Add(PushNotificationsIntervalSeconds * time.Second)

	for _, task := range tasks {
		task.Try = 0
		task.RunAt = &runAt
	}

	return nil
}

func (r *PushNotificationsRunner) handleLeaderboardRewards(ctx context.Context, notifications []*data.Notification) error {
	accoundIDMap := make(map[proto.AccountID]bool)

	pushedAt := data.TimeNowUTCPtr()

	for _, notification := range notifications {
		if *notification.Type == proto.NotificationType_LEADERBOARD_REWARD {
			accoundIDMap[notification.AccountID] = true

			notification.PushedAt = pushedAt
		}
	}

	if len(accoundIDMap) > 0 {
		var accountIDs []proto.AccountID

		for accountID := range accoundIDMap {
			accountIDs = append(accountIDs, accountID)
		}

		err := r.pushNotifier.Send(ctx, accountIDs, leaderboardRewardPushNotificationText)
		if err != nil {
			return fmt.Errorf("send push notification: %w", err)
		}
	}

	return nil
}

func (r *PushNotificationsRunner) handleConquestV2Rewards(ctx context.Context, notifications []*data.Notification) error {
	accountIDMap := make(map[proto.AccountID]bool)

	pushedAt := data.TimeNowUTCPtr()

	for _, notification := range notifications {
		if *notification.Type == proto.NotificationType_CONQUEST_V2_REWARD {
			accountIDMap[notification.AccountID] = true

			notification.PushedAt = pushedAt
		}
	}

	if len(accountIDMap) > 0 {
		var accountIDs []proto.AccountID

		for accountID := range accountIDMap {
			accountIDs = append(accountIDs, accountID)
		}

		err := r.pushNotifier.Send(ctx, accountIDs, conquestV2RewardPushNotificationText)
		if err != nil {
			return fmt.Errorf("send push notification: %w", err)
		}
	}

	return nil
}

// PushNotifier sends push notifications-
//
//go:generate go run go.uber.org/mock/mockgen -destination ./mock/push_notifier.go -package mock . PushNotifier
type PushNotifier interface {
	Send(context.Context, []proto.AccountID, string) error
}
