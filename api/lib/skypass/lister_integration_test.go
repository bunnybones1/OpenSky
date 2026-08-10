//go:build integration

package skypass_test

import (
	"context"
	"testing"

	"github.com/0xsequence/go-sequence/lib/prototyp"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/upper/db/v4"
	"go.uber.org/mock/gomock"

	"github.com/horizon-games/OpenSky/api/apitest"
	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/lib/skypass"
	"github.com/horizon-games/OpenSky/api/lib/skypass/mock"
	"github.com/horizon-games/OpenSky/api/proto"
)

func TestLister(t *testing.T) {
	var accountID, adminAccountID proto.AccountID

	// Setup
	{
		// Accounts
		{
			var err error
			accountID, _, err = apitest.CreateRandomAccount("TestLister")
			require.NoError(t, err)

			adminAccountID = apitest.RandomAccountID()
		}
	}

	tierFree := proto.SkypassTier_FREE
	tierPremium := proto.SkypassTier_PREMIUM

	typeBaseCard := proto.ItemType_SW_BASE_CARDS

	t.Run("list by season", func(t *testing.T) {
		season := uint16(2)

		var listerRuleAppler *mock.MockListerRuleApplier

		var seasonStats *data.SkypassSeasonStat

		// Setup
		{
			// Skypass season stats
			{
				seasonStats = &data.SkypassSeasonStat{
					AccountID:            accountID,
					Season:               season,
					InitialAccountLevel:  2,
					AchievedAccountLevel: 3,
				}

				err := data.DB.Save(seasonStats)
				require.NoError(t, err)
			}

			// Mocks
			{
				ctrl := gomock.NewController(t)

				listerRuleAppler = mock.NewMockListerRuleApplier(ctrl)
			}
		}

		lister := skypass.NewLister()

		t.Run("sets reward as claimed when it has been claimed already", func(t *testing.T) {
			var reward1, reward2 data.SkypassReward

			// Setup
			{
				// Skypass rewards
				{
					reward1 = data.SkypassReward{
						SkypassReward: &proto.SkypassReward{
							Level:     1,
							Season:    season,
							Tier:      &tierFree,
							ItemType:  &typeBaseCard,
							Amount:    1,
							UpdatedBy: adminAccountID,
						},
					}

					err := data.DB.Save(&reward1)
					require.NoError(t, err)

					reward2 = data.SkypassReward{
						SkypassReward: &proto.SkypassReward{
							Level:     1,
							Season:    season,
							Tier:      &tierPremium,
							ItemType:  &typeBaseCard,
							Amount:    1,
							UpdatedBy: adminAccountID,
						},
					}

					err = data.DB.Save(&reward2)
					require.NoError(t, err)

					t.Cleanup(func() {
						err := data.DB.SkypassRewards().Truncate()
						require.NoError(t, err)
					})
				}

				// Skypass rewards claims
				{
					err := data.DB.Save(&data.SkypassRewardClaim{
						SkypassRewardID: reward1.ID,
						AccountID:       accountID,
						Rewards: []*proto.Reward{
							{
								Type: proto.RewardType_CARD,
							},
						},
					})
					require.NoError(t, err)

					t.Cleanup(func() {
						err := data.DB.SkypassRewardsClaims().Truncate()
						require.NoError(t, err)
					})
				}
			}

			levels, err := lister.ListBySeason(context.Background(), accountID, season)
			require.NoError(t, err)

			require.Len(t, levels, 1)
			require.Len(t, levels[0].Rewards, 2)

			for _, reward := range levels[0].Rewards {
				switch reward.ID {
				case reward1.ID:
					assert.True(t, reward.Claimed)
					assert.NotEmpty(t, reward.GainedRewards)
				case reward2.ID:
					assert.False(t, reward.Claimed)
					assert.Empty(t, reward.GainedRewards)
				default:
					t.Errorf("unexpected reward")
				}
			}
		})

		t.Run("sets premium reward not claimable when the player does not have premium pass", func(t *testing.T) {
			var reward1, reward2 data.SkypassReward

			// Setup
			{
				// Skypass rewards
				{
					reward1 = data.SkypassReward{
						SkypassReward: &proto.SkypassReward{
							Level:     1,
							Season:    season,
							Tier:      &tierFree,
							ItemType:  &typeBaseCard,
							Amount:    1,
							UpdatedBy: adminAccountID,
						},
					}

					err := data.DB.Save(&reward1)
					require.NoError(t, err)

					reward2 = data.SkypassReward{
						SkypassReward: &proto.SkypassReward{
							Level:     1,
							Season:    season,
							Tier:      &tierPremium,
							ItemType:  &typeBaseCard,
							Amount:    1,
							UpdatedBy: adminAccountID,
						},
					}

					err = data.DB.Save(&reward2)
					require.NoError(t, err)

					t.Cleanup(func() {
						err := data.DB.SkypassRewards().Truncate()
						require.NoError(t, err)
					})
				}
			}

			levels, err := lister.ListBySeason(context.Background(), accountID, season)
			require.NoError(t, err)

			require.Len(t, levels, 1)
			require.Len(t, levels[0].Rewards, 2)
			for _, reward := range levels[0].Rewards {
				switch reward.ID {
				case reward1.ID:
					assert.True(t, reward.Claimable)
				case reward2.ID:
					assert.False(t, reward.Claimable)
				default:
					t.Errorf("unexpected reward")
				}
			}
		})

		t.Run("sets premium reward claimable when the player has premium pass", func(t *testing.T) {
			var reward1, reward2 data.SkypassReward

			accountIDWithPremium := apitest.RandomAccountID()

			// Setup
			{
				// Skypass rewards
				{
					reward1 = data.SkypassReward{
						SkypassReward: &proto.SkypassReward{
							Level:     1,
							Season:    season,
							Tier:      &tierFree,
							ItemType:  &typeBaseCard,
							Amount:    1,
							UpdatedBy: adminAccountID,
						},
					}

					err := data.DB.Save(&reward1)
					require.NoError(t, err)

					reward2 = data.SkypassReward{
						SkypassReward: &proto.SkypassReward{
							Level:     1,
							Season:    season,
							Tier:      &tierPremium,
							ItemType:  &typeBaseCard,
							Amount:    1,
							UpdatedBy: adminAccountID,
						},
					}

					err = data.DB.Save(&reward2)
					require.NoError(t, err)

					t.Cleanup(func() {
						err := data.DB.SkypassRewards().Truncate()
						require.NoError(t, err)
					})
				}

				// Skypass season stats
				{
					err := data.DB.Save(&data.SkypassSeasonStat{
						AccountID:  accountIDWithPremium,
						Season:     season,
						HasPremium: true,
					})
					require.NoError(t, err)
				}
			}

			levels, err := lister.ListBySeason(context.Background(), accountIDWithPremium, season)
			require.NoError(t, err)

			require.Len(t, levels, 1)
			require.Len(t, levels[0].Rewards, 2)

			for _, reward := range levels[0].Rewards {
				switch reward.ID {
				case reward1.ID:
					assert.True(t, reward.Claimable)
				case reward2.ID:
					assert.True(t, reward.Claimable)
				default:
					t.Errorf("unexpected reward")
				}
			}
		})

		t.Run("sets level as earned when the season progress reaches the level", func(t *testing.T) {
			// Setup
			{
				// Skypass rewards
				{
					reward1 := data.SkypassReward{
						SkypassReward: &proto.SkypassReward{
							Level:     1,
							Season:    season,
							Tier:      &tierFree,
							ItemType:  &typeBaseCard,
							Amount:    1,
							UpdatedBy: adminAccountID,
						},
					}

					err := data.DB.Save(&reward1)
					require.NoError(t, err)

					reward2 := data.SkypassReward{
						SkypassReward: &proto.SkypassReward{
							Level:     2,
							Season:    season,
							Tier:      &tierFree,
							ItemType:  &typeBaseCard,
							Amount:    1,
							UpdatedBy: adminAccountID,
						},
					}

					err = data.DB.Save(&reward2)
					require.NoError(t, err)

					t.Cleanup(func() {
						err := data.DB.SkypassRewards().Truncate()
						require.NoError(t, err)
					})
				}
			}

			levels, err := lister.ListBySeason(context.Background(), accountID, season)
			require.NoError(t, err)

			require.Len(t, levels, 2)
			for _, level := range levels {
				switch level.Level {
				case 1:
					assert.True(t, level.Earned)
				case 2:
					assert.False(t, level.Earned)
				default:
					t.Errorf("unexpected level %q", level.Level)
				}
			}
		})

		t.Run("adapts starter reward level to previous seasons progress", func(t *testing.T) {
			var reward1, reward2, reward3 data.SkypassReward

			// Setup
			{
				// Skypass rewards
				{
					reward1 = data.SkypassReward{
						SkypassReward: &proto.SkypassReward{
							Level:     1,
							Season:    season,
							Tier:      &tierFree,
							IsStarter: true,
							ItemType:  &typeBaseCard,
							Amount:    1,
							UpdatedBy: adminAccountID,
						},
					}

					err := data.DB.Save(&reward1)
					require.NoError(t, err)

					reward2 = data.SkypassReward{
						SkypassReward: &proto.SkypassReward{
							Level:     2,
							Season:    season,
							Tier:      &tierFree,
							IsStarter: true,
							ItemType:  &typeBaseCard,
							Amount:    1,
							UpdatedBy: adminAccountID,
						},
					}

					err = data.DB.Save(&reward2)
					require.NoError(t, err)

					reward3 = data.SkypassReward{
						SkypassReward: &proto.SkypassReward{
							Level:     3,
							Season:    season,
							Tier:      &tierFree,
							IsStarter: true,
							ItemType:  &typeBaseCard,
							Amount:    1,
							UpdatedBy: adminAccountID,
						},
					}

					err = data.DB.Save(&reward3)
					require.NoError(t, err)

					t.Cleanup(func() {
						err := data.DB.SkypassRewards().Truncate()
						require.NoError(t, err)
					})
				}
			}

			levels, err := lister.ListBySeason(context.Background(), accountID, season)
			require.NoError(t, err)

			require.Len(t, levels, 1)
			assert.Equal(t, 1, int(levels[0].Level))
			require.Len(t, levels[0].Rewards, 1)
			assert.Equal(t, 1, int(levels[0].Rewards[0].Level))
			assert.Equal(t, reward3.ID, levels[0].Rewards[0].ID)
		})

		t.Run("starter reward replaces free reward when they have the same level", func(t *testing.T) {
			var reward1, reward2 data.SkypassReward

			// Setup
			{
				// Skypass rewards
				{
					reward1 = data.SkypassReward{
						SkypassReward: &proto.SkypassReward{
							Level:     1,
							Season:    season,
							Tier:      &tierFree,
							ItemType:  &typeBaseCard,
							Amount:    1,
							UpdatedBy: adminAccountID,
						},
					}

					err := data.DB.Save(&reward1)
					require.NoError(t, err)

					reward2 = data.SkypassReward{
						SkypassReward: &proto.SkypassReward{
							Level:     3, // Will become 1 when adapted to previous progress.
							Season:    season,
							Tier:      &tierFree,
							IsStarter: true,
							ItemType:  &typeBaseCard,
							Amount:    1,
							UpdatedBy: adminAccountID,
						},
					}

					err = data.DB.Save(&reward2)
					require.NoError(t, err)

					t.Cleanup(func() {
						err := data.DB.SkypassRewards().Truncate()
						require.NoError(t, err)
					})
				}
			}

			levels, err := lister.ListBySeason(context.Background(), accountID, season)
			require.NoError(t, err)

			require.Len(t, levels, 1)
			assert.Equal(t, 1, int(levels[0].Level))
			require.Len(t, levels[0].Rewards, 1)
			assert.Equal(t, 1, int(levels[0].Rewards[0].Level))
			assert.Equal(t, reward2.ID, levels[0].Rewards[0].ID)
		})

		t.Run("adaptive hero rewards", func(t *testing.T) {
			typeHero := proto.ItemType_SW_HERO
			hero := proto.Hero_SAMYA

			t.Run("does not contain reward when it is a hero and the hero and deck are unlocked already but not claimed", func(t *testing.T) {
				var reward1 data.SkypassReward

				// Setup
				{
					// Skypass rewards
					{
						reward1 = data.SkypassReward{
							SkypassReward: &proto.SkypassReward{
								Level:    seasonStats.InitialAccountLevel + 1,
								Season:   season,
								Tier:     &tierFree,
								ItemType: &typeHero,
								Attributes: &proto.SkypassRewardAttributes{
									TokenIDs: []uint64{uint64(hero)},
								},
								UpdatedBy: adminAccountID,
								IsStarter: true,
							},
						}

						err := data.DB.Save(&reward1)
						require.NoError(t, err)

						t.Cleanup(func() {
							err := data.DB.SkypassRewards().Truncate()
							require.NoError(t, err)
						})
					}

					// Heroes
					{
						err := data.UnlockHero(data.DB, accountID, hero)
						require.NoError(t, err)

						t.Cleanup(func() {
							err := data.DB.Items().Find(db.Cond{"account_id": accountID}).Delete()
							require.NoError(t, err)
						})
					}

					// Decks
					{
						err := data.CreateStarterDecks(data.DB, accountID)
						require.NoError(t, err)

						deckClass := data.HeroDeckClass(hero)
						require.True(t, data.HasStarterDeck(deckClass))

						_, _, err = data.UnlockStarterDeckByDeckClass(data.DB, accountID, deckClass)
						require.NoError(t, err)

						t.Cleanup(func() {
							err := data.DB.Decks().Find(db.Cond{"account_id": accountID}).Delete()
							require.NoError(t, err)
						})
					}
				}

				levels, err := lister.ListBySeason(context.Background(), accountID, season)
				require.NoError(t, err)
				require.Empty(t, levels)
			})

			t.Run("contains reward when it is a hero and the hero is unlocked already but deck is not unlocked and not claimed", func(t *testing.T) {
				var reward1 data.SkypassReward

				// Setup
				{
					// Skypass rewards
					{
						reward1 = data.SkypassReward{
							SkypassReward: &proto.SkypassReward{
								Level:    seasonStats.InitialAccountLevel + 1,
								Season:   season,
								Tier:     &tierFree,
								ItemType: &typeHero,
								Attributes: &proto.SkypassRewardAttributes{
									TokenIDs: []uint64{uint64(hero)},
								},
								UpdatedBy: adminAccountID,
								IsStarter: true,
							},
						}

						err := data.DB.Save(&reward1)
						require.NoError(t, err)

						t.Cleanup(func() {
							err := data.DB.SkypassRewards().Truncate()
							require.NoError(t, err)
						})
					}

					// Heroes
					{
						err := data.UnlockHero(data.DB, accountID, hero)
						require.NoError(t, err)

						t.Cleanup(func() {
							err := data.DB.Items().Find(db.Cond{"account_id": accountID}).Delete()
							require.NoError(t, err)
						})
					}

					// Decks
					{
						err := data.CreateStarterDecks(data.DB, accountID)
						require.NoError(t, err)

						t.Cleanup(func() {
							err := data.DB.Decks().Find(db.Cond{"account_id": accountID}).Delete()
							require.NoError(t, err)
						})
					}
				}

				levels, err := lister.ListBySeason(context.Background(), accountID, season)
				require.NoError(t, err)

				require.Len(t, levels, 1)
				require.Len(t, levels[0].Rewards, 1)
				assert.Equal(t, reward1.ID, levels[0].Rewards[0].ID)
			})

			t.Run("contains reward when it is a hero and the hero is unlocked already and claimed but deck is deleted", func(t *testing.T) {
				var reward1 data.SkypassReward

				// Setup
				{
					// Skypass rewards
					{
						reward1 = data.SkypassReward{
							SkypassReward: &proto.SkypassReward{
								Level:    seasonStats.InitialAccountLevel + 1,
								Season:   season,
								Tier:     &tierFree,
								ItemType: &typeHero,
								Attributes: &proto.SkypassRewardAttributes{
									TokenIDs: []uint64{uint64(hero)},
								},
								UpdatedBy: adminAccountID,
								IsStarter: true,
							},
						}

						err := data.DB.Save(&reward1)
						require.NoError(t, err)

						t.Cleanup(func() {
							err := data.DB.SkypassRewards().Truncate()
							require.NoError(t, err)
						})
					}

					// Skypass rewards claims
					{
						err := data.DB.Save(&data.SkypassRewardClaim{
							SkypassRewardID: reward1.ID,
							AccountID:       accountID,
						})
						require.NoError(t, err)

						t.Cleanup(func() {
							err := data.DB.SkypassRewardsClaims().Truncate()
							require.NoError(t, err)
						})
					}

					// Heroes
					{
						err := data.UnlockHero(data.DB, accountID, hero)
						require.NoError(t, err)

						t.Cleanup(func() {
							err := data.DB.Items().Find(db.Cond{"account_id": accountID}).Delete()
							require.NoError(t, err)
						})
					}
				}

				levels, err := lister.ListBySeason(context.Background(), accountID, season)
				require.NoError(t, err)

				require.Len(t, levels, 1)
				require.Len(t, levels[0].Rewards, 1)
				assert.Equal(t, reward1.ID, levels[0].Rewards[0].ID)
			})

			t.Run("does not contain reward when it is a hero and the hero is unlocked already but deck is deleted and not claimed", func(t *testing.T) {
				var reward1 data.SkypassReward

				// Setup
				{
					// Skypass rewards
					{
						reward1 = data.SkypassReward{
							SkypassReward: &proto.SkypassReward{
								Level:    seasonStats.InitialAccountLevel + 1,
								Season:   season,
								Tier:     &tierFree,
								ItemType: &typeHero,
								Attributes: &proto.SkypassRewardAttributes{
									TokenIDs: []uint64{uint64(hero)},
								},
								UpdatedBy: adminAccountID,
								IsStarter: true,
							},
						}

						err := data.DB.Save(&reward1)
						require.NoError(t, err)

						t.Cleanup(func() {
							err := data.DB.SkypassRewards().Truncate()
							require.NoError(t, err)
						})
					}

					// Heroes
					{
						err := data.UnlockHero(data.DB, accountID, hero)
						require.NoError(t, err)

						t.Cleanup(func() {
							err := data.DB.Items().Find(db.Cond{"account_id": accountID}).Delete()
							require.NoError(t, err)
						})
					}
				}

				levels, err := lister.ListBySeason(context.Background(), accountID, season)
				require.NoError(t, err)
				require.Empty(t, levels)
			})

			t.Run("contains reward when it is a hero and the hero is unlocked and claimed", func(t *testing.T) {
				var reward1 data.SkypassReward

				// Setup
				{
					// Skypass rewards
					{
						reward1 = data.SkypassReward{
							SkypassReward: &proto.SkypassReward{
								Level:    1,
								Season:   season,
								Tier:     &tierFree,
								ItemType: &typeHero,
								Attributes: &proto.SkypassRewardAttributes{
									TokenIDs: []uint64{uint64(hero)},
								},
								UpdatedBy: adminAccountID,
								IsStarter: true,
							},
						}

						err := data.DB.Save(&reward1)
						require.NoError(t, err)

						t.Cleanup(func() {
							err := data.DB.SkypassRewards().Truncate()
							require.NoError(t, err)
						})
					}

					// Skypass rewards claims
					{
						err := data.DB.Save(&data.SkypassRewardClaim{
							SkypassRewardID: reward1.ID,
							AccountID:       accountID,
						})
						require.NoError(t, err)

						t.Cleanup(func() {
							err := data.DB.SkypassRewardsClaims().Truncate()
							require.NoError(t, err)
						})
					}

					// Heroes
					{
						err := data.UnlockHero(data.DB, accountID, hero)
						require.NoError(t, err)

						t.Cleanup(func() {
							err := data.DB.Items().Find(db.Cond{"account_id": accountID}).Delete()
							require.NoError(t, err)
						})
					}
				}

				levels, err := lister.ListBySeason(context.Background(), accountID, season)
				require.NoError(t, err)

				require.Len(t, levels, 1)
				require.Len(t, levels[0].Rewards, 1)
				assert.Equal(t, reward1.ID, levels[0].Rewards[0].ID)
			})

			t.Run("contains reward when it is a hero and the hero is not unlocked and level is lower than initial account level", func(t *testing.T) {
				var reward1 data.SkypassReward

				// Setup
				{
					// Skypass rewards
					{
						reward1 = data.SkypassReward{
							SkypassReward: &proto.SkypassReward{
								Level:    seasonStats.InitialAccountLevel - 1,
								Season:   season,
								Tier:     &tierFree,
								ItemType: &typeHero,
								Attributes: &proto.SkypassRewardAttributes{
									TokenIDs: []uint64{uint64(hero)},
								},
								UpdatedBy: adminAccountID,
								IsStarter: true,
							},
						}

						err := data.DB.Save(&reward1)
						require.NoError(t, err)

						t.Cleanup(func() {
							err := data.DB.SkypassRewards().Truncate()
							require.NoError(t, err)
						})
					}
				}

				levels, err := lister.ListBySeason(context.Background(), accountID, season)
				require.NoError(t, err)

				require.Len(t, levels, 1)
				require.Len(t, levels[0].Rewards, 1)
				assert.Equal(t, reward1.ID, levels[0].Rewards[0].ID)
				assert.Equal(t, 0, int(levels[0].Level))
			})

			t.Run("contains reward when it is a hero and the hero is unlocked and claimed and level is lower than initial account level", func(t *testing.T) {
				var reward1 data.SkypassReward

				// Setup
				{
					// Skypass rewards
					{
						reward1 = data.SkypassReward{
							SkypassReward: &proto.SkypassReward{
								Level:    seasonStats.InitialAccountLevel - 1,
								Season:   season,
								Tier:     &tierFree,
								ItemType: &typeHero,
								Attributes: &proto.SkypassRewardAttributes{
									TokenIDs: []uint64{uint64(hero)},
								},
								UpdatedBy: adminAccountID,
								IsStarter: true,
							},
						}

						err := data.DB.Save(&reward1)
						require.NoError(t, err)

						t.Cleanup(func() {
							err := data.DB.SkypassRewards().Truncate()
							require.NoError(t, err)
						})
					}

					// Skypass rewards claims
					{
						err := data.DB.Save(&data.SkypassRewardClaim{
							SkypassRewardID: reward1.ID,
							AccountID:       accountID,
						})
						require.NoError(t, err)

						t.Cleanup(func() {
							err := data.DB.SkypassRewardsClaims().Truncate()
							require.NoError(t, err)
						})
					}

					// Heroes
					{
						err := data.UnlockHero(data.DB, accountID, hero)
						require.NoError(t, err)

						t.Cleanup(func() {
							err := data.DB.Items().Find(db.Cond{"account_id": accountID}).Delete()
							require.NoError(t, err)
						})
					}
				}

				levels, err := lister.ListBySeason(context.Background(), accountID, season)
				require.NoError(t, err)

				require.Len(t, levels, 1)
				require.Len(t, levels[0].Rewards, 1)
				assert.Equal(t, reward1.ID, levels[0].Rewards[0].ID)
				assert.Equal(t, 0, int(levels[0].Level))
			})

			t.Run("does not contain reward when it is a hero and the hero is unlocked and not claimed and level is lower than initial account level", func(t *testing.T) {
				var reward1 data.SkypassReward

				// Setup
				{
					// Skypass rewards
					{
						reward1 = data.SkypassReward{
							SkypassReward: &proto.SkypassReward{
								Level:    seasonStats.InitialAccountLevel - 1,
								Season:   season,
								Tier:     &tierFree,
								ItemType: &typeHero,
								Attributes: &proto.SkypassRewardAttributes{
									TokenIDs: []uint64{uint64(hero)},
								},
								UpdatedBy: adminAccountID,
								IsStarter: true,
							},
						}

						err := data.DB.Save(&reward1)
						require.NoError(t, err)

						t.Cleanup(func() {
							err := data.DB.SkypassRewards().Truncate()
							require.NoError(t, err)
						})
					}

					// Heroes
					{
						err := data.UnlockHero(data.DB, accountID, hero)
						require.NoError(t, err)

						t.Cleanup(func() {
							err := data.DB.Items().Find(db.Cond{"account_id": accountID}).Delete()
							require.NoError(t, err)
						})
					}

					// Decks
					{
						err := data.CreateStarterDecks(data.DB, accountID)
						require.NoError(t, err)

						deckClass := data.HeroDeckClass(hero)
						require.True(t, data.HasStarterDeck(deckClass))

						_, _, err = data.UnlockStarterDeckByDeckClass(data.DB, accountID, deckClass)
						require.NoError(t, err)

						t.Cleanup(func() {
							err := data.DB.Decks().Find(db.Cond{"account_id": accountID}).Delete()
							require.NoError(t, err)
						})
					}
				}

				levels, err := lister.ListBySeason(context.Background(), accountID, season)
				require.NoError(t, err)
				require.Empty(t, levels)
			})

			t.Run("hero reward does not replace free reward when it is at level 0", func(t *testing.T) {
				var reward01, reward02, reward1 data.SkypassReward

				// Setup
				{
					// Skypass rewards
					{
						reward01 = data.SkypassReward{
							SkypassReward: &proto.SkypassReward{
								Level:     0,
								Season:    season,
								Tier:      &tierFree,
								ItemType:  &typeBaseCard,
								Amount:    1,
								UpdatedBy: adminAccountID,
							},
						}

						err := data.DB.Save(&reward01)
						require.NoError(t, err)

						reward02 = data.SkypassReward{
							SkypassReward: &proto.SkypassReward{
								Level:     0,
								Season:    season,
								Tier:      &tierFree,
								IsStarter: true,
								ItemType:  &typeHero,
								Attributes: &proto.SkypassRewardAttributes{
									TokenIDs: []uint64{uint64(hero)},
								},
								UpdatedBy: adminAccountID,
							},
						}

						err = data.DB.Save(&reward02)
						require.NoError(t, err)

						reward1 = data.SkypassReward{
							SkypassReward: &proto.SkypassReward{
								Level:     seasonStats.InitialAccountLevel - 1,
								Season:    season,
								Tier:      &tierFree,
								IsStarter: true,
								ItemType:  &typeHero,
								Attributes: &proto.SkypassRewardAttributes{
									TokenIDs: []uint64{uint64(hero)},
								},
								UpdatedBy: adminAccountID,
							},
						}

						err = data.DB.Save(&reward1)
						require.NoError(t, err)

						t.Cleanup(func() {
							err := data.DB.SkypassRewards().Truncate()
							require.NoError(t, err)
						})
					}
				}

				levels, err := lister.ListBySeason(context.Background(), accountID, season)
				require.NoError(t, err)

				require.Len(t, levels, 1)
				level0 := levels[0]
				assert.Equal(t, 0, int(level0.Level))
				require.Len(t, level0.Rewards, 3)
				assert.Equal(t, reward01.ID, level0.Rewards[0].ID)
				assert.Equal(t, reward02.ID, level0.Rewards[1].ID)
				assert.Equal(t, reward1.ID, level0.Rewards[2].ID)
			})
		})

		t.Run("adaptive title rewards", func(t *testing.T) {
			typeTitle := proto.ItemType_SW_TITLES
			titleID := uint64(1)

			t.Run("does not contain reward when it is a title and it is owned but not claimed", func(t *testing.T) {
				var reward1 data.SkypassReward

				// Setup
				{
					// Skypass rewards
					{
						reward1 = data.SkypassReward{
							SkypassReward: &proto.SkypassReward{
								Level:    seasonStats.InitialAccountLevel + 1,
								Season:   season,
								Tier:     &tierFree,
								ItemType: &typeTitle,
								Attributes: &proto.SkypassRewardAttributes{
									TokenIDs: []uint64{titleID},
								},
								UpdatedBy: adminAccountID,
								IsStarter: true,
							},
						}

						err := data.DB.Save(&reward1)
						require.NoError(t, err)

						t.Cleanup(func() {
							err := data.DB.SkypassRewards().Truncate()
							require.NoError(t, err)
						})
					}

					// Titles
					{
						title := &data.Item{Item: &proto.Item{
							AccountID: accountID,
							ItemType:  typeTitle,
							TokenID:   titleID,
							Balance:   prototyp.NewBigInt(1),
						}}

						err := data.DB.Save(title)
						require.NoError(t, err)

						t.Cleanup(func() {
							err := data.DB.Items().Find(db.Cond{"account_id": accountID}).Delete()
							require.NoError(t, err)
						})
					}
				}

				levels, err := lister.ListBySeason(context.Background(), accountID, season)
				require.NoError(t, err)
				require.Empty(t, levels)
			})

			t.Run("contains reward when it is a title and it is owned and claimed", func(t *testing.T) {
				var reward1 data.SkypassReward

				// Setup
				{
					// Skypass rewards
					{
						reward1 = data.SkypassReward{
							SkypassReward: &proto.SkypassReward{
								Level:    1,
								Season:   season,
								Tier:     &tierFree,
								ItemType: &typeTitle,
								Attributes: &proto.SkypassRewardAttributes{
									TokenIDs: []uint64{titleID},
								},
								UpdatedBy: adminAccountID,
								IsStarter: true,
							},
						}

						err := data.DB.Save(&reward1)
						require.NoError(t, err)

						t.Cleanup(func() {
							err := data.DB.SkypassRewards().Truncate()
							require.NoError(t, err)
						})
					}

					// Skypass rewards claims
					{
						err := data.DB.Save(&data.SkypassRewardClaim{
							SkypassRewardID: reward1.ID,
							AccountID:       accountID,
						})
						require.NoError(t, err)

						t.Cleanup(func() {
							err := data.DB.SkypassRewardsClaims().Truncate()
							require.NoError(t, err)
						})
					}

					// Titles
					{
						title := &data.Item{Item: &proto.Item{
							AccountID: accountID,
							ItemType:  typeTitle,
							TokenID:   titleID,
							Balance:   prototyp.NewBigInt(1),
						}}

						err := data.DB.Save(title)
						require.NoError(t, err)

						t.Cleanup(func() {
							err := data.DB.Items().Find(db.Cond{"account_id": accountID}).Delete()
							require.NoError(t, err)
						})
					}
				}

				levels, err := lister.ListBySeason(context.Background(), accountID, season)
				require.NoError(t, err)

				require.Len(t, levels, 1)
				require.Len(t, levels[0].Rewards, 1)
				assert.Equal(t, reward1.ID, levels[0].Rewards[0].ID)
			})

			t.Run("contains reward when it is a title and it is not owned and level is lower than initial account level", func(t *testing.T) {
				var reward1 data.SkypassReward

				// Setup
				{
					// Skypass rewards
					{
						reward1 = data.SkypassReward{
							SkypassReward: &proto.SkypassReward{
								Level:    seasonStats.InitialAccountLevel - 1,
								Season:   season,
								Tier:     &tierFree,
								ItemType: &typeTitle,
								Attributes: &proto.SkypassRewardAttributes{
									TokenIDs: []uint64{titleID},
								},
								UpdatedBy: adminAccountID,
								IsStarter: true,
							},
						}

						err := data.DB.Save(&reward1)
						require.NoError(t, err)

						t.Cleanup(func() {
							err := data.DB.SkypassRewards().Truncate()
							require.NoError(t, err)
						})
					}
				}

				levels, err := lister.ListBySeason(context.Background(), accountID, season)
				require.NoError(t, err)

				require.Len(t, levels, 1)
				require.Len(t, levels[0].Rewards, 1)
				assert.Equal(t, reward1.ID, levels[0].Rewards[0].ID)
				assert.Equal(t, 0, int(levels[0].Level))
			})

			t.Run("contains reward when it is a title and it is owned and claimed and level is lower than initial account level", func(t *testing.T) {
				var reward1 data.SkypassReward

				// Setup
				{
					// Skypass rewards
					{
						reward1 = data.SkypassReward{
							SkypassReward: &proto.SkypassReward{
								Level:    seasonStats.InitialAccountLevel - 1,
								Season:   season,
								Tier:     &tierFree,
								ItemType: &typeTitle,
								Attributes: &proto.SkypassRewardAttributes{
									TokenIDs: []uint64{titleID},
								},
								UpdatedBy: adminAccountID,
								IsStarter: true,
							},
						}

						err := data.DB.Save(&reward1)
						require.NoError(t, err)

						t.Cleanup(func() {
							err := data.DB.SkypassRewards().Truncate()
							require.NoError(t, err)
						})
					}

					// Skypass rewards claims
					{
						err := data.DB.Save(&data.SkypassRewardClaim{
							SkypassRewardID: reward1.ID,
							AccountID:       accountID,
						})
						require.NoError(t, err)

						t.Cleanup(func() {
							err := data.DB.SkypassRewardsClaims().Truncate()
							require.NoError(t, err)
						})
					}

					// Titles
					{
						title := &data.Item{Item: &proto.Item{
							AccountID: accountID,
							ItemType:  typeTitle,
							TokenID:   titleID,
							Balance:   prototyp.NewBigInt(1),
						}}

						err := data.DB.Save(title)
						require.NoError(t, err)

						t.Cleanup(func() {
							err := data.DB.Items().Find(db.Cond{"account_id": accountID}).Delete()
							require.NoError(t, err)
						})
					}
				}

				levels, err := lister.ListBySeason(context.Background(), accountID, season)
				require.NoError(t, err)

				require.Len(t, levels, 1)
				require.Len(t, levels[0].Rewards, 1)
				assert.Equal(t, reward1.ID, levels[0].Rewards[0].ID)
				assert.Equal(t, 0, int(levels[0].Level))
			})

			t.Run("does not contain reward when it is a title and it is owned and not claimed and level is lower than initial account level", func(t *testing.T) {
				var reward1 data.SkypassReward

				// Setup
				{
					// Skypass rewards
					{
						reward1 = data.SkypassReward{
							SkypassReward: &proto.SkypassReward{
								Level:    seasonStats.InitialAccountLevel - 1,
								Season:   season,
								Tier:     &tierFree,
								ItemType: &typeTitle,
								Attributes: &proto.SkypassRewardAttributes{
									TokenIDs: []uint64{titleID},
								},
								UpdatedBy: adminAccountID,
								IsStarter: true,
							},
						}

						err := data.DB.Save(&reward1)
						require.NoError(t, err)

						t.Cleanup(func() {
							err := data.DB.SkypassRewards().Truncate()
							require.NoError(t, err)
						})
					}

					// Titles
					{
						title := &data.Item{Item: &proto.Item{
							AccountID: accountID,
							ItemType:  typeTitle,
							TokenID:   titleID,
							Balance:   prototyp.NewBigInt(1),
						}}

						err := data.DB.Save(title)
						require.NoError(t, err)

						t.Cleanup(func() {
							err := data.DB.Items().Find(db.Cond{"account_id": accountID}).Delete()
							require.NoError(t, err)
						})
					}
				}

				levels, err := lister.ListBySeason(context.Background(), accountID, season)
				require.NoError(t, err)
				require.Empty(t, levels)
			})

			t.Run("title reward does not replace free reward when it is at level 0", func(t *testing.T) {
				var reward01, reward02, reward1 data.SkypassReward

				// Setup
				{
					// Skypass rewards
					{
						reward01 = data.SkypassReward{
							SkypassReward: &proto.SkypassReward{
								Level:     0,
								Season:    season,
								Tier:      &tierFree,
								ItemType:  &typeBaseCard,
								Amount:    1,
								UpdatedBy: adminAccountID,
							},
						}

						err := data.DB.Save(&reward01)
						require.NoError(t, err)

						reward02 = data.SkypassReward{
							SkypassReward: &proto.SkypassReward{
								Level:     0,
								Season:    season,
								Tier:      &tierFree,
								IsStarter: true,
								ItemType:  &typeTitle,
								Attributes: &proto.SkypassRewardAttributes{
									TokenIDs: []uint64{titleID},
								},
								UpdatedBy: adminAccountID,
							},
						}

						err = data.DB.Save(&reward02)
						require.NoError(t, err)

						reward1 = data.SkypassReward{
							SkypassReward: &proto.SkypassReward{
								Level:     seasonStats.InitialAccountLevel - 1,
								Season:    season,
								Tier:      &tierFree,
								IsStarter: true,
								ItemType:  &typeTitle,
								Attributes: &proto.SkypassRewardAttributes{
									TokenIDs: []uint64{titleID},
								},
								UpdatedBy: adminAccountID,
							},
						}

						err = data.DB.Save(&reward1)
						require.NoError(t, err)

						t.Cleanup(func() {
							err := data.DB.SkypassRewards().Truncate()
							require.NoError(t, err)
						})
					}
				}

				levels, err := lister.ListBySeason(context.Background(), accountID, season)
				require.NoError(t, err)

				require.Len(t, levels, 1)
				level0 := levels[0]
				assert.Equal(t, 0, int(level0.Level))
				require.Len(t, level0.Rewards, 3)
				assert.Equal(t, reward01.ID, level0.Rewards[0].ID)
				assert.Equal(t, reward02.ID, level0.Rewards[1].ID)
				assert.Equal(t, reward1.ID, level0.Rewards[2].ID)
			})
		})

		t.Run("infinite reward is copied to fill levels up to player's reached level + 1", func(t *testing.T) {
			t.Run("creates new rewards when do not exist", func(t *testing.T) {
				var rewardLevel2, rewardLevel3, rewardLevel5, rewardLevel9 data.SkypassReward

				season3 := season + 1

				// Setup
				{
					// Skypass season stats
					{
						err := data.DB.Save(&data.SkypassSeasonStat{
							AccountID:            accountID,
							Season:               season3,
							InitialAccountLevel:  1,
							AchievedAccountLevel: 7,
						})
						require.NoError(t, err)

						t.Cleanup(func() {
							err := data.DB.SkypassSeasonStats().Find(db.Cond{"account_id": accountID, "season": season3}).Delete()
							require.NoError(t, err)
						})
					}

					// Skypass rewards
					{
						rewardLevel2 = data.SkypassReward{
							SkypassReward: &proto.SkypassReward{
								Level:     2,
								Season:    season3,
								Tier:      &tierFree,
								ItemType:  &typeBaseCard,
								Amount:    1,
								UpdatedBy: adminAccountID,
							},
						}

						err := data.DB.Save(&rewardLevel2)
						require.NoError(t, err)

						rewardLevel3 = data.SkypassReward{
							SkypassReward: &proto.SkypassReward{
								Level:      3,
								Season:     season3,
								Tier:       &tierFree,
								ItemType:   &typeBaseCard,
								Amount:     1,
								UpdatedBy:  adminAccountID,
								IsInfinite: true,
							},
						}

						err = data.DB.Save(&rewardLevel3)
						require.NoError(t, err)

						rewardLevel5 = data.SkypassReward{
							SkypassReward: &proto.SkypassReward{
								Level:     5,
								Season:    season3,
								Tier:      &tierFree,
								ItemType:  &typeBaseCard,
								Amount:    1,
								UpdatedBy: adminAccountID,
							},
						}

						err = data.DB.Save(&rewardLevel5)
						require.NoError(t, err)

						rewardLevel9 = data.SkypassReward{
							SkypassReward: &proto.SkypassReward{
								Level:     9,
								Season:    season3,
								Tier:      &tierFree,
								ItemType:  &typeBaseCard,
								Amount:    1,
								UpdatedBy: adminAccountID,
							},
						}

						err = data.DB.Save(&rewardLevel9)
						require.NoError(t, err)

						t.Cleanup(func() {
							err := data.DB.SkypassRewards().Truncate()
							require.NoError(t, err)
						})
					}
				}

				levels, err := lister.ListBySeason(context.Background(), accountID, season3)
				require.NoError(t, err)

				require.Len(t, levels, 7)
				checkSkypassRewardsAtLevel(t, levels, rewardLevel2.Level, func(level *proto.SkypassLevel) {
					require.Len(t, level.Rewards, 1)
					assert.Equal(t, rewardLevel2.ID, level.Rewards[0].ID)
				})
				checkSkypassRewardsAtLevel(t, levels, rewardLevel3.Level, func(level *proto.SkypassLevel) {
					require.Len(t, level.Rewards, 1)
					assert.Equal(t, rewardLevel3.ID, level.Rewards[0].ID)
				})
				checkSkypassRewardsAtLevel(t, levels, rewardLevel3.Level+1, func(level *proto.SkypassLevel) {
					require.Len(t, level.Rewards, 1)
					assert.NotEqual(t, rewardLevel3.ID, level.Rewards[0].ID)
					assert.Equal(t, rewardLevel3.Tier, level.Rewards[0].Tier)
					assert.Equal(t, rewardLevel3.ItemType, level.Rewards[0].ItemType)
					assert.Equal(t, rewardLevel3.Amount, level.Rewards[0].Amount)
					assert.Equal(t, rewardLevel3.UpdatedBy, level.Rewards[0].UpdatedBy)
					assert.Equal(t, rewardLevel3.Attributes, level.Rewards[0].Attributes)
					assert.Equal(t, rewardLevel3.IsInfinite, level.Rewards[0].IsInfinite)
				})
				checkSkypassRewardsAtLevel(t, levels, rewardLevel5.Level, func(level *proto.SkypassLevel) {
					require.Len(t, level.Rewards, 1)
					assert.Equal(t, rewardLevel5.ID, level.Rewards[0].ID)
				})
				checkSkypassRewardsAtLevel(t, levels, rewardLevel3.Level+3, func(level *proto.SkypassLevel) {
					require.Len(t, level.Rewards, 1)
					assert.NotEqual(t, rewardLevel3.ID, level.Rewards[0].ID)
					assert.Equal(t, rewardLevel3.Tier, level.Rewards[0].Tier)
					assert.Equal(t, rewardLevel3.ItemType, level.Rewards[0].ItemType)
					assert.Equal(t, rewardLevel3.Amount, level.Rewards[0].Amount)
					assert.Equal(t, rewardLevel3.UpdatedBy, level.Rewards[0].UpdatedBy)
					assert.Equal(t, rewardLevel3.Attributes, level.Rewards[0].Attributes)
					assert.Equal(t, rewardLevel3.IsInfinite, level.Rewards[0].IsInfinite)
				})
				checkSkypassRewardsAtLevel(t, levels, rewardLevel3.Level+4, func(level *proto.SkypassLevel) {
					require.Len(t, level.Rewards, 1)
					assert.NotEqual(t, rewardLevel3.ID, level.Rewards[0].ID)
					assert.Equal(t, rewardLevel3.Tier, level.Rewards[0].Tier)
					assert.Equal(t, rewardLevel3.ItemType, level.Rewards[0].ItemType)
					assert.Equal(t, rewardLevel3.Amount, level.Rewards[0].Amount)
					assert.Equal(t, rewardLevel3.UpdatedBy, level.Rewards[0].UpdatedBy)
					assert.Equal(t, rewardLevel3.Attributes, level.Rewards[0].Attributes)
					assert.Equal(t, rewardLevel3.IsInfinite, level.Rewards[0].IsInfinite)
				})
				checkSkypassRewardsAtLevel(t, levels, rewardLevel9.Level, func(level *proto.SkypassLevel) {
					require.Len(t, level.Rewards, 1)
					assert.Equal(t, rewardLevel9.ID, level.Rewards[0].ID)
				})
			})

			t.Run("does not create new rewards when they exists", func(t *testing.T) {
				var reward1, reward2 data.SkypassReward

				season3 := season + 1

				// Setup
				{
					// Skypass season stats
					{
						err := data.DB.Save(&data.SkypassSeasonStat{
							AccountID:            accountID,
							Season:               season3,
							InitialAccountLevel:  2,
							AchievedAccountLevel: 3,
						})
						require.NoError(t, err)

						t.Cleanup(func() {
							err := data.DB.SkypassSeasonStats().Find(db.Cond{"account_id": accountID, "season": season3}).Delete()
							require.NoError(t, err)
						})
					}

					// Skypass rewards
					{
						reward1 = data.SkypassReward{
							SkypassReward: &proto.SkypassReward{
								Level:     1,
								Season:    season3,
								Tier:      &tierFree,
								ItemType:  &typeBaseCard,
								Amount:    1,
								UpdatedBy: adminAccountID,
							},
						}

						err := data.DB.Save(&reward1)
						require.NoError(t, err)

						reward2 = data.SkypassReward{
							SkypassReward: &proto.SkypassReward{
								Level:      2,
								Season:     season3,
								Tier:       &tierFree,
								ItemType:   &typeBaseCard,
								Amount:     1,
								UpdatedBy:  adminAccountID,
								IsInfinite: true,
							},
						}

						err = data.DB.Save(&reward2)
						require.NoError(t, err)

						reward3 := data.SkypassReward{
							SkypassReward: &proto.SkypassReward{
								Level:      3,
								Season:     season3,
								Tier:       &tierFree,
								ItemType:   &typeBaseCard,
								Amount:     1,
								UpdatedBy:  adminAccountID,
								IsInfinite: true,
							},
						}

						err = data.DB.Save(&reward3)
						require.NoError(t, err)

						t.Cleanup(func() {
							err := data.DB.SkypassRewards().Truncate()
							require.NoError(t, err)
						})
					}
				}

				levels, err := lister.ListBySeason(context.Background(), accountID, season3)
				require.NoError(t, err)

				require.Len(t, levels, 2)
				checkSkypassRewardsAtLevel(t, levels, reward2.Level, func(level *proto.SkypassLevel) {
					require.Len(t, level.Rewards, 1)
					require.Len(t, level.Rewards, 1)
					assert.Equal(t, reward2.ID, level.Rewards[0].ID)
				})
			})
		})

		t.Run("uses lister rule applier when exists", func(t *testing.T) {
			lister := skypass.NewLister(listerRuleAppler)

			var reward1 *data.SkypassReward

			// Setup
			{
				// Skypass rewards
				{
					reward1 = &data.SkypassReward{
						SkypassReward: &proto.SkypassReward{
							Level:     1,
							Season:    season,
							Tier:      &tierFree,
							ItemType:  &typeBaseCard,
							Amount:    1,
							UpdatedBy: adminAccountID,
						},
					}

					err := data.DB.Save(reward1)
					require.NoError(t, err)

					t.Cleanup(func() {
						err := data.DB.SkypassRewards().Truncate()
						require.NoError(t, err)
					})
				}
			}

			expectedReward := &proto.SkypassReward{
				Level: 10,
				Tier:  &tierFree,
			}

			listerRuleAppler.EXPECT().
				Apply(gomock.Any(), accountID, gomock.Any(), gomock.Any()).
				DoAndReturn(func(_ context.Context, _ proto.AccountID, levels []*proto.SkypassLevel, seasonStat *data.SkypassSeasonStat) ([]*proto.SkypassLevel, error) {
					require.Len(t, levels, 1)
					require.Len(t, levels[0].Rewards, 1)
					assert.Equal(t, reward1.ID, levels[0].Rewards[0].ID)

					require.NotNil(t, seasonStat)
					assert.Equal(t, accountID, seasonStat.AccountID)
					assert.Equal(t, season, seasonStat.Season)

					return []*proto.SkypassLevel{
						{
							Rewards: []*proto.SkypassReward{expectedReward},
						},
					}, nil
				})

			levels, err := lister.ListBySeason(context.Background(), accountID, season)
			require.NoError(t, err)

			require.Len(t, levels, 1)
			require.Len(t, levels[0].Rewards, 1)
			assert.Equal(t, expectedReward, levels[0].Rewards[0])
		})
	})
}

func checkSkypassRewardsAtLevel(t *testing.T, levels []*proto.SkypassLevel, targetLevel uint16, assertFunc func(level *proto.SkypassLevel)) {
	var found bool

	for _, level := range levels {
		if level.Level == targetLevel {
			found = true

			assertFunc(level)
		}
	}

	assert.True(t, found)
}
