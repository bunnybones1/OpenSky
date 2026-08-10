package rpc

import (
	"context"

	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/proto"
	"github.com/horizon-games/OpenSky/api/rpc/rctx"
)

// IAPVerifyGoogleProducts2 is an endpoint to verify a Google Play Store IAP using the new object for more tracking.
// Deprecated: Use VerifyGooglePlayPayment instead.
func (s *Server) IAPVerifyGoogleProducts2(ctx context.Context, req *proto.IAPPurchaseRequest) (*proto.GoogleProductPurchase, error) {
	logger := rctx.Logger(ctx)
	repo := rctx.DBContext(ctx)

	if req.TransactionId == nil {
		return nil, proto.ErrorInvalidArgument("transaction ID", "cannot be nil")
	}

	if req.PurchaseToken == nil {
		return nil, proto.ErrorInvalidArgument("purchase token", "cannot be nil")
	}

	if req.PackageNameAndroid == nil {
		return nil, proto.ErrorInvalidArgument("package name android", "cannot be nil")
	}

	providerResponse := &proto.GooglePlayPaymentResponse{
		ProductId:                  req.ProductId,
		TransactionId:              *req.TransactionId,
		TransactionDate:            req.TransactionDate,
		TransactionReceipt:         req.TransactionReceipt,
		PurchaseToken:              *req.PurchaseToken,
		DataAndroid:                req.DataAndroid,
		SignatureAndroid:           req.SignatureAndroid,
		AutoRenewingAndroid:        req.AutoRenewingAndroid,
		PurchaseStateAndroid:       req.PurchaseStateAndroid,
		IsAcknowledgedAndroid:      req.IsAcknowledgedAndroid,
		PackageNameAndroid:         *req.PackageNameAndroid,
		DeveloperPayloadAndroid:    req.DeveloperPayloadAndroid,
		ObfuscatedAccountIdAndroid: req.ObfuscatedAccountIdAndroid,
		ObfuscatedProfileIdAndroid: req.ObfuscatedProfileIdAndroid,
		Currency:                   req.Currency,
		TotalPrice:                 req.TotalPrice,
	}

	account, err := data.DB.Accounts(repo).FindByAddress(proto.Hash(req.Address))
	if err != nil {
		logger.Err(err).Msgf("find account %s", req.Address)
		return nil, proto.ErrorInternal("find account")
	}

	err = s.PaymentProviderResponseVerifier.VerifyGooglePlayPayment(ctx, account.ID, providerResponse)
	if err != nil {
		logger.Err(err).Msg("verify Google Play payment")

		return nil, proto.ErrorInternal("verify Google Play payment")
	}

	return &proto.GoogleProductPurchase{}, nil
}

// IAPVerifyAppleProducts2 is an endpoint to verify a Google Play Store IAP using the new object for more tracking.
// Deprecated: Use VerifyAppleAppStorePayment instead.
func (s *Server) IAPVerifyAppleProducts2(ctx context.Context, req *proto.IAPPurchaseRequest) (*proto.AppleIAPResponse, error) {
	logger := rctx.Logger(ctx)
	repo := rctx.DBContext(ctx)

	if req.TransactionId == nil {
		return nil, proto.ErrorInvalidArgument("transaction ID", "cannot be nil")
	}

	providerResponse := &proto.AppleAppStorePaymentResponse{
		ProductId:                        req.ProductId,
		TransactionId:                    *req.TransactionId,
		TransactionDate:                  req.TransactionDate,
		TransactionReceipt:               req.TransactionReceipt,
		PurchaseToken:                    req.PurchaseToken,
		QuantityIOS:                      req.QuantityIOS,
		OriginalTransactionDateIOS:       req.OriginalTransactionDateIOS,
		OriginalTransactionIdentifierIOS: req.OriginalTransactionIdentifierIOS,
		Currency:                         req.Currency,
		TotalPrice:                       req.TotalPrice,
	}

	account, err := data.DB.Accounts(repo).FindByAddress(proto.Hash(req.Address))
	if err != nil {
		logger.Err(err).Msgf("find account %s", req.Address)
		return nil, proto.ErrorInternal("find account")
	}

	err = s.PaymentProviderResponseVerifier.VerifyAppleAppStorePayment(ctx, account.ID, providerResponse)
	if err != nil {
		logger.Err(err).Msg("verify Apple App Store payment")

		return nil, proto.ErrorInternal("verify Apple App Store payment")
	}

	return &proto.AppleIAPResponse{}, nil
}
