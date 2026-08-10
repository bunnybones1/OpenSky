package skypass

import (
	"context"
	"fmt"
	"sort"

	"github.com/upper/db/v4"

	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/proto"
)

var adaptiveStarterRewards = map[proto.ItemType]bool{
	proto.ItemType_SW_HERO:   true,
	proto.ItemType_SW_TITLES: true,
}

// Lister lists rewards for a player.
type Lister struct {
	ruleAppliers []ListerRuleApplier
}

// NewLister instantiates new Lister.
func NewLister(ruleAppliers ...ListerRuleApplier) *Lister {
	return &Lister{
		ruleAppliers: ruleAppliers,
	}
}

// ListBySeason lists rewards for a given account and season.
// Each reward is adapted to a particular player based on season progress, premium pass, etc.
func (l *Lister) ListBySeason(ctx context.Context, accountID proto.AccountID, season uint16) ([]*proto.SkypassLevel, error) {
	var levels []*proto.SkypassLevel

	err := data.DB.TxContext(ctx, func(sess db.Session) error {
		rewards, err := data.DB.SkypassRewards(sess).FindBySeason(season)
		if err != nil {
			return fmt.Errorf("find skypass rewards by season: %w", err)
		}

		err = l.setClaimed(sess, accountID, rewards)
		if err != nil {
			return fmt.Errorf("set claimed rewards: %w", err)
		}

		seasonStat, err := data.DB.SkypassSeasonStats(sess).FindOrCreate(accountID, season)
		if err != nil {
			return fmt.Errorf("find or create skypass season stat: %w", err)
		}

		if adaptiveStarterRewards[proto.ItemType_SW_HERO] {
			// It is necessary not to list hero rewards when the account already owns it from the past.
			rewards, err = l.removeUnclaimedButUnlockedHeroes(sess, rewards, accountID)
			if err != nil {
				return fmt.Errorf("remove unclaimed but unlocked heroes: %w", err)
			}
		}

		if adaptiveStarterRewards[proto.ItemType_SW_TITLES] {
			// It is necessary not to list title rewards when the account already owns it from the past.
			rewards, err = l.removeUnclaimedButOwnedTitles(sess, rewards, accountID)
			if err != nil {
				return fmt.Errorf("remove unclaimed but owned titles: %w", err)
			}
		}

		rewards, err = l.handleInfinities(sess, rewards, seasonStat)
		if err != nil {
			return fmt.Errorf("handle infinities: %w", err)
		}

		l.setClaimable(rewards, seasonStat)

		rewards = l.adaptStarterToPreviousSeasons(rewards, seasonStat)

		levels = l.createLevels(rewards, seasonStat)

		l.replaceFreeByStarter(levels)

		if len(l.ruleAppliers) > 0 {
			for i := 0; i < len(l.ruleAppliers); i++ {
				levels, err = l.ruleAppliers[i].Apply(ctx, accountID, levels, seasonStat)
				if err != nil {
					return fmt.Errorf("apply rule: %w", err)
				}
			}
		}

		sort.SliceStable(levels, func(i, j int) bool {
			return levels[i].Level < levels[j].Level
		})

		for _, level := range levels {
			sort.SliceStable(level.Rewards, func(i, j int) bool {
				if level.Rewards[i].Tier != level.Rewards[j].Tier {
					return *level.Rewards[i].Tier < *level.Rewards[j].Tier
				}

				return !level.Rewards[i].IsStarter
			})
		}

		return nil
	}, nil)
	if err != nil {
		return nil, err
	}

	return levels, nil
}

func (l *Lister) setClaimed(sess db.Session, accountID proto.AccountID, rewards []*data.SkypassReward) error {
	var ids []uint64

	for _, reward := range rewards {
		ids = append(ids, reward.ID)
	}

	var claims []*data.SkypassRewardClaim

	err := data.DB.SkypassRewardsClaims(sess).Find(db.Cond{
		"skypass_rewards_id": db.AnyOf(ids),
		"account_id":         accountID,
	}).All(&claims)
	if err != nil {
		return fmt.Errorf("find reward claims: %w", err)
	}

	claimedMap := make(map[uint64]bool)
	gainedRewardsMap := make(map[uint64][]*proto.Reward)

	for _, claim := range claims {
		claimedMap[claim.SkypassRewardID] = true
		gainedRewardsMap[claim.SkypassRewardID] = claim.Rewards
	}

	for _, reward := range rewards {
		reward.Claimed = claimedMap[reward.ID]

		if gainedRewards, ok := gainedRewardsMap[reward.ID]; ok {
			reward.GainedRewards = gainedRewards
		}
	}

	return nil
}

