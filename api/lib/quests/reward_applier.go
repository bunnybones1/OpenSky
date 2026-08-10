package quests

import (
	"fmt"

	"github.com/upper/db/v4"

	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/lib/levels"
	"github.com/horizon-games/OpenSky/api/proto"
)

type RewardApplierImpl struct {
	xpUpdater XPUpdater
}

func NewRewardApplier(xpUpdater XPUpdater) *RewardApplierImpl {
	return &RewardApplierImpl{
		xpUpdater: xpUpdater,
	}
}

func (a *RewardApplierImpl) ApplyReward(sess db.Session, accountID proto.AccountID, reward *proto.QuestReward) ([]*proto.Reward, error) {
	var gainedRewards []*proto.Reward

	var events []*data.FeedEvent

	var err error

	switch *reward.ItemType {
	case proto.ItemType_SW_XP:
		gainedRewards, events, err = a.applyXP(sess, accountID, reward)
		if err != nil {
			return nil, fmt.Errorf("apply xp: %w", err)
		}
	default:
		return nil, fmt.Errorf("unsupported item type %q", reward.ItemType)
	}

	for _, event := range events {
		if err := sess.Save(event); err != nil {
			return nil, fmt.Errorf("save feed event: %w", err)
		}
	}

	return gainedRewards, nil
}

func (a *RewardApplierImpl) applyXP(sess db.Session, accountID proto.AccountID, reward *proto.QuestReward) ([]*proto.Reward, []*data.FeedEvent, error) {
	var events []*data.FeedEvent

	var gainedRewards []*proto.Reward

	xpBefore, err := data.DB.Items(sess).GetXP(accountID)
	if err != nil {
		return nil, nil, fmt.Errorf("get xp before: %w", err)
	}

	newEvents, newRewards, err := a.xpUpdater.UpdateFromQuest(sess, accountID, reward)
	if err != nil {
		return nil, nil, fmt.Errorf("update xp from quest: %w", err)
	}

	for _, event := range newEvents {
		events = append(events, &data.FeedEvent{FeedEvent: event})
	}

	gainedRewards = append(gainedRewards, newRewards...)

	statsAfter, err := data.DB.SkypassSeasonStats(sess).FindOrCreate(accountID, data.CurrentSeason())
	if err != nil {
		return nil, nil, fmt.Errorf("find season stats after: %w", err)
	}

	gainedRewards = append(gainedRewards, &proto.Reward{
		AccountID: accountID,
		Type:      proto.RewardType_EXP,
		Exp: &proto.RewardExp{
			Amount:         uint64(reward.Amount),
			CurrentLevel:   statsAfter.LevelProgress(),
			RequiredExp:    levels.LevelUpXP(statsAfter.LevelProgress()),
			BeforeMatchExp: xpBefore,
		},
	})

	return gainedRewards, events, nil
}

//go:generate go run go.uber.org/mock/mockgen -destination ./mock/xp_updater.go -package mock . XPUpdater
type XPUpdater interface {
	UpdateFromQuest(db.Session, proto.AccountID, *proto.QuestReward) ([]*proto.FeedEvent, []*proto.Reward, error)
}
