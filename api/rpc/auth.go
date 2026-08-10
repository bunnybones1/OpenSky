package rpc

import (
	"context"
	"net/http"
	"strings"
	"time"

	"github.com/horizon-games/OpenSky/api/proto"
	"github.com/horizon-games/OpenSky/api/rpc/rctx"
)

func (s *Server) GetAuthToken(ctx context.Context, ethAuthProofString string) (bool, string, string, *proto.Account, error) {
	repo := rctx.DBContext(ctx)

	// decode and validate the ethauth proof string
	valid, proof, err := s.ETHAuth.DecodeProof(ethAuthProofString)
	if err != nil {
		return false, "", "", nil, proto.WrapError(proto.ErrPermissionDenied, err, "failed to decode ethauth proof")
	}

	if !valid || proof == nil {
		return false, "", "", nil, proto.Errorf(proto.ErrPermissionDenied, "invalid ethauth proof")
	}

	// Validate the origin in the proof claims against the http request origin header
	if proof.Claims.Origin != "" {
		httpReq, _ := ctx.Value(proto.HTTPRequestCtxKey).(*http.Request)
		if httpReq.Header.Get("Origin") != proof.Claims.Origin {
			return false, "", "", nil, proto.Errorf(proto.ErrInvalidArgument, "ethauth proof origin does not match the http request")
		}
	}

	// Encode the jwt claims
	// valid! let's generate a jwt token from the claims
	jwtClaims := map[string]interface{}{
		"account": strings.ToLower(proof.Address),
		"iat":     time.Now().Unix(),
		"exp":     proof.Claims.ExpiresAt,
		"app":     proof.Claims.App,
	}

	// TODO: enforce origin list, https://beta.skyweaver.net, stg.skyweaver.net, dev.skyweaver.net, and
	// if in dev-mode (local) we can add localhost:xxxx to the list too

	if proof.Claims.IssuedAt != 0 {
		jwtClaims["iat"] = proof.Claims.IssuedAt
	}

	if proof.Claims.Origin != "" {
		jwtClaims["ogn"] = proof.Claims.Origin
	}

	_, jwtString, err := s.JWTAuth.Encode(jwtClaims)
	if err != nil {
		return false, "", "", nil, proto.Errorf(proto.ErrPermissionDenied, "unable to create jwt")
	}

	// Find and return account (if we have it)
	var respAccount *proto.Account

	account, _ := repo.Accounts().FindByAddress(proto.HashFromString(proof.Address))
	if account != nil {
		respAccount = account.Account
	}

	return true, jwtString, proof.Address, respAccount, nil
}

func (s *Server) GetSession(ctx context.Context) (string, *proto.Account, error) {
	walletAddress := rctx.WalletAddress(ctx)
	repo := rctx.DBContext(ctx)

	var respAccount *proto.Account

	account, _ := repo.Accounts().FindByAddress(proto.HashFromString(walletAddress))
	if account != nil {
		var err error

		respAccount, err = s.getAccount(ctx, account, &account.ID)
		if err != nil {
			return walletAddress, nil, proto.WrapError(proto.ErrInternal, err, "failed get account")
		}
	}

	return walletAddress, respAccount, nil
}

// TODO: DEPRECATE
func (s *Server) SignIn(_ context.Context, _ *proto.SignInRequest) (*proto.SignInResponse, error) {
	return nil, proto.ErrorInternal("deprecated method, use GetAuthToken + RegisterAccount")
	// oplog := rctx.Logger(ctx)
	// proof := req.Proof

	// // Prove address ownership
	// valid, _ := ethwallet.ValidateEthereumSignature(proof.Address, []byte(proof.Message), proof.Signature)
	// if !valid {
	// 	// Note: we respond with a 403/unauthorized, and offer very littler information
	// 	// on purpose for security reasons.
	// 	oplog.Warn().Msgf("bad proof for %s", proof.Address)
	// 	return nil, proto.Errorf(proto.ErrPermissionDenied, "bad proof")
	// }

	// accountAddress := proto.HashFromString(proof.Address)

	// // Find account
	// account, _ := repo.Accounts().FindByAccountID(accountAddress)

	// // Stop here, no account and sign-in req didn't provide new cred info
	// if account == nil && req.Account == nil {
	// 	oplog.Info().Msgf("cannot signin the user, as they haven't registered an account yet")
	// 	return nil, proto.ErrorInvalidArgument("account", "must provide new account details")
	// }

	// // Create new account if needed
	// if account == nil {
	// 	account = &data.Account{Account: &proto.Account{}}

	// 	// Set account request data if provided
	// 	if req.Account != nil {
	// 		account.Name = req.Account.Name
	// 		account.Locale = req.Account.Locale
	// 		account.TagArtID = req.Account.TagArtID
	// 		account.Region = req.Account.Region
	// 		account.Settings = data.DefaultAccountSettings()
	// 	}

	// 	// security: ensure correct address based on whats proven
	// 	account.Account.Address = accountAddress

	// 	if err := repo.Accounts().Create(account); err != nil {
	// 		oplog.Warn().Msgf("could not create account, db err %v", err)
	// 		return nil, proto.WrapError(proto.ErrInternal, err, "could not create account")
	// 	}
	// }

	// // NOTE: we do not update an account on sign-in

	// // generate jwt authorization token
	// jwtTokenString, err := s.createJWT(strings.ToLower(proof.Address))
	// if err != nil {
	// 	oplog.Warn().Msgf("could not generate jwt token, err %v", err)
	// 	return nil, proto.ErrorInternal("could not generate token")
	// }

	// oplog.Info().Msgf("successfully signed in address %v", accountAddress)

	// return &proto.SignInResponse{
	// 	Authorization: &proto.Authorization{
	// 		JWT: jwtTokenString,
	// 	},
	// 	Account: account.Account,
	// }, nil
}
