package pushnotification

import (
	"context"
	"fmt"

	"github.com/OneSignal/onesignal-go-api"
	"github.com/upper/db/v4"

	"github.com/horizon-games/OpenSky/api/config"
	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/proto"
)

var (
	notificationHeading = "OpenSky"
	notificationIcon    = "https://www.skyweaver.net/images/mediakit/logo-black-symbol.png"
)

// Client uses OneSignal to send notifications.
type Client struct {
	client  *onesignal.APIClient
	authCtx context.Context
	appID   string
}

// NewClient instantiates a new Client.
func NewClient(cfg config.PushNotificationsConfig) *Client {
	client := onesignal.NewAPIClient(onesignal.NewConfiguration())

	ctx := context.Background()
	ctx = context.WithValue(ctx, onesignal.AppAuth, cfg.OneSignalAppKey)

	return &Client{
		client:  client,
		authCtx: ctx,
		appID:   cfg.OneSignalAppID,
	}
}

func (c *Client) Send(_ context.Context, accountIDs []proto.AccountID, text string) error {
	if len(accountIDs) == 0 {
		return nil
	}

	if len(text) == 0 {
		return fmt.Errorf("the text cannot be empty")
	}

	var accounts []*data.Account

	err := data.DB.Accounts().Find(db.Cond{"id": db.AnyOf(accountIDs)}).All(&accounts)
	if err != nil {
		return fmt.Errorf("find accounts: %w", err)
	}

	var userIDs []string

	for _, account := range accounts {
		userIDs = append(userIDs, account.Address.String())
	}

	notification := onesignal.NewNotificationWithDefaults()
	notification.SetIsIosNil()
	notification.SetAppId(c.appID)
	notification.SetHeadings(onesignal.StringMap{En: &notificationHeading})
	notification.SetSmallIcon(notificationIcon)
	notification.SetLargeIcon(notificationIcon)
	notification.SetChannelForExternalUserIds("push")

	notification.SetIncludeExternalUserIds(userIDs)
	notification.SetContents(onesignal.StringMap{En: &text})

	_, _, err = c.client.DefaultApi.CreateNotification(c.authCtx).Notification(*notification).Execute()
	if err != nil {
		return fmt.Errorf("send notification: %w", err)
	}

	return nil
}
