package jobqueue

import (
	"context"
	"encoding/json"
	"fmt"
	"regexp"
	"strings"
	"time"

	levenshtein "github.com/ka-weihe/fast-levenshtein"
	"github.com/rs/zerolog/log"
	"github.com/upper/db/v4"

	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/lib/signals"
	"github.com/horizon-games/OpenSky/api/proto"
)

var _ Runner = &UsernameSignalsRunner{}

const (
	UsernameSignalsWorkGroup    = "username-signals"
	UsernameSignalsRetryDelay   = 60 // in seconds
	UsernameSignalsMaxRetries   = 5
	DetectSimilarUsernamesQueue = "signals:similar usernames registered close together"

	levenshteinDistanceThreshold   = 2
	similarUsernameSignalThreshold = 3
)

type UsernameSignalsRunner struct {
	ticker *time.Ticker
}

func (r *UsernameSignalsRunner) WorkGroup() string {
	return UsernameSignalsWorkGroup
}

func (r *UsernameSignalsRunner) Queues() []string {
	return []string{
		DetectSimilarUsernamesQueue,
	}
}

func (r *UsernameSignalsRunner) MaxBatchSize() int {
	return 50
}

func (r *UsernameSignalsRunner) Tick() <-chan time.Time {
	if r.ticker == nil {
		r.ticker = time.NewTicker(time.Minute)
	}
	return r.ticker.C
}

func NewUsernameSignalsRunner() (*UsernameSignalsRunner, error) {
	return &UsernameSignalsRunner{}, nil
}

var (
	digit       = regexp.MustCompile("[0-9]{1}")
	isWeirdName = regexp.MustCompile(`.*([aeiou][^aeiou])|([^aeiou][aeiou]).*`)
)

type DetectSimilarUsernames struct {
	AccountID      proto.AccountID `json:"account_id"`
	AccountAddress proto.Hash      `json:"account_address"`
	Nonce          int             `json:"nonce"`
}

func (t DetectSimilarUsernames) Hash() string {
	return fmt.Sprintf("%d-%d", t.AccountID, t.Nonce)
}

func (r *UsernameSignalsRunner) RunTasks(ctx context.Context, sess db.Session, tasks []*data.Task) error {

	for _, task := range tasks {
		err := detectSimilarUsernames(ctx, sess, task)
		if err != nil {
			UpdateFailedTasks([]*data.Task{task}, UsernameSignalsRetryDelay, UsernameSignalsMaxRetries)
			return err
		}
		UpdateCompletedTasks([]*data.Task{task})
	}

	return nil
}

func detectSimilarUsernames(ctx context.Context, sess db.Session, task *data.Task) error {
	payload := DetectSimilarUsernames{}
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
		log.Error().Msgf("failed fetching account to check for similar usernames: %v", err)
		return err
	}

	var accounts []*data.Account
	err = data.DB.Accounts(sess).Find(
		db.Raw("created_at > ? AND created_at < ?", account.CreatedAt.Add(-30*time.Minute), account.CreatedAt.Add(30*time.Minute)),
	).All(&accounts)
	if err != nil {
		log.Error().Msgf("failed fetching accounts to check with: %v", err)
		return err
	}

	var similarUsernames []string

	for _, a := range accounts {
		if a.ID == accountID {
			continue
		}
		if levenshtein.Distance(account.Name, a.Name) <= levenshteinDistanceThreshold {
			similarUsernames = append(similarUsernames, a.Name)
		}
	}

	err = cleanupSignals(nil, accountID,
		signals.SIMILAR_USERNAMES,
		signals.WEIRD_USERNAME,
		signals.DIGITS_IN_USERNAME,
	)
	if err != nil {
		log.Error().Msgf("failed cleaning up username signals: %v", err)
		return err
	}

	err = data.DB.AccountSignals(sess).Session().Save(&data.AccountSignal{
		AccountSignal: &proto.AccountSignal{
			AccountID:    accountID,
			SignalType:   signals.SIMILAR_USERNAMES,
			SignalStatus: proto.SignalStatus_PENDING,
			SignalData: signals.SimilarUsernames{
				Usernames: similarUsernames,
			},
			MLScore: float64(len(similarUsernames)),
		},
	})

	if err != nil {
		log.Error().Msgf("failed creating account signal with: %v", err)
		return err
	}

	score := 0.0
	if isWeirdName.MatchString(strings.ToLower(account.Name)) {
		score = 1.0
	}
	err = data.DB.AccountSignals(sess).Session().Save(&data.AccountSignal{
		AccountSignal: &proto.AccountSignal{
			AccountID:    accountID,
			SignalType:   signals.WEIRD_USERNAME,
			SignalStatus: proto.SignalStatus_PENDING,
			MLScore:      score,
		},
	})

	if err != nil {
		log.Error().Msgf("failed creating account signal with: %v", err)
		return err
	}

	digitCount := len(digit.FindAllString(account.Name, -1))
	err = data.DB.AccountSignals(sess).Session().Save(&data.AccountSignal{
		AccountSignal: &proto.AccountSignal{
			AccountID:    accountID,
			SignalType:   signals.DIGITS_IN_USERNAME,
			SignalStatus: proto.SignalStatus_PENDING,
			SignalData: signals.DigitsInUsername{
				DigitCount: digitCount,
			},
			MLScore: float64(digitCount),
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
