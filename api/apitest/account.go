//go:build integration

package apitest

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"time"

	"github.com/0xsequence/ethkit/ethcoder"
	"github.com/0xsequence/ethkit/ethwallet"
	"github.com/0xsequence/go-ethauth"
	"github.com/go-chi/jwtauth/v5"
	"github.com/upper/db/v4"

	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/proto"
)

const TestMnemonic = "outdoor sentence roast truly flower surface power begin ocean silent debate funny"

func EthAuthWalletProof(mnemonic string) (string, *ethwallet.Wallet, error) {
	var wallet *ethwallet.Wallet

	var err error

	if mnemonic == "" {
		wallet, err = ethwallet.NewWalletFromRandomEntropy()
	} else {
		wallet, err = ethwallet.NewWalletFromMnemonic(mnemonic)
	}

	if err != nil {
		return "", nil, fmt.Errorf("create wallet: %w", err)
	}

	if apiService == nil {
		return "", nil, fmt.Errorf("apiService is nil")
	}

	ethAuth := apiService.ETHAuth

	claims := ethauth.Claims{
		App:            "OpenSky-Test",
		ETHAuthVersion: ethauth.ETHAuthVersion,
	}
	claims.SetIssuedAtNow()
	claims.SetExpiryIn(10 * time.Minute)

	if err := claims.Valid(); err != nil {
		return "", wallet, fmt.Errorf("claims not valid: %w", err)
	}

	// sign the message sub-digest
	messageDigest, err := claims.MessageDigest()
	if err != nil {
		return "", wallet, fmt.Errorf("message digest: %w", err)
	}

	sig, err := wallet.SignMessage(messageDigest)
	if err != nil {
		return "", wallet, fmt.Errorf("sign message: %w", err)
	}

	sigHex := ethcoder.HexEncode(sig)

	// encode the proof
	proof := ethauth.NewProof()
	proof.Address = wallet.Address().Hex()
	proof.Claims = claims
	proof.Signature = sigHex

	walletAuthProof, err := ethAuth.EncodeProof(proof)
	if err != nil {
		return "", wallet, fmt.Errorf("encode proof: %w", err)
	}

	return walletAuthProof, wallet, nil
}

func AuthHeaderContext(jwtToken string) context.Context {
	ctx := context.Background()
	headers := http.Header{}
	headers.Set("Authorization", fmt.Sprintf("BEARER %s", jwtToken))

	ctx, err := proto.WithHTTPRequestHeaders(ctx, headers)
	if err != nil {
		panic(err.Error())
	}

	return ctx
}

func CreateRandomAccount(name string) (proto.AccountID, proto.Hash, error) {
	account := &data.Account{
		Account: &proto.Account{
			Address: RandomAddress(),
			Name:    name,
		},
	}

	return account.ID, account.Address, CreateAccount(account)
}

func CreateRandomAdminAccount(name string) (proto.AccountID, error) {
	account := &data.Account{
		Account: &proto.Account{
			Address: RandomAddress(),
			Name:    name,
			Admin:   true,
		},
	}

	return account.ID, CreateAccount(account)
}

func CreateRandomAccountWithStatus(name string, status proto.AccountStatus) (proto.AccountID, error) {
	account := &data.Account{
		Account: &proto.Account{
			Address: RandomAddress(),
			Name:    name,
			Status:  status,
		},
	}

	return account.ID, CreateAccount(account)
}

func CreateAccount(account *data.Account) error {
	if err := data.DB.Save(account); err != nil {
		return fmt.Errorf("save account: %w", err)
	}

	ctx, _ := context.WithTimeout(context.Background(), time.Minute)
	ticker := time.NewTicker(10 * time.Microsecond)

	for {
		select {
		case <-ctx.Done():
			return fmt.Errorf("account %q has not been created", account.Name)
		case <-ticker.C:
			acc, err := data.DB.Accounts().FindOne(db.Cond{"address": account.Address})
			if err != nil && !errors.Is(err, db.ErrNoMoreRows) {
				return fmt.Errorf("find account: %w", err)
			}

			if acc != nil {
				account.ID = acc.ID

				return nil
			}
		}
	}
}

// AccountContext creates an authenticated request context for a client
func AccountContext(accountID proto.AccountID) context.Context {
	account, _ := data.DB.Accounts().FindByID(accountID)
	return authTokenContext(map[string]interface{}{"account": account.Address.String()})
}

func AccountContextFromAddress(address proto.Hash) context.Context {
	return authTokenContext(map[string]interface{}{"account": address.String()})
}

func ServiceContext() context.Context {
	return authTokenContext(map[string]interface{}{"service": "x"})
}

func authTokenContext(claims map[string]interface{}) context.Context {
	jwtauth.SetExpiryIn(claims, time.Hour)

	_, tokenString, err := apiService.JWTAuth.Encode(claims)
	if err != nil {
		panic(err.Error())
	}

	return AuthHeaderContext(tokenString)
}
