package jobqueue

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"time"

	"github.com/jackc/pgtype"
	"github.com/rs/zerolog/log"
	"github.com/upper/db/v4"

	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/lib/signals"
	"github.com/horizon-games/OpenSky/api/proto"
)

var _ Runner = &IPSignalsRunner{}

const (
	IPSignalsWorkGroup   = "ip-signals"
	IPSignalsRetryDelay  = 60 // in seconds
	IPSignalsMaxRetries  = 5
	DetectSharedIPsQueue = "signals:shared ips"
)

type IPSignalsRunner struct {
	ticker *time.Ticker
}

func (r *IPSignalsRunner) WorkGroup() string {
	return IPSignalsWorkGroup
}

func (r *IPSignalsRunner) Queues() []string {
	return []string{
		DetectSharedIPsQueue,
	}
}

func (r *IPSignalsRunner) MaxBatchSize() int {
	return 20
}

func (r *IPSignalsRunner) Tick() <-chan time.Time {
	if r.ticker == nil {
		r.ticker = time.NewTicker(5 * time.Second)
	}
	return r.ticker.C
}

func NewIPSignalsRunner() (*IPSignalsRunner, error) {
	return &IPSignalsRunner{}, nil
}

type DetectSharedIPs struct {
	AccountID      proto.AccountID `json:"account_id"`
	AccountAddress proto.Hash      `json:"account_address"`
	CreatedAt      time.Time       `json:"created_at"`
}

func (t DetectSharedIPs) Hash() string {
	return fmt.Sprintf("%d-%d", t.AccountID, t.CreatedAt.Unix())
}

func (r *IPSignalsRunner) RunTasks(ctx context.Context, sess db.Session, tasks []*data.Task) error {
	for _, task := range tasks {
		err := detectSharedIPs(ctx, sess, task)
		if err != nil {
			UpdateFailedTasks([]*data.Task{task}, IPSignalsRetryDelay, IPSignalsMaxRetries)
			return err
		}
		UpdateCompletedTasks([]*data.Task{task})
	}

	return nil
}

func detectSharedIPs(ctx context.Context, sess db.Session, task *data.Task) error {
	payload := DetectSharedIPs{}
	err := json.Unmarshal(task.Payload, &payload)
	if err != nil {
		log.Error().Msgf("failed unmarshalling detect similar usernames payload with: %v", err)
		return err
	}

	accountID, err := getAccountID(sess, payload.AccountID, payload.AccountAddress)
	if err != nil {
		log.Err(err).Msgf("get account ID")
		UpdateFailedTasks([]*data.Task{task}, 0, 0)

		return fmt.Errorf("get account ID: %w", err)
	}

	account, err := data.DB.Accounts(sess).FindByID(accountID)
	if err != nil {
		log.Error().Msgf("failed fetching account to check for shared IPs: %v", err)
		return err
	}

	// get numer of accounts sharing the same IP (most popular one)
	row, err := data.DB.Session.SQL().QueryRowContext(ctx, `SELECT ip_address, COUNT(DISTINCT account_id)
		FROM ip_address_history
		WHERE ip_address IN (
			SELECT DISTINCT ip_address
				FROM ip_address_history
				WHERE account_id = ?
				ORDER BY ip_address
			)
		GROUP BY 1
		ORDER BY 2 DESC
		LIMIT 1`, account.ID)

	if err != nil {
		log.Error().Msgf("failed fetching number of accounts sharing IPs: %v", err)
		return err
	}

	var accountSharingIPCount int
	var ip pgtype.Inet

	err = row.Scan(&ip, &accountSharingIPCount)
	if err == sql.ErrNoRows {
		return nil
	}
	if err != nil {
		log.Error().Msgf("failed scanning number of accounts sharing IPs: %v", err)
		return err
	}

	// decrement by one - self
	accountSharingIPCount--

	createdHour := account.CreatedAt.Truncate(time.Hour)
	startAt := createdHour.Add(-2 * time.Hour)
	endAt := createdHour.Add(2 * time.Hour)

	var sameDayAccountSharingIPCount int

	// get numer of accounts created the same day and sharing the same IP (most popular one)
	row, err = data.DB.Session.SQL().QueryRowContext(ctx, `SELECT ip_address, COUNT(DISTINCT account_id)
		FROM ip_address_history
		WHERE ip_address IN (
			SELECT ip_address
				FROM ip_address_history
				WHERE account_id = ?
				GROUP BY 1
			)
		AND account_id IN (
			SELECT id
			FROM accounts
			WHERE created_at >= ? AND created_at < ?
		)
		GROUP BY 1
		ORDER BY 2 DESC
		LIMIT 1`, account.ID, startAt, endAt)
	if err != nil {
		log.Error().Msgf("failed fetching number of accounts created same day sharing IPs: %v", err)
		return err
	}
	err = row.Scan(&ip, &sameDayAccountSharingIPCount)
	if err == sql.ErrNoRows {
		return nil
	}
	if err != nil {
		log.Error().Msgf("failed scanning number of accounts created same day sharing IPs: %v", err)
		return err
	}

	// decrement by one - self
	sameDayAccountSharingIPCount--

	err = cleanupSignals(nil, accountID,
		signals.SAME_IP,
		signals.SAME_IP_SAME_CREATION_DAY,
	)
	if err != nil {
		log.Error().Msgf("failed cleaning up ip signals: %v", err)
		return err
	}

	err = data.DB.AccountSignals(sess).Session().Save(&data.AccountSignal{
		AccountSignal: &proto.AccountSignal{
			AccountID:    account.ID,
			SignalType:   signals.SAME_IP,
			SignalStatus: proto.SignalStatus_PENDING,
			SignalData: signals.SameIP{
				NumAccountsUsingSameIP: accountSharingIPCount,
			},
			MLScore: float64(accountSharingIPCount),
		},
	})
	if err != nil {
		log.Error().Msgf("failed creating account signal with: %v", err)
		return err
	}

	err = data.DB.AccountSignals(sess).Session().Save(&data.AccountSignal{
		AccountSignal: &proto.AccountSignal{
			AccountID:    account.ID,
			SignalType:   signals.SAME_IP_SAME_CREATION_DAY,
			SignalStatus: proto.SignalStatus_PENDING,
			SignalData: signals.SameIPSameCreationDay{
				NumAccountsUsingSameIP: sameDayAccountSharingIPCount,
			},
			MLScore: float64(sameDayAccountSharingIPCount),
		},
	})
	if err != nil {
		log.Error().Msgf("failed creating account signal with: %v", err)
		return err
	}

	err = data.DB.Tasks(sess).EnqueueTask(AccountScoreQueue, AccountScoreTask{
		AccountID: accountID,
		Nonce:     task.ID,
	}, nil, &accountID)
	if err != nil {
		log.Error().Msgf("failed updating account score with: %v", err)
		return err
	}

	return nil
}
