//go:build integration

package rpc_test

import (
	"context"
	"testing"

	"github.com/0xsequence/go-sequence/lib/prototyp"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/upper/db/v4"

	"github.com/horizon-games/OpenSky/api/apitest"
	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/lib/jobqueue"
	"github.com/horizon-games/OpenSky/api/proto"
)

func TestGetItemSupply(t *testing.T) {
	tokenID := uint64(1)

	// Setup
	{
		itemIDs := make([]db.ID, 0)
		itemIDs = append(itemIDs, createTokenSupplyItem(t, tokenID, proto.ItemType_SW_SILVER_CARDS))
		itemIDs = append(itemIDs, createTokenSupplyItem(t, tokenID, proto.ItemType_SW_GOLD_CARDS))

		t.Cleanup(func() {
			cleanupItems(t, itemIDs)
		})
	}

	item, err := apitest.Client().GetItemSupply(context.Background(), tokenID)
	require.NoError(t, err)

	assert.Len(t, item, 2)
	assert.Equal(t, tokenID, item["SW_SILVER_CARDS"].TokenID)
	assert.Equal(t, tokenID, item["SW_GOLD_CARDS"].TokenID)
}

func TestGetBatchItemSupply(t *testing.T) {
	tokenID1 := uint64(1)
	tokenID2 := uint64(2)
	tokenID3 := uint64(3)

	// Setup
	{
		itemIDs := make([]db.ID, 0)

		itemIDs = append(itemIDs, createTokenSupplyItem(t, tokenID1, proto.ItemType_SW_SILVER_CARDS))
		itemIDs = append(itemIDs, createTokenSupplyItem(t, tokenID1, proto.ItemType_SW_GOLD_CARDS))
		itemIDs = append(itemIDs, createTokenSupplyItem(t, tokenID2, proto.ItemType_SW_CRYSTALS))
		itemIDs = append(itemIDs, createTokenSupplyItem(t, tokenID3, proto.ItemType_SW_STICKERS))

		t.Cleanup(func() {
			cleanupItems(t, itemIDs)
		})
	}

	t.Run("success", func(t *testing.T) {
		items, err := apitest.Client().GetBatchItemSupply(context.Background(), []uint64{tokenID1, tokenID2, tokenID3})
		require.NoError(t, err)

		assert.Len(t, items, 3)
		assert.Len(t, items[tokenID1], 2)
		assert.Equal(t, tokenID1, items[tokenID1]["SW_SILVER_CARDS"].TokenID)
		assert.Equal(t, tokenID1, items[tokenID1]["SW_GOLD_CARDS"].TokenID)
		assert.Len(t, items[tokenID2], 1)
		assert.Equal(t, tokenID2, items[tokenID2]["SW_CRYSTALS"].TokenID)
		assert.Len(t, items[tokenID3], 1)
		assert.Equal(t, tokenID3, items[tokenID3]["SW_STICKERS"].TokenID)
	})

	t.Run("fails when the number of tokens exceeds the limit of 50", func(t *testing.T) {
		items, err := apitest.Client().GetBatchItemSupply(context.Background(), []uint64{
			1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
			11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
			21, 22, 23, 24, 25, 26, 27, 28, 29, 30,
			31, 32, 33, 34, 35, 36, 37, 38, 39, 40,
			41, 42, 43, 44, 45, 46, 47, 48, 49, 50,
			51,
		})
		require.ErrorContains(t, err, "tokens exceed the limit")
		assert.Nil(t, items)
	})
}

