package jobqueue

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"time"

	"github.com/rs/zerolog/log"
	"github.com/upper/db/v4"

	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/lib/signals"
	"github.com/horizon-games/OpenSky/api/proto"
)

// UASignalsRunner is responsible for processing tasks related to account health
// Right now it's only creation of signals to be acted upon by moderators, but
// in the future it will issue bans on it's own in obvious cases.

var _ Runner = &UASignalsRunner{}

const (
	UASignalsWorkGroup       = "ua-signals"
	UASignalsRetryDelay      = 60 // in seconds
	UASignalsMaxRetries      = 5
	DetectSusUserAgentsQueue = "signals:sus-useragent"
)

type UASignalsRunner struct {
	ticker *time.Ticker
}

func (r *UASignalsRunner) WorkGroup() string {
	return UASignalsWorkGroup
}

func (r *UASignalsRunner) Queues() []string {
	return []string{
		DetectSusUserAgentsQueue,
	}
}

func (r *UASignalsRunner) MaxBatchSize() int {
	return 20
}

func (r *UASignalsRunner) Tick() <-chan time.Time {
	if r.ticker == nil {
		r.ticker = time.NewTicker(5 * time.Second)
	}
	return r.ticker.C
}

func NewUASignalsRunner() (*UASignalsRunner, error) {
	return &UASignalsRunner{}, nil
}

type DetectSusUserAgents struct {
	AccountID      proto.AccountID `json:"account_id"`
	AccountAddress proto.Hash      `json:"account_address"`
	CreatedAt      time.Time       `json:"created_at"`
}

func (t DetectSusUserAgents) Hash() string {
	return fmt.Sprintf("%d-%d", t.AccountID, t.CreatedAt.Unix())
}

func (r *UASignalsRunner) RunTasks(ctx context.Context, sess db.Session, tasks []*data.Task) error {

	for _, task := range tasks {
		err := detectSusUserAgents(ctx, sess, task)
		if err != nil {
			UpdateFailedTasks([]*data.Task{task}, UASignalsRetryDelay, UASignalsMaxRetries)
			return err
		}
		UpdateCompletedTasks([]*data.Task{task})
	}

	return nil
}

func detectSusUserAgents(ctx context.Context, sess db.Session, task *data.Task) error {
	payload := DetectSusUserAgents{}
	err := json.Unmarshal(task.Payload, &payload)
	if err != nil {
		log.Error().Msgf("failed unmarshalling detect sus user_agent payload with: %v", err)
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
		log.Err(err).Msgf("failed fetching account to check for detect sus user_agent")

		return err
	}

	// max percentage of bot use of any UA used by this account ever
	row, err := sess.SQL().QueryRowContext(ctx, `SELECT h.account_id, COALESCE(MAX(s.score),0.0) AS score
	FROM ua_history h
	LEFT JOIN ua_scores s
		ON s.user_agent = h.user_agent
	WHERE h.account_id = ?
	GROUP BY 1
	LIMIT 1`, account.ID)

	if err != nil {
		log.Error().Msgf("failed fetching user_agent score: %v", err)
		return err
	}

	var uaBotScore float64

	err = row.Scan(&accountID, &uaBotScore)
	if err == sql.ErrNoRows {
		return nil
	}
	if err != nil {
		log.Error().Msgf("failed scanning user_agent bot score: %v", err)
		return err
	}

	err = cleanupSignals(nil, accountID, signals.BOT_USER_AGENT)
	if err != nil {
		log.Error().Msgf("failed cleaning up useragent signals: %v", err)
		return err
	}

	err = data.DB.AccountSignals(sess).Session().Save(&data.AccountSignal{
		AccountSignal: &proto.AccountSignal{
			AccountID:    accountID,
			SignalType:   signals.BOT_USER_AGENT,
			SignalStatus: proto.SignalStatus_PENDING,
			SignalData: signals.Fraction{
				Fraction: uaBotScore,
			},
			MLScore: float64(uaBotScore),
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
