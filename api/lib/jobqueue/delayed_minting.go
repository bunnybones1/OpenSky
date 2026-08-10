package jobqueue

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/upper/db/v4"

	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/proto"
)

// DelayedMinting task is used when a user finishes/exists their conquest,
// and we then distribute / mint their rewards.

const (
	DefaultMintingDelay      = 24 * time.Hour
	DelayedMintingQueue      = "delayed-minting"
	DelayedMintingRetryDelay = 30 // in seconds
	DelayedMintingMaxRetries = 5
)

var mintingDelay time.Duration

type DelayedMintingTask struct {
	AccountID      proto.AccountID `json:"account_id"`
	AccountAddress proto.Hash      `json:"account_address"`
	Nonce          uint64          `json:"nonce,omitempty"`
	TokenIDs       []uint64        `json:"token_ids"`
}

func (t DelayedMintingTask) Hash() string {
	return fmt.Sprintf("%d:%d", t.AccountID, t.Nonce)
}

func scheduleDelayedMinting(sess db.Session, task *data.Task) error {
	if task.Queue != ExitConquestQueue {
		return nil
	}

	var payload ExitConquestTask

	err := json.Unmarshal(task.Payload, &payload)
	if err != nil {
		return fmt.Errorf("json.Unmarshal: %w", err)
	}

	// no gold cards to mint
	if len(payload.GoldCardIDs) == 0 {
		return nil
	}

	accountID, err := getAccountID(sess, payload.AccountID, payload.AccountAddress)
	if err != nil {
		return fmt.Errorf("getAccountID: %w", err)
	}

	account, err := data.DB.Accounts(sess).FindByID(accountID)
	if err != nil {
		return fmt.Errorf("FindByID: %w", err)
	}

	taskStatus := proto.TaskStatus_PENDING

	if account.Status == proto.AccountStatus_BANNED || account.Status == proto.AccountStatus_FLAGGED {
		taskStatus = proto.TaskStatus_DISABLED
	}

	runAt := data.TimeNowUTC().Add(mintingDelay)

	err = data.DB.Tasks(sess).EnqueueTask(DelayedMintingQueue, DelayedMintingTask{
		AccountID: accountID,
		Nonce:     payload.Nonce,
		TokenIDs:  payload.GoldCardIDs,
	}, &runAt, task.AccountID, taskStatus)
	if err != nil {
		return fmt.Errorf("EnqueueTask: %w", err)
	}

	return nil
}

func createDelayedMintingFeedEntry(sess db.Session, task *data.Task) error {
	if task.Queue != DelayedMintingQueue {
		return nil
	}

	var payload DelayedMintingTask
	err := json.Unmarshal(task.Payload, &payload)
	if err != nil {
		return err
	}

	accountID, err := getAccountID(sess, payload.AccountID, payload.AccountAddress)
	if err != nil {
		return fmt.Errorf("get account ID: %w", err)
	}

	err = sess.Save(&data.FeedEvent{
		FeedEvent: &proto.FeedEvent{
			AccountID: accountID,
			TokenIDs:  payload.TokenIDs,
			Type:      proto.FeedEventType_DELAYED_REWARD_MINTED,
		},
	})

	return err
}