func TestGetItemSuppliesByType(t *testing.T) {
	tokenID1 := uint64(1)
	tokenID2 := uint64(2)
	tokenID3 := uint64(3)

	// Setup
	{
		itemIDs := make([]db.ID, 0)
		itemIDs = append(itemIDs, createTokenSupplyItem(t, tokenID1, proto.ItemType_SW_SILVER_CARDS))
		itemIDs = append(itemIDs, createTokenSupplyItem(t, tokenID1, proto.ItemType_SW_GOLD_CARDS))
		itemIDs = append(itemIDs, createTokenSupplyItem(t, tokenID2, proto.ItemType_SW_STICKERS))
		itemIDs = append(itemIDs, createTokenSupplyItem(t, tokenID3, proto.ItemType_SW_STICKERS))

		t.Cleanup(func() {
			cleanupItems(t, itemIDs)
		})
	}

	t.Run("success", func(t *testing.T) {
		itemType1 := proto.ItemType_SW_STICKERS
		itemType2 := proto.ItemType_SW_GOLD_CARDS

		itemsSupply, err := apitest.Client().GetItemSuppliesByType(context.Background(), []*proto.ItemType{
			&itemType1,
			&itemType2,
		})
		require.NoError(t, err)

		assert.Len(t, itemsSupply, 2)

		assert.Len(t, itemsSupply[uint(itemType1)], 2)
		assert.Greater(t, int(itemsSupply[uint(itemType1)][0].ItemID), 0)
		assert.Equal(t, itemType1, itemsSupply[uint(itemType1)][0].ItemType)
		assert.Greater(t, int(itemsSupply[uint(itemType1)][0].TotalBalance.Int64()), 0)
		assert.Greater(t, int(itemsSupply[uint(itemType1)][1].ItemID), 0)
		assert.Equal(t, itemType1, itemsSupply[uint(itemType1)][1].ItemType)
		assert.Greater(t, int(itemsSupply[uint(itemType1)][1].TotalBalance.Int64()), 0)

		assert.Len(t, itemsSupply[uint(itemType2)], 1)
		assert.Greater(t, int(itemsSupply[uint(itemType2)][0].ItemID), 0)
		assert.Equal(t, itemType2, itemsSupply[uint(itemType2)][0].ItemType)
		assert.Greater(t, int(itemsSupply[uint(itemType2)][0].TotalBalance.Int64()), 0)
	})

	t.Run("fails when no item types provided", func(t *testing.T) {
		items, err := apitest.Client().GetItemSuppliesByType(context.Background(), nil)
		require.ErrorContains(t, err, "itemTypes cannot be empty")
		assert.Nil(t, items)
	})
}

