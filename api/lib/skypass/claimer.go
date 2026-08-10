package skypass

import (
	"context"
	"errors"
	"fmt"

	"github.com/upper/db/v4"

	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/proto"
)

var (
	errRewardNotListed      = fmt.Errorf("reward not listed")
	errRewardNotEarned      = fmt.Errorf("reward not earned")
	errRewardNotClaimable   = fmt.Errorf("reward not claimable")
	errRewardClaimedAlready = fmt.Errorf("reward claimed already")
)

// Claimer claims rewards for a player.
type Claimer struct {
	rewardLister  RewardLister
	rewardApplier RewardApplier
}

// NewClaimer instantiates new Claimer.
func NewClaimer(rewardLister RewardLister, rewardApplier RewardApplier) *Claimer {
	return &Claimer{
		rewardLister:  rewardLister,
		rewardApplier: rewardApplier,
	}
}

// ClaimRewards claims rewards for a given account based on reward IDs.
// Only the rewards which are not claimed yet, are claimable and earned will be claimed.
func (c *Claimer) ClaimRewards(ctx context.Context, accountID proto.AccountID, ids []uint64) ([]*proto.Reward, error) {
	gainedRewards, err := c.claimRewards(ctx, accountID, ids)
	if err != nil &&
		!errors.Is(err, errRewardNotListed) &&
		!errors.Is(err, errRewardNotEarned) &&
		!errors.Is(err, errRewardNotClaimable) {
		return c.claimRewards(ctx, accountID, ids)
	}

	return gainedRewards, err
}

func (c *Claimer) claimRewards(ctx context.Context, accountID proto.AccountID, ids []uint64) ([]*proto.Reward, error) {
	var gainedRewards []*proto.Reward

	err := data.DB.TxContext(ctx, func(sess db.Session) error {
		var rewards []*data.SkypassReward

		err := data.DB.SkypassRewards(sess).Find(db.Cond{
			"id": db.AnyOf(ids),
		}).All(&rewards)
		if err != nil && !errors.Is(err, db.ErrNoMoreRows) {
			return fmt.Errorf("find skypass rewards: %w", err)
		}

		listedRewards := make(map[uint64]*proto.SkypassReward)
		earnedRewards := make(map[uint64]bool)

		for _, reward := range rewards {
			if _, ok := listedRewards[reward.ID]; !ok {
				// Keep all rewards of a season for better efficiency in claiming rewards in a batch.
				levels, err := c.rewardLister.ListBySeason(ctx, accountID, reward.Season)
				if err != nil {
					return fmt.Errorf("list rewards: %w", err)
				}

				for _, level := range levels {
					for _, reward := range level.Rewards {
						listedRewards[reward.ID] = reward

						if level.Earned {
							earnedRewards[reward.ID] = true
						}
					}
				}
			}

			listedReward := listedRewards[reward.ID]

			if listedReward == nil {
				return fmt.Errorf("reward ID %d: %w", reward.ID, errRewardNotListed)
			}

			if !earnedRewards[listedReward.ID] {
				return fmt.Errorf("reward ID %d: %w", reward.ID, errRewardNotEarned)
			}

			var newGainedRewards []*proto.Reward

			err := c.canClaim(listedReward)
			if err != nil {
				if !errors.Is(err, errRewardClaimedAlready) {
					return fmt.Errorf("can claim, reward ID %d: %w", reward.ID, err)
				}

				newGainedRewards = listedReward.GainedRewards
			} else {
				newGainedRewards, err = c.rewardApplier.ApplyReward(ctx, sess, accountID, &data.SkypassReward{SkypassReward: listedReward})
				if err != nil {
					return fmt.Errorf("apply reward, reward ID %d: %w", reward.ID, err)
				}
			}

			gainedRewards = append(gainedRewards, newGainedRewards...)

			claim := data.SkypassRewardClaim{
				SkypassRewardID: reward.ID,
				AccountID:       accountID,
				Rewards:         newGainedRewards,
			}

			if err := sess.Save(&claim); err != nil {
				return fmt.Errorf("save claim, reward Id %d: %w", reward.ID, err)
			}
		}

		return nil
	}, nil)
	if err != nil {
		return nil, fmt.Errorf("tx: %w", err)
	}

	return gainedRewards, nil
}

func (c *Claimer) canClaim(listedReward *proto.SkypassReward) error {
	if !listedReward.Claimable {
		return errRewardNotClaimable
	}

	if listedReward.Claimed {
		return errRewardClaimedAlready
	}

	return nil
}

// RewardLister provides list of rewards for an account.
//
//go:generate go run go.uber.org/mock/mockgen -destination ./mock/reward_lister.go -package mock . RewardLister
type RewardLister interface {
	ListBySeason(context.Context, proto.AccountID, uint16) ([]*proto.SkypassLevel, error)
}

// RewardApplier applies reward for an account.
//
//go:generate go run go.uber.org/mock/mockgen -destination ./mock/reward_applier.go -package mock . RewardApplier
type RewardApplier interface {
	ApplyReward(context.Context, db.Session, proto.AccountID, *data.SkypassReward) ([]*proto.Reward, error)
}
