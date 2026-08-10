//go:build integration

package skypass_test

import (
	"context"
	"fmt"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/horizon-games/OpenSky/api/apitest"
	"github.com/horizon-games/OpenSky/api/config"
	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/lib/skypass"
	"github.com/horizon-games/OpenSky/api/proto"
)

func TestCSVRewardUpdater(t *testing.T) {
	cfg := config.OpenSkySkypassConfig{
		DisabledOnlyFutureRewardsUpdateProtection: true,
	}
	updater := skypass.NewCSVRewardUpdater(cfg)

	ctx := context.Background()

	t.Run("update from reader", func(t *testing.T) {
		accountID := apitest.RandomAccountID()

		t.Run("parses data", func(t *testing.T) {
			validLevel := "1"
			validTierName := proto.SkypassTier_FREE.String()
			validItemTypeName := proto.ItemType_SW_BASE_CARDS.String()
			validAmount := "1"

			t.Run("level", func(t *testing.T) {
				tests := []struct {
					testName      string
					input         string
					expectedValue uint16
					expectedError error
				}{
					{
						testName:      "success when it is zero",
						input:         "0 ",
						expectedValue: 0,
					},
					{
						testName:      "success when it is greater then zero",
						input:         " 5",
						expectedValue: 5,
					},
					{
						testName:      "fails when it is empty",
						input:         "",
						expectedError: skypass.ErrInvalidLevel,
					},
					{
						testName:      "fails when it is negative",
						input:         "-1",
						expectedError: skypass.ErrInvalidLevel,
					},
				}

				for _, tt := range tests {
					t.Run(tt.testName, func(t *testing.T) {
						reader := strings.NewReader(getCSVRewards(tt.input, validTierName, validItemTypeName, validAmount, "", "", "", ""))

						rewards, err := updater.UpdateFromReader(ctx, accountID, 1, reader)

						if tt.expectedError == nil {
							require.NoError(t, err)

							require.Len(t, rewards, 1)
							assert.Equal(t, tt.expectedValue, rewards[0].Level)
						} else {
							require.ErrorIs(t, err, tt.expectedError)
							assert.Empty(t, rewards)
						}
					})
				}
			})

			t.Run("tier", func(t *testing.T) {
				for _, tierName := range proto.SkypassTier_name {
					if tierName == proto.SkypassTier_UNKNOWN.String() {
						continue
					}

					t.Run(fmt.Sprintf("success when it is defined in %s", tierName), func(t *testing.T) {
						reader := strings.NewReader(getCSVRewards(validLevel, tierName, validItemTypeName, validAmount, "", "", "", ""))

						rewards, err := updater.UpdateFromReader(ctx, accountID, 1, reader)
						require.NoError(t, err)

						require.Len(t, rewards, 1)
						assert.Equal(t, tierName, rewards[0].Tier.String())
					})
				}

				t.Run("fails when it is not invalid", func(t *testing.T) {
					reader := strings.NewReader(getCSVRewards(validLevel, "invalid", validItemTypeName, validAmount, "", "", "", ""))

					rewards, err := updater.UpdateFromReader(ctx, accountID, 1, reader)
					require.ErrorIs(t, err, skypass.ErrInvalidTier)
					assert.Empty(t, rewards)
				})
			})

			t.Run("item type", func(t *testing.T) {
				t.Run("success when it is valid", func(t *testing.T) {
					itemTypeName := proto.ItemType_SW_BASE_CARDS.String()

					reader := strings.NewReader(getCSVRewards(validLevel, validTierName, itemTypeName, validAmount, "", "", "", ""))

					rewards, err := updater.UpdateFromReader(ctx, accountID, 1, reader)
					require.NoError(t, err)

					require.Len(t, rewards, 1)
					assert.Equal(t, itemTypeName, rewards[0].ItemType.String())
				})

				t.Run("fails when it is invalid", func(t *testing.T) {
					reader := strings.NewReader(getCSVRewards(validLevel, validTierName, "invalid", validAmount, "", "", "", ""))

					rewards, err := updater.UpdateFromReader(ctx, accountID, 1, reader)
					require.ErrorIs(t, err, skypass.ErrInvalidItemType)
					assert.Empty(t, rewards)
				})
			})

			t.Run("amount", func(t *testing.T) {
				tests := []struct {
					testName      string
					input         string
					expectedValue uint16
					expectedError error
				}{
					{
						testName: "success when it is zero",
						input:    "0 ",
					},
					{
						testName:      "success when it is greater then zero",
						input:         " 5",
						expectedValue: 5,
					},
					{
						testName: "success when it is empty",
						input:    " ",
					},
					{
						testName:      "fails when it is negative",
						input:         "-1",
						expectedError: skypass.ErrInvalidAmount,
					},
				}

				for _, tt := range tests {
					t.Run(tt.testName, func(t *testing.T) {
						var tokenIDs string

						if tt.expectedValue == 0 {
							tokenIDs = "1"
						}

						reader := strings.NewReader(getCSVRewards(validLevel, validTierName, validItemTypeName, tt.input, "", tokenIDs, "", ""))

						rewards, err := updater.UpdateFromReader(ctx, accountID, 1, reader)

						if tt.expectedError == nil {
							require.NoError(t, err)

							require.Len(t, rewards, 1)
							assert.Equal(t, tt.expectedValue, rewards[0].Amount)
						} else {
							require.ErrorIs(t, err, tt.expectedError)
							assert.Empty(t, rewards)
						}
					})
				}
			})

			t.Run("is starter", func(t *testing.T) {
				tests := []struct {
					testName      string
					input         string
					expectedValue bool
					expectedError error
				}{
					{
						testName:      "true when it is 1",
						input:         " 1",
						expectedValue: true,
					},
					{
						testName: "false when it is 0",
						input:    "0 ",
					},
					{
						testName: "false when it is empty",
						input:    " ",
					},
					{
						testName:      "fails when it is negative",
						input:         "-1",
						expectedError: skypass.ErrInvalidIsStarter,
					},
					{
						testName:      "fails when it is greater then 1",
						input:         "2",
						expectedError: skypass.ErrInvalidIsStarter,
					},
				}

				for _, tt := range tests {
					t.Run(tt.testName, func(t *testing.T) {
						reader := strings.NewReader(getCSVRewards(validLevel, validTierName, validItemTypeName, validAmount, tt.input, "", "", ""))

						rewards, err := updater.UpdateFromReader(ctx, accountID, 1, reader)

						if tt.expectedError == nil {
							require.NoError(t, err)

							require.Len(t, rewards, 1)
							assert.Equal(t, tt.expectedValue, rewards[0].IsStarter)
						} else {
							require.ErrorIs(t, err, tt.expectedError)
							assert.Empty(t, rewards)
						}
					})
				}
			})

			t.Run("token IDs", func(t *testing.T) {
				tests := []struct {
					testName      string
					input         string
					expectedValue []uint64
					expectedError error
				}{
					{
						testName:      "success when it is numbers separated by comma",
						input:         "1, 2",
						expectedValue: []uint64{1, 2},
					},
					{
						testName: "success when it is empty",
						input:    " ",
					},
					{
						testName:      "fails when the number is negative",
						input:         "1,-2",
						expectedError: skypass.ErrInvalidTokenIDs,
					},
				}

				for _, tt := range tests {
					t.Run(tt.testName, func(t *testing.T) {
						var amount string

						if len(tt.expectedValue) == 0 {
							amount = "1"
						}

						reader := strings.NewReader(getCSVRewards(validLevel, validTierName, validItemTypeName, amount, "", tt.input, "", ""))

						rewards, err := updater.UpdateFromReader(ctx, accountID, 1, reader)

						if tt.expectedError == nil {
							require.NoError(t, err)

							require.Len(t, rewards, 1)
							if len(tt.expectedValue) > 0 {
								require.NotNil(t, rewards[0].Attributes)
								assert.Equal(t, tt.expectedValue, rewards[0].Attributes.TokenIDs)
							} else {
								assert.Nil(t, rewards[0].Attributes)
							}
						} else {
							require.ErrorIs(t, err, tt.expectedError)
							assert.Empty(t, rewards)
						}
					})
				}
			})

			t.Run("card sets", func(t *testing.T) {
				cardSet1 := proto.CardSet_CORE_SET
				cardSet2 := proto.CardSet_CORE_EXPANSION

				tests := []struct {
					testName      string
					input         string
					expectedValue []*proto.CardSet
				}{
					{
						testName:      "success when it is strings separated by comma",
						input:         "CORE_SET, CORE_EXPANSION",
						expectedValue: []*proto.CardSet{&cardSet1, &cardSet2},
					},
					{
						testName: "success when it is empty",
						input:    " ",
					},
				}

				for _, tt := range tests {
					t.Run(tt.testName, func(t *testing.T) {
						reader := strings.NewReader(getCSVRewards(validLevel, validTierName, validItemTypeName, validAmount, "", "", tt.input, ""))

						rewards, err := updater.UpdateFromReader(ctx, accountID, 1, reader)
						require.NoError(t, err)

						require.Len(t, rewards, 1)
						if len(tt.expectedValue) > 0 {
							require.NotNil(t, rewards[0].Attributes)
							assert.Equal(t, tt.expectedValue, rewards[0].Attributes.CardSets)
						} else {
							assert.Nil(t, rewards[0].Attributes)
						}
					})
				}

				t.Run("fails when it is invalid", func(t *testing.T) {
					reader := strings.NewReader(getCSVRewards(validLevel, validTierName, validItemTypeName, validAmount, "", "", "invalid", ""))

					rewards, err := updater.UpdateFromReader(ctx, accountID, 1, reader)
					require.ErrorIs(t, err, skypass.ErrInvalidCardSets)
					assert.Empty(t, rewards)
				})
			})

			t.Run("card sets excluded", func(t *testing.T) {
				cardSet1 := proto.CardSet_CORE_SET
				cardSet2 := proto.CardSet_CORE_EXPANSION

				tests := []struct {
					testName      string
					input         string
					expectedValue []*proto.CardSet
				}{
					{
						testName:      "success when it is strings separated by comma",
						input:         "CORE_SET, CORE_EXPANSION",
						expectedValue: []*proto.CardSet{&cardSet1, &cardSet2},
					},
					{
						testName: "success when it is empty",
						input:    " ",
					},
				}

				for _, tt := range tests {
					t.Run(tt.testName, func(t *testing.T) {
						reader := strings.NewReader(getCSVRewards(validLevel, validTierName, validItemTypeName, validAmount, "", "", "", tt.input))

						rewards, err := updater.UpdateFromReader(ctx, accountID, 1, reader)
						require.NoError(t, err)

						require.Len(t, rewards, 1)
						if len(tt.expectedValue) > 0 {
							require.NotNil(t, rewards[0].Attributes)
							assert.Equal(t, tt.expectedValue, rewards[0].Attributes.CardSetsExcluded)
						} else {
							assert.Nil(t, rewards[0].Attributes)
						}
					})
				}

				t.Run("fails when it is invalid", func(t *testing.T) {
					reader := strings.NewReader(getCSVRewards(validLevel, validTierName, validItemTypeName, validAmount, "", "", "", "invalid"))

					rewards, err := updater.UpdateFromReader(ctx, accountID, 1, reader)
					require.ErrorIs(t, err, skypass.ErrInvalidCardSetsExcluded)
					assert.Empty(t, rewards)
				})
			})
		})

		t.Run("handles storing", func(t *testing.T) {
			season := uint16(2)
			level := uint16(3)
			tier := proto.SkypassTier_FREE
			itemType := proto.ItemType_SW_BASE_CARDS

			t.Run("creates new reward when with the same level, tier and is starter does not exist", func(t *testing.T) {
				// Setup
				{
					// Skypass rewards
					{
						t.Cleanup(func() {
							err := data.DB.SkypassRewards().Find().Delete()
							require.NoError(t, err)
						})
					}
				}

				reader := strings.NewReader(getCSVRewards("3", tier.String(), itemType.String(), "2", "1", "", "", ""))

				rewards, err := updater.UpdateFromReader(ctx, accountID, season, reader)
				require.NoError(t, err)

				require.Len(t, rewards, 1)
				assert.Equal(t, accountID, rewards[0].UpdatedBy)

				storedRewards, err := data.DB.SkypassRewards().FindByIDs([]uint64{rewards[0].ID})
				require.NoError(t, err)

				require.Len(t, rewards, 1)
				assert.Equal(t, rewards[0], storedRewards[0])
			})

			t.Run("updates existing reward when with the same level, tier and is starter exists", func(t *testing.T) {
				var reward *data.SkypassReward

				// Setup
				{
					// Skypass rewards
					{
						reward = &data.SkypassReward{
							SkypassReward: &proto.SkypassReward{
								Level:     level,
								Season:    season,
								Tier:      &tier,
								ItemType:  &itemType,
								Amount:    1,
								IsStarter: true,
							},
						}
						err := data.DB.Save(reward)
						require.NoError(t, err)

						anotherReward := &data.SkypassReward{
							SkypassReward: &proto.SkypassReward{
								Level:     level,
								Season:    season,
								Tier:      &tier,
								ItemType:  &itemType,
								Amount:    1,
								IsStarter: false,
							},
						}
						err = data.DB.Save(anotherReward)
						require.NoError(t, err)

						t.Cleanup(func() {
							err := data.DB.SkypassRewards().Find().Delete()
							require.NoError(t, err)
						})
					}
				}

				reader := strings.NewReader(getCSVRewards("3", tier.String(), itemType.String(), "2", "1", "", "", ""))

				rewards, err := updater.UpdateFromReader(ctx, accountID, season, reader)
				require.NoError(t, err)

				require.Len(t, rewards, 1)
				assert.Equal(t, reward.ID, rewards[0].ID)
				assert.NotEqual(t, reward, rewards[0])
				assert.Equal(t, accountID, rewards[0].UpdatedBy)

				storedRewards, err := data.DB.SkypassRewards().FindByIDs([]uint64{reward.ID})
				require.NoError(t, err)

				require.Len(t, rewards, 1)
				assert.Equal(t, rewards[0], storedRewards[0])
			})

			t.Run("deletes existing reward when with the same level, tier and is starter is not in CSV", func(t *testing.T) {
				var reward *data.SkypassReward

				// Setup
				{
					// Skypass rewards
					{
						reward = &data.SkypassReward{
							SkypassReward: &proto.SkypassReward{
								Level:     level,
								Season:    season,
								Tier:      &tier,
								ItemType:  &itemType,
								Amount:    1,
								IsStarter: true,
							},
						}
						err := data.DB.Save(reward)
						require.NoError(t, err)

						t.Cleanup(func() {
							err := data.DB.SkypassRewards().Find().Delete()
							require.NoError(t, err)
						})
					}
				}

				reader := strings.NewReader(getCSVRewards("3", tier.String(), itemType.String(), "2", "0", "", "", ""))

				rewards, err := updater.UpdateFromReader(ctx, accountID, season, reader)
				require.NoError(t, err)

				require.Len(t, rewards, 1)
				assert.NotEqual(t, reward.ID, rewards[0].ID)

				storedRewards, err := data.DB.SkypassRewards().FindByIDs([]uint64{reward.ID})
				require.NoError(t, err)
				assert.Empty(t, storedRewards)
			})
		})

		t.Run("handles tier duplication", func(t *testing.T) {
			itemType := proto.ItemType_SW_BASE_CARDS

			t.Run("success when there are 1 free non-starter and 1 free starter rewards of the same level", func(t *testing.T) {
				// Setup
				{
					t.Cleanup(func() {
						err := data.DB.SkypassRewards().Find().Delete()
						require.NoError(t, err)
					})
				}

				tier := proto.SkypassTier_FREE

				reader := strings.NewReader(fmt.Sprintf("%s\n%s\n%s",
					getCSVRewardsHeader(),
					getCSVRewardsRecord("3", tier.String(), itemType.String(), "1", "0", "", "", ""),
					getCSVRewardsRecord("3", tier.String(), itemType.String(), "1", "1", "", "", ""),
				))

				rewards, err := updater.UpdateFromReader(ctx, accountID, 1, reader)
				require.NoError(t, err)
				assert.Len(t, rewards, 2)
			})

			t.Run("fails when there are more free non-starter rewards of the same level", func(t *testing.T) {
				tier := proto.SkypassTier_FREE

				reader := strings.NewReader(fmt.Sprintf("%s\n%s\n%s",
					getCSVRewardsHeader(),
					getCSVRewardsRecord("3", tier.String(), itemType.String(), "1", "0", "", "", ""),
					getCSVRewardsRecord("3", tier.String(), itemType.String(), "1", "0", "", "", ""),
				))

				_, err := updater.UpdateFromReader(ctx, accountID, 1, reader)
				require.ErrorContains(t, err, "reward duplicated")
			})

			t.Run("fails when there are more free starter rewards of the same level", func(t *testing.T) {
				tier := proto.SkypassTier_FREE

				reader := strings.NewReader(fmt.Sprintf("%s\n%s\n%s",
					getCSVRewardsHeader(),
					getCSVRewardsRecord("3", tier.String(), itemType.String(), "1", "1", "", "", ""),
					getCSVRewardsRecord("3", tier.String(), itemType.String(), "1", "1", "", "", ""),
				))

				_, err := updater.UpdateFromReader(ctx, accountID, 1, reader)
				require.ErrorContains(t, err, "reward duplicated")
			})

			t.Run("fails when there are more premium rewards of the same level", func(t *testing.T) {
				tier := proto.SkypassTier_PREMIUM

				reader := strings.NewReader(fmt.Sprintf("%s\n%s\n%s",
					getCSVRewardsHeader(),
					getCSVRewardsRecord("3", tier.String(), itemType.String(), "1", "0", "", "", ""),
					getCSVRewardsRecord("3", tier.String(), itemType.String(), "1", "0", "", "", ""),
				))

				_, err := updater.UpdateFromReader(ctx, accountID, 1, reader)
				require.ErrorContains(t, err, "reward duplicated")
			})
		})

		t.Run("fails when the season is not in the future", func(t *testing.T) {
			season := data.CurrentSeason()

			cfg := config.OpenSkySkypassConfig{
				DisabledOnlyFutureRewardsUpdateProtection: false,
			}

			updater := skypass.NewCSVRewardUpdater(cfg)

			_, err := updater.UpdateFromReader(ctx, accountID, season, nil)
			require.ErrorContains(t, err, "only future season can be updated")
		})

		t.Run("handles infinities", func(t *testing.T) {
			tier := proto.SkypassTier_FREE
			itemType := proto.ItemType_SW_BASE_CARDS

			t.Run("sets the last record as infinite", func(t *testing.T) {
				// Setup
				{
					t.Cleanup(func() {
						err := data.DB.SkypassRewards().Find().Delete()
						require.NoError(t, err)
					})
				}

				reader := strings.NewReader(fmt.Sprintf("%s\n%s\n%s",
					getCSVRewardsHeader(),
					getCSVRewardsRecord("1", tier.String(), itemType.String(), "1", "", "", "", ""),
					getCSVRewardsRecord("2", tier.String(), itemType.String(), "1", "", "", "", ""),
				))

				rewards, err := updater.UpdateFromReader(ctx, accountID, 1, reader)
				require.NoError(t, err)
				assert.Len(t, rewards, 2)

				var found bool
				for _, reward := range rewards {
					if reward.IsInfinite {
						found = true
					}
				}
				assert.True(t, found)
			})

			t.Run("sets the last record as infinite and previous infinite as non-infinite when number of records increases", func(t *testing.T) {
				var previousReward *data.SkypassReward

				// Setup
				{
					// Skypass rewards
					{
						previousReward = &data.SkypassReward{
							SkypassReward: &proto.SkypassReward{
								Level:      1,
								Season:     1,
								Tier:       &tier,
								ItemType:   &itemType,
								Amount:     1,
								IsInfinite: true,
							},
						}
						err := data.DB.Save(previousReward)
						require.NoError(t, err)
					}

					t.Cleanup(func() {
						err := data.DB.SkypassRewards().Find().Delete()
						require.NoError(t, err)
					})
				}

				reader := strings.NewReader(fmt.Sprintf("%s\n%s\n%s",
					getCSVRewardsHeader(),
					getCSVRewardsRecord("1", tier.String(), itemType.String(), "1", "", "", "", ""),
					getCSVRewardsRecord("2", tier.String(), itemType.String(), "1", "", "", "", ""),
				))

				rewards, err := updater.UpdateFromReader(ctx, accountID, 1, reader)
				require.NoError(t, err)
				assert.Len(t, rewards, 2)

				var found bool
				for _, reward := range rewards {
					if reward.ID == previousReward.ID {
						assert.False(t, reward.IsInfinite)
						found = true
					}
				}
				assert.True(t, found)
			})
		})

		t.Run("handles deck class to unlock for heroes", func(t *testing.T) {
			tier := proto.SkypassTier_FREE
			itemType := proto.ItemType_SW_HERO

			t.Run("sets deck class when hero has a starter deck", func(t *testing.T) {
				// Setup
				{
					t.Cleanup(func() {
						err := data.DB.SkypassRewards().Find().Delete()
						require.NoError(t, err)
					})
				}

				reader := strings.NewReader(getCSVRewards("1", tier.String(), itemType.String(), "", "", "2", "", ""))

				rewards, err := updater.UpdateFromReader(ctx, accountID, 1, reader)
				require.NoError(t, err)

				require.Len(t, rewards, 1)
				require.NotNil(t, rewards[0].Attributes)
				require.Len(t, rewards[0].Attributes.UnlockDeckClasses, 1)
				assert.Equal(t, proto.DeckClass_AGY, *rewards[0].Attributes.UnlockDeckClasses[0])
			})

			t.Run("does not set deck class when hero does not have a starter deck", func(t *testing.T) {
				// Setup
				{
					t.Cleanup(func() {
						err := data.DB.SkypassRewards().Find().Delete()
						require.NoError(t, err)
					})
				}

				reader := strings.NewReader(getCSVRewards("1", tier.String(), itemType.String(), "", "", "6", "", ""))

				rewards, err := updater.UpdateFromReader(ctx, accountID, 1, reader)
				require.NoError(t, err)

				require.Len(t, rewards, 1)
				require.NotNil(t, rewards[0].Attributes)
				require.Empty(t, rewards[0].Attributes.UnlockDeckClasses)
			})
		})
	})
}

func getCSVRewards(level, tier, itemType, amount, isStarter, tokenIDs, cardSets, cardSetsExcluded string) string {
	return fmt.Sprintf("%s\n%s", getCSVRewardsHeader(), getCSVRewardsRecord(level, tier, itemType, amount, isStarter, tokenIDs, cardSets, cardSetsExcluded))
}

func getCSVRewardsHeader() string {
	return "A,B,C,D,E,F,G,H"
}

func getCSVRewardsRecord(level, tier, itemType, amount, isStarter, tokenIDs, cardSets, cardSetsExcluded string) string {
	return fmt.Sprintf("%q,%q,%q,%q,%q,%q,%q,%q", level, tier, itemType, amount, isStarter, tokenIDs, cardSets, cardSetsExcluded)
}