func TestMarkItemsNotNew(t *testing.T) {
	var accountID proto.AccountID

	var itemOwned1, itemOwned2, itemOwned3 *data.Item

	// Setup
	{
		// Accounts
		{
			var err error
			accountID, _, err = apitest.CreateRandomAccount("TestMarkItemsNotNew")
			require.NoError(t, err)
		}

		// Items
		{
			itemOwned1 = &data.Item{
				Item: &proto.Item{
					AccountID: accountID,
					ItemType:  proto.ItemType_SW_BASE_CARDS,
					TokenID:   1,
					Balance:   prototyp.NewBigInt(1),
				},
			}
			err := data.DB.Save(itemOwned1)
			require.NoError(t, err)

			itemOwned2 = &data.Item{
				Item: &proto.Item{
					AccountID: accountID,
					ItemType:  proto.ItemType_SW_BASE_CARDS,
					TokenID:   2,
					Balance:   prototyp.NewBigInt(1),
				},
			}
			err = data.DB.Save(itemOwned2)
			require.NoError(t, err)

			itemOwned3 = &data.Item{
				Item: &proto.Item{
					AccountID: accountID,
					ItemType:  proto.ItemType_SW_BASE_CARDS,
					TokenID:   3,
					Balance:   prototyp.NewBigInt(1),
				},
			}
			err = data.DB.Save(itemOwned3)
			require.NoError(t, err)
		}
	}

	ctx := apitest.AccountContext(accountID)

	t.Run("marks as not new when immediately set to true", func(t *testing.T) {
		savedItem, err := data.DB.Items().FindOne(db.Cond{"id": itemOwned1.ID})
		require.NoError(t, err)
		require.NotNil(t, savedItem)
		assert.True(t, *savedItem.IsNew)

		tokenID := data.ItemTypeAndID2SWTokenID(itemOwned1.ItemType, itemOwned1.TokenID)
		immediately := true

		ok, err := apitest.Client().MarkItemsNotNew(ctx, []uint64{tokenID}, &immediately)
		require.NoError(t, err)
		assert.True(t, ok)

		savedItem, err = data.DB.Items().FindOne(db.Cond{"id": itemOwned1.ID})
		require.NoError(t, err)
		require.NotNil(t, savedItem)
		assert.False(t, *savedItem.IsNew)

		ok, err = apitest.Client().MarkItemsNotNew(ctx, []uint64{tokenID}, &immediately)
		require.NoError(t, err)
		assert.True(t, ok)
	})

	t.Run("schedules marking as not new when immediately is not set", func(t *testing.T) {
		// Setup
		{
			// Tasks
			{
				t.Cleanup(func() {
					err := data.DB.Tasks().Find(db.Cond{"account_id": accountID}).Delete()
					require.NoError(t, err)
				})
			}
		}

		savedItem, err := data.DB.Items().FindOne(db.Cond{"id": itemOwned2.ID})
		require.NoError(t, err)
		require.NotNil(t, savedItem)
		assert.True(t, *savedItem.IsNew)

		tokenID := data.ItemTypeAndID2SWTokenID(itemOwned2.ItemType, itemOwned2.TokenID)

		ok, err := apitest.Client().MarkItemsNotNew(ctx, []uint64{tokenID}, nil)
		require.NoError(t, err)
		assert.True(t, ok)

		task, taskPayload, err := apitest.GetTask[jobqueue.MarkNotNewTask](jobqueue.MarkNotNewWorkGroup, &accountID)
		require.NoError(t, err)
		require.NotNil(t, task)
		require.NotNil(t, taskPayload)
		assert.Equal(t, accountID, taskPayload.AccountID)
		assert.Contains(t, taskPayload.TokenIDs, tokenID)

		savedItem, err = data.DB.Items().FindOne(db.Cond{"id": itemOwned2.ID})
		require.NoError(t, err)
		require.NotNil(t, savedItem)
		assert.True(t, *savedItem.IsNew)
	})

	t.Run("schedules marking as not new when immediately set to false", func(t *testing.T) {
		// Setup
		{
			// Tasks
			{
				t.Cleanup(func() {
					err := data.DB.Tasks().Find(db.Cond{"account_id": accountID}).Delete()
					require.NoError(t, err)
				})
			}
		}

		savedItem, err := data.DB.Items().FindOne(db.Cond{"id": itemOwned3.ID})
		require.NoError(t, err)
		require.NotNil(t, savedItem)
		assert.True(t, *savedItem.IsNew)

		tokenID := data.ItemTypeAndID2SWTokenID(itemOwned3.ItemType, itemOwned3.TokenID)
		immediately := false

		ok, err := apitest.Client().MarkItemsNotNew(ctx, []uint64{tokenID}, &immediately)
		require.NoError(t, err)
		assert.True(t, ok)

		task, taskPayload, err := apitest.GetTask[jobqueue.MarkNotNewTask](jobqueue.MarkNotNewWorkGroup, &accountID)
		require.NoError(t, err)
		require.NotNil(t, task)
		require.NotNil(t, taskPayload)
		assert.Equal(t, accountID, taskPayload.AccountID)
		assert.Contains(t, taskPayload.TokenIDs, tokenID)

		savedItem, err = data.DB.Items().FindOne(db.Cond{"id": itemOwned3.ID})
		require.NoError(t, err)
		require.NotNil(t, savedItem)
		assert.True(t, *savedItem.IsNew)
	})
}

