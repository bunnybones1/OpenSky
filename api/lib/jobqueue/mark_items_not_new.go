package jobqueue

import (
	"context"
	"crypto/sha1"
	"encoding/json"
	"fmt"
	"sort"
	"time"

	"github.com/rs/zerolog/log"
	"github.com/upper/db/v4"

	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/proto"
)

const (
	MarkNotNewWorkGroup  = "mark-not-new"
	MarkNotNewRetryDelay = 60
	MarkNotNewMaxRetries = 10
)

type MarkNotNewTask struct {
	AccountID      proto.AccountID `json:"account_id"`
	AccountAddress proto.Hash      `json:"account_address"`
	TokenIDs       []uint64        `json:"token_ids"`
}

func (t MarkNotNewTask) Hash() string {
	sort.Slice(t.TokenIDs, func(i, j int) bool {
		return t.TokenIDs[i] < t.TokenIDs[j]
	})

	h := sha1.New()

	h.Write([]byte(fmt.Sprintf("%d", t.AccountID)))
	h.Write([]byte(fmt.Sprintf("%v", t.TokenIDs)))

	sh := h.Sum(nil)

	return fmt.Sprintf("%x", sh)
}

type MarkNotNewRunner struct {
	ticker *time.Ticker
}

func (r *MarkNotNewRunner) Queues() []string {
	return []string{MarkNotNewWorkGroup}
}

func (r *MarkNotNewRunner) WorkGroup() string {
	return MarkNotNewWorkGroup
}

func (r *MarkNotNewRunner) MaxBatchSize() int {
	return 20
}

func (r *MarkNotNewRunner) Tick() <-chan time.Time {
	if r.ticker == nil {
		r.ticker = time.NewTicker(time.Minute)
	}
	return r.ticker.C
}

func NewMarkNotNewRunner() (*MarkNotNewRunner, error) {
	return &MarkNotNewRunner{}, nil
}

func (r *MarkNotNewRunner) RunTasks(ctx context.Context, sess db.Session, tasks []*data.Task) error {
	oplog := log.With().Str("op", MarkNotNewWorkGroup).Logger()
	oplog.Info().Msgf("%s running", MarkNotNewWorkGroup)

	for _, task := range tasks {
		payload := MarkNotNewTask{}
		err := json.Unmarshal(task.Payload, &payload)
		if err != nil {
			log.Error().Msgf("failed unmarshalling mark not new payload with: %v", err)
			UpdateFailedTasks([]*data.Task{task}, MarkNotNewRetryDelay, MarkNotNewMaxRetries)
			return err
		}

		accountID, err := getAccountID(sess, payload.AccountID, payload.AccountAddress)
		if err != nil {
			log.Err(err).Msgf("get account ID")
			UpdateFailedTasks([]*data.Task{task}, 0, 0)

			continue
		}

		updateMap := make(map[proto.ItemType][]uint64)
		for _, tokenID := range payload.TokenIDs {
			itemType, id, err := data.SWTokenID2TypeAndItemID(tokenID)
			if err != nil {
				oplog.Debug().Msgf("Invalid tokenID %d", tokenID)
				continue
			}

			if _, ok := updateMap[itemType]; !ok {
				updateMap[itemType] = make([]uint64, 0)
			}
			updateMap[itemType] = append(updateMap[itemType], id)
		}

		for itemType, ids := range updateMap {
			if err := data.DB.Items(sess).MarkNotNew(accountID, itemType, ids...); err != nil {
				log.Error().Msgf("failed updating is_new for items with: %v", err)
				UpdateFailedTasks([]*data.Task{task}, MarkNotNewRetryDelay, MarkNotNewMaxRetries)
				return err
			}
		}

		UpdateCompletedTasks([]*data.Task{task})
	}

	return nil
}
