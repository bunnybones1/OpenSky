package contracts_test

import (
	"fmt"
	"math/big"
	"strings"
	"testing"

	"github.com/0xsequence/ethkit/go-ethereum/accounts/abi"
	"github.com/0xsequence/ethkit/go-ethereum/common"
	"github.com/0xsequence/ethkit/go-ethereum/common/hexutil"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/horizon-games/OpenSky/api/apitest"
	"github.com/horizon-games/OpenSky/api/lib/contracts"
	"github.com/horizon-games/OpenSky/api/lib/contracts/abis"
)

func TestERC1155(t *testing.T) {
	contractArtifact := abis.OpenSkyAssets
	contractAddress := apitest.RandomAddress()

	contract, err := contracts.NewERC1155(contractArtifact, contractAddress.String())
	require.NoError(t, err)

	t.Run("address", func(t *testing.T) {
		assert.Equal(t, contractAddress, contract.Address())
	})

	t.Run("compose safe batch transfer from", func(t *testing.T) {
		from := apitest.RandomAddress()
		to := apitest.RandomAddress()
		tokens := map[uint64]uint64{
			1: 10,
			2: 20,
		}

		data := erc1155DataExample{To: common.HexToAddress(apitest.RandomAddress().String())}

		encodedData, err := encodeERC1155ExampleData(data)
		require.NoError(t, err)

		transaction, err := contract.ComposeSafeBatchTransferFrom(from, to, tokens, encodedData)
		require.NoError(t, err)

		assert.Equal(t, contractAddress.String(), strings.ToLower(transaction.To))

		transactionData, err := hexutil.Decode(transaction.Data)
		require.NoError(t, err)
		methodArguments := make(map[string]any)
		err = contractArtifact.ABI.Methods["safeBatchTransferFrom"].Inputs.UnpackIntoMap(methodArguments, transactionData[4:])
		require.NoError(t, err)

		assert.Equal(t, from.String(), strings.ToLower(methodArguments["_from"].(common.Address).String()))
		assert.Equal(t, to.String(), strings.ToLower(methodArguments["_to"].(common.Address).String()))

		_ids := methodArguments["_ids"].([]*big.Int)
		assert.Len(t, _ids, len(tokens))

		_amounts := methodArguments["_amounts"].([]*big.Int)

		for tokenID, tokenAmount := range tokens {
			var exists bool

			for i, id := range _ids {
				if tokenID == id.Uint64() {
					exists = true

					assert.Equal(t, int(tokenAmount*100), int(_amounts[i].Int64()))
				}
			}

			assert.True(t, exists)
		}

		dataResult, err := decodeERC1155ExampleData(methodArguments["_data"])
		require.NoError(t, err)
		assert.Equal(t, data, dataResult)
	})
}

var erc1155DataExampleComponents = []abi.ArgumentMarshaling{
	{
		Name: "to",
		Type: "address",
	},
}

type erc1155DataExample struct {
	To common.Address `abi:"to"`
}

type erc1155DataWrapper struct {
	Data erc1155DataExample
}

func encodeERC1155ExampleData(input erc1155DataExample) ([]byte, error) {
	abiObject, err := getERC1155DataAbi()
	if err != nil {
		return nil, fmt.Errorf("get abi bject: %w", err)
	}

	packed, err := abiObject.Pack(input)
	if err != nil {
		return nil, fmt.Errorf("pack input: %w", err)
	}

	return packed, nil
}

func decodeERC1155ExampleData(input any) (erc1155DataExample, error) {
	abiObject, err := getERC1155DataAbi()
	if err != nil {
		return erc1155DataExample{}, fmt.Errorf("get abi bject: %w", err)
	}

	unpacked, err := abiObject.Unpack(input.([]byte))
	if err != nil {
		return erc1155DataExample{}, fmt.Errorf("unpack input: %w", err)
	}

	var dataWrapper erc1155DataWrapper

	err = abiObject.Copy(&dataWrapper, unpacked)
	if err != nil {
		return erc1155DataExample{}, fmt.Errorf("copy unpacked to an object: %w", err)
	}

	return dataWrapper.Data, nil
}

func getERC1155DataAbi() (abi.Arguments, error) {
	tuple, err := abi.NewType("tuple", "", erc1155DataExampleComponents)
	if err != nil {
		return nil, fmt.Errorf("create tuple: %w", err)
	}

	return abi.Arguments{{Type: tuple}}, nil
}
