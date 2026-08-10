package rpc

import (
	"context"
	"errors"
	"time"

	"github.com/go-chi/jwtauth/v5"
	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/proto"
	"github.com/horizon-games/OpenSky/api/rpc/rctx"
	"github.com/upper/db/v4"
)

func (s *Server) GMCreateAppDevKey(ctx context.Context, req *proto.CreateAppDevKeyRequest) (*proto.AppDevKey, error) {
	logger := rctx.Logger(ctx)

	gmAccount, ok := rctx.CurrentAccount(ctx)
	if !ok {
		logger.Error().Msg("missing admin account")
		return nil, proto.ErrorInvalidArgument("session", "missing admin account")
	}

	repo := rctx.DBContext(ctx)

	if req == nil {
		logger.Error().Msg("missing request")
		return nil, proto.ErrorRequiredArgument("req")
	}

	randomKey, err := data.GenerateRandomAppKey()
	if err != nil {
		logger.Err(err).Msg("generate random key")
		return nil, proto.ErrorInternal("generate app key")
	}

	appDevKey := data.AppDevKey{
		AppDevKey: &proto.AppDevKey{
			AppKey:    randomKey,
			Name:      req.Name,
			Email:     req.Email,
			Disabled:  false,
			CreatedBy: &gmAccount.ID,
		},
	}

	exists, err := repo.AppDevKeys().Find(db.And(
		db.Cond{"disabled": false},
		db.Or(
			db.Cond{"name": req.Name},
			db.Cond{"email": req.Email},
		),
	)).Exists()
	if err != nil {
		logger.Err(err).Msg("check if the dev key exists")
		return nil, proto.WrapError(proto.ErrInternal, err, "check for existent dev keys")
	}
	if exists {
		logger.Warn().Msgf("another app dev key with the same name (%q) already exists", req.Name)
		return nil, proto.ErrorInvalidArgument("name", "another app dev key with the same name already exists")
	}

	err = repo.Save(&appDevKey)
	if err != nil {
		logger.Err(err).Msg("create app dev key")
		return nil, proto.WrapFailf(err, "create failed")
	}

	return appDevKey.AppDevKey, nil
}

func (s *Server) GMGetAppDevKeyToken(ctx context.Context, appDevKeyId uint64) (*proto.AppDevKey, string, error) {
	logger := rctx.Logger(ctx)

	repo := rctx.DBContext(ctx)

	appDevKey, err := repo.AppDevKeys().FindByID(appDevKeyId)
	if err != nil {
		logger.Err(err).Msg("find app dev key")
		return nil, "", err
	}

	if appDevKey.Disabled {
		return nil, "", errors.New("key is disabled")
	}

	claims := map[string]interface{}{
		"app": appDevKey.AppDevKey,
		"iat": appDevKey.CreatedAt.Unix(),
	}
	jwtauth.SetExpiryIn(claims, 365*24*time.Hour)

	_, tokenString, err := s.JWTAuth.Encode(claims)
	if err != nil {
		logger.Err(err).Msg("failed to generate JWT")
		return nil, "", proto.Failf("failed to encode jwt token")
	}

	return appDevKey.AppDevKey, tokenString, nil
}

func (s *Server) GMListAppDevKeys(ctx context.Context, page *proto.Page) (*proto.Page, []*proto.AppDevKey, error) {
	results := []*proto.AppDevKey{}
	repo := rctx.DBContext(ctx)
	logger := rctx.Logger(ctx)

	q := repo.AppDevKeys().Find()

	cursorKey := &proto.SortBy{
		Column: "id",
		Order:  &sortOrder_ASC,
	}
	orderByName := &proto.SortBy{
		Column: "name",
		Order:  &sortOrder_ASC,
	}

	paginator, err := NewPaginator(page, cursorKey, orderByName)
	if err != nil {
		logger.Err(err).Msg("invalid page settings")
		return nil, nil, proto.WrapError(proto.ErrInternal, err, "invalid page settings")
	}

	if err := paginator.Source(q).Get(ctx, &results); err != nil {
		logger.Err(err).Msg("failed to retrieve results")
		return nil, nil, proto.WrapFailf(err, "failed to retrieve results")
	}

	return paginator.Page(), results, nil
}

func (s *Server) GMDisableAppDevKey(ctx context.Context, appDevKeyId uint64) (bool, error) {
	logger := rctx.Logger(ctx)
	repo := rctx.DBContext(ctx)

	gmAccount, ok := rctx.CurrentAccount(ctx)
	if !ok {
		logger.Error().Msg("missing admin account")
		return false, proto.ErrorInvalidArgument("session", "missing admin account")
	}

	ok, err := repo.AppDevKeys().UpdateDisabled(appDevKeyId, true, gmAccount.ID)
	if err != nil {
		logger.Err(err).Msgf("update app dev key disabled state")
		return false, proto.WrapFailf(err, "failed to disable app dev key")
	}

	return ok, nil
}

func (s *Server) GMEnableAppDevKey(ctx context.Context, appDevKeyId uint64) (bool, error) {
	logger := rctx.Logger(ctx)
	repo := rctx.DBContext(ctx)

	appDevKey, err := repo.AppDevKeys().FindByID(appDevKeyId)
	if err != nil {
		return false, proto.WrapFailf(err, "find app dev key")
	}

	exists, err := repo.AppDevKeys().Find(db.And(
		db.Cond{"disabled": false},
		db.Cond{"id": db.NotEq(appDevKeyId)},
		db.Or(
			db.Cond{"name": appDevKey.Name},
			db.Cond{"email": appDevKey.Email},
		),
	)).Exists()
	if err != nil {
		logger.Err(err).Msg("check if the dev key exists")
		return false, proto.WrapError(proto.ErrInternal, err, "check for existent dev keys")
	}
	if exists {
		logger.Warn().Msgf("another enabled key with the same name or e-mail already exists")
		return false, proto.ErrorInvalidArgument("name", "another key with the same name already exists")
	}

	gmAccount, ok := rctx.CurrentAccount(ctx)
	if !ok {
		logger.Error().Msg("missing admin account")
		return false, proto.ErrorInvalidArgument("session", "missing admin account")
	}

	ok, err = repo.AppDevKeys().UpdateDisabled(appDevKeyId, false, gmAccount.ID)
	if err != nil {
		logger.Err(err).Msgf("update app dev key disabled state")
		return false, proto.WrapFailf(err, "failed to enable app dev key")
	}

	return ok, nil
}
