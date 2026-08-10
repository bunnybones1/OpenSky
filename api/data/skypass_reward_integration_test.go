//go:build integration

package data_test

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/upper/db/v4"

	"github.com/horizon-games/OpenSky/api/apitest"
	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/proto"
)

func TestSkypassRewardsStore(t *testing.T) {
	adminAccountID := apitest.RandomAccountID()

	tierFree := proto.SkypassTier_FREE

	typeBaseCard := proto.ItemType_SW_BASE_CARDS

	season2 := uint16(2)
	season3 := uint16(3)

	t.Run("find by season", func(t *testing.T) {
		var reward1, reward2 data.SkypassReward

		// Setup
		{
			// Skypass rewards
			{
				reward1 = data.SkypassReward{
					SkypassReward: &proto.SkypassReward{
						Level:     1,
						Season:    season2,
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
						Season:    season3,
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

		rewards, err := data.DB.SkypassRewards().FindBySeason(season2)
		require.NoError(t, err)

		require.Len(t, rewards, 1)
		reward := rewards[0]
		assert.Equal(t, reward1.ID, reward.ID)
	})

	t.Run("find by IDs", func(t *testing.T) {
		var reward1, reward2 data.SkypassReward

		// Setup
		{
			// Skypass rewards
			{
				reward1 = data.SkypassReward{
					SkypassReward: &proto.SkypassReward{
						Level:     1,
						Season:    season2,
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
						Season:    season3,
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

		rewards, err := data.DB.SkypassRewards().FindByIDs([]uint64{reward1.ID})
		require.NoError(t, err)

		require.Len(t, rewards, 1)
		reward := rewards[0]
		assert.Equal(t, reward1.ID, reward.ID)
	})
}

func TestSkypassReward(t *testing.T) {
	t.Run("validate", func(t *testing.T) {
		tierFree := proto.SkypassTier_FREE
		itemTypeBaseCard := proto.ItemType_SW_BASE_CARDS

		t.Run("common", func(t *testing.T) {
			t.Run("fails when season is zero", func(t *testing.T) {
				reward := &data.SkypassReward{
					SkypassReward: &proto.SkypassReward{
						Tier:     &tierFree,
						ItemType: &itemTypeBaseCard,
					},
				}

				err := reward.Validate()
				require.ErrorContains(t, err, "season cannot be zero")
			})

			t.Run("fails when tier is unknown", func(t *testing.T) {
				tier := proto.SkypassTier_UNKNOWN
				reward := &data.SkypassReward{
					SkypassReward: &proto.SkypassReward{
						Season: 1,
						Tier:   &tier,
					},
				}

				err := reward.Validate()
				require.ErrorContains(t, err, "tier is invalid")
			})

			t.Run("fails when item type is unknown", func(t *testing.T) {
				itemType := proto.ItemType_UNKNOWN
				reward := &data.SkypassReward{
					SkypassReward: &proto.SkypassReward{
						Season:   1,
						Tier:     &tierFree,
						ItemType: &itemType,
						Amount:   1,
					},
				}

				err := reward.Validate()
				require.ErrorContains(t, err, "item type is invalid")
			})

			t.Run("fails when amount is zero and no token IDs are provided", func(t *testing.T) {
				reward := &data.SkypassReward{
					SkypassReward: &proto.SkypassReward{
						Season:   1,
						Tier:     &tierFree,
						ItemType: &itemTypeBaseCard,
					},
				}

				err := reward.Validate()
				require.ErrorContains(t, err, "amount cannot be zero when without token IDs")
			})

			t.Run("fails when amount is greater than zero and token IDs are provided", func(t *testing.T) {
				reward := &data.SkypassReward{
					SkypassReward: &proto.SkypassReward{
						Season:   1,
						Tier:     &tierFree,
						ItemType: &itemTypeBaseCard,
						Amount:   1,
						Attributes: &proto.SkypassRewardAttributes{
							TokenIDs: []uint64{1},
						},
					},
				}

				err := reward.Validate()
				require.ErrorContains(t, err, "amount cannot be greater than zero when there are token IDs")
			})

			t.Run("fails when there is the same card set in both card sets and excluded card sets", func(t *testing.T) {
				cardSet1 := proto.CardSet_CORE_SET
				cardSet2 := proto.CardSet_CORE_EXPANSION
				cardSet3 := proto.CardSet_CLASH_OF_INVENTORS

				reward := &data.SkypassReward{
					SkypassReward: &proto.SkypassReward{
						Season:   1,
						Tier:     &tierFree,
						ItemType: &itemTypeBaseCard,
						Amount:   1,
						Attributes: &proto.SkypassRewardAttributes{
							CardSets:         []*proto.CardSet{&cardSet1, &cardSet2},
							CardSetsExcluded: []*proto.CardSet{&cardSet2, &cardSet3},
						},
					},
				}

				err := reward.Validate()
				require.ErrorContains(t, err, "the same card set cannot be in both card sets and excluded card sets")
			})

			t.Run("fails when starter is other than free tier", func(t *testing.T) {
				tierPremium := proto.SkypassTier_PREMIUM

				reward := &data.SkypassReward{
					SkypassReward: &proto.SkypassReward{
						Season:    1,
						Tier:      &tierPremium,
						ItemType:  &itemTypeBaseCard,
						Amount:    1,
						IsStarter: true,
					},
				}

				err := reward.Validate()
				require.ErrorContains(t, err, "only free tier can be a starter")
			})
		})

		t.Run("item type specific", func(t *testing.T) {
			t.Run("hero", func(t *testing.T) {
				itemTypeHero := proto.ItemType_SW_HERO

				t.Run("success when hero in token IDs exists", func(t *testing.T) {
					reward := &data.SkypassReward{
						SkypassReward: &proto.SkypassReward{
							Season:   1,
							Tier:     &tierFree,
							ItemType: &itemTypeHero,
							Attributes: &proto.SkypassRewardAttributes{
								TokenIDs: []uint64{uint64(proto.Hero_ARI)},
							},
						},
					}

					err := reward.Validate()
					require.NoError(t, err)
				})

				t.Run("fails when hero has no token IDs provided", func(t *testing.T) {
					reward := &data.SkypassReward{
						SkypassReward: &proto.SkypassReward{
							Season:   1,
							Tier:     &tierFree,
							ItemType: &itemTypeHero,
							Amount:   1,
						},
					}

					err := reward.Validate()
					require.ErrorContains(t, err, "requires token IDs")
				})

				t.Run("fails when the hero in token IDs does not exist", func(t *testing.T) {
					reward := &data.SkypassReward{
						SkypassReward: &proto.SkypassReward{
							Season:   1,
							Tier:     &tierFree,
							ItemType: &itemTypeHero,
							Attributes: &proto.SkypassRewardAttributes{
								TokenIDs: []uint64{10000},
							},
						},
					}

					err := reward.Validate()
					require.ErrorContains(t, err, "hero does not exist")
				})
			})

			t.Run("base card", func(t *testing.T) {
				t.Run("success when card in token IDs exists", func(t *testing.T) {
					reward := &data.SkypassReward{
						SkypassReward: &proto.SkypassReward{
							Season:   1,
							Tier:     &tierFree,
							ItemType: &itemTypeBaseCard,
							Attributes: &proto.SkypassRewardAttributes{
								TokenIDs: []uint64{data.CardIndex.GetRandomCard(nil).ID},
							},
						},
					}

					err := reward.Validate()
					require.NoError(t, err)
				})

				t.Run("fails when the card provided in token IDs does not exist", func(t *testing.T) {
					reward := &data.SkypassReward{
						SkypassReward: &proto.SkypassReward{
							Season:   1,
							Tier:     &tierFree,
							ItemType: &itemTypeBaseCard,
							Attributes: &proto.SkypassRewardAttributes{
								TokenIDs: []uint64{10000},
							},
						},
					}

					err := reward.Validate()
					require.ErrorContains(t, err, "card does not exist")
				})
			})

			t.Run("conquest ticket", func(t *testing.T) {
				t.Run("fails when conquest ticket has zero amount", func(t *testing.T) {
					itemTypeConquestTicket := proto.ItemType_SW_CONQUEST_TICKET

					reward := &data.SkypassReward{
						SkypassReward: &proto.SkypassReward{
							Season:   1,
							Tier:     &tierFree,
							ItemType: &itemTypeConquestTicket,
						},
					}

					err := reward.Validate()
					require.ErrorContains(t, err, "amount cannot be zero")
				})
			})

			t.Run("sticker", func(t *testing.T) {
				stickerID := uint64(1)

				// Setup
				{
					// Stickers
					{
						onChainTokenID := data.ItemTypeAndID2SWTokenID(proto.ItemType_SW_STICKERS, stickerID)
						sticker := &data.Sticker{
							Sticker: &proto.Sticker{
								TokenID: onChainTokenID,
							},
						}

						err := data.DB.Save(sticker)
						require.NoError(t, err)

						t.Cleanup(func() {
							err := data.DB.Stickers().Find(db.Cond{"id": sticker.ID}).Delete()
							require.NoError(t, err)
						})
					}
				}

				itemTypeSticker := proto.ItemType_SW_STICKERS

				t.Run("success when sticker in token IDs exists", func(t *testing.T) {
					reward := &data.SkypassReward{
						SkypassReward: &proto.SkypassReward{
							Season:   1,
							Tier:     &tierFree,
							ItemType: &itemTypeSticker,
							Attributes: &proto.SkypassRewardAttributes{
								TokenIDs: []uint64{stickerID},
							},
						},
					}

					err := reward.Validate()
					require.NoError(t, err)
				})

				t.Run("fails when sticker has no token IDs provided", func(t *testing.T) {
					reward := &data.SkypassReward{
						SkypassReward: &proto.SkypassReward{
							Season:   1,
							Tier:     &tierFree,
							ItemType: &itemTypeSticker,
							Amount:   1,
						},
					}

					err := reward.Validate()
					require.ErrorContains(t, err, "requires token IDs")
				})

				t.Run("fails when the sticker in token IDs does not exist", func(t *testing.T) {
					reward := &data.SkypassReward{
						SkypassReward: &proto.SkypassReward{
							Season:   1,
							Tier:     &tierFree,
							ItemType: &itemTypeSticker,
							Attributes: &proto.SkypassRewardAttributes{
								TokenIDs: []uint64{10000},
							},
						},
					}

					err := reward.Validate()
					require.ErrorContains(t, err, "sticker does not exist")
				})
			})

			t.Run("sticker points", func(t *testing.T) {
				t.Run("fails when sticker points have zero amount", func(t *testing.T) {
					itemTypeStickerPoints := proto.ItemType_SW_STICKER_POINTS

					reward := &data.SkypassReward{
						SkypassReward: &proto.SkypassReward{
							Season:   1,
							Tier:     &tierFree,
							ItemType: &itemTypeStickerPoints,
						},
					}

					err := reward.Validate()
					require.ErrorContains(t, err, "amount cannot be zero")
				})
			})

			t.Run("silver card", func(t *testing.T) {
				itemTypeSilverCard := proto.ItemType_SW_SILVER_CARDS

				t.Run("success when card in token IDs exists", func(t *testing.T) {
					reward := &data.SkypassReward{
						SkypassReward: &proto.SkypassReward{
							Season:   1,
							Tier:     &tierFree,
							ItemType: &itemTypeSilverCard,
							Attributes: &proto.SkypassRewardAttributes{
								TokenIDs: []uint64{data.CardIndex.GetRandomCard(nil).ID},
							},
						},
					}

					err := reward.Validate()
					require.NoError(t, err)
				})

				t.Run("fails when the card provided in token IDs does not exist", func(t *testing.T) {
					reward := &data.SkypassReward{
						SkypassReward: &proto.SkypassReward{
							Season:   1,
							Tier:     &tierFree,
							ItemType: &itemTypeSilverCard,
							Attributes: &proto.SkypassRewardAttributes{
								TokenIDs: []uint64{10000},
							},
						},
					}

					err := reward.Validate()
					require.ErrorContains(t, err, "card does not exist")
				})
			})

			t.Run("card back", func(t *testing.T) {
				t.Run("fails when card back has no token IDs provided", func(t *testing.T) {
					itemTypeCardBack := proto.ItemType_SW_CARD_BACKS

					reward := &data.SkypassReward{
						SkypassReward: &proto.SkypassReward{
							Season:   1,
							Tier:     &tierFree,
							ItemType: &itemTypeCardBack,
							Amount:   1,
						},
					}

					err := reward.Validate()
					require.ErrorContains(t, err, "requires token IDs")
				})
			})
		})
	})
}
