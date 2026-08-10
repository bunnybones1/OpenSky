package middleware

import (
	"context"
	"net/http"
	"strings"
	"time"

	"github.com/davecgh/go-spew/spew"
	"github.com/go-chi/httplog"
	"github.com/go-chi/jwtauth/v5"
	"github.com/lestrrat-go/jwx/v2/jwt"
	"github.com/upper/db/v4"

	"github.com/horizon-games/OpenSky/api/config"
	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/lib/requesturl"
	"github.com/horizon-games/OpenSky/api/proto"
)

// Session middleware to attach `account` or `service` sessions to the request context
func Session(ja *jwtauth.JWTAuth) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ctx := r.Context()
			token, claims, tokenErr := jwtauth.FromContext(ctx)

			logEntry := httplog.LogEntry(r.Context())

			if token == nil {
				switch tokenErr {
				case jwtauth.ErrNoTokenFound:
					// When JWT token is not passed, we set to anonymous/public session and continue
					// to AccessControl middleware (which is expected to be next)
					httplog.LogEntrySetField(r.Context(), "auth", "anonymous")
					ctx = context.WithValue(ctx, SessionTypeCtxKey, SessionTypePublic)
					next.ServeHTTP(w, r.WithContext(ctx))
				case jwtauth.ErrExpired:
					logEntry.Info().Msgf("jwt expired - claims: %v", spew.Sdump(claims))
					middlewareError(w, ErrSessionExpired)
				default:
					logEntry.Warn().Msgf("jwt unauthorized- claims: %v", spew.Sdump(claims))
					middlewareError(w, ErrUnauthorized)
				}
				return
			}

			// When JWT token is found, ensure it verifies, or error
			if token == nil || jwt.Validate(token, ja.ValidateOptions()...) != nil || tokenErr != nil {
				logEntry.Warn().Msgf("jwt unauthorized")
				middlewareError(w, ErrUnauthorized)
				return
			}

			// Set account, service, or app on the context
			accountClaim, _ := claims["account"].(string)
			serviceClaim, _ := claims["service"].(string)
			appClaim, _ := claims["app"].(string)
			issuedAt, _ := claims["iat"].(time.Time)

			if accountClaim != "" {
				ctx = context.WithValue(ctx, WalletCtxKey, strings.ToLower(accountClaim))

				httplog.LogEntrySetField(r.Context(), "jwtAccount", accountClaim)

				account, err := data.DB.Accounts(nil).FindByAddress(proto.HashFromString(accountClaim))
				if err != nil && err != db.ErrNoMoreRows {
					logEntry.Warn().Msgf("auth error, %v", err)
					middlewareError(w, ErrUnauthorized)
					return
				}

				if account != nil {
					if account.Admin {
						httplog.LogEntrySetField(r.Context(), "auth", "admin")
						ctx = context.WithValue(ctx, SessionTypeCtxKey, SessionTypeAdmin)
					} else {
						httplog.LogEntrySetField(r.Context(), "auth", "user")
						ctx = context.WithValue(ctx, SessionTypeCtxKey, SessionTypeUser)
					}
					ctx = context.WithValue(ctx, AccountCtxKey, account)
				} else {
					// wallet proof
					httplog.LogEntrySetField(r.Context(), "auth", "wallet")
					ctx = context.WithValue(ctx, SessionTypeCtxKey, SessionTypeWallet)
				}

				if config.Instance.Auth.UserLogoutCutoff != nil && issuedAt.Unix() < config.Instance.Auth.UserLogoutCutoff.Unix() {
					logEntry.Warn().Msgf("JWT created before logout cutoff, %v, %v", issuedAt, config.Instance.Auth.UserLogoutCutoff)
					middlewareError(w, ErrUnauthorized)
					return
				}

			} else if serviceClaim != "" {
				httplog.LogEntrySetField(r.Context(), "auth", "service")
				httplog.LogEntrySetField(r.Context(), "jwtService", serviceClaim)
				ctx = context.WithValue(ctx, SessionTypeCtxKey, SessionTypeService)
				ctx = context.WithValue(ctx, ServiceCtxKey, serviceClaim)

			} else if appClaim != "" {
				httplog.LogEntrySetField(r.Context(), "auth", "app")
				httplog.LogEntrySetField(r.Context(), "jwtApp", appClaim)
				ctx = context.WithValue(ctx, SessionTypeCtxKey, SessionTypeAppDev)
				ctx = context.WithValue(ctx, ServiceCtxKey, appClaim)

				appDevKey, err := data.DB.AppDevKeys(nil).FindByApiKey(appClaim, false)
				if err != nil && err != db.ErrNoMoreRows {
					logEntry.Warn().Msgf("auth error, %v", err)
					middlewareError(w, ErrUnauthorized)
					return
				}

				if appDevKey == nil || appDevKey.Disabled {
					middlewareError(w, ErrUnauthorized)
					return
				}

				ctx = context.WithValue(ctx, AppDevCtxKey, appDevKey)
			}

			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

/*
// NOTE: not in use
func SetJWTCookie(w http.ResponseWriter, r *http.Request, value string) {
	maxAge := 3600 * 24 * 365              // max-age is 1 year; used in all major borwsers except IE
	expires := time.Now().AddDate(1, 0, 0) // expires in 1 year; used in IE

	// logout settings
	if value == "" {
		maxAge = -1               // delete cookie now
		expires = time.Unix(1, 0) // set to epoche for delete
	}

	// cookie object
	cookie := http.Cookie{
		Name:     "jwt",
		Domain:   config.Instance.CookieDomain,
		Path:     "/",
		Secure:   HttpsOnly(r),
		MaxAge:   maxAge,
		Expires:  expires,
		HttpOnly: true,
		Value:    value,
	}
	http.SetCookie(w, &cookie)
}
*/

func HttpsOnly(r *http.Request) bool {
	return requesturl.RequestScheme(r) == "https"
}
