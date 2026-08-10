//go:build integration

package skypass_test

import (
	"context"
	"fmt"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/horizon-games/OpenSky/api/apitest"
	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/lib/skypass"
	"github.com/horizon-games/OpenSky/api/proto"
)

func TestSamsungListerRuleApplier(t *testing.T) {
	var accountIDWithSamsungEvent, accountIDWithoutSamsungEvent proto.AccountID

	// Setup
	{
		// Accounts
		{
			var err error

			{
				accountIDWithoutSamsungEvent, _, err = apitest.CreateRandomAccount("TestSamsungListerRuleApplier-without-samsung-event")
				require.NoError(t, err)
			}

			{
				accountIDWithSamsungEvent, _, err = apitest.CreateRandomAccount("TestSamsungListerRuleApplier-with-samsung-event")
				require.NoError(t, err)

				account, err := data.DB.Accounts().FindByID(accountIDWithSamsungEvent)
				require.NoError(t, err)

				registrationEvent := "samsung"
				account.PrivateSettings.RegistrationEvent = &registrationEvent

				err = data.DB.Save(account)
				require.NoError(t, err)
			}
		}
	}

	ctx := context.Background()

	applier := skypass.NewSamsungListerRuleApplier()

	tierFree := proto.SkypassTier_FREE
	tierPremium := proto.SkypassTier_PREMIUM
	itemTypeBaseCard := proto.ItemType_SW_BASE_CARDS
	itemTypeSticker := proto.ItemType_SW_STICKERS

	for _, season := range []uint16{17, 18} {
		t.Run(fmt.Sprintf("seasin %d", season), func(t *testing.T) {
			var reward1, reward2, reward3, reward4, reward5 *data.SkypassReward

			// Setup
			{
				// Rewards
				{
					reward1 = &data.SkypassReward{
						SkypassReward: &proto.SkypassReward{
							Level:    4,
							Season:   season,
							Tier:     &tierFree,
							ItemType: &itemTypeBaseCard,
							Amount:   1,
						},
					}
					require.NoError(t, reward1.Validate())

					reward2 = &data.SkypassReward{
						SkypassReward: &proto.SkypassReward{
							Level:     5,
							Season:    season,
							Tier:      &tierFree,
							ItemType:  &itemTypeBaseCard,
							Amount:    1,
							IsStarter: true,
							Claimed:   true,
						},
					}
					require.NoError(t, reward2.Validate())

					reward3 = &data.SkypassReward{
						SkypassReward: &proto.SkypassReward{
							Level:    5,
							Season:   season,
							Tier:     &tierPremium,
							ItemType: &itemTypeBaseCard,
							Amount:   1,
						},
					}
					require.NoError(t, reward3.Validate())

					reward4 = &data.SkypassReward{
						SkypassReward: &proto.SkypassReward{
							Level:    25,
							Season:   season,
							Tier:     &tierFree,
							ItemType: &itemTypeBaseCard,
							Amount:   1,
						},
					}
					require.NoError(t, reward4.Validate())

					reward5 = &data.SkypassReward{
						SkypassReward: &proto.SkypassReward{
							Level:    25,
							Season:   season,
							Tier:     &tierPremium,
							ItemType: &itemTypeBaseCard,
							Amount:   1,
						},
					}
					require.NoError(t, reward5.Validate())
				}
			}

			inputLevel := []*proto.SkypassLevel{
				{
					Level:   4,
					Rewards: []*proto.SkypassReward{reward1.SkypassReward},
				},
				{
					Level:   5,
					Rewards: []*proto.SkypassReward{reward2.SkypassReward, reward3.SkypassReward},
				},
				{
					Level:   25,
					Rewards: []*proto.SkypassReward{reward4.SkypassReward, reward5.SkypassReward},
				},
			}

			t.Run("replaces free or starter rewards at certain level with stickers when the account has been registered with 'samsung' event", func(t *testing.T) {
				accountID := accountIDWithSamsungEvent

				expectedReward1 := &proto.SkypassReward{
					Level:    5,
					Season:   season,
					Tier:     &tierFree,
					ItemType: &itemTypeSticker,
					Attributes: &proto.SkypassRewardAttributes{
						TokenIDs: []uint64{19},
					},
					Claimable: true,
					Claimed:   reward2.Claimed,
				}

				expectedReward2 := &proto.SkypassReward{
					Level:    25,
					Season:   season,
					Tier:     &tierFree,
					ItemType: &itemTypeSticker,
					Attributes: &proto.SkypassRewardAttributes{
						TokenIDs: []uint64{51},
					},
					Claimable: true,
					Claimed:   reward4.Claimed,
				}

				levels, err := applier.Apply(ctx, accountID, inputLevel, nil)
				require.NoError(t, err)

				require.Len(t, levels, 3)
				var foundReward1, foundReward2 bool
				for _, level := range levels {
					switch level.Level {
					case 4:
						require.Len(t, level.Rewards, 1)
						assert.Equal(t, reward1.SkypassReward, level.Rewards[0])
					case 5:
						require.Len(t, level.Rewards, 2)
						assert.Contains(t, level.Rewards, reward3.SkypassReward)
						assert.Contains(t, level.Rewards, expectedReward1)
						foundReward1 = true
					case 25:
						require.Len(t, level.Rewards, 2)
						assert.Contains(t, level.Rewards, reward5.SkypassReward)
						assert.Contains(t, level.Rewards, expectedReward2)
						foundReward2 = true
					default:
						t.Fail()
					}
				}
				assert.True(t, foundReward1)
				assert.True(t, foundReward2)
			})

			t.Run("does not replace rewards at certain level with stickers when the account has been registered without 'samsung' event", func(t *testing.T) {
				accountID := accountIDWithoutSamsungEvent

				levels, err := applier.Apply(ctx, accountID, inputLevel, nil)
				require.NoError(t, err)

				require.Len(t, levels, 3)
				var foundReward1, foundReward2 bool
				for _, level := range levels {
					switch level.Level {
					case 4:
						require.Len(t, level.Rewards, 1)
						assert.Equal(t, reward1.SkypassReward, level.Rewards[0])
					case 5:
						require.Len(t, level.Rewards, 2)
						assert.Contains(t, level.Rewards, reward2.SkypassReward)
						assert.Contains(t, level.Rewards, reward3.SkypassReward)
						foundReward1 = true
					case 25:
						require.Len(t, level.Rewards, 2)
						assert.Contains(t, level.Rewards, reward4.SkypassReward)
						assert.Contains(t, level.Rewards, reward5.SkypassReward)
						foundReward2 = true
					default:
						t.Fail()
					}
				}
				assert.True(t, foundReward1)
				assert.True(t, foundReward2)
			})
		})
	}
}
