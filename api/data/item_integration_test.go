//go:build integration

package data_test

import (
	"context"
	"math/big"
	"sync"
	"testing"

	"github.com/0xsequence/go-sequence/lib/prototyp"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/upper/db/v4"

	"github.com/horizon-games/OpenSky/api/apitest"
	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/proto"
)

func TestConvertTokenID(t *testing.T) {
	tests := []proto.ItemType{
		proto.ItemType_SW_BASE_CARDS,
		proto.ItemType_SW_SILVER_CARDS,
		proto.ItemType_SW_GOLD_CARDS,
		proto.ItemType_SW_HERO_SKINS,
		proto.ItemType_SW_CRYSTALS,
		proto.ItemType_SW_STICKERS,
		proto.ItemType_SW_STICKER_POINTS,
		proto.ItemType_SW_CARD_BACKS,
		proto.ItemType_SW_SKYPASS,
		proto.ItemType_SW_CONQUEST_TICKET,
		proto.ItemType_SW_TITLES,
		proto.ItemType_SW_XP,
	}

	itemID := uint64(2)

	for _, itemType := range tests {
		t.Run(itemType.String(), func(t *testing.T) {
			tokenID := data.ItemTypeAndID2SWTokenID(itemType, itemID)

			resultItemType, resultItemID, err := data.SWTokenID2TypeAndItemID(tokenID)
			require.NoError(t, err)
			assert.Equal(t, itemType, resultItemType)
			assert.Equal(t, itemID, resultItemID)
		})
	}
}

