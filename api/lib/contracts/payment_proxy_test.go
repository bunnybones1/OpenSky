package contracts_test

import (
	"math/big"
	"strings"
	"testing"

	"github.com/0xsequence/ethkit/go-ethereum/common"
	"github.com/0xsequence/ethkit/go-ethereum/common/hexutil"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/horizon-games/OpenSky/api/apitest"
	"github.com/horizon-games/OpenSky/api/lib/contracts"
	"github.com/horizon-games/OpenSky/api/lib/contracts/abis"
)

func TestPaymentProxy(t *testing.T) {
	contractArtifact := abis.PaymentProxyFactory
	contractAddress := apitest.RandomAddress()

	contract, err := contracts.NewPaymentProxy(contractArtifact, contractAddress.String(), nil)
	require.NoError(t, err)

	t.Run("address", func(t *testing.T) {
		assert.Equal(t, contractAddress, contract.Address())
	})

	t.Run("compose purchase items", func(t *testing.T) {
		currencyAddress := apitest.RandomAddress()
		currencyAmount := big.NewInt(10)
		nonce := big.NewInt(2)
		itemIDsPurchased := []uint64{101, 102}
		recipient := apitest.RandomAddress()

		transaction, err := contract.ComposePurchaseItems(currencyAddress, currencyAmount, nonce, itemIDsPurchased, recipient)
		require.NoError(t, err)

		assert.Equal(t, contractAddress.String(), strings.ToLower(transaction.To))

		transactionData, err := hexutil.Decode(transaction.Data)
		require.NoError(t, err)
		methodArguments := make(map[string]any)
		err = contractArtifact.ABI.Methods["purchaseItems"].Inputs.UnpackIntoMap(methodArguments, transactionData[4:])
		require.NoError(t, err)

		assert.Equal(t, currencyAddress.String(), strings.ToLower(methodArguments["_currencyToken"].(common.Address).String()))
		assert.Equal(t, currencyAmount, methodArguments["_currencyAmount"].(*big.Int))
		assert.Equal(t, uint32(nonce.Uint64()), methodArguments["_nonce"].(uint32))

		_itemIDsPurchased := methodArguments["_itemIDsPurchased"].([]*big.Int)
		assert.Len(t, _itemIDsPurchased, len(itemIDsPurchased))
		for i, itemID := range itemIDsPurchased {
			assert.Equal(t, int64(itemID), _itemIDsPurchased[i].Int64())
		}

		assert.Equal(t, recipient.String(), strings.ToLower(methodArguments["_itemRecipient"].(common.Address).String()))
	})

	t.Run("encode and decode burn order data", func(t *testing.T) {
		itemRecipient := apitest.RandomAddress()
		nonce := big.NewInt(10)
		itemIDsPurchased := []uint64{101, 102}

		data, err := contract.EncodeBurnOrderData(itemRecipient, nonce, itemIDsPurchased)
		require.NoError(t, err)

		paymentProxyBurnOrderData, err := contract.DecodeBurnOrderData(data)
		require.NoError(t, err)

		assert.Equal(t, itemRecipient.String(), strings.ToLower(paymentProxyBurnOrderData.ItemRecipient.String()))
		assert.Equal(t, nonce, paymentProxyBurnOrderData.Nonce)

		assert.Len(t, paymentProxyBurnOrderData.ItemIDsPurchased, len(itemIDsPurchased))
		for _, itemID := range itemIDsPurchased {
			var found bool

			for _, itemIDPurchased := range paymentProxyBurnOrderData.ItemIDsPurchased {
				if itemID == itemIDPurchased.Uint64() {
					found = true
					break
				}
			}

			assert.True(t, found)
		}
	})
}
