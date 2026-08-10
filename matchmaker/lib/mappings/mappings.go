package mappings

import (
	"github.com/horizon-games/OpenSky/api/proto"
)

var deckClassMap = map[proto.DeckClass][]proto.DeckClass{
	proto.DeckClass_UNKNOWN_CLASS: []proto.DeckClass{proto.DeckClass_UNKNOWN_CLASS},
	// single class
	proto.DeckClass_STR: []proto.DeckClass{proto.DeckClass_STR},
	proto.DeckClass_HRT: []proto.DeckClass{proto.DeckClass_HRT},
	proto.DeckClass_AGY: []proto.DeckClass{proto.DeckClass_AGY},
	proto.DeckClass_INT: []proto.DeckClass{proto.DeckClass_INT},
	proto.DeckClass_WIS: []proto.DeckClass{proto.DeckClass_WIS},
	// multi class
	proto.DeckClass_STH: []proto.DeckClass{proto.DeckClass_STR, proto.DeckClass_HRT},
	proto.DeckClass_STA: []proto.DeckClass{proto.DeckClass_STR, proto.DeckClass_AGY},
	proto.DeckClass_STI: []proto.DeckClass{proto.DeckClass_STR, proto.DeckClass_INT},
	proto.DeckClass_STW: []proto.DeckClass{proto.DeckClass_STR, proto.DeckClass_WIS},
	proto.DeckClass_HRA: []proto.DeckClass{proto.DeckClass_HRT, proto.DeckClass_AGY},
	proto.DeckClass_HRI: []proto.DeckClass{proto.DeckClass_HRT, proto.DeckClass_INT},
	proto.DeckClass_HRW: []proto.DeckClass{proto.DeckClass_HRT, proto.DeckClass_WIS},
	proto.DeckClass_AGI: []proto.DeckClass{proto.DeckClass_AGY, proto.DeckClass_INT},
	proto.DeckClass_AGW: []proto.DeckClass{proto.DeckClass_AGY, proto.DeckClass_WIS},
	proto.DeckClass_INW: []proto.DeckClass{proto.DeckClass_INT, proto.DeckClass_WIS},
}

var deckClassHeroMap = map[proto.DeckClass]proto.Hero{
	proto.DeckClass_UNKNOWN_CLASS: proto.Hero_UNKNOWN,
	proto.DeckClass_STR:           proto.Hero_ADA,
	proto.DeckClass_AGY:           proto.Hero_SAMYA,
	proto.DeckClass_STA:           proto.Hero_FOX,
	proto.DeckClass_WIS:           proto.Hero_LOTUS,
	proto.DeckClass_STW:           proto.Hero_TITUS,
	proto.DeckClass_AGW:           proto.Hero_IRIS,
	proto.DeckClass_HRT:           proto.Hero_BOURAN,
	proto.DeckClass_STH:           proto.Hero_HORIK,
	proto.DeckClass_HRA:           proto.Hero_ZOEY,
	proto.DeckClass_HRW:           proto.Hero_AXEL,
	proto.DeckClass_INT:           proto.Hero_ARI,
	proto.DeckClass_STI:           proto.Hero_MIRA,
	proto.DeckClass_AGI:           proto.Hero_MAI,
	proto.DeckClass_INW:           proto.Hero_BANJO,
	proto.DeckClass_HRI:           proto.Hero_SITTI,
}

func DeckClassMap(classes ...proto.DeckClass) proto.DeckClass {
	// no classes given
	if len(classes) == 0 {
		return proto.DeckClass_UNKNOWN_CLASS
	}

	// one class, let's check if it's a root class
	if len(classes) == 1 {
		if _, ok := deckClassMap[classes[0]]; ok {
			return classes[0]
		}
	}

	// combination of classes
	classesMap := map[proto.DeckClass]bool{}
	for _, class := range classes {
		classesMap[class] = true
	}

nextClass:
	for className, classMap := range deckClassMap {
		if len(classesMap) != len(classMap) {
			continue
		}
		for _, class := range classMap {
			if !classesMap[class] {
				continue nextClass
			}
		}
		return className
	}

	return proto.DeckClass_UNKNOWN_CLASS
}

func DeckClassHero(classes ...proto.DeckClass) proto.Hero {
	class := DeckClassMap(classes...)
	if hero, ok := deckClassHeroMap[class]; ok {
		return hero
	}
	return proto.Hero_UNKNOWN
}