func TestItemStore(t *testing.T) {
	var accountID proto.AccountID

	// Setup
	{
		// Accounts
		{
			var err error

			accountID, _, err = apitest.CreateRandomAccount("TestItemStore")
			require.NoError(t, err)
		}
	}

	t.Run("gain token", func(t *testing.T) {
		itemType := proto.ItemType_SW_SILVER_CARDS
		transactionType := proto.TransactionType_GOOGLE_PLAY

		t.Run("creates new item", func(t *testing.T) {
			itemID := uint64(3)
			tokenID := data.ItemTypeAndID2SWTokenID(itemType, itemID)
			amount := big.NewInt(2)
			externalID := uuid.NewString()

			err := data.DB.Items().GainToken(accountID, tokenID, amount, transactionType, externalID)
			require.NoError(t, err)

			item, err := data.DB.Items().FindAccountItem(accountID, itemType, itemID)
			require.NoError(t, err)
			require.NotNil(t, item)

			transaction, err := data.DB.Transactions().FindOne(db.Cond{
				"account_id":      accountID,
				"external_txn_id": externalID,
			})
			require.NoError(t, err)
			require.NotNil(t, transaction)

			assert.Equal(t, transactionType, transaction.TransactionType)
			assert.Equal(t, tokenID, transaction.TokenID)
			assert.Equal(t, amount.Int64(), transaction.Amount.Int64())
		})

		t.Run("updates existing item", func(t *testing.T) {
			itemID := uint64(4)
			tokenID := data.ItemTypeAndID2SWTokenID(itemType, itemID)
			originalAmount := big.NewInt(2)

			// Setup
			{
				// Items
				{
					item := &data.Item{
						Item: &proto.Item{
							AccountID: accountID,
							ItemType:  itemType,
							TokenID:   itemID,
							Balance:   prototyp.ToBigInt(originalAmount),
						},
					}
					err := data.DB.Save(item)
					require.NoError(t, err)
				}
			}

			amount := big.NewInt(3)
			externalID := uuid.NewString()

			err := data.DB.Items().GainToken(accountID, tokenID, amount, transactionType, externalID)
			require.NoError(t, err)

			item, err := data.DB.Items().FindAccountItem(accountID, itemType, itemID)
			require.NoError(t, err)
			require.NotNil(t, item)

			assert.Equal(t, originalAmount.Add(originalAmount, amount), item.Balance.Int())

			transaction, err := data.DB.Transactions().FindOne(db.Cond{
				"account_id":      accountID,
				"external_txn_id": externalID,
			})
			require.NoError(t, err)
			require.NotNil(t, transaction)

			assert.Equal(t, transactionType, transaction.TransactionType)
			assert.Equal(t, tokenID, transaction.TokenID)
			assert.Equal(t, amount.Int64(), transaction.Amount.Int64())
		})

		t.Run("generates random external ID if none provided", func(t *testing.T) {
			itemID := uint64(5)
			tokenID := data.ItemTypeAndID2SWTokenID(itemType, itemID)
			amount := big.NewInt(2)
			externalID := ""

			err := data.DB.Items().GainToken(accountID, tokenID, amount, transactionType, externalID)
			require.NoError(t, err)

			item, err := data.DB.Items().FindAccountItem(accountID, itemType, itemID)
			require.NoError(t, err)
			require.NotNil(t, item)

			transaction, err := data.DB.Transactions().FindOne(db.Cond{
				"account_id": accountID,
				"token_id":   tokenID,
			})
			require.NoError(t, err)
			require.NotNil(t, transaction)

			assert.NotEmpty(t, transaction.ExternalTxnID)
		})

		t.Run("fails when no amount is provided", func(t *testing.T) {
			itemID := uint64(3)
			tokenID := data.ItemTypeAndID2SWTokenID(itemType, itemID)
			externalID := uuid.NewString()

			err := data.DB.Items().GainToken(accountID, tokenID, nil, transactionType, externalID)
			require.ErrorContains(t, err, "no amount")

			transaction, err := data.DB.Transactions().FindOne(db.Cond{
				"account_id":      accountID,
				"external_txn_id": externalID,
			})
			require.ErrorIs(t, err, db.ErrNoMoreRows)
			require.Nil(t, transaction)
		})

		t.Run("fails when amount is zero", func(t *testing.T) {
			itemID := uint64(3)
			tokenID := data.ItemTypeAndID2SWTokenID(itemType, itemID)
			amount := big.NewInt(0)
			externalID := uuid.NewString()

			err := data.DB.Items().GainToken(accountID, tokenID, amount, transactionType, externalID)
			require.ErrorContains(t, err, "amount is zero")

			transaction, err := data.DB.Transactions().FindOne(db.Cond{
				"account_id":      accountID,
				"external_txn_id": externalID,
			})
			require.ErrorIs(t, err, db.ErrNoMoreRows)
			require.Nil(t, transaction)
		})

		t.Run("fails when amount is negative", func(t *testing.T) {
			itemID := uint64(3)
			tokenID := data.ItemTypeAndID2SWTokenID(itemType, itemID)
			amount := big.NewInt(-2)
			externalID := uuid.NewString()

			err := data.DB.Items().GainToken(accountID, tokenID, amount, transactionType, externalID)
			require.ErrorContains(t, err, "amount is negative")

			transaction, err := data.DB.Transactions().FindOne(db.Cond{
				"account_id":      accountID,
				"external_txn_id": externalID,
			})
			require.ErrorIs(t, err, db.ErrNoMoreRows)
			require.Nil(t, transaction)
		})

		t.Run("fails when transaction type is unknown", func(t *testing.T) {
			itemID := uint64(3)
			tokenID := data.ItemTypeAndID2SWTokenID(itemType, itemID)
			amount := big.NewInt(2)
			externalID := uuid.NewString()

			err := data.DB.Items().GainToken(accountID, tokenID, amount, proto.TransactionType_UNKNOWN, externalID)
			require.ErrorContains(t, err, "transaction type is unknown")

			transaction, err := data.DB.Transactions().FindOne(db.Cond{
				"account_id":      accountID,
				"external_txn_id": externalID,
			})
			require.ErrorIs(t, err, db.ErrNoMoreRows)
			require.Nil(t, transaction)
		})
	})

	t.Run("spend token", func(t *testing.T) {
		itemType := proto.ItemType_SW_SILVER_CARDS
		transactionType := proto.TransactionType_SKYWEAVER

		t.Run("updates existing item", func(t *testing.T) {
			itemID := uint64(11)
			tokenID := data.ItemTypeAndID2SWTokenID(itemType, itemID)
			originalAmount := big.NewInt(3)

			// Setup
			{
				// Items
				{
					item := &data.Item{
						Item: &proto.Item{
							AccountID: accountID,
							ItemType:  itemType,
							TokenID:   itemID,
							Balance:   prototyp.ToBigInt(originalAmount),
						},
					}
					err := data.DB.Save(item)
					require.NoError(t, err)
				}
			}

			amount := big.NewInt(1)
			externalID := uuid.NewString()

			err := data.DB.Items().SpendToken(accountID, tokenID, amount, transactionType, externalID)
			require.NoError(t, err)

			item, err := data.DB.Items().FindAccountItem(accountID, itemType, itemID)
			require.NoError(t, err)
			require.NotNil(t, item)

			assert.Equal(t, big.NewInt(2), item.Balance.Int())

			transaction, err := data.DB.Transactions().FindOne(db.Cond{
				"account_id":      accountID,
				"external_txn_id": externalID,
			})
			require.NoError(t, err)
			require.NotNil(t, transaction)

			assert.Equal(t, transactionType, transaction.TransactionType)
			assert.Equal(t, tokenID, transaction.TokenID)
			assert.Equal(t, big.NewInt(-1), transaction.Amount.Int())
		})

		t.Run("generates random external ID if none provided", func(t *testing.T) {
			itemID := uint64(12)
			tokenID := data.ItemTypeAndID2SWTokenID(itemType, itemID)
			originalAmount := big.NewInt(3)

			// Setup
			{
				// Items
				{
					item := &data.Item{
						Item: &proto.Item{
							AccountID: accountID,
							ItemType:  itemType,
							TokenID:   itemID,
							Balance:   prototyp.ToBigInt(originalAmount),
						},
					}
					err := data.DB.Save(item)
					require.NoError(t, err)
				}
			}

			amount := big.NewInt(1)
			externalID := ""

			err := data.DB.Items().SpendToken(accountID, tokenID, amount, transactionType, externalID)
			require.NoError(t, err)

			item, err := data.DB.Items().FindAccountItem(accountID, itemType, itemID)
			require.NoError(t, err)
			require.NotNil(t, item)

			transaction, err := data.DB.Transactions().FindOne(db.Cond{
				"account_id": accountID,
				"token_id":   tokenID,
			})
			require.NoError(t, err)
			require.NotNil(t, transaction)

			assert.NotEmpty(t, transaction.ExternalTxnID)
		})

		t.Run("fails when the balance would be negative", func(t *testing.T) {
			itemID := uint64(13)
			tokenID := data.ItemTypeAndID2SWTokenID(itemType, itemID)
			originalAmount := big.NewInt(2)

			// Setup
			{
				// Items
				{
					item := &data.Item{
						Item: &proto.Item{
							AccountID: accountID,
							ItemType:  itemType,
							TokenID:   itemID,
							Balance:   prototyp.ToBigInt(originalAmount),
						},
					}
					err := data.DB.Save(item)
					require.NoError(t, err)
				}
			}

			amount := big.NewInt(3)

			err := data.DB.Items().SpendToken(accountID, tokenID, amount, transactionType, "")
			require.ErrorIs(t, err, data.ErrInsufficientBalance)
		})

		t.Run("fails when the item does not exist", func(t *testing.T) {
			itemID := uint64(14)
			tokenID := data.ItemTypeAndID2SWTokenID(itemType, itemID)

			amount := big.NewInt(1)

			err := data.DB.Items().SpendToken(accountID, tokenID, amount, transactionType, "")
			require.ErrorIs(t, err, data.ErrInsufficientBalance)
		})

		t.Run("fails when no amount is provided", func(t *testing.T) {
			itemID := uint64(3)
			tokenID := data.ItemTypeAndID2SWTokenID(itemType, itemID)
			externalID := uuid.NewString()

			err := data.DB.Items().SpendToken(accountID, tokenID, nil, transactionType, externalID)
			require.ErrorContains(t, err, "no amount")

			transaction, err := data.DB.Transactions().FindOne(db.Cond{
				"account_id":      accountID,
				"external_txn_id": externalID,
			})
			require.ErrorIs(t, err, db.ErrNoMoreRows)
			require.Nil(t, transaction)
		})

		t.Run("fails when amount is zero", func(t *testing.T) {
			itemID := uint64(3)
			tokenID := data.ItemTypeAndID2SWTokenID(itemType, itemID)
			amount := big.NewInt(0)
			externalID := uuid.NewString()

			err := data.DB.Items().SpendToken(accountID, tokenID, amount, transactionType, externalID)
			require.ErrorContains(t, err, "amount is zero")

			transaction, err := data.DB.Transactions().FindOne(db.Cond{
				"account_id":      accountID,
				"external_txn_id": externalID,
			})
			require.ErrorIs(t, err, db.ErrNoMoreRows)
			require.Nil(t, transaction)
		})

		t.Run("fails when amount is negative", func(t *testing.T) {
			itemID := uint64(3)
			tokenID := data.ItemTypeAndID2SWTokenID(itemType, itemID)
			amount := big.NewInt(-2)
			externalID := uuid.NewString()

			err := data.DB.Items().SpendToken(accountID, tokenID, amount, transactionType, externalID)
			require.ErrorContains(t, err, "amount is negative")

			transaction, err := data.DB.Transactions().FindOne(db.Cond{
				"account_id":      accountID,
				"external_txn_id": externalID,
			})
			require.ErrorIs(t, err, db.ErrNoMoreRows)
			require.Nil(t, transaction)
		})

		t.Run("fails when transaction type is unknown", func(t *testing.T) {
			itemID := uint64(3)
			tokenID := data.ItemTypeAndID2SWTokenID(itemType, itemID)
			amount := big.NewInt(2)
			externalID := uuid.NewString()

			err := data.DB.Items().SpendToken(accountID, tokenID, amount, proto.TransactionType_UNKNOWN, externalID)
			require.ErrorContains(t, err, "transaction type is unknown")

			transaction, err := data.DB.Transactions().FindOne(db.Cond{
				"account_id":      accountID,
				"external_txn_id": externalID,
			})
			require.ErrorIs(t, err, db.ErrNoMoreRows)
			require.Nil(t, transaction)
		})
	})

	t.Run("gain, get and spend sticker points", func(t *testing.T) {
		transactionType := proto.TransactionType_SKYWEAVER

		stickerPoints, err := data.DB.Items().GetStickerPoints(accountID)
		require.NoError(t, err)
		assert.Zero(t, stickerPoints)

		_, err = data.DB.Items().FindAccountItem(accountID, proto.ItemType_SW_STICKER_POINTS, data.StickerPointsItemID)
		require.ErrorIs(t, err, db.ErrNoMoreRows)

		err = data.DB.Items().GainStickerPoints(accountID, big.NewInt(1), transactionType, "")
		require.NoError(t, err)

		stickerPoints, err = data.DB.Items().GetStickerPoints(accountID)
		require.NoError(t, err)
		assert.Equal(t, 1, int(stickerPoints))

		err = data.DB.Items().GainStickerPoints(accountID, big.NewInt(2), transactionType, "")
		require.NoError(t, err)

		stickerPoints, err = data.DB.Items().GetStickerPoints(accountID)
		require.NoError(t, err)
		assert.Equal(t, 3, int(stickerPoints))

		item, err := data.DB.Items().FindAccountItem(accountID, proto.ItemType_SW_STICKER_POINTS, data.StickerPointsItemID)
		require.NoError(t, err)
		require.NotNil(t, item)
		assert.Equal(t, 3, int(item.Balance.Int64()))

		err = data.DB.Items().SpendStickerPoints(accountID, big.NewInt(1), transactionType, "")
		require.NoError(t, err)

		stickerPoints, err = data.DB.Items().GetStickerPoints(accountID)
		require.NoError(t, err)
		assert.Equal(t, 2, int(stickerPoints))
	})

	t.Run("gain, get and spend XP", func(t *testing.T) {
		transactionType := proto.TransactionType_SKYWEAVER

		// Setup
		{
			result, err := data.DB.SQL().Exec("UPDATE accounts SET experience = ? WHERE id = ?", 100, accountID)
			require.NoError(t, err)
			rowsAffected, err := result.RowsAffected()
			require.NoError(t, err)
			assert.Equal(t, 1, int(rowsAffected))
		}

		// It should migrate experience from the account record into items when the XP item does not exist.
		{
			_, err := data.DB.Items().FindAccountItem(accountID, proto.ItemType_SW_XP, data.XPItemID)
			require.ErrorIs(t, err, db.ErrNoMoreRows)

			row, err := data.DB.SQL().QueryRow("SELECT experience FROM accounts WHERE id = ?", accountID)
			require.NoError(t, err)

			var experience uint64

			err = row.Scan(&experience)
			require.NoError(t, err)

			assert.Equal(t, 100, int(experience))

			// Process in parallel to test out a race condition.
			{
				wg := sync.WaitGroup{}
				wg.Add(2)

				ctx, cancelFn := context.WithCancel(context.Background())

				for i := 0; i < 2; i++ {
					go func() {
						err := data.DB.Tx(func(sess db.Session) error {
							xp, err := data.DB.Items(sess).GetXP(accountID)
							if err != nil {
								wg.Done()
								return err
							}

							assert.Equal(t, 100, int(xp))

							wg.Done()

							ctx.Done()

							return nil
						})
						require.NoError(t, err)
					}()
				}

				wg.Wait()
				cancelFn()
			}

			row, err = data.DB.SQL().QueryRow("SELECT experience FROM accounts WHERE id = ?", accountID)
			require.NoError(t, err)

			err = row.Scan(&experience)
			require.NoError(t, err)

			assert.Equal(t, 0, int(experience))

			item, err := data.DB.Items().FindAccountItem(accountID, proto.ItemType_SW_XP, data.XPItemID)
			require.NoError(t, err)
			require.NotNil(t, item)
			assert.Equal(t, 100, int(item.Balance.Int64()))
		}

		err := data.DB.Items().GainXP(accountID, big.NewInt(1), transactionType, "")
		require.NoError(t, err)

		xp, err := data.DB.Items().GetXP(accountID)
		require.NoError(t, err)
		assert.Equal(t, 101, int(xp))

		err = data.DB.Items().GainXP(accountID, big.NewInt(2), transactionType, "")
		require.NoError(t, err)

		xp, err = data.DB.Items().GetXP(accountID)
		require.NoError(t, err)
		assert.Equal(t, 103, int(xp))

		item, err := data.DB.Items().FindAccountItem(accountID, proto.ItemType_SW_XP, data.XPItemID)
		require.NoError(t, err)
		require.NotNil(t, item)
		assert.Equal(t, 103, int(item.Balance.Int64()))

		err = data.DB.Items().SpendXP(accountID, big.NewInt(1), transactionType, "")
		require.NoError(t, err)

		xp, err = data.DB.Items().GetXP(accountID)
		require.NoError(t, err)
		assert.Equal(t, 102, int(xp))
	})

	t.Run("gain, get and spend conquest tickets", func(t *testing.T) {
		transactionType := proto.TransactionType_SKYWEAVER

		conquestTickets, err := data.DB.Items().GetConquestTickets(accountID)
		require.NoError(t, err)
		assert.Zero(t, conquestTickets)

		_, err = data.DB.Items().FindAccountItem(accountID, proto.ItemType_SW_CONQUEST_TICKET, data.ConquestTicketItemID)
		require.ErrorIs(t, err, db.ErrNoMoreRows)

		err = data.DB.Items().GainConquestTickets(accountID, big.NewInt(1), transactionType, "")
		require.NoError(t, err)

		conquestTickets, err = data.DB.Items().GetConquestTickets(accountID)
		require.NoError(t, err)
		assert.Equal(t, 1, int(conquestTickets))

		err = data.DB.Items().GainConquestTickets(accountID, big.NewInt(2), transactionType, "")
		require.NoError(t, err)

		conquestTickets, err = data.DB.Items().GetConquestTickets(accountID)
		require.NoError(t, err)
		assert.Equal(t, 3, int(conquestTickets))

		item, err := data.DB.Items().FindAccountItem(accountID, proto.ItemType_SW_CONQUEST_TICKET, data.ConquestTicketItemID)
		require.NoError(t, err)
		require.NotNil(t, item)
		assert.Equal(t, 3, int(item.Balance.Int64()))

		err = data.DB.Items().SpendConquestTicket(accountID, transactionType, "")
		require.NoError(t, err)

		conquestTickets, err = data.DB.Items().GetConquestTickets(accountID)
		require.NoError(t, err)
		assert.Equal(t, 2, int(conquestTickets))
	})

	t.Run("bulk balance update", func(t *testing.T) {
		itemType := proto.ItemType_SW_SILVER_CARDS

		t.Run("creates new item when does not exist", func(t *testing.T) {
			accountAddress := apitest.RandomAddress()
			contractAddress := apitest.RandomAddress()
			itemID := uint64(2)
			newBalance := prototyp.NewBigInt(3)

			batch := []data.ItemBalanceUpdate{
				{
					AccountAddress:  accountAddress,
					ContractAddress: contractAddress,
					ItemType:        uint(itemType),
					TokenID:         itemID,
					Balance:         newBalance,
				},
			}

			err := data.DB.Items().BulkBalanceUpdate(batch)
			require.NoError(t, err)

			item, err := data.DB.Items().FindOne(db.Cond{
				"account_address":  accountAddress,
				"contract_address": contractAddress,
				"item_type":        itemType,
				"token_id":         itemID,
			})
			require.NoError(t, err)
			assert.Equal(t, newBalance.Uint64(), item.Balance.Uint64())
			assert.Zero(t, item.AccountID)
		})

		t.Run("updates item when exists", func(t *testing.T) {
			accountAddress := apitest.RandomAddress()
			contractAddress := apitest.RandomAddress()
			itemID := uint64(2)
			newBalance := prototyp.NewBigInt(3)

			// Setup
			{
				// Items
				{
					item := &data.Item{Item: &proto.Item{
						AccountAddress:  &accountAddress,
						ContractAddress: &contractAddress,
						ItemType:        itemType,
						TokenID:         itemID,
						Balance:         prototyp.NewBigInt(newBalance.Int64() - 1),
					}}
					err := data.DB.Save(item)
					require.NoError(t, err)
				}
			}

			batch := []data.ItemBalanceUpdate{
				{
					AccountAddress:  accountAddress,
					ContractAddress: contractAddress,
					ItemType:        uint(itemType),
					TokenID:         itemID,
					Balance:         newBalance,
				},
			}

			err := data.DB.Items().BulkBalanceUpdate(batch)
			require.NoError(t, err)

			item, err := data.DB.Items().FindOne(db.Cond{
				"account_address":  accountAddress,
				"contract_address": contractAddress,
				"item_type":        itemType,
				"token_id":         itemID,
			})
			require.NoError(t, err)
			assert.Equal(t, newBalance.Uint64(), item.Balance.Uint64())
			assert.Zero(t, item.AccountID)
		})

		t.Run("assigns account and calculates summaries when account address is registered", func(t *testing.T) {
			var accountID proto.AccountID

			var accountAddress proto.Hash

			var existingAnotherItem *data.Item

			contractAddress := apitest.RandomAddress()
			itemID := uint64(2)
			newBalance := prototyp.NewBigInt(3)

			// Setup
			{
				// Accounts
				{
					var err error
					accountID, accountAddress, err = apitest.CreateRandomAccount("TestItemStore-bulk-1")
					require.NoError(t, err)
				}

				// Items
				{
					existingAnotherItem = &data.Item{Item: &proto.Item{
						AccountID: accountID,
						ItemType:  itemType,
						TokenID:   itemID + 1,
						Balance:   prototyp.NewBigInt(10),
					}}
					err := data.DB.Save(existingAnotherItem)
					require.NoError(t, err)
				}
			}

			batch := []data.ItemBalanceUpdate{
				{
					AccountAddress:  accountAddress,
					ContractAddress: contractAddress,
					ItemType:        uint(itemType),
					TokenID:         itemID,
					Balance:         newBalance,
				},
			}

			err := data.DB.Items().BulkBalanceUpdate(batch)
			require.NoError(t, err)

			item, err := data.DB.Items().FindAccountItem(accountID, itemType, itemID)
			require.NoError(t, err)
			assert.Equal(t, newBalance.Uint64(), item.Balance.Uint64())

			summaries, err := data.DB.ItemSummaries().FindOne(db.Cond{"account_id": accountID, "item_type": itemType})
			require.NoError(t, err)
			assert.Equal(t, newBalance.Int64()+existingAnotherItem.Balance.Int64(), summaries.TotalBalance.Int64())
		})

		t.Run("updates item and calculates summaries when account address is registered", func(t *testing.T) {
			var accountID proto.AccountID

			var accountAddress proto.Hash

			var existingAnotherItem *data.Item

			contractAddress := apitest.RandomAddress()
			itemID := uint64(2)
			newBalance := prototyp.NewBigInt(3)

			// Setup
			{
				// Accounts
				{
					var err error
					accountID, accountAddress, err = apitest.CreateRandomAccount("TestItemStore-bulk-2")
					require.NoError(t, err)
				}

				// Items
				{
					item := &data.Item{Item: &proto.Item{
						AccountID:       accountID,
						AccountAddress:  &accountAddress,
						ContractAddress: &contractAddress,
						ItemType:        itemType,
						TokenID:         itemID,
						Balance:         prototyp.NewBigInt(newBalance.Int64() - 1),
					}}
					err := data.DB.Save(item)
					require.NoError(t, err)

					existingAnotherItem = &data.Item{Item: &proto.Item{
						AccountID: accountID,
						ItemType:  itemType,
						TokenID:   itemID + 1,
						Balance:   prototyp.NewBigInt(10),
					}}
					err = data.DB.Save(existingAnotherItem)
					require.NoError(t, err)
				}
			}

			batch := []data.ItemBalanceUpdate{
				{
					AccountAddress:  accountAddress,
					ContractAddress: contractAddress,
					ItemType:        uint(itemType),
					TokenID:         itemID,
					Balance:         newBalance,
				},
			}

			err := data.DB.Items().BulkBalanceUpdate(batch)
			require.NoError(t, err)

			item, err := data.DB.Items().FindAccountItem(accountID, itemType, itemID)
			require.NoError(t, err)
			assert.Equal(t, newBalance.Uint64(), item.Balance.Uint64())

			summaries, err := data.DB.ItemSummaries().FindOne(db.Cond{"account_id": accountID, "item_type": itemType})
			require.NoError(t, err)
			assert.Equal(t, newBalance.Int64()+existingAnotherItem.Balance.Int64(), summaries.TotalBalance.Int64())
		})
	})

	t.Run("assign items to account", func(t *testing.T) {
		t.Run("assigns when it is not assigned yet", func(t *testing.T) {
			address := apitest.RandomAddress()
			anotherAddress := apitest.RandomAddress()
			accountID := apitest.RandomAccountID()
			anotherAccountID := apitest.RandomAccountID()
			contractAddress := apitest.RandomAddress()
			itemType := proto.ItemType_SW_SILVER_CARDS

			var unassignedItem, assignedItem, unassignedAnotherAddressItem *data.Item

			// Setup
			{
				// Items
				{
					unassignedItem = &data.Item{Item: &proto.Item{
						AccountAddress:  &address,
						ContractAddress: &contractAddress,
						ItemType:        itemType,
						TokenID:         1,
						Balance:         prototyp.NewBigInt(1),
					}}
					err := data.DB.Save(unassignedItem)
					require.NoError(t, err)

					assignedItem = &data.Item{Item: &proto.Item{
						AccountID:       anotherAccountID,
						AccountAddress:  &address,
						ContractAddress: &contractAddress,
						ItemType:        itemType,
						TokenID:         2,
						Balance:         prototyp.NewBigInt(1),
					}}
					err = data.DB.Save(assignedItem)
					require.NoError(t, err)

					unassignedAnotherAddressItem = &data.Item{Item: &proto.Item{
						AccountAddress:  &anotherAddress,
						ContractAddress: &contractAddress,
						ItemType:        itemType,
						TokenID:         3,
						Balance:         prototyp.NewBigInt(1),
					}}
					err = data.DB.Save(unassignedAnotherAddressItem)
					require.NoError(t, err)
				}
			}

			err := data.DB.Items().AssignItemsToAccount(address, accountID)
			require.NoError(t, err)

			storedItem, err := data.DB.Items().FindOne(db.Cond{"id": unassignedItem.ID})
			require.NoError(t, err)
			require.NotNil(t, storedItem)
			assert.Equal(t, accountID, storedItem.AccountID)
			assert.Equal(t, address, *storedItem.AccountAddress)

			storedItem, err = data.DB.Items().FindOne(db.Cond{"id": assignedItem.ID})
			require.NoError(t, err)
			require.NotNil(t, storedItem)
			assert.Equal(t, anotherAccountID, storedItem.AccountID)
			assert.Equal(t, address, *storedItem.AccountAddress)

			storedItem, err = data.DB.Items().FindOne(db.Cond{"id": unassignedAnotherAddressItem.ID})
			require.NoError(t, err)
			require.NotNil(t, storedItem)
			assert.Equal(t, 0, int(storedItem.AccountID))
			assert.Equal(t, anotherAddress, *storedItem.AccountAddress)
		})
	})

	t.Run("mark not new", func(t *testing.T) {
		itemType := proto.ItemType_SW_SILVER_CARDS
		tokenID := uint64(1)

		item := &data.Item{Item: &proto.Item{
			AccountID: accountID,
			ItemType:  itemType,
			TokenID:   tokenID,
		}}

		err := data.DB.Save(item)
		require.NoError(t, err)
		assert.True(t, *item.IsNew)

		savedItem, err := data.DB.Items().FindOne(db.Cond{"id": item.ID})
		require.NoError(t, err)
		require.NotNil(t, savedItem)
		assert.True(t, *savedItem.IsNew)

		err = data.DB.Items().MarkNotNew(accountID, itemType, tokenID)
		require.NoError(t, err)

		savedItem, err = data.DB.Items().FindOne(db.Cond{"id": item.ID})
		require.NoError(t, err)
		require.NotNil(t, savedItem)
		assert.False(t, *savedItem.IsNew)
	})
}
