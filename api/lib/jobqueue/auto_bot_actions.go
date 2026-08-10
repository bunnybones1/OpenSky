package jobqueue

import (
	"context"
	"errors"
	"time"

	"github.com/rs/zerolog/log"
	"github.com/upper/db/v4"

	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/proto"
)

var _ Runner = &BalanceSyncRunner{}
var ErrNotInTxn = errors.New("this has to be ran in a transaction")

const (
	AutoBotActionsGroup      = "auto-bot-actions"
	AutoBotActionsRetryDelay = 15 // number of seconds
	AutoBotActionsMaxRetries = 20

	RefreshSignalNormalizationQueue = "refresh-score-normalization"
	RefreshUserAgentScoresQueue     = "refresh-ua-scores"
	ShadowBanQueue                  = "shadowban"
	AutoBanQueue                    = "auto-ban-queue"
	SignalTaskCleanupQueue          = "signal-task-cleanup"

	shadowbanThreshold = 0.85
)

type AutoBotActionsRunner struct {
	ticker *time.Ticker
}

func (r *AutoBotActionsRunner) Queues() []string {
	return []string{
		RefreshSignalNormalizationQueue,
		RefreshUserAgentScoresQueue,
		ShadowBanQueue,
		SignalTaskCleanupQueue,
	}
}

func (r *AutoBotActionsRunner) WorkGroup() string {
	return AutoBotActionsGroup
}

func (r *AutoBotActionsRunner) MaxBatchSize() int {
	return 1
}

func (r *AutoBotActionsRunner) Tick() <-chan time.Time {
	if r.ticker == nil {
		r.ticker = time.NewTicker(5 * time.Minute)
	}
	return r.ticker.C
}

func NewAutoBotActionsRunner() (*AutoBotActionsRunner, error) {
	return &AutoBotActionsRunner{}, nil
}

