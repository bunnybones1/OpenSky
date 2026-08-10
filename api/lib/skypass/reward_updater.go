package skypass

import (
	"context"
	"encoding/csv"
	"errors"
	"fmt"
	"io"
	"strconv"
	"strings"

	"github.com/scylladb/go-set/u64set"
	"github.com/upper/db/v4"

	"github.com/horizon-games/OpenSky/api/config"
	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/proto"
)

const (
	indexLevel = iota
	indexTier
	indexItemType
	indexAmount
	indexIsStarter
	indexTokenIDs
	indexCardSets
	indexCardSetsExcluded
)

var (
	ErrInvalidLevel            = fmt.Errorf("level is invalid")
	ErrInvalidTier             = fmt.Errorf("tier is invalid")
	ErrInvalidItemType         = fmt.Errorf("item type is invalid")
	ErrInvalidAmount           = fmt.Errorf("amount is invalid")
	ErrInvalidIsStarter        = fmt.Errorf("is starter is invalid")
	ErrInvalidTokenIDs         = fmt.Errorf("token IDs are invalid")
	ErrInvalidCardSets         = fmt.Errorf("card sets are invalid")
	ErrInvalidCardSetsExcluded = fmt.Errorf("card sets excluded are invalid")
)

type CSVRewardUpdater struct {
	cfg config.OpenSkySkypassConfig
}

func NewCSVRewardUpdater(cfg config.OpenSkySkypassConfig) *CSVRewardUpdater {
	return &CSVRewardUpdater{
		cfg: cfg,
	}
}

