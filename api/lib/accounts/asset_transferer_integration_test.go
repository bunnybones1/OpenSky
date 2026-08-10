//go:build integration

package accounts_test

import (
	"context"
	"math/big"
	"testing"

	"github.com/0xsequence/go-sequence/lib/prototyp"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/mock/gomock"

	"github.com/horizon-games/OpenSky/api/apitest"
	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/lib/accounts"
	"github.com/horizon-games/OpenSky/api/lib/accounts/mock"
	"github.com/horizon-games/OpenSky/api/proto"
)

func TestAssetTransferer(t *testing.T) {
	var contractUSDC *mock.MockContractUSDC

	var contractOpenSkyAssets *mock.MockContractOpenSkyAssets

	// Setup
	{
		// Mocks
		{
			ctrl := gomock.NewController(t)

			contractUSDC = mock.NewMockContractUSDC(ctrl)
			contractOpenSkyAssets = mock.NewMockContractOpenSkyAssets(ctrl)
		}
	}

	openskyAssetsContractAddress := apitest.RandomAddress()

	transferer := accounts.NewAssetTransferer(
		contractUSDC,
		contractOpenSkyAssets,
	)

	ctx := context.Background()

	t.Run("compose transaction to transfer from burner", func(t *testing.T) {
		t.Run("contains USDC and opensky assets", func(t *testing.T) {
			var accountID proto.AccountID

			var address, burnerAddress proto.Hash

			var tokens map[uint64]uint64

			// Setup
			{
				// Accounts
				{
					address = apitest.RandomAddress()
					burnerAddress = apitest.RandomAddress()
					account := &data.Account{Account: &proto.Account{
						Name:    "TestAssetTransferer",
						Address: address,
						PrivateSettings: &proto.AccountSettingsWrapper{
							AccountSettings: proto.AccountSettings{
								BurnerAddress: &burnerAddress,
							},
						},
					}}

					err := apitest.CreateAccount(account)
					require.NoError(t, err)

					accountID = account.ID
				}

				// Items
				{
					tokens = make(map[uint64]uint64)

					item1 := &data.Item{Item: &proto.Item{
						AccountID:       accountID,
						AccountAddress:  &burnerAddress,
						ContractAddress: &openskyAssetsContractAddress,
						ItemType:        proto.ItemType_SW_SILVER_CARDS,
						TokenID:         1,
						Balance:         prototyp.NewBigInt(10),
					}}
					err := data.DB.Save(item1)
					require.NoError(t, err)

					token := data.ItemTypeAndID2SWTokenID(item1.ItemType, item1.TokenID)
					tokens[token] = item1.Balance.Uint64()

					item2 := &data.Item{Item: &proto.Item{
						AccountID:       accountID,
						AccountAddress:  &burnerAddress,
						ContractAddress: &openskyAssetsContractAddress,
						ItemType:        proto.ItemType_SW_SILVER_CARDS,
						TokenID:         2,
						Balance:         prototyp.NewBigInt(20),
					}}
					err = data.DB.Save(item2)
					require.NoError(t, err)

					token = data.ItemTypeAndID2SWTokenID(item2.ItemType, item2.TokenID)
					tokens[token] = item2.Balance.Uint64()

					item3 := &data.Item{Item: &proto.Item{
						AccountID:       accountID,
						AccountAddress:  &address,
						ContractAddress: &openskyAssetsContractAddress,
						ItemType:        proto.ItemType_SW_SILVER_CARDS,
						TokenID:         3,
						Balance:         prototyp.NewBigInt(30),
					}}
					err = data.DB.Save(item3)
					require.NoError(t, err)

					item4 := &data.Item{Item: &proto.Item{
						AccountID:      accountID,
						AccountAddress: &burnerAddress,
						ItemType:       proto.ItemType_SW_SILVER_CARDS,
						TokenID:        4,
						Balance:        prototyp.NewBigInt(40),
					}}
					err = data.DB.Save(item4)
					require.NoError(t, err)
				}
			}

			expectedUSDCTransation := &proto.OnChainTransaction{
				To: apitest.RandomAddress().String(),
			}

			expectedAssetsTransation := &proto.OnChainTransaction{
				To: apitest.RandomAddress().String(),
			}

			usdcBalance := big.NewInt(100)

			contractUSDC.EXPECT().CallBalanceOf(gomock.Any(), burnerAddress).Return(usdcBalance, nil)
			contractUSDC.EXPECT().ComposeTransfer(address, usdcBalance).Return(expectedUSDCTransation, nil)

			contractOpenSkyAssets.EXPECT().Address().Return(openskyAssetsContractAddress)

			contractOpenSkyAssets.EXPECT().ComposeSafeBatchTransferFrom(burnerAddress, address, tokens, nil).Return(expectedAssetsTransation, nil)

			transactions, err := transferer.ComposeTransactionToTransferFromBurner(ctx, accountID)
			require.NoError(t, err)
			require.Len(t, transactions, 2)

			assert.Contains(t, transactions, expectedUSDCTransation)
			assert.Contains(t, transactions, expectedAssetsTransation)
		})

		t.Run("returns no transaction when burner does not own any USDC or skyeraver assets", func(t *testing.T) {
			var accountID proto.AccountID

			var burnerAddress proto.Hash

			// Setup
			{
				// Accounts
				{
					burnerAddress = apitest.RandomAddress()
					account := &data.Account{Account: &proto.Account{
						Name:    "TestAssetTransferer-no-transactions",
						Address: apitest.RandomAddress(),
						PrivateSettings: &proto.AccountSettingsWrapper{
							AccountSettings: proto.AccountSettings{
								BurnerAddress: &burnerAddress,
							},
						},
					}}

					err := apitest.CreateAccount(account)
					require.NoError(t, err)

					accountID = account.ID
				}
			}

			contractUSDC.EXPECT().CallBalanceOf(gomock.Any(), burnerAddress).Return(big.NewInt(0), nil)

			contractOpenSkyAssets.EXPECT().Address().Return(openskyAssetsContractAddress)

			transactions, err := transferer.ComposeTransactionToTransferFromBurner(ctx, accountID)
			require.NoError(t, err)
			assert.Empty(t, transactions)
		})

		t.Run("fails when the account was not a burner", func(t *testing.T) {
			var accountID proto.AccountID

			// Setup
			{
				// Accounts
				{
					var err error
					accountID, _, err = apitest.CreateRandomAccount("TestAssetTransferer-no-burner")
					require.NoError(t, err)
				}
			}

			transactions, err := transferer.ComposeTransactionToTransferFromBurner(ctx, accountID)
			require.ErrorContains(t, err, "account was not a burner")
			assert.Empty(t, transactions)
		})
	})
}
