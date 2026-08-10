//go:build integration

package payments_test

import (
	"context"
	"fmt"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/upper/db/v4"
	"go.uber.org/mock/gomock"
	"google.golang.org/api/androidpublisher/v3"

	"github.com/horizon-games/OpenSky/api/apitest"
	"github.com/horizon-games/OpenSky/api/data"
	analyticsMock "github.com/horizon-games/OpenSky/api/lib/analytics/mock"
	"github.com/horizon-games/OpenSky/api/lib/payments"
	"github.com/horizon-games/OpenSky/api/lib/payments/appleappstore"
	"github.com/horizon-games/OpenSky/api/lib/payments/mock"
	"github.com/horizon-games/OpenSky/api/lib/payments/samsunggalaxystore"
	"github.com/horizon-games/OpenSky/api/proto"
)

func TestProviderResponseVerifier(t *testing.T) {
	var accountID proto.AccountID

	var googlePlayVerifier *mock.MockGooglePlayVerifier

	var appleAppStoreVerifier *mock.MockAppleAppStoreVerifier

	var samsungGalaxyStoreVerifier *mock.MockSamsungGalaxyStoreVerifier

	var productConverter *mock.MockProductConverter

	var itemTokenGetter *mock.MockItemTokenGetter

	var itemGainer *mock.MockItemGainer

	var analyticsTracker *analyticsMock.MockTracker

	var metricsCollector *mock.MockMetricsCollector

	// Setup
	{
		// Account
		{
			var err error

			accountID, _, err = apitest.CreateRandomAccount("TestProviderResponseVerifier")
			require.NoError(t, err)
		}

		// Mocks
		{
			ctrl := gomock.NewController(t)

			googlePlayVerifier = mock.NewMockGooglePlayVerifier(ctrl)
			appleAppStoreVerifier = mock.NewMockAppleAppStoreVerifier(ctrl)
			samsungGalaxyStoreVerifier = mock.NewMockSamsungGalaxyStoreVerifier(ctrl)
			productConverter = mock.NewMockProductConverter(ctrl)
			itemTokenGetter = mock.NewMockItemTokenGetter(ctrl)
			itemGainer = mock.NewMockItemGainer(ctrl)
			analyticsTracker = analyticsMock.NewMockTracker(ctrl)
			metricsCollector = mock.NewMockMetricsCollector(ctrl)

			metricsCollector.EXPECT().TrackPayment(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).AnyTimes()
		}
	}

	verifier := payments.NewProviderResponseVerifier(
		googlePlayVerifier,
		appleAppStoreVerifier,
		samsungGalaxyStoreVerifier,
		productConverter,
		itemTokenGetter,
		itemGainer,
		analyticsTracker,
		metricsCollector,
	)

	ctx := context.Background()

	productID := "conquest_tickets_0002"

	itemType := proto.ItemType_SW_CONQUEST_TICKET
	amount := int64(2)
	tokenID := uint64(123)

	someError := fmt.Errorf("some error")

	t.Run("verify Google Play payment", func(t *testing.T) {
		packageName := "package_name"
		purchaseToken := "purchase_token"

		provider := proto.PaymentProvider_GOOGLE_PLAY

		providerResponseDataType := "*proto.GooglePlayPaymentResponse"
		verificationResponseDataType := "*androidpublisher.ProductPurchase"

		t.Run("verifies when payment does not exist and verification is successful", func(t *testing.T) {
			transactionID := uuid.NewString()

			providerResponse := proto.GooglePlayPaymentResponse{
				TransactionId:      transactionID,
				ProductId:          productID,
				PackageNameAndroid: packageName,
				PurchaseToken:      purchaseToken,
				Currency:           "USD",
				TotalPrice:         1.2,
			}

			expectedAnalyticsItemPurchase := proto.AnalyticsItemPurchase{
				AccountID:     accountID,
				ProductID:     productID,
				Currency:      "USD",
				PricePerUnit:  0.6,
				Quantity:      uint32(amount),
				TotalPrice:    1.2,
				Platform:      "android",
				TransactionID: transactionID,
				Token:         "conquest_tickets",
				ItemType:      itemType,
			}

			googlePlayVerifier.EXPECT().Verify(gomock.Any(), packageName, productID, purchaseToken).Return(&androidpublisher.ProductPurchase{
				ProductId: productID, OrderId: transactionID,
			}, nil)

			productConverter.EXPECT().ToItemType(provider, productID).Return(&itemType, nil)
			productConverter.EXPECT().ToAmount(productID).Return(amount)

			itemTokenGetter.EXPECT().GetToken(itemType).Return(tokenID, nil)

			itemGainer.EXPECT().Gain(gomock.Any(), gomock.Any(), tokenID, amount).Do(func(sess db.Session, payment *data.Payment, tokenID uint64, amount int64) {
				assert.Greater(t, int(payment.ID), 0)
				assert.Equal(t, accountID, payment.AccountID)
				assert.Equal(t, transactionID, payment.ExternalTxnID)
			})

			analyticsTracker.EXPECT().TrackItemPurchase(gomock.Any(), &expectedAnalyticsItemPurchase)

			err := verifier.VerifyGooglePlayPayment(ctx, accountID, &providerResponse)
			require.NoError(t, err)

			paymentID := checkPaymentStatus(t, accountID, provider, transactionID, proto.PaymentStatus_SUCCEEDED)
			checkPaymentLogs(t, paymentID, []string{providerResponseDataType, verificationResponseDataType})
		})

		t.Run("verifies when payment is already initiated and verification is successful", func(t *testing.T) {
			transactionID := uuid.NewString()

			// Setup
			{
				// Payments
				{
					status := proto.PaymentStatus_INITIATED
					err := data.DB.Save(&data.Payment{
						Payment: &proto.Payment{
							AccountID:     accountID,
							Status:        &status,
							Provider:      &provider,
							ExternalTxnID: transactionID,
						},
					})
					require.NoError(t, err)
				}
			}

			providerResponse := proto.GooglePlayPaymentResponse{
				TransactionId:      transactionID,
				ProductId:          productID,
				PackageNameAndroid: packageName,
				PurchaseToken:      purchaseToken,
				Currency:           "USD",
				TotalPrice:         1.2,
			}

			expectedAnalyticsItemPurchase := proto.AnalyticsItemPurchase{
				AccountID:     accountID,
				ProductID:     productID,
				Currency:      "USD",
				PricePerUnit:  0.6,
				Quantity:      uint32(amount),
				TotalPrice:    1.2,
				Platform:      "android",
				TransactionID: transactionID,
				Token:         "conquest_tickets",
				ItemType:      itemType,
			}

			googlePlayVerifier.EXPECT().Verify(gomock.Any(), packageName, productID, purchaseToken).Return(&androidpublisher.ProductPurchase{
				ProductId: productID, OrderId: transactionID,
			}, nil)

			productConverter.EXPECT().ToItemType(provider, productID).Return(&itemType, nil)
			productConverter.EXPECT().ToAmount(productID).Return(amount)

			itemTokenGetter.EXPECT().GetToken(itemType).Return(tokenID, nil)

			itemGainer.EXPECT().Gain(gomock.Any(), gomock.Any(), tokenID, amount).Do(func(sess db.Session, payment *data.Payment, tokenID uint64, amount int64) {
				assert.Greater(t, int(payment.ID), 0)
				assert.Equal(t, accountID, payment.AccountID)
				assert.Equal(t, transactionID, payment.ExternalTxnID)
			})

			analyticsTracker.EXPECT().TrackItemPurchase(gomock.Any(), &expectedAnalyticsItemPurchase)

			err := verifier.VerifyGooglePlayPayment(ctx, accountID, &providerResponse)
			require.NoError(t, err)

			paymentID := checkPaymentStatus(t, accountID, provider, transactionID, proto.PaymentStatus_SUCCEEDED)
			checkPaymentLogs(t, paymentID, []string{providerResponseDataType, verificationResponseDataType})
		})

		t.Run("verifies when payment is already failed but new verification is successful", func(t *testing.T) {
			transactionID := uuid.NewString()

			// Setup
			{
				// Payments
				{
					status := proto.PaymentStatus_FAILED
					err := data.DB.Save(&data.Payment{
						Payment: &proto.Payment{
							AccountID:     accountID,
							Status:        &status,
							Provider:      &provider,
							ExternalTxnID: transactionID,
						},
					})
					require.NoError(t, err)
				}
			}

			providerResponse := proto.GooglePlayPaymentResponse{
				TransactionId:      transactionID,
				ProductId:          productID,
				PackageNameAndroid: packageName,
				PurchaseToken:      purchaseToken,
				Currency:           "USD",
				TotalPrice:         1.2,
			}

			expectedAnalyticsItemPurchase := proto.AnalyticsItemPurchase{
				AccountID:     accountID,
				ProductID:     productID,
				Currency:      "USD",
				PricePerUnit:  0.6,
				Quantity:      uint32(amount),
				TotalPrice:    1.2,
				Platform:      "android",
				TransactionID: transactionID,
				Token:         "conquest_tickets",
				ItemType:      itemType,
			}

			googlePlayVerifier.EXPECT().Verify(gomock.Any(), packageName, productID, purchaseToken).Return(&androidpublisher.ProductPurchase{
				ProductId: productID, OrderId: transactionID,
			}, nil)

			productConverter.EXPECT().ToItemType(provider, productID).Return(&itemType, nil)
			productConverter.EXPECT().ToAmount(productID).Return(amount)

			itemTokenGetter.EXPECT().GetToken(itemType).Return(tokenID, nil)

			itemGainer.EXPECT().Gain(gomock.Any(), gomock.Any(), tokenID, amount).Do(func(sess db.Session, payment *data.Payment, tokenID uint64, amount int64) {
				assert.Greater(t, int(payment.ID), 0)
				assert.Equal(t, accountID, payment.AccountID)
				assert.Equal(t, transactionID, payment.ExternalTxnID)
			})

			analyticsTracker.EXPECT().TrackItemPurchase(gomock.Any(), &expectedAnalyticsItemPurchase)

			err := verifier.VerifyGooglePlayPayment(ctx, accountID, &providerResponse)
			require.NoError(t, err)

			paymentID := checkPaymentStatus(t, accountID, provider, transactionID, proto.PaymentStatus_SUCCEEDED)
			checkPaymentLogs(t, paymentID, []string{providerResponseDataType, verificationResponseDataType})
		})

		t.Run("fails when payment is already successful for another account", func(t *testing.T) {
			transactionID := uuid.NewString()

			// Setup
			{
				var anotherAccountID proto.AccountID

				// Account
				{
					var err error

					anotherAccountID, _, err = apitest.CreateRandomAccount("TestProviderResponseVerifier-another-google")
					require.NoError(t, err)
				}

				// Payments
				{
					status := proto.PaymentStatus_SUCCEEDED
					err := data.DB.Save(&data.Payment{
						Payment: &proto.Payment{
							AccountID:     anotherAccountID,
							Status:        &status,
							Provider:      &provider,
							ExternalTxnID: transactionID,
						},
					})
					require.NoError(t, err)
				}
			}

			providerResponse := proto.GooglePlayPaymentResponse{
				TransactionId:      transactionID,
				ProductId:          productID,
				PackageNameAndroid: packageName,
				PurchaseToken:      purchaseToken,
			}

			googlePlayVerifier.EXPECT().Verify(gomock.Any(), packageName, productID, purchaseToken).Return(&androidpublisher.ProductPurchase{
				ProductId: productID, OrderId: transactionID,
			}, nil)

			productConverter.EXPECT().ToItemType(provider, productID).Return(&itemType, nil)
			productConverter.EXPECT().ToAmount(productID).Return(amount)

			itemTokenGetter.EXPECT().GetToken(itemType).Return(tokenID, nil)

			itemGainer.EXPECT().Gain(gomock.Any(), gomock.Any(), tokenID, amount).Do(func(sess db.Session, payment *data.Payment, tokenID uint64, amount int64) {
				assert.Greater(t, int(payment.ID), 0)
				assert.Equal(t, accountID, payment.AccountID)
				assert.Equal(t, transactionID, payment.ExternalTxnID)
			})

			err := verifier.VerifyGooglePlayPayment(ctx, accountID, &providerResponse)
			require.ErrorContains(t, err, "payment is already successful")

			checkNoPayment(t, accountID, provider, transactionID)
		})

		t.Run("fails when gaining item fails", func(t *testing.T) {
			transactionID := uuid.NewString()

			providerResponse := proto.GooglePlayPaymentResponse{
				TransactionId:      transactionID,
				ProductId:          productID,
				PackageNameAndroid: packageName,
				PurchaseToken:      purchaseToken,
			}

			googlePlayVerifier.EXPECT().Verify(gomock.Any(), packageName, productID, purchaseToken).Return(&androidpublisher.ProductPurchase{
				ProductId: productID, OrderId: transactionID,
			}, nil)

			productConverter.EXPECT().ToItemType(provider, productID).Return(&itemType, nil)
			productConverter.EXPECT().ToAmount(productID).Return(amount)

			itemTokenGetter.EXPECT().GetToken(itemType).Return(tokenID, nil)

			itemGainer.EXPECT().Gain(gomock.Any(), gomock.Any(), tokenID, amount).Do(func(sess db.Session, payment *data.Payment, tokenId uint64, amount int64) {
				assert.Greater(t, int(payment.ID), 0)
				assert.Equal(t, accountID, payment.AccountID)
				assert.Equal(t, transactionID, payment.ExternalTxnID)
			}).Return(someError)

			err := verifier.VerifyGooglePlayPayment(ctx, accountID, &providerResponse)
			require.ErrorIs(t, err, someError)

			checkNoPayment(t, accountID, provider, transactionID)
		})

		t.Run("fails when getting token fails", func(t *testing.T) {
			transactionID := uuid.NewString()

			providerResponse := proto.GooglePlayPaymentResponse{
				TransactionId:      transactionID,
				ProductId:          productID,
				PackageNameAndroid: packageName,
				PurchaseToken:      purchaseToken,
			}

			googlePlayVerifier.EXPECT().Verify(gomock.Any(), packageName, productID, purchaseToken).Return(&androidpublisher.ProductPurchase{
				ProductId: productID, OrderId: transactionID,
			}, nil)

			productConverter.EXPECT().ToItemType(provider, productID).Return(&itemType, nil)
			productConverter.EXPECT().ToAmount(productID).Return(amount)

			itemTokenGetter.EXPECT().GetToken(itemType).Return(uint64(0), someError)

			err := verifier.VerifyGooglePlayPayment(ctx, accountID, &providerResponse)
			require.ErrorIs(t, err, someError)

			checkNoPayment(t, accountID, provider, transactionID)
		})

		t.Run("fails when product to item type conversion fails", func(t *testing.T) {
			transactionID := uuid.NewString()

			providerResponse := proto.GooglePlayPaymentResponse{
				TransactionId:      transactionID,
				ProductId:          productID,
				PackageNameAndroid: packageName,
				PurchaseToken:      purchaseToken,
			}

			googlePlayVerifier.EXPECT().Verify(gomock.Any(), packageName, productID, purchaseToken).Return(&androidpublisher.ProductPurchase{
				ProductId: productID, OrderId: transactionID,
			}, nil)

			productConverter.EXPECT().ToItemType(provider, productID).Return(nil, someError)

			err := verifier.VerifyGooglePlayPayment(ctx, accountID, &providerResponse)
			require.ErrorIs(t, err, someError)

			checkNoPayment(t, accountID, provider, transactionID)
		})

		t.Run("fails when provided transaction ID is not the same as in the verification response", func(t *testing.T) {
			transactionID := uuid.NewString()

			providerResponse := proto.GooglePlayPaymentResponse{
				TransactionId:      transactionID,
				ProductId:          productID,
				PackageNameAndroid: packageName,
				PurchaseToken:      purchaseToken,
			}

			googlePlayVerifier.EXPECT().Verify(gomock.Any(), packageName, productID, purchaseToken).Return(&androidpublisher.ProductPurchase{
				ProductId: productID, OrderId: "bad transaction ID",
			}, nil)

			err := verifier.VerifyGooglePlayPayment(ctx, accountID, &providerResponse)
			require.ErrorContains(t, err, "does not match")

			checkNoPayment(t, accountID, provider, transactionID)
		})

		t.Run("fails when provided verification response code is non-zero", func(t *testing.T) {
			transactionID := uuid.NewString()

			providerResponse := proto.GooglePlayPaymentResponse{
				TransactionId:      transactionID,
				ProductId:          productID,
				PackageNameAndroid: packageName,
				PurchaseToken:      purchaseToken,
			}

			googlePlayVerifier.EXPECT().Verify(gomock.Any(), packageName, productID, purchaseToken).Return(&androidpublisher.ProductPurchase{
				ProductId: productID, OrderId: transactionID,
				PurchaseState: 2,
			}, nil)

			err := verifier.VerifyGooglePlayPayment(ctx, accountID, &providerResponse)
			require.ErrorContains(t, err, "state is not 'purchased'")

			checkNoPayment(t, accountID, provider, transactionID)
		})

		t.Run("fails when verification fails", func(t *testing.T) {
			transactionID := uuid.NewString()

			providerResponse := proto.GooglePlayPaymentResponse{
				TransactionId:      transactionID,
				ProductId:          productID,
				PackageNameAndroid: packageName,
				PurchaseToken:      purchaseToken,
			}

			googlePlayVerifier.EXPECT().Verify(gomock.Any(), packageName, productID, purchaseToken).Return(nil, someError)

			err := verifier.VerifyGooglePlayPayment(ctx, accountID, &providerResponse)
			require.ErrorIs(t, err, someError)

			checkNoPayment(t, accountID, provider, transactionID)
		})

		t.Run("fails when payment is already successful", func(t *testing.T) {
			transactionID := uuid.NewString()

			// Setup
			{
				// Payments
				{
					status := proto.PaymentStatus_SUCCEEDED
					err := data.DB.Save(&data.Payment{
						Payment: &proto.Payment{
							AccountID:     accountID,
							Status:        &status,
							Provider:      &provider,
							ExternalTxnID: transactionID,
						},
					})
					require.NoError(t, err)
				}
			}

			providerResponse := proto.GooglePlayPaymentResponse{
				TransactionId:      transactionID,
				ProductId:          productID,
				PackageNameAndroid: packageName,
				PurchaseToken:      purchaseToken,
			}

			err := verifier.VerifyGooglePlayPayment(ctx, accountID, &providerResponse)
			require.ErrorContains(t, err, "cannot be verified")

			paymentID := checkPaymentStatus(t, accountID, provider, transactionID, proto.PaymentStatus_SUCCEEDED)
			checkPaymentLogs(t, paymentID, []string{})
		})

		t.Run("fails when provider verifier is nil", func(t *testing.T) {
			verifier := payments.NewProviderResponseVerifier(
				nil,
				appleAppStoreVerifier,
				samsungGalaxyStoreVerifier,
				productConverter,
				itemTokenGetter,
				itemGainer,
				analyticsTracker,
				metricsCollector,
			)

			err := verifier.VerifyGooglePlayPayment(ctx, accountID, nil)
			require.ErrorContains(t, err, "google play verifier is disabled")
		})
	})

	t.Run("verify Apple App Store payment", func(t *testing.T) {
		transactionReceipt := "transaction_receipt"

		provider := proto.PaymentProvider_APPLE_APP_STORE

		providerResponseDataType := "*proto.AppleAppStorePaymentResponse"
		verificationResponseDataType := "*appleappstore.Response"

		t.Run("verifies when payment does not exist and verification is successful", func(t *testing.T) {
			transactionID := uuid.NewString()

			providerResponse := proto.AppleAppStorePaymentResponse{
				TransactionId:      transactionID,
				ProductId:          productID,
				TransactionReceipt: transactionReceipt,
				Currency:           "USD",
				TotalPrice:         1.2,
			}

			expectedAnalyticsItemPurchase := proto.AnalyticsItemPurchase{
				AccountID:     accountID,
				ProductID:     productID,
				Currency:      "USD",
				PricePerUnit:  0.6,
				Quantity:      uint32(amount),
				TotalPrice:    1.2,
				Platform:      "ios",
				TransactionID: transactionID,
				Token:         "conquest_tickets",
				ItemType:      itemType,
			}

			appleAppStoreVerifier.EXPECT().Verify(gomock.Any(), transactionReceipt).Return(&appleappstore.Response{
				Receipt: appleappstore.Receipt{
					InApp: []appleappstore.InApp{
						{ProductID: productID, TransactionID: transactionID},
					},
				},
			}, nil)

			productConverter.EXPECT().ToItemType(provider, productID).Return(&itemType, nil)
			productConverter.EXPECT().ToAmount(productID).Return(amount)

			itemTokenGetter.EXPECT().GetToken(itemType).Return(tokenID, nil)

			itemGainer.EXPECT().Gain(gomock.Any(), gomock.Any(), tokenID, amount).Do(func(sess db.Session, payment *data.Payment, tokenId uint64, amount int64) {
				assert.Greater(t, int(payment.ID), 0)
				assert.Equal(t, accountID, payment.AccountID)
				assert.Equal(t, transactionID, payment.ExternalTxnID)
			})

			analyticsTracker.EXPECT().TrackItemPurchase(gomock.Any(), &expectedAnalyticsItemPurchase)

			err := verifier.VerifyAppleAppStorePayment(ctx, accountID, &providerResponse)
			require.NoError(t, err)

			paymentID := checkPaymentStatus(t, accountID, provider, transactionID, proto.PaymentStatus_SUCCEEDED)
			checkPaymentLogs(t, paymentID, []string{providerResponseDataType, verificationResponseDataType})
		})

		t.Run("verifies when payment is already initiated and verification is successful", func(t *testing.T) {
			transactionID := uuid.NewString()

			// Setup
			{
				// Payments
				{
					status := proto.PaymentStatus_INITIATED
					err := data.DB.Save(&data.Payment{
						Payment: &proto.Payment{
							AccountID:     accountID,
							Status:        &status,
							Provider:      &provider,
							ExternalTxnID: transactionID,
						},
					})
					require.NoError(t, err)
				}
			}

			providerResponse := proto.AppleAppStorePaymentResponse{
				TransactionId:      transactionID,
				ProductId:          productID,
				TransactionReceipt: transactionReceipt,
				Currency:           "USD",
				TotalPrice:         1.2,
			}

			expectedAnalyticsItemPurchase := proto.AnalyticsItemPurchase{
				AccountID:     accountID,
				ProductID:     productID,
				Currency:      "USD",
				PricePerUnit:  0.6,
				Quantity:      uint32(amount),
				TotalPrice:    1.2,
				Platform:      "ios",
				TransactionID: transactionID,
				Token:         "conquest_tickets",
				ItemType:      itemType,
			}

			appleAppStoreVerifier.EXPECT().Verify(gomock.Any(), transactionReceipt).Return(&appleappstore.Response{
				Receipt: appleappstore.Receipt{
					InApp: []appleappstore.InApp{
						{ProductID: productID, TransactionID: transactionID},
					},
				},
			}, nil)

			productConverter.EXPECT().ToItemType(provider, productID).Return(&itemType, nil)
			productConverter.EXPECT().ToAmount(productID).Return(amount)

			itemTokenGetter.EXPECT().GetToken(itemType).Return(tokenID, nil)

			itemGainer.EXPECT().Gain(gomock.Any(), gomock.Any(), tokenID, amount).Do(func(sess db.Session, payment *data.Payment, tokenId uint64, amount int64) {
				assert.Greater(t, int(payment.ID), 0)
				assert.Equal(t, accountID, payment.AccountID)
				assert.Equal(t, transactionID, payment.ExternalTxnID)
			})

			analyticsTracker.EXPECT().TrackItemPurchase(gomock.Any(), &expectedAnalyticsItemPurchase)

			err := verifier.VerifyAppleAppStorePayment(ctx, accountID, &providerResponse)
			require.NoError(t, err)

			paymentID := checkPaymentStatus(t, accountID, provider, transactionID, proto.PaymentStatus_SUCCEEDED)
			checkPaymentLogs(t, paymentID, []string{providerResponseDataType, verificationResponseDataType})
		})

		t.Run("verifies when payment is already failed but new verification is successful", func(t *testing.T) {
			transactionID := uuid.NewString()

			// Setup
			{
				// Payments
				{
					status := proto.PaymentStatus_FAILED
					err := data.DB.Save(&data.Payment{
						Payment: &proto.Payment{
							AccountID:     accountID,
							Status:        &status,
							Provider:      &provider,
							ExternalTxnID: transactionID,
						},
					})
					require.NoError(t, err)
				}
			}

			providerResponse := proto.AppleAppStorePaymentResponse{
				TransactionId:      transactionID,
				ProductId:          productID,
				TransactionReceipt: transactionReceipt,
				Currency:           "USD",
				TotalPrice:         1.2,
			}

			expectedAnalyticsItemPurchase := proto.AnalyticsItemPurchase{
				AccountID:     accountID,
				ProductID:     productID,
				Currency:      "USD",
				PricePerUnit:  0.6,
				Quantity:      uint32(amount),
				TotalPrice:    1.2,
				Platform:      "ios",
				TransactionID: transactionID,
				Token:         "conquest_tickets",
				ItemType:      itemType,
			}

			appleAppStoreVerifier.EXPECT().Verify(gomock.Any(), transactionReceipt).Return(&appleappstore.Response{
				Receipt: appleappstore.Receipt{
					InApp: []appleappstore.InApp{
						{ProductID: productID, TransactionID: transactionID},
					},
				},
			}, nil)

			productConverter.EXPECT().ToItemType(provider, productID).Return(&itemType, nil)
			productConverter.EXPECT().ToAmount(productID).Return(amount)

			itemTokenGetter.EXPECT().GetToken(itemType).Return(tokenID, nil)

			itemGainer.EXPECT().Gain(gomock.Any(), gomock.Any(), tokenID, amount).Do(func(sess db.Session, payment *data.Payment, tokenID uint64, amount int64) {
				assert.Greater(t, int(payment.ID), 0)
				assert.Equal(t, accountID, payment.AccountID)
				assert.Equal(t, transactionID, payment.ExternalTxnID)
			})

			analyticsTracker.EXPECT().TrackItemPurchase(gomock.Any(), &expectedAnalyticsItemPurchase)

			err := verifier.VerifyAppleAppStorePayment(ctx, accountID, &providerResponse)
			require.NoError(t, err)

			paymentID := checkPaymentStatus(t, accountID, provider, transactionID, proto.PaymentStatus_SUCCEEDED)
			checkPaymentLogs(t, paymentID, []string{providerResponseDataType, verificationResponseDataType})
		})

		t.Run("fails when payment is already successful for another account", func(t *testing.T) {
			transactionID := uuid.NewString()

			// Setup
			{
				var anotherAccountID proto.AccountID

				// Account
				{
					var err error

					anotherAccountID, _, err = apitest.CreateRandomAccount("TestProviderResponseVerifier-another-apple")
					require.NoError(t, err)
				}

				// Payments
				{
					status := proto.PaymentStatus_SUCCEEDED
					err := data.DB.Save(&data.Payment{
						Payment: &proto.Payment{
							AccountID:     anotherAccountID,
							Status:        &status,
							Provider:      &provider,
							ExternalTxnID: transactionID,
						},
					})
					require.NoError(t, err)
				}
			}

			providerResponse := proto.AppleAppStorePaymentResponse{
				TransactionId:      transactionID,
				ProductId:          productID,
				TransactionReceipt: transactionReceipt,
			}

			appleAppStoreVerifier.EXPECT().Verify(gomock.Any(), transactionReceipt).Return(&appleappstore.Response{
				Receipt: appleappstore.Receipt{
					InApp: []appleappstore.InApp{
						{ProductID: productID, TransactionID: transactionID},
					},
				},
			}, nil)

			productConverter.EXPECT().ToItemType(provider, productID).Return(&itemType, nil)
			productConverter.EXPECT().ToAmount(productID).Return(amount)

			itemTokenGetter.EXPECT().GetToken(itemType).Return(tokenID, nil)

			itemGainer.EXPECT().Gain(gomock.Any(), gomock.Any(), tokenID, amount).Do(func(sess db.Session, payment *data.Payment, tokenID uint64, amount int64) {
				assert.Greater(t, int(payment.ID), 0)
				assert.Equal(t, accountID, payment.AccountID)
				assert.Equal(t, transactionID, payment.ExternalTxnID)
			})

			err := verifier.VerifyAppleAppStorePayment(ctx, accountID, &providerResponse)
			require.ErrorContains(t, err, "payment is already successful")

			checkNoPayment(t, accountID, provider, transactionID)
		})

		t.Run("fails when gaining item fails", func(t *testing.T) {
			transactionID := uuid.NewString()

			providerResponse := proto.AppleAppStorePaymentResponse{
				TransactionId:      transactionID,
				ProductId:          productID,
				TransactionReceipt: transactionReceipt,
			}

			appleAppStoreVerifier.EXPECT().Verify(gomock.Any(), transactionReceipt).Return(&appleappstore.Response{
				Receipt: appleappstore.Receipt{
					InApp: []appleappstore.InApp{
						{ProductID: productID, TransactionID: transactionID},
					},
				},
			}, nil)

			productConverter.EXPECT().ToItemType(provider, productID).Return(&itemType, nil)
			productConverter.EXPECT().ToAmount(productID).Return(amount)

			itemTokenGetter.EXPECT().GetToken(itemType).Return(tokenID, nil)

			itemGainer.EXPECT().Gain(gomock.Any(), gomock.Any(), tokenID, amount).Do(func(sess db.Session, payment *data.Payment, tokenId uint64, amount int64) {
				assert.Greater(t, int(payment.ID), 0)
				assert.Equal(t, accountID, payment.AccountID)
				assert.Equal(t, transactionID, payment.ExternalTxnID)
			}).Return(someError)

			err := verifier.VerifyAppleAppStorePayment(ctx, accountID, &providerResponse)
			require.ErrorIs(t, err, someError)

			checkNoPayment(t, accountID, provider, transactionID)
		})

		t.Run("fails when getting token fails", func(t *testing.T) {
			transactionID := uuid.NewString()

			providerResponse := proto.AppleAppStorePaymentResponse{
				TransactionId:      transactionID,
				ProductId:          productID,
				TransactionReceipt: transactionReceipt,
			}

			appleAppStoreVerifier.EXPECT().Verify(gomock.Any(), transactionReceipt).Return(&appleappstore.Response{
				Receipt: appleappstore.Receipt{
					InApp: []appleappstore.InApp{
						{ProductID: productID, TransactionID: transactionID},
					},
				},
			}, nil)

			productConverter.EXPECT().ToItemType(provider, productID).Return(&itemType, nil)
			productConverter.EXPECT().ToAmount(productID).Return(amount)

			itemTokenGetter.EXPECT().GetToken(itemType).Return(uint64(0), someError)

			err := verifier.VerifyAppleAppStorePayment(ctx, accountID, &providerResponse)
			require.ErrorIs(t, err, someError)

			checkNoPayment(t, accountID, provider, transactionID)
		})

		t.Run("fails when product to item type conversion fails", func(t *testing.T) {
			transactionID := uuid.NewString()

			providerResponse := proto.AppleAppStorePaymentResponse{
				TransactionId:      transactionID,
				ProductId:          productID,
				TransactionReceipt: transactionReceipt,
			}

			appleAppStoreVerifier.EXPECT().Verify(gomock.Any(), transactionReceipt).Return(&appleappstore.Response{
				Receipt: appleappstore.Receipt{
					InApp: []appleappstore.InApp{
						{ProductID: productID, TransactionID: transactionID},
					},
				},
			}, nil)

			productConverter.EXPECT().ToItemType(provider, productID).Return(nil, someError)

			err := verifier.VerifyAppleAppStorePayment(ctx, accountID, &providerResponse)
			require.ErrorIs(t, err, someError)

			checkNoPayment(t, accountID, provider, transactionID)
		})

		t.Run("fails when provided transaction ID is not the same as in the verification response", func(t *testing.T) {
			transactionID := uuid.NewString()

			providerResponse := proto.AppleAppStorePaymentResponse{
				TransactionId:      transactionID,
				ProductId:          productID,
				TransactionReceipt: transactionReceipt,
			}

			appleAppStoreVerifier.EXPECT().Verify(gomock.Any(), transactionReceipt).Return(&appleappstore.Response{
				Receipt: appleappstore.Receipt{
					InApp: []appleappstore.InApp{
						{ProductID: productID, TransactionID: "bad transaction ID"},
					},
				},
			}, nil)

			err := verifier.VerifyAppleAppStorePayment(ctx, accountID, &providerResponse)
			require.ErrorContains(t, err, "validate response")

			checkNoPayment(t, accountID, provider, transactionID)
		})

		t.Run("fails when verification fails", func(t *testing.T) {
			transactionID := uuid.NewString()

			providerResponse := proto.AppleAppStorePaymentResponse{
				TransactionId:      transactionID,
				ProductId:          productID,
				TransactionReceipt: transactionReceipt,
			}

			appleAppStoreVerifier.EXPECT().Verify(gomock.Any(), transactionReceipt).Return(nil, someError)

			err := verifier.VerifyAppleAppStorePayment(ctx, accountID, &providerResponse)
			require.ErrorIs(t, err, someError)

			checkNoPayment(t, accountID, provider, transactionID)
		})

		t.Run("fails when payment is already successful", func(t *testing.T) {
			transactionID := uuid.NewString()

			// Setup
			{
				// Payments
				{
					status := proto.PaymentStatus_SUCCEEDED
					err := data.DB.Save(&data.Payment{
						Payment: &proto.Payment{
							AccountID:     accountID,
							Status:        &status,
							Provider:      &provider,
							ExternalTxnID: transactionID,
						},
					})
					require.NoError(t, err)
				}
			}

			providerResponse := proto.AppleAppStorePaymentResponse{
				TransactionId:      transactionID,
				ProductId:          productID,
				TransactionReceipt: transactionReceipt,
			}

			err := verifier.VerifyAppleAppStorePayment(ctx, accountID, &providerResponse)
			require.ErrorContains(t, err, "cannot be verified")

			paymentID := checkPaymentStatus(t, accountID, provider, transactionID, proto.PaymentStatus_SUCCEEDED)
			checkPaymentLogs(t, paymentID, []string{})
		})

		t.Run("fails when provider verifier is nil", func(t *testing.T) {
			verifier := payments.NewProviderResponseVerifier(
				googlePlayVerifier,
				nil,
				samsungGalaxyStoreVerifier,
				productConverter,
				itemTokenGetter,
				itemGainer,
				analyticsTracker,
				metricsCollector,
			)

			err := verifier.VerifyAppleAppStorePayment(ctx, accountID, nil)
			require.ErrorContains(t, err, "apple app store verifier is disabled")
		})
	})

	t.Run("verify Samsung Galaxy Store payment", func(t *testing.T) {
		purchaseID := "purchase ID"

		provider := proto.PaymentProvider_SAMSUNG_GALAXY_STORE

		providerResponseDataType := "*proto.SamsungGalaxyStorePaymentResponse"
		verificationResponseDataType := "*samsunggalaxystore.Response"

		t.Run("verifies when payment does not exist and verification is successful", func(t *testing.T) {
			transactionID := uuid.NewString()

			providerResponse := proto.SamsungGalaxyStorePaymentResponse{
				PaymentId:  transactionID,
				ItemId:     productID,
				PurchaseId: purchaseID,
			}

			expectedAnalyticsItemPurchase := proto.AnalyticsItemPurchase{
				AccountID:     accountID,
				ProductID:     productID,
				Currency:      "USD",
				PricePerUnit:  0.6,
				Quantity:      uint32(amount),
				TotalPrice:    1.2,
				Platform:      "samsung",
				TransactionID: transactionID,
				Token:         "conquest_tickets",
				ItemType:      itemType,
			}

			samsungGalaxyStoreVerifier.EXPECT().Verify(gomock.Any(), purchaseID).Return(&samsunggalaxystore.Response{
				PaymentID:     transactionID,
				ItemID:        productID,
				Status:        samsunggalaxystore.ResponseStatusSuccess,
				PaymentAmount: "1.2",
				CurrencyCode:  "USD",
			}, nil)

			productConverter.EXPECT().ToItemType(provider, productID).Return(&itemType, nil)
			productConverter.EXPECT().ToAmount(productID).Return(amount)

			itemTokenGetter.EXPECT().GetToken(itemType).Return(tokenID, nil)

			itemGainer.EXPECT().Gain(gomock.Any(), gomock.Any(), tokenID, amount).Do(func(sess db.Session, payment *data.Payment, tokenId uint64, amount int64) {
				assert.Greater(t, int(payment.ID), 0)
				assert.Equal(t, accountID, payment.AccountID)
				assert.Equal(t, transactionID, payment.ExternalTxnID)
			})

			analyticsTracker.EXPECT().TrackItemPurchase(gomock.Any(), &expectedAnalyticsItemPurchase)

			err := verifier.VerifySamsungGalaxyStorePayment(ctx, accountID, &providerResponse)
			require.NoError(t, err)

			paymentID := checkPaymentStatus(t, accountID, provider, transactionID, proto.PaymentStatus_SUCCEEDED)
			checkPaymentLogs(t, paymentID, []string{providerResponseDataType, verificationResponseDataType})
		})

		t.Run("verifies when payment is already initiated and verification is successful", func(t *testing.T) {
			transactionID := uuid.NewString()

			// Setup
			{
				// Payments
				{
					status := proto.PaymentStatus_INITIATED
					err := data.DB.Save(&data.Payment{
						Payment: &proto.Payment{
							AccountID:     accountID,
							Status:        &status,
							Provider:      &provider,
							ExternalTxnID: transactionID,
						},
					})
					require.NoError(t, err)
				}
			}

			providerResponse := proto.SamsungGalaxyStorePaymentResponse{
				PaymentId:  transactionID,
				ItemId:     productID,
				PurchaseId: purchaseID,
			}

			expectedAnalyticsItemPurchase := proto.AnalyticsItemPurchase{
				AccountID:     accountID,
				ProductID:     productID,
				Currency:      "USD",
				PricePerUnit:  0.6,
				Quantity:      uint32(amount),
				TotalPrice:    1.2,
				Platform:      "samsung",
				TransactionID: transactionID,
				Token:         "conquest_tickets",
				ItemType:      itemType,
			}

			samsungGalaxyStoreVerifier.EXPECT().Verify(gomock.Any(), purchaseID).Return(&samsunggalaxystore.Response{
				PaymentID:     transactionID,
				ItemID:        productID,
				Status:        samsunggalaxystore.ResponseStatusSuccess,
				PaymentAmount: "1.2",
				CurrencyCode:  "USD",
			}, nil)

			productConverter.EXPECT().ToItemType(provider, productID).Return(&itemType, nil)
			productConverter.EXPECT().ToAmount(productID).Return(amount)

			itemTokenGetter.EXPECT().GetToken(itemType).Return(tokenID, nil)

			itemGainer.EXPECT().Gain(gomock.Any(), gomock.Any(), tokenID, amount).Do(func(sess db.Session, payment *data.Payment, tokenId uint64, amount int64) {
				assert.Greater(t, int(payment.ID), 0)
				assert.Equal(t, accountID, payment.AccountID)
				assert.Equal(t, transactionID, payment.ExternalTxnID)
			})

			analyticsTracker.EXPECT().TrackItemPurchase(gomock.Any(), &expectedAnalyticsItemPurchase)

			err := verifier.VerifySamsungGalaxyStorePayment(ctx, accountID, &providerResponse)
			require.NoError(t, err)

			paymentID := checkPaymentStatus(t, accountID, provider, transactionID, proto.PaymentStatus_SUCCEEDED)
			checkPaymentLogs(t, paymentID, []string{providerResponseDataType, verificationResponseDataType})
		})

		t.Run("verifies when payment is already failed but new verification is successful", func(t *testing.T) {
			transactionID := uuid.NewString()

			// Setup
			{
				// Payments
				{
					status := proto.PaymentStatus_FAILED
					err := data.DB.Save(&data.Payment{
						Payment: &proto.Payment{
							AccountID:     accountID,
							Status:        &status,
							Provider:      &provider,
							ExternalTxnID: transactionID,
						},
					})
					require.NoError(t, err)
				}
			}

			providerResponse := proto.SamsungGalaxyStorePaymentResponse{
				PaymentId:  transactionID,
				ItemId:     productID,
				PurchaseId: purchaseID,
			}

			expectedAnalyticsItemPurchase := proto.AnalyticsItemPurchase{
				AccountID:     accountID,
				ProductID:     productID,
				Currency:      "USD",
				PricePerUnit:  0.6,
				Quantity:      uint32(amount),
				TotalPrice:    1.2,
				Platform:      "samsung",
				TransactionID: transactionID,
				Token:         "conquest_tickets",
				ItemType:      itemType,
			}

			samsungGalaxyStoreVerifier.EXPECT().Verify(gomock.Any(), purchaseID).Return(&samsunggalaxystore.Response{
				PaymentID:     transactionID,
				ItemID:        productID,
				Status:        samsunggalaxystore.ResponseStatusSuccess,
				PaymentAmount: "1.2",
				CurrencyCode:  "USD",
			}, nil)

			productConverter.EXPECT().ToItemType(provider, productID).Return(&itemType, nil)
			productConverter.EXPECT().ToAmount(productID).Return(amount)

			itemTokenGetter.EXPECT().GetToken(itemType).Return(tokenID, nil)

			itemGainer.EXPECT().Gain(gomock.Any(), gomock.Any(), tokenID, amount).Do(func(sess db.Session, payment *data.Payment, tokenID uint64, amount int64) {
				assert.Greater(t, int(payment.ID), 0)
				assert.Equal(t, accountID, payment.AccountID)
				assert.Equal(t, transactionID, payment.ExternalTxnID)
			})

			analyticsTracker.EXPECT().TrackItemPurchase(gomock.Any(), &expectedAnalyticsItemPurchase)

			err := verifier.VerifySamsungGalaxyStorePayment(ctx, accountID, &providerResponse)
			require.NoError(t, err)

			paymentID := checkPaymentStatus(t, accountID, provider, transactionID, proto.PaymentStatus_SUCCEEDED)
			checkPaymentLogs(t, paymentID, []string{providerResponseDataType, verificationResponseDataType})
		})

		t.Run("fails when payment is already successful for another account", func(t *testing.T) {
			transactionID := uuid.NewString()

			// Setup
			{
				var anotherAccountID proto.AccountID

				// Account
				{
					var err error

					anotherAccountID, _, err = apitest.CreateRandomAccount("TestProviderResponseVerifier-another-samsung")
					require.NoError(t, err)
				}

				// Payments
				{
					status := proto.PaymentStatus_SUCCEEDED
					err := data.DB.Save(&data.Payment{
						Payment: &proto.Payment{
							AccountID:     anotherAccountID,
							Status:        &status,
							Provider:      &provider,
							ExternalTxnID: transactionID,
						},
					})
					require.NoError(t, err)
				}
			}

			providerResponse := proto.SamsungGalaxyStorePaymentResponse{
				PaymentId:  transactionID,
				ItemId:     productID,
				PurchaseId: purchaseID,
			}

			samsungGalaxyStoreVerifier.EXPECT().Verify(gomock.Any(), purchaseID).Return(&samsunggalaxystore.Response{
				PaymentID:     transactionID,
				ItemID:        productID,
				Status:        samsunggalaxystore.ResponseStatusSuccess,
				PaymentAmount: "1.2",
				CurrencyCode:  "USD",
			}, nil)

			productConverter.EXPECT().ToItemType(provider, productID).Return(&itemType, nil)
			productConverter.EXPECT().ToAmount(productID).Return(amount)

			itemTokenGetter.EXPECT().GetToken(itemType).Return(tokenID, nil)

			itemGainer.EXPECT().Gain(gomock.Any(), gomock.Any(), tokenID, amount).Do(func(sess db.Session, payment *data.Payment, tokenID uint64, amount int64) {
				assert.Greater(t, int(payment.ID), 0)
				assert.Equal(t, accountID, payment.AccountID)
				assert.Equal(t, transactionID, payment.ExternalTxnID)
			})

			err := verifier.VerifySamsungGalaxyStorePayment(ctx, accountID, &providerResponse)
			require.ErrorContains(t, err, "payment is already successful")

			checkNoPayment(t, accountID, provider, transactionID)
		})

		t.Run("fails when gaining item fails", func(t *testing.T) {
			transactionID := uuid.NewString()

			providerResponse := proto.SamsungGalaxyStorePaymentResponse{
				PaymentId:  transactionID,
				ItemId:     productID,
				PurchaseId: purchaseID,
			}

			samsungGalaxyStoreVerifier.EXPECT().Verify(gomock.Any(), purchaseID).Return(&samsunggalaxystore.Response{
				PaymentID:     transactionID,
				ItemID:        productID,
				Status:        samsunggalaxystore.ResponseStatusSuccess,
				PaymentAmount: "1.2",
				CurrencyCode:  "USD",
			}, nil)

			productConverter.EXPECT().ToItemType(provider, productID).Return(&itemType, nil)
			productConverter.EXPECT().ToAmount(productID).Return(amount)

			itemTokenGetter.EXPECT().GetToken(itemType).Return(tokenID, nil)

			itemGainer.EXPECT().Gain(gomock.Any(), gomock.Any(), tokenID, amount).Do(func(sess db.Session, payment *data.Payment, tokenId uint64, amount int64) {
				assert.Greater(t, int(payment.ID), 0)
				assert.Equal(t, accountID, payment.AccountID)
				assert.Equal(t, transactionID, payment.ExternalTxnID)
			}).Return(someError)

			err := verifier.VerifySamsungGalaxyStorePayment(ctx, accountID, &providerResponse)
			require.ErrorIs(t, err, someError)

			checkNoPayment(t, accountID, provider, transactionID)
		})

		t.Run("fails when getting token fails", func(t *testing.T) {
			transactionID := uuid.NewString()

			providerResponse := proto.SamsungGalaxyStorePaymentResponse{
				PaymentId:  transactionID,
				ItemId:     productID,
				PurchaseId: purchaseID,
			}

			samsungGalaxyStoreVerifier.EXPECT().Verify(gomock.Any(), purchaseID).Return(&samsunggalaxystore.Response{
				PaymentID:     transactionID,
				ItemID:        productID,
				Status:        samsunggalaxystore.ResponseStatusSuccess,
				PaymentAmount: "1.2",
				CurrencyCode:  "USD",
			}, nil)

			productConverter.EXPECT().ToItemType(provider, productID).Return(&itemType, nil)
			productConverter.EXPECT().ToAmount(productID).Return(amount)

			itemTokenGetter.EXPECT().GetToken(itemType).Return(uint64(0), someError)

			err := verifier.VerifySamsungGalaxyStorePayment(ctx, accountID, &providerResponse)
			require.ErrorIs(t, err, someError)

			checkNoPayment(t, accountID, provider, transactionID)
		})

		t.Run("fails when product to item type conversion fails", func(t *testing.T) {
			transactionID := uuid.NewString()

			providerResponse := proto.SamsungGalaxyStorePaymentResponse{
				PaymentId:  transactionID,
				ItemId:     productID,
				PurchaseId: purchaseID,
			}

			samsungGalaxyStoreVerifier.EXPECT().Verify(gomock.Any(), purchaseID).Return(&samsunggalaxystore.Response{
				PaymentID:     transactionID,
				ItemID:        productID,
				Status:        samsunggalaxystore.ResponseStatusSuccess,
				PaymentAmount: "1.2",
				CurrencyCode:  "USD",
			}, nil)

			productConverter.EXPECT().ToItemType(provider, productID).Return(nil, someError)

			err := verifier.VerifySamsungGalaxyStorePayment(ctx, accountID, &providerResponse)
			require.ErrorIs(t, err, someError)

			checkNoPayment(t, accountID, provider, transactionID)
		})

		t.Run("fails when provided payment ID is not the same as in the verification response", func(t *testing.T) {
			transactionID := uuid.NewString()

			providerResponse := proto.SamsungGalaxyStorePaymentResponse{
				PaymentId:  transactionID,
				ItemId:     productID,
				PurchaseId: purchaseID,
			}

			samsungGalaxyStoreVerifier.EXPECT().Verify(gomock.Any(), purchaseID).Return(&samsunggalaxystore.Response{
				PaymentID:     "wrong",
				ItemID:        productID,
				Status:        samsunggalaxystore.ResponseStatusSuccess,
				PaymentAmount: "1.2",
				CurrencyCode:  "USD",
			}, nil)

			err := verifier.VerifySamsungGalaxyStorePayment(ctx, accountID, &providerResponse)
			require.ErrorContains(t, err, "validate response: payment ID")

			checkNoPayment(t, accountID, provider, transactionID)
		})

		t.Run("fails when provided item ID is not the same as in the verification response", func(t *testing.T) {
			transactionID := uuid.NewString()

			providerResponse := proto.SamsungGalaxyStorePaymentResponse{
				PaymentId:  transactionID,
				ItemId:     productID,
				PurchaseId: purchaseID,
			}

			samsungGalaxyStoreVerifier.EXPECT().Verify(gomock.Any(), purchaseID).Return(&samsunggalaxystore.Response{
				PaymentID:     transactionID,
				ItemID:        "wrong",
				Status:        samsunggalaxystore.ResponseStatusSuccess,
				PaymentAmount: "1.2",
				CurrencyCode:  "USD",
			}, nil)

			err := verifier.VerifySamsungGalaxyStorePayment(ctx, accountID, &providerResponse)
			require.ErrorContains(t, err, "validate response: item ID")

			checkNoPayment(t, accountID, provider, transactionID)
		})

		t.Run("fails when verification response status is not success", func(t *testing.T) {
			transactionID := uuid.NewString()

			providerResponse := proto.SamsungGalaxyStorePaymentResponse{
				PaymentId:  transactionID,
				ItemId:     productID,
				PurchaseId: purchaseID,
			}

			samsungGalaxyStoreVerifier.EXPECT().Verify(gomock.Any(), purchaseID).Return(&samsunggalaxystore.Response{
				PaymentID:     transactionID,
				ItemID:        productID,
				Status:        samsunggalaxystore.ResponseStatusFail,
				PaymentAmount: "1.2",
				CurrencyCode:  "USD",
			}, nil)

			err := verifier.VerifySamsungGalaxyStorePayment(ctx, accountID, &providerResponse)
			require.ErrorContains(t, err, "validate response: status")

			checkNoPayment(t, accountID, provider, transactionID)
		})

		t.Run("fails when verification fails", func(t *testing.T) {
			transactionID := uuid.NewString()

			providerResponse := proto.SamsungGalaxyStorePaymentResponse{
				PaymentId:  transactionID,
				ItemId:     productID,
				PurchaseId: purchaseID,
			}

			samsungGalaxyStoreVerifier.EXPECT().Verify(gomock.Any(), purchaseID).Return(nil, someError)

			err := verifier.VerifySamsungGalaxyStorePayment(ctx, accountID, &providerResponse)
			require.ErrorIs(t, err, someError)

			checkNoPayment(t, accountID, provider, transactionID)
		})

		t.Run("fails when payment is already successful", func(t *testing.T) {
			transactionID := uuid.NewString()

			// Setup
			{
				// Payments
				{
					status := proto.PaymentStatus_SUCCEEDED
					err := data.DB.Save(&data.Payment{
						Payment: &proto.Payment{
							AccountID:     accountID,
							Status:        &status,
							Provider:      &provider,
							ExternalTxnID: transactionID,
						},
					})
					require.NoError(t, err)
				}
			}

			providerResponse := proto.SamsungGalaxyStorePaymentResponse{
				PaymentId:  transactionID,
				ItemId:     productID,
				PurchaseId: purchaseID,
			}

			err := verifier.VerifySamsungGalaxyStorePayment(ctx, accountID, &providerResponse)
			require.ErrorContains(t, err, "cannot be verified")

			paymentID := checkPaymentStatus(t, accountID, provider, transactionID, proto.PaymentStatus_SUCCEEDED)
			checkPaymentLogs(t, paymentID, []string{})
		})

		t.Run("fails when provider verifier is nil", func(t *testing.T) {
			verifier := payments.NewProviderResponseVerifier(
				googlePlayVerifier,
				appleAppStoreVerifier,
				nil,
				productConverter,
				itemTokenGetter,
				itemGainer,
				analyticsTracker,
				metricsCollector,
			)

			err := verifier.VerifySamsungGalaxyStorePayment(ctx, accountID, nil)
			require.ErrorContains(t, err, "samsung galaxy store verifier is disabled")
		})
	})
}

