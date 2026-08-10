package xp

import (
	"fmt"
	"math/big"

	"github.com/google/uuid"
	"github.com/upper/db/v4"

	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/proto"
)

type Updater struct {
	leveller Leveller
}

func NewUpdater(leveller Leveller) *Updater {
	return &Updater{
		leveller: leveller,
	}
}

func (u *Updater) UpdateFromMatch(sess db.Session, match *data.Match, p1, p2 *data.Account, p1NewXP uint64, p2NewXP uint64) ([]*proto.FeedEvent, []*proto.Reward, error) {
	if match == nil {
		return nil, nil, fmt.Errorf("match cannot be nil")
	}

	var events []*proto.FeedEvent

	var rewards []*proto.Reward

	txnType := proto.TransactionType_MATCH

	accountPairs := []struct {
		Account *data.Account
		NewXP   uint64
	}{
		{Account: p1, NewXP: p1NewXP},
		{Account: p2, NewXP: p2NewXP},
	}

	for _, pair := range accountPairs {
		account, newXP := pair.Account, pair.NewXP
		if account == nil {
			continue
		}

		if newXP == 0 {
			continue
		}

		amount := big.NewInt(int64(newXP))

		txnID := fmt.Sprintf("%d-%d", match.ID, account.ID)

		// Match ID can be zero in a case of bot game.
		if match.ID == 0 {
			txnID = fmt.Sprintf("bot-%s", uuid.NewString())
		}

		err := data.DB.Items(sess).GainXP(account.ID, amount, txnType, txnID)
		if err != nil {
			return nil, nil, fmt.Errorf("gain xp: %w", err)
		}

		levelUpEvents, levelUpRewards, err := u.leveller.LevelUp(sess, account)
		if err != nil {
			return nil, nil, fmt.Errorf("level up account %d: %w", account.ID, err)
		}

		events = append(events, levelUpEvents...)
		rewards = append(rewards, levelUpRewards...)
	}

	return events, rewards, nil
}

func (u *Updater) UpdateFromQuest(sess db.Session, accountID proto.AccountID, reward *proto.QuestReward) ([]*proto.FeedEvent, []*proto.Reward, error) {
	if reward == nil {
		return nil, nil, fmt.Errorf("quest reward cannot be nil")
	}

	if reward.ItemType == nil || *reward.ItemType != proto.ItemType_SW_XP {
		return nil, nil, fmt.Errorf("quest reward is not xp, got %s", reward.ItemType)
	}

	if reward.Amount == 0 {
		return nil, nil, fmt.Errorf("quest reward has 0 amount")
	}

	var events []*proto.FeedEvent

	var rewards []*proto.Reward

	txnType := proto.TransactionType_QUEST

	amount := big.NewInt(int64(reward.Amount))

	err := data.DB.Items(sess).GainXP(accountID, amount, txnType, "")
	if err != nil {
		return nil, nil, fmt.Errorf("gain xp: %w", err)
	}

	account, err := data.DB.Accounts(sess).FindByID(accountID)
	if err != nil {
		return nil, nil, fmt.Errorf("find account %d: %w", accountID, err)
	}

	if account == nil {
		return nil, nil, fmt.Errorf("account %d could not be found", accountID)
	}

	levelUpEvents, levelUpRewards, err := u.leveller.LevelUp(sess, account)
	if err != nil {
		return nil, nil, fmt.Errorf("level up account %d: %w", account.ID, err)
	}

	events = append(events, levelUpEvents...)
	rewards = append(rewards, levelUpRewards...)

	return events, rewards, nil
}

//go:generate go run go.uber.org/mock/mockgen -destination ./mock/leveller.go -package mock . Leveller
type Leveller interface {
	LevelUp(db.Session, *data.Account) ([]*proto.FeedEvent, []*proto.Reward, error)
}
