package matchmaker

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"

	"github.com/davecgh/go-spew/spew"
	"github.com/go-chi/httplog"
	"github.com/go-chi/jwtauth/v5"
	"github.com/lestrrat-go/jwx/v2/jwt"

	"github.com/horizon-games/OpenSky/api/proto"
	mmerrors "github.com/horizon-games/OpenSky/matchmaker/lib/errors"
)

func AccountHandler(ja *jwtauth.JWTAuth) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ctx := r.Context()
			token, claims, tokenErr := jwtauth.FromContext(ctx)

			logger := httplog.LogEntry(r.Context())

			if token == nil {
				if errors.Is(tokenErr, jwtauth.ErrNoTokenFound) {
					next.ServeHTTP(w, r.WithContext(ctx))
					return
				}

				if errors.Is(tokenErr, jwtauth.ErrExpired) {
					logger.Info().Msgf("jwt expired - claims: %v", spew.Sdump(claims))

					if err := HandleHTTPError(w, mmerrors.ErrSessionExpired); err != nil {
						logger.Err(err).Msg("handle session expired error")
					}

					return
				}

				logger.Warn().Msgf("jwt unauthorized - claims: %v", spew.Sdump(claims))

				if err := HandleHTTPError(w, mmerrors.ErrUnauthorized); err != nil {
					logger.Err(err).Msg("handle unauthorized error")
				}

				return
			}

			// When JWT token is found, ensure it verifies, or error
			if token == nil || jwt.Validate(token, ja.ValidateOptions()...) != nil || tokenErr != nil {
				logger.Warn().Msgf("jwt unauthorized")

				if err := HandleHTTPError(w, mmerrors.ErrUnauthorized); err != nil {
					logger.Err(err).Msg("handle unauthorized error")
				}

				return
			}

			// Set account on context if one is provided on the jwt token
			accountClaim, _ := claims["account"].(string)
			if accountClaim != "" {
				ctx = ContextWithAccount(ctx, accountClaim)
				httplog.LogEntrySetField(r.Context(), "jwtAccount", accountClaim)
			}

			// Continue
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

var (
	accountCtxKey = &contextKey{"Account"}
)

type contextKey struct {
	name string
}

func (k *contextKey) String() string {
	return "context value " + k.name
}

func ContextWithAccount(ctx context.Context, claim string) context.Context {
	return context.WithValue(ctx, accountCtxKey, strings.ToLower(claim))
}

func AccountFromContext(ctx context.Context) (string, error) {
	account, ok := ctx.Value(accountCtxKey).(string)
	if !ok {
		return "", fmt.Errorf("account is not present")
	}

	if account == "" {
		return "", fmt.Errorf("invalid account")
	}

	return account, nil
}

func HandleHTTPError(w http.ResponseWriter, rpcErr proto.Error) error {
	statusCode := proto.HTTPStatusFromErrorCode(rpcErr.Code())
	respBody, err := json.Marshal(rpcErr.Payload())
	if err != nil {
		return fmt.Errorf("encode error: %w", err)
	}

	w.WriteHeader(statusCode)
	w.Header().Set("Content-Type", "application/json")
	if _, err := w.Write(respBody); err != nil {
		return fmt.Errorf("write to body: %w", err)
	}

	return nil
}
