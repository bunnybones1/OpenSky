package jobqueue

import (
	"context"
	"encoding/json"
	"fmt"
	"sync"
	"time"

	"github.com/rs/zerolog/log"
	"github.com/upper/db/v4"

	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/proto"
)

var (
	interceptMutex      = sync.RWMutex{}
	interceptLastUpdate *time.Time
	intercept           float64
)

var _ Runner = &AccountScoreRunner{}

const (
	AccountScoreWorkGroup  = "account-score"
	AccountScoreRetryDelay = 60 // in seconds
	AccountScoreMaxRetries = 5
	AccountScoreQueue      = "account-score"
)

type AccountScoreRunner struct {
	ticker *time.Ticker
}

func (r *AccountScoreRunner) WorkGroup() string {
	return AccountScoreWorkGroup
}

func (r *AccountScoreRunner) Queues() []string {
	return []string{
		AccountScoreQueue,
	}
}

func (r *AccountScoreRunner) MaxBatchSize() int {
	return 50
}

func (r *AccountScoreRunner) Tick() <-chan time.Time {
	if r.ticker == nil {
		r.ticker = time.NewTicker(10 * time.Second)
	}
	return r.ticker.C
}

func NewAccountScoreRunner() (*AccountScoreRunner, error) {
	return &AccountScoreRunner{}, nil
}

type AccountScoreTask struct {
	AccountID      proto.AccountID `json:"account_id"`
	AccountAddress proto.Hash      `json:"account_address"`
	Nonce          uint64          `json:"nonce"`
}

func (t AccountScoreTask) Hash() string {
	return fmt.Sprintf("%d-%d", t.AccountID, t.Nonce)
}

func (r *AccountScoreRunner) RunTasks(ctx context.Context, sess db.Session, tasks []*data.Task) error {
	for _, task := range tasks {
		err := updateAccountScore(ctx, sess, task)
		if err != nil {
			UpdateFailedTasks([]*data.Task{task}, AccountScoreRetryDelay, AccountScoreMaxRetries)
			return err
		}
		UpdateCompletedTasks([]*data.Task{task})
	}

	return nil
}

func updateAccountScore(ctx context.Context, sess db.Session, task *data.Task) error {
	var payload AccountScoreTask
	err := json.Unmarshal(task.Payload, &payload)
	if err != nil {
		return err
	}

	if err := updateIntercept(sess); err != nil {
		return err
	}

	accountID, err := getAccountID(sess, payload.AccountID, payload.AccountAddress)
	if err != nil {
		log.Err(err).Msgf("get account ID")
		UpdateFailedTasks([]*data.Task{task}, 0, 0)

		return fmt.Errorf("get account ID: %w", err)
	}

	_, err = sess.SQL().ExecContext(ctx, `INSERT INTO account_scores(account_id, score, updated_at)
		SELECT sig.account_id, 1.0/(1.0+exp(-GREATEST(-500, ? + SUM(COALESCE((sig.ml_value-norm.average)/norm.standard_deviation, 0.0)*scor.score)))), now()
		FROM signal_normalization norm
		LEFT JOIN account_signals sig
			ON norm.signal_type = sig.signal_type
		JOIN signal_scores scor
			ON norm.signal_type = scor.signal_type
		WHERE sig.account_id = ?
		GROUP BY 1
		ON CONFLICT (account_id) DO UPDATE SET score = EXCLUDED.score, updated_at = EXCLUDED.updated_at`,
		intercept,
		accountID,
	)

	return err
}

func updateIntercept(sess db.Session) error {
	interceptMutex.Lock()
	defer interceptMutex.Unlock()

	if interceptLastUpdate == nil || interceptLastUpdate.Before(time.Now().Add(-10*time.Minute)) {
		row, err := sess.SQL().QueryRow(`SELECT	score FROM signal_scores WHERE signal_type = 'intercept' LIMIT 1`)
		if err != nil {
			log.Error().Msgf("failed fetching intercept value with: %v", err)
		}

		err = row.Scan(&intercept)
		if err != nil {
			log.Error().Msgf("failed scanning intercept value with: %v", err)
		}

		interceptLastUpdate = data.TimeNowUTCPtr()
	}
	return nil
}

func cleanupSignals(sess db.Session, accountID proto.AccountID, signalTypes ...string) error {
	if len(signalTypes) == 0 {
		return nil
	}

	var sigs []*data.AccountSignal

	err := data.DB.AccountSignals(sess).Find(db.Cond{
		"account_id":  accountID,
		"signal_type": db.AnyOf(signalTypes),
	}).All(&sigs)

	if err != nil {
		return err
	}

	if len(sigs) == 0 {
		return nil
	}

	ids := make([]uint64, len(sigs))

	for i, sig := range sigs {
		ids[i] = sig.ID
	}

	return data.DB.AccountSignals(sess).Find(db.Cond{
		"id": db.AnyOf(ids),
	}).Delete()
}
