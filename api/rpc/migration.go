package rpc

import (
	"context"
	"strings"

	"github.com/0xsequence/ethkit/ethwallet"
	db "github.com/upper/db/v4"

	"github.com/horizon-games/OpenSky/api/proto"
	"github.com/horizon-games/OpenSky/api/rpc/rctx"
)

const migrationProofMessage = "Migrating OpenSky account to Sequence wallet"

func (s *Server) MigrateAccount(ctx context.Context, req *proto.MigrateAccountRequest) (bool, error) {
	oplog := rctx.Logger(ctx)
	repo := rctx.DBContext(ctx)

	// check message
	if req.Proof.Message != migrationProofMessage {
		oplog.Warn().Msgf("proof for invalid message for %s", req.Proof.Address)
		return false, proto.Errorf(proto.ErrPermissionDenied, "invalid proof message")
	}

	if req.AccountName != nil && *req.AccountName != "" {
		account, err := repo.Accounts().FindByName(*req.AccountName)
		if err == db.ErrNoMoreRows {
			return false, proto.ErrorNotFound("no account matching '%s' username", *req.AccountName)
		}

		if err != nil {
			return false, proto.ErrorInternal("failed to fetch account to migrate with %v", err)
		}

		if account.Address != proto.Hash(strings.ToLower(req.Proof.Address)) {
			return false, proto.ErrorInvalidArgument("accountName", "doesn't match signed message address")
		}
	}

	// Prove address ownership
	valid, _ := ethwallet.ValidateEthereumSignature(req.Proof.Address, []byte(req.Proof.Message), req.Proof.Signature)
	if !valid {
		// Note: we respond with a 403/unauthorized, and offer very littler information
		// on purpose for security reasons.
		oplog.Warn().Msgf("bad proof for %s", req.Proof.Address)
		return false, proto.Errorf(proto.ErrPermissionDenied, "bad proof")
	}

	accountAddress := proto.HashFromString(req.Proof.Address)
	walletAddress := proto.HashFromString(rctx.WalletAddress(ctx))

	err := repo.TxContext(ctx, func(tx db.Session) error {
		// defer foreign key constraint checks until commit
		_, err := tx.SQL().Exec("SET CONSTRAINTS ALL DEFERRED")
		if err != nil {
			return err
		}

		if err = repo.Accounts(tx).Find(db.Cond{"address": accountAddress}).Update(db.Cond{"address": walletAddress}); err != nil {
			return err
		}

		return nil
	}, nil)
	if err != nil {
		return false, proto.ErrorInternal("migration failed with %v", err)
	}

	return true, nil
}
