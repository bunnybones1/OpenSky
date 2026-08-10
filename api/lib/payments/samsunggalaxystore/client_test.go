package samsunggalaxystore_test

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"net/http"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/horizon-games/OpenSky/api/config"
	"github.com/horizon-games/OpenSky/api/lib/payments/samsunggalaxystore"
)

func TestClient(t *testing.T) {
	type server struct {
		code int
		body string
	}

	tests := []struct {
		name       string
		testServer *server
		expected   *samsunggalaxystore.Response
		err        error
	}{
		{
			name: "success",
			testServer: &server{
				code: http.StatusOK,
				body: `
{
   "itemId": "57515",
   "paymentId": "20191129013006730832TRAN",
   "orderId": "S20191129KRA1908197",
   "packageName": "com.samsung.android.test",
   "itemName": "Test Pack",
   "itemDesc": "IAP Test Item. Best value!",
   "purchaseDate": "2019-11-29 01:32:41",
   "paymentAmount": "100.000",
   "status": "success",
   "paymentMethod": "Credit Card",
   "mode": "PRODUCTION",
   "consumeYN": "Y",
   "consumeDate": "2019-11-29 01:33:28",
   "consumeDeviceModel": "SM-N960N",
   "passThroughParam": "TEST_PASS_THROUGH",
   "currencyCode": "KRW",
    "currencyUnit": "￦"
}`,
			},
			expected: &samsunggalaxystore.Response{
				ItemID:             "57515",
				PaymentID:          "20191129013006730832TRAN",
				OrderID:            "S20191129KRA1908197",
				PackageName:        "com.samsung.android.test",
				ItemName:           "Test Pack",
				ItemDesc:           "IAP Test Item. Best value!",
				PurchaseDate:       "2019-11-29 01:32:41",
				PaymentAmount:      "100.000",
				Status:             samsunggalaxystore.ResponseStatusSuccess,
				PaymentMethod:      "Credit Card",
				Mode:               "PRODUCTION",
				ConsumeYN:          "Y",
				ConsumeDate:        "2019-11-29 01:33:28",
				ConsumeDeviceModel: "SM-N960N",
				PassThroughParam:   "TEST_PASS_THROUGH",
				CurrencyCode:       "KRW",
				CurrencyUnit:       "￦",
			},
		},
		{
			name: "bad http status code",
			testServer: &server{
				code: http.StatusInternalServerError,
				body: `qwerty!@#$%^`,
			},
			err: fmt.Errorf("send request with purchase ID \"purchase_id\": unexpected status code: 500"),
		},
	}

	cfg := config.OpenSkyMobileIAPConfig{
		Enabled: true,
	}

	ctx := context.Background()

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			httpClient := &http.Client{
				Transport: roundTripFunc(func(req *http.Request) *http.Response {
					return &http.Response{
						StatusCode: tt.testServer.code,
						Body:       io.NopCloser(bytes.NewBufferString(tt.testServer.body)),
						Header:     make(http.Header),
					}
				}),
			}

			client := samsunggalaxystore.NewClient(cfg, httpClient)

			response, err := client.Verify(ctx, "purchase_id")
			if tt.err != nil {
				require.EqualError(t, err, tt.err.Error())
			} else {
				require.NoError(t, err)
			}
			assert.Equal(t, tt.expected, response)
		})
	}
}

type roundTripFunc func(req *http.Request) *http.Response

func (f roundTripFunc) RoundTrip(req *http.Request) (*http.Response, error) {
	return f(req), nil
}
