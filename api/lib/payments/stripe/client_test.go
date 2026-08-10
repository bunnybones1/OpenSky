package stripe_test

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"strings"
	"testing"

	"github.com/stretchr/testify/require"

	"github.com/horizon-games/OpenSky/api/config"
	"github.com/horizon-games/OpenSky/api/lib/payments/stripe"
)

var (
	productsResponse = `
{
  "object": "list",
  "data": [
    {
      "id": "prod_N17ZyVh9fouASp",
      "object": "product",
      "active": true,
      "attributes": [],
      "created": 1671540845,
      "default_price": "price_1MH5KbJpST3R2UK0FTbbVhho",
      "description": null,
      "images": [],
      "livemode": false,
      "metadata": {},
      "name": "conquest_tickets_0001",
      "package_dimensions": null,
      "shippable": null,
      "statement_descriptor": null,
      "tax_code": null,
      "type": "service",
      "unit_label": null,
      "updated": 1671540846,
      "url": null
    }
  ],
  "has_more": false,
  "url": "/v1/products"
}
`
	checkoutSessionResponse = `
{
  "id": "cs_test_a1RB6rUPmF9lDC5cysoL9YMAcbDTJ5zc4y4Hf9xNwmwT2iE32eHWCb6mDG",
  "object": "checkout.session",
  "after_expiration": null,
  "allow_promotion_codes": null,
  "amount_subtotal": 150,
  "amount_total": 150,
  "automatic_tax": {
    "enabled": false,
    "status": null
  },
  "billing_address_collection": null,
  "cancel_url": "http://localhost/cancel",
  "client_reference_id": null,
  "consent": null,
  "consent_collection": null,
  "created": 1671571805,
  "currency": "usd",
  "custom_text": {
    "shipping_address": null,
    "submit": null
  },
  "customer": null,
  "customer_creation": "if_required",
  "customer_details": null,
  "customer_email": null,
  "expires_at": 1671658204,
  "invoice": null,
  "invoice_creation": {
    "enabled": false,
    "invoice_data": {
      "account_tax_ids": null,
      "custom_fields": null,
      "description": null,
      "footer": null,
      "metadata": {},
      "rendering_options": null
    }
  },
  "livemode": false,
  "locale": null,
  "metadata": {},
  "mode": "payment",
  "payment_intent": null,
  "payment_link": null,
  "payment_method_collection": "always",
  "payment_method_options": {},
  "payment_method_types": [
    "card"
  ],
  "payment_status": "unpaid",
  "phone_number_collection": {
    "enabled": false
  },
  "recovered_from": null,
  "setup_intent": null,
  "shipping_address_collection": null,
  "shipping_cost": null,
  "shipping_details": null,
  "shipping_options": [],
  "status": "open",
  "submit_type": null,
  "subscription": null,
  "success_url": "http://localhost/success",
  "total_details": {
    "amount_discount": 0,
    "amount_shipping": 0,
    "amount_tax": 0
  },
  "url": "https://checkout.stripe.com/c/pay/cs_test_a1RB6rUPmF9lDC5cysoL9YMAcbDTJ5zc4y4Hf9xNwmwT2iE32eHWCb6mDG#fidkdWxOYHwnPyd1blpxYHZxWlJJdjNGfTZcZFQ8dlVJM1NzPGRgVF98NTU1cXNtNTdMVnQnKSdjd2poVmB3c2B3Jz9xd3BgKSdpZHxqcHFRfHVgJz8ndmxrYmlgWmxxYGgnKSdga2RnaWBVaWRmYG1qaWFgd3YnP3F3cGB4JSUl"
}
`
	getEventResponse = `
{
  "id": "evt_1MHPq5JpST3R2UK0B34xdJxZ",
  "object": "event",
  "api_version": "2019-03-14",
  "created": 1671619677,
  "data": {
    "object": {
      "id": "cs_test_a1f0qFSrPleDd92xHVZznZyH8aoTgPo8jjcgePNIQ6sU8RPRRsYqlPg7eA",
      "object": "checkout.session",
      "after_expiration": null,
      "allow_promotion_codes": null,
      "amount_subtotal": 150,
      "amount_total": 150,
      "automatic_tax": {
        "enabled": false,
        "status": null
      },
      "billing_address_collection": null,
      "cancel_url": "http://localhost/cancel",
      "client_reference_id": null,
      "consent": null,
      "consent_collection": null,
      "created": 1671619141,
      "currency": "usd",
      "custom_text": {
        "shipping_address": null,
        "submit": null
      },
      "customer": null,
      "customer_creation": "if_required",
      "customer_details": {
        "address": {
          "city": null,
          "country": "CZ",
          "line1": null,
          "line2": null,
          "postal_code": null,
          "state": null
        },
        "email": "jz@horizon.io",
        "name": "Jakub",
        "phone": null,
        "tax_exempt": "none",
        "tax_ids": []
      },
      "customer_email": null,
      "expires_at": 1671705540,
      "invoice": null,
      "invoice_creation": {
        "enabled": false,
        "invoice_data": {
          "account_tax_ids": null,
          "custom_fields": null,
          "description": null,
          "footer": null,
          "metadata": {},
          "rendering_options": null
        }
      },
      "livemode": false,
      "locale": null,
      "metadata": {},
      "mode": "payment",
      "payment_intent": "pi_3MHPq3JpST3R2UK00stCKhes",
      "payment_link": null,
      "payment_method_collection": "always",
      "payment_method_options": {},
      "payment_method_types": [
        "card"
      ],
      "payment_status": "paid",
      "phone_number_collection": {
        "enabled": false
      },
      "recovered_from": null,
      "setup_intent": null,
      "shipping": null,
      "shipping_address_collection": null,
      "shipping_options": [],
      "shipping_rate": null,
      "status": "complete",
      "submit_type": null,
      "subscription": null,
      "success_url": "http://localhost/success",
      "total_details": {
        "amount_discount": 0,
        "amount_shipping": 0,
        "amount_tax": 0
      },
      "url": null
    }
  },
  "livemode": false,
  "pending_webhooks": 0,
  "request": {
    "id": null,
    "idempotency_key": null
  },
  "type": "checkout.session.completed"
}
`
)

