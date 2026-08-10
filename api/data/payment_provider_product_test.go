package data_test

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/proto"
)

func TestListPaymentProviderProducts(t *testing.T) {
	t.Run("items across providers", func(t *testing.T) {
		tests := map[proto.PaymentProvider][]proto.ItemType{
			proto.PaymentProvider_GOOGLE_PLAY: {
				proto.ItemType_SW_CONQUEST_TICKET,
				proto.ItemType_SW_SKYPASS,
			},
			proto.PaymentProvider_APPLE_APP_STORE: {
				proto.ItemType_SW_CONQUEST_TICKET,
				proto.ItemType_SW_SKYPASS,
			},
			proto.PaymentProvider_STRIPE: {
				proto.ItemType_SW_CONQUEST_TICKET,
				proto.ItemType_SW_SKYPASS,
			},
			proto.PaymentProvider_SEQUENCE: {
				proto.ItemType_SW_CONQUEST_TICKET,
				proto.ItemType_SW_SKYPASS,
			},
			proto.PaymentProvider_SAMSUNG_GALAXY_STORE: {
				proto.ItemType_SW_CONQUEST_TICKET,
				proto.ItemType_SW_SKYPASS,
			},
		}

		for provider, itemTypes := range tests {
			t.Run(provider.String(), func(t *testing.T) {
				t.Run("all", func(t *testing.T) {
					products := data.ListPaymentProviderProducts(provider, nil, proto.ItemType_UNKNOWN)
					assert.Greater(t, len(products), 0)
				})

				for _, itemType := range itemTypes {
					t.Run(itemType.String(), func(t *testing.T) {
						products := data.ListPaymentProviderProducts(provider, &itemType, proto.ItemType_UNKNOWN)
						assert.Greater(t, len(products), 0)
						for _, product := range products {
							assert.Equal(t, itemType, *product.ItemType)
						}
					})
				}
			})
		}
	})

	t.Run("has price in silver card", func(t *testing.T) {
		provider := proto.PaymentProvider_SEQUENCE
		priceItemType := proto.ItemType_SW_SILVER_CARDS

		t.Run("conquest ticket", func(t *testing.T) {
			itemType := proto.ItemType_SW_CONQUEST_TICKET
			products := data.ListPaymentProviderProducts(provider, &itemType, priceItemType)
			require.Len(t, products, 1)
			assert.NotNil(t, products[0].Price)
		})

		t.Run("skypass", func(t *testing.T) {
			itemType := proto.ItemType_SW_SKYPASS
			products := data.ListPaymentProviderProducts(provider, &itemType, priceItemType)
			require.Len(t, products, 1)
			assert.NotNil(t, products[0].Price)
		})
	})
}
