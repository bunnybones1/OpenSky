package data_test

import (
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/horizon-games/OpenSky/api/data"
)

func TestPaymentLog(t *testing.T) {
	t.Run("new", func(t *testing.T) {
		paymentID := uint64(2)
		obj := testPaymentLogDataObject{
			Foo: "bar",
		}

		paymentLog, err := data.NewPaymentLog(paymentID, obj)
		require.NoError(t, err)
		require.NotNil(t, paymentLog)

		assert.Equal(t, paymentID, paymentLog.PaymentID)
		assert.Equal(t, "data_test.testPaymentLogDataObject", paymentLog.Data.Type)

		var obj2 testPaymentLogDataObject
		err = json.Unmarshal(paymentLog.Data.Data, &obj2)
		require.NoError(t, err)
		assert.Equal(t, obj, obj2)
	})
}

type testPaymentLogDataObject struct {
	Foo string
}
