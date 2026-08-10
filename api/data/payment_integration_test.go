//go:build integration

package data_test

import (
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/upper/db/v4"

	"github.com/horizon-games/OpenSky/api/apitest"
	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/proto"
)

func TestPayment(t *testing.T) {
	var accountID proto.AccountID

	// Setup
	{
		// Accounts
		{
			var err error
			accountID, _, err = apitest.CreateRandomAccount("TestPayment")
			require.NoError(t, err)
		}
	}

	t.Run("fail", func(t *testing.T) {
		var payment *data.Payment

		// Setup
		{
			// Payments
			{
				payment = &data.Payment{
					Payment: &proto.Payment{
						AccountID:     accountID,
						Status:        proto.PaymentStatusPtr(proto.PaymentStatus_PENDING),
						Provider:      proto.PaymentProviderPtr(proto.PaymentProvider_GOOGLE_PLAY),
						ExternalTxnID: uuid.NewString(),
					},
				}
				err := data.DB.Save(payment)
				require.NoError(t, err)
			}
		}

		err := payment.Fail(data.DB.Session)
		require.NoError(t, err)

		var result *data.Payment

		err = data.DB.Payments().Find(db.Cond{"id": payment.ID}).One(&result)
		require.NoError(t, err)

		require.NotNil(t, result)
		assert.Equal(t, proto.PaymentStatus_FAILED, *result.Status)
	})

	t.Run("store log", func(t *testing.T) {
		logData := "log data"

		t.Run("stores the log", func(t *testing.T) {
			var payment *data.Payment

			// Setup
			{
				// Payments
				{
					payment = &data.Payment{
						Payment: &proto.Payment{
							AccountID:     accountID,
							Status:        proto.PaymentStatusPtr(proto.PaymentStatus_PENDING),
							Provider:      proto.PaymentProviderPtr(proto.PaymentProvider_GOOGLE_PLAY),
							ExternalTxnID: uuid.NewString(),
						},
					}
					err := data.DB.Save(payment)
					require.NoError(t, err)
				}
			}

			err := payment.StoreLog(data.DB.Session, logData)
			require.NoError(t, err)

			var paymentLog *data.PaymentLog

			err = data.DB.PaymentsLogs().Find(db.Cond{"payment_id": payment.ID}).One(&paymentLog)
			require.NoError(t, err)
			require.NotNil(t, paymentLog)
		})

		t.Run("fails when payment does not have ID", func(t *testing.T) {
			payment := &data.Payment{Payment: &proto.Payment{}}

			err := payment.StoreLog(data.DB.Session, logData)
			require.ErrorContains(t, err, "payment does not have ID")
		})
	})
}

func TestPaymentProviderToTransactionType(t *testing.T) {
	tests := proto.PaymentProvider_value

	for _, providerValue := range tests {
		provider := proto.PaymentProvider(providerValue)

		if provider == proto.PaymentProvider_UNKNOWN {
			continue
		}

		t.Run(provider.String(), func(t *testing.T) {
			transactionType := data.PaymentProviderToTransactionType(provider)

			assert.NotEqual(t, proto.TransactionType_UNKNOWN.String(), transactionType.String())
		})
	}
}
