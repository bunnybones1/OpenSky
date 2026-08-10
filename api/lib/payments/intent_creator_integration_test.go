//go:build integration

package payments_test

import (
	"context"
	"fmt"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
	"github.com/stripe/stripe-go/v74"
	"go.uber.org/mock/gomock"

	"github.com/horizon-games/OpenSky/api/apitest"
	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/lib/payments"
	"github.com/horizon-games/OpenSky/api/lib/payments/mock"
	"github.com/horizon-games/OpenSky/api/proto"
)

func TestIntentCreator(t *testing.T) {
	var accountID proto.AccountID

	var stripeIntentCreator *mock.MockStripeIntentCreator

	// Setup
	{
		// Account
		{
			var err error

			accountID, _, err = apitest.CreateRandomAccount("TestIntentCreator")
			require.NoError(t, err)
		}

		// Mocks
		{
			ctrl := gomock.NewController(t)

			stripeIntentCreator = mock.NewMockStripeIntentCreator(ctrl)
		}
	}

	creator := payments.NewIntentCreator(stripeIntentCreator)

	ctx := context.Background()

	productID := "conquest_tickets_0001"

	expectedAmount := uint64(1)
	expectedURL := "expected-url"
	provider := proto.PaymentProvider_STRIPE

	intentRequestDataType := "payments.IntentRequest"
	stripeCheckoutSessionDataType := "*stripe.CheckoutSession"

	someError := fmt.Errorf("some error")

	t.Run("creates payment intent", func(t *testing.T) {
		transactionId := uuid.NewString()

		stripeIntentCreator.EXPECT().CreateIntent(gomock.Any(), productID, expectedAmount).Return(
			&stripe.CheckoutSession{
				ID:  transactionId,
				URL: expectedURL,
			},
			nil,
		)

		checkout, err := creator.CreateStripeIntent(ctx, accountID, productID)
		require.NoError(t, err)
		require.NotNil(t, checkout)

		paymentID := checkPaymentStatus(t, accountID, provider, transactionId, proto.PaymentStatus_PENDING)
		checkPaymentLogs(t, paymentID, []string{intentRequestDataType, stripeCheckoutSessionDataType})
	})

	t.Run("fails when payment already exists for another account", func(t *testing.T) {
		transactionId := uuid.NewString()

		// Setup
		{
			var anotherAccountID proto.AccountID

			// Account
			{
				var err error

				anotherAccountID, _, err = apitest.CreateRandomAccount("TestPaymentIntentCreator-another")
				require.NoError(t, err)
			}

			// Payments
			{
				err := data.DB.Save(&data.Payment{
					Payment: &proto.Payment{
						AccountID:     anotherAccountID,
						Status:        proto.PaymentStatusPtr(proto.PaymentStatus_SUCCEEDED),
						Provider:      &provider,
						ExternalTxnID: transactionId,
					},
				})
				require.NoError(t, err)
			}
		}

		stripeIntentCreator.EXPECT().CreateIntent(gomock.Any(), productID, expectedAmount).Return(
			&stripe.CheckoutSession{
				ID:  transactionId,
				URL: expectedURL,
			},
			nil,
		)

		checkout, err := creator.CreateStripeIntent(ctx, accountID, productID)
		require.ErrorContains(t, err, "payment already exists")
		require.Nil(t, checkout)
	})

	t.Run("fails when creating Stripe intent fails", func(t *testing.T) {
		stripeIntentCreator.EXPECT().CreateIntent(gomock.Any(), productID, expectedAmount).Return(nil, someError)

		checkout, err := creator.CreateStripeIntent(ctx, accountID, productID)
		require.ErrorIs(t, err, someError)
		require.Nil(t, checkout)
	})
}
