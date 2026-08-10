//go:build integration

package data_test

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/upper/db/v4"

	"github.com/horizon-games/OpenSky/api/apitest"
	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/proto"
)

func TestNotification(t *testing.T) {
	accountID := apitest.RandomAccountID()

	t.Run("store and retrieve", func(t *testing.T) {
		t.Cleanup(func() {
			err := data.DB.Notifications().Truncate()
			require.NoError(t, err)
		})

		t.Run("leaderboard reward", func(t *testing.T) {
			t.Run("fails when LeaderboardReward field is empty", func(t *testing.T) {
				_, err := data.DB.Notifications().CreateLeaderboardRewardNotification(nil, accountID, nil, nil)
				require.ErrorContains(t, err, "cannot be nil")
			})

			t.Run("success", func(t *testing.T) {
				notificationData := &proto.NotificationLeaderboardReward{
					Season:                2,
					Week:                  3,
					SilverCardAmounts:     map[uint64]uint64{123: 456},
					TicketAmount:          4,
					RankedConstructedRank: 11,
					RankedDiscoveryRank:   12,
				}

				id, err := data.DB.Notifications().CreateLeaderboardRewardNotification(notificationData, accountID, nil, nil)
				require.NoError(t, err)

				result, err := data.DB.Notifications().FindOne(db.Cond{"id": id})
				require.NoError(t, err)

				assert.Equal(t, proto.NotificationType_LEADERBOARD_REWARD, *result.Type)
				assert.Equal(t, notificationData, result.LeaderboardReward)
				assert.True(t, result.PushEnabled)
			})
		})

		t.Run("conquest v2 reward", func(t *testing.T) {
			t.Run("fails when ConquestV2Reward field is empty", func(t *testing.T) {
				_, err := data.DB.Notifications().CreateConquestV2RewardNotification(nil, accountID, nil, nil)
				require.ErrorContains(t, err, "cannot be nil")
			})

			t.Run("success", func(t *testing.T) {
				notificationData := &proto.NotificationConquestV2Reward{AmountUSDC: 10}

				id, err := data.DB.Notifications().CreateConquestV2RewardNotification(notificationData, accountID, nil, nil)
				require.NoError(t, err)

				result, err := data.DB.Notifications().FindOne(db.Cond{"id": id})
				require.NoError(t, err)

				assert.Equal(t, proto.NotificationType_CONQUEST_V2_REWARD, *result.Type)
				assert.Equal(t, notificationData, result.ConquestV2Reward)
				assert.True(t, result.PushEnabled)
			})
		})

		t.Run("one time", func(t *testing.T) {
			t.Run("fails when OneTime field is empty", func(t *testing.T) {
				_, err := data.DB.Notifications().CreateOneTimeNotification(nil, accountID)
				require.ErrorContains(t, err, "cannot be nil")
			})

			t.Run("success", func(t *testing.T) {
				oneTimeData := &proto.NotificationOneTimeData{
					RawMessage: []byte(`{}`),
				}
				notificationData := &proto.NotificationOneTime{
					ID:   1,
					Name: "name",
					Data: oneTimeData,
				}
				expectedNotificationData := &proto.NotificationOneTimeWrapper{
					ID:   1,
					Name: "name",
					Data: oneTimeData,
				}

				id, err := data.DB.Notifications().CreateOneTimeNotification(notificationData, accountID)
				require.NoError(t, err)

				result, err := data.DB.Notifications().FindOne(db.Cond{"id": id})
				require.NoError(t, err)

				assert.Equal(t, proto.NotificationType_ONE_TIME, *result.Type)
				assert.Equal(t, expectedNotificationData, result.OneTime)
			})
		})

		t.Run("skypass level introduction", func(t *testing.T) {
			t.Run("success", func(t *testing.T) {
				id, err := data.DB.Notifications().CreateSkypassLevelIntroductionNotification(accountID, nil, nil)
				require.NoError(t, err)

				result, err := data.DB.Notifications().FindOne(db.Cond{"id": id})
				require.NoError(t, err)

				assert.Equal(t, proto.NotificationType_SKYPASS_LEVEL_INTRODUCTION, *result.Type)
				assert.False(t, result.PushEnabled)
			})
		})

		t.Run("season start", func(t *testing.T) {
			t.Run("fails when SeasonStart field is empty", func(t *testing.T) {
				_, err := data.DB.Notifications().CreateSeasonStartNotification(nil, accountID, nil, nil)
				require.ErrorContains(t, err, "cannot be nil")
			})

			t.Run("success", func(t *testing.T) {
				notificationData := &proto.NotificationSeasonStart{SeasonNumber: 2, SeasonName: "Test"}

				id, err := data.DB.Notifications().CreateSeasonStartNotification(notificationData, accountID, nil, nil)
				require.NoError(t, err)

				result, err := data.DB.Notifications().FindOne(db.Cond{"id": id})
				require.NoError(t, err)

				assert.Equal(t, proto.NotificationType_SEASON_START, *result.Type)
				assert.Equal(t, notificationData, result.SeasonStart)
				assert.False(t, result.PushEnabled)
			})
		})
	})

	t.Run("find all", func(t *testing.T) {
		t.Cleanup(func() {
			err := data.DB.Notifications().Truncate()
			require.NoError(t, err)
		})

		t.Run("finds", func(t *testing.T) {
			// Setup
			{
				_, err := data.DB.Notifications().CreateLeaderboardRewardNotification(&proto.NotificationLeaderboardReward{}, accountID, nil, nil)
				require.NoError(t, err)

				_, err = data.DB.Notifications().CreateLeaderboardRewardNotification(&proto.NotificationLeaderboardReward{}, accountID, nil, nil)
				require.NoError(t, err)
			}

			notifications, err := data.DB.Notifications().FindAll(db.Cond{"account_id": accountID})
			require.NoError(t, err)
			assert.Len(t, notifications, 2)
		})

		t.Run("no records", func(t *testing.T) {
			anotherAccountID := apitest.RandomAccountID()

			notifications, err := data.DB.Notifications().FindAll(db.Cond{"account_id": anotherAccountID})
			require.NoError(t, err)
			assert.Len(t, notifications, 0)
		})
	})

	t.Run("find one", func(t *testing.T) {
		t.Cleanup(func() {
			err := data.DB.Notifications().Truncate()
			require.NoError(t, err)
		})

		t.Run("finds", func(t *testing.T) {
			// Setup
			{
				_, err := data.DB.Notifications().CreateLeaderboardRewardNotification(&proto.NotificationLeaderboardReward{}, accountID, nil, nil)
				require.NoError(t, err)
			}

			notification, err := data.DB.Notifications().FindOne(db.Cond{"account_id": accountID})
			require.NoError(t, err)
			assert.NotNil(t, notification)
		})

		t.Run("no records", func(t *testing.T) {
			anotherAccountID := apitest.RandomAccountID()

			notification, err := data.DB.Notifications().FindOne(db.Cond{"account_id": anotherAccountID})
			require.ErrorIs(t, err, db.ErrNoMoreRows)
			assert.Nil(t, notification)
		})
	})

	t.Run("list valid not seen", func(t *testing.T) {
		leaderboardRewardType := proto.NotificationType_LEADERBOARD_REWARD
		leaderboardReward := &proto.NotificationLeaderboardReward{}
		conquestV2RewardType := proto.NotificationType_CONQUEST_V2_REWARD
		conquestV2Reward := &proto.NotificationConquestV2Reward{AmountUSDC: 10}

		t.Run("returns notification with correct data", func(t *testing.T) {
			// Setup
			{
				_, err := data.DB.Notifications().CreateLeaderboardRewardNotification(leaderboardReward, accountID, nil, nil)
				require.NoError(t, err)

				_, err = data.DB.Notifications().CreateConquestV2RewardNotification(conquestV2Reward, accountID, nil, nil)
				require.NoError(t, err)

				t.Cleanup(func() {
					err := data.DB.Notifications().Truncate()
					require.NoError(t, err)
				})
			}

			notifications, err := data.DB.Notifications().ListValidNotSeen(accountID)
			require.NoError(t, err)

			require.Len(t, notifications, 2)

			notification := notifications[0]
			assert.Equal(t, accountID, notification.AccountID)
			assert.Equal(t, &leaderboardRewardType, notification.Type)
			assert.Equal(t, leaderboardReward, notification.LeaderboardReward)

			notification = notifications[1]
			assert.Equal(t, accountID, notification.AccountID)
			assert.Equal(t, &conquestV2RewardType, notification.Type)
			assert.Equal(t, conquestV2Reward, notification.ConquestV2Reward)
		})

		t.Run("use cases", func(t *testing.T) {
			pastTime := data.TimeNowUTC().Add(-time.Hour)
			futureTime := data.TimeNowUTC().Add(time.Hour)

			tests := []struct {
				useCase                      string
				isValid                      bool
				seenAt, validFrom, expiresAt *time.Time
			}{
				{
					useCase:   "returns notification when has not been seen and validFrom and expiresAt are not set",
					isValid:   true,
					validFrom: &pastTime,
				},
				{
					useCase:   "returns notification when has not been seen and validFrom is in the past and expiresAt is not set",
					isValid:   true,
					validFrom: &pastTime,
				},
				{
					useCase:   "returns notification when has not been seen and validFrom is in the past and expiresAt is set in the future",
					isValid:   true,
					validFrom: &pastTime,
					expiresAt: &futureTime,
				},
				{
					useCase:   "returns notification when has not been seen and validFrom is not set and expiresAt is set in the future",
					isValid:   true,
					expiresAt: &futureTime,
				},
				{
					useCase:   "does not return notification when has not been seen and validFrom is in the future",
					isValid:   false,
					validFrom: &futureTime,
				},
				{
					useCase:   "does not return notification when has not been seen and expiresAt is in the past",
					isValid:   false,
					expiresAt: &pastTime,
				},
				{
					useCase: "does not return notification when has been seen",
					isValid: false,
					seenAt:  &pastTime,
				},
			}

			for _, tt := range tests {
				t.Run(tt.useCase, func(t *testing.T) {
					// Setup
					{
						err := data.DB.Save(&data.Notification{
							Notification: &proto.Notification{
								AccountID:        accountID,
								Type:             &conquestV2RewardType,
								ConquestV2Reward: conquestV2Reward,
								SeenAt:           tt.seenAt,
								ValidFrom:        tt.validFrom,
								ExpiresAt:        tt.expiresAt,
							},
						})
						require.NoError(t, err)

						t.Cleanup(func() {
							err := data.DB.Notifications().Truncate()
							require.NoError(t, err)
						})
					}

					notifications, err := data.DB.Notifications().ListValidNotSeen(accountID)
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

	t.Run("list valid one time", func(t *testing.T) {
		oneTimeType := proto.NotificationType_ONE_TIME

		validFrom := data.TimeNowUTC().Add(-time.Hour)
		expiredAt := data.TimeNowUTC().Add(time.Hour)
		oneTime := &proto.NotificationOneTime{
			ID:        2,
			Name:      "name",
			ValidFrom: &validFrom,
			ExpiresAt: &expiredAt,
		}
		oneTimeWrapper := &proto.NotificationOneTimeWrapper{
			ID:   oneTime.ID,
			Name: oneTime.Name,
		}

		t.Run("returns notification with correct data", func(t *testing.T) {
			// Setup
			{
				_, err := data.DB.Notifications().CreateOneTimeNotification(oneTime, accountID)
				require.NoError(t, err)

				t.Cleanup(func() {
					err := data.DB.Notifications().Truncate()
					require.NoError(t, err)
				})
			}

			notifications, err := data.DB.Notifications().ListValidOnetime(accountID)
			require.NoError(t, err)

			require.Len(t, notifications, 1)

			notification := notifications[0]
			assert.Equal(t, accountID, notification.AccountID)
			assert.Equal(t, &oneTimeType, notification.Type)
			assert.Equal(t, oneTimeWrapper, notification.OneTime)
			assert.Equal(t, &validFrom, notification.ValidFrom)
			assert.Equal(t, &expiredAt, notification.ExpiresAt)
		})

		t.Run("use cases", func(t *testing.T) {
			pastTime := data.TimeNowUTC().Add(-time.Hour)
			futureTime := data.TimeNowUTC().Add(time.Hour)

			tests := []struct {
				useCase                      string
				isValid                      bool
				seenAt, validFrom, expiresAt *time.Time
			}{
				{
					useCase:   "returns notification when has not been seen and validFrom and expiresAt are not set",
					isValid:   true,
					validFrom: &pastTime,
				},
				{
					useCase:   "returns notification when has not been seen and validFrom is in the past and expiresAt is not set",
					isValid:   true,
					validFrom: &pastTime,
				},
				{
					useCase:   "returns notification when has not been seen and validFrom is in the past and expiresAt is set in the future",
					isValid:   true,
					validFrom: &pastTime,
					expiresAt: &futureTime,
				},
				{
					useCase:   "returns notification when has not been seen and validFrom is not set and expiresAt is set in the future",
					isValid:   true,
					expiresAt: &futureTime,
				},
				{
					useCase:   "does not return notification when has not been seen and validFrom is in the future",
					isValid:   false,
					validFrom: &futureTime,
				},
				{
					useCase:   "does not return notification when has not been seen and expiresAt is in the past",
					isValid:   false,
					expiresAt: &pastTime,
				},
				{
					useCase: "returns notification when has been seen",
					isValid: true,
					seenAt:  &pastTime,
				},
			}

			for _, tt := range tests {
				t.Run(tt.useCase, func(t *testing.T) {
					// Setup
					{
						err := data.DB.Save(&data.Notification{
							Notification: &proto.Notification{
								AccountID: accountID,
								Type:      &oneTimeType,
								OneTime:   oneTimeWrapper,
								SeenAt:    tt.seenAt,
								ValidFrom: tt.validFrom,
								ExpiresAt: tt.expiresAt,
							},
						})
						require.NoError(t, err)

						t.Cleanup(func() {
							err := data.DB.Notifications().Truncate()
							require.NoError(t, err)
						})
					}

					notifications, err := data.DB.Notifications().ListValidOnetime(accountID)
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

	t.Run("list valid for push", func(t *testing.T) {
		conquestV2RewardType := proto.NotificationType_CONQUEST_V2_REWARD
		conquestV2Reward := &proto.NotificationConquestV2Reward{AmountUSDC: 10}

		t.Run("use cases", func(t *testing.T) {
			pastTime := data.TimeNowUTC().Add(-time.Hour)
			futureTime := data.TimeNowUTC().Add(time.Hour)

			tests := []struct {
				useCase                        string
				isValid                        bool
				pushedAt, validFrom, expiresAt *time.Time
			}{
				{
					useCase:   "returns notification when has not been pushed and validFrom and expiresAt are not set",
					isValid:   true,
					validFrom: &pastTime,
				},
				{
					useCase:   "returns notification when has not been pushed and validFrom is in the past and expiresAt is not set",
					isValid:   true,
					validFrom: &pastTime,
				},
				{
					useCase:   "returns notification when has not been pushed and validFrom is in the past and expiresAt is set in the future",
					isValid:   true,
					validFrom: &pastTime,
					expiresAt: &futureTime,
				},
				{
					useCase:   "returns notification when has not been pushed and validFrom is not set and expiresAt is set in the future",
					isValid:   true,
					expiresAt: &futureTime,
				},
				{
					useCase:   "does not return notification when has not been pushed and validFrom is in the future",
					isValid:   false,
					validFrom: &futureTime,
				},
				{
					useCase:   "does not return notification when has not been pushed and expiresAt is in the past",
					isValid:   false,
					expiresAt: &pastTime,
				},
				{
					useCase:  "does not return notification when has been pushed",
					isValid:  false,
					pushedAt: &pastTime,
				},
			}

			for _, tt := range tests {
				t.Run(tt.useCase, func(t *testing.T) {
					// Setup
					{
						err := data.DB.Save(&data.Notification{
							Notification: &proto.Notification{
								AccountID:        accountID,
								Type:             &conquestV2RewardType,
								ConquestV2Reward: conquestV2Reward,
								ValidFrom:        tt.validFrom,
								ExpiresAt:        tt.expiresAt,
								PushEnabled:      true,
								PushedAt:         tt.pushedAt,
							},
						})
						require.NoError(t, err)

						t.Cleanup(func() {
							err := data.DB.Notifications().Truncate()
							require.NoError(t, err)
						})
					}

					notifications, err := data.DB.Notifications().ListValidForPush()
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
