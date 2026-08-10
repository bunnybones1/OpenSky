package data

import (
	"math/big"
	"strconv"
	"strings"

	"github.com/horizon-games/OpenSky/api/proto"
)

var (
	skypassPriceUSD        = big.NewFloat(14.95)
	skypassPriceSilver     = big.NewFloat(15)
	conquestTicketPriceUSD = big.NewFloat(1.5)
)

type PaymentProviderProduct struct {
	*proto.PaymentProviderProduct

	Price *big.Float
}

var paymentProviderProducts = map[proto.PaymentProvider]map[proto.ItemType]map[string]productPrices{
	proto.PaymentProvider_GOOGLE_PLAY: {
		proto.ItemType_SW_CONQUEST_TICKET: {
			"conquest_tickets_0002": nil, // 2x conquest ticket
			"conquest_tickets_0005": nil, // 5x conquest ticket
			"conquest_tickets_0009": nil, // 9x conquest ticket
			"conquest_tickets_0014": nil, // 14x conquest ticket
			"conquest_tickets_0024": nil, // 24x conquest ticket
		},
		proto.ItemType_SW_SKYPASS: {
			"skypass_0001": nil, // 1x skypass
		},
	},
	proto.PaymentProvider_APPLE_APP_STORE: {
		proto.ItemType_SW_CONQUEST_TICKET: {
			"conquest_tickets_0002": nil, // 2x conquest ticket
			"conquest_tickets_0005": nil, // 5x conquest ticket
			"conquest_tickets_0009": nil, // 9x conquest ticket
			"conquest_tickets_0014": nil, // 14x conquest ticket
			"conquest_tickets_0024": nil, // 24x conquest ticket
		},
		proto.ItemType_SW_SKYPASS: {
			"skypass_0001": nil, // 1x skypass
		},
	},
	proto.PaymentProvider_STRIPE: {
		proto.ItemType_SW_CONQUEST_TICKET: {
			"conquest_tickets_0001": nil, // 1x conquest ticket
		},
		proto.ItemType_SW_SKYPASS: {
			"skypass_0001": nil, // 1x skypass
		},
	},
	proto.PaymentProvider_SEQUENCE: {
		proto.ItemType_SW_CONQUEST_TICKET: {
			"conquest_tickets_0001": productPrices{
				proto.ItemType_USDC:            conquestTicketPriceUSD,
				proto.ItemType_SW_SILVER_CARDS: big.NewFloat(1),
			}, // 1x conquest ticket
		},
		proto.ItemType_SW_SKYPASS: {
			"skypass_0001": productPrices{
				proto.ItemType_USDC:            skypassPriceUSD,
				proto.ItemType_SW_SILVER_CARDS: skypassPriceSilver,
			}, // 1x skypass
		},
	},
	proto.PaymentProvider_SAMSUNG_GALAXY_STORE: {
		proto.ItemType_SW_CONQUEST_TICKET: {
			"conquest_tickets_0002": nil, // 2x conquest ticket
			"conquest_tickets_0005": nil, // 5x conquest ticket
			"conquest_tickets_0009": nil, // 9x conquest ticket
			"conquest_tickets_0014": nil, // 14x conquest ticket
			"conquest_tickets_0024": nil, // 24x conquest ticket
		},
		proto.ItemType_SW_SKYPASS: {
			"skypass_0001": nil, // 1x skypass
		},
	},
}

type productPrices map[proto.ItemType]*big.Float

func ListPaymentProviderProducts(provider proto.PaymentProvider, itemType *proto.ItemType, priceItemType proto.ItemType) (products []*PaymentProviderProduct) {
	if _, ok := paymentProviderProducts[provider]; !ok {
		return nil
	}

	productsByProvider := paymentProviderProducts[provider]

	if itemType != nil {
		for productCode, productPrice := range productsByProvider[*itemType] {
			var price *big.Float

			if productPrice != nil && productPrice[priceItemType] != nil {
				price = big.NewFloat(0).Copy(productPrice[priceItemType])
			}

			products = append(products, &PaymentProviderProduct{
				PaymentProviderProduct: &proto.PaymentProviderProduct{
					Provider: &provider,
					ItemType: itemType,
					Code:     productCode,
					Quantity: productCodeToQuantity(productCode),
				},
				Price: price,
			})
		}

		return products
	}

	for itemType, productsByItemType := range productsByProvider {
		for productCode, productPrice := range productsByItemType {
			it := itemType

			var price *big.Float

			if productPrice != nil && productPrice[priceItemType] != nil {
				price = big.NewFloat(0).Copy(productPrice[priceItemType])
			}

			products = append(products, &PaymentProviderProduct{
				PaymentProviderProduct: &proto.PaymentProviderProduct{
					Provider: &provider,
					ItemType: &it,
					Code:     productCode,
					Quantity: productCodeToQuantity(productCode),
				},
				Price: price,
			})
		}
	}

	return products
}

func productCodeToQuantity(code string) uint16 {
	index := strings.LastIndex(code, "_")
	if index == -1 {
		return 1
	}

	quantity, err := strconv.Atoi(code[index+1:])
	if err != nil {
		return 1
	}

	return uint16(quantity)
}
