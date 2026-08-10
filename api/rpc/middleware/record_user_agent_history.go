package middleware

import (
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/httplog"
	"github.com/upper/db/v4"

	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/lib/jobqueue"
	"github.com/horizon-games/OpenSky/api/proto"
)

func RecordUAHistory(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		account, _ := r.Context().Value(AccountCtxKey).(*data.Account)
		if account == nil {
			next.ServeHTTP(w, r)
			return
		}
		logEntry := httplog.LogEntry(r.Context())

		ua := r.Header.Get("User-Agent")
		if ua == "" {
			next.ServeHTTP(w, r)
			return
		}

		ua = strings.ToLower(ua)

		if account != nil && (account.LastUA == nil || *account.LastUA != ua) {
			err := data.DB.TxContext(r.Context(), func(sess db.Session) error {
				account.LastUA = &ua

				err := sess.Save(account)
				if err != nil {
					return err
				}

				err = sess.Save(&data.UserAgentHistory{
					UserAgentHistory: &proto.UserAgentHistory{
						AccountID: account.ID,
						UserAgent: ua,
					},
				})
				if err != nil {
					return err
				}

				err = data.DB.Tasks(sess).EnqueueTaskIgnoringDuplicates(jobqueue.DetectSusUserAgentsQueue, jobqueue.DetectSusUserAgents{
					AccountID: account.ID,
					CreatedAt: time.Now().UTC(),
				}, nil, &account.ID)
				if err != nil {
					oplog := httplog.LogEntry(r.Context())
					oplog.Warn().Msgf("failed to enqueue ua check with %v", err)
				}

				return nil

			}, nil)
			if err != nil {
				logEntry.Warn().Msgf("failed to record new user agent '%s' for account %d with %v", ua, account.ID, err)
			}

		}

		next.ServeHTTP(w, r)
	})
}
