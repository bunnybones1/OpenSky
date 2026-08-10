//go:build integration

package rpc_test

import (
	"context"
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/upper/db/v4"
	"go.uber.org/mock/gomock"

	"github.com/horizon-games/OpenSky/api/apitest"
	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/lib/jobqueue"
	"github.com/horizon-games/OpenSky/api/proto"
	"github.com/horizon-games/OpenSky/api/rpc/mock"
)

func TestListPaymentProviderProducts(t *testing.T) {
	accountID, _, err := apitest.CreateRandomAccount("TestListPaymentProviderProducts")
	require.NoError(t, err)

	ctx := apitest.AccountContext(accountID)

	paymentProvider := proto.PaymentProvider_GOOGLE_PLAY

	products, err := apitest.Client().ListPaymentProviderProducts(ctx, &paymentProvider, nil)
	require.NoError(t, err)

	assert.Greater(t, len(products), 0)
}

func TestVerifyGooglePlayPayment(t *testing.T) {
	var paymentProviderResponseVerifier *mock.MockPaymentProviderResponseVerifier

	var accountID proto.AccountID

	// Setup
	{
		// Account
		{
			var err error

			accountID, _, err = apitest.CreateRandomAccount("TestVerifyGooglePlayPayment")
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

	ctx := apitest.AccountContext(accountID)

	providerResponse := &proto.GooglePlayPaymentResponse{}

	paymentProviderResponseVerifier.EXPECT().VerifyGooglePlayPayment(gomock.Any(), accountID, providerResponse)

	status, err := apitest.Client().VerifyGooglePlayPayment(ctx, providerResponse)
	require.NoError(t, err)

	assert.True(t, status)
}

func TestVerifyAppleAppStorePayment(t *testing.T) {
	var paymentProviderResponseVerifier *mock.MockPaymentProviderResponseVerifier

	var accountID proto.AccountID

	// Setup
	{
		// Account
		{
			var err error

			accountID, _, err = apitest.CreateRandomAccount("TestVerifyAppleAppStorePayment")
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

	ctx := apitest.AccountContext(accountID)

	providerResponse := &proto.AppleAppStorePaymentResponse{}

	paymentProviderResponseVerifier.EXPECT().VerifyAppleAppStorePayment(gomock.Any(), accountID, providerResponse)

	status, err := apitest.Client().VerifyAppleAppStorePayment(ctx, providerResponse)
	require.NoError(t, err)

	assert.True(t, status)
}

func TestVerifySamsungGalaxyStorePayment(t *testing.T) {
	var paymentProviderResponseVerifier *mock.MockPaymentProviderResponseVerifier

	var accountID proto.AccountID

	// Setup
	{
		// Account
		{
			var err error

			accountID, _, err = apitest.CreateRandomAccount("TestVerifySamsungGalaxyStorePayment")
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

	ctx := apitest.AccountContext(accountID)

	providerResponse := &proto.SamsungGalaxyStorePaymentResponse{}

	paymentProviderResponseVerifier.EXPECT().VerifySamsungGalaxyStorePayment(gomock.Any(), accountID, providerResponse)

	status, err := apitest.Client().VerifySamsungGalaxyStorePayment(ctx, providerResponse)
	require.NoError(t, err)

	assert.True(t, status)
}

func TestCreateStripePaymentIntent(t *testing.T) {
	var paymentIntentCreator *mock.MockPaymentIntentCreator

	var accountID proto.AccountID

	// Setup
	{
		// Account
		{
			var err error

			accountID, _, err = apitest.CreateRandomAccount("TestCreateStripePaymentIntent")
			require.NoError(t, err)
		}

		// Mocks
		{
			ctrl := gomock.NewController(t)

			paymentIntentCreator = mock.NewMockPaymentIntentCreator(ctrl)

			apiService := apitest.APIService()

			originalPaymentIntentCreator := apiService.RPC.PaymentIntentCreator

			apiService.RPC.PaymentIntentCreator = paymentIntentCreator

			t.Cleanup(func() {
				apiService.RPC.PaymentIntentCreator = originalPaymentIntentCreator
			})
		}
	}

	ctx := apitest.AccountContext(accountID)

	productID := "product-id"

	expectedCheckout := &proto.StripeCheckout{URL: "url"}

	paymentIntentCreator.EXPECT().CreateStripeIntent(gomock.Any(), accountID, productID).Return(expectedCheckout, nil)

	checkout, err := apitest.Client().CreateStripePaymentIntent(ctx, productID)
	require.NoError(t, err)
	assert.Equal(t, expectedCheckout, checkout)
}

func TestStripeEventWebhook(t *testing.T) {
	ctx := context.Background()

	id := "id"
	object := "event"
	stripeEventData := &proto.StripeEventData{
		Object: &proto.StripeEventDataObject{
			Id:     "something",
			Object: "checkout.session",
		},
	}

	t.Run("success", func(t *testing.T) {
		err := apitest.Client().StripeEventWebhook(ctx, id, object, stripeEventData)
		require.NoError(t, err)

		var task *data.Task

		err = data.DB.Tasks().Find(db.Cond{
			"queue": jobqueue.StripeEventWorkGroup,
			"hash":  id,
		}).One(&task)
		require.NoError(t, err)

		var taskPayload *jobqueue.StripeEventTask

		err = json.Unmarshal(task.Payload, &taskPayload)
		require.NoError(t, err)

		assert.Equal(t, id, taskPayload.EventID)
	})

	t.Run("fails when ID is empty", func(t *testing.T) {
		err := apitest.Client().StripeEventWebhook(ctx, "", object, stripeEventData)
		require.ErrorContains(t, err, "ID cannot be empty")
	})

	t.Run("fails when object is not an event", func(t *testing.T) {
		err := apitest.Client().StripeEventWebhook(ctx, id, "something", stripeEventData)
		require.ErrorContains(t, err, "object is invalid")
	})

	t.Run("fails when there are no data", func(t *testing.T) {
		err := apitest.Client().StripeEventWebhook(ctx, id, object, nil)
		require.ErrorContains(t, err, "data cannot be empty")
	})

	t.Run("fails when data object is not supported", func(t *testing.T) {
		err := apitest.Client().StripeEventWebhook(ctx, id, object, &proto.StripeEventData{
			Object: &proto.StripeEventDataObject{
				Id:     "something",
				Object: "something",
			},
		})
		require.ErrorContains(t, err, "data object unsupported")
	})
}

func TestPrepareOnChainTransaction(t *testing.T) {
	var onChainTransactionComposer *mock.MockOnChainTransactionComposer

	var accountID proto.AccountID

	// Setup
	{
		// Account
		{
			var err error

			accountID, _, err = apitest.CreateRandomAccount("TestPrepareOnChainTransaction")
			require.NoError(t, err)
		}

		// Mocks
		{
			ctrl := gomock.NewController(t)

			onChainTransactionComposer = mock.NewMockOnChainTransactionComposer(ctrl)

			apiService := apitest.APIService()

			originalOnChainTransactionComposer := apiService.RPC.OnChainTransactionComposer

			apiService.RPC.OnChainTransactionComposer = onChainTransactionComposer

			t.Cleanup(func() {
				apiService.RPC.OnChainTransactionComposer = originalOnChainTransactionComposer
			})
		}
	}

	ctx := apitest.AccountContext(accountID)

	productID := "product-id"

	expectedTransactions := []*proto.OnChainTransaction{{}}

	onChainTransactionComposer.EXPECT().ComposeERC20(gomock.Any(), accountID, productID, uint64(1)).Return(expectedTransactions, nil)

	transaction, err := apitest.Client().PrepareOnChainTransaction(ctx, productID)
	require.NoError(t, err)

	assert.Equal(t, expectedTransactions, transaction)
}

func TestPrepareOnChainInCurrencyTransaction(t *testing.T) {
	var onChainTransactionComposer *mock.MockOnChainTransactionComposer

	var accountID proto.AccountID

	// Setup
	{
		// Account
		{
			var err error

			accountID, _, err = apitest.CreateRandomAccount("TestPrepareOnChainInCurrencyTransaction")
			require.NoError(t, err)
		}

		// Mocks
		{
			ctrl := gomock.NewController(t)

			onChainTransactionComposer = mock.NewMockOnChainTransactionComposer(ctrl)

			apiService := apitest.APIService()

			originalOnChainTransactionComposer := apiService.RPC.OnChainTransactionComposer

			apiService.RPC.OnChainTransactionComposer = onChainTransactionComposer

			t.Cleanup(func() {
				apiService.RPC.OnChainTransactionComposer = originalOnChainTransactionComposer
			})
		}
	}

	ctx := apitest.AccountContext(accountID)

	productID := "product-id"
	quantity := uint64(2)

	expectedTransactions := []*proto.OnChainTransaction{{}}

	onChainTransactionComposer.EXPECT().ComposeERC20(gomock.Any(), accountID, productID, quantity).Return(expectedTransactions, nil)

	transaction, err := apitest.Client().PrepareOnChainInCurrencyTransaction(ctx, productID, quantity)
	require.NoError(t, err)

	assert.Equal(t, expectedTransactions, transaction)
}

func TestPrepareOnChainInItemsTransaction(t *testing.T) {
	var onChainTransactionComposer *mock.MockOnChainTransactionComposer

	var accountID proto.AccountID

	// Setup
	{
		// Account
		{
			var err error

			accountID, _, err = apitest.CreateRandomAccount("TestPrepareOnChainInItemsTransaction")
			require.NoError(t, err)
		}

		// Mocks
		{
			ctrl := gomock.NewController(t)

			onChainTransactionComposer = mock.NewMockOnChainTransactionComposer(ctrl)

			apiService := apitest.APIService()

			originalOnChainTransactionComposer := apiService.RPC.OnChainTransactionComposer

			apiService.RPC.OnChainTransactionComposer = onChainTransactionComposer

			t.Cleanup(func() {
				apiService.RPC.OnChainTransactionComposer = originalOnChainTransactionComposer
			})
		}
	}

	ctx := apitest.AccountContext(accountID)

	productID := "product-id"
	quantity := uint64(2)
	tokenIDsToBurn := []uint64{1, 2}

	expectedTransactions := []*proto.OnChainTransaction{{}}

	onChainTransactionComposer.EXPECT().ComposeERC1155(gomock.Any(), accountID, productID, quantity, tokenIDsToBurn).Return(expectedTransactions, nil)

	transaction, err := apitest.Client().PrepareOnChainInItemsTransaction(ctx, productID, quantity, tokenIDsToBurn)
	require.NoError(t, err)

	assert.Equal(t, expectedTransactions, transaction)
}

func TestGMListPayments(t *testing.T) {
	var adminAccountID, accountID1, accountID2 proto.AccountID

	var payment1, payment2 data.Payment

	// Setup
	{
		// Account
		{
			var err error
			adminAccountID, err = apitest.CreateRandomAdminAccount("TestGMListPayments-admin")
			require.NoError(t, err)

			accountID1, _, err = apitest.CreateRandomAccount("TestGMListPayments-1")
			require.NoError(t, err)

			accountID2, _, err = apitest.CreateRandomAccount("TestGMListPayments-2")
			require.NoError(t, err)
		}

		// Payments
		{
			{
				status := proto.PaymentStatus_SUCCEEDED
				provider := proto.PaymentProvider_GOOGLE_PLAY
				payment1 = data.Payment{
					Payment: &proto.Payment{
						AccountID:     accountID1,
						Status:        &status,
						Provider:      &provider,
						ExternalTxnID: "ABC",
					},
				}
				err := data.DB.Save(&payment1)
				require.NoError(t, err)
			}
			{
				status := proto.PaymentStatus_FAILED
				provider := proto.PaymentProvider_APPLE_APP_STORE
				payment2 = data.Payment{
					Payment: &proto.Payment{
						AccountID:     accountID2,
						Status:        &status,
						Provider:      &provider,
						ExternalTxnID: "DEF",
					},
				}
				err := data.DB.Save(&payment2)
				require.NoError(t, err)
			}

			t.Cleanup(func() {
				err := data.DB.Payments().Find(db.Cond{"account_id": db.In(accountID1, accountID2)}).Delete()
				require.NoError(t, err)
			})
		}
	}

	ctx := apitest.AccountContext(adminAccountID)

	t.Run("all", func(t *testing.T) {
		page, payments, err := apitest.Client().GMListPayments(ctx, nil, nil, nil, nil)
		require.NoError(t, err)
		assert.NotNil(t, page)

		require.Len(t, payments, 2)
		assert.Equal(t, payment1.ID, payments[1].ID)
		assert.Equal(t, payment2.ID, payments[0].ID)
	})

	t.Run("filtered", func(t *testing.T) {
		t.Run("by status", func(t *testing.T) {
			status := proto.PaymentStatus_FAILED

			page, payments, err := apitest.Client().GMListPayments(ctx, nil, &status, nil, nil)
			require.NoError(t, err)
			assert.NotNil(t, page)

			require.Len(t, payments, 1)
			assert.Equal(t, payment2.ID, payments[0].ID)
		})

		t.Run("by provider", func(t *testing.T) {
			provider := proto.PaymentProvider_APPLE_APP_STORE

			page, payments, err := apitest.Client().GMListPayments(ctx, nil, nil, &provider, nil)
			require.NoError(t, err)
			assert.NotNil(t, page)

			require.Len(t, payments, 1)
			assert.Equal(t, payment2.ID, payments[0].ID)
		})

		t.Run("by address", func(t *testing.T) {
			account, err := data.DB.Accounts().FindByID(accountID2)
			require.NoError(t, err)
			address := account.Address.String()

			page, payments, err := apitest.Client().GMListPayments(ctx, nil, nil, nil, &address)
			require.NoError(t, err)
			assert.NotNil(t, page)

			require.Len(t, payments, 1)
			assert.Equal(t, payment2.ID, payments[0].ID)
		})
	})
}

func TestGMListPaymentLogs(t *testing.T) {
	var adminAccountID proto.AccountID

	var payment data.Payment

	var paymentLog data.PaymentLog

	// Setup
	{
		var accountID proto.AccountID

		// Account
		{
			var err error
			adminAccountID, err = apitest.CreateRandomAdminAccount("TestGMListPaymentLogs-admin")
			require.NoError(t, err)

			accountID, _, err = apitest.CreateRandomAccount("TestGMListPaymentLogs-1")
			require.NoError(t, err)
		}

		// Payments
		{
			{
				status := proto.PaymentStatus_SUCCEEDED
				provider := proto.PaymentProvider_GOOGLE_PLAY
				payment = data.Payment{
					Payment: &proto.Payment{
						AccountID:     accountID,
						Status:        &status,
						Provider:      &provider,
						ExternalTxnID: "ABC",
					},
				}
				err := data.DB.Save(&payment)
				require.NoError(t, err)
			}

			t.Cleanup(func() {
				err := data.DB.Payments().Find(db.Cond{"account_id": accountID}).Delete()
				require.NoError(t, err)
			})
		}

		// Payment Logs
		{
			b, err := json.Marshal(map[string]string{"foo": "bar"})
			require.NoError(t, err)

			paymentLog = data.PaymentLog{
				PaymentLog: &proto.PaymentLog{
					PaymentID: payment.ID,
					Data: &proto.PaymentLogData{
						Type: "abc",
						Data: b,
					},
					CreatedAt: nil,
				},
			}

			err = data.DB.Save(&paymentLog)
			require.NoError(t, err)

			t.Cleanup(func() {
				err := data.DB.PaymentsLogs().Find(db.Cond{"payment_id": payment.ID}).Delete()
				require.NoError(t, err)
			})
		}
	}

	ctx := apitest.AccountContext(adminAccountID)

	paymentLogs, err := apitest.Client().GMListPaymentLogs(ctx, payment.ID)
	require.NoError(t, err)

	require.Len(t, paymentLogs, 1)
	assert.Equal(t, paymentLog.ID, paymentLogs[0].ID)
}
