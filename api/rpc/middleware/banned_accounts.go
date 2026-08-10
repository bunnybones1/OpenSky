package middleware

import (
	"net/http"

	"github.com/go-chi/httplog"
	"github.com/upper/db/v4"

	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/proto"
)

func EnforceAccountBans(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		account, _ := r.Context().Value(AccountCtxKey).(*data.Account)

		// service account or not logged in
		if account == nil {
			next.ServeHTTP(w, r)
			return
		}

		if account.Status == proto.AccountStatus_ACTIVE ||
			account.Status == proto.AccountStatus_VIP ||
			account.Status == proto.AccountStatus_FLAGGED ||
			account.Status == proto.AccountStatus_TO_DELETE ||
			account.Status == proto.AccountStatus_DELETED {
			next.ServeHTTP(w, r)
			return
		}

		activeActions, err := data.DB.AccountActions(nil).FindActive(account.ID)
		if err != nil {
			proto.RespondWithError(w, proto.ErrorInternal("failed fetching ban list"))
			return
		}

		// all bans & suspensions expired - change account status accordingly
		if len(activeActions) == 0 {
			account.Status = proto.AccountStatus_ACTIVE
			err := data.DB.Accounts(nil).Session().Save(account)
			if err != nil {
				proto.RespondWithError(w, proto.ErrorInternal("failed reactivating banned account"))
				return
			}

			err = data.DB.AccountStats(nil).Find(db.Cond{"account_id": account.ID}).Update(db.Cond{"status": proto.AccountStatus_ACTIVE})
			if err != nil {
				middlewareError(w, proto.ErrorInternal("failed reactivating banned account stats"))
				return
			}

			next.ServeHTTP(w, r)
			return
		}

		// banned - gtfo
		logEntry := httplog.LogEntry(r.Context())
		logEntry.Warn().Msgf("request from banned/suspended account: %d (%s) on ip:%v", account.ID, account.Name, r.RemoteAddr)

		proto.RespondWithError(w, proto.Errorf(proto.ErrPermissionDenied, "account banned"))
	})
}
