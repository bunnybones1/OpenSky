package accounts

import (
	"context"
	"fmt"
	"math/big"

	"github.com/0xsequence/go-sequence/lib/prototyp"
	"github.com/upper/db/v4"

	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/proto"
)

type AssetTransferer struct {
	contractUSDC          ContractUSDC
	contractOpenSkyAssets ContractOpenSkyAssets
}

func NewAssetTransferer(
	contractUSDC ContractUSDC,
	contractOpenSkyAssets ContractOpenSkyAssets,
) *AssetTransferer {
	return &AssetTransferer{
		contractUSDC:          contractUSDC,
		contractOpenSkyAssets: contractOpenSkyAssets,
	}
}

func (t *AssetTransferer) ComposeTransactionToTransferFromBurner(ctx context.Context, accountID proto.AccountID) ([]*proto.OnChainTransaction, error) {
	var transactions []*proto.OnChainTransaction

	err := data.DB.TxContext(ctx, func(sess db.Session) error {
		account, err := data.DB.Accounts(sess).FindByID(accountID)
		if err != nil {
			return fmt.Errorf("find account %d: %w", accountID, err)
		}

		if !account.WasBurner() {
			return fmt.Errorf("account was not a burner")
		}

		if account.PrivateSettings == nil || account.PrivateSettings.BurnerAddress == nil || !account.PrivateSettings.BurnerAddress.IsValidAddress() {
			return nil
		}

		fromAddress := *account.PrivateSettings.BurnerAddress
		toAddress := account.Address

		currencyBalance, err := t.contractUSDC.CallBalanceOf(ctx, fromAddress)
		if err != nil {
			return fmt.Errorf("get currency balance for %s: %w", fromAddress, err)
		}

		if currencyBalance.Int64() > 0 {
			transferCurrencyTransaction, err := t.contractUSDC.ComposeTransfer(toAddress, currencyBalance)
			if err != nil {
				return fmt.Errorf("compose usdc transfer transaction: %w", err)
			}

			transactions = append(transactions, transferCurrencyTransaction)
		}

		var items []*data.Item

		err = data.DB.Items(sess).Find(db.Cond{
			"account_address":  fromAddress,
			"contract_address": t.contractOpenSkyAssets.Address(),
			"balance":          db.Gt(0),
		}).All(&items)
		if err != nil {
			return fmt.Errorf("find items: %w", err)
		}

		tokens := make(map[uint64]uint64)

		for _, item := range items {
			if item.Balance.Uint64() == 0 {
				continue
			}

			id := data.ItemTypeAndID2SWTokenID(item.ItemType, item.TokenID)

			tokens[id] = item.Balance.Uint64()
		}

		if len(tokens) > 0 {
			transferAssetsTransaction, err := t.contractOpenSkyAssets.ComposeSafeBatchTransferFrom(fromAddress, toAddress, tokens, nil)
			if err != nil {
				return fmt.Errorf("compose transfer assets transaction: %w", err)
			}

			transactions = append(transactions, transferAssetsTransaction)
		}

		return nil
	}, nil)
	if err != nil {
		return nil, err
	}

	return transactions, nil
}

//go:generate go run go.uber.org/mock/mockgen -destination ./mock/contract_balance_getter.go -package mock . ContractBalanceGetter
type ContractBalanceGetter interface {
	GetCurrencyBalance(ctx context.Context, accountAddress proto.Hash) (prototyp.BigInt, error)
}

//go:generate go run go.uber.org/mock/mockgen -destination ./mock/contract_usdc.go -package mock . ContractUSDC
type ContractUSDC interface {
	CallBalanceOf(ctx context.Context, owner proto.Hash) (*big.Int, error)
	ComposeTransfer(to proto.Hash, value *big.Int) (*proto.OnChainTransaction, error)
}

//go:generate go run go.uber.org/mock/mockgen -destination ./mock/contract_opensky_assets.go -package mock . ContractOpenSkyAssets
type ContractOpenSkyAssets interface {
	Address() proto.Hash
	ComposeSafeBatchTransferFrom(from, to proto.Hash, tokens map[uint64]uint64, data []byte) (*proto.OnChainTransaction, error)
}
