//go:build integration

package rpc_test

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/mock/gomock"

	"github.com/horizon-games/OpenSky/api/apitest"
	"github.com/horizon-games/OpenSky/api/proto"
	"github.com/horizon-games/OpenSky/api/rpc/mock"
)

func TestIAPVerifyGoogleProducts2(t *testing.T) {
	var paymentProviderResponseVerifier *mock.MockPaymentProviderResponseVerifier

	var accountID proto.AccountID

	var address proto.Hash

	// Setup
	{
		// Account
		{
			var err error

			accountID, address, err = apitest.CreateRandomAccount("TestIAPVerifyGoogleProducts2")
			require.NoError(t, err)
		}

		// Mocks
		{
			ctrl := gomock.NewController(t)

			paymentProviderResponseVerifier = mock.NewMockPaymentProviderResponseVerifier(ctrl)

			apiService := apitest.APIService()

			originalPaymentProviderResponseVerifier := apiService.RPC.PaymentProviderResponseVerifier

			apiService.RPC.PaymentProviderResponseVerifier = paymentProviderResponseVerifier

			t.Cleanup(func() {
				apiService.RPC.PaymentProviderResponseVerifier = originalPaymentProviderResponseVerifier
			})
		}
	}

	ctx := context.Background()

	productID := "product ID"
	transactionID := "transaction ID"
	transactionDate := float64(1001)
	transactionReceipt := "transaction receipt"
	purchaseToken := "purchase token"
	dataAndroid := "data android"
	signatureAndroid := "signature android"
	autoRenewingAndroid := true
	purchaseStateAndroid := proto.PurchaseStateAndroid_PURCHASED
	isAcknowledgedAndroid := true
	packageNameAndroid := "package name android"
	developerPayloadAndroid := "developer payload android"
	obfuscatedAccountIdAndroid := "obfuscated account ID android"
	obfuscatedProfileIdAndroid := "obfuscated profile ID android"
	currency := "USD"
	totalPrice := float32(1002)

	providerResponse := &proto.IAPPurchaseRequest{
		ProductId:                  productID,
		TransactionId:              &transactionID,
		TransactionDate:            transactionDate,
		TransactionReceipt:         transactionReceipt,
		PurchaseToken:              &purchaseToken,
		DataAndroid:                &dataAndroid,
		SignatureAndroid:           &signatureAndroid,
		AutoRenewingAndroid:        &autoRenewingAndroid,
		PurchaseStateAndroid:       &purchaseStateAndroid,
		IsAcknowledgedAndroid:      &isAcknowledgedAndroid,
		PackageNameAndroid:         &packageNameAndroid,
		DeveloperPayloadAndroid:    &developerPayloadAndroid,
		ObfuscatedAccountIdAndroid: &obfuscatedAccountIdAndroid,
		ObfuscatedProfileIdAndroid: &obfuscatedProfileIdAndroid,
		Address:                    address.String(),
		Currency:                   currency,
		TotalPrice:                 totalPrice,
	}

	expectedProviderResponse := &proto.GooglePlayPaymentResponse{
		ProductId:                  productID,
		TransactionId:              transactionID,
		TransactionDate:            transactionDate,
		TransactionReceipt:         transactionReceipt,
		PurchaseToken:              purchaseToken,
		DataAndroid:                &dataAndroid,
		SignatureAndroid:           &signatureAndroid,
		AutoRenewingAndroid:        &autoRenewingAndroid,
		PurchaseStateAndroid:       &purchaseStateAndroid,
		IsAcknowledgedAndroid:      &isAcknowledgedAndroid,
		PackageNameAndroid:         packageNameAndroid,
		DeveloperPayloadAndroid:    &developerPayloadAndroid,
		ObfuscatedAccountIdAndroid: &obfuscatedAccountIdAndroid,
		ObfuscatedProfileIdAndroid: &obfuscatedProfileIdAndroid,
		Currency:                   currency,
		TotalPrice:                 totalPrice,
	}

	paymentProviderResponseVerifier.EXPECT().VerifyGooglePlayPayment(gomock.Any(), accountID, expectedProviderResponse)

	googleProductPurchase, err := apitest.Client().IAPVerifyGoogleProducts2(ctx, providerResponse)
	require.NoError(t, err)
	assert.NotNil(t, googleProductPurchase)
}

func TestIAPVerifyAppleProducts2(t *testing.T) {
	var paymentProviderResponseVerifier *mock.MockPaymentProviderResponseVerifier

	var accountID proto.AccountID

	var address proto.Hash

	// Setup
	{
		// Account
		{
			var err error

			accountID, address, err = apitest.CreateRandomAccount("TestIAPVerifyAppleProducts2")
			require.NoError(t, err)
		}

		// Mocks
		{
			ctrl := gomock.NewController(t)

			paymentProviderResponseVerifier = mock.NewMockPaymentProviderResponseVerifier(ctrl)

			apiService := apitest.APIService()

			originalPaymentProviderResponseVerifier := apiService.RPC.PaymentProviderResponseVerifier

			apiService.RPC.PaymentProviderResponseVerifier = paymentProviderResponseVerifier

			t.Cleanup(func() {
				apiService.RPC.PaymentProviderResponseVerifier = originalPaymentProviderResponseVerifier
			})
		}
	}

	ctx := context.Background()

	productID := "product ID"
	transactionID := "transaction ID"
	transactionDate := float64(1001)
	transactionReceipt := "transaction receipt"
	purchaseToken := "purchase token"
	quantityIOS := uint32(1)
	originalTransactionDateIOS := "original transaction date iOS"
	originalTransactionIdentifierIOS := "original transaction identifier iOS"
	currency := "USD"
	totalPrice := float32(1002)

	providerResponse := &proto.IAPPurchaseRequest{
		ProductId:                        productID,
		TransactionId:                    &transactionID,
		TransactionDate:                  transactionDate,
		TransactionReceipt:               transactionReceipt,
		PurchaseToken:                    &purchaseToken,
		QuantityIOS:                      &quantityIOS,
		OriginalTransactionDateIOS:       &originalTransactionDateIOS,
		OriginalTransactionIdentifierIOS: &originalTransactionIdentifierIOS,
		Address:                          address.String(),
		Currency:                         currency,
		TotalPrice:                       totalPrice,
	}

	expectedProviderResponse := &proto.AppleAppStorePaymentResponse{
		ProductId:                        productID,
		TransactionId:                    transactionID,
		TransactionDate:                  transactionDate,
		TransactionReceipt:               transactionReceipt,
		PurchaseToken:                    &purchaseToken,
		QuantityIOS:                      &quantityIOS,
		OriginalTransactionDateIOS:       &originalTransactionDateIOS,
		OriginalTransactionIdentifierIOS: &originalTransactionIdentifierIOS,
		Currency:                         currency,
		TotalPrice:                       totalPrice,
	}

	paymentProviderResponseVerifier.EXPECT().VerifyAppleAppStorePayment(gomock.Any(), accountID, expectedProviderResponse)

	appleIAPResponse, err := apitest.Client().IAPVerifyAppleProducts2(ctx, providerResponse)
	require.NoError(t, err)
	assert.NotNil(t, appleIAPResponse)
}
