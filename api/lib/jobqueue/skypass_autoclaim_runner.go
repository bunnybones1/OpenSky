package jobqueue

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/rs/zerolog/log"
	"github.com/upper/db/v4"

	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/proto"
)

type SkypassAutoClaimTask struct {
	AccountID      proto.AccountID `json:"account_id"`
	AccountAddress proto.Hash
	Season         uint16 `json:"season"`
}

func (t SkypassAutoClaimTask) Hash() string {
	return fmt.Sprintf("%d.%d", t.AccountID, t.Season)
}

const (
	SkypassAutoClaimWorkGroup  = "skypass-autoclaim"
	SkypassAutoClaimRetryDelay = 5 // in seconds
	SkypassAutoClaimMaxRetries = 5
)

type SkypassAutoClaimRunner struct {
	ticker *time.Ticker

	rewardLister  SkypassRewardLister
	rewardClaimer SkypassRewardClaimer
}

func NewSkypassAutoClaimRunner(rewardLister SkypassRewardLister, rewardClaimer SkypassRewardClaimer) *SkypassAutoClaimRunner {
	return &SkypassAutoClaimRunner{
		rewardLister:  rewardLister,
		rewardClaimer: rewardClaimer,
	}
}

func (r *SkypassAutoClaimRunner) WorkGroup() string {
	return SkypassAutoClaimWorkGroup
}

func (r *SkypassAutoClaimRunner) Queues() []string {
	return []string{SkypassAutoClaimWorkGroup}
}

func (r *SkypassAutoClaimRunner) MaxBatchSize() int {
	return 10
}

func (r *SkypassAutoClaimRunner) Tick() <-chan time.Time {
	if r.ticker == nil {
		r.ticker = time.NewTicker(time.Minute)
	}

	return r.ticker.C
}

func (r *SkypassAutoClaimRunner) RunTasks(ctx context.Context, sess db.Session, tasks []*data.Task) error {
	for _, task := range tasks {
		var taskPayload SkypassAutoClaimTask

		if err := json.Unmarshal(task.Payload, &taskPayload); err != nil {
			UpdateFailedTasks(tasks, SkypassAutoClaimRetryDelay, SkypassAutoClaimMaxRetries)
			return fmt.Errorf("decode task payload: %w", err)
		}

		accountID, err := getAccountID(sess, taskPayload.AccountID, taskPayload.AccountAddress)
		if err != nil {
			log.Err(err).Msgf("get account ID")
			UpdateFailedTasks([]*data.Task{task}, 0, 0)

			continue
		}

		seasonStat, err := data.DB.SkypassSeasonStats(sess).FindOrCreate(accountID, taskPayload.Season)
		if err != nil {
			UpdateFailedTasks([]*data.Task{task}, SkypassAutoClaimRetryDelay, SkypassAutoClaimMaxRetries)
			return fmt.Errorf("find season stats: %w", err)
		}

		seasonStat.AutoClaimed = true

		if err := sess.Save(seasonStat); err != nil {
			UpdateFailedTasks([]*data.Task{task}, SkypassAutoClaimRetryDelay, SkypassAutoClaimMaxRetries)
			return fmt.Errorf("save season stats: %w", err)
		}

		task.Status = proto.TaskStatus_COMPLETED

		rewardLevels, err := r.rewardLister.ListBySeason(ctx, accountID, taskPayload.Season)
		if err != nil {
			UpdateFailedTasks([]*data.Task{task}, SkypassAutoClaimRetryDelay, SkypassAutoClaimMaxRetries)
			return fmt.Errorf("list rewards: %w", err)
		}

		var rewardIDsToClaim []uint64

		for _, level := range rewardLevels {
			if !level.Earned {
				continue
			}

			for _, reward := range level.Rewards {
				if !reward.Claimable {
					continue
				}

				if reward.Claimed {
					continue
				}

				rewardIDsToClaim = append(rewardIDsToClaim, reward.ID)
			}
		}

		if len(rewardIDsToClaim) == 0 {
			continue
		}

		_, err = r.rewardClaimer.ClaimRewards(ctx, accountID, rewardIDsToClaim)
		if err != nil {
			UpdateFailedTasks([]*data.Task{task}, SkypassAutoClaimRetryDelay, SkypassAutoClaimMaxRetries)
			return fmt.Errorf("claim rewards: %w", err)
		}

		notificationData := map[string]string{
			"title":      "ALL AVAILABLE UNCLAIMED REWARDS WERE AUTO-CLAIMED!",
			"subtitle":   fmt.Sprintf("SKYPASS SEASON %d: %s COMPLETE!", taskPayload.Season, strings.ToUpper(data.SeasonName(taskPayload.Season))),
			"background": "webapp/backgrounds/spbg-all-claimed.webp",
		}

		b, err := json.Marshal(notificationData)
		if err != nil {
			UpdateFailedTasks([]*data.Task{task}, 0, 0)
			return fmt.Errorf("encode notification data: %w", err)
		}

		_, err = data.DB.Notifications(sess).CreateOneTimeNotification(&proto.NotificationOneTime{
			Name: "Autoclaimed Rewards",
			Data: &proto.NotificationOneTimeData{
				RawMessage: b,
			},
		}, accountID)
		if err != nil {
			UpdateFailedTasks([]*data.Task{task}, SkypassAutoClaimRetryDelay, SkypassAutoClaimMaxRetries)
			return fmt.Errorf("create notification: %w", err)
		}

		UpdateCompletedTasks([]*data.Task{task})
	}

	return nil
}

// SkypassRewardLister provides list of rewards for an account.
//
//go:generate go run go.uber.org/mock/mockgen -destination ./mock/skypass_reward_lister.go -package mock . SkypassRewardLister
type SkypassRewardLister interface {
	ListBySeason(context.Context, proto.AccountID, uint16) ([]*proto.SkypassLevel, error)
}

// SkypassRewardClaimer claims rewards for an account.
//
//go:generate go run go.uber.org/mock/mockgen -destination ./mock/skypass_reward_claimer.go -package mock . SkypassRewardClaimer
type SkypassRewardClaimer interface {
	ClaimRewards(context.Context, proto.AccountID, []uint64) ([]*proto.Reward, error)
}