func (r *AutoBotActionsRunner) RunTasks(ctx context.Context, sess db.Session, tasks []*data.Task) error {
	oplog := log.With().Str("op", AutoBotActionsGroup).Logger()
	oplog.Info().Msgf("%s running", AutoBotActionsGroup)

	if len(tasks) == 0 {
		return nil
	}
	var runAt time.Time

	switch tasks[0].Queue {
	case RefreshSignalNormalizationQueue:
		_, err := sess.SQL().Exec("REFRESH MATERIALIZED VIEW signal_normalization")
		if err != nil {
			UpdateFailedTasks(tasks, AutoBotActionsRetryDelay, AutoBotActionsMaxRetries)
			return err
		}
		runAt = time.Now().UTC().Add(24 * time.Hour)

	case RefreshUserAgentScoresQueue:
		_, err := sess.SQL().Exec("REFRESH MATERIALIZED VIEW ua_scores")
		if err != nil {
			UpdateFailedTasks(tasks, AutoBotActionsRetryDelay, AutoBotActionsMaxRetries)
			return err
		}
		runAt = time.Now().UTC().Add(24 * time.Hour)

	case ShadowBanQueue:
		results := []*proto.AccountSignalSummary{}

		err := sess.SQL().
			Select(db.Raw("a.account_id AS account_id, a.score AS score, ac.created_at AS updated_at")).
			From(db.Raw("account_scores a")).
			Join(db.Raw("accounts ac")).On("ac.id = a.account_id").
			LeftJoin(db.Raw("account_actions act")).
			On(db.Raw("act.account_id = a.account_id AND act.is_active = true AND act.action_type = ? AND act.expires_at < NOW()", proto.ActionType_MOD_VET)).
			Where(db.Cond{
				"act.id":    db.IsNull(),
				"ac.status": db.In(proto.AccountStatus_ACTIVE, proto.AccountStatus_TO_DELETE, proto.AccountStatus_DELETED),
				"a.score":   db.Gte(shadowbanThreshold),
			}).All(&results)

		if err != nil {
			log.Error().Msgf("failed fetching account address with: %v", err)
			UpdateFailedTasks(tasks, AutoBotActionsRetryDelay, AutoBotActionsMaxRetries)
			return err
		}

		expiry := time.Now().UTC().Add(time.Hour * 24 * 365 * 10)
		var accountIDs []proto.AccountID
		var activeAccountIDs []proto.AccountID
		for _, res := range results {

			accountIDs = append(accountIDs, res.AccountID)
			if res.Account.Status != proto.AccountStatus_TO_DELETE && res.Account.Status != proto.AccountStatus_DELETED {
				activeAccountIDs = append(activeAccountIDs, res.AccountID)
			}

			err = data.DB.AccountActions(sess).Session().Save(&data.AccountAction{
				AccountAction: &proto.AccountAction{
					AccountID:  res.AccountID,
					ActionType: proto.ActionType_AUTO_FLAG,
					ExpiresAt:  &expiry,
					IsActive:   true,
				},
			})
			if err != nil {
				log.Error().Msgf("failed creating automated flag action: %v", err)
				UpdateFailedTasks(tasks, AutoBotActionsRetryDelay, AutoBotActionsMaxRetries)
				return err
			}
		}

		err = data.DB.Accounts(sess).Find(db.Cond{
			"id": db.AnyOf(activeAccountIDs),
		}).Update(db.Cond{
			"status": proto.AccountStatus_FLAGGED,
		})
		if err != nil {
			log.Error().Msgf("failed flagging accounts: %v", err)
			UpdateFailedTasks(tasks, AutoBotActionsRetryDelay, AutoBotActionsMaxRetries)
			return err
		}

		err = DisableDelayedMinting(sess, accountIDs...)
		if err != nil {
			log.Error().Msgf("failed disabling pending minting: %v", err)
			UpdateFailedTasks(tasks, AutoBotActionsRetryDelay, AutoBotActionsMaxRetries)
			return err
		}

		runAt = time.Now().UTC().Add(30 * time.Minute)

	case SignalTaskCleanupQueue:
		err := data.DB.Tasks(sess).Find(db.Cond{
			"status": proto.TaskStatus_COMPLETED,
			"queue": db.In(
				AccountScoreQueue,
				DetectSimilarUsernamesQueue,
				DetectSharedIPsQueue,
				DetectSusUserAgentsQueue,
				UpdateOwnershipStatsQueue,
				UpdateMatchStatsQueue,
				DetectSusUserAgentsQueue,
			),
		}).Delete()
		if err != nil {
			log.Error().Msgf("failed deleting old, completed bot tasks: %v", err)
			UpdateFailedTasks(tasks, AutoBotActionsRetryDelay, AutoBotActionsMaxRetries)
			return err
		}

		runAt = time.Now().UTC().Add(time.Hour)

	}

	for _, task := range tasks {
		task.Try = 0
		task.RunAt = &runAt
	}

	return nil
}

func DisableDelayedMinting(sess db.Session, accountIDs ...proto.AccountID) error {
	if sess == nil {
		return ErrNotInTxn
	}

	if len(accountIDs) == 0 {
		return nil
	}

	err := data.DB.Tasks(sess).Find(db.Cond{
		"queue":      db.In(DelayedMintingQueue, SendConquestExtraRewardQueue, ConquestV2SendRewardQueue),
		"status":     proto.TaskStatus_PENDING,
		"account_id": db.AnyOf(accountIDs),
	}).Update(db.Cond{"status": proto.TaskStatus_DISABLED})
	if err != nil {
		return err
	}

	return nil
}

func ReEnableDelayedMinting(sess db.Session, accountIDs ...proto.AccountID) error {
	if sess == nil {
		return ErrNotInTxn
	}

	if len(accountIDs) == 0 {
		return nil
	}

	err := data.DB.Tasks(sess).Find(db.Cond{
		"queue":      db.In(DelayedMintingQueue, SendConquestExtraRewardQueue, ConquestV2SendRewardQueue),
		"status":     proto.TaskStatus_DISABLED,
		"account_id": db.AnyOf(accountIDs),
	}).Update(db.Cond{"status": proto.TaskStatus_PENDING})
	if err != nil {
		return err
	}

	return nil
}