func (l *Lister) removeUnclaimedButUnlockedHeroes(sess db.Session, rewards []*data.SkypassReward, accountID proto.AccountID) ([]*data.SkypassReward, error) {
	items, err := data.DB.Items(sess).FindAccountItems(accountID, proto.ItemType_SW_HERO)
	if err != nil {
		return nil, fmt.Errorf("find account items: %w", err)
	}

	unlockedHeroes := map[uint64]bool{}

	for _, item := range items {
		unlockedHeroes[item.TokenID] = true
	}

	var decks []*data.Deck

	err = data.DB.Decks(sess).Find(db.Cond{"account_id": accountID, "deck_type": proto.DeckType_LOCKED_STARTER}).All(&decks)
	if err != nil {
		return nil, fmt.Errorf("find decks: %w", err)
	}

	lockedDecks := map[proto.DeckClass]bool{}

	for _, deck := range decks {
		lockedDecks[deck.Class] = true
	}

	filteredRewards := make([]*data.SkypassReward, 0, len(rewards))

	for _, reward := range rewards {
		if *reward.ItemType == proto.ItemType_SW_HERO && !reward.Claimed {
			var isUnlocked bool

			for _, tokenID := range reward.Attributes.TokenIDs {
				if unlockedHeroes[tokenID] {
					hero := proto.Hero(tokenID)
					deckClass := data.HeroDeckClass(hero)

					if data.HasStarterDeck(deckClass) {
						if !lockedDecks[deckClass] {
							isUnlocked = true

							break
						}
					} else {
						isUnlocked = true

						break
					}
				}
			}

			if isUnlocked {
				continue
			}
		}

		filteredRewards = append(filteredRewards, reward)
	}

	return filteredRewards, nil
}

func (l *Lister) removeUnclaimedButOwnedTitles(sess db.Session, rewards []*data.SkypassReward, accountID proto.AccountID) ([]*data.SkypassReward, error) {
	items, err := data.DB.Items(sess).FindAccountItems(accountID, proto.ItemType_SW_TITLES)
	if err != nil {
		return nil, fmt.Errorf("find account items: %w", err)
	}

	unlockedTitles := map[uint64]bool{}

	for _, item := range items {
		unlockedTitles[item.TokenID] = true
	}

	filteredRewards := make([]*data.SkypassReward, 0, len(rewards))

	for _, reward := range rewards {
		if *reward.ItemType == proto.ItemType_SW_TITLES && !reward.Claimed {
			var isOwned bool

			for _, tokenID := range reward.Attributes.TokenIDs {
				if unlockedTitles[tokenID] {
					isOwned = true

					break
				}
			}

			if isOwned {
				continue
			}
		}

		filteredRewards = append(filteredRewards, reward)
	}

	return filteredRewards, nil
}

func (l *Lister) handleInfinities(sess db.Session, rewards []*data.SkypassReward, stat *data.SkypassSeasonStat) ([]*data.SkypassReward, error) {
	expectedMaxInfiniteLevel := stat.LevelProgress() + 1

	var foundMaxInfiniteLevel uint16

	var levelsWithRewards = make(map[uint16]struct{})

	var infiniteReward *data.SkypassReward

	i := 0

	for _, reward := range rewards {
		if reward.IsInfinite && reward.Level > foundMaxInfiniteLevel {
			foundMaxInfiniteLevel = reward.Level
		}

		if !reward.IsInfinite || reward.Level <= expectedMaxInfiniteLevel {
			rewards[i] = reward
			levelsWithRewards[reward.Level] = struct{}{}
			i++
		}

		if infiniteReward == nil && reward.IsInfinite {
			infiniteReward = reward
		}
	}

	for j := i; j < len(rewards); j++ {
		rewards[j] = nil
	}

	rewards = rewards[:i]

	if infiniteReward != nil {
		for i := foundMaxInfiniteLevel + 1; i <= expectedMaxInfiniteLevel; i++ {
			if _, ok := levelsWithRewards[i]; ok {
				continue
			}

			newReward := &data.SkypassReward{SkypassReward: &proto.SkypassReward{}}
			*newReward.SkypassReward = *infiniteReward.SkypassReward
			newReward.ID = 0
			newReward.Level = i
			newReward.UpdatedAt = nil

			err := sess.Save(newReward)
			if err != nil {
				return nil, fmt.Errorf("save new reward: %w", err)
			}

			rewards = append(rewards, newReward)
		}
	}

	return rewards, nil
}

