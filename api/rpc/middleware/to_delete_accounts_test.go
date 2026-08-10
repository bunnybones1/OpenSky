package middleware_test

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/go-chi/httplog"
	"github.com/rs/zerolog"
	"github.com/stretchr/testify/assert"

	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/proto"
	"github.com/horizon-games/OpenSky/api/rpc/middleware"
)

func TestRestrictToDeleteAccounts(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "https://foo.bar", nil)

	logger := zerolog.Nop()
	logMiddleware := httplog.RequestLogger(logger)

	t.Run("restrict for flagged for deletion", func(t *testing.T) {
		res := httptest.NewRecorder()
		account := &data.Account{Account: &proto.Account{Status: proto.AccountStatus_TO_DELETE}}
		req = req.WithContext(context.WithValue(req.Context(), middleware.AccountCtxKey, account))

		mock := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			assert.Fail(t, "should not be called")
		})

		handler := logMiddleware(middleware.RestrictToDeleteAccounts(mock))
		handler.ServeHTTP(res, req)

		assert.Equal(t, 403, res.Code)
		assert.JSONEq(t, "{\"code\":\"permission denied\", \"error\":\"webrpc permission denied error: account flagged for deletion\", \"msg\":\"account flagged for deletion\", \"status\":403}", res.Body.String())
	})

	t.Run("restrict for deleted account", func(t *testing.T) {
		res := httptest.NewRecorder()
		account := &data.Account{Account: &proto.Account{Status: proto.AccountStatus_DELETED}}
		req = req.WithContext(context.WithValue(req.Context(), middleware.AccountCtxKey, account))

		mock := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			assert.Fail(t, "should not be called")
		})

		handler := logMiddleware(middleware.RestrictToDeleteAccounts(mock))
		handler.ServeHTTP(res, req)

		assert.Equal(t, 403, res.Code)
		assert.JSONEq(t, "{\"code\":\"permission denied\", \"error\":\"webrpc permission denied error: account deleted\", \"msg\":\"account deleted\", \"status\":403}", res.Body.String())
	})

	t.Run("allow for non-flagged for deletion", func(t *testing.T) {
		res := httptest.NewRecorder()
		account := &data.Account{Account: &proto.Account{Status: proto.AccountStatus_ACTIVE}}
		req = req.WithContext(context.WithValue(req.Context(), middleware.AccountCtxKey, account))

		var called bool
		mock := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			called = true
		})

		handler := logMiddleware(middleware.RestrictToDeleteAccounts(mock))
		handler.ServeHTTP(res, req)

		assert.True(t, called)
		assert.Equal(t, 200, res.Code)
	})
}
