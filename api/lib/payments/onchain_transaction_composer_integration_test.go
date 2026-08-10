//go:build integration

package payments_test

import (
	"context"
	"fmt"
	"math/big"
	"math/rand"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/mock/gomock"

	"github.com/horizon-games/OpenSky/api/apitest"
	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/lib/payments"
	"github.com/horizon-games/OpenSky/api/lib/payments/mock"
	"github.com/horizon-games/OpenSky/api/proto"
)

func TestOnChainTransactionComposer(t *testing.T) {
	var productConverter *mock.MockProductConverter

	var itemTokenGetter *mock.MockItemTokenGetter

	var contractUSDC *mock.MockContractUSDC

	var contractOpenSkyAssets *mock.MockContractOpenSkyAssets

	var contractPaymentProxy *mock.MockContractPaymentProxy

	var accountID proto.AccountID

	var address proto.Hash

	// Setup
	{
		// Account
		{
			var err error

			accountID, address, err = apitest.CreateRandomAccount("TestOnChainTransactionComposer")
			require.NoError(t, err)
		}

		// Mocks
		{
			ctrl := gomock.NewController(t)

			productConverter = mock.NewMockProductConverter(ctrl)
			itemTokenGetter = mock.NewMockItemTokenGetter(ctrl)
			contractUSDC = mock.NewMockContractUSDC(ctrl)
			contractOpenSkyAssets = mock.NewMockContractOpenSkyAssets(ctrl)
			contractPaymentProxy = mock.NewMockContractPaymentProxy(ctrl)
		}
	}

	ctx := context.Background()

	provider := proto.PaymentProvider_SEQUENCE

	productID := "conquest_tickets_0001"
	itemType := proto.ItemType_SW_CONQUEST_TICKET
	amount := int64(1)
	quantity := uint64(2)
	price := big.NewFloat(1)

	tokenID := uint64(123)

	onChainTransactionRequestDataType := "payments.OnChainTransactionRequest"
	onChainTransactionDataType := "[]*proto.OnChainTransaction"

	someError := fmt.Errorf("some error")

	usdcContractAddress := apitest.RandomAddress()
	paymentProxyContractAddress := apitest.RandomAddress()

	contractUSDC.EXPECT().Address().Return(usdcContractAddress)
	contractPaymentProxy.EXPECT().Address().Return(paymentProxyContractAddress)

	composer := payments.NewOnChainTransactionComposer(
		productConverter,
		itemTokenGetter,
		contractUSDC,
		contractOpenSkyAssets,
		contractPaymentProxy,
	)

	t.Run("compose ERC-20", func(t *testing.T) {
		priceItemType := proto.ItemType_USDC

		t.Run("composes transaction", func(t *testing.T) {
			nonce := big.NewInt(int64(rand.Uint32()))
			transactionID := nonce.String()

			expectedApproveTransaction := &proto.OnChainTransaction{
				To: apitest.RandomAddress().String(),
			}
			expectedPurchaseItemsTransaction := &proto.OnChainTransaction{
				To: apitest.RandomAddress().String(),
			}

			productConverter.EXPECT().ToItemType(provider, productID).Return(&itemType, nil)
			productConverter.EXPECT().ToAmount(productID).Return(amount)
			productConverter.EXPECT().ToPrice(provider, productID, priceItemType).Return(price, nil)

			contractPaymentProxy.EXPECT().CallNonces(gomock.Any(), address).Return(nonce, nil)

			itemTokenGetter.EXPECT().GetToken(itemType).Return(tokenID, nil)

			contractUSDC.EXPECT().ComposeApprove(paymentProxyContractAddress, big.NewInt(2000000)).Return(expectedApproveTransaction, nil)

			contractPaymentProxy.EXPECT().ComposePurchaseItems(usdcContractAddress, big.NewInt(2000000), nonce, []uint64{tokenID, tokenID}, address).Return(expectedPurchaseItemsTransaction, nil)

			transactions, err := composer.ComposeERC20(ctx, accountID, productID, quantity)
			require.NoError(t, err)
			require.NotEmpty(t, transactions)

			assert.Contains(t, transactions, expectedApproveTransaction)
			assert.Contains(t, transactions, expectedPurchaseItemsTransaction)

			paymentID := checkPaymentStatus(t, accountID, provider, transactionID, proto.PaymentStatus_PENDING)
			checkPaymentLogs(t, paymentID, []string{onChainTransactionRequestDataType, onChainTransactionDataType})
		})

		t.Run("composes transaction and re-uses existing payment if there is already one with the same nonce", func(t *testing.T) {
			var payment *data.Payment

			nonce := big.NewInt(int64(rand.Uint32()))
			transactionID := nonce.String()

			// Setup
			{
				status := proto.PaymentStatus_FAILED
				payment = &data.Payment{
					Payment: &proto.Payment{
						AccountID:     accountID,
						Status:        &status,
						Provider:      &provider,
						ExternalTxnID: transactionID,
					},
				}
				err := data.DB.Save(payment)
				require.NoError(t, err)
			}

			expectedApproveTransaction := &proto.OnChainTransaction{
				To: apitest.RandomAddress().String(),
			}
			expectedPurchaseItemsTransaction := &proto.OnChainTransaction{
				To: apitest.RandomAddress().String(),
			}

			productConverter.EXPECT().ToItemType(provider, productID).Return(&itemType, nil)
			productConverter.EXPECT().ToAmount(productID).Return(amount)
			productConverter.EXPECT().ToPrice(provider, productID, priceItemType).Return(price, nil)

			itemTokenGetter.EXPECT().GetToken(itemType).Return(tokenID, nil)

			contractPaymentProxy.EXPECT().CallNonces(gomock.Any(), address).Return(nonce, nil)

			contractUSDC.EXPECT().ComposeApprove(paymentProxyContractAddress, big.NewInt(1000000)).Return(expectedApproveTransaction, nil)

			contractPaymentProxy.EXPECT().ComposePurchaseItems(usdcContractAddress, big.NewInt(1000000), nonce, []uint64{tokenID}, address).Return(expectedPurchaseItemsTransaction, nil)

			transactions, err := composer.ComposeERC20(ctx, accountID, productID, 1)
			require.NoError(t, err)
			require.NotNil(t, transactions)

			assert.Contains(t, transactions, expectedApproveTransaction)
			assert.Contains(t, transactions, expectedPurchaseItemsTransaction)

			paymentID := checkPaymentStatus(t, accountID, provider, transactionID, proto.PaymentStatus_PENDING)
			assert.Equal(t, payment.ID, paymentID)
			checkPaymentLogs(t, paymentID, []string{onChainTransactionRequestDataType, onChainTransactionDataType})
		})

		t.Run("fails when getting nonce fails", func(t *testing.T) {
			productConverter.EXPECT().ToItemType(provider, productID).Return(&itemType, nil)
			productConverter.EXPECT().ToAmount(productID).Return(amount)
			productConverter.EXPECT().ToPrice(provider, productID, priceItemType).Return(price, nil)

			itemTokenGetter.EXPECT().GetToken(itemType).Return(tokenID, nil)

			contractPaymentProxy.EXPECT().CallNonces(gomock.Any(), address).Return(nil, someError)

			transaction, err := composer.ComposeERC20(ctx, accountID, productID, 1)
			require.ErrorIs(t, err, someError)
			require.Nil(t, transaction)
		})

		t.Run("fails when item token is zero", func(t *testing.T) {
			productConverter.EXPECT().ToItemType(provider, productID).Return(&itemType, nil)
			productConverter.EXPECT().ToAmount(productID).Return(amount)
			productConverter.EXPECT().ToPrice(provider, productID, priceItemType).Return(price, nil)

			itemTokenGetter.EXPECT().GetToken(itemType).Return(uint64(0), nil)

			transaction, err := composer.ComposeERC20(ctx, accountID, productID, 1)
			require.ErrorContains(t, err, "token ID is zero")
			require.Nil(t, transaction)
		})

		t.Run("fails when getting item token fails", func(t *testing.T) {
			productConverter.EXPECT().ToItemType(provider, productID).Return(&itemType, nil)
			productConverter.EXPECT().ToAmount(productID).Return(amount)
			productConverter.EXPECT().ToPrice(provider, productID, priceItemType).Return(price, nil)

			itemTokenGetter.EXPECT().GetToken(itemType).Return(uint64(0), someError)

			transaction, err := composer.ComposeERC20(ctx, accountID, productID, 1)
			require.ErrorIs(t, err, someError)
			require.Nil(t, transaction)
		})

		t.Run("fails when price is nil", func(t *testing.T) {
			productConverter.EXPECT().ToItemType(provider, productID).Return(&itemType, nil)
			productConverter.EXPECT().ToAmount(productID).Return(amount)
			productConverter.EXPECT().ToPrice(provider, productID, priceItemType).Return(nil, nil)

			transaction, err := composer.ComposeERC20(ctx, accountID, productID, 1)
			require.ErrorContains(t, err, "price is nil")
			require.Nil(t, transaction)
		})

		t.Run("fails when price is zero", func(t *testing.T) {
			productConverter.EXPECT().ToItemType(provider, productID).Return(&itemType, nil)
			productConverter.EXPECT().ToAmount(productID).Return(amount)
			productConverter.EXPECT().ToPrice(provider, productID, priceItemType).Return(big.NewFloat(0), nil)

			transaction, err := composer.ComposeERC20(ctx, accountID, productID, 1)
			require.ErrorContains(t, err, "price is zero")
			require.Nil(t, transaction)
		})

		t.Run("fails when price is negative", func(t *testing.T) {
			productConverter.EXPECT().ToItemType(provider, productID).Return(&itemType, nil)
			productConverter.EXPECT().ToAmount(productID).Return(amount)
			productConverter.EXPECT().ToPrice(provider, productID, priceItemType).Return(big.NewFloat(-10), nil)

			transaction, err := composer.ComposeERC20(ctx, accountID, productID, 1)
			require.ErrorContains(t, err, "price is negative")
			require.Nil(t, transaction)
		})

		t.Run("fails when product to price conversion fails", func(t *testing.T) {
			productConverter.EXPECT().ToItemType(provider, productID).Return(&itemType, nil)
			productConverter.EXPECT().ToAmount(productID).Return(amount)
			productConverter.EXPECT().ToPrice(provider, productID, priceItemType).Return(nil, someError)

			transaction, err := composer.ComposeERC20(ctx, accountID, productID, 1)
			require.ErrorIs(t, err, someError)
			require.Nil(t, transaction)
		})

		t.Run("fails when product to item type conversion fails", func(t *testing.T) {
			productConverter.EXPECT().ToItemType(provider, productID).Return(nil, someError)

			transaction, err := composer.ComposeERC20(ctx, accountID, productID, 1)
			require.ErrorIs(t, err, someError)
			require.Nil(t, transaction)
		})

		t.Run("fails when quantity is zero", func(t *testing.T) {
			transaction, err := composer.ComposeERC20(ctx, accountID, productID, 0)
			require.ErrorContains(t, err, "quantity cannot be zero")
			require.Nil(t, transaction)
		})
	})

	t.Run("compose ERC-1155", func(t *testing.T) {
		priceItemType := proto.ItemType_SW_CONQUEST_TICKET
		tokenIDToBurn := data.ItemTypeAndID2SWTokenID(proto.ItemType_SW_CONQUEST_TICKET, 1)
		tokenIDsToBurn := []uint64{
			tokenIDToBurn,
			tokenIDToBurn,
		}

		t.Run("composes transaction", func(t *testing.T) {
			nonce := big.NewInt(int64(rand.Uint32()))
			transactionID := nonce.String()
			extraData := []byte(`data`)

			expectedSafeBatchTransferFromTransaction := &proto.OnChainTransaction{
				To: apitest.RandomAddress().String(),
			}

			productConverter.EXPECT().ToItemType(provider, productID).Return(&itemType, nil)
			productConverter.EXPECT().ToAmount(productID).Return(amount)
			productConverter.EXPECT().ToPrice(provider, productID, priceItemType).Return(price, nil)

			contractPaymentProxy.EXPECT().CallNonces(gomock.Any(), address).Return(nonce, nil)

			itemTokenGetter.EXPECT().GetToken(itemType).Return(tokenID, nil)

			contractPaymentProxy.EXPECT().EncodeBurnOrderData(address, nonce, []uint64{tokenID, tokenID}).Return(extraData, nil)

			contractOpenSkyAssets.EXPECT().
				ComposeSafeBatchTransferFrom(address, paymentProxyContractAddress, gomock.Any(), extraData).
				Return(expectedSafeBatchTransferFromTransaction, nil)

			transactions, err := composer.ComposeERC1155(ctx, accountID, productID, quantity, tokenIDsToBurn)
			require.NoError(t, err)
			require.NotEmpty(t, transactions)

			assert.Contains(t, transactions, expectedSafeBatchTransferFromTransaction)

			paymentID := checkPaymentStatus(t, accountID, provider, transactionID, proto.PaymentStatus_PENDING)
			checkPaymentLogs(t, paymentID, []string{onChainTransactionRequestDataType, onChainTransactionDataType})
		})

		t.Run("composes transaction and re-uses existing payment if there is already one with the same nonce", func(t *testing.T) {
			var payment *data.Payment

			nonce := big.NewInt(int64(rand.Uint32()))
			transactionID := nonce.String()
			extraData := []byte(`data`)

			// Setup
			{
				status := proto.PaymentStatus_FAILED
				payment = &data.Payment{
					Payment: &proto.Payment{
						AccountID:     accountID,
						Status:        &status,
						Provider:      &provider,
						ExternalTxnID: transactionID,
					},
				}
				err := data.DB.Save(payment)
				require.NoError(t, err)
			}

			expectedSafeBatchTransferFromTransaction := &proto.OnChainTransaction{
				To: apitest.RandomAddress().String(),
			}

			productConverter.EXPECT().ToItemType(provider, productID).Return(&itemType, nil)
			productConverter.EXPECT().ToAmount(productID).Return(amount)
			productConverter.EXPECT().ToPrice(provider, productID, priceItemType).Return(price, nil)

			contractPaymentProxy.EXPECT().CallNonces(gomock.Any(), address).Return(nonce, nil)

			itemTokenGetter.EXPECT().GetToken(itemType).Return(tokenID, nil)

			contractPaymentProxy.EXPECT().EncodeBurnOrderData(address, nonce, []uint64{tokenID, tokenID}).Return(extraData, nil)

			contractOpenSkyAssets.EXPECT().
				ComposeSafeBatchTransferFrom(address, paymentProxyContractAddress, gomock.Any(), extraData).
				Return(expectedSafeBatchTransferFromTransaction, nil)

			transactions, err := composer.ComposeERC1155(ctx, accountID, productID, quantity, tokenIDsToBurn)
			require.NoError(t, err)
			require.NotEmpty(t, transactions)

			assert.Contains(t, transactions, expectedSafeBatchTransferFromTransaction)

			paymentID := checkPaymentStatus(t, accountID, provider, transactionID, proto.PaymentStatus_PENDING)
			assert.Equal(t, payment.ID, paymentID)
			checkPaymentLogs(t, paymentID, []string{onChainTransactionRequestDataType, onChainTransactionDataType})
		})

		t.Run("fails when getting nonce fails", func(t *testing.T) {
			productConverter.EXPECT().ToItemType(provider, productID).Return(&itemType, nil)
			productConverter.EXPECT().ToAmount(productID).Return(amount)
			productConverter.EXPECT().ToPrice(provider, productID, priceItemType).Return(price, nil)

			itemTokenGetter.EXPECT().GetToken(itemType).Return(tokenID, nil)

			contractPaymentProxy.EXPECT().CallNonces(gomock.Any(), address).Return(nil, someError)

			transactions, err := composer.ComposeERC1155(ctx, accountID, productID, quantity, tokenIDsToBurn)
			require.ErrorIs(t, err, someError)
			require.Empty(t, transactions)
		})

		t.Run("fails when item token is zero", func(t *testing.T) {
			productConverter.EXPECT().ToItemType(provider, productID).Return(&itemType, nil)
			productConverter.EXPECT().ToAmount(productID).Return(amount)
			productConverter.EXPECT().ToPrice(provider, productID, priceItemType).Return(price, nil)

			itemTokenGetter.EXPECT().GetToken(itemType).Return(uint64(0), nil)

			transactions, err := composer.ComposeERC1155(ctx, accountID, productID, quantity, tokenIDsToBurn)
			require.ErrorContains(t, err, "token ID is zero")
			require.Empty(t, transactions)
		})

		t.Run("fails when getting item token fails", func(t *testing.T) {
			productConverter.EXPECT().ToItemType(provider, productID).Return(&itemType, nil)
			productConverter.EXPECT().ToAmount(productID).Return(amount)
			productConverter.EXPECT().ToPrice(provider, productID, priceItemType).Return(price, nil)

			itemTokenGetter.EXPECT().GetToken(itemType).Return(uint64(0), someError)

			transactions, err := composer.ComposeERC1155(ctx, accountID, productID, quantity, tokenIDsToBurn)
			require.ErrorIs(t, err, someError)
			require.Empty(t, transactions)
		})

		t.Run("fails when price is different than provided tokens", func(t *testing.T) {
			productConverter.EXPECT().ToItemType(provider, productID).Return(&itemType, nil)
			productConverter.EXPECT().ToAmount(productID).Return(amount)
			productConverter.EXPECT().ToPrice(provider, productID, priceItemType).Return(price, nil)

			transactions, err := composer.ComposeERC1155(ctx, accountID, productID, quantity, []uint64{
				data.ItemTypeAndID2SWTokenID(itemType, 1),
			})
			require.ErrorContains(t, err, "price cannot be different than provided tokens")
			require.Empty(t, transactions)
		})

		t.Run("fails when price is nil", func(t *testing.T) {
			productConverter.EXPECT().ToItemType(provider, productID).Return(&itemType, nil)
			productConverter.EXPECT().ToAmount(productID).Return(amount)
			productConverter.EXPECT().ToPrice(provider, productID, priceItemType).Return(nil, nil)

			transactions, err := composer.ComposeERC1155(ctx, accountID, productID, quantity, tokenIDsToBurn)
			require.ErrorContains(t, err, "price is nil")
			require.Empty(t, transactions)
		})

		t.Run("fails when price is zero", func(t *testing.T) {
			productConverter.EXPECT().ToItemType(provider, productID).Return(&itemType, nil)
			productConverter.EXPECT().ToAmount(productID).Return(amount)
			productConverter.EXPECT().ToPrice(provider, productID, priceItemType).Return(big.NewFloat(0), nil)

			transactions, err := composer.ComposeERC1155(ctx, accountID, productID, quantity, tokenIDsToBurn)
			require.ErrorContains(t, err, "price is zero")
			require.Empty(t, transactions)
		})

		t.Run("fails when price is negative", func(t *testing.T) {
			productConverter.EXPECT().ToItemType(provider, productID).Return(&itemType, nil)
			productConverter.EXPECT().ToAmount(productID).Return(amount)
			productConverter.EXPECT().ToPrice(provider, productID, priceItemType).Return(big.NewFloat(-1), nil)

			transactions, err := composer.ComposeERC1155(ctx, accountID, productID, quantity, tokenIDsToBurn)
			require.ErrorContains(t, err, "price is negative")
			require.Empty(t, transactions)
		})

		t.Run("fails when product to price conversion fails", func(t *testing.T) {
			productConverter.EXPECT().ToItemType(provider, productID).Return(&itemType, nil)
			productConverter.EXPECT().ToAmount(productID).Return(amount)
			productConverter.EXPECT().ToPrice(provider, productID, priceItemType).Return(nil, someError)

			transactions, err := composer.ComposeERC1155(ctx, accountID, productID, quantity, tokenIDsToBurn)
			require.ErrorIs(t, err, someError)
			require.Empty(t, transactions)
		})

		t.Run("fails when product to item type conversion fails", func(t *testing.T) {
			productConverter.EXPECT().ToItemType(provider, productID).Return(nil, someError)

			transactions, err := composer.ComposeERC1155(ctx, accountID, productID, quantity, tokenIDsToBurn)
			require.ErrorIs(t, err, someError)
			require.Empty(t, transactions)
		})

		t.Run("fails when tokens to burn are mixed types", func(t *testing.T) {
			transactions, err := composer.ComposeERC1155(ctx, accountID, productID, quantity, []uint64{
				data.ItemTypeAndID2SWTokenID(proto.ItemType_SW_SILVER_CARDS, 1),
				data.ItemTypeAndID2SWTokenID(proto.ItemType_SW_CONQUEST_TICKET, 1),
			})
			require.ErrorContains(t, err, "tokens to burn cannot be mix type")
			require.Empty(t, transactions)
		})

		t.Run("fails when quantity is zero", func(t *testing.T) {
			transactions, err := composer.ComposeERC1155(ctx, accountID, productID, 0, tokenIDsToBurn)
			require.ErrorContains(t, err, "quantity cannot be zero")
			require.Empty(t, transactions)
		})

		t.Run("fails when tokens to burn are empty", func(t *testing.T) {
			transactions, err := composer.ComposeERC1155(ctx, accountID, productID, quantity, nil)
			require.ErrorContains(t, err, "tokens to burn cannot be empty")
			require.Empty(t, transactions)
		})
	})
}
