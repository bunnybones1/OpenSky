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

func TestERC20(t *testing.T) {
	contractArtifact := abis.USDCRewardFactory
	contractAddress := apitest.RandomAddress()

	contract, err := contracts.NewERC20(contractArtifact, contractAddress.String(), nil)
	require.NoError(t, err)

	t.Run("address", func(t *testing.T) {
		assert.Equal(t, contractAddress, contract.Address())
	})

	t.Run("compose approve", func(t *testing.T) {
		spender := apitest.RandomAddress()
		value := big.NewInt(10)

		transaction, err := contract.ComposeApprove(spender, value)
		require.NoError(t, err)
		require.NotNil(t, transaction)

		assert.Equal(t, contractAddress.String(), strings.ToLower(transaction.To))

		transactionData, err := hexutil.Decode(transaction.Data)
		require.NoError(t, err)
		methodArguments := make(map[string]any)
		err = contractArtifact.ABI.Methods["approve"].Inputs.UnpackIntoMap(methodArguments, transactionData[4:])
		require.NoError(t, err)

		assert.Equal(t, spender.String(), strings.ToLower(methodArguments["_spender"].(common.Address).String()))
		assert.Equal(t, value, methodArguments["_value"].(*big.Int))
	})

	t.Run("compose transfer", func(t *testing.T) {
		to := apitest.RandomAddress()
		value := big.NewInt(10)

		transaction, err := contract.ComposeTransfer(to, value)
		require.NoError(t, err)
		require.NotNil(t, transaction)

		assert.Equal(t, contractAddress.String(), strings.ToLower(transaction.To))

		transactionData, err := hexutil.Decode(transaction.Data)
		require.NoError(t, err)
		methodArguments := make(map[string]any)
		err = contractArtifact.ABI.Methods["transfer"].Inputs.UnpackIntoMap(methodArguments, transactionData[4:])
		require.NoError(t, err)

		assert.Equal(t, to.String(), strings.ToLower(methodArguments["_to"].(common.Address).String()))
		assert.Equal(t, value, methodArguments["_value"].(*big.Int))
	})
}