func TestEquipAndUnequipItem(t *testing.T) {
	var accountID, anotherAccountID proto.AccountID

	var itemOwned, itemOwnedByAnotherAccount *data.Item

	// Setup
	{
		// Accounts
		{
			var err error
			accountID, _, err = apitest.CreateRandomAccount("TestEquipAndUnequipItem")
			require.NoError(t, err)

			anotherAccountID, _, err = apitest.CreateRandomAccount("TestEquipAndUnequipItem-another")
			require.NoError(t, err)
		}

		// Items
		{
			itemOwned = &data.Item{
				Item: &proto.Item{
					AccountID: accountID,
					ItemType:  proto.ItemType_SW_STICKERS,
					TokenID:   1,
					Balance:   prototyp.NewBigInt(1),
				},
			}
			err := data.DB.Save(itemOwned)
			require.NoError(t, err)

			itemOwnedByAnotherAccount = &data.Item{
				Item: &proto.Item{
					AccountID: anotherAccountID,
					ItemType:  proto.ItemType_SW_STICKERS,
					TokenID:   2,
					Balance:   prototyp.NewBigInt(1),
				},
			}
			err = data.DB.Save(itemOwnedByAnotherAccount)
			require.NoError(t, err)
		}
	}

	ctx := apitest.AccountContext(accountID)

	t.Run("success", func(t *testing.T) {
		item, err := apitest.Client().EquipItem(ctx, &itemOwned.ItemType, itemOwned.TokenID)
		require.NoError(t, err)
		assert.Equal(t, itemOwned.Item.ID, item.ID)

		count, err := data.DB.ItemsEquipped().Find(db.Cond{"items_id": itemOwned.ID}).Count()
		require.NoError(t, err)
		assert.Equal(t, 1, int(count))

		ok, err := apitest.Client().UnequipItem(ctx, &itemOwned.ItemType, itemOwned.TokenID)
		require.NoError(t, err)
		assert.True(t, ok)

		count, err = data.DB.ItemsEquipped().Find(db.Cond{"items_id": itemOwned.ID}).Count()
		require.NoError(t, err)
		assert.Equal(t, 0, int(count))
	})

	t.Run("fails when it is not owned", func(t *testing.T) {
		item, err := apitest.Client().EquipItem(ctx, &itemOwnedByAnotherAccount.ItemType, itemOwnedByAnotherAccount.TokenID)
		require.ErrorContains(t, err, "item is not owned")
		assert.Nil(t, item)

		ok, err := apitest.Client().UnequipItem(ctx, &itemOwnedByAnotherAccount.ItemType, itemOwnedByAnotherAccount.TokenID)
		require.ErrorContains(t, err, "item is not owned")
		assert.False(t, ok)
	})

	t.Run("fails when item type is nil", func(t *testing.T) {
		item, err := apitest.Client().EquipItem(ctx, nil, itemOwned.TokenID)
		require.ErrorContains(t, err, "item type is nil")
		assert.Nil(t, item)

		ok, err := apitest.Client().UnequipItem(ctx, nil, itemOwned.TokenID)
		require.ErrorContains(t, err, "item type is nil")
		assert.False(t, ok)
	})
}

func TestListEquippedItems(t *testing.T) {
	var accountID proto.AccountID

	var item1, item2 *data.Item

	// Setup
	{
		// Accounts
		{
			var err error
			accountID, _, err = apitest.CreateRandomAccount("TestListEquippedItems")
			require.NoError(t, err)
		}

		// Items
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
					ItemType:  proto.ItemType_SW_CARD_BACKS,
					TokenID:   1,
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
	}

	ctx := apitest.AccountContext(accountID)

	result, err := apitest.Client().ListEquippedItems(ctx, &item2.ItemType)
	require.NoError(t, err)

	require.Len(t, result, 1)
	assert.Equal(t, item2.Item.ID, result[0].ID)
}