// UpdateFromReader expects the first line is a header and each line has a format:
// - level
// - tier
// - item type
// - amount
// - is starter (0/1)
// - token IDs (a list separated by comma)
// - card sets (a list separated by comma)
// - card sets excluded (a list separated by comma)
func (u *CSVRewardUpdater) UpdateFromReader(_ context.Context, accountID proto.AccountID, season uint16, r io.Reader) ([]*data.SkypassReward, error) {
	if !u.cfg.DisabledOnlyFutureRewardsUpdateProtection {
		if season <= data.CurrentSeason() {
			return nil, fmt.Errorf("only future season can be updated")
		}
	}

	csvReader := csv.NewReader(r)

	var rewards []*data.SkypassReward

	err := data.DB.Tx(func(sess db.Session) error {
		currentRewards, err := data.DB.SkypassRewards(sess).FindBySeason(season)
		if err != nil && !errors.Is(err, db.ErrNoMoreRows) {
			return fmt.Errorf("find current rewards: %w", err)
		}

		currentRewardsMap := make(map[uint16]map[proto.SkypassTier]map[bool]*data.SkypassReward)
		newRewardsMap := make(map[uint16]map[proto.SkypassTier]map[bool]*data.SkypassReward)
		rewardIDsToDelete := u64set.New()

		for _, reward := range currentRewards {
			if currentRewardsMap[reward.Level] == nil {
				currentRewardsMap[reward.Level] = make(map[proto.SkypassTier]map[bool]*data.SkypassReward)
			}

			if currentRewardsMap[reward.Level][*reward.Tier] == nil {
				currentRewardsMap[reward.Level][*reward.Tier] = make(map[bool]*data.SkypassReward)
			}

			currentRewardsMap[reward.Level][*reward.Tier][reward.IsStarter] = reward
			rewardIDsToDelete.Add(reward.ID)
		}

		var headerReadAlready bool

		var lastReward *data.SkypassReward

		for {
			record, err := csvReader.Read()
			if err != nil {
				if errors.Is(err, io.EOF) {
					break
				}

				return fmt.Errorf("read csv line: %w", err)
			}

			if !headerReadAlready {
				headerReadAlready = true
				continue
			}

			level, err := u.parseLevel(record[indexLevel])
			if err != nil {
				return fmt.Errorf("%w: %v", ErrInvalidLevel, err)
			}

			tier, err := u.parseTier(record[indexTier])
			if err != nil {
				return fmt.Errorf("%w: record {level: %d}: %v", ErrInvalidTier, level, err)
			}

			itemType, err := u.parseItemType(record[indexItemType])
			if err != nil {
				return fmt.Errorf("%w: record {level: %d, tier: %s}: %v", ErrInvalidItemType, level, tier, err)
			}

			amount, err := u.parseAmount(record[indexAmount])
			if err != nil {
				return fmt.Errorf("%w: record {level: %d, tier: %s, itemType: %s}: %v", ErrInvalidAmount, level, tier, itemType, err)
			}

			isStarter, err := u.parseIsStarter(record[indexIsStarter])
			if err != nil {
				return fmt.Errorf("%w: record {level: %d, tier: %s, itemType: %s}: %v", ErrInvalidIsStarter, level, tier, itemType, err)
			}

			reward := &data.SkypassReward{
				SkypassReward: &proto.SkypassReward{
					Level:     level,
					Season:    season,
					Tier:      &tier,
					ItemType:  &itemType,
					Amount:    amount,
					IsStarter: isStarter,
					UpdatedAt: data.TimeNowUTCPtr(),
					UpdatedBy: accountID,
				},
			}

			if currentRewardsMap[level][tier][isStarter] != nil {
				reward.ID = currentRewardsMap[level][tier][isStarter].ID
				rewardIDsToDelete.Remove(reward.ID)
			}

			tokenIDs, err := u.parseTokenIDs(record[indexTokenIDs])
			if err != nil {
				return fmt.Errorf("%w: record {level: %d, tier: %s, itemType: %s}: %v", ErrInvalidTokenIDs, level, tier, itemType, err)
			}

			if len(tokenIDs) > 0 {
				if reward.Attributes == nil {
					reward.Attributes = &proto.SkypassRewardAttributes{}
				}

				reward.Attributes.TokenIDs = tokenIDs
			}

			cardSets, err := u.parseCardSets(record[indexCardSets])
			if err != nil {
				return fmt.Errorf("%w: record {level: %d, tier: %s, itemType: %s}: %v", ErrInvalidCardSets, level, tier, itemType, err)
			}

			if len(cardSets) > 0 {
				if reward.Attributes == nil {
					reward.Attributes = &proto.SkypassRewardAttributes{}
				}

				reward.Attributes.CardSets = cardSets
			}

			cardSetsExcluded, err := u.parseCardSets(record[indexCardSetsExcluded])
			if err != nil {
				return fmt.Errorf("%w: record {level: %d, tier: %s, itemType: %s}: %v", ErrInvalidCardSetsExcluded, level, tier, itemType, err)
			}

			if len(cardSetsExcluded) > 0 {
				if reward.Attributes == nil {
					reward.Attributes = &proto.SkypassRewardAttributes{}
				}

				reward.Attributes.CardSetsExcluded = cardSetsExcluded
			}

			if *reward.ItemType == proto.ItemType_SW_HERO && reward.Attributes != nil && len(reward.Attributes.TokenIDs) > 0 {
				for _, tokenID := range reward.Attributes.TokenIDs {
					deckClass := data.HeroDeckClass(proto.Hero(tokenID))

					if data.HasStarterDeck(deckClass) {
						reward.Attributes.UnlockDeckClasses = append(reward.Attributes.UnlockDeckClasses, &deckClass)
					}
				}
			}

			if newRewardsMap[reward.Level] == nil {
				newRewardsMap[reward.Level] = make(map[proto.SkypassTier]map[bool]*data.SkypassReward)
			}

			if newRewardsMap[reward.Level][*reward.Tier] == nil {
				newRewardsMap[reward.Level][*reward.Tier] = make(map[bool]*data.SkypassReward)
			}

			if newRewardsMap[reward.Level][*reward.Tier][reward.IsStarter] != nil {
				return fmt.Errorf("reward duplicated: record {level: %d, tier: %s, itemType: %s}: ", level, tier, itemType)
			}

			newRewardsMap[reward.Level][*reward.Tier][reward.IsStarter] = reward

			rewards = append(rewards, reward)

			lastReward = reward
		}

		lastReward.IsInfinite = true

		for _, reward := range rewards {
			if err := sess.Save(reward); err != nil {
				return fmt.Errorf("save reward: record {level: %d, tier: %s, itemType: %s}: %w", reward.Level, reward.Tier, reward.ItemType, err)
			}
		}

		err = data.DB.SkypassRewards(sess).Find(db.Cond{"id": db.AnyOf(rewardIDsToDelete.List())}).Delete()
		if err != nil {
			return fmt.Errorf("delete missing rewards: %w", err)
		}

		return nil
	})
	if err != nil {
		return nil, err
	}

	return rewards, nil
}

