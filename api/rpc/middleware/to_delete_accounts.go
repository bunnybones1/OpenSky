package middleware

import (
	"net/http"

	"github.com/go-chi/httplog"

	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/proto"
)

// RestrictToDeleteAccounts returns HTTP middleware for restricting access for accounts flagged for deletion.
func RestrictToDeleteAccounts(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		account, _ := r.Context().Value(AccountCtxKey).(*data.Account)

		// service account or not logged in
		if account == nil {
			next.ServeHTTP(w, r)
			return
		}

		if account.Status != proto.AccountStatus_TO_DELETE && account.Status != proto.AccountStatus_DELETED {
			next.ServeHTTP(w, r)
			return
		}

		logEntry := httplog.LogEntry(r.Context())

		if account.Status == proto.AccountStatus_DELETED {
			logEntry.Warn().Msgf("request from deleted account: %d (%s) on ip:%v", account.ID, account.Name, r.RemoteAddr)

			proto.RespondWithError(w, proto.Errorf(proto.ErrPermissionDenied, "account deleted"))

			return
		}

		logEntry.Warn().Msgf("request from account flagged for deletion: %d (%s) on ip:%v", account.ID, account.Name, r.RemoteAddr)

		proto.RespondWithError(w, proto.Errorf(proto.ErrPermissionDenied, "account flagged for deletion"))
	})
}
