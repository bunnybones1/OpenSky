package data

import (
	"errors"
	"fmt"

	"github.com/upper/db/v4"

	"github.com/horizon-games/OpenSky/api/proto"
)

type SkypassReward struct {
	*proto.SkypassReward
}

func (s *SkypassReward) Store(sess db.Session) db.Store {
	return DB.SkypassRewards(sess)
}

func (s *SkypassReward) Validate() error {
	if s.Season == 0 {
		return fmt.Errorf("season cannot be zero")
	}

	if s.Tier == nil || *s.Tier == proto.SkypassTier_UNKNOWN {
		return fmt.Errorf("tier is invalid")
	}

	if s.Amount == 0 && (s.Attributes == nil || len(s.Attributes.TokenIDs) == 0) {
		return fmt.Errorf("amount cannot be zero when without token IDs")
	}

	if s.Amount > 0 && s.Attributes != nil && len(s.Attributes.TokenIDs) > 0 {
		return fmt.Errorf("amount cannot be greater than zero when there are token IDs")
	}

	if s.Attributes != nil {
		if len(s.Attributes.CardSets) > 0 && len(s.Attributes.CardSetsExcluded) > 0 {
			for _, cardSet := range s.Attributes.CardSets {
				for _, excludedCardSet := range s.Attributes.CardSetsExcluded {
					if cardSet == excludedCardSet {
						return fmt.Errorf("the same card set cannot be in both card sets and excluded card sets: %s", *cardSet)
					}
				}
			}
		}
	}

	if s.IsStarter && *s.Tier != proto.SkypassTier_FREE {
		return fmt.Errorf("only free tier can be a starter")
	}

	switch *s.ItemType {
	case proto.ItemType_UNKNOWN:
		return fmt.Errorf("item type is invalid")
	case proto.ItemType_SW_HERO:
		if s.Attributes == nil || len(s.Attributes.TokenIDs) == 0 {
			return fmt.Errorf("requires token IDs")
		}

		for _, tokenID := range s.Attributes.TokenIDs {
			if _, ok := proto.Hero_name[uint16(tokenID)]; !ok {
				return fmt.Errorf("hero does not exist: %d", tokenID)
			}
		}
	case proto.ItemType_SW_CONQUEST_TICKET:
		if s.Amount == 0 {
			return fmt.Errorf("amount cannot be zero")
		}
	case proto.ItemType_SW_STICKERS:
		if s.Attributes == nil || len(s.Attributes.TokenIDs) == 0 {
			return fmt.Errorf("requires token IDs")
		}

		var onChainTokenIDs []uint64

		for _, tokenID := range s.Attributes.TokenIDs {
			onChainTokenIDs = append(onChainTokenIDs, ItemTypeAndID2SWTokenID(proto.ItemType_SW_STICKERS, tokenID))
		}

		stickers, err := DB.Stickers().FindAll(db.Cond{"token_id": db.AnyOf(onChainTokenIDs)})
		if err != nil && !errors.Is(err, db.ErrNoMoreRows) {
			return fmt.Errorf("find stickers: %w", err)
		}

		if len(onChainTokenIDs) != len(stickers) {
			return fmt.Errorf("sticker does not exist")
		}
	case proto.ItemType_SW_STICKER_POINTS:
		if s.Amount == 0 {
			return fmt.Errorf("amount cannot be zero")
		}
	case proto.ItemType_SW_BASE_CARDS, proto.ItemType_SW_SILVER_CARDS:
		if s.Attributes != nil && len(s.Attributes.TokenIDs) > 0 {
			for _, tokenID := range s.Attributes.TokenIDs {
				card := CardIndex.GetCardByID(tokenID)
				if card == nil {
					return fmt.Errorf("card does not exist: %d", tokenID)
				}
			}
		}
	case proto.ItemType_SW_CARD_BACKS:
		if s.Attributes == nil || len(s.Attributes.TokenIDs) == 0 {
			return fmt.Errorf("requires token IDs")
		}
	}

	return nil
}

var (
	_ interface {
		db.Record
		db.Validator
	} = &SkypassReward{}
)

type SkypassRewardsStore struct {
	db.Collection
}

func (s *SkypassRewardsStore) FindBySeason(season uint16) ([]*SkypassReward, error) {
	var rewards []*SkypassReward

	err := s.Find(db.Cond{"season": season}).OrderBy("tier").All(&rewards)
	if err != nil {
		return nil, fmt.Errorf("find skypass rewards: %w", err)
	}

	return rewards, nil
}

func (s *SkypassRewardsStore) FindByIDs(ids []uint64) ([]*SkypassReward, error) {
	var rewards []*SkypassReward

	err := s.Find(db.Cond{"id": db.AnyOf(ids)}).All(&rewards)
	if err != nil {
		return nil, fmt.Errorf("find skypass rewards: %w", err)
	}

	return rewards, nil
}