func (u *CSVRewardUpdater) parseLevel(input string) (level uint16, err error) {
	input = strings.TrimSpace(input)

	if len(input) > 0 {
		levelUint, err := strconv.ParseUint(input, 10, 64)
		if err != nil {
			return level, fmt.Errorf("convert string to uint: %w", err)
		}

		level = uint16(levelUint)
	} else {
		return level, fmt.Errorf("it is empty")
	}

	return level, nil
}

func (u *CSVRewardUpdater) parseTier(input string) (tier proto.SkypassTier, err error) {
	input = strings.TrimSpace(input)

	tier = proto.SkypassTier(proto.SkypassTier_value[input])

	if tier == proto.SkypassTier_UNKNOWN {
		return tier, fmt.Errorf("unsupported tier %q", input)
	}

	return tier, nil
}

func (u *CSVRewardUpdater) parseItemType(input string) (itemType proto.ItemType, err error) {
	input = strings.TrimSpace(input)

	itemType = proto.ItemType(proto.ItemType_value[input])

	if itemType == proto.ItemType_UNKNOWN {
		return itemType, fmt.Errorf("unsupported item type %q", input)
	}

	return itemType, nil
}

func (u *CSVRewardUpdater) parseAmount(input string) (amount uint16, err error) {
	input = strings.TrimSpace(input)

	if len(input) > 0 {
		amountUint, err := strconv.ParseUint(input, 10, 64)
		if err != nil {
			return amount, fmt.Errorf("convert string to uint: %w", err)
		}

		amount = uint16(amountUint)
	}

	return amount, nil
}

func (u *CSVRewardUpdater) parseIsStarter(input string) (isStarter bool, err error) {
	input = strings.TrimSpace(input)

	if len(input) > 0 {
		isStarter, err = strconv.ParseBool(input)
		if err != nil {
			return isStarter, fmt.Errorf("convert string to bool: %w", err)
		}
	}

	return isStarter, nil
}

func (u *CSVRewardUpdater) parseTokenIDs(input string) (tokenIDs []uint64, err error) {
	input = strings.TrimSpace(input)

	for _, id := range strings.Split(input, ",") {
		id = strings.TrimSpace(id)

		if len(id) > 0 {
			idUint, err := strconv.ParseUint(id, 10, 64)
			if err != nil {
				return tokenIDs, fmt.Errorf("convert string to uint: %w", err)
			}

			tokenIDs = append(tokenIDs, idUint)
		}
	}

	return tokenIDs, nil
}

func (u *CSVRewardUpdater) parseCardSets(input string) (cardSets []*proto.CardSet, err error) {
	input = strings.TrimSpace(input)

	for _, name := range strings.Split(input, ",") {
		name = strings.TrimSpace(name)

		if len(name) > 0 {
			cardSet := proto.CardSet(proto.CardSet_value[name])

			if cardSet == proto.CardSet_UNKNOWN {
				return cardSets, fmt.Errorf("unsupported card set %q", name)
			}

			cardSets = append(cardSets, &cardSet)
		}
	}

	return cardSets, nil
}