func (l *Lister) setClaimable(rewards []*data.SkypassReward, stat *data.SkypassSeasonStat) {
	for _, reward := range rewards {
		switch *reward.Tier {
		case proto.SkypassTier_FREE:
			reward.Claimable = true
		case proto.SkypassTier_PREMIUM:
			if stat.HasPremium {
				reward.Claimable = true
			}
		}
	}
}

func (l *Lister) adaptStarterToPreviousSeasons(rewards []*data.SkypassReward, stat *data.SkypassSeasonStat) []*data.SkypassReward {
	var adaptedRewards []*data.SkypassReward

	for _, reward := range rewards {
		if reward.IsStarter {
			if int(reward.Level)-int(stat.InitialAccountLevel) <= 0 {
				if !adaptiveStarterRewards[*reward.ItemType] {
					continue
				}

				reward.Level = stat.InitialAccountLevel
			}

			reward.Level -= stat.InitialAccountLevel
		}

		adaptedRewards = append(adaptedRewards, reward)
	}

	return adaptedRewards
}

func (l *Lister) createLevels(rewards []*data.SkypassReward, stat *data.SkypassSeasonStat) []*proto.SkypassLevel {
	grouped := make(map[uint16][]*data.SkypassReward)

	for _, reward := range rewards {
		if _, ok := grouped[reward.Level]; !ok {
			grouped[reward.Level] = make([]*data.SkypassReward, 0)
		}

		grouped[reward.Level] = append(grouped[reward.Level], reward)
	}

	levelSlice := make([]*proto.SkypassLevel, 0)

	for level, rewards := range grouped {
		skypassLevel := &proto.SkypassLevel{
			Level:   level,
			Earned:  level <= stat.LevelProgress(),
			Rewards: nil,
		}

		for _, reward := range rewards {
			skypassLevel.Rewards = append(skypassLevel.Rewards, reward.SkypassReward)
		}

		levelSlice = append(levelSlice, skypassLevel)
	}

	return levelSlice
}

func (l *Lister) replaceFreeByStarter(levels []*proto.SkypassLevel) {
	for _, level := range levels {
		rewardsByTier := make(map[proto.SkypassTier]*proto.SkypassReward)

		var rewardsWithDisabledReplacement []*proto.SkypassReward

		for _, reward := range level.Rewards {
			if level.Level == 0 && adaptiveStarterRewards[*reward.ItemType] {
				rewardsWithDisabledReplacement = append(rewardsWithDisabledReplacement, reward)
				continue
			}

			if *reward.Tier == proto.SkypassTier_FREE {
				if _, ok := rewardsByTier[*reward.Tier]; ok {
					if !reward.IsStarter {
						continue
					}
				}
			}

			rewardsByTier[*reward.Tier] = reward
		}

		level.Rewards = nil

		for _, reward := range rewardsByTier {
			level.Rewards = append(level.Rewards, reward)
		}

		level.Rewards = append(level.Rewards, rewardsWithDisabledReplacement...)
	}
}

// ListerRuleApplier applies a rule to rewards.
//
//go:generate go run go.uber.org/mock/mockgen -destination ./mock/lister_rule_applier.go -package mock . ListerRuleApplier
type ListerRuleApplier interface {
	Apply(context.Context, proto.AccountID, []*proto.SkypassLevel, *data.SkypassSeasonStat) ([]*proto.SkypassLevel, error)
}
