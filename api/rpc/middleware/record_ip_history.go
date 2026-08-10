package middleware

import (
	"net"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/httplog"
	"github.com/jackc/pgtype"
	"github.com/upper/db/v4"

	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/lib/jobqueue"
	"github.com/horizon-games/OpenSky/api/proto"
)

func RecordIPHistory(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		account, _ := r.Context().Value(AccountCtxKey).(*data.Account)
		if account == nil {
			next.ServeHTTP(w, r)
			return
		}
		logEntry := httplog.LogEntry(r.Context())

		ip := strings.ToLower(r.RemoteAddr)
		ipAddress := net.ParseIP(ip)
		if ipAddress == nil {
			host, _, err := net.SplitHostPort(ip)
			if err != nil {
				logEntry.Warn().Msgf("failed to separate port from ip address '%s'", ip)
				next.ServeHTTP(w, r)
				return
			}

			ipAddress = net.ParseIP(host)
			if ipAddress == nil {
				logEntry.Warn().Msgf("failed to parse ip address '%s'", ip)
				next.ServeHTTP(w, r)
				return
			}
		}

		if account != nil && (account.LastIPAddress == nil || account.LastIPAddress.IPNet.IP.String() != ip) {
			err := data.DB.TxContext(r.Context(), func(sess db.Session) error {
				account.LastIPAddress = &pgtype.Inet{IPNet: &net.IPNet{
					IP: ipAddress,
				},
					Status: pgtype.Present,
				}

				err := sess.Save(account)
				if err != nil {
					return err
				}

				err = sess.Save(&data.IPAddressHistory{
					IPAddressHistory: &proto.IPAddressHistory{
						AccountID: account.ID,
						IPAddress: *account.LastIPAddress,
					},
				})
				if err != nil {
					return err
				}

				err = data.DB.Tasks(sess).EnqueueTaskIgnoringDuplicates(jobqueue.DetectSharedIPsQueue, jobqueue.DetectSharedIPs{
					AccountID: account.ID,
					CreatedAt: time.Now().UTC(),
				}, nil, &account.ID)
				if err != nil {
					oplog := httplog.LogEntry(r.Context())
					oplog.Warn().Msgf("failed to enqueue ip check with %v", err)
				}

				return nil

			}, nil)
			if err != nil {
				logEntry.Warn().Msgf("failed to record new ip address '%s' for account %d with %v", ip, account.ID, err)
			}

		}

		next.ServeHTTP(w, r)
	})
}
