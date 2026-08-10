//go:build integration

package data_test

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/upper/db/v4"

	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/proto"
)

func TestNotificationOneTime(t *testing.T) {
	t.Run("store and retrieve", func(t *testing.T) {
		t.Cleanup(func() {
			err := data.DB.NotificationsOneTime().Truncate()
			require.NoError(t, err)
		})

		notification := &data.NotificationOneTime{
			NotificationOneTime: &proto.NotificationOneTime{
				ID:     0,
				Name:   "name",
				Data:   &proto.NotificationOneTimeData{RawMessage: []byte(`["a","b"]`)},
				Filter: &proto.NotificationOneTimeFilter{RawMessage: []byte(`{"age": [{">": "1h"}]}`)},
			},
		}

		err := data.DB.Save(notification)
		require.NoError(t, err)

		var storedNotification *data.NotificationOneTime

		err = data.DB.NotificationsOneTime().Find(db.Cond{"id": notification.ID}).One(&storedNotification)
		require.NoError(t, err)

		assert.Equal(t, notification, storedNotification)
		assert.NotNil(t, notification.UpdatedAt)
	})

	t.Run("list valid", func(t *testing.T) {
		t.Run("use cases", func(t *testing.T) {
			pastTime := data.TimeNowUTC().Add(-time.Hour)
			futureTime := data.TimeNowUTC().Add(time.Hour)

			tests := []struct {
				useCase              string
				isValid              bool
				validFrom, expiresAt *time.Time
				exclude              bool
			}{
				{
					useCase:   "returns notification when validFrom and expiresAt are not set",
					isValid:   true,
					validFrom: &pastTime,
				},
				{
					useCase:   "returns notification when validFrom is in the past and expiresAt is not set",
					isValid:   true,
					validFrom: &pastTime,
				},
				{
					useCase:   "returns notification when validFrom is in the past and expiresAt is set in the future",
					isValid:   true,
					validFrom: &pastTime,
					expiresAt: &futureTime,
				},
				{
					useCase:   "returns notification when validFrom is not set and expiresAt is set in the future",
					isValid:   true,
					expiresAt: &futureTime,
				},
				{
					useCase: "does not return notification when ID is excluded",
					isValid: false,
					exclude: true,
				},
				{
					useCase:   "does not return notification when validFrom is in the future",
					isValid:   false,
					validFrom: &futureTime,
				},
				{
					useCase:   "does not return notification when expiresAt is in the past",
					isValid:   false,
					expiresAt: &pastTime,
				},
			}

			for _, tt := range tests {
				t.Run(tt.useCase, func(t *testing.T) {
					var notification *data.NotificationOneTime

					// Setup
					{
						notification = &data.NotificationOneTime{
							NotificationOneTime: &proto.NotificationOneTime{
								Name:      tt.useCase,
								ValidFrom: tt.validFrom,
								ExpiresAt: tt.expiresAt,
							},
						}
						err := data.DB.Save(notification)
						require.NoError(t, err)

						t.Cleanup(func() {
							err := data.DB.NotificationsOneTime().Truncate()
							require.NoError(t, err)
						})
					}

					var excludeIDs []uint64

					if tt.exclude {
						excludeIDs = append(excludeIDs, notification.ID)
					}

					notifications, err := data.DB.NotificationsOneTime().ListValid(excludeIDs)
					require.NoError(t, err)

					if tt.isValid {
						assert.NotEmpty(t, notifications)
					} else {
						assert.Empty(t, notifications)
					}
				})
			}
		})
	})
}
