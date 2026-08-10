package data

import (
	"fmt"

	"github.com/upper/db/v4"

	"github.com/horizon-games/OpenSky/api/proto"
)

var (
	heroDeckClass = map[proto.Hero]proto.DeckClass{
		proto.Hero_ADA:    proto.DeckClass_STR,
		proto.Hero_SAMYA:  proto.DeckClass_AGY,
		proto.Hero_FOX:    proto.DeckClass_STA,
		proto.Hero_LOTUS:  proto.DeckClass_WIS,
		proto.Hero_TITUS:  proto.DeckClass_STW,
		proto.Hero_IRIS:   proto.DeckClass_AGW,
		proto.Hero_BOURAN: proto.DeckClass_HRT,
		proto.Hero_HORIK:  proto.DeckClass_STH,
		proto.Hero_ZOEY:   proto.DeckClass_HRA,
		proto.Hero_AXEL:   proto.DeckClass_HRW,
		proto.Hero_ARI:    proto.DeckClass_INT,
		proto.Hero_MIRA:   proto.DeckClass_STI,
		proto.Hero_MAI:    proto.DeckClass_AGI,
		proto.Hero_BANJO:  proto.DeckClass_INW,
		proto.Hero_SITTI:  proto.DeckClass_HRI,
	}

	deckClassHero = map[proto.DeckClass]proto.Hero{
		proto.DeckClass_STR: proto.Hero_ADA,
		proto.DeckClass_AGY: proto.Hero_SAMYA,
		proto.DeckClass_STA: proto.Hero_FOX,
		proto.DeckClass_WIS: proto.Hero_LOTUS,
		proto.DeckClass_STW: proto.Hero_TITUS,
		proto.DeckClass_AGW: proto.Hero_IRIS,
		proto.DeckClass_HRT: proto.Hero_BOURAN,
		proto.DeckClass_STH: proto.Hero_HORIK,
		proto.DeckClass_HRA: proto.Hero_ZOEY,
		proto.DeckClass_HRW: proto.Hero_AXEL,
		proto.DeckClass_INT: proto.Hero_ARI,
		proto.DeckClass_STI: proto.Hero_MIRA,
		proto.DeckClass_AGI: proto.Hero_MAI,
		proto.DeckClass_INW: proto.Hero_BANJO,
		proto.DeckClass_HRI: proto.Hero_SITTI,
	}
)

func ListHeroesByLevel(sess db.Session) (map[uint16][]proto.Hero, error) {
	var rewards []*SkypassReward

	err := DB.SkypassRewards(sess).Find(db.Cond{
		"item_type": proto.ItemType_SW_HERO,
		"season":    CurrentSeason(),
	}).All(&rewards)
	if err != nil {
		return nil, fmt.Errorf("list hero skypass rewards: %w", err)
	}

	heroes := make(map[uint16][]proto.Hero)

	for _, reward := range rewards {
		if heroes[reward.Level] == nil {
			heroes[reward.Level] = make([]proto.Hero, 0)
		}

		if reward.Attributes != nil {
			for _, tokenID := range reward.Attributes.TokenIDs {
				heroes[reward.Level] = append(heroes[reward.Level], proto.Hero(tokenID))
			}
		}
	}

	return heroes, nil
}

func ListLevelsByHero(sess db.Session) (map[string]uint16, error) {
	heroesByLevel, err := ListHeroesByLevel(sess)
	if err != nil {
		return nil, fmt.Errorf("list heroes by level: %w", err)
	}

	unlocks := make(map[string]uint16)

	for level, heroes := range heroesByLevel {
		for _, hero := range heroes {
			unlocks[hero.String()] = level
		}
	}

	return unlocks, nil
}

func ListHeroesInLevel(sess db.Session, lvl uint16) ([]proto.Hero, error) {
	var rewards []*SkypassReward

	err := DB.SkypassRewards(sess).Find(db.Cond{
		"item_type": proto.ItemType_SW_HERO,
		"level":     lvl,
		"season":    CurrentSeason(),
	}).All(&rewards)
	if err != nil {
		return nil, fmt.Errorf("list hero skypass rewards in level: %w", err)
	}

	heroes := make([]proto.Hero, 0)

	for _, reward := range rewards {
		if reward.Attributes != nil {
			for _, tokenID := range reward.Attributes.TokenIDs {
				heroes = append(heroes, proto.Hero(tokenID))
			}
		}
	}

	return heroes, nil
}

func HeroDeckClass(hero proto.Hero) proto.DeckClass {
	return heroDeckClass[hero]
}

func DeckClassHero(deckClass proto.DeckClass) proto.Hero {
	return deckClassHero[deckClass]
}
