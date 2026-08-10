package config

import (
	"github.com/0xsequence/ethkit/ethrpc"
	"github.com/0xsequence/ethkit/ethwallet"
	"github.com/0xsequence/go-sequence"
	v1 "github.com/0xsequence/go-sequence/core/v1"
)

func InstantiateWallet(config WalletConfig, provider *ethrpc.Provider, relayer sequence.Relayer) (*sequence.Wallet[*v1.WalletConfig], error) {
	ownerWallet, err := ethwallet.NewWalletFromMnemonic(config.PrivateMnemonic)
	if err != nil {
		return nil, err
	}
	if config.DerivationPath != "" {
		_, err = ownerWallet.SelfDerivePathFromString(config.DerivationPath)
		if err != nil {
			return nil, err
		}
	}
	if config.AccountIndex > 0 {
		_, err = ownerWallet.SelfDeriveAccountIndex(config.AccountIndex)
		if err != nil {
			return nil, err
		}
	}

	// Sequence wallet based on owner private key above
	//nolint:staticcheck // Ignore deprecated warning, we will continue using v1 wallet until a refactor.
	wallet, err := sequence.V1NewWalletSingleOwner(ownerWallet)
	if err != nil {
		return nil, err
	}

	// Set provider on sequence wallet
	err = wallet.SetProvider(provider)
	if err != nil {
		return nil, err
	}

	// Set relayer on sequence wallet, which is used when the wallet sends transactions
	err = wallet.SetRelayer(relayer)
	if err != nil {
		return nil, err
	}

	return wallet, nil
}
