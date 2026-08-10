package payments

import (
	"fmt"
	"math/big"
	"strconv"
	"strings"

	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/proto"
)

// ProductConverter converts a provider product code.
//
//go:generate go run go.uber.org/mock/mockgen -destination ./mock/product_converter.go -package mock . ProductConverter
type ProductConverter interface {
	ToItemType(provider proto.PaymentProvider, targetProduct string) (*proto.ItemType, error)
	ToAmount(targetProduct string) int64
	ToPrice(provider proto.PaymentProvider, targetProduct string, priceItemType proto.ItemType) (*big.Float, error)
	ToProductID(provider proto.PaymentProvider, itemType *proto.ItemType, amount int64) (string, error)
}

type ProviderProductConverter struct {
}

func NewProviderProductConverter() *ProviderProductConverter {
	return &ProviderProductConverter{}
}

func (c *ProviderProductConverter) ToItemType(provider proto.PaymentProvider, targetProduct string) (*proto.ItemType, error) {
	products := data.ListPaymentProviderProducts(provider, nil, proto.ItemType_UNKNOWN)

	for _, product := range products {
		if product.Code == targetProduct {
			return product.ItemType, nil
		}
	}

	return nil, fmt.Errorf("unsupported product to purchase: provider %s, product :%s", provider, targetProduct)
}

// ToAmount parses the product name to retrieve the amount.
// If the amount is not there, it assumes the amount to be 1.
func (c *ProviderProductConverter) ToAmount(targetProduct string) int64 {
	index := strings.LastIndex(targetProduct, "_")
	if index == -1 {
		return 1
	}

	amount, err := strconv.Atoi(targetProduct[index+1:])
	if err != nil {
		return 1
	}

	return int64(amount)
}

func (c *ProviderProductConverter) ToPrice(provider proto.PaymentProvider, targetProduct string, priceItemType proto.ItemType) (*big.Float, error) {
	products := data.ListPaymentProviderProducts(provider, nil, priceItemType)
	for _, product := range products {
		if product.Code == targetProduct {
			return product.Price, nil
		}
	}

	return nil, fmt.Errorf("unsupported product to purchase: provider %s, product :%s", provider, targetProduct)
}

func (c *ProviderProductConverter) ToProductID(provider proto.PaymentProvider, itemType *proto.ItemType, amount int64) (string, error) {
	products := data.ListPaymentProviderProducts(provider, itemType, proto.ItemType_UNKNOWN)

	for _, product := range products {
		if product.Quantity == uint16(amount) {
			return product.Code, nil
		}
	}

	return "", fmt.Errorf("unsupported product to purchase: provider %s, item type %s, amount %d", provider, itemType, amount)
}
