package rctx

import (
	"context"
	"net/http"

	"github.com/go-chi/httplog"
	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/proto"
	rpcmw "github.com/horizon-games/OpenSky/api/rpc/middleware"
	"github.com/rs/zerolog"
)

func HTTPRequest(ctx context.Context) *http.Request {
	r, _ := ctx.Value(proto.HTTPRequestCtxKey).(*http.Request)
	return r
}

func Logger(ctx context.Context) zerolog.Logger {
	return httplog.LogEntry(ctx)
}

func LoggerSetField(ctx context.Context, key, value string) {
	httplog.LogEntrySetField(ctx, key, value)
}

func LoggerSetFields(ctx context.Context, fields map[string]interface{}) {
	httplog.LogEntrySetFields(ctx, fields)
}

func SessionTypeContext(ctx context.Context) rpcmw.SessionType {
	v, _ := ctx.Value(rpcmw.SessionTypeCtxKey).(rpcmw.SessionType)
	return v
}

func WalletAddress(ctx context.Context) string {
	v, _ := ctx.Value(rpcmw.WalletCtxKey).(string)
	return v
}

func CurrentAccount(ctx context.Context) (*data.Account, bool) {
	v, ok := ctx.Value(rpcmw.AccountCtxKey).(*data.Account)
	if v == nil {
		return nil, false
	}
	return v, ok
}

func ServiceContext(ctx context.Context) string {
	v, _ := ctx.Value(rpcmw.ServiceCtxKey).(string)
	return v
}

func DBContext(ctx context.Context) *data.Database {
	v, _ := ctx.Value(rpcmw.DatabaseCtxKey).(*data.Database)
	return v
}