func checkPaymentStatus(t *testing.T, accountID proto.AccountID, provider proto.PaymentProvider, transactionId string, expectedStatus proto.PaymentStatus) (paymentID uint64) {
	var payment *data.Payment

	err := data.DB.Payments().Find(db.Cond{
		"account_id":      accountID,
		"provider":        provider,
		"external_txn_id": transactionId,
	}).One(&payment)
	require.NoError(t, err)
	assert.Equal(t, expectedStatus, *payment.Status)

	return payment.ID
}

func checkNoPayment(t *testing.T, accountID proto.AccountID, provider proto.PaymentProvider, transactionId string) {
	exists, err := data.DB.Payments().Find(db.Cond{
		"account_id":      accountID,
		"provider":        provider,
		"external_txn_id": transactionId,
	}).Exists()
	require.NoError(t, err)
	assert.False(t, exists, "payment should not exists")
}

func checkPaymentLogs(t *testing.T, paymentID uint64, expectedDataTypes []string) {
	var paymentLogs []*data.PaymentLog

	err := data.DB.PaymentsLogs().Find(db.Cond{"payment_id": paymentID}).OrderBy("id").All(&paymentLogs)
	require.NoError(t, err)
	require.Equal(t, len(expectedDataTypes), len(paymentLogs))

	for i, expectedDataType := range expectedDataTypes {
		assert.Equal(t, expectedDataType, paymentLogs[i].Data.Type)
		assert.NotEmpty(t, paymentLogs[i].Data.Data)
	}
}
