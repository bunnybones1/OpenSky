package middleware

import (
	"fmt"
	"net/http"
	"time"

	"github.com/go-chi/httplog"
	"github.com/upper/db/v4"

	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/lib/jobqueue"
)

func LazyMigrations(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		account, _ := r.Context().Value(AccountCtxKey).(*data.Account)
		if account == nil {
			next.ServeHTTP(w, r)
			return
		}

		// Do not schedule lazy migrations for accounts created in the last minute
		// This is a workaround for any tasks that are both happening during account creation
		// and are lazy migrations
		if account.CreatedAt.After(time.Now().Add(-time.Minute)) {
			next.ServeHTTP(w, r)
			return
		}

		logEntry := httplog.LogEntry(r.Context())
		if account.PrivateSettings.StarterDeckV2Migration == nil || !*account.PrivateSettings.StarterDeckV2Migration {
			err := data.DB.TxContext(r.Context(), func(sess db.Session) error {
				account.PrivateSettings.StarterDeckV2Migration = data.SetBoolPointer(true)

				err := sess.Save(account)
				if err != nil {
					return fmt.Errorf("save account: %w", err)
				}

				err = data.DB.Tasks(sess).EnqueueTaskIgnoringDuplicates(jobqueue.LazyMigrationQueue, jobqueue.LazyMigrationTask{
					AccountID: account.ID,
					Migration: jobqueue.StarterDeckV2Migration,
				}, nil, &account.ID)
				if err != nil {
					logEntry.Err(err).Msgf("enqueue LazyMigrationTask")
				}

				return nil

			}, nil)
			if err != nil {
				logEntry.Err(err).Msgf("enqueue starter deck v2 migration for account %d", account.ID)
			}
		}
		next.ServeHTTP(w, r)
	})
}
