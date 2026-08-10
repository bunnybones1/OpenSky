package onetimenotification

import (
	"fmt"

	"github.com/scylladb/go-set/u64set"

	"github.com/horizon-games/OpenSky/api/data"
)

type NotificationChecker struct {
	accountValidator AccountValidator
}

func NewNotificationChecker(accountValidator AccountValidator) *NotificationChecker {
	return &NotificationChecker{
		accountValidator: accountValidator,
	}
}

func (c *NotificationChecker) Check(account *data.Account) error {
	currentNotifications, err := data.DB.Notifications().ListValidOnetime(account.ID)
	if err != nil {
		return fmt.Errorf("list current valid one time notifications: %w", err)
	}

	oneTimeNotificationIDs := u64set.New()

	for _, notification := range currentNotifications {
		oneTimeNotificationIDs.Add(notification.OneTime.ID)
	}

	oneTimeNotifications, err := data.DB.NotificationsOneTime().ListValid(oneTimeNotificationIDs.List())
	if err != nil {
		return fmt.Errorf("list valid one time notifications: %w", err)
	}

	if len(oneTimeNotifications) == 0 {
		return nil
	}

	for _, oneTimeNotification := range oneTimeNotifications {
		if oneTimeNotification.Filter != nil && len(oneTimeNotification.Filter.RawMessage) > 0 {
			isValid, err := c.accountValidator.IsValid(oneTimeNotification.Filter.RawMessage, account)
			if err != nil {
				return fmt.Errorf("check whether the account is valid: %w", err)
			}

			if !isValid {
				continue
			}
		}

		_, err := data.DB.Notifications().CreateOneTimeNotification(oneTimeNotification.NotificationOneTime, account.ID)
		if err != nil {
			return fmt.Errorf("create notification: %w", err)
		}
	}

	return nil
}

// AccountValidator validates whether the account is eligible for the notification based on rules..
//
//go:generate go run go.uber.org/mock/mockgen -destination ./mock/account_validator.go -package mock . AccountValidator
type AccountValidator interface {
	IsValid(rules []byte, account *data.Account) (bool, error)
}
