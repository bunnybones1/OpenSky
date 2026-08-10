package jobqueue

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/rs/zerolog/log"
	"github.com/upper/db/v4"

	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/proto"
)

const (
	AccountDeletionQueue      = "account-deletion"
	AccountDeletionRetryDelay = 60 * 60 // in seconds
	AccountDeletionMaxRetries = 5
)

// AccountDeletionTask is used to delete all personal data of the user in the account
// and flag it as deleted.
type AccountDeletionTask struct {
	AccountID      proto.AccountID `json:"account_id"`
	AccountAddress proto.Hash      `json:"account_address"`
}

func (t AccountDeletionTask) Hash() string {
	return fmt.Sprintf("account-deletion:%d", t.AccountID)
}

type AccountDeletionRunner struct {
	ticker *time.Ticker
}

func NewAccountDeletionRunner() (*AccountDeletionRunner, error) {
	return &AccountDeletionRunner{}, nil
}

func (r *AccountDeletionRunner) WorkGroup() string {
	return AccountDeletionQueue
}

func (r *AccountDeletionRunner) Queues() []string {
	return []string{AccountDeletionQueue}
}

func (r *AccountDeletionRunner) MaxBatchSize() int {
	return 50
}

func (r *AccountDeletionRunner) Tick() <-chan time.Time {
	if r.ticker == nil {
		r.ticker = time.NewTicker(60 * time.Minute)
	}

	return r.ticker.C
}

func (r *AccountDeletionRunner) RunTasks(_ context.Context, sess db.Session, tasks []*data.Task) error {
	for _, task := range tasks {
		var payload AccountDeletionTask
		if err := json.Unmarshal(task.Payload, &payload); err != nil {
			log.Error().Msgf("failed unmarshalling account deletion payload with: %v", err)
			UpdateFailedTasks([]*data.Task{task}, 0, 0)

			return fmt.Errorf("error unmarshaling payload: %w", err)
		}

		err := sess.Tx(func(tx db.Session) error {
			accountID, err := getAccountID(tx, payload.AccountID, payload.AccountAddress)
			if err != nil {
				log.Err(err).Msgf("get account ID")
				UpdateFailedTasks([]*data.Task{task}, 0, 0)

				return fmt.Errorf("get account: %w", err)
			}

			account, err := data.DB.Accounts(tx).FindByID(accountID)
			if err != nil {
				if errors.Is(err, db.ErrNoMoreRows) {
					log.Error().Msgf("account for deletion has not been found: %d", accountID)
					UpdateFailedTasks([]*data.Task{task}, 0, 0)

					return fmt.Errorf("account has not been found: %d", accountID)
				}

				log.Error().Msgf("failed to find account for deletion %d, :%v", accountID, err)
				UpdateFailedTasks([]*data.Task{task}, AccountDeletionRetryDelay, AccountDeletionMaxRetries)

				return fmt.Errorf("failed to find account %d, :%w", accountID, err)
			}

			if account.Status != proto.AccountStatus_TO_DELETE {
				log.Error().Msgf("account is not flagged for deletion: %d", accountID)
				UpdateFailedTasks([]*data.Task{task}, 0, 0)

				return fmt.Errorf("account is not flagged for deletion: %d", accountID)
			}

			account.Status = proto.AccountStatus_DELETED
			account.Name = fmt.Sprintf("Deleted-%s", uuid.NewString())
			account.PrivateSettings = data.DefaultAccountSettings()

			if err = tx.Save(account); err != nil {
				UpdateFailedTasks([]*data.Task{task}, AccountDeletionRetryDelay, AccountDeletionMaxRetries)

				return fmt.Errorf("failed to save an account: %w", err)
			}

			err = data.DB.AccountStats(tx).
				Find(db.Cond{"account_id": account.ID}).
				Update(db.Cond{"status": account.Status})
			if err != nil {
				UpdateFailedTasks([]*data.Task{task}, AccountDeletionRetryDelay, AccountDeletionMaxRetries)

				return fmt.Errorf("failed to save an account stats: %w", err)
			}

			return nil
		})
		if err != nil {
			return err
		}

		UpdateCompletedTasks([]*data.Task{task})
	}

	return nil
}