func TestClient(t *testing.T) {
	ctx := context.Background()

	cfg := config.OpenSkyStripeConfig{
		Enabled:    true,
		APIKey:     "api-key",
		SuccessURL: "http://localhost/success",
		CancelURL:  "http://localhost/cancel",
	}

	httpClient := &http.Client{
		Transport: &mockRoundTripper{},
	}

	client := stripe.NewClient(cfg, httpClient)

	t.Run("create intent", func(t *testing.T) {
		productID := "conquest_tickets_0001"

		t.Run("creates intents based on product", func(t *testing.T) {
			session, err := client.CreateIntent(ctx, productID, 1)
			require.NoError(t, err)
			require.NotNil(t, session)
		})

		t.Run("fails when empty product provided", func(t *testing.T) {
			session, err := client.CreateIntent(ctx, "", 1)
			require.ErrorContains(t, err, "product ID cannot be empty")
			require.Nil(t, session)
		})

		t.Run("fails when wrong product provided", func(t *testing.T) {
			session, err := client.CreateIntent(ctx, "wrong product", 1)
			require.ErrorContains(t, err, "price not found")
			require.Nil(t, session)
		})

		t.Run("fails when amount is zero", func(t *testing.T) {
			session, err := client.CreateIntent(ctx, productID, 0)
			require.ErrorContains(t, err, "amount cannot be zero")
			require.Nil(t, session)
		})

		t.Run("fails when Stripe payments are disabled", func(t *testing.T) {
			cfg := config.OpenSkyStripeConfig{}

			client := stripe.NewClient(cfg, httpClient)

			session, err := client.CreateIntent(ctx, productID, 1)
			require.ErrorContains(t, err, "Stripe payments are disabled")
			require.Nil(t, session)
		})
	})

	t.Run("get event", func(t *testing.T) {
		eventID := "event-id"

		t.Run("gets event", func(t *testing.T) {
			event, err := client.GetEvent(ctx, eventID)
			require.NoError(t, err)
			require.NotNil(t, event)
		})

		t.Run("fails when empty event ID provided", func(t *testing.T) {
			event, err := client.GetEvent(ctx, "")
			require.ErrorContains(t, err, "event ID cannot be empty")
			require.Nil(t, event)
		})
	})
}

type mockRoundTripper struct {
}

func (t *mockRoundTripper) RoundTrip(r *http.Request) (*http.Response, error) {
	switch r.URL.String() {
	case "https://api.stripe.com/v1/products?active=true":
		return &http.Response{
			Body: io.NopCloser(strings.NewReader(productsResponse)),
		}, nil
	case "https://api.stripe.com/v1/checkout/sessions":
		return &http.Response{
			Body: io.NopCloser(strings.NewReader(checkoutSessionResponse)),
		}, nil
	case "https://api.stripe.com/v1/events/event-id":
		return &http.Response{
			Body: io.NopCloser(strings.NewReader(getEventResponse)),
		}, nil
	}

	return nil, fmt.Errorf("unexpected call %q", r.URL.String())
}
