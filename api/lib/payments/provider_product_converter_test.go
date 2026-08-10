package payments_test

import (
	"math/big"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/lib/payments"
	"github.com/horizon-games/OpenSky/api/proto"
)

func TestProviderProductConverter(t *testing.T) {
	converter := payments.NewProviderProductConverter()

	t.Run("to item type", func(t *testing.T) {
		provider := proto.PaymentProvider_GOOGLE_PLAY

		t.Run("fails when product does not exist", func(t *testing.T) {
			itemType, err := converter.ToItemType(provider, "not_exists")
			require.ErrorContains(t, err, "unsupported")
			assert.Nil(t, itemType)
		})

		t.Run("returns conquest ticket item type", func(t *testing.T) {
			providers := []proto.PaymentProvider{
				proto.PaymentProvider_GOOGLE_PLAY,
				proto.PaymentProvider_APPLE_APP_STORE,
				proto.PaymentProvider_STRIPE,
			}

			expectedItemType := proto.ItemType_SW_CONQUEST_TICKET

			for _, provider := range providers {
				t.Run(provider.String(), func(t *testing.T) {
					products := data.ListPaymentProviderProducts(provider, &expectedItemType, proto.ItemType_UNKNOWN)
					require.NotEmpty(t, products)

					for _, product := range products {
						itemType, err := converter.ToItemType(provider, product.Code)
						require.NoError(t, err)
						assert.Equal(t, &expectedItemType, itemType)
					}
				})
			}
		})

		t.Run("returns skypass item type", func(t *testing.T) {
			providers := []proto.PaymentProvider{
				proto.PaymentProvider_GOOGLE_PLAY,
				proto.PaymentProvider_APPLE_APP_STORE,
				proto.PaymentProvider_STRIPE,
				proto.PaymentProvider_SEQUENCE,
			}

			expectedItemType := proto.ItemType_SW_SKYPASS

			for _, provider := range providers {
				t.Run(provider.String(), func(t *testing.T) {
					products := data.ListPaymentProviderProducts(provider, &expectedItemType, proto.ItemType_UNKNOWN)
					require.NotEmpty(t, products)

					for _, product := range products {
						itemType, err := converter.ToItemType(provider, product.Code)
						require.NoError(t, err)
						assert.Equal(t, &expectedItemType, itemType)
					}
				})
			}
		})
	})

	t.Run("to amount", func(t *testing.T) {
		t.Run("returns amount from the product name", func(t *testing.T) {
			amount := converter.ToAmount("conquest_tickets_0002")
			assert.Equal(t, 2, int(amount))
		})

		t.Run("returns 1 when product name does not contain a number", func(t *testing.T) {
			amount := converter.ToAmount("conquest_tickets")
			assert.Equal(t, 1, int(amount))
		})
	})

	t.Run("to price", func(t *testing.T) {
		provider := proto.PaymentProvider_SEQUENCE

		t.Run("fails when product does not exist", func(t *testing.T) {
			price, err := converter.ToPrice(provider, "not_exists", proto.ItemType_USDC)
			require.ErrorContains(t, err, "unsupported")
			assert.Nil(t, price)
		})

		t.Run("returns price", func(t *testing.T) {
			providers := []proto.PaymentProvider{
				proto.PaymentProvider_SEQUENCE,
			}

			itemType := proto.ItemType_SW_SKYPASS

			for _, provider := range providers {
				t.Run(provider.String(), func(t *testing.T) {
					products := data.ListPaymentProviderProducts(provider, &itemType, proto.ItemType_USDC)
					require.NotEmpty(t, products)

					for _, product := range products {
						price, err := converter.ToPrice(provider, product.Code, proto.ItemType_USDC)
						require.NoError(t, err)
						assert.NotNil(t, price)
						assert.Equal(t, product.Price, price)

						// Test the original price cannot be mutated
						price.Add(price, big.NewFloat(1))
						assert.NotEqual(t, product.Price, price)
					}
				})
			}
		})
	})

	t.Run("to product ID", func(t *testing.T) {
		provider := proto.PaymentProvider_GOOGLE_PLAY

		t.Run("fails when product does not exist", func(t *testing.T) {
			itemType := proto.ItemType_SW_HERO
			productID, err := converter.ToProductID(provider, &itemType, 99)
			require.ErrorContains(t, err, "unsupported")
			assert.Empty(t, productID)
		})

		t.Run("returns conquest ticket", func(t *testing.T) {
			providers := []proto.PaymentProvider{
				proto.PaymentProvider_GOOGLE_PLAY,
				proto.PaymentProvider_APPLE_APP_STORE,
				proto.PaymentProvider_STRIPE,
			}

			itemType := proto.ItemType_SW_CONQUEST_TICKET

			for _, provider := range providers {
				t.Run(provider.String(), func(t *testing.T) {
					products := data.ListPaymentProviderProducts(provider, &itemType, proto.ItemType_UNKNOWN)
					require.NotEmpty(t, products)

					for _, product := range products {
						productID, err := converter.ToProductID(provider, product.ItemType, int64(product.Quantity))
						require.NoError(t, err)
						assert.NotEmpty(t, productID)
						assert.Equal(t, product.Code, productID)
					}
				})
			}
		})

		t.Run("returns skypass item type", func(t *testing.T) {
			providers := []proto.PaymentProvider{
				proto.PaymentProvider_GOOGLE_PLAY,
				proto.PaymentProvider_APPLE_APP_STORE,
				proto.PaymentProvider_STRIPE,
				proto.PaymentProvider_SEQUENCE,
			}

			itemType := proto.ItemType_SW_SKYPASS

			for _, provider := range providers {
				t.Run(provider.String(), func(t *testing.T) {
					products := data.ListPaymentProviderProducts(provider, &itemType, proto.ItemType_UNKNOWN)
					require.NotEmpty(t, products)

					for _, product := range products {
						productID, err := converter.ToProductID(provider, product.ItemType, int64(product.Quantity))
						require.NoError(t, err)
						assert.NotEmpty(t, productID)
						assert.Equal(t, product.Code, productID)
					}
				})
			}
		})
	})
}