func TestGetDeckEquipmentByDeckString(t *testing.T) {
	var accountID proto.AccountID

	var address, anotherAddress proto.Hash

	var deck *proto.Deck

	var sticker, heroSkin, cardBack1, cardBack2 *data.Item

	var cardBackTokenIDs []uint64

	// Setup
	{
		// Accounts
		{
			var err error
			accountID, address, err = apitest.CreateRandomAccount("TestGetDeckEquipmentByDeckString")
			require.NoError(t, err)

			anotherAddress = apitest.RandomAddress()
		}

		// Decks
		{
			deck = data.GetStarterDecks()[0]
		}

		// Items
		{
			{
				sticker = &data.Item{
					Item: &proto.Item{
						AccountID: accountID,
						ItemType:  proto.ItemType_SW_STICKERS,
						TokenID:   1,
						Balance:   prototyp.NewBigInt(1),
					},
				}
				err := data.DB.Save(sticker)
				require.NoError(t, err)

				err = data.DB.ItemsEquipped().Equip(sticker)
				require.NoError(t, err)
			}

			{
				hero := data.DeckClassHero(deck.Class)

				err := data.DB.Save(&data.HeroSkin{
					ID:   uint64(hero),
					Hero: hero,
				})
				require.NoError(t, err)

				heroSkin = &data.Item{
					Item: &proto.Item{
						AccountID: accountID,
						ItemType:  proto.ItemType_SW_HERO_SKINS,
						TokenID:   uint64(hero),
						Balance:   prototyp.NewBigInt(1),
					},
				}
				err = data.DB.Save(heroSkin)
				require.NoError(t, err)
			}

			{
				cardBack1 = &data.Item{
					Item: &proto.Item{
						AccountID: accountID,
						ItemType:  proto.ItemType_SW_CARD_BACKS,
						TokenID:   2,
						Balance:   prototyp.NewBigInt(1),
					},
				}
				err := data.DB.Save(cardBack1)
				require.NoError(t, err)

				err = data.DB.ItemsEquipped().Equip(cardBack1)
				require.NoError(t, err)

				cardBackTokenIDs = append(cardBackTokenIDs, cardBack1.TokenID)
			}

			{
				cardBack2 = &data.Item{
					Item: &proto.Item{
						AccountID: accountID,
						ItemType:  proto.ItemType_SW_CARD_BACKS,
						TokenID:   3,
						Balance:   prototyp.NewBigInt(1),
					},
				}
				err := data.DB.Save(cardBack2)
				require.NoError(t, err)

				err = data.DB.ItemsEquipped().Equip(cardBack2)
				require.NoError(t, err)

				cardBackTokenIDs = append(cardBackTokenIDs, cardBack2.TokenID)
			}
		}
	}

	ctx := apitest.AccountContext(accountID)

	deckString, err := data.EncodeDeckString(deck.CardIDs, deck.Class)
	require.NoError(t, err)

	t.Run("uses authenticated account", func(t *testing.T) {
		deckEquipment, err := apitest.Client().GetDeckEquipmentByDeckString(ctx, nil, deckString)
		require.NoError(t, err)

		require.NotNil(t, deckEquipment)
		assert.Contains(t, deckEquipment.Stickers, sticker.TokenID)
		require.NotNil(t, deckEquipment.HeroSkin)
		assert.Equal(t, heroSkin.TokenID, *deckEquipment.HeroSkin)
		require.NotNil(t, deckEquipment.CardBack)
		assert.Contains(t, cardBackTokenIDs, *deckEquipment.CardBack)
	})

	t.Run("uses authenticated account even when address provided", func(t *testing.T) {
		accountAddress := anotherAddress.String()
		deckEquipment, err := apitest.Client().GetDeckEquipmentByDeckString(ctx, &accountAddress, deckString)
		require.NoError(t, err)

		require.NotNil(t, deckEquipment)
		assert.Contains(t, deckEquipment.Stickers, sticker.TokenID)
		require.NotNil(t, deckEquipment.HeroSkin)
		assert.Equal(t, heroSkin.TokenID, *deckEquipment.HeroSkin)
		require.NotNil(t, deckEquipment.CardBack)
		assert.Contains(t, cardBackTokenIDs, *deckEquipment.CardBack)
	})

	t.Run("uses address provided when called from service", func(t *testing.T) {
		ctx := apitest.ServiceContext()
		accountAddress := address.String()
		deckEquipment, err := apitest.Client().GetDeckEquipmentByDeckString(ctx, &accountAddress, deckString)
		require.NoError(t, err)

		require.NotNil(t, deckEquipment)
		assert.Contains(t, deckEquipment.Stickers, sticker.TokenID)
		require.NotNil(t, deckEquipment.HeroSkin)
		assert.Equal(t, heroSkin.TokenID, *deckEquipment.HeroSkin)
		require.NotNil(t, deckEquipment.CardBack)
		assert.Contains(t, cardBackTokenIDs, *deckEquipment.CardBack)
	})
}

func createTokenSupplyItem(t *testing.T, tokenID uint64, itemType proto.ItemType) db.ID {
	accountAddress := proto.HashFromString("")
	contractAddress := apitest.RandomAddress()
	insertResult, err := data.DB.Items(nil).Insert(data.Item{Item: &proto.Item{
		ItemType:        itemType,
		TokenID:         tokenID,
		Balance:         prototyp.NewBigInt(2),
		AccountAddress:  &accountAddress,
		ContractAddress: &contractAddress,
	}})
	require.NoError(t, err)

	return insertResult.ID()
}

func cleanupItems(t *testing.T, itemIDs []db.ID) {
	result := data.DB.Items(nil).Find(db.Cond{"id": db.AnyOf(itemIDs)})
	err := result.Delete()
	require.NoError(t, err)
}
