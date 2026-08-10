//go:build integration

package data_test

import (
	"testing"

	"github.com/0xsequence/go-sequence/lib/prototyp"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/upper/db/v4"

	"github.com/horizon-games/OpenSky/api/apitest"
	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/proto"
)

func TestItemsEquippedStore(t *testing.T) {
	var accountID proto.AccountID

	// Setup
	{
		// Accounts
		{
			var err error
			accountID, _, err = apitest.CreateRandomAccount("TestItemsEquippedStore")
			require.NoError(t, err)
		}
	}

	t.Run("store and find", func(t *testing.T) {
		var item *data.Item

		// Setup
		{
			// Items
			{
				item = &data.Item{
					Item: &proto.Item{
						AccountID: accountID,
						ItemType:  proto.ItemType_SW_CARD_BACKS,
						TokenID:   2,
						Balance:   prototyp.NewBigInt(1),
					},
				}
				err := data.DB.Save(item)
				require.NoError(t, err)
			}

			t.Cleanup(func() {
				err := data.DB.ItemsEquipped().Find(db.Cond{"account_id": accountID}).Delete()
				require.NoError(t, err)

				err = data.DB.Items().Find(db.Cond{"account_id": accountID}).Delete()
				require.NoError(t, err)
			})
		}

		itemEquipped := &data.ItemEquipped{
			AccountID: accountID,
			ItemID:    item.ID,
			ItemType:  item.ItemType,
			TokenID:   item.TokenID,
		}

		err := data.DB.Save(itemEquipped)
		require.NoError(t, err)

		var result *data.ItemEquipped
		err = data.DB.ItemsEquipped().Find(db.Cond{"account_id": accountID}).One(&result)
		require.NoError(t, err)
		assert.Equal(t, itemEquipped, result)
	})

	t.Run("equip and unequip", func(t *testing.T) {
		t.Run("fails when", func(t *testing.T) {
			t.Run("account ID is not valid", func(t *testing.T) {
				item := &data.Item{
					Item: &proto.Item{
						ItemType: proto.ItemType_SW_STICKERS,
						ID:       1,
						TokenID:  1,
						Balance:  prototyp.NewBigInt(1),
					},
				}

				err := data.DB.ItemsEquipped().Equip(item)
				require.ErrorContains(t, err, "invalid account ID")

				err = data.DB.ItemsEquipped().Unequip(item)
				require.ErrorContains(t, err, "invalid account ID")
			})

			t.Run("balance is zero", func(t *testing.T) {
				item := &data.Item{
					Item: &proto.Item{
						ItemType:  proto.ItemType_SW_STICKERS,
						AccountID: accountID,
						ID:        1,
						TokenID:   1,
						Balance:   prototyp.NewBigInt(0),
					},
				}

				err := data.DB.ItemsEquipped().Equip(item)
				require.ErrorContains(t, err, "invalid balance")
			})

			t.Run("balance is negative", func(t *testing.T) {
				item := &data.Item{
					Item: &proto.Item{
						ItemType:  proto.ItemType_SW_STICKERS,
						AccountID: accountID,
						ID:        1,
						TokenID:   1,
						Balance:   prototyp.NewBigInt(-1),
					},
				}

				err := data.DB.ItemsEquipped().Equip(item)
				require.ErrorContains(t, err, "invalid balance")
			})

			t.Run("item type is not supported", func(t *testing.T) {
				item := &data.Item{
					Item: &proto.Item{
						ItemType:  proto.ItemType_SW_BASE_CARDS,
						AccountID: accountID,
						ID:        1,
						TokenID:   1,
						Balance:   prototyp.NewBigInt(1),
					},
				}

				err := data.DB.ItemsEquipped().Equip(item)
				require.ErrorContains(t, err, "unsupported item type")
			})
		})

		t.Run("sticker", func(t *testing.T) {
			var item1, item2 *data.Item

			// Set up
			{
				item1 = &data.Item{
					Item: &proto.Item{
						AccountID: accountID,
						ItemType:  proto.ItemType_SW_STICKERS,
						TokenID:   1,
						Balance:   prototyp.NewBigInt(1),
					},
				}
				err := data.DB.Save(item1)
				require.NoError(t, err)

				item2 = &data.Item{
					Item: &proto.Item{
						AccountID: accountID,
						ItemType:  proto.ItemType_SW_STICKERS,
						TokenID:   2,
						Balance:   prototyp.NewBigInt(1),
					},
				}
				err = data.DB.Save(item2)
				require.NoError(t, err)
			}

			t.Run("multiple can be equipped", func(t *testing.T) {
				// Equip items
				for _, item := range []*data.Item{item1, item2} {
					var equippedItem *data.ItemEquipped

					err := data.DB.ItemsEquipped().Equip(item)
					require.NoError(t, err)

					err = data.DB.ItemsEquipped().Find(db.Cond{"account_id": accountID, "items_id": item.ID}).One(&equippedItem)
					require.NoError(t, err)
					assert.Equal(t, item.ItemType, equippedItem.ItemType)
					assert.Equal(t, item.TokenID, equippedItem.TokenID)
				}

				count, err := data.DB.ItemsEquipped().Find(db.Cond{"account_id": accountID}).Count()
				require.NoError(t, err)
				assert.Equal(t, 2, int(count))

				// Unequip items
				for _, item := range []*data.Item{item1, item2} {
					var equippedItem *data.ItemEquipped

					err := data.DB.ItemsEquipped().Unequip(item)
					require.NoError(t, err)

					err = data.DB.ItemsEquipped().Find(db.Cond{"account_id": accountID, "items_id": item.ID}).One(&equippedItem)
					require.ErrorIs(t, err, db.ErrNoMoreRows)
				}

				count, err = data.DB.ItemsEquipped().Find(db.Cond{"account_id": accountID}).Count()
				require.NoError(t, err)
				assert.Equal(t, 0, int(count))
			})

			t.Run("does not fail when called multiple times", func(t *testing.T) {
				var equippedItem *data.ItemEquipped

				// Equip item
				{
					err := data.DB.ItemsEquipped().Equip(item1)
					require.NoError(t, err)

					err = data.DB.ItemsEquipped().Find(db.Cond{"account_id": accountID, "items_id": item1.ID}).One(&equippedItem)
					require.NoError(t, err)
					assert.Equal(t, item1.ItemType, equippedItem.ItemType)
					assert.Equal(t, item1.TokenID, equippedItem.TokenID)

					err = data.DB.ItemsEquipped().Equip(item1)
					require.NoError(t, err)
				}

				// Unequip item
				{
					err := data.DB.ItemsEquipped().Unequip(item1)
					require.NoError(t, err)

					err = data.DB.ItemsEquipped().Find(db.Cond{"account_id": accountID, "items_id": item1.ID}).One(&equippedItem)
					require.ErrorIs(t, err, db.ErrNoMoreRows)

					err = data.DB.ItemsEquipped().Unequip(item1)
					require.NoError(t, err)
				}
			})
		})

		t.Run("card back", func(t *testing.T) {
			var item1, item2 *data.Item

			// Set up
			{
				item1 = &data.Item{
					Item: &proto.Item{
						AccountID: accountID,
						ItemType:  proto.ItemType_SW_CARD_BACKS,
						TokenID:   1,
						Balance:   prototyp.NewBigInt(1),
					},
				}
				err := data.DB.Save(item1)
				require.NoError(t, err)

				item2 = &data.Item{
					Item: &proto.Item{
						AccountID: accountID,
						ItemType:  proto.ItemType_SW_CARD_BACKS,
						TokenID:   2,
						Balance:   prototyp.NewBigInt(1),
					},
				}
				err = data.DB.Save(item2)
				require.NoError(t, err)
			}

			t.Run("multiple can be equipped", func(t *testing.T) {
				// Equip items
				for _, item := range []*data.Item{item1, item2} {
					var equippedItem *data.ItemEquipped

					err := data.DB.ItemsEquipped().Equip(item)
					require.NoError(t, err)

					err = data.DB.ItemsEquipped().Find(db.Cond{"account_id": accountID, "items_id": item.ID}).One(&equippedItem)
					require.NoError(t, err)
					assert.Equal(t, item.ItemType, equippedItem.ItemType)
					assert.Equal(t, item.TokenID, equippedItem.TokenID)
				}

				count, err := data.DB.ItemsEquipped().Find(db.Cond{"account_id": accountID}).Count()
				require.NoError(t, err)
				assert.Equal(t, 2, int(count))

				// Unequip items
				for _, item := range []*data.Item{item1, item2} {
					var equippedItem *data.ItemEquipped

					err := data.DB.ItemsEquipped().Unequip(item)
					require.NoError(t, err)

					err = data.DB.ItemsEquipped().Find(db.Cond{"account_id": accountID, "items_id": item.ID}).One(&equippedItem)
					require.ErrorIs(t, err, db.ErrNoMoreRows)
				}

				count, err = data.DB.ItemsEquipped().Find(db.Cond{"account_id": accountID}).Count()
				require.NoError(t, err)
				assert.Equal(t, 0, int(count))
			})

			t.Run("does not fail when called multiple times", func(t *testing.T) {
				var equippedItem *data.ItemEquipped

				// Equip item
				{
					err := data.DB.ItemsEquipped().Equip(item1)
					require.NoError(t, err)

					err = data.DB.ItemsEquipped().Find(db.Cond{"account_id": accountID, "items_id": item1.ID}).One(&equippedItem)
					require.NoError(t, err)
					assert.Equal(t, item1.ItemType, equippedItem.ItemType)
					assert.Equal(t, item1.TokenID, equippedItem.TokenID)

					err = data.DB.ItemsEquipped().Equip(item1)
					require.NoError(t, err)
				}

				// Unequip item
				{
					err := data.DB.ItemsEquipped().Unequip(item1)
					require.NoError(t, err)

					err = data.DB.ItemsEquipped().Find(db.Cond{"account_id": accountID, "items_id": item1.ID}).One(&equippedItem)
					require.ErrorIs(t, err, db.ErrNoMoreRows)

					err = data.DB.ItemsEquipped().Unequip(item1)
					require.NoError(t, err)
				}
			})
		})
	})

	t.Run("list", func(t *testing.T) {
		var item1, item2 *data.Item

		// Setup
		{
			// Items
			{
				item1 = &data.Item{
					Item: &proto.Item{
						AccountID: accountID,
						ItemType:  proto.ItemType_SW_STICKERS,
						TokenID:   31,
						Balance:   prototyp.NewBigInt(1),
					},
				}
				err := data.DB.Save(item1)
				require.NoError(t, err)

				item2 = &data.Item{
					Item: &proto.Item{
						AccountID: accountID,
						ItemType:  proto.ItemType_SW_CARD_BACKS,
						TokenID:   32,
						Balance:   prototyp.NewBigInt(1),
					},
				}
				err = data.DB.Save(item2)
				require.NoError(t, err)
			}

			// Items equipped
			{
				err := data.DB.ItemsEquipped().Equip(item1)
				require.NoError(t, err)

				err = data.DB.ItemsEquipped().Equip(item2)
				require.NoError(t, err)
			}

			t.Cleanup(func() {
				err := data.DB.ItemsEquipped().Find(db.Cond{"account_id": accountID}).Delete()
				require.NoError(t, err)

				err = data.DB.Items().Find(db.Cond{"account_id": accountID}).Delete()
				require.NoError(t, err)
			})
		}

		t.Run("unfiltered", func(t *testing.T) {
			result, err := data.DB.ItemsEquipped().List(accountID, nil)
			require.NoError(t, err)
			assert.Len(t, result, 2)
		})

		t.Run("filtered by item type", func(t *testing.T) {
			result, err := data.DB.ItemsEquipped().List(accountID, &item1.ItemType)
			require.NoError(t, err)
			assert.Len(t, result, 1)
		})
	})
}
