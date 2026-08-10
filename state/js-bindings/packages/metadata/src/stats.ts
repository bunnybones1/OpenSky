import type { NoBindingsCardMetadata } from '@opensky/design-data/schema/compiledCard'
import type { VocabStatsData } from '@opensky/design-data/schema/compiledVocab'
import type { BaseCard } from '@skyweaver/state-metadata-sys'

export type CardMetadata = Omit<NoBindingsCardMetadata, 'relatedCards'> & {
  relatedCards: BaseCard[]
  attachment?: BaseCard
}

export const CardLibrary = new Map<BaseCard, Readonly<CardMetadata>>()
export const VocabLibrary = new Map<string, Readonly<VocabStatsData>>()

CardLibrary.set('1', {
  "prism": "hrt",
  "element": "dark",
  "traits": [
    "wither"
  ],
  "type": "spell",
  "cost": 4,
  "artSlug": "spell-xavi-66",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-dark-02",
  "relatedCards": [],
  "textVocab": [
    "wither",
    "draw"
  ],
  "effectTypes": []
})
CardLibrary.set('2', {
  "prism": "str",
  "element": "metal",
  "traits": [],
  "type": "spell",
  "cost": 5,
  "artSlug": "spell-case-177",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-metal-03",
  "relatedCards": [
    "20001"
  ],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('3', {
  "prism": "str",
  "element": "metal",
  "traits": [
    "armor"
  ],
  "type": "unit",
  "cost": 6,
  "health": 6,
  "power": 6,
  "artSlug": "unit-lobo-46",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-metal-01",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": [
    "Continuous"
  ]
})
CardLibrary.set('4', {
  "prism": "agy",
  "element": "fire",
  "traits": [],
  "type": "spell",
  "cost": 2,
  "artSlug": "spell-case-139",
  "spellBehaviour": "defensive",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-fire-02",
  "relatedCards": [],
  "textVocab": [
    "draw"
  ],
  "effectTypes": []
})
CardLibrary.set('5', {
  "prism": "hrt",
  "element": "dark",
  "traits": [],
  "type": "spell",
  "cost": 4,
  "artSlug": "spell-case-29",
  "spellBehaviour": "defensive",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-dark-03",
  "relatedCards": [
    "35"
  ],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('6', {
  "prism": "str",
  "element": "earth",
  "traits": [],
  "type": "spell",
  "cost": 2,
  "artSlug": "spell-case-94",
  "spellBehaviour": "offensive",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-earth-01",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('7', {
  "prism": "agy",
  "element": "fire",
  "traits": [
    "guard",
    "wither"
  ],
  "type": "unit",
  "cost": 4,
  "health": 5,
  "power": 6,
  "artSlug": "unit-tonel-09",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-fire-02",
  "relatedCards": [],
  "textVocab": [
    "dust",
    "trigger-death",
    "draw"
  ],
  "effectTypes": [
    "Death"
  ]
})
CardLibrary.set('8', {
  "prism": "str",
  "element": "water",
  "traits": [
    "guard"
  ],
  "type": "unit",
  "cost": 6,
  "health": 8,
  "power": 4,
  "artSlug": "unit-scava-09",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-water-03",
  "relatedCards": [],
  "textVocab": [
    "trigger-sunset",
    "guard"
  ],
  "effectTypes": [
    "Sunset"
  ]
})
CardLibrary.set('9', {
  "prism": "str",
  "element": "light",
  "traits": [
    "stealth"
  ],
  "type": "unit",
  "cost": 3,
  "health": 2,
  "power": 3,
  "artSlug": "unit-chen-16",
  "attachment": "20019",
  "spellBehaviour": "defensive",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-light-01",
  "relatedCards": [
    "20019"
  ],
  "textVocab": [
    "trigger-play",
    "guard"
  ],
  "effectTypes": [
    "Play"
  ]
})
CardLibrary.set('10', {
  "prism": "str",
  "element": "light",
  "traits": [],
  "type": "spell",
  "cost": 1,
  "artSlug": "spell-case-133",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-light-02",
  "relatedCards": [],
  "textVocab": [
    "draw"
  ],
  "effectTypes": []
})
CardLibrary.set('11', {
  "prism": "str",
  "element": "fire",
  "traits": [],
  "type": "spell",
  "cost": 6,
  "artSlug": "spell-case-39",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-fire-03",
  "relatedCards": [
    "2006"
  ],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('12', {
  "prism": "str",
  "element": "metal",
  "traits": [],
  "type": "spell",
  "cost": 6,
  "artSlug": "spell-xavi-38",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-metal-01",
  "relatedCards": [],
  "textVocab": [
    "guard"
  ],
  "effectTypes": []
})
CardLibrary.set('13', {
  "prism": "str",
  "element": "light",
  "traits": [
    "guard",
    "armor",
    "lifesteal"
  ],
  "type": "unit",
  "cost": 2,
  "health": 3,
  "power": 1,
  "artSlug": "unit-puddu-17",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-light-01",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('14', {
  "prism": "wis",
  "element": "mind",
  "traits": [],
  "type": "spell",
  "cost": 2,
  "artSlug": "spell-case-25",
  "spellBehaviour": "offensive",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-mind-03",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('15', {
  "prism": "str",
  "element": "light",
  "traits": [],
  "type": "spell",
  "cost": 6,
  "artSlug": "spell-rubio-18",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-light-01",
  "relatedCards": [],
  "textVocab": [
    "draw"
  ],
  "effectTypes": []
})
CardLibrary.set('16', {
  "prism": "str",
  "element": "earth",
  "traits": [],
  "type": "spell",
  "cost": 1,
  "artSlug": "spell-case-89",
  "spellBehaviour": "defensive",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-earth-02",
  "relatedCards": [],
  "textVocab": [
    "guard"
  ],
  "effectTypes": []
})
CardLibrary.set('17', {
  "prism": "str",
  "element": "water",
  "traits": [
    "guard"
  ],
  "type": "unit",
  "cost": 2,
  "health": 4,
  "power": 2,
  "artSlug": "unit-rubio-32",
  "spellBehaviour": "offensive",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-water-03",
  "relatedCards": [],
  "textVocab": [
    "trigger-play",
    "armor",
    "guard"
  ],
  "effectTypes": [
    "Play"
  ]
})
CardLibrary.set('18', {
  "prism": "str",
  "element": "earth",
  "traits": [],
  "type": "spell",
  "cost": 5,
  "artSlug": "spell-case-88",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-earth-01",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('19', {
  "prism": "str",
  "element": "fire",
  "traits": [],
  "type": "unit",
  "cost": 2,
  "health": 2,
  "power": 3,
  "artSlug": "unit-edsoa-08",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-fire-02",
  "relatedCards": [
    "2049"
  ],
  "textVocab": [
    "trigger-death"
  ],
  "effectTypes": [
    "Death"
  ]
})
CardLibrary.set('20', {
  "prism": "str",
  "element": "air",
  "traits": [],
  "type": "spell",
  "cost": 3,
  "artSlug": "spell-case-118",
  "spellBehaviour": "offensive",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-air-03",
  "relatedCards": [
    "20048"
  ],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('21', {
  "prism": "str",
  "element": "mind",
  "traits": [
    "guard"
  ],
  "type": "unit",
  "cost": 2,
  "health": 5,
  "power": 3,
  "artSlug": "unit-shapo-60",
  "attachment": "20024",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-mind-03",
  "relatedCards": [],
  "textVocab": [
    "trigger-summon",
    "draw"
  ],
  "effectTypes": [
    "Summon"
  ]
})
CardLibrary.set('22', {
  "prism": "str",
  "element": "earth",
  "traits": [],
  "type": "unit",
  "cost": 1,
  "health": 3,
  "power": 2,
  "artSlug": "unit-lobo-31",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-earth-01",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('23', {
  "prism": "str",
  "element": "fire",
  "traits": [
    "guard",
    "wither"
  ],
  "type": "unit",
  "cost": 9,
  "health": 12,
  "power": 6,
  "artSlug": "unit-edsoa-27",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-fire-02",
  "relatedCards": [],
  "textVocab": [
    "dust",
    "trigger-play",
    "trigger-glory"
  ],
  "effectTypes": [
    "Play",
    "Glory"
  ]
})
CardLibrary.set('24', {
  "prism": "hrt",
  "element": "dark",
  "traits": [
    "wither"
  ],
  "type": "unit",
  "cost": 2,
  "health": 2,
  "power": 2,
  "artSlug": "unit-cunha-03",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-dark-03",
  "relatedCards": [
    "20013"
  ],
  "textVocab": [
    "trigger-death"
  ],
  "effectTypes": [
    "Death"
  ]
})
CardLibrary.set('25', {
  "prism": "str",
  "element": "earth",
  "traits": [
    "guard"
  ],
  "type": "unit",
  "cost": 3,
  "health": 6,
  "power": 2,
  "artSlug": "unit-shapo-03",
  "attachment": "20019",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-earth-03",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('26', {
  "prism": "str",
  "element": "metal",
  "traits": [
    "armor"
  ],
  "type": "unit",
  "cost": 3,
  "health": 3,
  "power": 2,
  "artSlug": "unit-edsoa-63",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-metal-03",
  "relatedCards": [],
  "textVocab": [
    "banner-unit",
    "guard",
    "trigger-glory"
  ],
  "effectTypes": [
    "Glory"
  ]
})
CardLibrary.set('27', {
  "prism": "str",
  "element": "fire",
  "traits": [],
  "type": "unit",
  "cost": 1,
  "health": 2,
  "power": 3,
  "artSlug": "unit-edsoa-57",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-fire-01",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('28', {
  "prism": "str",
  "element": "air",
  "traits": [
    "stealth"
  ],
  "type": "unit",
  "cost": 3,
  "health": 4,
  "power": 4,
  "artSlug": "unit-panou-29",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-air-03",
  "relatedCards": [
    "20048"
  ],
  "textVocab": [
    "trigger-play"
  ],
  "effectTypes": [
    "Play"
  ]
})
CardLibrary.set('29', {
  "prism": "str",
  "element": "dark",
  "traits": [
    "guard"
  ],
  "type": "unit",
  "cost": 5,
  "health": 4,
  "power": 5,
  "artSlug": "unit-rubio-28",
  "attachment": "20047",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-dark-02",
  "relatedCards": [],
  "textVocab": [
    "dust",
    "trigger-sunset"
  ],
  "effectTypes": [
    "Sunset"
  ]
})
CardLibrary.set('30', {
  "prism": "str",
  "element": "earth",
  "traits": [],
  "type": "unit",
  "cost": 4,
  "health": 5,
  "power": 3,
  "artSlug": "unit-cho-01",
  "attachment": "56",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-earth-01",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": [
    "Generic"
  ]
})
CardLibrary.set('31', {
  "prism": "str",
  "element": "metal",
  "traits": [
    "guard",
    "armor"
  ],
  "type": "unit",
  "cost": 10,
  "health": 10,
  "power": 6,
  "artSlug": "unit-edsoa-28",
  "attachment": "20047",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-metal-02",
  "relatedCards": [],
  "textVocab": [
    "trigger-play",
    "armor"
  ],
  "effectTypes": [
    "Play"
  ]
})
CardLibrary.set('32', {
  "prism": "str",
  "element": "mind",
  "traits": [],
  "type": "spell",
  "cost": 1,
  "artSlug": "spell-case-174",
  "spellBehaviour": "offensive",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-mind-03",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('33', {
  "prism": "str",
  "element": "water",
  "traits": [
    "banner"
  ],
  "type": "unit",
  "cost": 1,
  "health": 1,
  "power": 0,
  "artSlug": "unit-scava-08",
  "spellBehaviour": "defensive",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-water-03",
  "relatedCards": [],
  "textVocab": [
    "trigger-play"
  ],
  "effectTypes": [
    "Play"
  ]
})
CardLibrary.set('34', {
  "prism": "str",
  "element": "light",
  "traits": [
    "guard"
  ],
  "type": "unit",
  "cost": 1,
  "health": 3,
  "power": 1,
  "artSlug": "unit-panou-20",
  "attachment": "20019",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-light-01",
  "relatedCards": [
    "20050"
  ],
  "textVocab": [
    "trigger-death"
  ],
  "effectTypes": [
    "Death"
  ]
})
CardLibrary.set('35', {
  "prism": "hrt",
  "element": "dark",
  "traits": [
    "guard",
    "wither"
  ],
  "type": "unit",
  "cost": 6,
  "health": 6,
  "power": 6,
  "artSlug": "unit-panou-64",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-dark-02",
  "relatedCards": [],
  "textVocab": [
    "trigger-death"
  ],
  "effectTypes": [
    "Death"
  ]
})
CardLibrary.set('36', {
  "prism": "str",
  "element": "earth",
  "traits": [
    "guard"
  ],
  "type": "unit",
  "cost": 5,
  "health": 5,
  "power": 4,
  "artSlug": "unit-edsoa-21",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-earth-01",
  "relatedCards": [],
  "textVocab": [
    "trigger-summon",
    "guard"
  ],
  "effectTypes": [
    "Summon"
  ]
})
CardLibrary.set('37', {
  "prism": "str",
  "element": "air",
  "traits": [],
  "type": "spell",
  "cost": 2,
  "artSlug": "spell-case-09",
  "spellBehaviour": "defensive",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-air-02",
  "relatedCards": [
    "20042"
  ],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('38', {
  "prism": "str",
  "element": "water",
  "traits": [],
  "type": "unit",
  "cost": 4,
  "health": 4,
  "power": 6,
  "artSlug": "unit-edsoa-23",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-water-02",
  "relatedCards": [
    "4159"
  ],
  "textVocab": [
    "trigger-death"
  ],
  "effectTypes": [
    "Death"
  ]
})
CardLibrary.set('39', {
  "prism": "agy",
  "element": "fire",
  "traits": [
    "guard",
    "wither",
    "banner"
  ],
  "type": "unit",
  "cost": 6,
  "health": 6,
  "power": 3,
  "artSlug": "unit-vini-12",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-fire-03",
  "relatedCards": [
    "20026"
  ],
  "textVocab": [
    "trigger-summon",
    "stealth"
  ],
  "effectTypes": [
    "Summon"
  ]
})
CardLibrary.set('40', {
  "prism": "str",
  "element": "light",
  "traits": [],
  "type": "spell",
  "cost": 2,
  "artSlug": "spell-case-17",
  "spellBehaviour": "defensive",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-light-02",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('41', {
  "prism": "agy",
  "element": "air",
  "traits": [],
  "type": "unit",
  "cost": 1,
  "health": 3,
  "power": 1,
  "artSlug": "unit-panou-57",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-air-02",
  "relatedCards": [],
  "textVocab": [
    "trigger-summon"
  ],
  "effectTypes": [
    "Summon"
  ]
})
CardLibrary.set('42', {
  "prism": "str",
  "element": "metal",
  "traits": [],
  "type": "unit",
  "cost": 1,
  "health": 2,
  "power": 2,
  "artSlug": "unit-patty-03",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-metal-03",
  "relatedCards": [],
  "textVocab": [
    "lifesteal",
    "wither",
    "trigger-sunrise"
  ],
  "effectTypes": [
    "Sunrise"
  ]
})
CardLibrary.set('43', {
  "prism": "str",
  "element": "mind",
  "traits": [
    "wither"
  ],
  "type": "unit",
  "cost": 3,
  "health": 3,
  "power": 3,
  "artSlug": "unit-panou-54",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-mind-01",
  "relatedCards": [],
  "textVocab": [
    "trigger-play"
  ],
  "effectTypes": [
    "Play"
  ]
})
CardLibrary.set('44', {
  "prism": "str",
  "element": "fire",
  "traits": [
    "guard"
  ],
  "type": "unit",
  "cost": 3,
  "health": 5,
  "power": 4,
  "artSlug": "unit-edsoa-16",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-fire-02",
  "relatedCards": [],
  "textVocab": [
    "trigger-summon"
  ],
  "effectTypes": [
    "Summon"
  ]
})
CardLibrary.set('45', {
  "prism": "str",
  "element": "earth",
  "traits": [
    "guard"
  ],
  "type": "unit",
  "cost": 5,
  "health": 6,
  "power": 3,
  "artSlug": "unit-rubio-29",
  "attachment": "20039",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-earth-01",
  "relatedCards": [
    "20010"
  ],
  "textVocab": [
    "trigger-summon"
  ],
  "effectTypes": [
    "Summon"
  ]
})
CardLibrary.set('46', {
  "prism": "str",
  "element": "mind",
  "traits": [],
  "type": "unit",
  "cost": 7,
  "health": 10,
  "power": 10,
  "artSlug": "unit-panou-53",
  "attachment": "20053",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-mind-01",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('47', {
  "prism": "str",
  "element": "air",
  "traits": [],
  "type": "spell",
  "cost": 1,
  "artSlug": "spell-case-01",
  "spellBehaviour": "offensive",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-air-03",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('48', {
  "prism": "str",
  "element": "dark",
  "traits": [],
  "type": "spell",
  "cost": 3,
  "artSlug": "spell-case-69",
  "spellBehaviour": "offensive",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-dark-01",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('49', {
  "prism": "str",
  "element": "earth",
  "traits": [],
  "type": "spell",
  "cost": 4,
  "artSlug": "spell-case-55",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-earth-02",
  "relatedCards": [
    "20039"
  ],
  "textVocab": [
    "guard",
    "draw"
  ],
  "effectTypes": []
})
CardLibrary.set('50', {
  "prism": "str",
  "element": "fire",
  "traits": [],
  "type": "spell",
  "cost": 4,
  "artSlug": "spell-case-59",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-fire-03",
  "relatedCards": [
    "20023"
  ],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('51', {
  "prism": "str",
  "element": "mind",
  "traits": [],
  "type": "unit",
  "cost": 1,
  "health": 2,
  "power": 2,
  "artSlug": "unit-delat-03",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-mind-02",
  "relatedCards": [],
  "textVocab": [
    "trigger-death",
    "draw"
  ],
  "effectTypes": [
    "Death"
  ]
})
CardLibrary.set('52', {
  "prism": "str",
  "element": "fire",
  "traits": [
    "lifesteal"
  ],
  "type": "unit",
  "cost": 3,
  "health": 3,
  "power": 4,
  "artSlug": "unit-panou-39",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-fire-01",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": [
    "Continuous"
  ]
})
CardLibrary.set('53', {
  "prism": "str",
  "element": "earth",
  "traits": [],
  "type": "spell",
  "cost": 2,
  "artSlug": "spell-case-175",
  "spellBehaviour": "offensive",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-earth-03",
  "relatedCards": [
    "20010"
  ],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('54', {
  "prism": "str",
  "element": "light",
  "traits": [
    "guard",
    "banner"
  ],
  "type": "unit",
  "cost": 2,
  "health": 3,
  "power": 2,
  "artSlug": "unit-shapo-33",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-light-01",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('55', {
  "prism": "str",
  "element": "air",
  "traits": [
    "stealth"
  ],
  "type": "unit",
  "cost": 5,
  "health": 5,
  "power": 5,
  "artSlug": "unit-puddu-20",
  "attachment": "3016",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-air-03",
  "relatedCards": [],
  "textVocab": [
    "trigger-glory"
  ],
  "effectTypes": [
    "Glory"
  ]
})
CardLibrary.set('56', {
  "prism": "str",
  "element": "earth",
  "traits": [
    "lifesteal"
  ],
  "type": "spell",
  "cost": 2,
  "artSlug": "spell-case-72",
  "spellBehaviour": "offensive",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-earth-03",
  "relatedCards": [
    "20003"
  ],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('57', {
  "prism": "hrt",
  "element": "light",
  "traits": [],
  "type": "unit",
  "cost": 4,
  "health": 5,
  "power": 4,
  "artSlug": "unit-puddu-11",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-light-03",
  "relatedCards": [],
  "textVocab": [
    "trigger-summon",
    "draw"
  ],
  "effectTypes": [
    "Summon"
  ]
})
CardLibrary.set('58', {
  "prism": "str",
  "element": "earth",
  "traits": [
    "lifesteal"
  ],
  "type": "spell",
  "cost": 5,
  "artSlug": "spell-case-87",
  "spellBehaviour": "offensive",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-earth-02",
  "relatedCards": [],
  "textVocab": [
    "dust"
  ],
  "effectTypes": []
})
CardLibrary.set('59', {
  "prism": "str",
  "element": "light",
  "traits": [
    "lifesteal",
    "wither"
  ],
  "type": "spell",
  "cost": 8,
  "artSlug": "spell-case-173",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-light-03",
  "relatedCards": [],
  "textVocab": [
    "dust"
  ],
  "effectTypes": []
})
CardLibrary.set('60', {
  "prism": "str",
  "element": "metal",
  "traits": [
    "banner"
  ],
  "type": "spell",
  "cost": 1,
  "artSlug": "spell-case-104",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-metal-01",
  "relatedCards": [
    "20047",
    "20027"
  ],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('61', {
  "prism": "str",
  "element": "fire",
  "traits": [
    "guard"
  ],
  "type": "unit",
  "cost": 8,
  "health": 8,
  "power": 8,
  "artSlug": "unit-giaco-05",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-fire-02",
  "relatedCards": [],
  "textVocab": [
    "trigger-death"
  ],
  "effectTypes": [
    "Death"
  ]
})
CardLibrary.set('62', {
  "prism": "str",
  "element": "metal",
  "traits": [],
  "type": "unit",
  "cost": 3,
  "health": 4,
  "power": 3,
  "artSlug": "unit-perez-01",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-metal-02",
  "relatedCards": [
    "20001"
  ],
  "textVocab": [
    "trigger-glory"
  ],
  "effectTypes": [
    "Glory"
  ]
})
CardLibrary.set('63', {
  "prism": "str",
  "element": "mind",
  "traits": [],
  "type": "unit",
  "cost": 4,
  "health": 11,
  "power": 0,
  "artSlug": "unit-desir-30",
  "attachment": "3025",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-mind-03",
  "relatedCards": [],
  "textVocab": [
    "trigger-inspire-spell"
  ],
  "effectTypes": [
    "Inspire"
  ]
})
CardLibrary.set('64', {
  "prism": "str",
  "element": "metal",
  "traits": [
    "banner"
  ],
  "type": "spell",
  "cost": 4,
  "artSlug": "spell-case-86",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-metal-02",
  "relatedCards": [],
  "textVocab": [
    "draw"
  ],
  "effectTypes": []
})
CardLibrary.set('65', {
  "prism": "agy",
  "element": "fire",
  "traits": [
    "banner"
  ],
  "type": "spell",
  "cost": 1,
  "artSlug": "spell-xavi-04",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-fire-03",
  "relatedCards": [],
  "textVocab": [
    "draw"
  ],
  "effectTypes": []
})
CardLibrary.set('66', {
  "prism": "str",
  "element": "earth",
  "traits": [
    "banner"
  ],
  "type": "spell",
  "cost": 4,
  "artSlug": "spell-xavi-82",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-earth-01",
  "relatedCards": [],
  "textVocab": [
    "draw"
  ],
  "effectTypes": []
})
CardLibrary.set('67', {
  "prism": "str",
  "element": "earth",
  "traits": [
    "guard",
    "lifesteal"
  ],
  "type": "unit",
  "cost": 4,
  "health": 5,
  "power": 3,
  "artSlug": "unit-puddu-15",
  "attachment": "99",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-earth-02",
  "relatedCards": [],
  "textVocab": [
    "trigger-inspire-earth"
  ],
  "effectTypes": [
    "Inspire"
  ]
})
CardLibrary.set('68', {
  "prism": "str",
  "element": "metal",
  "traits": [],
  "type": "spell",
  "cost": 2,
  "artSlug": "spell-xavi-34",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-metal-03",
  "relatedCards": [],
  "textVocab": [
    "guard"
  ],
  "effectTypes": []
})
CardLibrary.set('69', {
  "prism": "str",
  "element": "earth",
  "traits": [
    "guard"
  ],
  "type": "unit",
  "cost": 3,
  "health": 3,
  "power": 3,
  "artSlug": "unit-rubio-30",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-earth-01",
  "relatedCards": [
    "20003"
  ],
  "textVocab": [
    "trigger-death"
  ],
  "effectTypes": [
    "Death"
  ]
})
CardLibrary.set('70', {
  "prism": "str",
  "element": "metal",
  "traits": [],
  "type": "unit",
  "cost": 2,
  "health": 3,
  "power": 2,
  "artSlug": "unit-panou-48",
  "attachment": "3016",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-metal-02",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('71', {
  "prism": "str",
  "element": "metal",
  "traits": [
    "guard"
  ],
  "type": "unit",
  "cost": 1,
  "health": 2,
  "power": 1,
  "artSlug": "unit-edsoa-22",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-metal-03",
  "relatedCards": [],
  "textVocab": [
    "trigger-play"
  ],
  "effectTypes": [
    "Play"
  ]
})
CardLibrary.set('72', {
  "prism": "str",
  "element": "light",
  "traits": [],
  "type": "unit",
  "cost": 5,
  "health": 4,
  "power": 4,
  "artSlug": "unit-lobo-05",
  "attachment": "20019",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-light-03",
  "relatedCards": [],
  "textVocab": [
    "trigger-play",
    "trigger-slay-unit"
  ],
  "effectTypes": [
    "Play",
    "Slay"
  ]
})
CardLibrary.set('73', {
  "prism": "str",
  "element": "dark",
  "traits": [
    "guard",
    "wither",
    "lifesteal",
    "dash"
  ],
  "type": "unit",
  "cost": 4,
  "health": 4,
  "power": 3,
  "artSlug": "unit-edsoa-36",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-dark-03",
  "relatedCards": [],
  "textVocab": [
    "trigger-slay-unit",
    "draw"
  ],
  "effectTypes": [
    "Slay"
  ]
})
CardLibrary.set('74', {
  "prism": "hrt",
  "element": "dark",
  "traits": [
    "wither"
  ],
  "type": "unit",
  "cost": 8,
  "health": 8,
  "power": 8,
  "artSlug": "unit-giaco-07",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-dark-01",
  "relatedCards": [
    "20013"
  ],
  "textVocab": [
    "trigger-death",
    "guard"
  ],
  "effectTypes": [
    "Death"
  ]
})
CardLibrary.set('75', {
  "prism": "str",
  "element": "water",
  "traits": [],
  "type": "unit",
  "cost": 3,
  "health": 4,
  "power": 3,
  "artSlug": "unit-scava-12",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-water-03",
  "relatedCards": [
    "37",
    "82",
    "87",
    "132",
    "182",
    "183",
    "1000",
    "1027"
  ],
  "textVocab": [
    "trigger-play",
    "blade",
    "draw",
    "trigger-glory"
  ],
  "effectTypes": [
    "Play",
    "Glory"
  ]
})
CardLibrary.set('76', {
  "prism": "str",
  "element": "earth",
  "traits": [],
  "type": "unit",
  "cost": 2,
  "health": 4,
  "power": 2,
  "artSlug": "unit-panou-42",
  "attachment": "20039",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-earth-01",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('77', {
  "prism": "str",
  "element": "earth",
  "traits": [],
  "type": "unit",
  "cost": 10,
  "health": 12,
  "power": 12,
  "artSlug": "unit-edsoa-137",
  "attachment": "20042",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-earth-03",
  "relatedCards": [],
  "textVocab": [
    "trigger-play"
  ],
  "effectTypes": [
    "Play"
  ]
})
CardLibrary.set('78', {
  "prism": "str",
  "element": "air",
  "traits": [
    "guard"
  ],
  "type": "unit",
  "cost": 2,
  "health": 3,
  "power": 2,
  "artSlug": "unit-minh-06",
  "attachment": "20042",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-air-02",
  "relatedCards": [],
  "textVocab": [
    "trigger-glory"
  ],
  "effectTypes": [
    "Glory"
  ]
})
CardLibrary.set('79', {
  "prism": "agy",
  "element": "fire",
  "traits": [
    "lifesteal"
  ],
  "type": "spell",
  "cost": 2,
  "artSlug": "spell-lobo-04",
  "spellBehaviour": "offensive",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-fire-02",
  "relatedCards": [
    "20026"
  ],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('80', {
  "prism": "str",
  "element": "fire",
  "traits": [],
  "type": "unit",
  "cost": 2,
  "health": 3,
  "power": 3,
  "artSlug": "unit-tonel-16",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-fire-01",
  "relatedCards": [],
  "textVocab": [
    "trigger-inspire-guard"
  ],
  "effectTypes": [
    "Inspire"
  ]
})
CardLibrary.set('81', {
  "prism": "str",
  "element": "metal",
  "traits": [
    "armor"
  ],
  "type": "unit",
  "cost": 5,
  "health": 4,
  "power": 4,
  "artSlug": "unit-batis-01",
  "attachment": "20047",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-metal-02",
  "relatedCards": [],
  "textVocab": [
    "trigger-summon",
    "draw"
  ],
  "effectTypes": [
    "Summon"
  ]
})
CardLibrary.set('82', {
  "prism": "str",
  "element": "water",
  "traits": [],
  "type": "spell",
  "cost": 2,
  "artSlug": "spell-case-92",
  "spellBehaviour": "defensive",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-water-02",
  "relatedCards": [
    "20054"
  ],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('83', {
  "prism": "str",
  "element": "dark",
  "traits": [
    "guard",
    "wither"
  ],
  "type": "unit",
  "cost": 3,
  "health": 4,
  "power": 4,
  "artSlug": "unit-giaco-08",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-dark-01",
  "relatedCards": [
    "20027"
  ],
  "textVocab": [
    "trigger-sunrise"
  ],
  "effectTypes": [
    "Sunrise"
  ]
})
CardLibrary.set('84', {
  "prism": "str",
  "element": "water",
  "traits": [
    "guard"
  ],
  "type": "unit",
  "cost": 5,
  "health": 6,
  "power": 4,
  "artSlug": "unit-giaco-09",
  "attachment": "91",
  "spellBehaviour": "defensive",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-water-03",
  "relatedCards": [],
  "textVocab": [
    "trigger-play",
    "guard"
  ],
  "effectTypes": [
    "Play"
  ]
})
CardLibrary.set('85', {
  "prism": "str",
  "element": "dark",
  "traits": [
    "wither"
  ],
  "type": "unit",
  "cost": 1,
  "health": 2,
  "power": 2,
  "artSlug": "unit-puddu-21",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-dark-01",
  "relatedCards": [
    "20013"
  ],
  "textVocab": [
    "trigger-death"
  ],
  "effectTypes": [
    "Death"
  ]
})
CardLibrary.set('86', {
  "prism": "str",
  "element": "earth",
  "traits": [
    "banner"
  ],
  "type": "spell",
  "cost": 1,
  "artSlug": "spell-case-95",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-earth-03",
  "relatedCards": [
    "20039",
    "20010"
  ],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('87', {
  "prism": "str",
  "element": "fire",
  "traits": [],
  "type": "spell",
  "cost": 3,
  "artSlug": "spell-case-109",
  "spellBehaviour": "defensive",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-fire-01",
  "relatedCards": [
    "20051"
  ],
  "textVocab": [
    "lifesteal"
  ],
  "effectTypes": []
})
CardLibrary.set('88', {
  "prism": "str",
  "element": "light",
  "traits": [],
  "type": "spell",
  "cost": 5,
  "artSlug": "spell-case-16",
  "spellBehaviour": "defensive",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-light-02",
  "relatedCards": [
    "20019",
    "20050"
  ],
  "textVocab": [
    "guard"
  ],
  "effectTypes": []
})
CardLibrary.set('89', {
  "prism": "str",
  "element": "earth",
  "traits": [],
  "type": "spell",
  "cost": 5,
  "artSlug": "spell-case-119",
  "spellBehaviour": "defensive",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-earth-03",
  "relatedCards": [],
  "textVocab": [
    "guard"
  ],
  "effectTypes": []
})
CardLibrary.set('90', {
  "prism": "str",
  "element": "earth",
  "traits": [
    "guard"
  ],
  "type": "unit",
  "cost": 5,
  "health": 6,
  "power": 4,
  "artSlug": "unit-lobo-01",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-earth-03",
  "relatedCards": [
    "20039"
  ],
  "textVocab": [
    "trigger-death",
    "draw"
  ],
  "effectTypes": [
    "Death"
  ]
})
CardLibrary.set('91', {
  "prism": "str",
  "element": "water",
  "traits": [],
  "type": "spell",
  "cost": 2,
  "artSlug": "spell-shapo-09",
  "spellBehaviour": "offensive",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-water-02",
  "relatedCards": [],
  "textVocab": [
    "armor",
    "guard"
  ],
  "effectTypes": []
})
CardLibrary.set('92', {
  "prism": "str",
  "element": "water",
  "traits": [
    "guard"
  ],
  "type": "unit",
  "cost": 3,
  "health": 5,
  "power": 2,
  "artSlug": "unit-lobo-44",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-water-01",
  "relatedCards": [],
  "textVocab": [
    "guard"
  ],
  "effectTypes": []
})
CardLibrary.set('93', {
  "prism": "str",
  "element": "air",
  "traits": [
    "guard"
  ],
  "type": "unit",
  "cost": 4,
  "health": 6,
  "power": 3,
  "artSlug": "unit-xavi-39",
  "attachment": "20042",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-air-01",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": [
    "Generic"
  ]
})
CardLibrary.set('94', {
  "prism": "hrt",
  "element": "dark",
  "traits": [
    "stealth"
  ],
  "type": "unit",
  "cost": 2,
  "health": 3,
  "power": 2,
  "artSlug": "unit-panou-45",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-dark-02",
  "relatedCards": [
    "20049"
  ],
  "textVocab": [
    "trigger-death"
  ],
  "effectTypes": [
    "Death"
  ]
})
CardLibrary.set('95', {
  "prism": "str",
  "element": "metal",
  "traits": [],
  "type": "spell",
  "cost": 2,
  "artSlug": "spell-case-170",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-metal-03",
  "relatedCards": [
    "20047"
  ],
  "textVocab": [
    "draw"
  ],
  "effectTypes": []
})
CardLibrary.set('96', {
  "prism": "str",
  "element": "earth",
  "traits": [
    "guard"
  ],
  "type": "unit",
  "cost": 2,
  "health": 3,
  "power": 1,
  "artSlug": "unit-braga-01",
  "attachment": "16",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-earth-02",
  "relatedCards": [],
  "textVocab": [
    "trigger-inspire-earth"
  ],
  "effectTypes": [
    "Inspire"
  ]
})
CardLibrary.set('97', {
  "prism": "str",
  "element": "fire",
  "traits": [],
  "type": "spell",
  "cost": 3,
  "artSlug": "spell-case-140",
  "spellBehaviour": "offensive",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-fire-02",
  "relatedCards": [
    "20051"
  ],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('98', {
  "prism": "str",
  "element": "dark",
  "traits": [],
  "type": "spell",
  "cost": 4,
  "artSlug": "spell-case-158",
  "spellBehaviour": "offensive",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-dark-03",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('99', {
  "prism": "str",
  "element": "earth",
  "traits": [],
  "type": "spell",
  "cost": 3,
  "artSlug": "spell-case-156",
  "spellBehaviour": "offensive",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-earth-01",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('100', {
  "prism": "int",
  "element": "water",
  "traits": [
    "wither"
  ],
  "type": "spell",
  "cost": 1,
  "artSlug": "spell-case-294",
  "spellBehaviour": "offensive",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-water-02",
  "relatedCards": [
    "20009"
  ],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('101', {
  "prism": "str",
  "element": "fire",
  "traits": [
    "guard",
    "wither"
  ],
  "type": "unit",
  "cost": 4,
  "health": 3,
  "power": 2,
  "artSlug": "unit-edsoa-77",
  "set": "Core Expansion",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-fire-03",
  "relatedCards": [],
  "textVocab": [
    "trigger-play"
  ],
  "effectTypes": [
    "Play"
  ]
})
CardLibrary.set('102', {
  "prism": "str",
  "element": "light",
  "traits": [],
  "type": "spell",
  "cost": 3,
  "artSlug": "spell-lobo-01",
  "spellBehaviour": "offensive",
  "set": "Core Expansion",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-light-01",
  "relatedCards": [
    "20050"
  ],
  "textVocab": [
    "stealth"
  ],
  "effectTypes": []
})
CardLibrary.set('103', {
  "prism": "str",
  "element": "earth",
  "traits": [],
  "type": "spell",
  "cost": 3,
  "artSlug": "spell-case-218",
  "set": "Core Expansion",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-earth-02",
  "relatedCards": [
    "20039"
  ],
  "textVocab": [
    "draw"
  ],
  "effectTypes": []
})
CardLibrary.set('104', {
  "prism": "str",
  "element": "earth",
  "traits": [],
  "type": "unit",
  "cost": 4,
  "health": 6,
  "power": 4,
  "artSlug": "unit-calle-15",
  "attachment": "20039",
  "set": "Core Expansion",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-earth-01",
  "relatedCards": [
    "20039"
  ],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('105', {
  "prism": "str",
  "element": "earth",
  "traits": [],
  "type": "unit",
  "cost": 3,
  "health": 4,
  "power": 2,
  "artSlug": "unit-xavi-66",
  "attachment": "3072",
  "spellBehaviour": "positive",
  "set": "Core Expansion",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-earth-01",
  "relatedCards": [],
  "textVocab": [
    "trigger-inspire-any"
  ],
  "effectTypes": [
    "Inspire"
  ]
})
CardLibrary.set('106', {
  "prism": "str",
  "element": "earth",
  "traits": [],
  "type": "spell",
  "cost": 5,
  "artSlug": "spell-case-184",
  "spellBehaviour": "positive",
  "set": "Core Expansion",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-earth-02",
  "relatedCards": [],
  "textVocab": [
    "draw"
  ],
  "effectTypes": []
})
CardLibrary.set('107', {
  "prism": "str",
  "element": "metal",
  "traits": [
    "dash",
    "guard"
  ],
  "type": "unit",
  "cost": 4,
  "health": 3,
  "power": 3,
  "artSlug": "unit-calle-25",
  "attachment": "20019",
  "set": "Clash of Inventors",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-metal-02",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('108', {
  "prism": "str",
  "element": "metal",
  "traits": [
    "guard"
  ],
  "type": "unit",
  "cost": 3,
  "health": 3,
  "power": 3,
  "artSlug": "unit-pasco-06",
  "set": "Clash of Inventors",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-metal-03",
  "relatedCards": [],
  "textVocab": [
    "trigger-summon"
  ],
  "effectTypes": [
    "Summon"
  ]
})
CardLibrary.set('109', {
  "prism": "str",
  "element": "metal",
  "traits": [
    "dash"
  ],
  "type": "unit",
  "cost": 5,
  "health": 5,
  "power": 5,
  "artSlug": "unit-calle-35",
  "set": "Clash of Inventors",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-metal-03",
  "relatedCards": [],
  "textVocab": [
    "trigger-summon"
  ],
  "effectTypes": [
    "Summon"
  ]
})
CardLibrary.set('110', {
  "prism": "str",
  "element": "metal",
  "traits": [
    "stealth"
  ],
  "type": "unit",
  "cost": 2,
  "health": 1,
  "power": 2,
  "artSlug": "unit-britta-02",
  "attachment": "1027",
  "set": "Clash of Inventors",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-metal-01",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('111', {
  "prism": "str",
  "element": "metal",
  "traits": [
    "armor",
    "dash"
  ],
  "type": "unit",
  "cost": 10,
  "health": 10,
  "power": 10,
  "artSlug": "unit-pasco-05",
  "set": "Clash of Inventors",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-metal-03",
  "relatedCards": [],
  "textVocab": [
    "trigger-summon",
    "trigger-glory"
  ],
  "effectTypes": [
    "Summon",
    "Glory"
  ]
})
CardLibrary.set('112', {
  "prism": "str",
  "element": "earth",
  "traits": [],
  "type": "unit",
  "cost": 2,
  "health": 3,
  "power": 3,
  "artSlug": "unit-britta-03",
  "set": "Clash of Inventors",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-earth-01",
  "relatedCards": [
    "2034"
  ],
  "textVocab": [
    "trigger-summon",
    "dash"
  ],
  "effectTypes": [
    "Summon"
  ]
})
CardLibrary.set('113', {
  "prism": "str",
  "element": "earth",
  "traits": [],
  "type": "spell",
  "cost": 3,
  "artSlug": "spell-case-221",
  "set": "Clash of Inventors",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-earth-03",
  "relatedCards": [],
  "textVocab": [
    "draw"
  ],
  "effectTypes": []
})
CardLibrary.set('114', {
  "prism": "str",
  "element": "earth",
  "traits": [],
  "type": "spell",
  "cost": 8,
  "artSlug": "spell-case-264",
  "set": "Clash of Inventors",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-earth-01",
  "relatedCards": [],
  "textVocab": [
    "draw"
  ],
  "effectTypes": []
})
CardLibrary.set('115', {
  "prism": "str",
  "element": "fire",
  "traits": [
    "wither"
  ],
  "type": "spell",
  "cost": 9,
  "artSlug": "spell-case-196",
  "set": "Clash of Inventors",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-fire-02",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('116', {
  "prism": "str",
  "element": "metal",
  "traits": [],
  "type": "spell",
  "cost": 10,
  "artSlug": "spell-case-120",
  "set": "Clash of Inventors",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-metal-03",
  "relatedCards": [],
  "textVocab": [
    "draw"
  ],
  "effectTypes": []
})
CardLibrary.set('117', {
  "prism": "str",
  "element": "mind",
  "traits": [
    "lifesteal",
    "guard"
  ],
  "type": "unit",
  "cost": 6,
  "health": 2,
  "power": 2,
  "artSlug": "unit-edsoa-80",
  "set": "Clash of Inventors",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-mind-03",
  "relatedCards": [],
  "textVocab": [
    "trigger-summon",
    "draw"
  ],
  "effectTypes": [
    "Summon"
  ]
})
CardLibrary.set('118', {
  "prism": "str",
  "element": "earth",
  "traits": [],
  "type": "unit",
  "cost": 10,
  "health": 5,
  "power": 5,
  "artSlug": "unit-lobo-73",
  "attachment": "20042",
  "set": "Clash of Inventors",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-earth-03",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('119', {
  "prism": "str",
  "element": "metal",
  "traits": [],
  "type": "spell",
  "cost": 2,
  "artSlug": "spell-case-253",
  "set": "Clash of Inventors",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-metal-03",
  "relatedCards": [],
  "textVocab": [
    "draw"
  ],
  "effectTypes": []
})
CardLibrary.set('120', {
  "prism": "str",
  "element": "earth",
  "traits": [],
  "type": "spell",
  "cost": 6,
  "artSlug": "spell-case-154",
  "spellBehaviour": "defensive",
  "set": "Clash of Inventors",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-earth-01",
  "relatedCards": [],
  "textVocab": [
    "dash"
  ],
  "effectTypes": []
})
CardLibrary.set('121', {
  "prism": "str",
  "element": "metal",
  "traits": [
    "lifesteal"
  ],
  "type": "unit",
  "cost": 2,
  "health": 3,
  "power": 2,
  "artSlug": "unit-edsoa-92",
  "set": "Hexbound Invasion",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-metal-01",
  "relatedCards": [
    "20001"
  ],
  "textVocab": [
    "lifesteal",
    "trigger-sunset"
  ],
  "effectTypes": [
    "Sunset"
  ]
})
CardLibrary.set('122', {
  "prism": "str",
  "element": "metal",
  "traits": [
    "guard",
    "wither"
  ],
  "type": "unit",
  "cost": 4,
  "health": 4,
  "power": 3,
  "artSlug": "unit-calle-29",
  "attachment": "20062",
  "set": "Hexbound Invasion",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-metal-03",
  "relatedCards": [
    "20001"
  ],
  "textVocab": [
    "trigger-death",
    "wither"
  ],
  "effectTypes": [
    "Death"
  ]
})
CardLibrary.set('123', {
  "prism": "str",
  "element": "metal",
  "traits": [
    "guard",
    "armor",
    "dash"
  ],
  "type": "unit",
  "cost": 8,
  "health": 7,
  "power": 4,
  "artSlug": "unit-calle-20",
  "set": "Hexbound Invasion",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-metal-03",
  "relatedCards": [
    "20001"
  ],
  "textVocab": [
    "trigger-slay-unit"
  ],
  "effectTypes": [
    "Slay"
  ]
})
CardLibrary.set('124', {
  "prism": "str",
  "element": "metal",
  "traits": [
    "dash",
    "stealth"
  ],
  "type": "unit",
  "cost": 5,
  "health": 4,
  "power": 4,
  "artSlug": "unit-tonel-13",
  "set": "Hexbound Invasion",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-metal-01",
  "relatedCards": [
    "20001"
  ],
  "textVocab": [
    "trigger-slay-unit"
  ],
  "effectTypes": [
    "Slay"
  ]
})
CardLibrary.set('125', {
  "prism": "str",
  "element": "earth",
  "traits": [],
  "type": "unit",
  "cost": 4,
  "health": 6,
  "power": 5,
  "artSlug": "unit-rodri-01",
  "attachment": "20047",
  "set": "Hexbound Invasion",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-earth-03",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": [
    "Continuous"
  ]
})
CardLibrary.set('126', {
  "prism": "str",
  "element": "earth",
  "traits": [],
  "type": "unit",
  "cost": 6,
  "health": 4,
  "power": 4,
  "artSlug": "unit-edsoa-95",
  "attachment": "20062",
  "set": "Hexbound Invasion",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-earth-01",
  "relatedCards": [
    "20013"
  ],
  "textVocab": [
    "trigger-summon"
  ],
  "effectTypes": [
    "Summon"
  ]
})
CardLibrary.set('127', {
  "prism": "str",
  "element": "earth",
  "traits": [],
  "type": "spell",
  "cost": 8,
  "artSlug": "spell-case-256",
  "set": "Hexbound Invasion",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-earth-02",
  "relatedCards": [],
  "textVocab": [
    "draw"
  ],
  "effectTypes": []
})
CardLibrary.set('128', {
  "prism": "str",
  "element": "light",
  "traits": [],
  "type": "spell",
  "cost": 6,
  "artSlug": "spell-case-263",
  "set": "Hexbound Invasion",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-light-03",
  "relatedCards": [],
  "textVocab": [
    "guard",
    "draw"
  ],
  "effectTypes": []
})
CardLibrary.set('129', {
  "prism": "str",
  "element": "metal",
  "traits": [],
  "type": "spell",
  "cost": 5,
  "artSlug": "spell-case-222",
  "set": "Hexbound Invasion",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-metal-01",
  "relatedCards": [
    "20001"
  ],
  "textVocab": [
    "trigger-slay-spell"
  ],
  "effectTypes": [
    "Slay"
  ]
})
CardLibrary.set('130', {
  "prism": "str",
  "element": "earth",
  "traits": [],
  "type": "spell",
  "cost": 7,
  "artSlug": "spell-case-281",
  "set": "Hexbound Invasion",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-earth-02",
  "relatedCards": [],
  "textVocab": [
    "draw"
  ],
  "effectTypes": []
})
CardLibrary.set('131', {
  "prism": "str",
  "element": "metal",
  "traits": [
    "armor"
  ],
  "type": "unit",
  "cost": 10,
  "health": 4,
  "power": 4,
  "artSlug": "unit-calle-53",
  "set": "Hexbound Invasion",
  "releaseSeason": 17,
  "backgroundArtSlug": "bg-metal-01",
  "relatedCards": [
    "20001"
  ],
  "textVocab": [
    "trigger-play",
    "dash"
  ],
  "effectTypes": [
    "Play"
  ]
})
CardLibrary.set('132', {
  "prism": "str",
  "element": "metal",
  "traits": [],
  "type": "spell",
  "cost": 3,
  "artSlug": "spell-case-290",
  "set": "Hexbound Invasion",
  "releaseSeason": 19,
  "backgroundArtSlug": "bg-metal-01",
  "relatedCards": [
    "20001"
  ],
  "textVocab": [
    "armor"
  ],
  "effectTypes": []
})
CardLibrary.set('133', {
  "prism": "str",
  "element": "metal",
  "traits": [
    "armor"
  ],
  "type": "unit",
  "cost": 4,
  "health": 3,
  "power": 2,
  "artSlug": "unit-calle-64",
  "set": "Hexbound Invasion",
  "releaseSeason": 20,
  "backgroundArtSlug": "bg-metal-02",
  "relatedCards": [
    "20001"
  ],
  "textVocab": [
    "trigger-summon",
    "trigger-sunrise"
  ],
  "effectTypes": [
    "Summon",
    "Sunrise"
  ]
})
CardLibrary.set('134', {
  "prism": "str",
  "element": "earth",
  "traits": [],
  "type": "unit",
  "cost": 2,
  "health": 5,
  "power": 1,
  "artSlug": "unit-calle-43",
  "set": "Starter Expansion",
  "releaseSeason": 21,
  "backgroundArtSlug": "bg-earth-01",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('135', {
  "prism": "str",
  "element": "earth",
  "traits": [
    "wither"
  ],
  "type": "unit",
  "cost": 2,
  "health": 4,
  "power": 2,
  "artSlug": "unit-edsoa-79",
  "set": "Starter Expansion",
  "releaseSeason": 22,
  "backgroundArtSlug": "bg-earth-01",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": [
    "Generic"
  ]
})
CardLibrary.set('136', {
  "prism": "str",
  "element": "earth",
  "traits": [],
  "type": "unit",
  "cost": 2,
  "health": 5,
  "power": 1,
  "artSlug": "unit-edsoa-140",
  "set": "Starter Expansion",
  "releaseSeason": 22,
  "backgroundArtSlug": "bg-earth-01",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('137', {
  "prism": "str",
  "element": "earth",
  "traits": [],
  "type": "unit",
  "cost": 1,
  "health": 2,
  "power": 1,
  "artSlug": "unit-cho-04",
  "attachment": "156",
  "set": "Starter Expansion",
  "releaseSeason": 22,
  "backgroundArtSlug": "bg-earth-01",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('138', {
  "prism": "str",
  "element": "earth",
  "traits": [],
  "type": "unit",
  "cost": 1,
  "health": 3,
  "power": 2,
  "artSlug": "unit-edsoa-141",
  "set": "Starter Expansion",
  "releaseSeason": 22,
  "backgroundArtSlug": "bg-earth-01",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('139', {
  "prism": "str",
  "element": "earth",
  "traits": [],
  "type": "unit",
  "cost": 3,
  "health": 6,
  "power": 2,
  "artSlug": "unit-calle-93",
  "attachment": "16",
  "set": "Starter Expansion",
  "releaseSeason": 22,
  "backgroundArtSlug": "bg-earth-03",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('140', {
  "prism": "str",
  "element": "earth",
  "traits": [
    "guard"
  ],
  "type": "unit",
  "cost": 2,
  "health": 5,
  "power": 2,
  "artSlug": "unit-cho-05",
  "set": "Starter Expansion",
  "releaseSeason": 22,
  "backgroundArtSlug": "bg-earth-01",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('141', {
  "prism": "str",
  "element": "earth",
  "traits": [],
  "type": "unit",
  "cost": 2,
  "health": 4,
  "power": 1,
  "artSlug": "unit-edsoa-142",
  "set": "Starter Expansion",
  "releaseSeason": 22,
  "backgroundArtSlug": "bg-earth-01",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": [
    "Generic"
  ]
})
CardLibrary.set('142', {
  "prism": "str",
  "element": "earth",
  "traits": [],
  "type": "unit",
  "cost": 4,
  "health": 4,
  "power": 4,
  "artSlug": "unit-cho-02",
  "set": "Starter Expansion",
  "releaseSeason": 22,
  "backgroundArtSlug": "bg-earth-03",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": [
    "Generic"
  ]
})
CardLibrary.set('143', {
  "prism": "str",
  "element": "earth",
  "traits": [],
  "type": "unit",
  "cost": 4,
  "health": 3,
  "power": 3,
  "artSlug": "unit-edsoa-139",
  "set": "Starter Expansion",
  "releaseSeason": 22,
  "backgroundArtSlug": "bg-earth-01",
  "relatedCards": [
    "138"
  ],
  "textVocab": [
    "trigger-play"
  ],
  "effectTypes": [
    "Play"
  ]
})
CardLibrary.set('144', {
  "prism": "str",
  "element": "earth",
  "traits": [],
  "type": "unit",
  "cost": 5,
  "health": 6,
  "power": 2,
  "artSlug": "unit-lobo-83",
  "set": "Starter Expansion",
  "releaseSeason": 22,
  "backgroundArtSlug": "bg-earth-01",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": [
    "Generic"
  ]
})
CardLibrary.set('145', {
  "prism": "str",
  "element": "earth",
  "traits": [],
  "type": "unit",
  "cost": 6,
  "health": 6,
  "power": 5,
  "artSlug": "unit-edsoa-136",
  "set": "Starter Expansion",
  "releaseSeason": 22,
  "backgroundArtSlug": "bg-earth-03",
  "relatedCards": [],
  "textVocab": [
    "trigger-play"
  ],
  "effectTypes": [
    "Play"
  ]
})
CardLibrary.set('146', {
  "prism": "str",
  "element": "earth",
  "traits": [],
  "type": "unit",
  "cost": 5,
  "health": 6,
  "power": 4,
  "artSlug": "unit-edsoa-144",
  "set": "Starter Expansion",
  "releaseSeason": 22,
  "backgroundArtSlug": "bg-earth-01",
  "relatedCards": [],
  "textVocab": [
    "draw"
  ],
  "effectTypes": [
    "Generic"
  ]
})
CardLibrary.set('147', {
  "prism": "str",
  "element": "earth",
  "traits": [],
  "type": "unit",
  "cost": 6,
  "health": 6,
  "power": 4,
  "artSlug": "unit-cho-03",
  "set": "Starter Expansion",
  "releaseSeason": 22,
  "backgroundArtSlug": "bg-earth-03",
  "relatedCards": [
    "138"
  ],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('148', {
  "prism": "str",
  "element": "metal",
  "traits": [],
  "type": "unit",
  "cost": 1,
  "health": 3,
  "power": 0,
  "artSlug": "unit-calle-96",
  "set": "Starter Expansion",
  "releaseSeason": 22,
  "backgroundArtSlug": "bg-metal-03",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('149', {
  "prism": "str",
  "element": "metal",
  "traits": [
    "guard"
  ],
  "type": "unit",
  "cost": 2,
  "health": 3,
  "power": 2,
  "artSlug": "unit-calle-82",
  "set": "Starter Expansion",
  "releaseSeason": 22,
  "backgroundArtSlug": "bg-metal-01",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": [
    "Generic"
  ]
})
CardLibrary.set('150', {
  "prism": "str",
  "element": "metal",
  "traits": [],
  "type": "unit",
  "cost": 3,
  "health": 3,
  "power": 3,
  "artSlug": "unit-calle-86",
  "set": "Starter Expansion",
  "releaseSeason": 22,
  "backgroundArtSlug": "bg-metal-01",
  "relatedCards": [],
  "textVocab": [
    "trigger-play"
  ],
  "effectTypes": [
    "Play"
  ]
})
CardLibrary.set('151', {
  "prism": "str",
  "element": "metal",
  "traits": [],
  "type": "unit",
  "cost": 2,
  "health": 3,
  "power": 2,
  "artSlug": "unit-calle-85",
  "attachment": "68",
  "set": "Starter Expansion",
  "releaseSeason": 22,
  "backgroundArtSlug": "bg-metal-01",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('152', {
  "prism": "str",
  "element": "metal",
  "traits": [
    "dash"
  ],
  "type": "unit",
  "cost": 3,
  "health": 3,
  "power": 3,
  "artSlug": "unit-calle-84",
  "set": "Starter Expansion",
  "releaseSeason": 22,
  "backgroundArtSlug": "bg-metal-01",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('153', {
  "prism": "str",
  "element": "metal",
  "traits": [],
  "type": "unit",
  "cost": 7,
  "health": 5,
  "power": 5,
  "artSlug": "unit-calle-83",
  "set": "Starter Expansion",
  "releaseSeason": 22,
  "backgroundArtSlug": "bg-metal-03",
  "relatedCards": [
    "152"
  ],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('154', {
  "prism": "str",
  "element": "metal",
  "traits": [
    "guard"
  ],
  "type": "unit",
  "cost": 4,
  "health": 5,
  "power": 3,
  "artSlug": "unit-calle-97",
  "set": "Starter Expansion",
  "releaseSeason": 22,
  "backgroundArtSlug": "bg-metal-02",
  "relatedCards": [],
  "textVocab": [
    "trigger-play"
  ],
  "effectTypes": [
    "Play"
  ]
})
CardLibrary.set('155', {
  "prism": "str",
  "element": "metal",
  "traits": [
    "guard"
  ],
  "type": "unit",
  "cost": 10,
  "health": 10,
  "power": 10,
  "artSlug": "unit-cho-06",
  "set": "Starter Expansion",
  "releaseSeason": 22,
  "backgroundArtSlug": "bg-metal-03",
  "relatedCards": [
    "138"
  ],
  "textVocab": [],
  "effectTypes": [
    "Play"
  ]
})
CardLibrary.set('156', {
  "prism": "str",
  "element": "earth",
  "traits": [],
  "type": "spell",
  "cost": 1,
  "artSlug": "spell-xavi-93",
  "set": "Starter Expansion",
  "releaseSeason": 22,
  "backgroundArtSlug": "bg-earth-01",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('157', {
  "prism": "str",
  "element": "earth",
  "traits": [],
  "type": "spell",
  "cost": 2,
  "artSlug": "spell-mara-02",
  "set": "Starter Expansion",
  "releaseSeason": 22,
  "backgroundArtSlug": "bg-earth-02",
  "relatedCards": [
    "138"
  ],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('158', {
  "prism": "str",
  "element": "earth",
  "traits": [],
  "type": "spell",
  "cost": 1,
  "artSlug": "spell-mara-03",
  "set": "Starter Expansion",
  "releaseSeason": 22,
  "backgroundArtSlug": "bg-earth-03",
  "relatedCards": [],
  "textVocab": [
    "guard"
  ],
  "effectTypes": []
})
CardLibrary.set('159', {
  "prism": "str",
  "element": "earth",
  "traits": [],
  "type": "spell",
  "cost": 3,
  "artSlug": "spell-xavi-96",
  "set": "Starter Expansion",
  "releaseSeason": 22,
  "backgroundArtSlug": "bg-earth-01",
  "relatedCards": [],
  "textVocab": [
    "draw"
  ],
  "effectTypes": []
})
CardLibrary.set('160', {
  "prism": "str",
  "element": "metal",
  "traits": [],
  "type": "spell",
  "cost": 4,
  "artSlug": "spell-xavi-98",
  "set": "Starter Expansion",
  "releaseSeason": 22,
  "backgroundArtSlug": "bg-metal-02",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('161', {
  "prism": "str",
  "element": "earth",
  "traits": [],
  "type": "spell",
  "cost": 5,
  "artSlug": "spell-mara-05",
  "set": "Starter Expansion",
  "releaseSeason": 22,
  "backgroundArtSlug": "bg-earth-03",
  "relatedCards": [
    "138"
  ],
  "textVocab": [
    "guard"
  ],
  "effectTypes": []
})
CardLibrary.set('162', {
  "prism": "str",
  "element": "earth",
  "traits": [],
  "type": "spell",
  "cost": 5,
  "artSlug": "spell-case-288",
  "set": "Starter Expansion",
  "releaseSeason": 22,
  "backgroundArtSlug": "bg-earth-01",
  "relatedCards": [],
  "textVocab": [
    "draw"
  ],
  "effectTypes": []
})
CardLibrary.set('163', {
  "prism": "str",
  "element": "metal",
  "traits": [],
  "type": "spell",
  "cost": 5,
  "artSlug": "spell-xavi-95",
  "set": "Starter Expansion",
  "releaseSeason": 22,
  "backgroundArtSlug": "bg-metal-02",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('164', {
  "prism": "str",
  "element": "earth",
  "traits": [],
  "type": "spell",
  "cost": 6,
  "artSlug": "spell-mara-06",
  "set": "Starter Expansion",
  "releaseSeason": 22,
  "backgroundArtSlug": "bg-earth-03",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('165', {
  "prism": "str",
  "element": "metal",
  "traits": [],
  "type": "spell",
  "cost": 1,
  "artSlug": "spell-xavi-92",
  "set": "Starter Expansion",
  "releaseSeason": 24,
  "backgroundArtSlug": "bg-metal-01",
  "relatedCards": [
    "20001"
  ],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('166', {
  "prism": "str",
  "element": "earth",
  "traits": [],
  "type": "unit",
  "cost": 4,
  "health": 7,
  "power": 3,
  "artSlug": "unit-calle-19",
  "set": "Starter Expansion",
  "releaseSeason": 24,
  "backgroundArtSlug": "bg-earth-03",
  "relatedCards": [],
  "textVocab": [
    "trigger-sunset"
  ],
  "effectTypes": [
    "Sunset"
  ]
})
CardLibrary.set('167', {
  "prism": "str",
  "element": "earth",
  "traits": [],
  "type": "unit",
  "cost": 6,
  "health": 9,
  "power": 4,
  "artSlug": "unit-edsoa-83",
  "attachment": "20039",
  "set": "Starter Expansion",
  "releaseSeason": 25,
  "backgroundArtSlug": "bg-earth-03",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('168', {
  "prism": "str",
  "element": "metal",
  "traits": [],
  "type": "unit",
  "cost": 2,
  "health": 4,
  "power": 2,
  "artSlug": "unit-edsoa-115",
  "set": "Starter Expansion",
  "releaseSeason": 26,
  "backgroundArtSlug": "bg-metal-02",
  "relatedCards": [
    "20017"
  ],
  "textVocab": [
    "trigger-sunset"
  ],
  "effectTypes": [
    "Sunset"
  ]
})
CardLibrary.set('180', {
  "prism": "str",
  "element": "fire",
  "traits": [
    "dash"
  ],
  "type": "unit",
  "cost": 7,
  "health": 4,
  "power": 4,
  "artSlug": "unit-edsoa-86",
  "set": "Core Set",
  "releaseSeason": 28,
  "backgroundArtSlug": "bg-fire-02",
  "relatedCards": [
    "37",
    "82",
    "87",
    "132",
    "182",
    "183",
    "1000",
    "1027"
  ],
  "textVocab": [
    "trigger-play",
    "blade"
  ],
  "effectTypes": [
    "Play"
  ]
})
CardLibrary.set('181', {
  "prism": "str",
  "element": "metal",
  "traits": [],
  "type": "unit",
  "cost": 2,
  "health": 3,
  "power": 3,
  "artSlug": "unit-pasco-02",
  "set": "Core Set",
  "releaseSeason": 28,
  "backgroundArtSlug": "bg-metal-03",
  "relatedCards": [
    "37",
    "82",
    "87",
    "132",
    "182",
    "183",
    "1000",
    "1027"
  ],
  "textVocab": [
    "blade"
  ],
  "effectTypes": []
})
CardLibrary.set('182', {
  "prism": "str",
  "element": "earth",
  "traits": [],
  "type": "spell",
  "cost": 3,
  "artSlug": "spell-case-269",
  "set": "Core Set",
  "releaseSeason": 28,
  "backgroundArtSlug": "bg-earth-03",
  "relatedCards": [
    "20039"
  ],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('183', {
  "prism": "str",
  "element": "mind",
  "traits": [],
  "type": "spell",
  "cost": 5,
  "artSlug": "spell-case-289",
  "set": "Core Set",
  "releaseSeason": 28,
  "backgroundArtSlug": "bg-mind-01",
  "relatedCards": [
    "37",
    "82",
    "87",
    "132",
    "182",
    "1000",
    "1027"
  ],
  "textVocab": [
    "blade"
  ],
  "effectTypes": []
})
CardLibrary.set('184', {
  "prism": "str",
  "element": "metal",
  "traits": [],
  "type": "spell",
  "cost": 1,
  "artSlug": "spell-case-298",
  "set": "Core Set",
  "releaseSeason": 28,
  "backgroundArtSlug": "bg-metal-02",
  "relatedCards": [
    "37",
    "82",
    "87",
    "132",
    "182",
    "183",
    "1000",
    "1027"
  ],
  "textVocab": [
    "blade"
  ],
  "effectTypes": []
})
CardLibrary.set('187', {
  "prism": "str",
  "element": "earth",
  "traits": [],
  "type": "unit",
  "cost": 4,
  "health": 5,
  "power": 3,
  "artSlug": "unit-mara-36",
  "set": "Hexbound Invasion",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-earth-01",
  "relatedCards": [
    "20019"
  ],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('188', {
  "prism": "str",
  "element": "earth",
  "traits": [],
  "type": "unit",
  "cost": 1,
  "health": 3,
  "power": 1,
  "artSlug": "unit-lobo-67",
  "attachment": "20039",
  "set": "Hexbound Invasion",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-earth-03",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('189', {
  "prism": "str",
  "element": "metal",
  "traits": [],
  "type": "unit",
  "cost": 3,
  "health": 4,
  "power": 2,
  "artSlug": "unit-calle-01",
  "attachment": "12",
  "set": "Hexbound Invasion",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-metal-01",
  "relatedCards": [
    "20058"
  ],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('190', {
  "prism": "str",
  "element": "earth",
  "traits": [],
  "type": "spell",
  "cost": 2,
  "artSlug": "spell-hang-01",
  "set": "Hexbound Invasion",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-earth-02",
  "relatedCards": [
    "20003"
  ],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('191', {
  "prism": "str",
  "element": "earth",
  "traits": [],
  "type": "spell",
  "cost": "X",
  "artSlug": "spell-xavi-103",
  "set": "Hexbound Invasion",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-earth-03",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('1000', {
  "prism": "str",
  "element": "dark",
  "traits": [],
  "type": "spell",
  "cost": 2,
  "artSlug": "spell-xavi-20",
  "spellBehaviour": "defensive",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-dark-02",
  "relatedCards": [
    "20049"
  ],
  "textVocab": [
    "wither"
  ],
  "effectTypes": []
})
CardLibrary.set('1001', {
  "prism": "agy",
  "element": "earth",
  "traits": [],
  "type": "spell",
  "cost": 1,
  "artSlug": "spell-case-32",
  "spellBehaviour": "offensive",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-earth-03",
  "relatedCards": [
    "20010"
  ],
  "textVocab": [
    "armor",
    "guard"
  ],
  "effectTypes": []
})
CardLibrary.set('1002', {
  "prism": "agy",
  "element": "earth",
  "traits": [
    "guard"
  ],
  "type": "unit",
  "cost": 6,
  "health": 3,
  "power": 9,
  "artSlug": "unit-vini-18",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-earth-03",
  "relatedCards": [
    "20006"
  ],
  "textVocab": [
    "trigger-death"
  ],
  "effectTypes": [
    "Death"
  ]
})
CardLibrary.set('1003', {
  "prism": "agy",
  "element": "air",
  "traits": [],
  "type": "spell",
  "cost": 6,
  "artSlug": "spell-xavi-21",
  "spellBehaviour": "defensive",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-air-02",
  "relatedCards": [
    "20042"
  ],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('1004', {
  "prism": "int",
  "element": "mind",
  "traits": [
    "stealth"
  ],
  "type": "unit",
  "cost": 1,
  "health": 1,
  "power": 1,
  "artSlug": "unit-panou-30",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-mind-01",
  "relatedCards": [],
  "textVocab": [
    "trigger-summon",
    "draw"
  ],
  "effectTypes": [
    "Summon"
  ]
})
CardLibrary.set('1005', {
  "prism": "str",
  "element": "earth",
  "traits": [],
  "type": "spell",
  "cost": 4,
  "artSlug": "spell-case-68",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-earth-01",
  "relatedCards": [
    "20039"
  ],
  "textVocab": [
    "draw"
  ],
  "effectTypes": []
})
CardLibrary.set('1006', {
  "prism": "agy",
  "element": "fire",
  "traits": [],
  "type": "unit",
  "cost": 3,
  "health": 3,
  "power": 3,
  "artSlug": "unit-lobo-37",
  "attachment": "20051",
  "spellBehaviour": "offensive",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-fire-03",
  "relatedCards": [],
  "textVocab": [
    "trigger-play"
  ],
  "effectTypes": [
    "Play"
  ]
})
CardLibrary.set('1007', {
  "prism": "agy",
  "element": "fire",
  "traits": [],
  "type": "spell",
  "cost": 3,
  "artSlug": "spell-case-66",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-fire-03",
  "relatedCards": [],
  "textVocab": [
    "dust",
    "draw"
  ],
  "effectTypes": []
})
CardLibrary.set('1008', {
  "prism": "agy",
  "element": "light",
  "traits": [
    "banner",
    "lifesteal"
  ],
  "type": "unit",
  "cost": 4,
  "health": 2,
  "power": 3,
  "artSlug": "unit-lobo-15",
  "attachment": "20022",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-light-03",
  "relatedCards": [],
  "textVocab": [
    "trigger-summon",
    "banner-unit",
    "draw"
  ],
  "effectTypes": [
    "Summon"
  ]
})
CardLibrary.set('1009', {
  "prism": "agy",
  "element": "earth",
  "traits": [
    "guard",
    "banner"
  ],
  "type": "unit",
  "cost": 5,
  "health": 3,
  "power": 2,
  "artSlug": "unit-edsoa-20",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-earth-03",
  "relatedCards": [],
  "textVocab": [
    "trigger-death",
    "draw"
  ],
  "effectTypes": [
    "Death"
  ]
})
CardLibrary.set('1010', {
  "prism": "agy",
  "element": "mind",
  "traits": [],
  "type": "unit",
  "cost": 3,
  "health": 3,
  "power": 3,
  "artSlug": "unit-miche-03",
  "attachment": "20053",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-mind-03",
  "relatedCards": [],
  "textVocab": [
    "trigger-sunset",
    "draw"
  ],
  "effectTypes": [
    "Sunset"
  ]
})
CardLibrary.set('1011', {
  "prism": "agy",
  "element": "metal",
  "traits": [
    "stealth"
  ],
  "type": "unit",
  "cost": 3,
  "health": 2,
  "power": 3,
  "artSlug": "unit-edsoa-17",
  "attachment": "20014",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-metal-01",
  "relatedCards": [
    "20014"
  ],
  "textVocab": [
    "trigger-glory"
  ],
  "effectTypes": [
    "Glory"
  ]
})
CardLibrary.set('1012', {
  "prism": "agy",
  "element": "mind",
  "traits": [
    "stealth",
    "lifesteal"
  ],
  "type": "unit",
  "cost": 5,
  "health": 5,
  "power": 2,
  "artSlug": "unit-chen-12",
  "attachment": "32",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-mind-01",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": [
    "Generic"
  ]
})
CardLibrary.set('1013', {
  "prism": "agy",
  "element": "light",
  "traits": [
    "guard"
  ],
  "type": "unit",
  "cost": 1,
  "health": 2,
  "power": 2,
  "artSlug": "unit-lobo-13",
  "attachment": "20019",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-light-01",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('1014', {
  "prism": "agy",
  "element": "air",
  "traits": [],
  "type": "spell",
  "cost": 3,
  "artSlug": "spell-xavi-57",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-air-01",
  "relatedCards": [],
  "textVocab": [
    "draw"
  ],
  "effectTypes": []
})
CardLibrary.set('1015', {
  "prism": "agy",
  "element": "fire",
  "traits": [
    "banner"
  ],
  "type": "spell",
  "cost": 6,
  "artSlug": "spell-shapo-10",
  "spellBehaviour": "offensive",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-fire-02",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('1016', {
  "prism": "agy",
  "element": "earth",
  "traits": [
    "stealth"
  ],
  "type": "unit",
  "cost": 1,
  "health": 1,
  "power": 2,
  "artSlug": "unit-tonel-17",
  "spellBehaviour": "offensive",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-earth-03",
  "relatedCards": [
    "20010"
  ],
  "textVocab": [
    "trigger-play"
  ],
  "effectTypes": [
    "Play"
  ]
})
CardLibrary.set('1017', {
  "prism": "agy",
  "element": "fire",
  "traits": [],
  "type": "spell",
  "cost": 2,
  "artSlug": "spell-shapo-13",
  "spellBehaviour": "defensive",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-fire-01",
  "relatedCards": [],
  "textVocab": [
    "banner-spell"
  ],
  "effectTypes": []
})
CardLibrary.set('1018', {
  "prism": "agy",
  "element": "fire",
  "traits": [
    "banner"
  ],
  "type": "spell",
  "cost": 3,
  "artSlug": "spell-case-197",
  "spellBehaviour": "offensive",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-fire-02",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('1019', {
  "prism": "agy",
  "element": "air",
  "traits": [
    "banner"
  ],
  "type": "unit",
  "cost": 3,
  "health": 4,
  "power": 2,
  "artSlug": "unit-lobo-19",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-air-01",
  "relatedCards": [],
  "textVocab": [
    "ready",
    "trigger-glory"
  ],
  "effectTypes": [
    "Glory"
  ]
})
CardLibrary.set('1020', {
  "prism": "agy",
  "element": "fire",
  "traits": [
    "wither",
    "lifesteal"
  ],
  "type": "unit",
  "cost": 5,
  "health": 4,
  "power": 3,
  "artSlug": "unit-xavi-30",
  "spellBehaviour": "offensive",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-fire-03",
  "relatedCards": [],
  "textVocab": [
    "trigger-play"
  ],
  "effectTypes": [
    "Play"
  ]
})
CardLibrary.set('1021', {
  "prism": "agy",
  "element": "light",
  "traits": [],
  "type": "spell",
  "cost": 2,
  "artSlug": "spell-case-12",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-light-02",
  "relatedCards": [],
  "textVocab": [
    "dust",
    "lowesthealth"
  ],
  "effectTypes": []
})
CardLibrary.set('1022', {
  "prism": "agy",
  "element": "air",
  "traits": [
    "stealth",
    "banner"
  ],
  "type": "unit",
  "cost": 8,
  "health": 7,
  "power": 10,
  "artSlug": "unit-panou-13",
  "attachment": "20042",
  "spellBehaviour": "offensive",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-air-03",
  "relatedCards": [
    "20048"
  ],
  "textVocab": [
    "trigger-play"
  ],
  "effectTypes": [
    "Play"
  ]
})
CardLibrary.set('1023', {
  "prism": "agy",
  "element": "metal",
  "traits": [
    "armor",
    "banner"
  ],
  "type": "unit",
  "cost": 6,
  "health": 5,
  "power": 3,
  "artSlug": "unit-edsoa-13",
  "attachment": "1029",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-metal-03",
  "relatedCards": [],
  "textVocab": [
    "armor",
    "banner-unit"
  ],
  "effectTypes": [
    "Continuous"
  ]
})
CardLibrary.set('1024', {
  "prism": "hrt",
  "element": "dark",
  "traits": [
    "stealth",
    "wither"
  ],
  "type": "unit",
  "cost": 6,
  "health": 5,
  "power": 7,
  "artSlug": "unit-edsoa-61",
  "attachment": "1000",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-dark-01",
  "relatedCards": [],
  "textVocab": [
    "trigger-inspire-dark"
  ],
  "effectTypes": [
    "Inspire"
  ]
})
CardLibrary.set('1025', {
  "prism": "agy",
  "element": "dark",
  "traits": [
    "stealth",
    "lifesteal"
  ],
  "type": "unit",
  "cost": 2,
  "health": 2,
  "power": 2,
  "artSlug": "unit-rubio-27",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-dark-02",
  "relatedCards": [],
  "textVocab": [
    "trigger-sunrise"
  ],
  "effectTypes": [
    "Sunrise"
  ]
})
CardLibrary.set('1026', {
  "prism": "agy",
  "element": "air",
  "traits": [
    "wither"
  ],
  "type": "unit",
  "cost": 1,
  "health": 1,
  "power": 2,
  "artSlug": "unit-racca-01",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-air-02",
  "relatedCards": [],
  "textVocab": [
    "trigger-summon",
    "lowesthealth"
  ],
  "effectTypes": [
    "Summon"
  ]
})
CardLibrary.set('1027', {
  "prism": "str",
  "element": "light",
  "traits": [
    "banner"
  ],
  "type": "spell",
  "cost": 3,
  "artSlug": "spell-case-176",
  "spellBehaviour": "defensive",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-light-02",
  "relatedCards": [
    "20019"
  ],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('1028', {
  "prism": "agy",
  "element": "air",
  "traits": [
    "stealth"
  ],
  "type": "unit",
  "cost": 2,
  "health": 1,
  "power": 2,
  "artSlug": "unit-lobo-18",
  "attachment": "20037",
  "spellBehaviour": "offensive",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-air-01",
  "relatedCards": [
    "20048"
  ],
  "textVocab": [
    "trigger-play"
  ],
  "effectTypes": [
    "Play"
  ]
})
CardLibrary.set('1029', {
  "prism": "agy",
  "element": "metal",
  "traits": [
    "banner"
  ],
  "type": "spell",
  "cost": 3,
  "artSlug": "spell-hans-01",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-metal-01",
  "relatedCards": [],
  "textVocab": [
    "draw"
  ],
  "effectTypes": []
})
CardLibrary.set('1030', {
  "prism": "agy",
  "element": "air",
  "traits": [
    "banner"
  ],
  "type": "spell",
  "cost": 5,
  "artSlug": "spell-xavi-56",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-air-02",
  "relatedCards": [
    "20000"
  ],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('1031', {
  "prism": "agy",
  "element": "light",
  "traits": [
    "guard"
  ],
  "type": "unit",
  "cost": 3,
  "health": 3,
  "power": 3,
  "artSlug": "unit-lobo-16",
  "attachment": "20050",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-light-03",
  "relatedCards": [],
  "textVocab": [
    "trigger-summon"
  ],
  "effectTypes": [
    "Summon"
  ]
})
CardLibrary.set('1032', {
  "prism": "agy",
  "element": "air",
  "traits": [],
  "type": "spell",
  "cost": 2,
  "artSlug": "spell-case-75",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-air-01",
  "relatedCards": [
    "1026"
  ],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('1033', {
  "prism": "agy",
  "element": "fire",
  "traits": [],
  "type": "unit",
  "cost": 2,
  "health": 4,
  "power": 2,
  "artSlug": "unit-mini-01",
  "attachment": "4",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-fire-03",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": [
    "Glory"
  ]
})
CardLibrary.set('1034', {
  "prism": "agy",
  "element": "dark",
  "traits": [
    "wither",
    "dash"
  ],
  "type": "unit",
  "cost": 5,
  "health": 4,
  "power": 4,
  "artSlug": "unit-lobo-12",
  "spellBehaviour": "offensive",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-dark-01",
  "relatedCards": [
    "1075"
  ],
  "textVocab": [
    "trigger-slay-unit"
  ],
  "effectTypes": [
    "Slay"
  ]
})
CardLibrary.set('1035', {
  "prism": "agy",
  "element": "light",
  "traits": [],
  "type": "spell",
  "cost": 4,
  "artSlug": "spell-case-13",
  "spellBehaviour": "offensive",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-light-01",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('1036', {
  "prism": "agy",
  "element": "dark",
  "traits": [
    "stealth",
    "lifesteal"
  ],
  "type": "unit",
  "cost": 2,
  "health": 1,
  "power": 2,
  "artSlug": "unit-edsoa-37",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-dark-02",
  "relatedCards": [],
  "textVocab": [
    "trigger-death",
    "trigger-glory"
  ],
  "effectTypes": [
    "Death",
    "Glory"
  ]
})
CardLibrary.set('1037', {
  "prism": "agy",
  "element": "metal",
  "traits": [
    "stealth"
  ],
  "type": "unit",
  "cost": 2,
  "health": 3,
  "power": 2,
  "artSlug": "unit-edsoa-02",
  "attachment": "20029",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-metal-03",
  "relatedCards": [
    "20029"
  ],
  "textVocab": [
    "trigger-glory"
  ],
  "effectTypes": [
    "Glory"
  ]
})
CardLibrary.set('1038', {
  "prism": "agy",
  "element": "water",
  "traits": [],
  "type": "spell",
  "cost": 4,
  "artSlug": "spell-case-41",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-water-01",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('1039', {
  "prism": "agy",
  "element": "dark",
  "traits": [
    "banner"
  ],
  "type": "spell",
  "cost": 3,
  "artSlug": "spell-panou-03",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-dark-02",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('1040', {
  "prism": "agy",
  "element": "air",
  "traits": [
    "stealth"
  ],
  "type": "unit",
  "cost": 4,
  "health": 3,
  "power": 6,
  "artSlug": "unit-panou-28",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-air-02",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('1041', {
  "prism": "agy",
  "element": "dark",
  "traits": [
    "stealth",
    "wither"
  ],
  "type": "unit",
  "cost": 2,
  "health": 2,
  "power": 2,
  "artSlug": "unit-xavi-22",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-dark-02",
  "relatedCards": [
    "20013"
  ],
  "textVocab": [
    "dust",
    "trigger-glory"
  ],
  "effectTypes": [
    "Glory"
  ]
})
CardLibrary.set('1042', {
  "prism": "agy",
  "element": "air",
  "traits": [
    "banner"
  ],
  "type": "spell",
  "cost": 5,
  "artSlug": "spell-case-135",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-air-02",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('1043', {
  "prism": "agy",
  "element": "fire",
  "traits": [
    "banner"
  ],
  "type": "spell",
  "cost": 2,
  "artSlug": "spell-xavi-83",
  "spellBehaviour": "offensive",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-fire-03",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('1044', {
  "prism": "str",
  "element": "metal",
  "traits": [
    "guard",
    "armor",
    "banner"
  ],
  "type": "unit",
  "cost": 5,
  "health": 3,
  "power": 4,
  "artSlug": "unit-edsoa-42",
  "attachment": "20047",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-metal-01",
  "relatedCards": [
    "20001"
  ],
  "textVocab": [
    "trigger-death",
    "banner-unit"
  ],
  "effectTypes": [
    "Death"
  ]
})
CardLibrary.set('1045', {
  "prism": "agy",
  "element": "air",
  "traits": [],
  "type": "spell",
  "cost": 2,
  "artSlug": "spell-lobo-05",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-air-02",
  "relatedCards": [],
  "textVocab": [
    "ready",
    "draw"
  ],
  "effectTypes": []
})
CardLibrary.set('1046', {
  "prism": "agy",
  "element": "light",
  "traits": [],
  "type": "spell",
  "cost": "X",
  "artSlug": "spell-case-11",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-light-03",
  "relatedCards": [
    "20022"
  ],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('1047', {
  "prism": "agy",
  "element": "air",
  "traits": [
    "guard",
    "banner"
  ],
  "type": "unit",
  "cost": 3,
  "health": 3,
  "power": 3,
  "artSlug": "unit-edsoa-106",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-air-01",
  "relatedCards": [
    "20000"
  ],
  "textVocab": [
    "trigger-death"
  ],
  "effectTypes": [
    "Death"
  ]
})
CardLibrary.set('1048', {
  "prism": "agy",
  "element": "metal",
  "traits": [
    "wither"
  ],
  "type": "spell",
  "cost": 3,
  "artSlug": "spell-case-78",
  "spellBehaviour": "offensive",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-metal-02",
  "relatedCards": [
    "20027"
  ],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('1049', {
  "prism": "agy",
  "element": "air",
  "traits": [],
  "type": "unit",
  "cost": 6,
  "health": 7,
  "power": 4,
  "artSlug": "unit-lobo-35",
  "attachment": "1032",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-air-02",
  "relatedCards": [
    "1026"
  ],
  "textVocab": [],
  "effectTypes": [
    "Generic"
  ]
})
CardLibrary.set('1050', {
  "prism": "agy",
  "element": "metal",
  "traits": [],
  "type": "spell",
  "cost": 1,
  "artSlug": "spell-case-50",
  "spellBehaviour": "offensive",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-metal-01",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('1051', {
  "prism": "agy",
  "element": "earth",
  "traits": [
    "stealth"
  ],
  "type": "unit",
  "cost": 1,
  "health": 2,
  "power": 3,
  "artSlug": "unit-brian-08",
  "attachment": "20042",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-earth-02",
  "relatedCards": [],
  "textVocab": [
    "trigger-glory"
  ],
  "effectTypes": [
    "Glory"
  ]
})
CardLibrary.set('1052', {
  "prism": "str",
  "element": "metal",
  "traits": [],
  "type": "spell",
  "cost": 2,
  "artSlug": "spell-case-51",
  "spellBehaviour": "offensive",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-metal-03",
  "relatedCards": [
    "20027"
  ],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('1053', {
  "prism": "agy",
  "element": "mind",
  "traits": [
    "lifesteal",
    "banner"
  ],
  "type": "unit",
  "cost": 2,
  "health": 2,
  "power": 2,
  "artSlug": "unit-shapo-02",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-mind-03",
  "relatedCards": [],
  "textVocab": [
    "lifesteal"
  ],
  "effectTypes": [
    "Continuous"
  ]
})
CardLibrary.set('1054', {
  "prism": "agy",
  "element": "fire",
  "traits": [],
  "type": "unit",
  "cost": 3,
  "health": 2,
  "power": 2,
  "artSlug": "unit-edsoa-09",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-fire-03",
  "relatedCards": [],
  "textVocab": [
    "trigger-summon",
    "ready",
    "draw"
  ],
  "effectTypes": [
    "Summon"
  ]
})
CardLibrary.set('1055', {
  "prism": "agy",
  "element": "fire",
  "traits": [],
  "type": "unit",
  "cost": 4,
  "health": 3,
  "power": 4,
  "artSlug": "unit-panou-66",
  "attachment": "20023",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-fire-01",
  "relatedCards": [],
  "textVocab": [
    "trigger-summon",
    "ready"
  ],
  "effectTypes": [
    "Summon"
  ]
})
CardLibrary.set('1056', {
  "prism": "int",
  "element": "mind",
  "traits": [],
  "type": "unit",
  "cost": 2,
  "health": 4,
  "power": 0,
  "artSlug": "unit-scava-02",
  "attachment": "20053",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-mind-03",
  "relatedCards": [],
  "textVocab": [
    "dust",
    "trigger-sunset"
  ],
  "effectTypes": [
    "Sunset"
  ]
})
CardLibrary.set('1057', {
  "prism": "agy",
  "element": "water",
  "traits": [
    "dash"
  ],
  "type": "unit",
  "cost": 6,
  "health": 5,
  "power": 5,
  "artSlug": "unit-xavi-17",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-water-03",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": [
    "Generic"
  ]
})
CardLibrary.set('1058', {
  "prism": "agy",
  "element": "water",
  "traits": [
    "stealth"
  ],
  "type": "unit",
  "cost": 1,
  "health": 2,
  "power": 2,
  "artSlug": "unit-panou-65",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-water-01",
  "relatedCards": [],
  "textVocab": [
    "trigger-summon",
    "ready",
    "guard"
  ],
  "effectTypes": [
    "Summon"
  ]
})
CardLibrary.set('1059', {
  "prism": "agy",
  "element": "mind",
  "traits": [],
  "type": "spell",
  "cost": 1,
  "artSlug": "spell-case-65",
  "spellBehaviour": "offensive",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-mind-01",
  "relatedCards": [],
  "textVocab": [
    "dust",
    "draw"
  ],
  "effectTypes": []
})
CardLibrary.set('1060', {
  "prism": "agy",
  "element": "air",
  "traits": [],
  "type": "unit",
  "cost": 5,
  "health": 5,
  "power": 6,
  "artSlug": "unit-edsoa-46",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-air-01",
  "relatedCards": [],
  "textVocab": [
    "trigger-summon",
    "ready"
  ],
  "effectTypes": [
    "Summon"
  ]
})
CardLibrary.set('1061', {
  "prism": "agy",
  "element": "air",
  "traits": [],
  "type": "unit",
  "cost": 9,
  "health": 6,
  "power": 12,
  "artSlug": "unit-edsoa-49",
  "attachment": "20042",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-air-02",
  "relatedCards": [],
  "textVocab": [
    "trigger-play"
  ],
  "effectTypes": [
    "Play"
  ]
})
CardLibrary.set('1062', {
  "prism": "agy",
  "element": "metal",
  "traits": [
    "armor",
    "banner"
  ],
  "type": "unit",
  "cost": 1,
  "health": 1,
  "power": 1,
  "artSlug": "unit-lobo-32",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-metal-02",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('1063', {
  "prism": "agy",
  "element": "air",
  "traits": [
    "banner"
  ],
  "type": "spell",
  "cost": 4,
  "artSlug": "spell-xavi-52",
  "spellBehaviour": "offensive",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-air-02",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('1064', {
  "prism": "agy",
  "element": "water",
  "traits": [
    "armor"
  ],
  "type": "unit",
  "cost": 2,
  "health": 1,
  "power": 3,
  "artSlug": "unit-xavi-27",
  "spellBehaviour": "offensive",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-water-02",
  "relatedCards": [
    "20032"
  ],
  "textVocab": [
    "trigger-play"
  ],
  "effectTypes": [
    "Play"
  ]
})
CardLibrary.set('1065', {
  "prism": "agy",
  "element": "dark",
  "traits": [
    "wither",
    "lifesteal"
  ],
  "type": "unit",
  "cost": 4,
  "health": 4,
  "power": 4,
  "artSlug": "unit-edsoa-07",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-dark-03",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('1066', {
  "prism": "agy",
  "element": "dark",
  "traits": [
    "wither"
  ],
  "type": "spell",
  "cost": 1,
  "artSlug": "spell-lobo-03",
  "spellBehaviour": "offensive",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-dark-02",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('1067', {
  "prism": "agy",
  "element": "earth",
  "traits": [],
  "type": "unit",
  "cost": 3,
  "health": 3,
  "power": 3,
  "artSlug": "unit-edsoa-24",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-earth-01",
  "relatedCards": [
    "20006"
  ],
  "textVocab": [
    "trigger-slay-unit",
    "trigger-death"
  ],
  "effectTypes": [
    "Slay",
    "Death"
  ]
})
CardLibrary.set('1068', {
  "prism": "agy",
  "element": "earth",
  "traits": [],
  "type": "spell",
  "cost": 2,
  "artSlug": "spell-case-91",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-earth-01",
  "relatedCards": [
    "20006"
  ],
  "textVocab": [
    "guard"
  ],
  "effectTypes": []
})
CardLibrary.set('1069', {
  "prism": "agy",
  "element": "earth",
  "traits": [],
  "type": "unit",
  "cost": 4,
  "health": 5,
  "power": 3,
  "artSlug": "unit-andr-01",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-earth-03",
  "relatedCards": [],
  "textVocab": [
    "trigger-summon"
  ],
  "effectTypes": [
    "Summon"
  ]
})
CardLibrary.set('1070', {
  "prism": "agy",
  "element": "fire",
  "traits": [],
  "type": "unit",
  "cost": 1,
  "health": 3,
  "power": 1,
  "artSlug": "unit-cunha-02",
  "attachment": "20051",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-fire-03",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('1071', {
  "prism": "agy",
  "element": "fire",
  "traits": [],
  "type": "unit",
  "cost": 4,
  "health": 5,
  "power": 4,
  "artSlug": "unit-kalani-05",
  "attachment": "20051",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-fire-01",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": [
    "Continuous"
  ]
})
CardLibrary.set('1072', {
  "prism": "agy",
  "element": "air",
  "traits": [
    "banner"
  ],
  "type": "spell",
  "cost": 1,
  "artSlug": "spell-case-101",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-air-02",
  "relatedCards": [
    "20042",
    "20048"
  ],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('1073', {
  "prism": "agy",
  "element": "metal",
  "traits": [
    "armor"
  ],
  "type": "unit",
  "cost": 2,
  "health": 1,
  "power": 3,
  "artSlug": "unit-lobo-40",
  "attachment": "20055",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-metal-01",
  "relatedCards": [
    "20027"
  ],
  "textVocab": [
    "trigger-death",
    "trait"
  ],
  "effectTypes": [
    "Death"
  ]
})
CardLibrary.set('1074', {
  "prism": "agy",
  "element": "light",
  "traits": [
    "guard",
    "banner"
  ],
  "type": "unit",
  "cost": 7,
  "health": 6,
  "power": 6,
  "artSlug": "unit-edsoa-06",
  "attachment": "20019",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-light-03",
  "relatedCards": [],
  "textVocab": [
    "banner-unit"
  ],
  "effectTypes": [
    "Continuous"
  ]
})
CardLibrary.set('1075', {
  "prism": "agy",
  "element": "dark",
  "traits": [
    "lifesteal"
  ],
  "type": "spell",
  "cost": 4,
  "artSlug": "spell-panou-04",
  "spellBehaviour": "offensive",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-dark-02",
  "relatedCards": [],
  "textVocab": [
    "trigger-slay-spell"
  ],
  "effectTypes": [
    "Slay"
  ]
})
CardLibrary.set('1076', {
  "prism": "agy",
  "element": "air",
  "traits": [],
  "type": "spell",
  "cost": 1,
  "artSlug": "spell-case-08",
  "spellBehaviour": "defensive",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-air-03",
  "relatedCards": [],
  "textVocab": [
    "dash"
  ],
  "effectTypes": []
})
CardLibrary.set('1077', {
  "prism": "agy",
  "element": "air",
  "traits": [
    "banner"
  ],
  "type": "unit",
  "cost": 3,
  "health": 2,
  "power": 2,
  "artSlug": "unit-panou-49",
  "spellBehaviour": "offensive",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-air-01",
  "relatedCards": [],
  "textVocab": [
    "trigger-play"
  ],
  "effectTypes": [
    "Play"
  ]
})
CardLibrary.set('1078', {
  "prism": "agy",
  "element": "fire",
  "traits": [],
  "type": "spell",
  "cost": 4,
  "artSlug": "spell-case-112",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-fire-02",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('1079', {
  "prism": "agy",
  "element": "light",
  "traits": [
    "lifesteal"
  ],
  "type": "unit",
  "cost": 2,
  "health": 2,
  "power": 2,
  "artSlug": "unit-edsoa-38",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-light-01",
  "relatedCards": [],
  "textVocab": [
    "trigger-summon"
  ],
  "effectTypes": [
    "Summon"
  ]
})
CardLibrary.set('1080', {
  "prism": "agy",
  "element": "fire",
  "traits": [
    "dash"
  ],
  "type": "unit",
  "cost": 2,
  "health": 2,
  "power": 3,
  "artSlug": "unit-lobo-66",
  "spellBehaviour": "offensive",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-fire-02",
  "relatedCards": [],
  "textVocab": [
    "trigger-slay-unit",
    "stealth"
  ],
  "effectTypes": [
    "Slay"
  ]
})
CardLibrary.set('1081', {
  "prism": "agy",
  "element": "fire",
  "traits": [
    "banner"
  ],
  "type": "spell",
  "cost": 1,
  "artSlug": "spell-case-76",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-fire-02",
  "relatedCards": [
    "20051",
    "20023"
  ],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('1082', {
  "prism": "agy",
  "element": "mind",
  "traits": [],
  "type": "unit",
  "cost": 2,
  "health": 2,
  "power": 2,
  "artSlug": "unit-desir-27",
  "attachment": "20053",
  "spellBehaviour": "offensive",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-mind-01",
  "relatedCards": [],
  "textVocab": [
    "trigger-play",
    "trait"
  ],
  "effectTypes": [
    "Play"
  ]
})
CardLibrary.set('1083', {
  "prism": "agy",
  "element": "fire",
  "traits": [],
  "type": "unit",
  "cost": 6,
  "health": 5,
  "power": 5,
  "artSlug": "unit-patty-01",
  "attachment": "20051",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-fire-01",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('1084', {
  "prism": "agy",
  "element": "water",
  "traits": [],
  "type": "spell",
  "cost": 7,
  "artSlug": "spell-case-47",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-water-02",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('1085', {
  "prism": "agy",
  "element": "earth",
  "traits": [
    "banner"
  ],
  "type": "spell",
  "cost": 4,
  "artSlug": "spell-case-152",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-earth-03",
  "relatedCards": [
    "20003",
    "20000",
    "20013"
  ],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('1086', {
  "prism": "int",
  "element": "mind",
  "traits": [],
  "type": "spell",
  "cost": 1,
  "artSlug": "spell-case-124",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-mind-01",
  "relatedCards": [],
  "textVocab": [
    "dash"
  ],
  "effectTypes": []
})
CardLibrary.set('1087', {
  "prism": "agy",
  "element": "dark",
  "traits": [
    "stealth",
    "lifesteal"
  ],
  "type": "unit",
  "cost": 1,
  "health": 1,
  "power": 1,
  "artSlug": "unit-puddu-24",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-dark-01",
  "relatedCards": [
    "20028"
  ],
  "textVocab": [
    "draw"
  ],
  "effectTypes": [
    "Generic"
  ]
})
CardLibrary.set('1088', {
  "prism": "agy",
  "element": "water",
  "traits": [],
  "type": "spell",
  "cost": 1,
  "artSlug": "spell-case-81",
  "spellBehaviour": "defensive",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-water-03",
  "relatedCards": [
    "20009"
  ],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('1089', {
  "prism": "agy",
  "element": "metal",
  "traits": [
    "wither"
  ],
  "type": "unit",
  "cost": 3,
  "health": 4,
  "power": 3,
  "artSlug": "unit-edsoa-15",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-metal-01",
  "relatedCards": [],
  "textVocab": [
    "dust"
  ],
  "effectTypes": [
    "Continuous"
  ]
})
CardLibrary.set('1090', {
  "prism": "agy",
  "element": "air",
  "traits": [
    "stealth"
  ],
  "type": "unit",
  "cost": 2,
  "health": 2,
  "power": 4,
  "artSlug": "unit-desir-22",
  "attachment": "20042",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-air-03",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('1091', {
  "prism": "agy",
  "element": "dark",
  "traits": [
    "wither"
  ],
  "type": "unit",
  "cost": 2,
  "health": 2,
  "power": 2,
  "artSlug": "unit-tonel-10",
  "attachment": "1066",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-dark-03",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": [
    "Continuous"
  ]
})
CardLibrary.set('1092', {
  "prism": "agy",
  "element": "fire",
  "traits": [],
  "type": "spell",
  "cost": 3,
  "artSlug": "spell-xavi-03",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-fire-01",
  "relatedCards": [],
  "textVocab": [
    "ready",
    "draw"
  ],
  "effectTypes": []
})
CardLibrary.set('1093', {
  "prism": "agy",
  "element": "air",
  "traits": [
    "guard"
  ],
  "type": "unit",
  "cost": 3,
  "health": 3,
  "power": 3,
  "artSlug": "unit-edsoa-12",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-air-02",
  "relatedCards": [],
  "textVocab": [
    "trigger-summon",
    "banner-unit",
    "draw"
  ],
  "effectTypes": [
    "Summon"
  ]
})
CardLibrary.set('1094', {
  "prism": "agy",
  "element": "metal",
  "traits": [
    "armor"
  ],
  "type": "unit",
  "cost": 2,
  "health": 2,
  "power": 2,
  "artSlug": "unit-xavi-46",
  "attachment": "20047",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-metal-01",
  "relatedCards": [],
  "textVocab": [
    "trigger-summon",
    "dust"
  ],
  "effectTypes": [
    "Summon"
  ]
})
CardLibrary.set('1095', {
  "prism": "agy",
  "element": "metal",
  "traits": [
    "armor"
  ],
  "type": "unit",
  "cost": 4,
  "health": 3,
  "power": 4,
  "artSlug": "unit-panou-47",
  "attachment": "3041",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-metal-02",
  "relatedCards": [],
  "textVocab": [
    "trait"
  ],
  "effectTypes": [
    "Continuous"
  ]
})
CardLibrary.set('1096', {
  "prism": "agy",
  "element": "dark",
  "traits": [],
  "type": "spell",
  "cost": 5,
  "artSlug": "spell-case-144",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-dark-02",
  "relatedCards": [
    "20013",
    "20028"
  ],
  "textVocab": [
    "ready"
  ],
  "effectTypes": []
})
CardLibrary.set('1097', {
  "prism": "agy",
  "element": "air",
  "traits": [],
  "type": "spell",
  "cost": 5,
  "artSlug": "spell-case-149",
  "spellBehaviour": "offensive",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-air-03",
  "relatedCards": [
    "20048"
  ],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('1098', {
  "prism": "agy",
  "element": "light",
  "traits": [],
  "type": "spell",
  "cost": 1,
  "artSlug": "spell-case-153",
  "spellBehaviour": "offensive",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-light-01",
  "relatedCards": [],
  "textVocab": [
    "draw"
  ],
  "effectTypes": []
})
CardLibrary.set('1099', {
  "prism": "agy",
  "element": "metal",
  "traits": [
    "stealth",
    "wither"
  ],
  "type": "unit",
  "cost": 3,
  "health": 2,
  "power": 4,
  "artSlug": "unit-edsoa-26",
  "attachment": "20029",
  "spellBehaviour": "offensive",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-metal-03",
  "relatedCards": [
    "20029"
  ],
  "textVocab": [
    "trigger-summon"
  ],
  "effectTypes": [
    "Summon"
  ]
})
CardLibrary.set('1100', {
  "prism": "agy",
  "element": "air",
  "traits": [
    "stealth",
    "banner"
  ],
  "type": "unit",
  "cost": 4,
  "health": 3,
  "power": 4,
  "artSlug": "unit-patty-07",
  "attachment": "20042",
  "set": "Core Expansion",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-air-01",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": [
    "Continuous"
  ]
})
CardLibrary.set('1101', {
  "prism": "agy",
  "element": "air",
  "traits": [],
  "type": "spell",
  "cost": 1,
  "artSlug": "spell-case-235",
  "spellBehaviour": "offensive",
  "set": "Core Expansion",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-air-01",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('1102', {
  "prism": "agy",
  "element": "metal",
  "traits": [],
  "type": "unit",
  "cost": 4,
  "health": 4,
  "power": 6,
  "artSlug": "unit-edsoa-90",
  "set": "Core Expansion",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-metal-02",
  "relatedCards": [
    "20027"
  ],
  "textVocab": [
    "trigger-summon"
  ],
  "effectTypes": [
    "Summon"
  ]
})
CardLibrary.set('1103', {
  "prism": "agy",
  "element": "fire",
  "traits": [],
  "type": "spell",
  "cost": 2,
  "artSlug": "spell-case-223",
  "set": "Core Expansion",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-fire-03",
  "relatedCards": [
    "20051"
  ],
  "textVocab": [
    "draw"
  ],
  "effectTypes": []
})
CardLibrary.set('1104', {
  "prism": "agy",
  "element": "air",
  "traits": [
    "wither",
    "dash"
  ],
  "type": "unit",
  "cost": 3,
  "health": 1,
  "power": 2,
  "artSlug": "unit-patty-04",
  "attachment": "20049",
  "spellBehaviour": "positive",
  "set": "Core Expansion",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-air-02",
  "relatedCards": [
    "1026",
    "20049"
  ],
  "textVocab": [
    "trigger-summon"
  ],
  "effectTypes": [
    "Summon"
  ]
})
CardLibrary.set('1105', {
  "prism": "agy",
  "element": "fire",
  "traits": [],
  "type": "spell",
  "cost": 2,
  "artSlug": "spell-case-224",
  "spellBehaviour": "positive",
  "set": "Core Expansion",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-fire-02",
  "relatedCards": [],
  "textVocab": [
    "banner-spell"
  ],
  "effectTypes": []
})
CardLibrary.set('1106', {
  "prism": "agy",
  "element": "metal",
  "traits": [
    "stealth",
    "dash"
  ],
  "type": "unit",
  "cost": 3,
  "health": 2,
  "power": 2,
  "artSlug": "unit-calle-44",
  "set": "Clash of Inventors",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-metal-01",
  "relatedCards": [],
  "textVocab": [
    "stealth",
    "guard"
  ],
  "effectTypes": [
    "Continuous"
  ]
})
CardLibrary.set('1107', {
  "prism": "agy",
  "element": "metal",
  "traits": [
    "armor",
    "dash"
  ],
  "type": "unit",
  "cost": 5,
  "health": 3,
  "power": 5,
  "artSlug": "unit-pasco-04",
  "set": "Clash of Inventors",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-metal-03",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": [
    "Generic"
  ]
})
CardLibrary.set('1108', {
  "prism": "agy",
  "element": "dark",
  "traits": [
    "lifesteal"
  ],
  "type": "unit",
  "cost": 3,
  "health": 2,
  "power": 2,
  "artSlug": "unit-lobo-61",
  "set": "Clash of Inventors",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-dark-03",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": [
    "Generic"
  ]
})
CardLibrary.set('1109', {
  "prism": "agy",
  "element": "light",
  "traits": [
    "stealth",
    "dash"
  ],
  "type": "unit",
  "cost": 2,
  "health": 1,
  "power": 2,
  "artSlug": "unit-calle-39",
  "attachment": "20019",
  "set": "Clash of Inventors",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-light-01",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": [
    "Generic"
  ]
})
CardLibrary.set('1110', {
  "prism": "agy",
  "element": "fire",
  "traits": [
    "dash"
  ],
  "type": "unit",
  "cost": 4,
  "health": 6,
  "power": 2,
  "artSlug": "unit-calle-31",
  "set": "Clash of Inventors",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-fire-02",
  "relatedCards": [],
  "textVocab": [
    "dash"
  ],
  "effectTypes": [
    "Continuous"
  ]
})
CardLibrary.set('1111', {
  "prism": "agy",
  "element": "fire",
  "traits": [
    "dash"
  ],
  "type": "unit",
  "cost": 4,
  "health": 5,
  "power": 1,
  "artSlug": "unit-calle-42",
  "attachment": "1092",
  "set": "Clash of Inventors",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-fire-02",
  "relatedCards": [],
  "textVocab": [
    "trigger-summon",
    "guard"
  ],
  "effectTypes": [
    "Summon"
  ]
})
CardLibrary.set('1112', {
  "prism": "agy",
  "element": "light",
  "traits": [],
  "type": "spell",
  "cost": 1,
  "artSlug": "spell-case-249",
  "set": "Clash of Inventors",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-light-03",
  "relatedCards": [],
  "textVocab": [
    "dash",
    "draw"
  ],
  "effectTypes": []
})
CardLibrary.set('1113', {
  "prism": "agy",
  "element": "metal",
  "traits": [],
  "type": "spell",
  "cost": 3,
  "artSlug": "spell-case-245",
  "spellBehaviour": "offensive",
  "set": "Clash of Inventors",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-metal-01",
  "relatedCards": [
    "20058"
  ],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('1114', {
  "prism": "agy",
  "element": "dark",
  "traits": [
    "banner"
  ],
  "type": "spell",
  "cost": 1,
  "artSlug": "spell-case-233",
  "set": "Clash of Inventors",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-dark-02",
  "relatedCards": [
    "20059"
  ],
  "textVocab": [
    "wither"
  ],
  "effectTypes": []
})
CardLibrary.set('1115', {
  "prism": "agy",
  "element": "air",
  "traits": [],
  "type": "spell",
  "cost": 4,
  "artSlug": "spell-case-261",
  "set": "Clash of Inventors",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-air-03",
  "relatedCards": [],
  "textVocab": [
    "dash",
    "draw"
  ],
  "effectTypes": []
})
CardLibrary.set('1116', {
  "prism": "agy",
  "element": "metal",
  "traits": [
    "dash"
  ],
  "type": "unit",
  "cost": 1,
  "health": 3,
  "power": 0,
  "artSlug": "unit-calle-02",
  "set": "Clash of Inventors",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-metal-02",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('1117', {
  "prism": "agy",
  "element": "air",
  "traits": [],
  "type": "unit",
  "cost": 7,
  "health": 7,
  "power": 5,
  "artSlug": "unit-edsoa-91",
  "attachment": "4075",
  "set": "Clash of Inventors",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-air-02",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('1118', {
  "prism": "agy",
  "element": "fire",
  "traits": [
    "banner"
  ],
  "type": "spell",
  "cost": 2,
  "artSlug": "spell-case-199",
  "set": "Clash of Inventors",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-fire-03",
  "relatedCards": [],
  "textVocab": [
    "dash",
    "draw"
  ],
  "effectTypes": []
})
CardLibrary.set('1119', {
  "prism": "agy",
  "element": "fire",
  "traits": [],
  "type": "spell",
  "cost": 3,
  "artSlug": "spell-case-276",
  "spellBehaviour": "offensive",
  "set": "Clash of Inventors",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-fire-01",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('1120', {
  "prism": "agy",
  "element": "fire",
  "traits": [
    "guard",
    "dash"
  ],
  "type": "unit",
  "cost": 1,
  "health": 4,
  "power": 1,
  "artSlug": "unit-edsoa-93",
  "attachment": "20023",
  "set": "Hexbound Invasion",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-fire-02",
  "relatedCards": [],
  "textVocab": [
    "trigger-slay-unit"
  ],
  "effectTypes": [
    "Slay"
  ]
})
CardLibrary.set('1121', {
  "prism": "agy",
  "element": "dark",
  "traits": [
    "guard",
    "wither",
    "banner"
  ],
  "type": "unit",
  "cost": 8,
  "health": 6,
  "power": 6,
  "artSlug": "unit-tonel-14",
  "attachment": "20019",
  "set": "Hexbound Invasion",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-dark-01",
  "relatedCards": [
    "20013"
  ],
  "textVocab": [
    "trigger-summon",
    "trigger-slay-unit",
    "banner-unit"
  ],
  "effectTypes": [
    "Summon",
    "Slay"
  ]
})
CardLibrary.set('1122', {
  "prism": "agy",
  "element": "fire",
  "traits": [
    "wither"
  ],
  "type": "unit",
  "cost": 25,
  "health": 6,
  "power": 6,
  "artSlug": "unit-edsoa-64",
  "set": "Hexbound Invasion",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-fire-01",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('1123', {
  "prism": "agy",
  "element": "fire",
  "traits": [
    "wither"
  ],
  "type": "unit",
  "cost": 2,
  "health": 4,
  "power": 2,
  "artSlug": "unit-edsoa-98",
  "set": "Hexbound Invasion",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-fire-01",
  "relatedCards": [
    "20062"
  ],
  "textVocab": [
    "trigger-slay-unit"
  ],
  "effectTypes": [
    "Slay"
  ]
})
CardLibrary.set('1124', {
  "prism": "agy",
  "element": "air",
  "traits": [],
  "type": "unit",
  "cost": 4,
  "health": 5,
  "power": 3,
  "artSlug": "unit-edsoa-96",
  "attachment": "20062",
  "set": "Hexbound Invasion",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-air-02",
  "relatedCards": [
    "20000"
  ],
  "textVocab": [],
  "effectTypes": [
    "Generic"
  ]
})
CardLibrary.set('1125', {
  "prism": "agy",
  "element": "fire",
  "traits": [],
  "type": "unit",
  "cost": 3,
  "health": 4,
  "power": 3,
  "artSlug": "unit-giaco-13",
  "attachment": "20042",
  "set": "Hexbound Invasion",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-fire-03",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": [
    "Continuous"
  ]
})
CardLibrary.set('1126', {
  "prism": "agy",
  "element": "dark",
  "traits": [
    "lifesteal"
  ],
  "type": "spell",
  "cost": 3,
  "artSlug": "spell-case-278",
  "set": "Hexbound Invasion",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-dark-02",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('1127', {
  "prism": "agy",
  "element": "air",
  "traits": [],
  "type": "spell",
  "cost": 2,
  "artSlug": "spell-case-211",
  "set": "Hexbound Invasion",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-air-03",
  "relatedCards": [],
  "textVocab": [
    "draw"
  ],
  "effectTypes": []
})
CardLibrary.set('1128', {
  "prism": "agy",
  "element": "fire",
  "traits": [
    "banner"
  ],
  "type": "spell",
  "cost": 4,
  "artSlug": "spell-case-282",
  "set": "Hexbound Invasion",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-fire-01",
  "relatedCards": [],
  "textVocab": [
    "draw"
  ],
  "effectTypes": []
})
CardLibrary.set('1129', {
  "prism": "agy",
  "element": "dark",
  "traits": [],
  "type": "spell",
  "cost": 1,
  "artSlug": "spell-case-279",
  "set": "Hexbound Invasion",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-dark-02",
  "relatedCards": [
    "20029"
  ],
  "textVocab": [
    "trigger-slay-spell",
    "banner-spell"
  ],
  "effectTypes": [
    "Slay"
  ]
})
CardLibrary.set('1130', {
  "prism": "agy",
  "element": "fire",
  "traits": [],
  "type": "unit",
  "cost": 4,
  "health": 4,
  "power": 3,
  "artSlug": "unit-calle-48",
  "attachment": "20051",
  "set": "Hexbound Invasion",
  "releaseSeason": 18,
  "backgroundArtSlug": "bg-fire-01",
  "relatedCards": [],
  "textVocab": [
    "ready",
    "trigger-slay-unit"
  ],
  "effectTypes": [
    "Slay"
  ]
})
CardLibrary.set('1131', {
  "prism": "agy",
  "element": "air",
  "traits": [
    "banner"
  ],
  "type": "spell",
  "cost": 0,
  "artSlug": "spell-case-204",
  "set": "Hexbound Invasion",
  "releaseSeason": 19,
  "backgroundArtSlug": "bg-air-01",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('1132', {
  "prism": "agy",
  "element": "fire",
  "traits": [
    "banner"
  ],
  "type": "unit",
  "cost": 5,
  "health": 4,
  "power": 4,
  "artSlug": "unit-calle-49",
  "set": "Hexbound Invasion",
  "releaseSeason": 20,
  "backgroundArtSlug": "bg-fire-02",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": [
    "Generic"
  ]
})
CardLibrary.set('1133', {
  "prism": "agy",
  "element": "air",
  "traits": [],
  "type": "unit",
  "cost": 2,
  "health": 3,
  "power": 3,
  "artSlug": "unit-minh-03",
  "attachment": "20042",
  "set": "Starter Expansion",
  "releaseSeason": 21,
  "backgroundArtSlug": "bg-air-02",
  "relatedCards": [],
  "textVocab": [
    "dust"
  ],
  "effectTypes": []
})
CardLibrary.set('1134', {
  "prism": "agy",
  "element": "air",
  "traits": [],
  "type": "unit",
  "cost": 4,
  "health": 3,
  "power": 3,
  "artSlug": "unit-britta-01",
  "set": "Starter Expansion",
  "releaseSeason": 22,
  "backgroundArtSlug": "bg-air-01",
  "relatedCards": [
    "20000"
  ],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('1135', {
  "prism": "agy",
  "element": "air",
  "traits": [],
  "type": "spell",
  "cost": 5,
  "artSlug": "spell-mara-24",
  "set": "Starter Expansion",
  "releaseSeason": 22,
  "backgroundArtSlug": "bg-air-02",
  "relatedCards": [],
  "textVocab": [
    "draw"
  ],
  "effectTypes": []
})
CardLibrary.set('1136', {
  "prism": "agy",
  "element": "air",
  "traits": [
    "stealth"
  ],
  "type": "unit",
  "cost": 1,
  "health": 2,
  "power": 2,
  "artSlug": "unit-soyun-04",
  "set": "Starter Expansion",
  "releaseSeason": 22,
  "backgroundArtSlug": "bg-air-01",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('1137', {
  "prism": "agy",
  "element": "air",
  "traits": [
    "banner"
  ],
  "type": "unit",
  "cost": 1,
  "health": 2,
  "power": 1,
  "artSlug": "unit-soyun-05",
  "set": "Starter Expansion",
  "releaseSeason": 22,
  "backgroundArtSlug": "bg-air-01",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('1138', {
  "prism": "agy",
  "element": "air",
  "traits": [
    "dash"
  ],
  "type": "unit",
  "cost": 2,
  "health": 2,
  "power": 3,
  "artSlug": "unit-lobo-70",
  "set": "Starter Expansion",
  "releaseSeason": 22,
  "backgroundArtSlug": "bg-air-03",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('1139', {
  "prism": "agy",
  "element": "air",
  "traits": [],
  "type": "unit",
  "cost": 2,
  "health": 3,
  "power": 2,
  "artSlug": "unit-soyun-07",
  "attachment": "1155",
  "set": "Starter Expansion",
  "releaseSeason": 22,
  "backgroundArtSlug": "bg-air-01",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": [
    "Generic"
  ]
})
CardLibrary.set('1140', {
  "prism": "agy",
  "element": "air",
  "traits": [
    "guard",
    "banner"
  ],
  "type": "unit",
  "cost": 3,
  "health": 3,
  "power": 3,
  "artSlug": "unit-calle-95",
  "set": "Starter Expansion",
  "releaseSeason": 22,
  "backgroundArtSlug": "bg-air-01",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('1141', {
  "prism": "agy",
  "element": "air",
  "traits": [
    "stealth"
  ],
  "type": "unit",
  "cost": 2,
  "health": 3,
  "power": 1,
  "artSlug": "unit-soyun-06",
  "set": "Starter Expansion",
  "releaseSeason": 22,
  "backgroundArtSlug": "bg-air-02",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": [
    "Generic"
  ]
})
CardLibrary.set('1142', {
  "prism": "agy",
  "element": "air",
  "traits": [
    "banner"
  ],
  "type": "unit",
  "cost": 4,
  "health": 3,
  "power": 4,
  "artSlug": "unit-soyun-12",
  "set": "Starter Expansion",
  "releaseSeason": 22,
  "backgroundArtSlug": "bg-air-02",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": [
    "Continuous"
  ]
})
CardLibrary.set('1143', {
  "prism": "agy",
  "element": "air",
  "traits": [],
  "type": "unit",
  "cost": 3,
  "health": 2,
  "power": 4,
  "artSlug": "unit-brian-02",
  "set": "Starter Expansion",
  "releaseSeason": 22,
  "backgroundArtSlug": "bg-air-03",
  "relatedCards": [
    "1155"
  ],
  "textVocab": [
    "trigger-play"
  ],
  "effectTypes": [
    "Play"
  ]
})
CardLibrary.set('1144', {
  "prism": "agy",
  "element": "air",
  "traits": [
    "stealth"
  ],
  "type": "unit",
  "cost": 4,
  "health": 3,
  "power": 3,
  "artSlug": "unit-soyun-10",
  "set": "Starter Expansion",
  "releaseSeason": 22,
  "backgroundArtSlug": "bg-air-02",
  "relatedCards": [
    "1136"
  ],
  "textVocab": [],
  "effectTypes": [
    "Generic"
  ]
})
CardLibrary.set('1145', {
  "prism": "agy",
  "element": "air",
  "traits": [
    "dash"
  ],
  "type": "unit",
  "cost": 5,
  "health": 4,
  "power": 4,
  "artSlug": "unit-soyun-09",
  "set": "Starter Expansion",
  "releaseSeason": 22,
  "backgroundArtSlug": "bg-air-03",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": [
    "Generic"
  ]
})
CardLibrary.set('1146', {
  "prism": "agy",
  "element": "air",
  "traits": [],
  "type": "unit",
  "cost": 6,
  "health": 4,
  "power": 4,
  "artSlug": "unit-soyun-08",
  "attachment": "1155",
  "set": "Starter Expansion",
  "releaseSeason": 22,
  "backgroundArtSlug": "bg-air-01",
  "relatedCards": [
    "1137"
  ],
  "textVocab": [
    "trigger-play"
  ],
  "effectTypes": [
    "Play"
  ]
})
CardLibrary.set('1147', {
  "prism": "agy",
  "element": "fire",
  "traits": [
    "stealth"
  ],
  "type": "unit",
  "cost": 1,
  "health": 1,
  "power": 2,
  "artSlug": "unit-hang-01",
  "set": "Starter Expansion",
  "releaseSeason": 22,
  "backgroundArtSlug": "bg-fire-03",
  "relatedCards": [],
  "textVocab": [
    "trigger-play"
  ],
  "effectTypes": [
    "Play"
  ]
})
CardLibrary.set('1148', {
  "prism": "agy",
  "element": "fire",
  "traits": [
    "stealth"
  ],
  "type": "unit",
  "cost": 2,
  "health": 2,
  "power": 3,
  "artSlug": "unit-erlan-04",
  "set": "Starter Expansion",
  "releaseSeason": 22,
  "backgroundArtSlug": "bg-fire-02",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": [
    "Generic"
  ]
})
CardLibrary.set('1149', {
  "prism": "agy",
  "element": "fire",
  "traits": [
    "banner",
    "dash"
  ],
  "type": "unit",
  "cost": 3,
  "health": 3,
  "power": 2,
  "artSlug": "unit-xavi-85",
  "set": "Starter Expansion",
  "releaseSeason": 22,
  "backgroundArtSlug": "bg-fire-03",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('1150', {
  "prism": "agy",
  "element": "fire",
  "traits": [
    "banner"
  ],
  "type": "unit",
  "cost": 4,
  "health": 3,
  "power": 3,
  "artSlug": "unit-calle-79",
  "set": "Starter Expansion",
  "releaseSeason": 22,
  "backgroundArtSlug": "bg-fire-03",
  "relatedCards": [],
  "textVocab": [
    "draw"
  ],
  "effectTypes": [
    "Generic"
  ]
})
CardLibrary.set('1151', {
  "prism": "agy",
  "element": "fire",
  "traits": [
    "banner"
  ],
  "type": "unit",
  "cost": 3,
  "health": 2,
  "power": 3,
  "artSlug": "unit-sewoo-01",
  "set": "Starter Expansion",
  "releaseSeason": 22,
  "backgroundArtSlug": "bg-fire-03",
  "relatedCards": [],
  "textVocab": [
    "trigger-play"
  ],
  "effectTypes": [
    "Play"
  ]
})
CardLibrary.set('1152', {
  "prism": "agy",
  "element": "fire",
  "traits": [
    "banner"
  ],
  "type": "unit",
  "cost": 6,
  "health": 4,
  "power": 5,
  "artSlug": "unit-erlan-05",
  "set": "Starter Expansion",
  "releaseSeason": 22,
  "backgroundArtSlug": "bg-fire-03",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": [
    "Generic"
  ]
})
CardLibrary.set('1153', {
  "prism": "agy",
  "element": "fire",
  "traits": [],
  "type": "unit",
  "cost": 10,
  "health": 10,
  "power": 10,
  "artSlug": "unit-cho-07",
  "set": "Starter Expansion",
  "releaseSeason": 22,
  "backgroundArtSlug": "bg-fire-03",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": [
    "Continuous"
  ]
})
CardLibrary.set('1154', {
  "prism": "agy",
  "element": "fire",
  "traits": [],
  "type": "spell",
  "cost": 1,
  "artSlug": "spell-mara-01",
  "set": "Starter Expansion",
  "releaseSeason": 22,
  "backgroundArtSlug": "bg-fire-03",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('1155', {
  "prism": "agy",
  "element": "air",
  "traits": [],
  "type": "spell",
  "cost": 1,
  "artSlug": "spell-case-145",
  "set": "Starter Expansion",
  "releaseSeason": 22,
  "backgroundArtSlug": "bg-air-01",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('1156', {
  "prism": "agy",
  "element": "fire",
  "traits": [
    "banner"
  ],
  "type": "spell",
  "cost": 2,
  "artSlug": "spell-mara-16",
  "set": "Starter Expansion",
  "releaseSeason": 22,
  "backgroundArtSlug": "bg-fire-02",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('1157', {
  "prism": "agy",
  "element": "air",
  "traits": [],
  "type": "spell",
  "cost": 4,
  "artSlug": "spell-xavi-100",
  "spellBehaviour": "offensive",
  "set": "Starter Expansion",
  "releaseSeason": 22,
  "backgroundArtSlug": "bg-air-03",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('1158', {
  "prism": "agy",
  "element": "air",
  "traits": [],
  "type": "spell",
  "cost": 4,
  "artSlug": "spell-mara-23",
  "set": "Starter Expansion",
  "releaseSeason": 22,
  "backgroundArtSlug": "bg-air-01",
  "relatedCards": [
    "1136"
  ],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('1159', {
  "prism": "agy",
  "element": "air",
  "traits": [],
  "type": "spell",
  "cost": 3,
  "artSlug": "spell-xavi-101",
  "set": "Starter Expansion",
  "releaseSeason": 22,
  "backgroundArtSlug": "bg-air-02",
  "relatedCards": [],
  "textVocab": [
    "draw"
  ],
  "effectTypes": []
})
CardLibrary.set('1160', {
  "prism": "agy",
  "element": "fire",
  "traits": [
    "dash"
  ],
  "type": "unit",
  "cost": 5,
  "health": 1,
  "power": 2,
  "artSlug": "unit-patty-13",
  "set": "Starter Expansion",
  "releaseSeason": 24,
  "backgroundArtSlug": "bg-fire-01",
  "relatedCards": [
    "20068"
  ],
  "textVocab": [
    "trigger-play"
  ],
  "effectTypes": [
    "Play"
  ]
})
CardLibrary.set('1161', {
  "prism": "agy",
  "element": "fire",
  "traits": [
    "banner"
  ],
  "type": "unit",
  "cost": 3,
  "health": 3,
  "power": 4,
  "artSlug": "unit-edsoa-120",
  "set": "Starter Expansion",
  "releaseSeason": 25,
  "backgroundArtSlug": "bg-fire-03",
  "relatedCards": [],
  "textVocab": [
    "trigger-death"
  ],
  "effectTypes": [
    "Death"
  ]
})
CardLibrary.set('1162', {
  "prism": "agy",
  "element": "air",
  "traits": [
    "stealth"
  ],
  "type": "unit",
  "cost": 1,
  "health": 3,
  "power": 1,
  "artSlug": "unit-edsoa-03",
  "set": "Starter Expansion",
  "releaseSeason": 26,
  "backgroundArtSlug": "bg-air-01",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('1163', {
  "prism": "agy",
  "element": "air",
  "traits": [
    "dash"
  ],
  "type": "unit",
  "cost": 5,
  "health": 3,
  "power": 5,
  "artSlug": "unit-edsoa-152",
  "set": "Starter Expansion",
  "releaseSeason": 26,
  "backgroundArtSlug": "bg-air-03",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('1164', {
  "prism": "agy",
  "element": "air",
  "traits": [],
  "type": "spell",
  "cost": 1,
  "artSlug": "spell-case-287",
  "set": "Starter Expansion",
  "releaseSeason": 26,
  "backgroundArtSlug": "bg-air-01",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('1173', {
  "prism": "agy",
  "element": "air",
  "traits": [
    "dash"
  ],
  "type": "unit",
  "cost": 6,
  "health": 9,
  "power": 2,
  "artSlug": "unit-edsoa-48",
  "set": "Core Set",
  "releaseSeason": 29,
  "backgroundArtSlug": "bg-air-02",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('1174', {
  "prism": "agy",
  "element": "fire",
  "traits": [
    "banner"
  ],
  "type": "unit",
  "cost": 2,
  "health": 3,
  "power": 4,
  "artSlug": "unit-edsoa-103",
  "set": "Core Set",
  "releaseSeason": 29,
  "backgroundArtSlug": "bg-fire-03",
  "relatedCards": [
    "20023"
  ],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('1175', {
  "prism": "agy",
  "element": "fire",
  "traits": [],
  "type": "unit",
  "cost": 4,
  "health": 4,
  "power": 6,
  "artSlug": "unit-edsoa-59",
  "attachment": "1043",
  "set": "Core Set",
  "releaseSeason": 29,
  "backgroundArtSlug": "bg-fire-02",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('1176', {
  "prism": "agy",
  "element": "fire",
  "traits": [],
  "type": "spell",
  "cost": 2,
  "artSlug": "spell-case-297",
  "set": "Core Set",
  "releaseSeason": 29,
  "backgroundArtSlug": "bg-fire-01",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('1177', {
  "prism": "agy",
  "element": "metal",
  "traits": [
    "banner"
  ],
  "type": "spell",
  "cost": 4,
  "artSlug": "spell-case-268",
  "set": "Core Set",
  "releaseSeason": 29,
  "backgroundArtSlug": "bg-metal-02",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('2000', {
  "prism": "wis",
  "element": "dark",
  "traits": [
    "banner"
  ],
  "type": "unit",
  "cost": 1,
  "health": 2,
  "power": 1,
  "artSlug": "unit-edsoa-19",
  "attachment": "1039",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-dark-01",
  "relatedCards": [],
  "textVocab": [
    "trigger-death"
  ],
  "effectTypes": [
    "Death"
  ]
})
CardLibrary.set('2001', {
  "prism": "wis",
  "element": "dark",
  "traits": [],
  "type": "spell",
  "cost": 2,
  "artSlug": "spell-xavi-12",
  "spellBehaviour": "offensive",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-dark-01",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('2002', {
  "prism": "wis",
  "element": "mind",
  "traits": [],
  "type": "spell",
  "cost": 0,
  "artSlug": "spell-case-21",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-mind-02",
  "relatedCards": [],
  "textVocab": [
    "mulligan"
  ],
  "effectTypes": []
})
CardLibrary.set('2003', {
  "prism": "wis",
  "element": "earth",
  "traits": [],
  "type": "spell",
  "cost": 4,
  "artSlug": "spell-rubio-06",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-earth-03",
  "relatedCards": [
    "20003",
    "20010"
  ],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('2004', {
  "prism": "wis",
  "element": "mind",
  "traits": [],
  "type": "unit",
  "cost": 5,
  "health": 6,
  "power": 2,
  "artSlug": "unit-miche-07",
  "attachment": "2002",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-mind-01",
  "relatedCards": [],
  "textVocab": [
    "trigger-inspire-spell",
    "conjure"
  ],
  "effectTypes": [
    "Inspire"
  ]
})
CardLibrary.set('2005', {
  "prism": "wis",
  "element": "water",
  "traits": [
    "armor"
  ],
  "type": "unit",
  "cost": 2,
  "health": 2,
  "power": 2,
  "artSlug": "unit-chen-13",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-water-03",
  "relatedCards": [],
  "textVocab": [
    "trigger-summon",
    "draw"
  ],
  "effectTypes": [
    "Summon"
  ]
})
CardLibrary.set('2006', {
  "prism": "wis",
  "element": "fire",
  "traits": [
    "wither"
  ],
  "type": "spell",
  "cost": 1,
  "artSlug": "spell-shapo-14",
  "spellBehaviour": "offensive",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-fire-03",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('2007', {
  "prism": "wis",
  "element": "air",
  "traits": [],
  "type": "spell",
  "cost": 2,
  "artSlug": "spell-case-179",
  "spellBehaviour": "offensive",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-air-01",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('2008', {
  "prism": "wis",
  "element": "water",
  "traits": [
    "guard"
  ],
  "type": "unit",
  "cost": 2,
  "health": 3,
  "power": 1,
  "artSlug": "unit-rubio-24",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-water-03",
  "relatedCards": [],
  "textVocab": [
    "trigger-summon",
    "stealth",
    "draw"
  ],
  "effectTypes": [
    "Summon"
  ]
})
CardLibrary.set('2009', {
  "prism": "wis",
  "element": "light",
  "traits": [],
  "type": "spell",
  "cost": "X",
  "artSlug": "spell-xavi-42",
  "spellBehaviour": "defensive",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-light-03",
  "relatedCards": [
    "20019"
  ],
  "textVocab": [
    "guard"
  ],
  "effectTypes": []
})
CardLibrary.set('2010', {
  "prism": "wis",
  "element": "water",
  "traits": [],
  "type": "spell",
  "cost": 1,
  "artSlug": "spell-case-134",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-water-01",
  "relatedCards": [],
  "textVocab": [
    "draw"
  ],
  "effectTypes": []
})
CardLibrary.set('2011', {
  "prism": "wis",
  "element": "light",
  "traits": [],
  "type": "spell",
  "cost": 8,
  "artSlug": "spell-xavi-41",
  "spellBehaviour": "defensive",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-light-02",
  "relatedCards": [],
  "textVocab": [
    "dust",
    "conjure"
  ],
  "effectTypes": []
})
CardLibrary.set('2012', {
  "prism": "wis",
  "element": "air",
  "traits": [
    "guard"
  ],
  "type": "unit",
  "cost": 4,
  "health": 7,
  "power": 2,
  "artSlug": "unit-xavi-61",
  "attachment": "20042",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-air-01",
  "relatedCards": [
    "2007"
  ],
  "textVocab": [
    "trigger-death"
  ],
  "effectTypes": [
    "Death"
  ]
})
CardLibrary.set('2013', {
  "prism": "wis",
  "element": "dark",
  "traits": [
    "lifesteal"
  ],
  "type": "unit",
  "cost": 3,
  "health": 3,
  "power": 1,
  "artSlug": "unit-delat-02",
  "attachment": "3026",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-dark-02",
  "relatedCards": [],
  "textVocab": [
    "trigger-play"
  ],
  "effectTypes": [
    "Play"
  ]
})
CardLibrary.set('2014', {
  "prism": "agy",
  "element": "fire",
  "traits": [],
  "type": "unit",
  "cost": 4,
  "health": 4,
  "power": 4,
  "artSlug": "unit-panou-19",
  "attachment": "2006",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-fire-01",
  "relatedCards": [
    "2006"
  ],
  "textVocab": [
    "trigger-glory"
  ],
  "effectTypes": [
    "Glory"
  ]
})
CardLibrary.set('2015', {
  "prism": "int",
  "element": "mind",
  "traits": [],
  "type": "unit",
  "cost": 5,
  "health": 6,
  "power": 2,
  "artSlug": "unit-panou-22",
  "attachment": "4037",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-mind-01",
  "relatedCards": [
    "1004"
  ],
  "textVocab": [
    "trigger-summon"
  ],
  "effectTypes": [
    "Summon"
  ]
})
CardLibrary.set('2016', {
  "prism": "wis",
  "element": "mind",
  "traits": [],
  "type": "unit",
  "cost": 1,
  "health": 3,
  "power": 1,
  "artSlug": "unit-panou-04",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-mind-02",
  "relatedCards": [],
  "textVocab": [
    "trigger-sunrise",
    "draw"
  ],
  "effectTypes": [
    "Sunrise"
  ]
})
CardLibrary.set('2017', {
  "prism": "wis",
  "element": "water",
  "traits": [],
  "type": "spell",
  "cost": 4,
  "artSlug": "spell-xavi-32",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-water-02",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('2018', {
  "prism": "wis",
  "element": "mind",
  "traits": [],
  "type": "unit",
  "cost": 2,
  "health": 3,
  "power": 2,
  "artSlug": "unit-desir-17",
  "attachment": "20008",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-mind-01",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": [
    "Continuous"
  ]
})
CardLibrary.set('2019', {
  "prism": "wis",
  "element": "mind",
  "traits": [
    "guard",
    "banner"
  ],
  "type": "unit",
  "cost": 7,
  "health": 3,
  "power": 3,
  "artSlug": "unit-desir-16",
  "attachment": "20053",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-mind-01",
  "relatedCards": [],
  "textVocab": [
    "trigger-play"
  ],
  "effectTypes": [
    "Play"
  ]
})
CardLibrary.set('2020', {
  "prism": "int",
  "element": "water",
  "traits": [
    "guard"
  ],
  "type": "unit",
  "cost": 4,
  "health": 4,
  "power": 3,
  "artSlug": "unit-desir-29",
  "attachment": "20017",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-water-03",
  "relatedCards": [],
  "textVocab": [
    "trigger-summon"
  ],
  "effectTypes": [
    "Summon"
  ]
})
CardLibrary.set('2021', {
  "prism": "wis",
  "element": "earth",
  "traits": [],
  "type": "spell",
  "cost": 3,
  "artSlug": "spell-shapo-11",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-earth-03",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('2022', {
  "prism": "hrt",
  "element": "air",
  "traits": [
    "stealth",
    "lifesteal"
  ],
  "type": "unit",
  "cost": 5,
  "health": 5,
  "power": 3,
  "artSlug": "unit-lobo-20",
  "attachment": "3043",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-air-01",
  "relatedCards": [],
  "textVocab": [
    "draw"
  ],
  "effectTypes": []
})
CardLibrary.set('2023', {
  "prism": "wis",
  "element": "mind",
  "traits": [
    "guard"
  ],
  "type": "unit",
  "cost": 4,
  "health": 4,
  "power": 2,
  "artSlug": "unit-shapo-61",
  "attachment": "20053",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-mind-01",
  "relatedCards": [],
  "textVocab": [
    "trigger-play",
    "stealth"
  ],
  "effectTypes": [
    "Play"
  ]
})
CardLibrary.set('2024', {
  "prism": "wis",
  "element": "dark",
  "traits": [
    "guard",
    "wither"
  ],
  "type": "unit",
  "cost": 4,
  "health": 5,
  "power": 2,
  "artSlug": "unit-miche-01",
  "attachment": "4058",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-dark-01",
  "relatedCards": [],
  "textVocab": [
    "trigger-sunset"
  ],
  "effectTypes": [
    "Sunset"
  ]
})
CardLibrary.set('2025', {
  "prism": "wis",
  "element": "air",
  "traits": [
    "guard"
  ],
  "type": "unit",
  "cost": 3,
  "health": 2,
  "power": 2,
  "artSlug": "unit-panou-16",
  "attachment": "20042",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-air-01",
  "relatedCards": [],
  "textVocab": [
    "sleep",
    "trigger-death"
  ],
  "effectTypes": [
    "Death"
  ]
})
CardLibrary.set('2026', {
  "prism": "wis",
  "element": "earth",
  "traits": [
    "banner"
  ],
  "type": "spell",
  "cost": 1,
  "artSlug": "spell-case-33",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-earth-02",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('2027', {
  "prism": "wis",
  "element": "mind",
  "traits": [
    "lifesteal"
  ],
  "type": "unit",
  "cost": 3,
  "health": 3,
  "power": 2,
  "artSlug": "unit-shapo-59",
  "attachment": "20041",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-mind-03",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": [
    "Generic"
  ]
})
CardLibrary.set('2028', {
  "prism": "wis",
  "element": "earth",
  "traits": [
    "lifesteal"
  ],
  "type": "unit",
  "cost": 4,
  "health": 6,
  "power": 2,
  "artSlug": "unit-lobo-06",
  "attachment": "2047",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-earth-02",
  "relatedCards": [],
  "textVocab": [
    "trigger-inspire-earth"
  ],
  "effectTypes": [
    "Inspire"
  ]
})
CardLibrary.set('2029', {
  "prism": "int",
  "element": "water",
  "traits": [],
  "type": "unit",
  "cost": 8,
  "health": 8,
  "power": 8,
  "artSlug": "unit-edsoa-14",
  "attachment": "20054",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-water-04",
  "relatedCards": [],
  "textVocab": [
    "trigger-inspire-water"
  ],
  "effectTypes": [
    "Inspire"
  ]
})
CardLibrary.set('2030', {
  "prism": "wis",
  "element": "water",
  "traits": [],
  "type": "spell",
  "cost": 5,
  "artSlug": "spell-case-46",
  "spellBehaviour": "offensive",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-water-03",
  "relatedCards": [],
  "textVocab": [
    "dust"
  ],
  "effectTypes": []
})
CardLibrary.set('2031', {
  "prism": "wis",
  "element": "fire",
  "traits": [
    "wither"
  ],
  "type": "unit",
  "cost": 1,
  "health": 2,
  "power": 1,
  "artSlug": "unit-shapo-26",
  "attachment": "2006",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-fire-01",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('2032', {
  "prism": "wis",
  "element": "light",
  "traits": [
    "banner"
  ],
  "type": "unit",
  "cost": 5,
  "health": 5,
  "power": 2,
  "artSlug": "unit-lobo-04",
  "attachment": "4016",
  "spellBehaviour": "defensive",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-light-02",
  "relatedCards": [],
  "textVocab": [
    "trigger-play"
  ],
  "effectTypes": [
    "Play"
  ]
})
CardLibrary.set('2033', {
  "prism": "wis",
  "element": "earth",
  "traits": [
    "guard"
  ],
  "type": "unit",
  "cost": 4,
  "health": 6,
  "power": 3,
  "artSlug": "unit-desir-02",
  "attachment": "20010",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-earth-02",
  "relatedCards": [
    "20010"
  ],
  "textVocab": [
    "trigger-death"
  ],
  "effectTypes": [
    "Death"
  ]
})
CardLibrary.set('2034', {
  "prism": "str",
  "element": "earth",
  "traits": [],
  "type": "spell",
  "cost": 10,
  "artSlug": "spell-desir-04",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-earth-01",
  "relatedCards": [],
  "textVocab": [
    "draw"
  ],
  "effectTypes": []
})
CardLibrary.set('2035', {
  "prism": "wis",
  "element": "light",
  "traits": [],
  "type": "spell",
  "cost": 10,
  "artSlug": "spell-case-137",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-light-02",
  "relatedCards": [],
  "textVocab": [
    "dust"
  ],
  "effectTypes": []
})
CardLibrary.set('2036', {
  "prism": "wis",
  "element": "dark",
  "traits": [],
  "type": "spell",
  "cost": 4,
  "artSlug": "spell-case-35",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-dark-03",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('2037', {
  "prism": "wis",
  "element": "metal",
  "traits": [
    "guard",
    "armor"
  ],
  "type": "unit",
  "cost": 8,
  "health": 7,
  "power": 5,
  "artSlug": "unit-chen-17",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-metal-01",
  "relatedCards": [],
  "textVocab": [
    "armor",
    "trigger-glory"
  ],
  "effectTypes": [
    "Glory"
  ]
})
CardLibrary.set('2038', {
  "prism": "wis",
  "element": "dark",
  "traits": [],
  "type": "spell",
  "cost": 3,
  "artSlug": "spell-xavi-73",
  "spellBehaviour": "offensive",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-dark-02",
  "relatedCards": [
    "20028"
  ],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('2039', {
  "prism": "wis",
  "element": "metal",
  "traits": [
    "guard"
  ],
  "type": "unit",
  "cost": 1,
  "health": 4,
  "power": 1,
  "artSlug": "unit-puddu-07",
  "attachment": "20047",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-metal-03",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('2040', {
  "prism": "wis",
  "element": "dark",
  "traits": [
    "stealth",
    "wither"
  ],
  "type": "unit",
  "cost": 2,
  "health": 2,
  "power": 2,
  "artSlug": "unit-panou-43",
  "spellBehaviour": "offensive",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-dark-01",
  "relatedCards": [],
  "textVocab": [
    "trigger-play"
  ],
  "effectTypes": [
    "Play"
  ]
})
CardLibrary.set('2041', {
  "prism": "str",
  "element": "metal",
  "traits": [],
  "type": "unit",
  "cost": 2,
  "health": 2,
  "power": 4,
  "artSlug": "unit-rubio-05",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-metal-02",
  "relatedCards": [
    "37",
    "82",
    "87",
    "132",
    "182",
    "183",
    "1000",
    "1027"
  ],
  "textVocab": [
    "trigger-death",
    "blade"
  ],
  "effectTypes": [
    "Death"
  ]
})
CardLibrary.set('2042', {
  "prism": "wis",
  "element": "metal",
  "traits": [
    "guard"
  ],
  "type": "unit",
  "cost": 4,
  "health": 4,
  "power": 4,
  "artSlug": "unit-chen-20",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-metal-01",
  "relatedCards": [
    "20027"
  ],
  "textVocab": [
    "trigger-death",
    "lowesthealth"
  ],
  "effectTypes": [
    "Death"
  ]
})
CardLibrary.set('2043', {
  "prism": "wis",
  "element": "light",
  "traits": [
    "guard",
    "lifesteal"
  ],
  "type": "unit",
  "cost": 8,
  "health": 7,
  "power": 7,
  "artSlug": "unit-scava-20",
  "attachment": "20007",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-light-02",
  "relatedCards": [],
  "textVocab": [
    "dust",
    "trigger-death"
  ],
  "effectTypes": [
    "Death"
  ]
})
CardLibrary.set('2044', {
  "prism": "wis",
  "element": "mind",
  "traits": [
    "guard"
  ],
  "type": "unit",
  "cost": 4,
  "health": 5,
  "power": 4,
  "artSlug": "unit-desir-18",
  "attachment": "20053",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-mind-01",
  "relatedCards": [],
  "textVocab": [
    "trigger-summon"
  ],
  "effectTypes": [
    "Summon"
  ]
})
CardLibrary.set('2045', {
  "prism": "wis",
  "element": "mind",
  "traits": [
    "banner"
  ],
  "type": "unit",
  "cost": 3,
  "health": 3,
  "power": 2,
  "artSlug": "unit-xavi-37",
  "attachment": "4037",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-mind-01",
  "relatedCards": [],
  "textVocab": [
    "trigger-inspire-spell"
  ],
  "effectTypes": [
    "Inspire"
  ]
})
CardLibrary.set('2046', {
  "prism": "wis",
  "element": "light",
  "traits": [],
  "type": "spell",
  "cost": 2,
  "artSlug": "spell-xavi-27",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-light-01",
  "relatedCards": [],
  "textVocab": [
    "conjure"
  ],
  "effectTypes": []
})
CardLibrary.set('2047', {
  "prism": "wis",
  "element": "earth",
  "traits": [],
  "type": "spell",
  "cost": 5,
  "artSlug": "spell-case-157",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-earth-02",
  "relatedCards": [],
  "textVocab": [
    "draw"
  ],
  "effectTypes": []
})
CardLibrary.set('2048', {
  "prism": "wis",
  "element": "earth",
  "traits": [],
  "type": "spell",
  "cost": 3,
  "artSlug": "spell-case-31",
  "spellBehaviour": "defensive",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-earth-03",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('2049', {
  "prism": "wis",
  "element": "fire",
  "traits": [],
  "type": "spell",
  "cost": 3,
  "artSlug": "spell-case-169",
  "spellBehaviour": "offensive",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-fire-01",
  "relatedCards": [],
  "textVocab": [
    "dust"
  ],
  "effectTypes": []
})
CardLibrary.set('2050', {
  "prism": "wis",
  "element": "mind",
  "traits": [],
  "type": "spell",
  "cost": 5,
  "artSlug": "spell-xavi-26",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-mind-02",
  "relatedCards": [],
  "textVocab": [
    "dust",
    "draw"
  ],
  "effectTypes": []
})
CardLibrary.set('2051', {
  "prism": "str",
  "element": "earth",
  "traits": [
    "guard",
    "lifesteal"
  ],
  "type": "unit",
  "cost": 8,
  "health": 10,
  "power": 6,
  "artSlug": "unit-edsoa-53",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-earth-03",
  "relatedCards": [],
  "textVocab": [
    "trigger-play"
  ],
  "effectTypes": [
    "Play"
  ]
})
CardLibrary.set('2052', {
  "prism": "wis",
  "element": "metal",
  "traits": [],
  "type": "spell",
  "cost": 1,
  "artSlug": "spell-hans-08",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-metal-01",
  "relatedCards": [],
  "textVocab": [
    "banner-spell",
    "conjure"
  ],
  "effectTypes": []
})
CardLibrary.set('2053', {
  "prism": "wis",
  "element": "water",
  "traits": [],
  "type": "spell",
  "cost": 3,
  "artSlug": "spell-case-295",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-water-02",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('2054', {
  "prism": "wis",
  "element": "earth",
  "traits": [
    "guard"
  ],
  "type": "unit",
  "cost": 1,
  "health": 3,
  "power": 1,
  "artSlug": "unit-panou-55",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-earth-02",
  "relatedCards": [],
  "textVocab": [
    "trigger-death"
  ],
  "effectTypes": [
    "Death"
  ]
})
CardLibrary.set('2055', {
  "prism": "wis",
  "element": "air",
  "traits": [],
  "type": "unit",
  "cost": 6,
  "health": 8,
  "power": 3,
  "artSlug": "unit-panou-60",
  "attachment": "20042",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-air-01",
  "relatedCards": [],
  "textVocab": [
    "trigger-sunrise"
  ],
  "effectTypes": [
    "Sunrise"
  ]
})
CardLibrary.set('2056', {
  "prism": "wis",
  "element": "dark",
  "traits": [
    "stealth"
  ],
  "type": "unit",
  "cost": 3,
  "health": 4,
  "power": 2,
  "artSlug": "unit-patty-02",
  "attachment": "2074",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-dark-01",
  "relatedCards": [
    "20032"
  ],
  "textVocab": [
    "trigger-glory"
  ],
  "effectTypes": [
    "Glory"
  ]
})
CardLibrary.set('2057', {
  "prism": "wis",
  "element": "mind",
  "traits": [],
  "type": "spell",
  "cost": 3,
  "artSlug": "spell-case-24",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-mind-03",
  "relatedCards": [],
  "textVocab": [
    "draw"
  ],
  "effectTypes": []
})
CardLibrary.set('2058', {
  "prism": "wis",
  "element": "mind",
  "traits": [],
  "type": "unit",
  "cost": 2,
  "health": 3,
  "power": 1,
  "artSlug": "unit-xavi-23",
  "attachment": "14",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-mind-01",
  "relatedCards": [],
  "textVocab": [
    "trigger-summon",
    "draw"
  ],
  "effectTypes": [
    "Summon"
  ]
})
CardLibrary.set('2059', {
  "prism": "wis",
  "element": "water",
  "traits": [],
  "type": "spell",
  "cost": 5,
  "artSlug": "spell-case-49",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-water-02",
  "relatedCards": [],
  "textVocab": [
    "draw"
  ],
  "effectTypes": []
})
CardLibrary.set('2060', {
  "prism": "wis",
  "element": "water",
  "traits": [
    "guard"
  ],
  "type": "unit",
  "cost": 5,
  "health": 8,
  "power": 2,
  "artSlug": "unit-vini-13",
  "attachment": "4087",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-water-03",
  "relatedCards": [],
  "textVocab": [
    "trigger-sunset",
    "conjure"
  ],
  "effectTypes": [
    "Sunset"
  ]
})
CardLibrary.set('2061', {
  "prism": "wis",
  "element": "water",
  "traits": [],
  "type": "spell",
  "cost": 2,
  "artSlug": "spell-xavi-87",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-water-01",
  "relatedCards": [],
  "textVocab": [
    "draw"
  ],
  "effectTypes": []
})
CardLibrary.set('2062', {
  "prism": "hrt",
  "element": "light",
  "traits": [],
  "type": "spell",
  "cost": 1,
  "artSlug": "spell-xavi-84",
  "spellBehaviour": "offensive",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-light-02",
  "relatedCards": [
    "3148"
  ],
  "textVocab": [
    "dust"
  ],
  "effectTypes": []
})
CardLibrary.set('2063', {
  "prism": "wis",
  "element": "air",
  "traits": [],
  "type": "spell",
  "cost": 8,
  "artSlug": "spell-case-06",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-air-03",
  "relatedCards": [],
  "textVocab": [
    "draw"
  ],
  "effectTypes": []
})
CardLibrary.set('2064', {
  "prism": "wis",
  "element": "dark",
  "traits": [
    "lifesteal"
  ],
  "type": "unit",
  "cost": 3,
  "health": 3,
  "power": 3,
  "artSlug": "unit-tonel-08",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-dark-01",
  "relatedCards": [
    "2001"
  ],
  "textVocab": [
    "trigger-sunset"
  ],
  "effectTypes": [
    "Sunset"
  ]
})
CardLibrary.set('2065', {
  "prism": "wis",
  "element": "light",
  "traits": [],
  "type": "spell",
  "cost": 3,
  "artSlug": "spell-xavi-44",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-light-02",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('2066', {
  "prism": "wis",
  "element": "mind",
  "traits": [],
  "type": "spell",
  "cost": 3,
  "artSlug": "spell-case-296",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-mind-03",
  "relatedCards": [],
  "textVocab": [
    "dust",
    "draw"
  ],
  "effectTypes": []
})
CardLibrary.set('2067', {
  "prism": "wis",
  "element": "air",
  "traits": [],
  "type": "unit",
  "cost": 1,
  "health": 3,
  "power": 1,
  "artSlug": "unit-shapo-63",
  "attachment": "20057",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-air-01",
  "relatedCards": [],
  "textVocab": [
    "trigger-inspire-air",
    "mulligan"
  ],
  "effectTypes": [
    "Inspire"
  ]
})
CardLibrary.set('2068', {
  "prism": "wis",
  "element": "light",
  "traits": [],
  "type": "unit",
  "cost": 2,
  "health": 4,
  "power": 1,
  "artSlug": "unit-xavi-44",
  "attachment": "20045",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-light-01",
  "relatedCards": [],
  "textVocab": [
    "trigger-sunset"
  ],
  "effectTypes": [
    "Sunset"
  ]
})
CardLibrary.set('2069', {
  "prism": "wis",
  "element": "light",
  "traits": [
    "guard",
    "banner"
  ],
  "type": "unit",
  "cost": 2,
  "health": 2,
  "power": 1,
  "artSlug": "unit-puddu-10",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-light-02",
  "relatedCards": [],
  "textVocab": [
    "trigger-death",
    "draw"
  ],
  "effectTypes": [
    "Death"
  ]
})
CardLibrary.set('2070', {
  "prism": "agy",
  "element": "air",
  "traits": [
    "banner"
  ],
  "type": "unit",
  "cost": 2,
  "health": 3,
  "power": 1,
  "artSlug": "unit-xavi-40",
  "attachment": "1014",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-air-01",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('2071', {
  "prism": "wis",
  "element": "fire",
  "traits": [],
  "type": "spell",
  "cost": 2,
  "artSlug": "spell-edsoa-05",
  "spellBehaviour": "offensive",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-fire-02",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('2072', {
  "prism": "str",
  "element": "earth",
  "traits": [
    "guard"
  ],
  "type": "unit",
  "cost": 2,
  "health": 5,
  "power": 0,
  "artSlug": "unit-edsoa-30",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-earth-01",
  "relatedCards": [],
  "textVocab": [
    "trigger-summon",
    "draw"
  ],
  "effectTypes": [
    "Summon"
  ]
})
CardLibrary.set('2073', {
  "prism": "wis",
  "element": "fire",
  "traits": [
    "stealth",
    "wither"
  ],
  "type": "unit",
  "cost": 2,
  "health": 2,
  "power": 2,
  "artSlug": "unit-panou-40",
  "attachment": "4024",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-fire-03",
  "relatedCards": [
    "20023"
  ],
  "textVocab": [
    "trigger-death"
  ],
  "effectTypes": [
    "Death"
  ]
})
CardLibrary.set('2074', {
  "prism": "wis",
  "element": "dark",
  "traits": [],
  "type": "spell",
  "cost": 1,
  "artSlug": "spell-case-74",
  "spellBehaviour": "offensive",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-dark-02",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('2075', {
  "prism": "wis",
  "element": "light",
  "traits": [
    "lifesteal",
    "wither"
  ],
  "type": "unit",
  "cost": 8,
  "health": 9,
  "power": 6,
  "artSlug": "unit-edsoa-05",
  "attachment": "20019",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-light-02",
  "relatedCards": [],
  "textVocab": [
    "trigger-play"
  ],
  "effectTypes": [
    "Play"
  ]
})
CardLibrary.set('2076', {
  "prism": "wis",
  "element": "air",
  "traits": [],
  "type": "spell",
  "cost": 3,
  "artSlug": "spell-xavi-06",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-air-01",
  "relatedCards": [],
  "textVocab": [
    "mulligan",
    "draw"
  ],
  "effectTypes": []
})
CardLibrary.set('2077', {
  "prism": "wis",
  "element": "air",
  "traits": [
    "stealth"
  ],
  "type": "unit",
  "cost": 6,
  "health": 7,
  "power": 5,
  "artSlug": "unit-xavi-42",
  "attachment": "2076",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-air-02",
  "relatedCards": [],
  "textVocab": [
    "draw"
  ],
  "effectTypes": []
})
CardLibrary.set('2078', {
  "prism": "wis",
  "element": "water",
  "traits": [],
  "type": "spell",
  "cost": 3,
  "artSlug": "spell-case-107",
  "spellBehaviour": "offensive",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-water-03",
  "relatedCards": [
    "20009"
  ],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('2079', {
  "prism": "wis",
  "element": "light",
  "traits": [
    "lifesteal"
  ],
  "type": "unit",
  "cost": 4,
  "health": 6,
  "power": 2,
  "artSlug": "unit-edsoa-31",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-light-03",
  "relatedCards": [],
  "textVocab": [
    "trigger-summon",
    "draw"
  ],
  "effectTypes": [
    "Summon"
  ]
})
CardLibrary.set('2080', {
  "prism": "wis",
  "element": "water",
  "traits": [
    "armor"
  ],
  "type": "unit",
  "cost": 3,
  "health": 3,
  "power": 0,
  "artSlug": "unit-lobo-42",
  "attachment": "4066",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-water-01",
  "relatedCards": [],
  "textVocab": [
    "trigger-sunrise"
  ],
  "effectTypes": [
    "Sunrise"
  ]
})
CardLibrary.set('2081', {
  "prism": "wis",
  "element": "water",
  "traits": [
    "guard",
    "wither"
  ],
  "type": "unit",
  "cost": 6,
  "health": 6,
  "power": 3,
  "artSlug": "unit-panou-01",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-water-01",
  "relatedCards": [],
  "textVocab": [
    "trigger-summon"
  ],
  "effectTypes": [
    "Summon"
  ]
})
CardLibrary.set('2082', {
  "prism": "wis",
  "element": "earth",
  "traits": [
    "banner"
  ],
  "type": "unit",
  "cost": 4,
  "health": 6,
  "power": 1,
  "artSlug": "unit-brian-07",
  "attachment": "1005",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-earth-02",
  "relatedCards": [],
  "textVocab": [
    "draw"
  ],
  "effectTypes": [
    "Generic"
  ]
})
CardLibrary.set('2083', {
  "prism": "wis",
  "element": "air",
  "traits": [
    "stealth"
  ],
  "type": "unit",
  "cost": 3,
  "health": 3,
  "power": 3,
  "artSlug": "unit-xavi-41",
  "attachment": "1059",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-air-02",
  "relatedCards": [],
  "textVocab": [
    "trigger-summon",
    "mulligan"
  ],
  "effectTypes": [
    "Summon"
  ]
})
CardLibrary.set('2084', {
  "prism": "wis",
  "element": "dark",
  "traits": [],
  "type": "spell",
  "cost": 8,
  "artSlug": "spell-xavi-11",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-dark-03",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('2085', {
  "prism": "wis",
  "element": "air",
  "traits": [],
  "type": "spell",
  "cost": 1,
  "artSlug": "spell-xavi-86",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-air-01",
  "relatedCards": [],
  "textVocab": [
    "mulligan",
    "draw"
  ],
  "effectTypes": []
})
CardLibrary.set('2086', {
  "prism": "wis",
  "element": "water",
  "traits": [
    "stealth",
    "armor"
  ],
  "type": "unit",
  "cost": 1,
  "health": 1,
  "power": 1,
  "artSlug": "unit-panou-36",
  "attachment": "20021",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-water-03",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('2087', {
  "prism": "int",
  "element": "mind",
  "traits": [
    "banner"
  ],
  "type": "spell",
  "cost": 1,
  "artSlug": "spell-case-105",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-mind-03",
  "relatedCards": [
    "20053",
    "20032"
  ],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('2088', {
  "prism": "wis",
  "element": "light",
  "traits": [
    "stealth",
    "lifesteal"
  ],
  "type": "unit",
  "cost": 1,
  "health": 2,
  "power": 1,
  "artSlug": "unit-xavi-52",
  "attachment": "4091",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-light-01",
  "relatedCards": [],
  "textVocab": [
    "trigger-inspire-spell"
  ],
  "effectTypes": [
    "Inspire"
  ]
})
CardLibrary.set('2089', {
  "prism": "wis",
  "element": "mind",
  "traits": [
    "stealth",
    "lifesteal"
  ],
  "type": "unit",
  "cost": 2,
  "health": 3,
  "power": 2,
  "artSlug": "unit-panou-51",
  "attachment": "2050",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-mind-02",
  "relatedCards": [],
  "textVocab": [
    "dust",
    "trigger-play"
  ],
  "effectTypes": [
    "Play"
  ]
})
CardLibrary.set('2090', {
  "prism": "wis",
  "element": "light",
  "traits": [],
  "type": "unit",
  "cost": 7,
  "health": 7,
  "power": 7,
  "artSlug": "unit-lobo-26",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-light-02",
  "relatedCards": [],
  "textVocab": [
    "trigger-summon"
  ],
  "effectTypes": [
    "Summon"
  ]
})
CardLibrary.set('2091', {
  "prism": "wis",
  "element": "fire",
  "traits": [
    "guard",
    "lifesteal"
  ],
  "type": "unit",
  "cost": 3,
  "health": 2,
  "power": 3,
  "artSlug": "unit-scava-21",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-fire-03",
  "relatedCards": [],
  "textVocab": [
    "trigger-summon"
  ],
  "effectTypes": [
    "Summon"
  ]
})
CardLibrary.set('2092', {
  "prism": "int",
  "element": "mind",
  "traits": [],
  "type": "spell",
  "cost": "X",
  "artSlug": "spell-case-163",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-mind-02",
  "relatedCards": [],
  "textVocab": [
    "draw"
  ],
  "effectTypes": []
})
CardLibrary.set('2093', {
  "prism": "wis",
  "element": "metal",
  "traits": [
    "armor"
  ],
  "type": "unit",
  "cost": 3,
  "health": 2,
  "power": 2,
  "artSlug": "unit-lobo-25",
  "attachment": "4095",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-metal-02",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": [
    "Continuous"
  ]
})
CardLibrary.set('2094', {
  "prism": "wis",
  "element": "earth",
  "traits": [],
  "type": "spell",
  "cost": 4,
  "artSlug": "spell-case-147",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-earth-01",
  "relatedCards": [
    "20003"
  ],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('2095', {
  "prism": "wis",
  "element": "earth",
  "traits": [
    "wither"
  ],
  "type": "unit",
  "cost": 2,
  "health": 4,
  "power": 1,
  "artSlug": "unit-desir-23",
  "attachment": "20033",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-earth-01",
  "relatedCards": [],
  "textVocab": [
    "trigger-sunrise"
  ],
  "effectTypes": [
    "Sunrise"
  ]
})
CardLibrary.set('2096', {
  "prism": "wis",
  "element": "water",
  "traits": [
    "guard",
    "lifesteal"
  ],
  "type": "unit",
  "cost": 3,
  "health": 4,
  "power": 2,
  "artSlug": "unit-lobo-48",
  "attachment": "20054",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-water-03",
  "relatedCards": [],
  "textVocab": [
    "trigger-sunrise",
    "stealth",
    "guard"
  ],
  "effectTypes": [
    "Sunrise"
  ]
})
CardLibrary.set('2097', {
  "prism": "wis",
  "element": "metal",
  "traits": [
    "banner"
  ],
  "type": "spell",
  "cost": 4,
  "artSlug": "spell-case-166",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-metal-01",
  "relatedCards": [
    "20014",
    "20017",
    "20022"
  ],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('2098', {
  "prism": "wis",
  "element": "dark",
  "traits": [
    "guard"
  ],
  "type": "unit",
  "cost": 4,
  "health": 3,
  "power": 3,
  "artSlug": "unit-delat-01",
  "spellBehaviour": "offensive",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-dark-03",
  "relatedCards": [],
  "textVocab": [
    "trigger-summon"
  ],
  "effectTypes": [
    "Summon"
  ]
})
CardLibrary.set('2099', {
  "prism": "wis",
  "element": "dark",
  "traits": [],
  "type": "spell",
  "cost": 2,
  "artSlug": "spell-case-30",
  "spellBehaviour": "offensive",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-dark-03",
  "relatedCards": [],
  "textVocab": [
    "dust"
  ],
  "effectTypes": []
})
CardLibrary.set('2100', {
  "prism": "wis",
  "element": "mind",
  "traits": [
    "guard"
  ],
  "type": "unit",
  "cost": 5,
  "health": 6,
  "power": 3,
  "artSlug": "unit-xavi-60",
  "attachment": "20053",
  "spellBehaviour": "offensive",
  "set": "Core Expansion",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-mind-03",
  "relatedCards": [],
  "textVocab": [
    "dust",
    "trigger-play",
    "trigger-death"
  ],
  "effectTypes": [
    "Play",
    "Death"
  ]
})
CardLibrary.set('2101', {
  "prism": "wis",
  "element": "water",
  "traits": [],
  "type": "spell",
  "cost": 4,
  "artSlug": "spell-case-188",
  "set": "Core Expansion",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-water-02",
  "relatedCards": [],
  "textVocab": [
    "draw"
  ],
  "effectTypes": []
})
CardLibrary.set('2102', {
  "prism": "wis",
  "element": "air",
  "traits": [
    "guard"
  ],
  "type": "unit",
  "cost": 5,
  "health": 6,
  "power": 4,
  "artSlug": "unit-erlan-01",
  "attachment": "20",
  "set": "Core Expansion",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-air-01",
  "relatedCards": [
    "20048"
  ],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('2103', {
  "prism": "wis",
  "element": "metal",
  "traits": [],
  "type": "spell",
  "cost": 2,
  "artSlug": "spell-case-164",
  "set": "Core Expansion",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-metal-01",
  "relatedCards": [
    "1081",
    "1072",
    "3061",
    "3035",
    "4031",
    "86",
    "60",
    "2087"
  ],
  "textVocab": [
    "rune"
  ],
  "effectTypes": []
})
CardLibrary.set('2104', {
  "prism": "wis",
  "element": "light",
  "traits": [
    "guard",
    "wither",
    "banner"
  ],
  "type": "unit",
  "cost": 8,
  "health": 8,
  "power": 6,
  "artSlug": "unit-calle-21",
  "spellBehaviour": "positive",
  "set": "Core Expansion",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-light-01",
  "relatedCards": [],
  "textVocab": [
    "dust",
    "trigger-death"
  ],
  "effectTypes": [
    "Death"
  ]
})
CardLibrary.set('2105', {
  "prism": "wis",
  "element": "mind",
  "traits": [],
  "type": "spell",
  "cost": 2,
  "artSlug": "spell-case-180",
  "spellBehaviour": "positive",
  "set": "Core Expansion",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-mind-03",
  "relatedCards": [],
  "textVocab": [
    "conjure",
    "draw"
  ],
  "effectTypes": []
})
CardLibrary.set('2106', {
  "prism": "wis",
  "element": "metal",
  "traits": [
    "dash",
    "lifesteal"
  ],
  "type": "unit",
  "cost": 5,
  "health": 5,
  "power": 3,
  "artSlug": "unit-calle-38",
  "attachment": "2010",
  "set": "Clash of Inventors",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-metal-03",
  "relatedCards": [],
  "textVocab": [
    "conjure",
    "draw"
  ],
  "effectTypes": []
})
CardLibrary.set('2107', {
  "prism": "wis",
  "element": "air",
  "traits": [
    "stealth",
    "dash"
  ],
  "type": "unit",
  "cost": 3,
  "health": 4,
  "power": 2,
  "artSlug": "unit-xavi-58",
  "attachment": "20042",
  "set": "Clash of Inventors",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-air-01",
  "relatedCards": [],
  "textVocab": [
    "draw"
  ],
  "effectTypes": [
    "Generic"
  ]
})
CardLibrary.set('2108', {
  "prism": "str",
  "element": "metal",
  "traits": [
    "dash"
  ],
  "type": "unit",
  "cost": 2,
  "health": 4,
  "power": 0,
  "artSlug": "unit-calle-27",
  "attachment": "20060",
  "set": "Clash of Inventors",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-metal-03",
  "relatedCards": [
    "20060"
  ],
  "textVocab": [],
  "effectTypes": [
    "Generic"
  ]
})
CardLibrary.set('2109', {
  "prism": "wis",
  "element": "mind",
  "traits": [
    "guard",
    "dash"
  ],
  "type": "unit",
  "cost": 4,
  "health": 6,
  "power": 5,
  "artSlug": "unit-calle-41",
  "attachment": "20053",
  "set": "Clash of Inventors",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-mind-02",
  "relatedCards": [],
  "textVocab": [
    "trigger-summon"
  ],
  "effectTypes": [
    "Summon"
  ]
})
CardLibrary.set('2110', {
  "prism": "wis",
  "element": "water",
  "traits": [],
  "type": "unit",
  "cost": 5,
  "health": 6,
  "power": 3,
  "artSlug": "unit-edsoa-69",
  "attachment": "2006",
  "set": "Clash of Inventors",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-water-03",
  "relatedCards": [],
  "textVocab": [
    "trigger-sunset"
  ],
  "effectTypes": [
    "Sunset"
  ]
})
CardLibrary.set('2111', {
  "prism": "wis",
  "element": "metal",
  "traits": [],
  "type": "unit",
  "cost": 6,
  "health": 2,
  "power": 2,
  "artSlug": "unit-calle-14",
  "set": "Clash of Inventors",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-metal-03",
  "relatedCards": [],
  "textVocab": [
    "trigger-summon",
    "lifesteal",
    "dash",
    "guard"
  ],
  "effectTypes": [
    "Summon"
  ]
})
CardLibrary.set('2112', {
  "prism": "wis",
  "element": "earth",
  "traits": [],
  "type": "spell",
  "cost": 2,
  "artSlug": "spell-case-185",
  "spellBehaviour": "offensive",
  "set": "Clash of Inventors",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-earth-01",
  "relatedCards": [
    "20025",
    "20048"
  ],
  "textVocab": [
    "dust"
  ],
  "effectTypes": []
})
CardLibrary.set('2113', {
  "prism": "wis",
  "element": "light",
  "traits": [],
  "type": "spell",
  "cost": 5,
  "artSlug": "spell-case-250",
  "set": "Clash of Inventors",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-light-02",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('2114', {
  "prism": "wis",
  "element": "mind",
  "traits": [],
  "type": "spell",
  "cost": 6,
  "artSlug": "spell-case-246",
  "set": "Clash of Inventors",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-mind-03",
  "relatedCards": [],
  "textVocab": [
    "draw"
  ],
  "effectTypes": []
})
CardLibrary.set('2115', {
  "prism": "wis",
  "element": "earth",
  "traits": [],
  "type": "spell",
  "cost": 6,
  "artSlug": "spell-case-219",
  "set": "Clash of Inventors",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-earth-01",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('2116', {
  "prism": "wis",
  "element": "light",
  "traits": [],
  "type": "unit",
  "cost": 7,
  "health": 8,
  "power": 4,
  "artSlug": "unit-edsoa-87",
  "set": "Clash of Inventors",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-light-01",
  "relatedCards": [
    "20058"
  ],
  "textVocab": [
    "draw"
  ],
  "effectTypes": []
})
CardLibrary.set('2117', {
  "prism": "wis",
  "element": "mind",
  "traits": [],
  "type": "unit",
  "cost": 7,
  "health": 5,
  "power": 5,
  "artSlug": "unit-xavi-73",
  "attachment": "20053",
  "set": "Clash of Inventors",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-mind-02",
  "relatedCards": [],
  "textVocab": [
    "trigger-play"
  ],
  "effectTypes": [
    "Play"
  ]
})
CardLibrary.set('2118', {
  "prism": "wis",
  "element": "fire",
  "traits": [],
  "type": "spell",
  "cost": 1,
  "artSlug": "spell-case-113",
  "set": "Clash of Inventors",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-fire-01",
  "relatedCards": [],
  "textVocab": [
    "draw"
  ],
  "effectTypes": []
})
CardLibrary.set('2119', {
  "prism": "wis",
  "element": "light",
  "traits": [],
  "type": "spell",
  "cost": 3,
  "artSlug": "spell-case-208",
  "spellBehaviour": "defensive",
  "set": "Clash of Inventors",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-light-02",
  "relatedCards": [
    "20019"
  ],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('2120', {
  "prism": "wis",
  "element": "earth",
  "traits": [
    "lifesteal"
  ],
  "type": "unit",
  "cost": 2,
  "health": 3,
  "power": 1,
  "artSlug": "unit-lobo-71",
  "set": "Hexbound Invasion",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-earth-01",
  "relatedCards": [],
  "textVocab": [
    "trigger-sunset"
  ],
  "effectTypes": [
    "Sunset"
  ]
})
CardLibrary.set('2121', {
  "prism": "wis",
  "element": "air",
  "traits": [],
  "type": "unit",
  "cost": 5,
  "health": 7,
  "power": 0,
  "artSlug": "unit-calle-28",
  "attachment": "20019",
  "set": "Hexbound Invasion",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-air-03",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": [
    "Continuous"
  ]
})
CardLibrary.set('2122', {
  "prism": "wis",
  "element": "mind",
  "traits": [
    "dash"
  ],
  "type": "unit",
  "cost": 4,
  "health": 6,
  "power": 2,
  "artSlug": "unit-lobo-54",
  "set": "Hexbound Invasion",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-mind-03",
  "relatedCards": [],
  "textVocab": [
    "trigger-slay-unit",
    "draw"
  ],
  "effectTypes": [
    "Slay"
  ]
})
CardLibrary.set('2123', {
  "prism": "wis",
  "element": "dark",
  "traits": [
    "guard",
    "wither"
  ],
  "type": "unit",
  "cost": 3,
  "health": 6,
  "power": 1,
  "artSlug": "unit-lobo-78",
  "set": "Hexbound Invasion",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-dark-03",
  "relatedCards": [
    "20064"
  ],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('2124', {
  "prism": "wis",
  "element": "earth",
  "traits": [
    "guard"
  ],
  "type": "unit",
  "cost": 4,
  "health": 2,
  "power": 0,
  "artSlug": "unit-patty-11",
  "set": "Hexbound Invasion",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-earth-03",
  "relatedCards": [],
  "textVocab": [
    "trigger-play"
  ],
  "effectTypes": [
    "Play"
  ]
})
CardLibrary.set('2125', {
  "prism": "wis",
  "element": "dark",
  "traits": [
    "guard",
    "wither"
  ],
  "type": "unit",
  "cost": 6,
  "health": 8,
  "power": 4,
  "artSlug": "unit-lobo-80",
  "attachment": "2038",
  "set": "Hexbound Invasion",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-dark-02",
  "relatedCards": [
    "20064"
  ],
  "textVocab": [
    "trigger-sunset"
  ],
  "effectTypes": [
    "Sunset"
  ]
})
CardLibrary.set('2126', {
  "prism": "wis",
  "element": "light",
  "traits": [],
  "type": "spell",
  "cost": 3,
  "artSlug": "spell-edsoa-07",
  "set": "Hexbound Invasion",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-light-03",
  "relatedCards": [],
  "textVocab": [
    "draw"
  ],
  "effectTypes": []
})
CardLibrary.set('2127', {
  "prism": "wis",
  "element": "air",
  "traits": [],
  "type": "spell",
  "cost": 7,
  "artSlug": "spell-case-283",
  "set": "Hexbound Invasion",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-air-01",
  "relatedCards": [],
  "textVocab": [
    "draw"
  ],
  "effectTypes": []
})
CardLibrary.set('2128', {
  "prism": "wis",
  "element": "air",
  "traits": [],
  "type": "spell",
  "cost": 6,
  "artSlug": "spell-case-243",
  "set": "Hexbound Invasion",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-air-02",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('2129', {
  "prism": "wis",
  "element": "dark",
  "traits": [],
  "type": "spell",
  "cost": 6,
  "artSlug": "spell-case-277",
  "set": "Hexbound Invasion",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-dark-03",
  "relatedCards": [
    "20064"
  ],
  "textVocab": [
    "trigger-slay-spell"
  ],
  "effectTypes": [
    "Slay"
  ]
})
CardLibrary.set('2130', {
  "prism": "wis",
  "element": "fire",
  "traits": [],
  "type": "unit",
  "cost": 4,
  "health": 8,
  "power": 2,
  "artSlug": "unit-xavi-62",
  "set": "Hexbound Invasion",
  "releaseSeason": 18,
  "backgroundArtSlug": "bg-fire-03",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('2131', {
  "prism": "wis",
  "element": "metal",
  "traits": [],
  "type": "spell",
  "cost": 4,
  "artSlug": "spell-case-83",
  "spellBehaviour": "offensive",
  "set": "Hexbound Invasion",
  "releaseSeason": 19,
  "backgroundArtSlug": "bg-metal-02",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('2132', {
  "prism": "wis",
  "element": "dark",
  "traits": [],
  "type": "unit",
  "cost": 2,
  "health": 6,
  "power": 1,
  "artSlug": "unit-calle-52",
  "set": "Hexbound Invasion",
  "releaseSeason": 20,
  "backgroundArtSlug": "bg-dark-03",
  "relatedCards": [
    "20064"
  ],
  "textVocab": [
    "trigger-sunrise"
  ],
  "effectTypes": [
    "Sunrise"
  ]
})
CardLibrary.set('2133', {
  "prism": "wis",
  "element": "fire",
  "traits": [
    "lifesteal"
  ],
  "type": "unit",
  "cost": 2,
  "health": 5,
  "power": 1,
  "artSlug": "unit-mini-02",
  "set": "Starter Expansion",
  "releaseSeason": 21,
  "backgroundArtSlug": "bg-fire-03",
  "relatedCards": [],
  "textVocab": [
    "trigger-play"
  ],
  "effectTypes": [
    "Play"
  ]
})
CardLibrary.set('2134', {
  "prism": "wis",
  "element": "mind",
  "traits": [],
  "type": "spell",
  "cost": 7,
  "artSlug": "spell-case-238",
  "set": "Starter Expansion",
  "releaseSeason": 22,
  "backgroundArtSlug": "bg-mind-02",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('2135', {
  "prism": "wis",
  "element": "water",
  "traits": [],
  "type": "spell",
  "cost": 7,
  "artSlug": "spell-mara-22",
  "set": "Starter Expansion",
  "releaseSeason": 22,
  "backgroundArtSlug": "bg-water-03",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('2136', {
  "prism": "wis",
  "element": "air",
  "traits": [
    "stealth"
  ],
  "type": "unit",
  "cost": 2,
  "health": 2,
  "power": 2,
  "artSlug": "unit-xavi-86",
  "set": "Starter Expansion",
  "releaseSeason": 22,
  "backgroundArtSlug": "bg-air-01",
  "relatedCards": [],
  "textVocab": [
    "trigger-play",
    "wisp",
    "draw"
  ],
  "effectTypes": [
    "Play"
  ]
})
CardLibrary.set('2137', {
  "prism": "wis",
  "element": "air",
  "traits": [
    "dash"
  ],
  "type": "unit",
  "cost": 6,
  "health": 7,
  "power": 1,
  "artSlug": "unit-mara-18",
  "set": "Starter Expansion",
  "releaseSeason": 22,
  "backgroundArtSlug": "bg-air-02",
  "relatedCards": [],
  "textVocab": [
    "trigger-play"
  ],
  "effectTypes": [
    "Play"
  ]
})
CardLibrary.set('2138', {
  "prism": "wis",
  "element": "dark",
  "traits": [],
  "type": "unit",
  "cost": 10,
  "health": 10,
  "power": 10,
  "artSlug": "unit-cho-10",
  "set": "Starter Expansion",
  "releaseSeason": 22,
  "backgroundArtSlug": "bg-dark-01",
  "relatedCards": [],
  "textVocab": [
    "trigger-play",
    "draw"
  ],
  "effectTypes": [
    "Play"
  ]
})
CardLibrary.set('2139', {
  "prism": "wis",
  "element": "dark",
  "traits": [
    "wither"
  ],
  "type": "unit",
  "cost": 1,
  "health": 3,
  "power": 1,
  "artSlug": "unit-xavi-87",
  "set": "Starter Expansion",
  "releaseSeason": 22,
  "backgroundArtSlug": "bg-dark-01",
  "relatedCards": [],
  "textVocab": [
    "trigger-play"
  ],
  "effectTypes": [
    "Play"
  ]
})
CardLibrary.set('2140', {
  "prism": "wis",
  "element": "dark",
  "traits": [
    "wither"
  ],
  "type": "unit",
  "cost": 5,
  "health": 3,
  "power": 3,
  "artSlug": "unit-mara-19",
  "set": "Starter Expansion",
  "releaseSeason": 22,
  "backgroundArtSlug": "bg-dark-03",
  "relatedCards": [],
  "textVocab": [
    "trigger-play"
  ],
  "effectTypes": [
    "Play"
  ]
})
CardLibrary.set('2141', {
  "prism": "wis",
  "element": "earth",
  "traits": [],
  "type": "unit",
  "cost": 4,
  "health": 3,
  "power": 3,
  "artSlug": "unit-mara-20",
  "set": "Starter Expansion",
  "releaseSeason": 22,
  "backgroundArtSlug": "bg-earth-03",
  "relatedCards": [],
  "textVocab": [
    "trigger-play"
  ],
  "effectTypes": [
    "Play"
  ]
})
CardLibrary.set('2142', {
  "prism": "wis",
  "element": "earth",
  "traits": [
    "guard"
  ],
  "type": "unit",
  "cost": 2,
  "health": 5,
  "power": 0,
  "artSlug": "unit-xavi-88",
  "attachment": "2048",
  "set": "Starter Expansion",
  "releaseSeason": 22,
  "backgroundArtSlug": "bg-earth-02",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('2143', {
  "prism": "wis",
  "element": "fire",
  "traits": [],
  "type": "unit",
  "cost": 2,
  "health": 2,
  "power": 3,
  "artSlug": "unit-xavi-89",
  "set": "Starter Expansion",
  "releaseSeason": 22,
  "backgroundArtSlug": "bg-fire-03",
  "relatedCards": [],
  "textVocab": [
    "trigger-play",
    "scion",
    "draw"
  ],
  "effectTypes": [
    "Play"
  ]
})
CardLibrary.set('2144', {
  "prism": "wis",
  "element": "fire",
  "traits": [],
  "type": "unit",
  "cost": 5,
  "health": 4,
  "power": 4,
  "artSlug": "unit-mara-21",
  "set": "Starter Expansion",
  "releaseSeason": 22,
  "backgroundArtSlug": "bg-fire-02",
  "relatedCards": [],
  "textVocab": [
    "trigger-play"
  ],
  "effectTypes": [
    "Play"
  ]
})
CardLibrary.set('2145', {
  "prism": "wis",
  "element": "light",
  "traits": [
    "guard",
    "lifesteal"
  ],
  "type": "unit",
  "cost": 1,
  "health": 3,
  "power": 1,
  "artSlug": "unit-xavi-90",
  "set": "Starter Expansion",
  "releaseSeason": 22,
  "backgroundArtSlug": "bg-light-01",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('2146', {
  "prism": "wis",
  "element": "light",
  "traits": [
    "guard",
    "lifesteal"
  ],
  "type": "unit",
  "cost": 7,
  "health": 6,
  "power": 6,
  "artSlug": "unit-mara-17",
  "set": "Starter Expansion",
  "releaseSeason": 22,
  "backgroundArtSlug": "bg-light-01",
  "relatedCards": [],
  "textVocab": [
    "trigger-play"
  ],
  "effectTypes": [
    "Play"
  ]
})
CardLibrary.set('2147', {
  "prism": "wis",
  "element": "metal",
  "traits": [
    "guard"
  ],
  "type": "unit",
  "cost": 2,
  "health": 5,
  "power": 1,
  "artSlug": "unit-xavi-91",
  "set": "Starter Expansion",
  "releaseSeason": 22,
  "backgroundArtSlug": "bg-metal-01",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": [
    "Generic"
  ]
})
CardLibrary.set('2148', {
  "prism": "wis",
  "element": "metal",
  "traits": [
    "guard"
  ],
  "type": "unit",
  "cost": 6,
  "health": 6,
  "power": 4,
  "artSlug": "unit-mara-22",
  "set": "Starter Expansion",
  "releaseSeason": 22,
  "backgroundArtSlug": "bg-metal-02",
  "relatedCards": [],
  "textVocab": [
    "trigger-sunset"
  ],
  "effectTypes": [
    "Sunset"
  ]
})
CardLibrary.set('2149', {
  "prism": "wis",
  "element": "mind",
  "traits": [],
  "type": "unit",
  "cost": 5,
  "health": 4,
  "power": 3,
  "artSlug": "unit-mara-24",
  "set": "Starter Expansion",
  "releaseSeason": 22,
  "backgroundArtSlug": "bg-mind-03",
  "relatedCards": [
    "2151"
  ],
  "textVocab": [
    "trigger-play"
  ],
  "effectTypes": [
    "Play"
  ]
})
CardLibrary.set('2150', {
  "prism": "wis",
  "element": "water",
  "traits": [],
  "type": "unit",
  "cost": 1,
  "health": 2,
  "power": 2,
  "artSlug": "unit-xavi-93",
  "set": "Starter Expansion",
  "releaseSeason": 22,
  "backgroundArtSlug": "bg-water-03",
  "relatedCards": [],
  "textVocab": [
    "trigger-play"
  ],
  "effectTypes": [
    "Play"
  ]
})
CardLibrary.set('2151', {
  "prism": "wis",
  "element": "mind",
  "traits": [
    "guard"
  ],
  "type": "unit",
  "cost": 2,
  "health": 3,
  "power": 2,
  "artSlug": "unit-xavi-92",
  "set": "Starter Expansion",
  "releaseSeason": 22,
  "backgroundArtSlug": "bg-mind-02",
  "relatedCards": [],
  "textVocab": [
    "trigger-death"
  ],
  "effectTypes": [
    "Death"
  ]
})
CardLibrary.set('2152', {
  "prism": "wis",
  "element": "water",
  "traits": [],
  "type": "unit",
  "cost": 4,
  "health": 5,
  "power": 3,
  "artSlug": "unit-mara-23",
  "set": "Starter Expansion",
  "releaseSeason": 22,
  "backgroundArtSlug": "bg-water-03",
  "relatedCards": [],
  "textVocab": [
    "draw"
  ],
  "effectTypes": [
    "Generic"
  ]
})
CardLibrary.set('2153', {
  "prism": "wis",
  "element": "air",
  "traits": [],
  "type": "spell",
  "cost": 1,
  "artSlug": "spell-mara-31",
  "spellBehaviour": "offensive",
  "set": "Starter Expansion",
  "releaseSeason": 22,
  "backgroundArtSlug": "bg-air-03",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('2154', {
  "prism": "wis",
  "element": "light",
  "traits": [],
  "type": "spell",
  "cost": 4,
  "artSlug": "spell-mara-11",
  "set": "Starter Expansion",
  "releaseSeason": 22,
  "backgroundArtSlug": "bg-light-01",
  "relatedCards": [],
  "textVocab": [
    "scion",
    "wisp",
    "draw"
  ],
  "effectTypes": []
})
CardLibrary.set('2155', {
  "prism": "wis",
  "element": "fire",
  "traits": [],
  "type": "spell",
  "cost": 3,
  "artSlug": "spell-case-138",
  "set": "Starter Expansion",
  "releaseSeason": 22,
  "backgroundArtSlug": "bg-fire-02",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('2156', {
  "prism": "wis",
  "element": "fire",
  "traits": [],
  "type": "spell",
  "cost": 3,
  "artSlug": "spell-case-155",
  "set": "Starter Expansion",
  "releaseSeason": 22,
  "backgroundArtSlug": "bg-fire-03",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('2157', {
  "prism": "wis",
  "element": "light",
  "traits": [],
  "type": "spell",
  "cost": 5,
  "artSlug": "spell-mara-28",
  "set": "Starter Expansion",
  "releaseSeason": 22,
  "backgroundArtSlug": "bg-light-01",
  "relatedCards": [],
  "textVocab": [
    "scion",
    "wisp",
    "draw"
  ],
  "effectTypes": []
})
CardLibrary.set('2158', {
  "prism": "wis",
  "element": "mind",
  "traits": [],
  "type": "spell",
  "cost": 3,
  "artSlug": "spell-case-304",
  "set": "Starter Expansion",
  "releaseSeason": 22,
  "backgroundArtSlug": "bg-mind-02",
  "relatedCards": [],
  "textVocab": [
    "draw"
  ],
  "effectTypes": []
})
CardLibrary.set('2159', {
  "prism": "wis",
  "element": "water",
  "traits": [],
  "type": "spell",
  "cost": 2,
  "artSlug": "spell-mara-26",
  "set": "Starter Expansion",
  "releaseSeason": 22,
  "backgroundArtSlug": "bg-water-03",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('2160', {
  "prism": "wis",
  "element": "light",
  "traits": [],
  "type": "unit",
  "cost": 5,
  "health": 7,
  "power": 4,
  "artSlug": "unit-edsoa-65",
  "set": "Starter Expansion",
  "releaseSeason": 24,
  "backgroundArtSlug": "bg-light-01",
  "relatedCards": [],
  "textVocab": [
    "lifesteal",
    "trigger-sunset",
    "armor"
  ],
  "effectTypes": [
    "Sunset"
  ]
})
CardLibrary.set('2161', {
  "prism": "wis",
  "element": "earth",
  "traits": [
    "guard"
  ],
  "type": "unit",
  "cost": 5,
  "health": 1,
  "power": 5,
  "artSlug": "unit-calle-75",
  "set": "Starter Expansion",
  "releaseSeason": 25,
  "backgroundArtSlug": "bg-earth-01",
  "relatedCards": [],
  "textVocab": [
    "trigger-play"
  ],
  "effectTypes": [
    "Play"
  ]
})
CardLibrary.set('2162', {
  "prism": "wis",
  "element": "mind",
  "traits": [],
  "type": "unit",
  "cost": 5,
  "health": 6,
  "power": 4,
  "artSlug": "unit-xavi-69",
  "set": "Starter Expansion",
  "releaseSeason": 25,
  "backgroundArtSlug": "bg-mind-01",
  "relatedCards": [],
  "textVocab": [
    "trigger-sunset",
    "draw"
  ],
  "effectTypes": [
    "Sunset"
  ]
})
CardLibrary.set('2163', {
  "prism": "wis",
  "element": "earth",
  "traits": [],
  "type": "unit",
  "cost": 7,
  "health": 5,
  "power": 2,
  "artSlug": "unit-edsoa-131",
  "attachment": "20039",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-earth-01",
  "relatedCards": [
    "20003"
  ],
  "textVocab": [
    "trigger-sunset"
  ],
  "effectTypes": [
    "Sunset"
  ]
})
CardLibrary.set('2164', {
  "prism": "wis",
  "element": "metal",
  "traits": [],
  "type": "unit",
  "cost": 3,
  "health": 4,
  "power": 2,
  "artSlug": "unit-chen-18",
  "attachment": "2166",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-metal-01",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('2165', {
  "prism": "wis",
  "element": "dark",
  "traits": [
    "wither",
    "lifesteal"
  ],
  "type": "unit",
  "cost": 4,
  "health": 8,
  "power": 0,
  "artSlug": "unit-edsoa-68",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-dark-01",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('2166', {
  "prism": "wis",
  "element": "metal",
  "traits": [],
  "type": "spell",
  "cost": 1,
  "artSlug": "spell-case-231",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-metal-01",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('2167', {
  "prism": "wis",
  "element": "air",
  "traits": [],
  "type": "spell",
  "cost": 4,
  "artSlug": "spell-case-301",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-air-02",
  "relatedCards": [],
  "textVocab": [
    "draw"
  ],
  "effectTypes": []
})
CardLibrary.set('2177', {
  "prism": "wis",
  "element": "fire",
  "traits": [
    "lifesteal"
  ],
  "type": "unit",
  "cost": 4,
  "health": 8,
  "power": 2,
  "artSlug": "unit-calle-110",
  "set": "Hexbound Invasion",
  "releaseSeason": 31,
  "backgroundArtSlug": "bg-fire-02",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": [
    "Generic"
  ]
})
CardLibrary.set('2178', {
  "prism": "wis",
  "element": "earth",
  "traits": [],
  "type": "unit",
  "cost": 2,
  "health": 4,
  "power": 1,
  "artSlug": "unit-calle-73",
  "attachment": "2026",
  "set": "Hexbound Invasion",
  "releaseSeason": 31,
  "backgroundArtSlug": "bg-earth-01",
  "relatedCards": [],
  "textVocab": [
    "trigger-sunset",
    "draw"
  ],
  "effectTypes": [
    "Sunset"
  ]
})
CardLibrary.set('2179', {
  "prism": "wis",
  "element": "metal",
  "traits": [],
  "type": "unit",
  "cost": 4,
  "health": 3,
  "power": 6,
  "artSlug": "unit-edsoa-70",
  "set": "Hexbound Invasion",
  "releaseSeason": 31,
  "backgroundArtSlug": "bg-metal-01",
  "relatedCards": [],
  "textVocab": [
    "trigger-play"
  ],
  "effectTypes": [
    "Play"
  ]
})
CardLibrary.set('2180', {
  "prism": "wis",
  "element": "air",
  "traits": [],
  "type": "unit",
  "cost": 3,
  "health": 6,
  "power": 2,
  "artSlug": "unit-soyun-03",
  "attachment": "2181",
  "set": "Hexbound Invasion",
  "releaseSeason": 31,
  "backgroundArtSlug": "bg-air-02",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": [
    "Generic"
  ]
})
CardLibrary.set('2181', {
  "prism": "wis",
  "element": "light",
  "traits": [],
  "type": "spell",
  "cost": 2,
  "artSlug": "spell-case-258",
  "set": "Hexbound Invasion",
  "releaseSeason": 31,
  "backgroundArtSlug": "bg-light-01",
  "relatedCards": [
    "20027"
  ],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('3000', {
  "prism": "hrt",
  "element": "earth",
  "traits": [
    "guard",
    "lifesteal"
  ],
  "type": "unit",
  "cost": 1,
  "health": 1,
  "power": 1,
  "artSlug": "unit-puddu-03",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-earth-02",
  "relatedCards": [
    "3010"
  ],
  "textVocab": [
    "trigger-death"
  ],
  "effectTypes": [
    "Death"
  ]
})
CardLibrary.set('3001', {
  "prism": "hrt",
  "element": "earth",
  "traits": [],
  "type": "spell",
  "cost": 2,
  "artSlug": "spell-case-172",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-earth-02",
  "relatedCards": [],
  "textVocab": [
    "draw"
  ],
  "effectTypes": []
})
CardLibrary.set('3002', {
  "prism": "hrt",
  "element": "dark",
  "traits": [
    "wither"
  ],
  "type": "unit",
  "cost": 7,
  "health": 5,
  "power": 5,
  "artSlug": "unit-edsoa-39",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-dark-01",
  "relatedCards": [],
  "textVocab": [
    "trigger-summon"
  ],
  "effectTypes": [
    "Summon"
  ]
})
CardLibrary.set('3003', {
  "prism": "hrt",
  "element": "fire",
  "traits": [
    "guard",
    "banner"
  ],
  "type": "unit",
  "cost": 4,
  "health": 2,
  "power": 2,
  "artSlug": "unit-edsoa-45",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-fire-02",
  "relatedCards": [
    "20018"
  ],
  "textVocab": [
    "trigger-death"
  ],
  "effectTypes": [
    "Death"
  ]
})
CardLibrary.set('3004', {
  "prism": "hrt",
  "element": "dark",
  "traits": [
    "guard",
    "wither"
  ],
  "type": "unit",
  "cost": 3,
  "health": 5,
  "power": 1,
  "artSlug": "unit-giaco-06",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-dark-01",
  "relatedCards": [
    "3022"
  ],
  "textVocab": [
    "trigger-death"
  ],
  "effectTypes": [
    "Death"
  ]
})
CardLibrary.set('3005', {
  "prism": "hrt",
  "element": "dark",
  "traits": [
    "guard"
  ],
  "type": "unit",
  "cost": 1,
  "health": 2,
  "power": 2,
  "artSlug": "unit-edsoa-11",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-dark-03",
  "relatedCards": [],
  "textVocab": [
    "trigger-death",
    "draw"
  ],
  "effectTypes": [
    "Death"
  ]
})
CardLibrary.set('3006', {
  "prism": "hrt",
  "element": "light",
  "traits": [
    "stealth",
    "lifesteal"
  ],
  "type": "unit",
  "cost": 3,
  "health": 3,
  "power": 2,
  "artSlug": "unit-lobo-49",
  "attachment": "20020",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-light-02",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": [
    "Generic"
  ]
})
CardLibrary.set('3007', {
  "prism": "agy",
  "element": "metal",
  "traits": [
    "banner",
    "wither"
  ],
  "type": "unit",
  "cost": 2,
  "health": 2,
  "power": 2,
  "artSlug": "unit-shapo-68",
  "attachment": "1048",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-metal-01",
  "relatedCards": [],
  "textVocab": [
    "wither"
  ],
  "effectTypes": [
    "Continuous"
  ]
})
CardLibrary.set('3008', {
  "prism": "hrt",
  "element": "fire",
  "traits": [],
  "type": "spell",
  "cost": 3,
  "artSlug": "spell-case-130",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-fire-03",
  "relatedCards": [
    "20003",
    "20023"
  ],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('3009', {
  "prism": "hrt",
  "element": "dark",
  "traits": [],
  "type": "unit",
  "cost": 4,
  "health": 5,
  "power": 3,
  "artSlug": "unit-rubio-08",
  "attachment": "3156",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-dark-03",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('3010', {
  "prism": "hrt",
  "element": "dark",
  "traits": [
    "guard",
    "wither"
  ],
  "type": "unit",
  "cost": 4,
  "health": 5,
  "power": 3,
  "artSlug": "unit-puddu-04",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-dark-03",
  "relatedCards": [],
  "textVocab": [
    "trigger-death"
  ],
  "effectTypes": [
    "Death"
  ]
})
CardLibrary.set('3011', {
  "prism": "hrt",
  "element": "dark",
  "traits": [],
  "type": "spell",
  "cost": 1,
  "artSlug": "spell-xavi-81",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-dark-03",
  "relatedCards": [
    "20013"
  ],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('3012', {
  "prism": "hrt",
  "element": "earth",
  "traits": [
    "guard"
  ],
  "type": "unit",
  "cost": 5,
  "health": 5,
  "power": 5,
  "artSlug": "unit-xavi-25",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-earth-01",
  "relatedCards": [],
  "textVocab": [
    "trigger-death"
  ],
  "effectTypes": [
    "Death"
  ]
})
CardLibrary.set('3013', {
  "prism": "hrt",
  "element": "earth",
  "traits": [],
  "type": "unit",
  "cost": 5,
  "health": 8,
  "power": 3,
  "artSlug": "unit-lobo-45",
  "attachment": "3001",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-earth-02",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": [
    "Continuous"
  ]
})
CardLibrary.set('3014', {
  "prism": "hrt",
  "element": "light",
  "traits": [
    "wither"
  ],
  "type": "spell",
  "cost": "X",
  "artSlug": "spell-case-14",
  "spellBehaviour": "offensive",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-light-03",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('3015', {
  "prism": "hrt",
  "element": "dark",
  "traits": [
    "lifesteal",
    "stealth"
  ],
  "type": "unit",
  "cost": 10,
  "health": 8,
  "power": 8,
  "artSlug": "unit-edsoa-34",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-dark-03",
  "relatedCards": [
    "20013"
  ],
  "textVocab": [
    "trigger-play",
    "trigger-death",
    "guard"
  ],
  "effectTypes": [
    "Play",
    "Death"
  ]
})
CardLibrary.set('3016', {
  "prism": "hrt",
  "element": "metal",
  "traits": [],
  "type": "spell",
  "cost": 1,
  "artSlug": "spell-xavi-18",
  "spellBehaviour": "defensive",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-metal-02",
  "relatedCards": [
    "20047"
  ],
  "textVocab": [
    "armor",
    "guard"
  ],
  "effectTypes": []
})
CardLibrary.set('3017', {
  "prism": "hrt",
  "element": "water",
  "traits": [],
  "type": "spell",
  "cost": 4,
  "artSlug": "spell-xavi-30",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-water-03",
  "relatedCards": [
    "20009"
  ],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('3018', {
  "prism": "hrt",
  "element": "light",
  "traits": [],
  "type": "unit",
  "cost": 1,
  "health": 2,
  "power": 1,
  "artSlug": "unit-edsoa-43",
  "attachment": "20031",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-light-01",
  "relatedCards": [
    "20019"
  ],
  "textVocab": [
    "trigger-inspire-light"
  ],
  "effectTypes": [
    "Inspire"
  ]
})
CardLibrary.set('3019', {
  "prism": "hrt",
  "element": "light",
  "traits": [
    "guard",
    "lifesteal"
  ],
  "type": "unit",
  "cost": 3,
  "health": 3,
  "power": 3,
  "artSlug": "unit-edsoa-33",
  "attachment": "3021",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-light-01",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('3020', {
  "prism": "hrt",
  "element": "mind",
  "traits": [],
  "type": "spell",
  "cost": 2,
  "artSlug": "spell-case-73",
  "spellBehaviour": "offensive",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-mind-03",
  "relatedCards": [
    "20032"
  ],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('3021', {
  "prism": "hrt",
  "element": "light",
  "traits": [
    "banner"
  ],
  "type": "spell",
  "cost": 3,
  "artSlug": "spell-case-151",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-light-01",
  "relatedCards": [
    "20019"
  ],
  "textVocab": [
    "banner-spell"
  ],
  "effectTypes": []
})
CardLibrary.set('3022', {
  "prism": "hrt",
  "element": "dark",
  "traits": [],
  "type": "spell",
  "cost": 6,
  "artSlug": "spell-erlan-02",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-dark-02",
  "relatedCards": [
    "20013"
  ],
  "textVocab": [
    "guard"
  ],
  "effectTypes": []
})
CardLibrary.set('3023', {
  "prism": "hrt",
  "element": "light",
  "traits": [],
  "type": "spell",
  "cost": 4,
  "artSlug": "spell-rubio-19",
  "spellBehaviour": "offensive",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-light-03",
  "relatedCards": [
    "3148"
  ],
  "textVocab": [
    "dust"
  ],
  "effectTypes": []
})
CardLibrary.set('3024', {
  "prism": "hrt",
  "element": "dark",
  "traits": [
    "wither",
    "lifesteal"
  ],
  "type": "unit",
  "cost": 4,
  "health": 5,
  "power": 4,
  "artSlug": "unit-tonel-06",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-dark-02",
  "relatedCards": [],
  "textVocab": [
    "trigger-glory"
  ],
  "effectTypes": [
    "Glory"
  ]
})
CardLibrary.set('3025', {
  "prism": "hrt",
  "element": "mind",
  "traits": [],
  "type": "spell",
  "cost": 1,
  "artSlug": "spell-case-37",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-mind-02",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('3026', {
  "prism": "hrt",
  "element": "dark",
  "traits": [],
  "type": "spell",
  "cost": 3,
  "artSlug": "spell-case-36",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-dark-03",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('3027', {
  "prism": "hrt",
  "element": "dark",
  "traits": [],
  "type": "spell",
  "cost": 3,
  "artSlug": "spell-case-203",
  "spellBehaviour": "defensive",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-dark-01",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('3028', {
  "prism": "hrt",
  "element": "dark",
  "traits": [],
  "type": "spell",
  "cost": 4,
  "artSlug": "spell-xavi-71",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-dark-02",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('3029', {
  "prism": "hrt",
  "element": "light",
  "traits": [],
  "type": "spell",
  "cost": 2,
  "artSlug": "spell-case-132",
  "spellBehaviour": "defensive",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-light-03",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('3030', {
  "prism": "hrt",
  "element": "air",
  "traits": [],
  "type": "spell",
  "cost": 2,
  "artSlug": "spell-xavi-53",
  "spellBehaviour": "defensive",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-air-01",
  "relatedCards": [
    "20042"
  ],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('3031', {
  "prism": "int",
  "element": "mind",
  "traits": [],
  "type": "spell",
  "cost": 5,
  "artSlug": "spell-xavi-51",
  "spellBehaviour": "offensive",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-mind-02",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('3032', {
  "prism": "hrt",
  "element": "air",
  "traits": [
    "guard"
  ],
  "type": "unit",
  "cost": 2,
  "health": 3,
  "power": 1,
  "artSlug": "unit-lobo-36",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-air-01",
  "relatedCards": [
    "20000"
  ],
  "textVocab": [
    "trigger-summon"
  ],
  "effectTypes": [
    "Summon"
  ]
})
CardLibrary.set('3033', {
  "prism": "hrt",
  "element": "dark",
  "traits": [
    "stealth",
    "lifesteal"
  ],
  "type": "unit",
  "cost": 7,
  "health": 3,
  "power": 1,
  "artSlug": "unit-shapo-01",
  "attachment": "20035",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-dark-01",
  "relatedCards": [],
  "textVocab": [
    "trigger-sunrise"
  ],
  "effectTypes": [
    "Sunrise"
  ]
})
CardLibrary.set('3034', {
  "prism": "hrt",
  "element": "light",
  "traits": [],
  "type": "unit",
  "cost": 6,
  "health": 6,
  "power": 5,
  "artSlug": "unit-lobo-09",
  "attachment": "3029",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-light-02",
  "relatedCards": [],
  "textVocab": [
    "trigger-inspire-spell"
  ],
  "effectTypes": [
    "Inspire"
  ]
})
CardLibrary.set('3035', {
  "prism": "hrt",
  "element": "light",
  "traits": [
    "banner"
  ],
  "type": "spell",
  "cost": 1,
  "artSlug": "spell-case-103",
  "spellBehaviour": "defensive",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-light-03",
  "relatedCards": [
    "20019",
    "20050"
  ],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('3036', {
  "prism": "hrt",
  "element": "air",
  "traits": [],
  "type": "unit",
  "cost": 1,
  "health": 2,
  "power": 1,
  "artSlug": "unit-lobo-17",
  "attachment": "10",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-air-03",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('3037', {
  "prism": "hrt",
  "element": "earth",
  "traits": [
    "guard"
  ],
  "type": "unit",
  "cost": 4,
  "health": 5,
  "power": 1,
  "artSlug": "unit-racca-02",
  "attachment": "3056",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-earth-02",
  "relatedCards": [],
  "textVocab": [
    "trigger-death"
  ],
  "effectTypes": [
    "Death"
  ]
})
CardLibrary.set('3038', {
  "prism": "hrt",
  "element": "dark",
  "traits": [],
  "type": "unit",
  "cost": 3,
  "health": 5,
  "power": 2,
  "artSlug": "unit-rubio-26",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-dark-02",
  "relatedCards": [],
  "textVocab": [
    "draw"
  ],
  "effectTypes": [
    "Generic"
  ]
})
CardLibrary.set('3039', {
  "prism": "hrt",
  "element": "metal",
  "traits": [
    "guard"
  ],
  "type": "unit",
  "cost": 1,
  "health": 3,
  "power": 1,
  "artSlug": "unit-vini-15",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-metal-01",
  "relatedCards": [
    "20017"
  ],
  "textVocab": [
    "trigger-death"
  ],
  "effectTypes": [
    "Death"
  ]
})
CardLibrary.set('3040', {
  "prism": "hrt",
  "element": "light",
  "traits": [
    "banner"
  ],
  "type": "unit",
  "cost": 2,
  "health": 2,
  "power": 2,
  "artSlug": "unit-rubio-20",
  "attachment": "20019",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-light-02",
  "relatedCards": [
    "20019"
  ],
  "textVocab": [
    "trigger-inspire-light",
    "guard"
  ],
  "effectTypes": [
    "Inspire"
  ]
})
CardLibrary.set('3041', {
  "prism": "str",
  "element": "metal",
  "traits": [],
  "type": "spell",
  "cost": 3,
  "artSlug": "spell-case-97",
  "spellBehaviour": "defensive",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-metal-03",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('3042', {
  "prism": "hrt",
  "element": "air",
  "traits": [
    "lifesteal"
  ],
  "type": "unit",
  "cost": 4,
  "health": 6,
  "power": 2,
  "artSlug": "unit-shapo-22",
  "attachment": "3043",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-air-01",
  "relatedCards": [],
  "textVocab": [
    "trigger-glory"
  ],
  "effectTypes": [
    "Glory"
  ]
})
CardLibrary.set('3043', {
  "prism": "hrt",
  "element": "light",
  "traits": [],
  "type": "spell",
  "cost": 5,
  "artSlug": "spell-xavi-24",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-light-02",
  "relatedCards": [
    "20019"
  ],
  "textVocab": [
    "banner-spell"
  ],
  "effectTypes": []
})
CardLibrary.set('3044', {
  "prism": "hrt",
  "element": "fire",
  "traits": [],
  "type": "spell",
  "cost": 1,
  "artSlug": "spell-case-77",
  "spellBehaviour": "offensive",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-fire-03",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('3045', {
  "prism": "hrt",
  "element": "earth",
  "traits": [
    "armor"
  ],
  "type": "unit",
  "cost": 9,
  "health": 5,
  "power": 10,
  "artSlug": "unit-calle-22",
  "attachment": "20047",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-earth-03",
  "relatedCards": [
    "20006"
  ],
  "textVocab": [
    "trigger-death",
    "armor"
  ],
  "effectTypes": [
    "Death"
  ]
})
CardLibrary.set('3046', {
  "prism": "hrt",
  "element": "dark",
  "traits": [],
  "type": "unit",
  "cost": 2,
  "health": 3,
  "power": 2,
  "artSlug": "unit-chen-14",
  "attachment": "3081",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-dark-01",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": [
    "Generic"
  ]
})
CardLibrary.set('3047', {
  "prism": "hrt",
  "element": "light",
  "traits": [
    "banner",
    "lifesteal"
  ],
  "type": "unit",
  "cost": 4,
  "health": 3,
  "power": 3,
  "artSlug": "unit-puddu-06",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-light-02",
  "relatedCards": [
    "3148"
  ],
  "textVocab": [
    "trigger-death",
    "banner-unit"
  ],
  "effectTypes": [
    "Death"
  ]
})
CardLibrary.set('3048', {
  "prism": "str",
  "element": "earth",
  "traits": [],
  "type": "spell",
  "cost": 3,
  "artSlug": "spell-xavi-07",
  "spellBehaviour": "defensive",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-earth-01",
  "relatedCards": [
    "20039",
    "20019"
  ],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('3049', {
  "prism": "hrt",
  "element": "dark",
  "traits": [],
  "type": "spell",
  "cost": 9,
  "artSlug": "spell-case-67",
  "spellBehaviour": "offensive",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-dark-02",
  "relatedCards": [],
  "textVocab": [
    "dust"
  ],
  "effectTypes": []
})
CardLibrary.set('3050', {
  "prism": "hrt",
  "element": "earth",
  "traits": [],
  "type": "spell",
  "cost": 5,
  "artSlug": "spell-case-90",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-earth-03",
  "relatedCards": [
    "20039"
  ],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('3051', {
  "prism": "hrt",
  "element": "dark",
  "traits": [
    "stealth"
  ],
  "type": "unit",
  "cost": 1,
  "health": 1,
  "power": 1,
  "artSlug": "unit-vini-14",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-dark-01",
  "relatedCards": [],
  "textVocab": [
    "trigger-death",
    "draw"
  ],
  "effectTypes": [
    "Death"
  ]
})
CardLibrary.set('3052', {
  "prism": "agy",
  "element": "fire",
  "traits": [
    "banner"
  ],
  "type": "unit",
  "cost": 4,
  "health": 3,
  "power": 4,
  "artSlug": "unit-lobo-38",
  "attachment": "20011",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-fire-01",
  "relatedCards": [],
  "textVocab": [
    "guard"
  ],
  "effectTypes": [
    "Continuous"
  ]
})
CardLibrary.set('3053', {
  "prism": "hrt",
  "element": "light",
  "traits": [
    "lifesteal"
  ],
  "type": "unit",
  "cost": 3,
  "health": 4,
  "power": 2,
  "artSlug": "unit-lobo-29",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-light-02",
  "relatedCards": [],
  "textVocab": [
    "trigger-death"
  ],
  "effectTypes": [
    "Death"
  ]
})
CardLibrary.set('3054', {
  "prism": "hrt",
  "element": "dark",
  "traits": [],
  "type": "spell",
  "cost": 6,
  "artSlug": "spell-case-62",
  "spellBehaviour": "offensive",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-dark-01",
  "relatedCards": [
    "20028"
  ],
  "textVocab": [
    "dash"
  ],
  "effectTypes": []
})
CardLibrary.set('3055', {
  "prism": "str",
  "element": "earth",
  "traits": [
    "stealth",
    "lifesteal"
  ],
  "type": "unit",
  "cost": 2,
  "health": 2,
  "power": 2,
  "artSlug": "unit-desir-20",
  "spellBehaviour": "defensive",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-earth-02",
  "relatedCards": [],
  "textVocab": [
    "trigger-play",
    "guard"
  ],
  "effectTypes": [
    "Play"
  ]
})
CardLibrary.set('3056', {
  "prism": "hrt",
  "element": "earth",
  "traits": [
    "wither"
  ],
  "type": "spell",
  "cost": 3,
  "artSlug": "spell-case-70",
  "spellBehaviour": "offensive",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-earth-03",
  "relatedCards": [
    "3010"
  ],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('3057', {
  "prism": "int",
  "element": "water",
  "traits": [
    "stealth",
    "banner"
  ],
  "type": "unit",
  "cost": 3,
  "health": 3,
  "power": 2,
  "artSlug": "unit-scava-07",
  "attachment": "4047",
  "spellBehaviour": "defensive",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-water-02",
  "relatedCards": [
    "20054"
  ],
  "textVocab": [
    "trigger-play"
  ],
  "effectTypes": [
    "Play"
  ]
})
CardLibrary.set('3058', {
  "prism": "hrt",
  "element": "metal",
  "traits": [
    "armor",
    "lifesteal",
    "wither"
  ],
  "type": "unit",
  "cost": 4,
  "health": 2,
  "power": 3,
  "artSlug": "unit-edsoa-18",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-metal-02",
  "relatedCards": [],
  "textVocab": [
    "trigger-death",
    "draw"
  ],
  "effectTypes": [
    "Death"
  ]
})
CardLibrary.set('3059', {
  "prism": "hrt",
  "element": "water",
  "traits": [
    "guard"
  ],
  "type": "unit",
  "cost": 6,
  "health": 6,
  "power": 6,
  "artSlug": "unit-xavi-26",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-water-02",
  "relatedCards": [
    "3017"
  ],
  "textVocab": [
    "dust",
    "trigger-death"
  ],
  "effectTypes": [
    "Death"
  ]
})
CardLibrary.set('3060', {
  "prism": "hrt",
  "element": "dark",
  "traits": [
    "wither"
  ],
  "type": "spell",
  "cost": 3,
  "artSlug": "spell-case-114",
  "spellBehaviour": "offensive",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-dark-01",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('3061', {
  "prism": "hrt",
  "element": "dark",
  "traits": [
    "banner"
  ],
  "type": "spell",
  "cost": 1,
  "artSlug": "spell-case-102",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-dark-02",
  "relatedCards": [
    "20049",
    "20028"
  ],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('3062', {
  "prism": "hrt",
  "element": "dark",
  "traits": [
    "armor",
    "wither"
  ],
  "type": "unit",
  "cost": 5,
  "health": 2,
  "power": 5,
  "artSlug": "unit-lobo-28",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-dark-01",
  "relatedCards": [
    "20049"
  ],
  "textVocab": [
    "trigger-summon"
  ],
  "effectTypes": [
    "Summon"
  ]
})
CardLibrary.set('3063', {
  "prism": "hrt",
  "element": "light",
  "traits": [],
  "type": "spell",
  "cost": 8,
  "artSlug": "spell-case-168",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-light-01",
  "relatedCards": [
    "20019"
  ],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('3064', {
  "prism": "hrt",
  "element": "dark",
  "traits": [],
  "type": "spell",
  "cost": 2,
  "artSlug": "spell-xavi-72",
  "spellBehaviour": "defensive",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-dark-02",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('3065', {
  "prism": "hrt",
  "element": "dark",
  "traits": [],
  "type": "unit",
  "cost": 1,
  "health": 4,
  "power": 1,
  "artSlug": "unit-brian-03",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-dark-01",
  "relatedCards": [],
  "textVocab": [
    "trigger-summon",
    "dust",
    "trait"
  ],
  "effectTypes": [
    "Summon"
  ]
})
CardLibrary.set('3066', {
  "prism": "hrt",
  "element": "light",
  "traits": [
    "stealth"
  ],
  "type": "unit",
  "cost": 2,
  "health": 3,
  "power": 2,
  "artSlug": "unit-giaco-14",
  "attachment": "3023",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-light-02",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": [
    "Generic"
  ]
})
CardLibrary.set('3067', {
  "prism": "hrt",
  "element": "water",
  "traits": [
    "stealth"
  ],
  "type": "unit",
  "cost": 2,
  "health": 1,
  "power": 2,
  "artSlug": "unit-panou-61",
  "attachment": "20046",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-water-02",
  "relatedCards": [],
  "textVocab": [
    "trigger-sunset"
  ],
  "effectTypes": [
    "Sunset"
  ]
})
CardLibrary.set('3068', {
  "prism": "int",
  "element": "water",
  "traits": [
    "guard"
  ],
  "type": "unit",
  "cost": 3,
  "health": 2,
  "power": 2,
  "artSlug": "unit-scava-03",
  "attachment": "20054",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-water-03",
  "relatedCards": [
    "20017"
  ],
  "textVocab": [
    "trigger-sunset"
  ],
  "effectTypes": [
    "Sunset"
  ]
})
CardLibrary.set('3069', {
  "prism": "hrt",
  "element": "light",
  "traits": [
    "lifesteal",
    "wither"
  ],
  "type": "spell",
  "cost": 1,
  "artSlug": "spell-heran-02",
  "spellBehaviour": "offensive",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-light-01",
  "relatedCards": [],
  "textVocab": [
    "trigger-slay-spell"
  ],
  "effectTypes": [
    "Slay"
  ]
})
CardLibrary.set('3070', {
  "prism": "int",
  "element": "water",
  "traits": [
    "banner"
  ],
  "type": "spell",
  "cost": 3,
  "artSlug": "spell-case-48",
  "spellBehaviour": "defensive",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-water-02",
  "relatedCards": [
    "20054"
  ],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('3071', {
  "prism": "wis",
  "element": "mind",
  "traits": [
    "lifesteal"
  ],
  "type": "unit",
  "cost": 4,
  "health": 8,
  "power": 2,
  "artSlug": "unit-edsoa-41",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-mind-02",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('3072', {
  "prism": "hrt",
  "element": "metal",
  "traits": [],
  "type": "spell",
  "cost": 2,
  "artSlug": "spell-case-100",
  "spellBehaviour": "offensive",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-metal-01",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('3073', {
  "prism": "hrt",
  "element": "light",
  "traits": [
    "banner",
    "armor"
  ],
  "type": "unit",
  "cost": 4,
  "health": 2,
  "power": 3,
  "artSlug": "unit-lobo-39",
  "attachment": "3014",
  "spellBehaviour": "offensive",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-light-01",
  "relatedCards": [
    "20048"
  ],
  "textVocab": [
    "trigger-play"
  ],
  "effectTypes": [
    "Play"
  ]
})
CardLibrary.set('3074', {
  "prism": "hrt",
  "element": "dark",
  "traits": [
    "stealth"
  ],
  "type": "unit",
  "cost": 5,
  "health": 5,
  "power": 3,
  "artSlug": "unit-panou-23",
  "attachment": "3155",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-dark-03",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": [
    "Continuous"
  ]
})
CardLibrary.set('3075', {
  "prism": "hrt",
  "element": "dark",
  "traits": [],
  "type": "spell",
  "cost": 3,
  "artSlug": "spell-case-116",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-dark-01",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('3076', {
  "prism": "hrt",
  "element": "earth",
  "traits": [
    "wither",
    "lifesteal"
  ],
  "type": "unit",
  "cost": 5,
  "health": 5,
  "power": 4,
  "artSlug": "unit-brian-09",
  "attachment": "3060",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-earth-02",
  "relatedCards": [],
  "textVocab": [
    "trigger-summon",
    "conjure"
  ],
  "effectTypes": [
    "Summon"
  ]
})
CardLibrary.set('3077', {
  "prism": "hrt",
  "element": "fire",
  "traits": [
    "banner",
    "wither",
    "lifesteal"
  ],
  "type": "spell",
  "cost": 5,
  "artSlug": "spell-case-110",
  "spellBehaviour": "offensive",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-fire-03",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('3078', {
  "prism": "hrt",
  "element": "fire",
  "traits": [],
  "type": "spell",
  "cost": 2,
  "artSlug": "spell-case-111",
  "spellBehaviour": "defensive",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-fire-01",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('3079', {
  "prism": "hrt",
  "element": "dark",
  "traits": [
    "lifesteal"
  ],
  "type": "unit",
  "cost": 7,
  "health": 8,
  "power": 6,
  "artSlug": "unit-panou-46",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-dark-02",
  "relatedCards": [],
  "textVocab": [
    "trigger-summon",
    "dust"
  ],
  "effectTypes": [
    "Summon"
  ]
})
CardLibrary.set('3080', {
  "prism": "hrt",
  "element": "air",
  "traits": [
    "guard",
    "lifesteal"
  ],
  "type": "unit",
  "cost": 8,
  "health": 5,
  "power": 5,
  "artSlug": "unit-panou-15",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-air-02",
  "relatedCards": [],
  "textVocab": [
    "trigger-play"
  ],
  "effectTypes": [
    "Play"
  ]
})
CardLibrary.set('3081', {
  "prism": "hrt",
  "element": "dark",
  "traits": [],
  "type": "spell",
  "cost": 3,
  "artSlug": "spell-case-117",
  "spellBehaviour": "offensive",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-dark-01",
  "relatedCards": [
    "20028",
    "20049"
  ],
  "textVocab": [
    "guard"
  ],
  "effectTypes": []
})
CardLibrary.set('3082', {
  "prism": "hrt",
  "element": "water",
  "traits": [
    "guard"
  ],
  "type": "unit",
  "cost": 2,
  "health": 5,
  "power": 2,
  "artSlug": "unit-panou-05",
  "attachment": "20009",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-water-02",
  "relatedCards": [
    "20009"
  ],
  "textVocab": [
    "trigger-death"
  ],
  "effectTypes": [
    "Death"
  ]
})
CardLibrary.set('3083', {
  "prism": "hrt",
  "element": "dark",
  "traits": [
    "wither",
    "stealth"
  ],
  "type": "unit",
  "cost": 2,
  "health": 2,
  "power": 2,
  "artSlug": "unit-tonel-05",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-dark-03",
  "relatedCards": [],
  "textVocab": [
    "trigger-summon",
    "draw"
  ],
  "effectTypes": [
    "Summon"
  ]
})
CardLibrary.set('3084', {
  "prism": "hrt",
  "element": "mind",
  "traits": [
    "stealth"
  ],
  "type": "unit",
  "cost": 1,
  "health": 1,
  "power": 2,
  "artSlug": "unit-shapo-58",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-mind-01",
  "relatedCards": [
    "20049"
  ],
  "textVocab": [
    "trigger-play"
  ],
  "effectTypes": [
    "Play"
  ]
})
CardLibrary.set('3085', {
  "prism": "str",
  "element": "fire",
  "traits": [],
  "type": "unit",
  "cost": 2,
  "health": 3,
  "power": 2,
  "artSlug": "unit-tonel-15",
  "attachment": "20051",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-fire-01",
  "relatedCards": [
    "37",
    "82",
    "87",
    "132",
    "182",
    "183",
    "1000",
    "1027"
  ],
  "textVocab": [
    "trigger-death",
    "blade"
  ],
  "effectTypes": [
    "Death"
  ]
})
CardLibrary.set('3086', {
  "prism": "str",
  "element": "metal",
  "traits": [],
  "type": "spell",
  "cost": 3,
  "artSlug": "spell-patty-01",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-metal-03",
  "relatedCards": [
    "20027"
  ],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('3087', {
  "prism": "wis",
  "element": "water",
  "traits": [],
  "type": "spell",
  "cost": 3,
  "artSlug": "spell-xavi-63",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-water-01",
  "relatedCards": [
    "20017"
  ],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('3088', {
  "prism": "str",
  "element": "metal",
  "traits": [],
  "type": "unit",
  "cost": 5,
  "health": 4,
  "power": 4,
  "artSlug": "unit-chen-02",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-metal-01",
  "relatedCards": [],
  "textVocab": [
    "trigger-summon"
  ],
  "effectTypes": [
    "Summon"
  ]
})
CardLibrary.set('3089', {
  "prism": "hrt",
  "element": "mind",
  "traits": [
    "guard",
    "lifesteal"
  ],
  "type": "unit",
  "cost": 2,
  "health": 4,
  "power": 1,
  "artSlug": "unit-chen-01",
  "attachment": "20053",
  "spellBehaviour": "offensive",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-mind-01",
  "relatedCards": [
    "20032"
  ],
  "textVocab": [
    "trigger-play"
  ],
  "effectTypes": [
    "Play"
  ]
})
CardLibrary.set('3090', {
  "prism": "hrt",
  "element": "earth",
  "traits": [
    "guard"
  ],
  "type": "unit",
  "cost": 2,
  "health": 3,
  "power": 1,
  "artSlug": "unit-chen-04",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-earth-01",
  "relatedCards": [],
  "textVocab": [
    "trigger-death",
    "guard"
  ],
  "effectTypes": [
    "Death"
  ]
})
CardLibrary.set('3091', {
  "prism": "hrt",
  "element": "fire",
  "traits": [
    "banner",
    "wither"
  ],
  "type": "unit",
  "cost": 1,
  "health": 2,
  "power": 1,
  "artSlug": "unit-panou-37",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-fire-01",
  "relatedCards": [],
  "textVocab": [
    "trigger-death"
  ],
  "effectTypes": [
    "Death"
  ]
})
CardLibrary.set('3092', {
  "prism": "hrt",
  "element": "dark",
  "traits": [
    "lifesteal"
  ],
  "type": "unit",
  "cost": 3,
  "health": 2,
  "power": 3,
  "artSlug": "unit-lobo-03",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-dark-01",
  "relatedCards": [],
  "textVocab": [
    "trigger-death"
  ],
  "effectTypes": [
    "Death"
  ]
})
CardLibrary.set('3093', {
  "prism": "int",
  "element": "water",
  "traits": [],
  "type": "spell",
  "cost": 1,
  "artSlug": "spell-case-108",
  "spellBehaviour": "defensive",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-water-01",
  "relatedCards": [
    "20054"
  ],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('3094', {
  "prism": "hrt",
  "element": "water",
  "traits": [],
  "type": "unit",
  "cost": 1,
  "health": 2,
  "power": 2,
  "artSlug": "unit-giaco-12",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-water-01",
  "relatedCards": [
    "20054"
  ],
  "textVocab": [
    "trigger-death"
  ],
  "effectTypes": [
    "Death"
  ]
})
CardLibrary.set('3095', {
  "prism": "hrt",
  "element": "mind",
  "traits": [
    "guard"
  ],
  "type": "unit",
  "cost": 4,
  "health": 5,
  "power": 3,
  "artSlug": "unit-xavi-49",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-mind-03",
  "relatedCards": [],
  "textVocab": [
    "trigger-death",
    "draw"
  ],
  "effectTypes": [
    "Death"
  ]
})
CardLibrary.set('3096', {
  "prism": "hrt",
  "element": "mind",
  "traits": [
    "guard"
  ],
  "type": "unit",
  "cost": 3,
  "health": 2,
  "power": 2,
  "artSlug": "unit-xavi-50",
  "attachment": "20053",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-mind-02",
  "relatedCards": [],
  "textVocab": [
    "trigger-death",
    "draw"
  ],
  "effectTypes": [
    "Death"
  ]
})
CardLibrary.set('3097', {
  "prism": "hrt",
  "element": "mind",
  "traits": [
    "guard"
  ],
  "type": "unit",
  "cost": 2,
  "health": 3,
  "power": 2,
  "artSlug": "unit-xavi-48",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-mind-02",
  "relatedCards": [],
  "textVocab": [
    "trigger-summon",
    "trigger-death",
    "draw"
  ],
  "effectTypes": [
    "Summon",
    "Death"
  ]
})
CardLibrary.set('3098', {
  "prism": "hrt",
  "element": "earth",
  "traits": [
    "guard",
    "lifesteal"
  ],
  "type": "unit",
  "cost": 4,
  "health": 4,
  "power": 2,
  "artSlug": "unit-xavi-51",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-earth-02",
  "relatedCards": [
    "3000"
  ],
  "textVocab": [
    "trigger-summon",
    "stealth"
  ],
  "effectTypes": [
    "Summon"
  ]
})
CardLibrary.set('3099', {
  "prism": "hrt",
  "element": "fire",
  "traits": [],
  "type": "spell",
  "cost": 2,
  "artSlug": "spell-case-160",
  "spellBehaviour": "offensive",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-fire-01",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('3100', {
  "prism": "hrt",
  "element": "light",
  "traits": [
    "guard"
  ],
  "type": "unit",
  "cost": 9,
  "health": 8,
  "power": 5,
  "artSlug": "unit-lobo-50",
  "attachment": "20019",
  "set": "Core Expansion",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-light-01",
  "relatedCards": [],
  "textVocab": [
    "trigger-sunset",
    "guard"
  ],
  "effectTypes": [
    "Sunset"
  ]
})
CardLibrary.set('3101', {
  "prism": "hrt",
  "element": "dark",
  "traits": [
    "wither"
  ],
  "type": "spell",
  "cost": 3,
  "artSlug": "spell-case-191",
  "spellBehaviour": "offensive",
  "set": "Core Expansion",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-dark-03",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('3102', {
  "prism": "hrt",
  "element": "earth",
  "traits": [
    "guard",
    "lifesteal"
  ],
  "type": "unit",
  "cost": 2,
  "health": 4,
  "power": 1,
  "artSlug": "unit-xavi-59",
  "set": "Core Expansion",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-earth-02",
  "relatedCards": [],
  "textVocab": [
    "dust",
    "trigger-sunset"
  ],
  "effectTypes": [
    "Sunset"
  ]
})
CardLibrary.set('3103', {
  "prism": "hrt",
  "element": "dark",
  "traits": [],
  "type": "spell",
  "cost": 4,
  "artSlug": "spell-case-142",
  "spellBehaviour": "offensive",
  "set": "Core Expansion",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-dark-02",
  "relatedCards": [
    "20028"
  ],
  "textVocab": [
    "wither"
  ],
  "effectTypes": []
})
CardLibrary.set('3104', {
  "prism": "hrt",
  "element": "dark",
  "traits": [
    "wither",
    "lifesteal",
    "dash"
  ],
  "type": "unit",
  "cost": 2,
  "health": 1,
  "power": 1,
  "artSlug": "unit-tonel-11",
  "spellBehaviour": "positive",
  "set": "Core Expansion",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-dark-01",
  "relatedCards": [],
  "textVocab": [
    "trigger-inspire-dark"
  ],
  "effectTypes": [
    "Inspire"
  ]
})
CardLibrary.set('3105', {
  "prism": "hrt",
  "element": "dark",
  "traits": [],
  "type": "spell",
  "cost": 1,
  "artSlug": "spell-case-209",
  "spellBehaviour": "positive",
  "set": "Core Expansion",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-dark-01",
  "relatedCards": [],
  "textVocab": [
    "draw"
  ],
  "effectTypes": []
})
CardLibrary.set('3106', {
  "prism": "hrt",
  "element": "metal",
  "traits": [
    "dash",
    "armor"
  ],
  "type": "unit",
  "cost": 3,
  "health": 2,
  "power": 2,
  "artSlug": "unit-calle-09",
  "set": "Clash of Inventors",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-metal-03",
  "relatedCards": [],
  "textVocab": [
    "trigger-death"
  ],
  "effectTypes": [
    "Death"
  ]
})
CardLibrary.set('3107', {
  "prism": "hrt",
  "element": "earth",
  "traits": [
    "guard"
  ],
  "type": "unit",
  "cost": 1,
  "health": 3,
  "power": 1,
  "artSlug": "unit-calle-37",
  "attachment": "20047",
  "set": "Clash of Inventors",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-earth-01",
  "relatedCards": [],
  "textVocab": [
    "trigger-death"
  ],
  "effectTypes": [
    "Death"
  ]
})
CardLibrary.set('3108', {
  "prism": "hrt",
  "element": "dark",
  "traits": [
    "dash",
    "wither"
  ],
  "type": "unit",
  "cost": 4,
  "health": 4,
  "power": 2,
  "artSlug": "unit-lobo-77",
  "attachment": "20029",
  "set": "Clash of Inventors",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-dark-02",
  "relatedCards": [
    "1112"
  ],
  "textVocab": [
    "trigger-slay-unit"
  ],
  "effectTypes": [
    "Slay"
  ]
})
CardLibrary.set('3109', {
  "prism": "hrt",
  "element": "light",
  "traits": [],
  "type": "unit",
  "cost": 5,
  "health": 6,
  "power": 5,
  "artSlug": "unit-calle-03",
  "attachment": "2062",
  "set": "Clash of Inventors",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-light-03",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": [
    "Generic"
  ]
})
CardLibrary.set('3110', {
  "prism": "hrt",
  "element": "metal",
  "traits": [],
  "type": "unit",
  "cost": 7,
  "health": 2,
  "power": 2,
  "artSlug": "unit-calle-08",
  "set": "Clash of Inventors",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-metal-03",
  "relatedCards": [],
  "textVocab": [
    "trigger-play",
    "trait"
  ],
  "effectTypes": [
    "Play"
  ]
})
CardLibrary.set('3111', {
  "prism": "hrt",
  "element": "dark",
  "traits": [
    "wither",
    "dash"
  ],
  "type": "unit",
  "cost": 8,
  "health": 4,
  "power": 5,
  "artSlug": "unit-lobo-75",
  "attachment": "3064",
  "set": "Clash of Inventors",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-dark-02",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": [
    "Generic"
  ]
})
CardLibrary.set('3112', {
  "prism": "hrt",
  "element": "metal",
  "traits": [],
  "type": "spell",
  "cost": 1,
  "artSlug": "spell-case-205",
  "spellBehaviour": "defensive",
  "set": "Clash of Inventors",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-metal-02",
  "relatedCards": [],
  "textVocab": [
    "trait"
  ],
  "effectTypes": []
})
CardLibrary.set('3113', {
  "prism": "hrt",
  "element": "metal",
  "traits": [],
  "type": "spell",
  "cost": 4,
  "artSlug": "spell-case-262",
  "set": "Clash of Inventors",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-metal-03",
  "relatedCards": [
    "20047"
  ],
  "textVocab": [
    "dash"
  ],
  "effectTypes": []
})
CardLibrary.set('3114', {
  "prism": "hrt",
  "element": "dark",
  "traits": [
    "wither",
    "lifesteal"
  ],
  "type": "spell",
  "cost": 2,
  "artSlug": "spell-case-232",
  "spellBehaviour": "offensive",
  "set": "Clash of Inventors",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-dark-01",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('3115', {
  "prism": "hrt",
  "element": "fire",
  "traits": [],
  "type": "spell",
  "cost": 6,
  "artSlug": "spell-case-251",
  "set": "Clash of Inventors",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-fire-02",
  "relatedCards": [
    "20049"
  ],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('3116', {
  "prism": "hrt",
  "element": "dark",
  "traits": [
    "wither",
    "armor"
  ],
  "type": "unit",
  "cost": 1,
  "health": 1,
  "power": 1,
  "artSlug": "unit-calle-12",
  "set": "Clash of Inventors",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-dark-02",
  "relatedCards": [],
  "textVocab": [
    "trigger-death"
  ],
  "effectTypes": [
    "Death"
  ]
})
CardLibrary.set('3117', {
  "prism": "hrt",
  "element": "fire",
  "traits": [],
  "type": "unit",
  "cost": 5,
  "health": 2,
  "power": 3,
  "artSlug": "unit-xavi-71",
  "attachment": "2006",
  "set": "Clash of Inventors",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-fire-02",
  "relatedCards": [],
  "textVocab": [
    "trigger-death"
  ],
  "effectTypes": [
    "Death"
  ]
})
CardLibrary.set('3118', {
  "prism": "hrt",
  "element": "earth",
  "traits": [],
  "type": "spell",
  "cost": 2,
  "artSlug": "spell-case-161",
  "set": "Clash of Inventors",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-earth-02",
  "relatedCards": [
    "4034"
  ],
  "textVocab": [
    "wither"
  ],
  "effectTypes": []
})
CardLibrary.set('3119', {
  "prism": "hrt",
  "element": "dark",
  "traits": [],
  "type": "spell",
  "cost": 8,
  "artSlug": "spell-case-244",
  "set": "Clash of Inventors",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-dark-03",
  "relatedCards": [
    "3010"
  ],
  "textVocab": [
    "dash"
  ],
  "effectTypes": []
})
CardLibrary.set('3120', {
  "prism": "hrt",
  "element": "dark",
  "traits": [
    "wither"
  ],
  "type": "unit",
  "cost": 3,
  "health": 4,
  "power": 1,
  "artSlug": "unit-edsoa-62",
  "attachment": "20055",
  "set": "Hexbound Invasion",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-dark-01",
  "relatedCards": [
    "20013"
  ],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('3121', {
  "prism": "hrt",
  "element": "dark",
  "traits": [
    "wither",
    "dash"
  ],
  "type": "unit",
  "cost": 2,
  "health": 3,
  "power": 1,
  "artSlug": "unit-tonel-04",
  "set": "Hexbound Invasion",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-dark-03",
  "relatedCards": [],
  "textVocab": [
    "trigger-play"
  ],
  "effectTypes": [
    "Play"
  ]
})
CardLibrary.set('3122', {
  "prism": "hrt",
  "element": "dark",
  "traits": [],
  "type": "unit",
  "cost": 7,
  "health": 7,
  "power": 7,
  "artSlug": "unit-edsoa-74",
  "attachment": "3155",
  "set": "Hexbound Invasion",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-dark-01",
  "relatedCards": [
    "20013"
  ],
  "textVocab": [
    "trigger-death"
  ],
  "effectTypes": [
    "Death"
  ]
})
CardLibrary.set('3123', {
  "prism": "hrt",
  "element": "earth",
  "traits": [
    "guard",
    "lifesteal"
  ],
  "type": "unit",
  "cost": 4,
  "health": 5,
  "power": 3,
  "artSlug": "unit-lobo-52",
  "set": "Hexbound Invasion",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-earth-02",
  "relatedCards": [],
  "textVocab": [
    "trigger-slay-unit",
    "trigger-death"
  ],
  "effectTypes": [
    "Slay",
    "Death"
  ]
})
CardLibrary.set('3124', {
  "prism": "hrt",
  "element": "light",
  "traits": [
    "lifesteal"
  ],
  "type": "unit",
  "cost": 3,
  "health": 5,
  "power": 2,
  "artSlug": "unit-edsoa-109",
  "set": "Hexbound Invasion",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-light-01",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('3125', {
  "prism": "hrt",
  "element": "light",
  "traits": [],
  "type": "unit",
  "cost": 4,
  "health": 6,
  "power": 3,
  "artSlug": "unit-edsoa-113",
  "attachment": "20049",
  "set": "Hexbound Invasion",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-light-01",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": [
    "Continuous"
  ]
})
CardLibrary.set('3126', {
  "prism": "hrt",
  "element": "dark",
  "traits": [],
  "type": "spell",
  "cost": 8,
  "artSlug": "spell-case-254",
  "set": "Hexbound Invasion",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-dark-01",
  "relatedCards": [],
  "textVocab": [
    "guard"
  ],
  "effectTypes": []
})
CardLibrary.set('3127', {
  "prism": "hrt",
  "element": "light",
  "traits": [],
  "type": "spell",
  "cost": 3,
  "artSlug": "spell-case-260",
  "set": "Hexbound Invasion",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-light-02",
  "relatedCards": [
    "20019"
  ],
  "textVocab": [
    "dash"
  ],
  "effectTypes": []
})
CardLibrary.set('3128', {
  "prism": "hrt",
  "element": "light",
  "traits": [],
  "type": "spell",
  "cost": 7,
  "artSlug": "spell-case-257",
  "set": "Hexbound Invasion",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-light-03",
  "relatedCards": [
    "20019"
  ],
  "textVocab": [
    "guard",
    "draw"
  ],
  "effectTypes": []
})
CardLibrary.set('3129', {
  "prism": "hrt",
  "element": "dark",
  "traits": [],
  "type": "spell",
  "cost": 2,
  "artSlug": "spell-case-267",
  "set": "Hexbound Invasion",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-dark-01",
  "relatedCards": [
    "20013"
  ],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('3130', {
  "prism": "hrt",
  "element": "dark",
  "traits": [
    "lifesteal"
  ],
  "type": "unit",
  "cost": 4,
  "health": 6,
  "power": 2,
  "artSlug": "unit-calle-54",
  "set": "Hexbound Invasion",
  "releaseSeason": 17,
  "backgroundArtSlug": "bg-dark-02",
  "relatedCards": [
    "20013"
  ],
  "textVocab": [
    "lifesteal"
  ],
  "effectTypes": []
})
CardLibrary.set('3131', {
  "prism": "hrt",
  "element": "dark",
  "traits": [],
  "type": "spell",
  "cost": 4,
  "artSlug": "spell-case-266",
  "spellBehaviour": "offensive",
  "set": "Hexbound Invasion",
  "releaseSeason": 19,
  "backgroundArtSlug": "bg-dark-03",
  "relatedCards": [
    "20013"
  ],
  "textVocab": [
    "lifesteal",
    "trigger-slay-spell"
  ],
  "effectTypes": [
    "Slay"
  ]
})
CardLibrary.set('3132', {
  "prism": "hrt",
  "element": "light",
  "traits": [
    "stealth",
    "lifesteal"
  ],
  "type": "unit",
  "cost": 2,
  "health": 2,
  "power": 2,
  "artSlug": "unit-edsoa-122",
  "attachment": "20053",
  "set": "Hexbound Invasion",
  "releaseSeason": 20,
  "backgroundArtSlug": "bg-light-01",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('3133', {
  "prism": "hrt",
  "element": "light",
  "traits": [],
  "type": "unit",
  "cost": 2,
  "health": 4,
  "power": 2,
  "artSlug": "unit-minh-05",
  "set": "Starter Expansion",
  "releaseSeason": 21,
  "backgroundArtSlug": "bg-light-01",
  "relatedCards": [
    "20019"
  ],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('3134', {
  "prism": "hrt",
  "element": "light",
  "traits": [
    "guard",
    "lifesteal"
  ],
  "type": "unit",
  "cost": 4,
  "health": 6,
  "power": 2,
  "artSlug": "unit-lobo-53",
  "set": "Starter Expansion",
  "releaseSeason": 22,
  "backgroundArtSlug": "bg-light-01",
  "relatedCards": [],
  "textVocab": [
    "trigger-death"
  ],
  "effectTypes": [
    "Death"
  ]
})
CardLibrary.set('3135', {
  "prism": "hrt",
  "element": "light",
  "traits": [
    "guard",
    "lifesteal"
  ],
  "type": "unit",
  "cost": 1,
  "health": 2,
  "power": 1,
  "artSlug": "unit-soyun-01",
  "set": "Starter Expansion",
  "releaseSeason": 22,
  "backgroundArtSlug": "bg-light-01",
  "relatedCards": [
    "3148"
  ],
  "textVocab": [
    "trigger-death"
  ],
  "effectTypes": [
    "Death"
  ]
})
CardLibrary.set('3136', {
  "prism": "hrt",
  "element": "dark",
  "traits": [],
  "type": "unit",
  "cost": 1,
  "health": 2,
  "power": 1,
  "artSlug": "unit-edsoa-145",
  "set": "Starter Expansion",
  "releaseSeason": 22,
  "backgroundArtSlug": "bg-dark-01",
  "relatedCards": [
    "20017"
  ],
  "textVocab": [
    "trigger-death"
  ],
  "effectTypes": [
    "Death"
  ]
})
CardLibrary.set('3137', {
  "prism": "hrt",
  "element": "dark",
  "traits": [
    "dash"
  ],
  "type": "unit",
  "cost": 1,
  "health": 1,
  "power": 1,
  "artSlug": "unit-mara-01",
  "set": "Starter Expansion",
  "releaseSeason": 22,
  "backgroundArtSlug": "bg-dark-01",
  "relatedCards": [
    "20013"
  ],
  "textVocab": [
    "trigger-death"
  ],
  "effectTypes": [
    "Death"
  ]
})
CardLibrary.set('3138', {
  "prism": "hrt",
  "element": "dark",
  "traits": [],
  "type": "unit",
  "cost": 2,
  "health": 2,
  "power": 2,
  "artSlug": "unit-edsoa-147",
  "set": "Starter Expansion",
  "releaseSeason": 22,
  "backgroundArtSlug": "bg-dark-03",
  "relatedCards": [],
  "textVocab": [
    "trigger-death"
  ],
  "effectTypes": [
    "Death"
  ]
})
CardLibrary.set('3139', {
  "prism": "hrt",
  "element": "dark",
  "traits": [],
  "type": "unit",
  "cost": 2,
  "health": 2,
  "power": 2,
  "artSlug": "unit-edsoa-150",
  "set": "Starter Expansion",
  "releaseSeason": 22,
  "backgroundArtSlug": "bg-dark-01",
  "relatedCards": [],
  "textVocab": [
    "trigger-death",
    "draw"
  ],
  "effectTypes": [
    "Death"
  ]
})
CardLibrary.set('3140', {
  "prism": "hrt",
  "element": "dark",
  "traits": [
    "wither"
  ],
  "type": "unit",
  "cost": 2,
  "health": 3,
  "power": 1,
  "artSlug": "unit-edsoa-148",
  "attachment": "3156",
  "set": "Starter Expansion",
  "releaseSeason": 22,
  "backgroundArtSlug": "bg-dark-01",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('3141', {
  "prism": "hrt",
  "element": "dark",
  "traits": [],
  "type": "unit",
  "cost": 3,
  "health": 5,
  "power": 2,
  "artSlug": "unit-edsoa-151",
  "set": "Starter Expansion",
  "releaseSeason": 22,
  "backgroundArtSlug": "bg-dark-01",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": [
    "Generic"
  ]
})
CardLibrary.set('3142', {
  "prism": "hrt",
  "element": "dark",
  "traits": [
    "guard",
    "wither"
  ],
  "type": "unit",
  "cost": 4,
  "health": 2,
  "power": 2,
  "artSlug": "unit-edsoa-110",
  "set": "Starter Expansion",
  "releaseSeason": 22,
  "backgroundArtSlug": "bg-dark-03",
  "relatedCards": [],
  "textVocab": [
    "trigger-death"
  ],
  "effectTypes": [
    "Death"
  ]
})
CardLibrary.set('3143', {
  "prism": "hrt",
  "element": "dark",
  "traits": [
    "guard"
  ],
  "type": "unit",
  "cost": 4,
  "health": 3,
  "power": 3,
  "artSlug": "unit-mara-04",
  "set": "Starter Expansion",
  "releaseSeason": 22,
  "backgroundArtSlug": "bg-dark-01",
  "relatedCards": [
    "20013"
  ],
  "textVocab": [
    "trigger-death"
  ],
  "effectTypes": [
    "Death"
  ]
})
CardLibrary.set('3144', {
  "prism": "hrt",
  "element": "dark",
  "traits": [
    "wither"
  ],
  "type": "unit",
  "cost": 5,
  "health": 5,
  "power": 5,
  "artSlug": "unit-mara-07",
  "set": "Starter Expansion",
  "releaseSeason": 22,
  "backgroundArtSlug": "bg-dark-01",
  "relatedCards": [
    "20067"
  ],
  "textVocab": [
    "trigger-death"
  ],
  "effectTypes": [
    "Death"
  ]
})
CardLibrary.set('3145', {
  "prism": "hrt",
  "element": "dark",
  "traits": [
    "wither"
  ],
  "type": "unit",
  "cost": 6,
  "health": 7,
  "power": 4,
  "artSlug": "unit-mara-08",
  "set": "Starter Expansion",
  "releaseSeason": 22,
  "backgroundArtSlug": "bg-dark-03",
  "relatedCards": [],
  "textVocab": [
    "draw"
  ],
  "effectTypes": [
    "Generic"
  ]
})
CardLibrary.set('3146', {
  "prism": "hrt",
  "element": "dark",
  "traits": [],
  "type": "unit",
  "cost": 7,
  "health": 1,
  "power": 1,
  "artSlug": "unit-mara-05",
  "set": "Starter Expansion",
  "releaseSeason": 22,
  "backgroundArtSlug": "bg-dark-02",
  "relatedCards": [],
  "textVocab": [
    "trigger-play"
  ],
  "effectTypes": [
    "Play"
  ]
})
CardLibrary.set('3147', {
  "prism": "hrt",
  "element": "light",
  "traits": [],
  "type": "unit",
  "cost": 10,
  "health": 10,
  "power": 10,
  "artSlug": "unit-cho-09",
  "set": "Starter Expansion",
  "releaseSeason": 22,
  "backgroundArtSlug": "bg-light-02",
  "relatedCards": [],
  "textVocab": [
    "trigger-play",
    "guard"
  ],
  "effectTypes": [
    "Play"
  ]
})
CardLibrary.set('3148', {
  "prism": "hrt",
  "element": "light",
  "traits": [
    "guard",
    "lifesteal"
  ],
  "type": "unit",
  "cost": 1,
  "health": 2,
  "power": 2,
  "artSlug": "unit-lobo-30",
  "set": "Starter Expansion",
  "releaseSeason": 22,
  "backgroundArtSlug": "bg-light-01",
  "relatedCards": [],
  "textVocab": [
    "trigger-death"
  ],
  "effectTypes": [
    "Death"
  ]
})
CardLibrary.set('3149', {
  "prism": "hrt",
  "element": "light",
  "traits": [
    "guard"
  ],
  "type": "unit",
  "cost": 2,
  "health": 2,
  "power": 2,
  "artSlug": "unit-calle-87",
  "set": "Starter Expansion",
  "releaseSeason": 22,
  "backgroundArtSlug": "bg-light-03",
  "relatedCards": [],
  "textVocab": [
    "trigger-death"
  ],
  "effectTypes": [
    "Death"
  ]
})
CardLibrary.set('3150', {
  "prism": "hrt",
  "element": "light",
  "traits": [
    "guard"
  ],
  "type": "unit",
  "cost": 3,
  "health": 3,
  "power": 2,
  "artSlug": "unit-soyun-02",
  "set": "Starter Expansion",
  "releaseSeason": 22,
  "backgroundArtSlug": "bg-light-03",
  "relatedCards": [
    "3148"
  ],
  "textVocab": [
    "trigger-death"
  ],
  "effectTypes": [
    "Death"
  ]
})
CardLibrary.set('3151', {
  "prism": "hrt",
  "element": "light",
  "traits": [
    "lifesteal"
  ],
  "type": "unit",
  "cost": 4,
  "health": 4,
  "power": 3,
  "artSlug": "unit-lobo-51",
  "set": "Starter Expansion",
  "releaseSeason": 22,
  "backgroundArtSlug": "bg-light-02",
  "relatedCards": [],
  "textVocab": [
    "trigger-death"
  ],
  "effectTypes": [
    "Death"
  ]
})
CardLibrary.set('3152', {
  "prism": "hrt",
  "element": "light",
  "traits": [
    "guard"
  ],
  "type": "unit",
  "cost": 6,
  "health": 5,
  "power": 5,
  "artSlug": "unit-mara-02",
  "set": "Starter Expansion",
  "releaseSeason": 22,
  "backgroundArtSlug": "bg-light-03",
  "relatedCards": [
    "3148"
  ],
  "textVocab": [
    "trigger-death"
  ],
  "effectTypes": [
    "Death"
  ]
})
CardLibrary.set('3153', {
  "prism": "hrt",
  "element": "light",
  "traits": [
    "guard"
  ],
  "type": "unit",
  "cost": 7,
  "health": 5,
  "power": 5,
  "artSlug": "unit-calle-88",
  "set": "Starter Expansion",
  "releaseSeason": 22,
  "backgroundArtSlug": "bg-light-01",
  "relatedCards": [],
  "textVocab": [
    "trigger-play"
  ],
  "effectTypes": [
    "Play"
  ]
})
CardLibrary.set('3154', {
  "prism": "hrt",
  "element": "dark",
  "traits": [],
  "type": "spell",
  "cost": 2,
  "artSlug": "spell-mara-20",
  "set": "Starter Expansion",
  "releaseSeason": 22,
  "backgroundArtSlug": "bg-dark-02",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('3155', {
  "prism": "hrt",
  "element": "dark",
  "traits": [],
  "type": "spell",
  "cost": 2,
  "artSlug": "spell-mara-21",
  "set": "Starter Expansion",
  "releaseSeason": 22,
  "backgroundArtSlug": "bg-dark-03",
  "relatedCards": [
    "20013"
  ],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('3156', {
  "prism": "hrt",
  "element": "dark",
  "traits": [],
  "type": "spell",
  "cost": 2,
  "artSlug": "spell-mara-30",
  "set": "Starter Expansion",
  "releaseSeason": 22,
  "backgroundArtSlug": "bg-dark-01",
  "relatedCards": [
    "20067"
  ],
  "textVocab": [
    "draw"
  ],
  "effectTypes": []
})
CardLibrary.set('3157', {
  "prism": "hrt",
  "element": "dark",
  "traits": [
    "wither"
  ],
  "type": "spell",
  "cost": 3,
  "artSlug": "spell-mara-27",
  "spellBehaviour": "offensive",
  "set": "Starter Expansion",
  "releaseSeason": 22,
  "backgroundArtSlug": "bg-dark-02",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('3158', {
  "prism": "hrt",
  "element": "dark",
  "traits": [],
  "type": "spell",
  "cost": 4,
  "artSlug": "spell-mara-29",
  "set": "Starter Expansion",
  "releaseSeason": 22,
  "backgroundArtSlug": "bg-dark-03",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('3159', {
  "prism": "hrt",
  "element": "dark",
  "traits": [
    "wither"
  ],
  "type": "spell",
  "cost": 3,
  "artSlug": "spell-mara-19",
  "set": "Starter Expansion",
  "releaseSeason": 22,
  "backgroundArtSlug": "bg-dark-01",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('3160', {
  "prism": "hrt",
  "element": "light",
  "traits": [],
  "type": "spell",
  "cost": 1,
  "artSlug": "spell-mara-25",
  "spellBehaviour": "offensive",
  "set": "Starter Expansion",
  "releaseSeason": 22,
  "backgroundArtSlug": "bg-light-02",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('3161', {
  "prism": "hrt",
  "element": "light",
  "traits": [],
  "type": "spell",
  "cost": 3,
  "artSlug": "spell-case-248",
  "set": "Starter Expansion",
  "releaseSeason": 22,
  "backgroundArtSlug": "bg-light-03",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('3162', {
  "prism": "hrt",
  "element": "light",
  "traits": [],
  "type": "spell",
  "cost": 5,
  "artSlug": "spell-mara-17",
  "set": "Starter Expansion",
  "releaseSeason": 22,
  "backgroundArtSlug": "bg-light-01",
  "relatedCards": [],
  "textVocab": [
    "draw"
  ],
  "effectTypes": []
})
CardLibrary.set('3163', {
  "prism": "hrt",
  "element": "light",
  "traits": [],
  "type": "spell",
  "cost": 7,
  "artSlug": "spell-mara-18",
  "set": "Starter Expansion",
  "releaseSeason": 22,
  "backgroundArtSlug": "bg-light-02",
  "relatedCards": [],
  "textVocab": [
    "guard"
  ],
  "effectTypes": []
})
CardLibrary.set('3164', {
  "prism": "hrt",
  "element": "mind",
  "traits": [],
  "type": "unit",
  "cost": 3,
  "health": 3,
  "power": 3,
  "artSlug": "unit-calle-80",
  "attachment": "20053",
  "set": "Starter Expansion",
  "releaseSeason": 23,
  "backgroundArtSlug": "bg-mind-03",
  "relatedCards": [],
  "textVocab": [
    "trigger-death"
  ],
  "effectTypes": [
    "Death"
  ]
})
CardLibrary.set('3165', {
  "prism": "hrt",
  "element": "mind",
  "traits": [],
  "type": "unit",
  "cost": 3,
  "health": 3,
  "power": 3,
  "artSlug": "unit-edsoa-118",
  "set": "Starter Expansion",
  "releaseSeason": 23,
  "backgroundArtSlug": "bg-mind-02",
  "relatedCards": [],
  "textVocab": [
    "trigger-death",
    "draw",
    "shroom"
  ],
  "effectTypes": [
    "Death"
  ]
})
CardLibrary.set('3166', {
  "prism": "hrt",
  "element": "earth",
  "traits": [
    "guard",
    "lifesteal"
  ],
  "type": "unit",
  "cost": 6,
  "health": 3,
  "power": 3,
  "artSlug": "unit-lobo-82",
  "set": "Starter Expansion",
  "releaseSeason": 23,
  "backgroundArtSlug": "bg-earth-02",
  "relatedCards": [
    "3000"
  ],
  "textVocab": [
    "trigger-death"
  ],
  "effectTypes": [
    "Death"
  ]
})
CardLibrary.set('3167', {
  "prism": "hrt",
  "element": "light",
  "traits": [],
  "type": "spell",
  "cost": 6,
  "artSlug": "spell-case-284",
  "set": "Starter Expansion",
  "releaseSeason": 23,
  "backgroundArtSlug": "bg-light-03",
  "relatedCards": [
    "3000"
  ],
  "textVocab": [
    "shroom"
  ],
  "effectTypes": []
})
CardLibrary.set('3168', {
  "prism": "hrt",
  "element": "earth",
  "traits": [],
  "type": "spell",
  "cost": 2,
  "artSlug": "spell-case-270",
  "set": "Starter Expansion",
  "releaseSeason": 23,
  "backgroundArtSlug": "bg-earth-01",
  "relatedCards": [],
  "textVocab": [
    "draw",
    "shroom"
  ],
  "effectTypes": []
})
CardLibrary.set('3169', {
  "prism": "hrt",
  "element": "dark",
  "traits": [],
  "type": "unit",
  "cost": 4,
  "health": 7,
  "power": 2,
  "artSlug": "unit-lobo-76",
  "set": "Starter Expansion",
  "releaseSeason": 26,
  "backgroundArtSlug": "bg-dark-02",
  "relatedCards": [
    "20013"
  ],
  "textVocab": [
    "trigger-sunset",
    "draw"
  ],
  "effectTypes": [
    "Sunset"
  ]
})
CardLibrary.set('4000', {
  "prism": "int",
  "element": "air",
  "traits": [],
  "type": "spell",
  "cost": 3,
  "artSlug": "spell-case-04",
  "spellBehaviour": "offensive",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-air-02",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('4001', {
  "prism": "int",
  "element": "air",
  "traits": [
    "stealth"
  ],
  "type": "unit",
  "cost": 3,
  "health": 2,
  "power": 5,
  "artSlug": "unit-shapo-43",
  "attachment": "1003",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-air-02",
  "relatedCards": [],
  "textVocab": [
    "dust",
    "trigger-glory"
  ],
  "effectTypes": [
    "Glory"
  ]
})
CardLibrary.set('4002', {
  "prism": "int",
  "element": "mind",
  "traits": [
    "guard"
  ],
  "type": "unit",
  "cost": 3,
  "health": 5,
  "power": 2,
  "artSlug": "unit-xavi-83",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-mind-02",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": [
    "Generic"
  ]
})
CardLibrary.set('4003', {
  "prism": "int",
  "element": "metal",
  "traits": [
    "stealth",
    "armor"
  ],
  "type": "unit",
  "cost": 4,
  "health": 3,
  "power": 2,
  "artSlug": "unit-calle-11",
  "attachment": "20043",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-metal-01",
  "relatedCards": [],
  "textVocab": [
    "trigger-inspire-any"
  ],
  "effectTypes": [
    "Inspire"
  ]
})
CardLibrary.set('4004', {
  "prism": "int",
  "element": "water",
  "traits": [],
  "type": "spell",
  "cost": 5,
  "artSlug": "spell-case-80",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-water-03",
  "relatedCards": [
    "20009"
  ],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('4005', {
  "prism": "int",
  "element": "air",
  "traits": [
    "stealth",
    "banner"
  ],
  "type": "unit",
  "cost": 3,
  "health": 3,
  "power": 2,
  "artSlug": "unit-edsoa-47",
  "attachment": "20057",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-air-03",
  "relatedCards": [],
  "textVocab": [
    "banner-unit"
  ],
  "effectTypes": [
    "Continuous"
  ]
})
CardLibrary.set('4006', {
  "prism": "agy",
  "element": "air",
  "traits": [],
  "type": "spell",
  "cost": 1,
  "artSlug": "spell-case-45",
  "spellBehaviour": "defensive",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-air-02",
  "relatedCards": [],
  "textVocab": [
    "stealth"
  ],
  "effectTypes": []
})
CardLibrary.set('4007', {
  "prism": "int",
  "element": "mind",
  "traits": [],
  "type": "spell",
  "cost": 7,
  "artSlug": "spell-xavi-46",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-mind-03",
  "relatedCards": [
    "20032"
  ],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('4008', {
  "prism": "int",
  "element": "fire",
  "traits": [],
  "type": "unit",
  "cost": 4,
  "health": 4,
  "power": 4,
  "artSlug": "unit-puddu-05",
  "attachment": "20053",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-fire-02",
  "relatedCards": [],
  "textVocab": [
    "trigger-play"
  ],
  "effectTypes": [
    "Play"
  ]
})
CardLibrary.set('4009', {
  "prism": "int",
  "element": "metal",
  "traits": [],
  "type": "spell",
  "cost": 3,
  "artSlug": "spell-xavi-22",
  "spellBehaviour": "defensive",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-metal-02",
  "relatedCards": [
    "20047"
  ],
  "textVocab": [
    "draw"
  ],
  "effectTypes": []
})
CardLibrary.set('4010', {
  "prism": "wis",
  "element": "light",
  "traits": [],
  "type": "spell",
  "cost": 4,
  "artSlug": "spell-xavi-69",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-light-03",
  "relatedCards": [
    "20022"
  ],
  "textVocab": [
    "draw"
  ],
  "effectTypes": []
})
CardLibrary.set('4011', {
  "prism": "int",
  "element": "light",
  "traits": [],
  "type": "spell",
  "cost": 5,
  "artSlug": "spell-ksen-02",
  "spellBehaviour": "offensive",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-light-01",
  "relatedCards": [],
  "textVocab": [
    "dust",
    "conjure"
  ],
  "effectTypes": []
})
CardLibrary.set('4012', {
  "prism": "int",
  "element": "water",
  "traits": [
    "stealth",
    "armor"
  ],
  "type": "unit",
  "cost": 10,
  "health": 7,
  "power": 6,
  "artSlug": "unit-panou-08",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-water-02",
  "relatedCards": [
    "20009"
  ],
  "textVocab": [
    "trigger-play"
  ],
  "effectTypes": [
    "Play"
  ]
})
CardLibrary.set('4013', {
  "prism": "int",
  "element": "earth",
  "traits": [
    "stealth",
    "lifesteal"
  ],
  "type": "unit",
  "cost": 4,
  "health": 3,
  "power": 2,
  "artSlug": "unit-desir-11",
  "attachment": "2003",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-earth-01",
  "relatedCards": [
    "20003"
  ],
  "textVocab": [
    "trigger-sunset"
  ],
  "effectTypes": [
    "Sunset"
  ]
})
CardLibrary.set('4014', {
  "prism": "int",
  "element": "air",
  "traits": [
    "banner"
  ],
  "type": "spell",
  "cost": 3,
  "artSlug": "spell-xavi-54",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-air-01",
  "relatedCards": [],
  "textVocab": [
    "draw"
  ],
  "effectTypes": []
})
CardLibrary.set('4015', {
  "prism": "int",
  "element": "mind",
  "traits": [
    "stealth",
    "dash"
  ],
  "type": "unit",
  "cost": 2,
  "health": 4,
  "power": 1,
  "artSlug": "unit-desir-08",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-mind-02",
  "relatedCards": [],
  "textVocab": [
    "trigger-slay-unit"
  ],
  "effectTypes": [
    "Slay"
  ]
})
CardLibrary.set('4016', {
  "prism": "hrt",
  "element": "light",
  "traits": [],
  "type": "spell",
  "cost": 1,
  "artSlug": "spell-patty-05",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-light-03",
  "relatedCards": [],
  "textVocab": [
    "stealth",
    "draw"
  ],
  "effectTypes": []
})
CardLibrary.set('4017', {
  "prism": "int",
  "element": "mind",
  "traits": [],
  "type": "spell",
  "cost": 3,
  "artSlug": "spell-case-44",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-mind-01",
  "relatedCards": [],
  "textVocab": [
    "draw"
  ],
  "effectTypes": []
})
CardLibrary.set('4018', {
  "prism": "int",
  "element": "light",
  "traits": [],
  "type": "unit",
  "cost": 7,
  "health": 6,
  "power": 2,
  "artSlug": "unit-puddu-09",
  "attachment": "20022",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-light-03",
  "relatedCards": [],
  "textVocab": [
    "dust",
    "trigger-inspire-spell"
  ],
  "effectTypes": [
    "Inspire"
  ]
})
CardLibrary.set('4019', {
  "prism": "str",
  "element": "metal",
  "traits": [],
  "type": "spell",
  "cost": "X",
  "artSlug": "spell-xavi-39",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-metal-03",
  "relatedCards": [
    "20047"
  ],
  "textVocab": [
    "draw"
  ],
  "effectTypes": []
})
CardLibrary.set('4020', {
  "prism": "int",
  "element": "light",
  "traits": [
    "guard",
    "armor"
  ],
  "type": "unit",
  "cost": 1,
  "health": 1,
  "power": 1,
  "artSlug": "unit-calle-05",
  "attachment": "20022",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-light-01",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('4021', {
  "prism": "int",
  "element": "light",
  "traits": [
    "armor"
  ],
  "type": "unit",
  "cost": 5,
  "health": 5,
  "power": 3,
  "artSlug": "unit-calle-06",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-light-01",
  "relatedCards": [
    "4020"
  ],
  "textVocab": [
    "trigger-sunset"
  ],
  "effectTypes": [
    "Sunset"
  ]
})
CardLibrary.set('4022', {
  "prism": "int",
  "element": "water",
  "traits": [],
  "type": "spell",
  "cost": 9,
  "artSlug": "spell-hans-03",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-water-03",
  "relatedCards": [],
  "textVocab": [
    "dust",
    "draw"
  ],
  "effectTypes": []
})
CardLibrary.set('4023', {
  "prism": "int",
  "element": "water",
  "traits": [
    "stealth"
  ],
  "type": "unit",
  "cost": 5,
  "health": 5,
  "power": 5,
  "artSlug": "unit-lobo-02",
  "attachment": "20038",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-water-01",
  "relatedCards": [],
  "textVocab": [
    "inspire"
  ],
  "effectTypes": [
    "Continuous"
  ]
})
CardLibrary.set('4024', {
  "prism": "int",
  "element": "fire",
  "traits": [
    "wither"
  ],
  "type": "spell",
  "cost": 3,
  "artSlug": "spell-case-54",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-fire-02",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('4025', {
  "prism": "int",
  "element": "water",
  "traits": [],
  "type": "spell",
  "cost": 3,
  "artSlug": "spell-xavi-59",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-water-03",
  "relatedCards": [],
  "textVocab": [
    "draw"
  ],
  "effectTypes": []
})
CardLibrary.set('4026', {
  "prism": "int",
  "element": "metal",
  "traits": [
    "stealth",
    "armor"
  ],
  "type": "unit",
  "cost": 2,
  "health": 1,
  "power": 2,
  "artSlug": "unit-shapo-05",
  "attachment": "20022",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-metal-01",
  "relatedCards": [
    "20022"
  ],
  "textVocab": [
    "trigger-inspire-metal"
  ],
  "effectTypes": [
    "Inspire"
  ]
})
CardLibrary.set('4027', {
  "prism": "int",
  "element": "mind",
  "traits": [],
  "type": "unit",
  "cost": 5,
  "health": 6,
  "power": 3,
  "artSlug": "unit-vini-17",
  "attachment": "2092",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-mind-01",
  "relatedCards": [],
  "textVocab": [
    "trigger-inspire-spell",
    "draw"
  ],
  "effectTypes": [
    "Inspire"
  ]
})
CardLibrary.set('4028', {
  "prism": "int",
  "element": "metal",
  "traits": [],
  "type": "unit",
  "cost": 1,
  "health": 2,
  "power": 1,
  "artSlug": "unit-pasco-03",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-metal-03",
  "relatedCards": [],
  "textVocab": [
    "trigger-summon",
    "dust",
    "draw"
  ],
  "effectTypes": [
    "Summon"
  ]
})
CardLibrary.set('4029', {
  "prism": "int",
  "element": "light",
  "traits": [
    "stealth",
    "lifesteal"
  ],
  "type": "unit",
  "cost": 1,
  "health": 1,
  "power": 2,
  "artSlug": "unit-xavi-28",
  "attachment": "1046",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-light-03",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('4030', {
  "prism": "int",
  "element": "air",
  "traits": [
    "stealth"
  ],
  "type": "unit",
  "cost": 3,
  "health": 2,
  "power": 3,
  "artSlug": "unit-desir-24",
  "attachment": "20042",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-air-03",
  "relatedCards": [],
  "textVocab": [
    "trigger-summon"
  ],
  "effectTypes": [
    "Summon"
  ]
})
CardLibrary.set('4031', {
  "prism": "int",
  "element": "water",
  "traits": [
    "banner"
  ],
  "type": "spell",
  "cost": 1,
  "artSlug": "spell-case-106",
  "spellBehaviour": "offensive",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-water-03",
  "relatedCards": [
    "20054",
    "20009"
  ],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('4032', {
  "prism": "int",
  "element": "light",
  "traits": [
    "guard",
    "armor"
  ],
  "type": "unit",
  "cost": 6,
  "health": 3,
  "power": 3,
  "artSlug": "unit-lobo-27",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-light-01",
  "relatedCards": [],
  "textVocab": [
    "trigger-summon"
  ],
  "effectTypes": [
    "Summon"
  ]
})
CardLibrary.set('4033', {
  "prism": "int",
  "element": "water",
  "traits": [
    "stealth"
  ],
  "type": "unit",
  "cost": 3,
  "health": 3,
  "power": 3,
  "artSlug": "unit-panou-62",
  "attachment": "20022",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-water-03",
  "relatedCards": [
    "20022"
  ],
  "textVocab": [
    "trigger-sunset"
  ],
  "effectTypes": [
    "Sunset"
  ]
})
CardLibrary.set('4034', {
  "prism": "int",
  "element": "earth",
  "traits": [
    "guard"
  ],
  "type": "unit",
  "cost": 1,
  "health": 3,
  "power": 1,
  "artSlug": "unit-edsoa-35",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-earth-01",
  "relatedCards": [
    "20010"
  ],
  "textVocab": [
    "trigger-death"
  ],
  "effectTypes": [
    "Death"
  ]
})
CardLibrary.set('4035', {
  "prism": "int",
  "element": "light",
  "traits": [],
  "type": "spell",
  "cost": 3,
  "artSlug": "spell-case-178",
  "spellBehaviour": "offensive",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-light-01",
  "relatedCards": [
    "20048"
  ],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('4036', {
  "prism": "int",
  "element": "mind",
  "traits": [],
  "type": "spell",
  "cost": 2,
  "artSlug": "spell-case-23",
  "spellBehaviour": "offensive",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-mind-02",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('4037', {
  "prism": "int",
  "element": "mind",
  "traits": [],
  "type": "spell",
  "cost": 2,
  "artSlug": "spell-hans-04",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-mind-03",
  "relatedCards": [],
  "textVocab": [
    "draw"
  ],
  "effectTypes": []
})
CardLibrary.set('4038', {
  "prism": "int",
  "element": "fire",
  "traits": [
    "stealth"
  ],
  "type": "unit",
  "cost": 1,
  "health": 1,
  "power": 2,
  "artSlug": "unit-xavi-21",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-fire-02",
  "relatedCards": [
    "2006"
  ],
  "textVocab": [
    "trigger-death"
  ],
  "effectTypes": [
    "Death"
  ]
})
CardLibrary.set('4039', {
  "prism": "int",
  "element": "dark",
  "traits": [
    "lifesteal",
    "wither"
  ],
  "type": "unit",
  "cost": 3,
  "health": 3,
  "power": 3,
  "artSlug": "unit-edsoa-102",
  "attachment": "20029",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-dark-03",
  "relatedCards": [
    "20029"
  ],
  "textVocab": [
    "trigger-death"
  ],
  "effectTypes": [
    "Death"
  ]
})
CardLibrary.set('4040', {
  "prism": "int",
  "element": "fire",
  "traits": [],
  "type": "spell",
  "cost": 6,
  "artSlug": "spell-case-58",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-fire-03",
  "relatedCards": [
    "2006"
  ],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('4041', {
  "prism": "wis",
  "element": "earth",
  "traits": [],
  "type": "unit",
  "cost": 2,
  "health": 3,
  "power": 2,
  "artSlug": "unit-edsoa-10",
  "attachment": "1001",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-earth-01",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('4042', {
  "prism": "int",
  "element": "air",
  "traits": [
    "guard",
    "banner"
  ],
  "type": "unit",
  "cost": 1,
  "health": 2,
  "power": 0,
  "artSlug": "unit-desir-21",
  "attachment": "4014",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-air-01",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('4043', {
  "prism": "int",
  "element": "metal",
  "traits": [],
  "type": "spell",
  "cost": 3,
  "artSlug": "spell-case-52",
  "spellBehaviour": "offensive",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-metal-03",
  "relatedCards": [],
  "textVocab": [
    "mulligan"
  ],
  "effectTypes": []
})
CardLibrary.set('4044', {
  "prism": "int",
  "element": "metal",
  "traits": [],
  "type": "unit",
  "cost": 3,
  "health": 2,
  "power": 2,
  "artSlug": "unit-lobo-33",
  "attachment": "20029",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-metal-01",
  "relatedCards": [],
  "textVocab": [
    "trigger-inspire-1c"
  ],
  "effectTypes": [
    "Inspire"
  ]
})
CardLibrary.set('4045', {
  "prism": "wis",
  "element": "earth",
  "traits": [],
  "type": "unit",
  "cost": 5,
  "health": 4,
  "power": 4,
  "artSlug": "unit-puddu-16",
  "spellBehaviour": "offensive",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-earth-02",
  "relatedCards": [
    "20025"
  ],
  "textVocab": [
    "dust",
    "trigger-play"
  ],
  "effectTypes": [
    "Play"
  ]
})
CardLibrary.set('4046', {
  "prism": "int",
  "element": "earth",
  "traits": [],
  "type": "spell",
  "cost": 1,
  "artSlug": "spell-case-56",
  "spellBehaviour": "offensive",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-earth-03",
  "relatedCards": [
    "20003"
  ],
  "textVocab": [
    "trigger-slay-spell"
  ],
  "effectTypes": [
    "Slay"
  ]
})
CardLibrary.set('4047', {
  "prism": "int",
  "element": "water",
  "traits": [],
  "type": "spell",
  "cost": 4,
  "artSlug": "spell-case-63",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-water-01",
  "relatedCards": [
    "20054"
  ],
  "textVocab": [
    "draw"
  ],
  "effectTypes": []
})
CardLibrary.set('4048', {
  "prism": "int",
  "element": "water",
  "traits": [
    "banner"
  ],
  "type": "unit",
  "cost": 4,
  "health": 4,
  "power": 4,
  "artSlug": "unit-edsoa-32",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-water-03",
  "relatedCards": [],
  "textVocab": [
    "trigger-summon",
    "draw"
  ],
  "effectTypes": [
    "Summon"
  ]
})
CardLibrary.set('4049', {
  "prism": "int",
  "element": "mind",
  "traits": [],
  "type": "spell",
  "cost": 3,
  "artSlug": "spell-case-293",
  "spellBehaviour": "defensive",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-mind-03",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('4050', {
  "prism": "int",
  "element": "mind",
  "traits": [],
  "type": "spell",
  "cost": 4,
  "artSlug": "spell-panou-01",
  "spellBehaviour": "offensive",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-mind-01",
  "relatedCards": [],
  "textVocab": [
    "dust"
  ],
  "effectTypes": []
})
CardLibrary.set('4051', {
  "prism": "hrt",
  "element": "dark",
  "traits": [
    "stealth",
    "wither"
  ],
  "type": "unit",
  "cost": 4,
  "health": 4,
  "power": 2,
  "artSlug": "unit-puddu-13",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-dark-01",
  "relatedCards": [
    "20013"
  ],
  "textVocab": [
    "dust",
    "trigger-sunset",
    "guard"
  ],
  "effectTypes": [
    "Sunset"
  ]
})
CardLibrary.set('4052', {
  "prism": "int",
  "element": "mind",
  "traits": [
    "stealth"
  ],
  "type": "unit",
  "cost": 1,
  "health": 1,
  "power": 2,
  "artSlug": "unit-desir-28",
  "attachment": "20053",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-mind-01",
  "relatedCards": [
    "20040"
  ],
  "textVocab": [
    "trigger-death"
  ],
  "effectTypes": [
    "Death"
  ]
})
CardLibrary.set('4053', {
  "prism": "int",
  "element": "metal",
  "traits": [],
  "type": "spell",
  "cost": 2,
  "artSlug": "spell-case-85",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-metal-01",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('4054', {
  "prism": "int",
  "element": "mind",
  "traits": [],
  "type": "spell",
  "cost": 3,
  "artSlug": "spell-xavi-48",
  "spellBehaviour": "defensive",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-mind-02",
  "relatedCards": [],
  "textVocab": [
    "draw"
  ],
  "effectTypes": []
})
CardLibrary.set('4055', {
  "prism": "int",
  "element": "metal",
  "traits": [
    "lifesteal"
  ],
  "type": "spell",
  "cost": 5,
  "artSlug": "spell-case-84",
  "spellBehaviour": "offensive",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-metal-03",
  "relatedCards": [],
  "textVocab": [
    "trigger-slay-spell"
  ],
  "effectTypes": [
    "Slay"
  ]
})
CardLibrary.set('4056', {
  "prism": "int",
  "element": "water",
  "traits": [
    "stealth"
  ],
  "type": "unit",
  "cost": 3,
  "health": 7,
  "power": 1,
  "artSlug": "unit-scava-11",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-water-04",
  "relatedCards": [],
  "textVocab": [
    "trigger-sunset"
  ],
  "effectTypes": [
    "Sunset"
  ]
})
CardLibrary.set('4057', {
  "prism": "int",
  "element": "water",
  "traits": [
    "stealth"
  ],
  "type": "unit",
  "cost": 4,
  "health": 7,
  "power": 3,
  "artSlug": "unit-xavi-18",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-water-01",
  "relatedCards": [
    "4159"
  ],
  "textVocab": [
    "trigger-glory"
  ],
  "effectTypes": [
    "Glory"
  ]
})
CardLibrary.set('4058', {
  "prism": "int",
  "element": "dark",
  "traits": [],
  "type": "spell",
  "cost": 2,
  "artSlug": "spell-case-60",
  "spellBehaviour": "offensive",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-dark-03",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('4059', {
  "prism": "int",
  "element": "mind",
  "traits": [],
  "type": "spell",
  "cost": 3,
  "artSlug": "spell-case-19",
  "spellBehaviour": "defensive",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-mind-01",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('4060', {
  "prism": "int",
  "element": "mind",
  "traits": [],
  "type": "spell",
  "cost": 2,
  "artSlug": "spell-case-171",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-mind-02",
  "relatedCards": [
    "20053"
  ],
  "textVocab": [
    "draw"
  ],
  "effectTypes": []
})
CardLibrary.set('4061', {
  "prism": "str",
  "element": "metal",
  "traits": [],
  "type": "unit",
  "cost": 2,
  "health": 3,
  "power": 2,
  "artSlug": "unit-chen-19",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-metal-01",
  "relatedCards": [],
  "textVocab": [
    "trigger-summon",
    "draw"
  ],
  "effectTypes": [
    "Summon"
  ]
})
CardLibrary.set('4062', {
  "prism": "int",
  "element": "air",
  "traits": [
    "guard",
    "lifesteal"
  ],
  "type": "unit",
  "cost": 2,
  "health": 2,
  "power": 2,
  "artSlug": "unit-xavi-33",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-air-01",
  "relatedCards": [],
  "textVocab": [
    "trigger-death",
    "draw"
  ],
  "effectTypes": [
    "Death"
  ]
})
CardLibrary.set('4063', {
  "prism": "int",
  "element": "light",
  "traits": [
    "lifesteal"
  ],
  "type": "unit",
  "cost": 2,
  "health": 3,
  "power": 2,
  "artSlug": "unit-lobo-14",
  "attachment": "1035",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-light-02",
  "relatedCards": [],
  "textVocab": [
    "lifesteal"
  ],
  "effectTypes": [
    "Continuous"
  ]
})
CardLibrary.set('4064', {
  "prism": "int",
  "element": "mind",
  "traits": [
    "guard"
  ],
  "type": "unit",
  "cost": 8,
  "health": 8,
  "power": 8,
  "artSlug": "unit-leoni-02",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-mind-01",
  "relatedCards": [],
  "textVocab": [
    "trigger-summon",
    "draw"
  ],
  "effectTypes": [
    "Summon"
  ]
})
CardLibrary.set('4065', {
  "prism": "int",
  "element": "air",
  "traits": [],
  "type": "unit",
  "cost": 4,
  "health": 4,
  "power": 4,
  "artSlug": "unit-minh-02",
  "attachment": "20042",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-air-02",
  "relatedCards": [],
  "textVocab": [
    "draw"
  ],
  "effectTypes": [
    "Generic"
  ]
})
CardLibrary.set('4066', {
  "prism": "int",
  "element": "water",
  "traits": [],
  "type": "spell",
  "cost": 2,
  "artSlug": "spell-xavi-33",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-water-02",
  "relatedCards": [],
  "textVocab": [
    "draw"
  ],
  "effectTypes": []
})
CardLibrary.set('4067', {
  "prism": "int",
  "element": "water",
  "traits": [
    "guard"
  ],
  "type": "unit",
  "cost": 2,
  "health": 2,
  "power": 2,
  "artSlug": "unit-rubio-23",
  "attachment": "20054",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-water-01",
  "relatedCards": [],
  "textVocab": [
    "trigger-inspire-water"
  ],
  "effectTypes": [
    "Inspire"
  ]
})
CardLibrary.set('4068', {
  "prism": "int",
  "element": "water",
  "traits": [
    "wither"
  ],
  "type": "unit",
  "cost": 8,
  "health": 8,
  "power": 6,
  "artSlug": "unit-panou-56",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-water-01",
  "relatedCards": [],
  "textVocab": [
    "trigger-sunset"
  ],
  "effectTypes": [
    "Sunset"
  ]
})
CardLibrary.set('4069', {
  "prism": "int",
  "element": "earth",
  "traits": [
    "guard"
  ],
  "type": "unit",
  "cost": 5,
  "health": 6,
  "power": 4,
  "artSlug": "unit-shapo-66",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-earth-01",
  "relatedCards": [],
  "textVocab": [
    "trigger-death"
  ],
  "effectTypes": [
    "Death"
  ]
})
CardLibrary.set('4070', {
  "prism": "int",
  "element": "metal",
  "traits": [],
  "type": "spell",
  "cost": 20,
  "artSlug": "spell-xavi-85",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-metal-03",
  "relatedCards": [],
  "textVocab": [
    "armor"
  ],
  "effectTypes": []
})
CardLibrary.set('4071', {
  "prism": "int",
  "element": "metal",
  "traits": [
    "guard"
  ],
  "type": "unit",
  "cost": 7,
  "health": 6,
  "power": 6,
  "artSlug": "unit-lobo-23",
  "spellBehaviour": "defensive",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-metal-03",
  "relatedCards": [],
  "textVocab": [
    "trigger-play",
    "guard"
  ],
  "effectTypes": [
    "Play"
  ]
})
CardLibrary.set('4072', {
  "prism": "int",
  "element": "fire",
  "traits": [
    "armor",
    "wither"
  ],
  "type": "unit",
  "cost": 3,
  "health": 3,
  "power": 1,
  "artSlug": "unit-edsoa-44",
  "attachment": "2071",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-fire-01",
  "relatedCards": [],
  "textVocab": [
    "wither"
  ],
  "effectTypes": [
    "Continuous"
  ]
})
CardLibrary.set('4073', {
  "prism": "int",
  "element": "dark",
  "traits": [
    "stealth"
  ],
  "type": "unit",
  "cost": 1,
  "health": 2,
  "power": 1,
  "artSlug": "unit-puddu-22",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-dark-01",
  "relatedCards": [],
  "textVocab": [
    "enemyconjure",
    "trigger-glory"
  ],
  "effectTypes": [
    "Glory"
  ]
})
CardLibrary.set('4074', {
  "prism": "int",
  "element": "mind",
  "traits": [],
  "type": "spell",
  "cost": 1,
  "artSlug": "spell-case-131",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-mind-01",
  "relatedCards": [],
  "textVocab": [
    "draw"
  ],
  "effectTypes": []
})
CardLibrary.set('4075', {
  "prism": "wis",
  "element": "metal",
  "traits": [],
  "type": "spell",
  "cost": 2,
  "artSlug": "spell-case-98",
  "spellBehaviour": "offensive",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-metal-02",
  "relatedCards": [
    "20048"
  ],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('4076', {
  "prism": "int",
  "element": "mind",
  "traits": [
    "guard"
  ],
  "type": "unit",
  "cost": 2,
  "health": 2,
  "power": 3,
  "artSlug": "unit-xavi-34",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-mind-02",
  "relatedCards": [],
  "textVocab": [
    "trigger-summon"
  ],
  "effectTypes": [
    "Summon"
  ]
})
CardLibrary.set('4077', {
  "prism": "int",
  "element": "mind",
  "traits": [],
  "type": "unit",
  "cost": 3,
  "health": 4,
  "power": 2,
  "artSlug": "unit-xavi-35",
  "attachment": "4060",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-mind-01",
  "relatedCards": [
    "20032"
  ],
  "textVocab": [
    "trigger-inspire-mind"
  ],
  "effectTypes": [
    "Inspire"
  ]
})
CardLibrary.set('4078', {
  "prism": "int",
  "element": "metal",
  "traits": [
    "armor"
  ],
  "type": "unit",
  "cost": 3,
  "health": 2,
  "power": 2,
  "artSlug": "unit-giaco-11",
  "attachment": "4043",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-metal-02",
  "relatedCards": [],
  "textVocab": [
    "trigger-summon",
    "armor",
    "draw"
  ],
  "effectTypes": [
    "Summon"
  ]
})
CardLibrary.set('4079', {
  "prism": "int",
  "element": "earth",
  "traits": [],
  "type": "spell",
  "cost": 3,
  "artSlug": "spell-case-96",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-earth-03",
  "relatedCards": [
    "20003",
    "20039"
  ],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('4080', {
  "prism": "int",
  "element": "water",
  "traits": [
    "armor"
  ],
  "type": "unit",
  "cost": 1,
  "health": 2,
  "power": 1,
  "artSlug": "unit-lobo-43",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-water-01",
  "relatedCards": [],
  "textVocab": [
    "trigger-sunset",
    "draw"
  ],
  "effectTypes": [
    "Sunset"
  ]
})
CardLibrary.set('4081', {
  "prism": "int",
  "element": "mind",
  "traits": [],
  "type": "unit",
  "cost": 4,
  "health": 3,
  "power": 3,
  "artSlug": "unit-puddu-19",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-mind-03",
  "relatedCards": [],
  "textVocab": [
    "trigger-summon",
    "conjure"
  ],
  "effectTypes": [
    "Summon"
  ]
})
CardLibrary.set('4082', {
  "prism": "int",
  "element": "fire",
  "traits": [],
  "type": "unit",
  "cost": 2,
  "health": 4,
  "power": 2,
  "artSlug": "unit-desir-31",
  "attachment": "20023",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-fire-02",
  "relatedCards": [
    "2006"
  ],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('4083', {
  "prism": "int",
  "element": "mind",
  "traits": [
    "guard"
  ],
  "type": "unit",
  "cost": 5,
  "health": 7,
  "power": 3,
  "artSlug": "unit-xavi-38",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-mind-02",
  "relatedCards": [],
  "textVocab": [
    "trigger-play"
  ],
  "effectTypes": [
    "Play"
  ]
})
CardLibrary.set('4084', {
  "prism": "int",
  "element": "dark",
  "traits": [],
  "type": "spell",
  "cost": 1,
  "artSlug": "spell-xavi-64",
  "spellBehaviour": "defensive",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-dark-02",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('4085', {
  "prism": "wis",
  "element": "earth",
  "traits": [
    "stealth",
    "banner"
  ],
  "type": "unit",
  "cost": 4,
  "health": 3,
  "power": 3,
  "artSlug": "unit-brian-06",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-earth-02",
  "relatedCards": [
    "20025"
  ],
  "textVocab": [
    "trigger-summon"
  ],
  "effectTypes": [
    "Summon"
  ]
})
CardLibrary.set('4086', {
  "prism": "int",
  "element": "water",
  "traits": [
    "guard"
  ],
  "type": "unit",
  "cost": 6,
  "health": 7,
  "power": 4,
  "artSlug": "unit-lobo-41",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-water-01",
  "relatedCards": [
    "4144"
  ],
  "textVocab": [
    "trigger-sunset"
  ],
  "effectTypes": [
    "Sunset"
  ]
})
CardLibrary.set('4087', {
  "prism": "int",
  "element": "water",
  "traits": [],
  "type": "spell",
  "cost": 6,
  "artSlug": "spell-case-128",
  "spellBehaviour": "offensive",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-water-02",
  "relatedCards": [
    "20027"
  ],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('4088', {
  "prism": "int",
  "element": "water",
  "traits": [],
  "type": "unit",
  "cost": 2,
  "health": 3,
  "power": 1,
  "artSlug": "unit-brian-05",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-water-02",
  "relatedCards": [],
  "textVocab": [
    "trigger-summon",
    "draw"
  ],
  "effectTypes": [
    "Summon"
  ]
})
CardLibrary.set('4089', {
  "prism": "int",
  "element": "dark",
  "traits": [],
  "type": "unit",
  "cost": 4,
  "health": 4,
  "power": 4,
  "artSlug": "unit-delat-04",
  "attachment": "20053",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-dark-02",
  "relatedCards": [],
  "textVocab": [
    "trigger-summon",
    "dust"
  ],
  "effectTypes": [
    "Summon"
  ]
})
CardLibrary.set('4090', {
  "prism": "int",
  "element": "light",
  "traits": [
    "armor"
  ],
  "type": "unit",
  "cost": 3,
  "health": 2,
  "power": 3,
  "artSlug": "unit-lobo-24",
  "attachment": "20022",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-light-02",
  "relatedCards": [
    "20022"
  ],
  "textVocab": [],
  "effectTypes": [
    "Generic"
  ]
})
CardLibrary.set('4091', {
  "prism": "int",
  "element": "light",
  "traits": [],
  "type": "spell",
  "cost": 1,
  "artSlug": "spell-xavi-40",
  "spellBehaviour": "defensive",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-light-03",
  "relatedCards": [
    "20019",
    "20053"
  ],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('4092', {
  "prism": "int",
  "element": "mind",
  "traits": [
    "stealth"
  ],
  "type": "unit",
  "cost": 5,
  "health": 3,
  "power": 3,
  "artSlug": "unit-edsoa-04",
  "attachment": "1086",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-mind-01",
  "relatedCards": [],
  "textVocab": [
    "trigger-summon",
    "dash",
    "draw"
  ],
  "effectTypes": [
    "Summon"
  ]
})
CardLibrary.set('4093', {
  "prism": "int",
  "element": "mind",
  "traits": [
    "stealth"
  ],
  "type": "unit",
  "cost": 2,
  "health": 2,
  "power": 3,
  "artSlug": "unit-chen-08",
  "attachment": "2057",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-mind-02",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('4094', {
  "prism": "int",
  "element": "metal",
  "traits": [],
  "type": "unit",
  "cost": 4,
  "health": 4,
  "power": 4,
  "artSlug": "unit-lobo-21",
  "attachment": "20022",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-metal-02",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": [
    "Continuous"
  ]
})
CardLibrary.set('4095', {
  "prism": "int",
  "element": "metal",
  "traits": [],
  "type": "spell",
  "cost": 1,
  "artSlug": "spell-case-99",
  "spellBehaviour": "offensive",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-metal-01",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('4096', {
  "prism": "int",
  "element": "earth",
  "traits": [],
  "type": "spell",
  "cost": 3,
  "artSlug": "spell-case-122",
  "spellBehaviour": "offensive",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-earth-02",
  "relatedCards": [
    "20003"
  ],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('4097', {
  "prism": "int",
  "element": "metal",
  "traits": [
    "armor"
  ],
  "type": "unit",
  "cost": 3,
  "health": 3,
  "power": 1,
  "artSlug": "unit-panou-59",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-metal-02",
  "relatedCards": [],
  "textVocab": [
    "armor"
  ],
  "effectTypes": [
    "Continuous"
  ]
})
CardLibrary.set('4098', {
  "prism": "int",
  "element": "metal",
  "traits": [],
  "type": "unit",
  "cost": 2,
  "health": 3,
  "power": 2,
  "artSlug": "unit-edsoa-01",
  "attachment": "20055",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-metal-01",
  "relatedCards": [
    "20051"
  ],
  "textVocab": [
    "trigger-sunrise"
  ],
  "effectTypes": [
    "Sunrise"
  ]
})
CardLibrary.set('4099', {
  "prism": "wis",
  "element": "light",
  "traits": [],
  "type": "spell",
  "cost": 2,
  "artSlug": "spell-case-10",
  "spellBehaviour": "offensive",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-light-02",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('4100', {
  "prism": "int",
  "element": "metal",
  "traits": [],
  "type": "unit",
  "cost": 4,
  "health": 4,
  "power": 4,
  "artSlug": "unit-calle-18",
  "spellBehaviour": "offensive",
  "set": "Core Expansion",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-metal-02",
  "relatedCards": [],
  "textVocab": [
    "trigger-play"
  ],
  "effectTypes": [
    "Play"
  ]
})
CardLibrary.set('4101', {
  "prism": "int",
  "element": "water",
  "traits": [],
  "type": "spell",
  "cost": 1,
  "artSlug": "spell-case-187",
  "set": "Core Expansion",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-water-01",
  "relatedCards": [],
  "textVocab": [
    "draw"
  ],
  "effectTypes": []
})
CardLibrary.set('4102', {
  "prism": "int",
  "element": "water",
  "traits": [],
  "type": "unit",
  "cost": 4,
  "health": 3,
  "power": 3,
  "artSlug": "unit-patty-05",
  "attachment": "20054",
  "set": "Core Expansion",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-water-03",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('4103', {
  "prism": "int",
  "element": "dark",
  "traits": [],
  "type": "spell",
  "cost": 3,
  "artSlug": "spell-case-195",
  "set": "Core Expansion",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-dark-03",
  "relatedCards": [],
  "textVocab": [
    "draw"
  ],
  "effectTypes": []
})
CardLibrary.set('4104', {
  "prism": "int",
  "element": "water",
  "traits": [],
  "type": "unit",
  "cost": 3,
  "health": 3,
  "power": 4,
  "artSlug": "unit-patty-08",
  "spellBehaviour": "positive",
  "set": "Core Expansion",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-water-01",
  "relatedCards": [
    "20009"
  ],
  "textVocab": [
    "trigger-sunset",
    "lowesthealth"
  ],
  "effectTypes": [
    "Sunset"
  ]
})
CardLibrary.set('4105', {
  "prism": "wis",
  "element": "light",
  "traits": [],
  "type": "spell",
  "cost": 3,
  "artSlug": "spell-case-182",
  "spellBehaviour": "positive",
  "set": "Core Expansion",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-light-02",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('4106', {
  "prism": "int",
  "element": "metal",
  "traits": [
    "stealth"
  ],
  "type": "unit",
  "cost": 1,
  "health": 1,
  "power": 2,
  "artSlug": "unit-edsoa-84",
  "set": "Clash of Inventors",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-metal-01",
  "relatedCards": [
    "20058"
  ],
  "textVocab": [
    "trigger-summon",
    "trigger-death"
  ],
  "effectTypes": [
    "Summon",
    "Death"
  ]
})
CardLibrary.set('4107', {
  "prism": "int",
  "element": "water",
  "traits": [
    "dash",
    "armor"
  ],
  "type": "unit",
  "cost": 7,
  "health": 4,
  "power": 4,
  "artSlug": "unit-calle-40",
  "attachment": "20022",
  "set": "Clash of Inventors",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-water-03",
  "relatedCards": [],
  "textVocab": [
    "trigger-play"
  ],
  "effectTypes": [
    "Play"
  ]
})
CardLibrary.set('4108', {
  "prism": "int",
  "element": "water",
  "traits": [
    "armor"
  ],
  "type": "unit",
  "cost": 4,
  "health": 2,
  "power": 1,
  "artSlug": "unit-edsoa-81",
  "attachment": "20022",
  "set": "Clash of Inventors",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-water-03",
  "relatedCards": [
    "20058"
  ],
  "textVocab": [
    "trigger-inspire-spell"
  ],
  "effectTypes": [
    "Inspire"
  ]
})
CardLibrary.set('4109', {
  "prism": "int",
  "element": "metal",
  "traits": [
    "armor"
  ],
  "type": "unit",
  "cost": 5,
  "health": 3,
  "power": 3,
  "artSlug": "unit-calle-32",
  "attachment": "4113",
  "set": "Clash of Inventors",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-metal-02",
  "relatedCards": [
    "20019"
  ],
  "textVocab": [],
  "effectTypes": [
    "Generic"
  ]
})
CardLibrary.set('4110', {
  "prism": "int",
  "element": "mind",
  "traits": [
    "stealth"
  ],
  "type": "unit",
  "cost": 6,
  "health": 2,
  "power": 2,
  "artSlug": "unit-calle-36",
  "attachment": "20053",
  "set": "Clash of Inventors",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-mind-03",
  "relatedCards": [],
  "textVocab": [
    "trigger-play",
    "trigger-death",
    "guard"
  ],
  "effectTypes": [
    "Play",
    "Death"
  ]
})
CardLibrary.set('4111', {
  "prism": "int",
  "element": "mind",
  "traits": [],
  "type": "unit",
  "cost": 7,
  "health": 7,
  "power": 5,
  "artSlug": "unit-calle-34",
  "attachment": "4037",
  "set": "Clash of Inventors",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-mind-01",
  "relatedCards": [],
  "textVocab": [
    "trigger-inspire-1c"
  ],
  "effectTypes": [
    "Inspire"
  ]
})
CardLibrary.set('4112', {
  "prism": "int",
  "element": "air",
  "traits": [],
  "type": "spell",
  "cost": 1,
  "artSlug": "spell-case-186",
  "set": "Clash of Inventors",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-air-03",
  "relatedCards": [],
  "textVocab": [
    "dust",
    "conjure"
  ],
  "effectTypes": []
})
CardLibrary.set('4113', {
  "prism": "int",
  "element": "metal",
  "traits": [],
  "type": "spell",
  "cost": 3,
  "artSlug": "spell-case-230",
  "set": "Clash of Inventors",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-metal-01",
  "relatedCards": [
    "20058"
  ],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('4114', {
  "prism": "int",
  "element": "mind",
  "traits": [],
  "type": "spell",
  "cost": 5,
  "artSlug": "spell-case-143",
  "set": "Clash of Inventors",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-mind-02",
  "relatedCards": [],
  "textVocab": [
    "dash"
  ],
  "effectTypes": []
})
CardLibrary.set('4115', {
  "prism": "int",
  "element": "mind",
  "traits": [],
  "type": "spell",
  "cost": 8,
  "artSlug": "spell-case-210",
  "set": "Clash of Inventors",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-mind-03",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('4116', {
  "prism": "int",
  "element": "metal",
  "traits": [
    "guard"
  ],
  "type": "unit",
  "cost": 11,
  "health": 7,
  "power": 7,
  "artSlug": "unit-edsoa-71",
  "set": "Clash of Inventors",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-metal-03",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('4117', {
  "prism": "wis",
  "element": "dark",
  "traits": [
    "guard",
    "dash"
  ],
  "type": "unit",
  "cost": 6,
  "health": 6,
  "power": 2,
  "artSlug": "unit-edsoa-25",
  "set": "Clash of Inventors",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-dark-03",
  "relatedCards": [],
  "textVocab": [
    "trigger-play"
  ],
  "effectTypes": [
    "Play"
  ]
})
CardLibrary.set('4118', {
  "prism": "int",
  "element": "metal",
  "traits": [],
  "type": "spell",
  "cost": 6,
  "artSlug": "spell-case-255",
  "set": "Clash of Inventors",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-metal-03",
  "relatedCards": [
    "20058"
  ],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('4119', {
  "prism": "int",
  "element": "earth",
  "traits": [],
  "type": "spell",
  "cost": 10,
  "artSlug": "spell-case-220",
  "set": "Clash of Inventors",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-earth-01",
  "relatedCards": [],
  "textVocab": [
    "draw"
  ],
  "effectTypes": []
})
CardLibrary.set('4120', {
  "prism": "int",
  "element": "mind",
  "traits": [],
  "type": "unit",
  "cost": 9,
  "health": 9,
  "power": 4,
  "artSlug": "unit-edsoa-94",
  "attachment": "20053",
  "set": "Hexbound Invasion",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-mind-03",
  "relatedCards": [],
  "textVocab": [
    "trigger-sunset"
  ],
  "effectTypes": [
    "Sunset"
  ]
})
CardLibrary.set('4121', {
  "prism": "int",
  "element": "water",
  "traits": [],
  "type": "unit",
  "cost": 10,
  "health": 5,
  "power": 5,
  "artSlug": "unit-edsoa-111",
  "attachment": "20042",
  "set": "Hexbound Invasion",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-water-04",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('4122', {
  "prism": "int",
  "element": "water",
  "traits": [
    "dash",
    "wither"
  ],
  "type": "unit",
  "cost": 4,
  "health": 6,
  "power": 2,
  "artSlug": "unit-edsoa-97",
  "attachment": "20062",
  "set": "Hexbound Invasion",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-water-04",
  "relatedCards": [],
  "textVocab": [
    "trigger-slay-unit"
  ],
  "effectTypes": [
    "Slay"
  ]
})
CardLibrary.set('4123', {
  "prism": "int",
  "element": "water",
  "traits": [
    "dash"
  ],
  "type": "unit",
  "cost": 8,
  "health": 8,
  "power": 3,
  "artSlug": "unit-brau-01",
  "attachment": "3069",
  "set": "Hexbound Invasion",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-water-02",
  "relatedCards": [],
  "textVocab": [
    "trigger-slay-unit"
  ],
  "effectTypes": [
    "Slay"
  ]
})
CardLibrary.set('4124', {
  "prism": "int",
  "element": "mind",
  "traits": [],
  "type": "unit",
  "cost": 4,
  "health": 8,
  "power": 2,
  "artSlug": "unit-calle-51",
  "attachment": "20054",
  "set": "Hexbound Invasion",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-mind-03",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": [
    "Continuous"
  ]
})
CardLibrary.set('4125', {
  "prism": "int",
  "element": "dark",
  "traits": [
    "stealth"
  ],
  "type": "unit",
  "cost": 2,
  "health": 3,
  "power": 2,
  "artSlug": "unit-edsoa-100",
  "attachment": "20028",
  "set": "Hexbound Invasion",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-dark-02",
  "relatedCards": [],
  "textVocab": [
    "trigger-play"
  ],
  "effectTypes": [
    "Play"
  ]
})
CardLibrary.set('4126', {
  "prism": "int",
  "element": "light",
  "traits": [],
  "type": "spell",
  "cost": 10,
  "artSlug": "spell-case-206",
  "set": "Hexbound Invasion",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-light-02",
  "relatedCards": [],
  "textVocab": [
    "dust"
  ],
  "effectTypes": []
})
CardLibrary.set('4127', {
  "prism": "int",
  "element": "mind",
  "traits": [],
  "type": "spell",
  "cost": 8,
  "artSlug": "spell-case-240",
  "set": "Hexbound Invasion",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-mind-03",
  "relatedCards": [
    "20063"
  ],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('4128', {
  "prism": "int",
  "element": "water",
  "traits": [],
  "type": "spell",
  "cost": 8,
  "artSlug": "spell-case-213",
  "set": "Hexbound Invasion",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-water-01",
  "relatedCards": [],
  "textVocab": [
    "draw"
  ],
  "effectTypes": []
})
CardLibrary.set('4129', {
  "prism": "int",
  "element": "mind",
  "traits": [],
  "type": "spell",
  "cost": 8,
  "artSlug": "spell-case-280",
  "set": "Hexbound Invasion",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-mind-02",
  "relatedCards": [],
  "textVocab": [
    "draw"
  ],
  "effectTypes": []
})
CardLibrary.set('4130', {
  "prism": "int",
  "element": "mind",
  "traits": [
    "dash"
  ],
  "type": "unit",
  "cost": 5,
  "health": 6,
  "power": 3,
  "artSlug": "unit-lobo-55",
  "set": "Hexbound Invasion",
  "releaseSeason": 18,
  "backgroundArtSlug": "bg-mind-02",
  "relatedCards": [],
  "textVocab": [
    "trigger-slay-unit"
  ],
  "effectTypes": [
    "Slay"
  ]
})
CardLibrary.set('4131', {
  "prism": "int",
  "element": "mind",
  "traits": [],
  "type": "spell",
  "cost": 3,
  "artSlug": "spell-case-193",
  "set": "Hexbound Invasion",
  "releaseSeason": 19,
  "backgroundArtSlug": "bg-mind-01",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('4132', {
  "prism": "int",
  "element": "water",
  "traits": [],
  "type": "unit",
  "cost": 2,
  "health": 5,
  "power": 2,
  "artSlug": "unit-calle-33",
  "set": "Hexbound Invasion",
  "releaseSeason": 20,
  "backgroundArtSlug": "bg-water-04",
  "relatedCards": [],
  "textVocab": [
    "dust",
    "trigger-play",
    "dash"
  ],
  "effectTypes": [
    "Play"
  ]
})
CardLibrary.set('4133', {
  "prism": "int",
  "element": "mind",
  "traits": [],
  "type": "unit",
  "cost": 2,
  "health": 2,
  "power": 2,
  "artSlug": "unit-leoni-04",
  "set": "Starter Expansion",
  "releaseSeason": 21,
  "backgroundArtSlug": "bg-mind-02",
  "relatedCards": [
    "20063"
  ],
  "textVocab": [
    "trigger-sunset"
  ],
  "effectTypes": [
    "Sunset"
  ]
})
CardLibrary.set('4134', {
  "prism": "int",
  "element": "water",
  "traits": [],
  "type": "unit",
  "cost": 3,
  "health": 5,
  "power": 1,
  "artSlug": "unit-edsoa-121",
  "attachment": "4157",
  "set": "Starter Expansion",
  "releaseSeason": 22,
  "backgroundArtSlug": "bg-water-02",
  "relatedCards": [
    "4157"
  ],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('4135', {
  "prism": "int",
  "element": "water",
  "traits": [],
  "type": "spell",
  "cost": 7,
  "artSlug": "spell-mara-08",
  "set": "Starter Expansion",
  "releaseSeason": 22,
  "backgroundArtSlug": "bg-water-02",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('4136', {
  "prism": "int",
  "element": "mind",
  "traits": [],
  "type": "unit",
  "cost": 2,
  "health": 2,
  "power": 1,
  "artSlug": "unit-xavi-75",
  "set": "Starter Expansion",
  "releaseSeason": 22,
  "backgroundArtSlug": "bg-mind-01",
  "relatedCards": [],
  "textVocab": [
    "trigger-play"
  ],
  "effectTypes": [
    "Play"
  ]
})
CardLibrary.set('4137', {
  "prism": "int",
  "element": "mind",
  "traits": [
    "stealth"
  ],
  "type": "unit",
  "cost": 1,
  "health": 2,
  "power": 1,
  "artSlug": "unit-mara-13",
  "attachment": "4154",
  "set": "Starter Expansion",
  "releaseSeason": 22,
  "backgroundArtSlug": "bg-mind-02",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('4138', {
  "prism": "int",
  "element": "mind",
  "traits": [],
  "type": "unit",
  "cost": 2,
  "health": 3,
  "power": 2,
  "artSlug": "unit-xavi-36",
  "set": "Starter Expansion",
  "releaseSeason": 22,
  "backgroundArtSlug": "bg-mind-01",
  "relatedCards": [],
  "textVocab": [
    "trigger-death",
    "draw"
  ],
  "effectTypes": [
    "Death"
  ]
})
CardLibrary.set('4139', {
  "prism": "int",
  "element": "mind",
  "traits": [
    "guard"
  ],
  "type": "unit",
  "cost": 4,
  "health": 6,
  "power": 2,
  "artSlug": "unit-mara-16",
  "set": "Starter Expansion",
  "releaseSeason": 22,
  "backgroundArtSlug": "bg-mind-02",
  "relatedCards": [
    "20017"
  ],
  "textVocab": [
    "trigger-play"
  ],
  "effectTypes": [
    "Play"
  ]
})
CardLibrary.set('4140', {
  "prism": "int",
  "element": "mind",
  "traits": [
    "guard"
  ],
  "type": "unit",
  "cost": 5,
  "health": 4,
  "power": 3,
  "artSlug": "unit-mara-14",
  "set": "Starter Expansion",
  "releaseSeason": 22,
  "backgroundArtSlug": "bg-mind-02",
  "relatedCards": [],
  "textVocab": [
    "trigger-sunset"
  ],
  "effectTypes": [
    "Sunset"
  ]
})
CardLibrary.set('4141', {
  "prism": "int",
  "element": "mind",
  "traits": [],
  "type": "unit",
  "cost": 6,
  "health": 5,
  "power": 4,
  "artSlug": "unit-mara-15",
  "attachment": "4155",
  "set": "Starter Expansion",
  "releaseSeason": 22,
  "backgroundArtSlug": "bg-mind-01",
  "relatedCards": [],
  "textVocab": [
    "trigger-inspire-spell"
  ],
  "effectTypes": [
    "Inspire"
  ]
})
CardLibrary.set('4142', {
  "prism": "int",
  "element": "mind",
  "traits": [],
  "type": "unit",
  "cost": 10,
  "health": 10,
  "power": 10,
  "artSlug": "unit-cho-08",
  "set": "Starter Expansion",
  "releaseSeason": 22,
  "backgroundArtSlug": "bg-mind-02",
  "relatedCards": [
    "4157"
  ],
  "textVocab": [
    "trigger-play"
  ],
  "effectTypes": [
    "Play"
  ]
})
CardLibrary.set('4143', {
  "prism": "int",
  "element": "water",
  "traits": [
    "guard"
  ],
  "type": "unit",
  "cost": 8,
  "health": 10,
  "power": 6,
  "artSlug": "unit-mara-09",
  "set": "Starter Expansion",
  "releaseSeason": 22,
  "backgroundArtSlug": "bg-water-04",
  "relatedCards": [],
  "textVocab": [
    "trigger-play"
  ],
  "effectTypes": [
    "Play"
  ]
})
CardLibrary.set('4144', {
  "prism": "int",
  "element": "water",
  "traits": [
    "guard"
  ],
  "type": "unit",
  "cost": 2,
  "health": 5,
  "power": 1,
  "artSlug": "unit-xavi-20",
  "set": "Starter Expansion",
  "releaseSeason": 22,
  "backgroundArtSlug": "bg-water-03",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('4145', {
  "prism": "int",
  "element": "water",
  "traits": [
    "stealth"
  ],
  "type": "unit",
  "cost": 1,
  "health": 1,
  "power": 2,
  "artSlug": "unit-lobo-69",
  "set": "Starter Expansion",
  "releaseSeason": 22,
  "backgroundArtSlug": "bg-water-02",
  "relatedCards": [],
  "textVocab": [
    "trigger-play"
  ],
  "effectTypes": [
    "Play"
  ]
})
CardLibrary.set('4146', {
  "prism": "int",
  "element": "water",
  "traits": [],
  "type": "unit",
  "cost": 2,
  "health": 3,
  "power": 2,
  "artSlug": "unit-calle-90",
  "attachment": "4158",
  "set": "Starter Expansion",
  "releaseSeason": 22,
  "backgroundArtSlug": "bg-water-03",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('4147', {
  "prism": "int",
  "element": "water",
  "traits": [],
  "type": "unit",
  "cost": 3,
  "health": 4,
  "power": 2,
  "artSlug": "unit-mara-10",
  "attachment": "4157",
  "set": "Starter Expansion",
  "releaseSeason": 22,
  "backgroundArtSlug": "bg-water-03",
  "relatedCards": [],
  "textVocab": [
    "trigger-inspire-spell"
  ],
  "effectTypes": [
    "Inspire"
  ]
})
CardLibrary.set('4148', {
  "prism": "int",
  "element": "water",
  "traits": [],
  "type": "unit",
  "cost": 3,
  "health": 4,
  "power": 2,
  "artSlug": "unit-calle-91",
  "set": "Starter Expansion",
  "releaseSeason": 22,
  "backgroundArtSlug": "bg-water-03",
  "relatedCards": [],
  "textVocab": [
    "trigger-sunset"
  ],
  "effectTypes": [
    "Sunset"
  ]
})
CardLibrary.set('4149', {
  "prism": "int",
  "element": "water",
  "traits": [],
  "type": "unit",
  "cost": 3,
  "health": 2,
  "power": 4,
  "artSlug": "unit-mara-12",
  "attachment": "4157",
  "set": "Starter Expansion",
  "releaseSeason": 22,
  "backgroundArtSlug": "bg-water-04",
  "relatedCards": [],
  "textVocab": [
    "trigger-inspire-spell"
  ],
  "effectTypes": [
    "Inspire"
  ]
})
CardLibrary.set('4150', {
  "prism": "int",
  "element": "water",
  "traits": [],
  "type": "unit",
  "cost": 4,
  "health": 5,
  "power": 3,
  "artSlug": "unit-lobo-60",
  "set": "Starter Expansion",
  "releaseSeason": 22,
  "backgroundArtSlug": "bg-water-03",
  "relatedCards": [
    "4157"
  ],
  "textVocab": [
    "trigger-sunset"
  ],
  "effectTypes": [
    "Sunset"
  ]
})
CardLibrary.set('4151', {
  "prism": "int",
  "element": "water",
  "traits": [
    "guard"
  ],
  "type": "unit",
  "cost": 5,
  "health": 5,
  "power": 5,
  "artSlug": "unit-calle-89",
  "set": "Starter Expansion",
  "releaseSeason": 22,
  "backgroundArtSlug": "bg-water-03",
  "relatedCards": [],
  "textVocab": [
    "trigger-sunset"
  ],
  "effectTypes": [
    "Sunset"
  ]
})
CardLibrary.set('4152', {
  "prism": "int",
  "element": "water",
  "traits": [],
  "type": "unit",
  "cost": 6,
  "health": 4,
  "power": 4,
  "artSlug": "unit-mara-03",
  "attachment": "4157",
  "set": "Starter Expansion",
  "releaseSeason": 22,
  "backgroundArtSlug": "bg-water-04",
  "relatedCards": [],
  "textVocab": [
    "trigger-inspire-spell"
  ],
  "effectTypes": [
    "Inspire"
  ]
})
CardLibrary.set('4153', {
  "prism": "int",
  "element": "water",
  "traits": [],
  "type": "unit",
  "cost": 7,
  "health": 7,
  "power": 4,
  "artSlug": "unit-mara-11",
  "set": "Starter Expansion",
  "releaseSeason": 22,
  "backgroundArtSlug": "bg-water-03",
  "relatedCards": [
    "4144"
  ],
  "textVocab": [
    "trigger-inspire-spell"
  ],
  "effectTypes": [
    "Inspire"
  ]
})
CardLibrary.set('4154', {
  "prism": "int",
  "element": "mind",
  "traits": [],
  "type": "spell",
  "cost": 1,
  "artSlug": "spell-case-226",
  "set": "Starter Expansion",
  "releaseSeason": 22,
  "backgroundArtSlug": "bg-mind-03",
  "relatedCards": [],
  "textVocab": [
    "draw"
  ],
  "effectTypes": []
})
CardLibrary.set('4155', {
  "prism": "int",
  "element": "mind",
  "traits": [],
  "type": "spell",
  "cost": 3,
  "artSlug": "spell-xavi-99",
  "set": "Starter Expansion",
  "releaseSeason": 22,
  "backgroundArtSlug": "bg-mind-01",
  "relatedCards": [],
  "textVocab": [
    "draw"
  ],
  "effectTypes": []
})
CardLibrary.set('4156', {
  "prism": "int",
  "element": "water",
  "traits": [],
  "type": "spell",
  "cost": 2,
  "artSlug": "spell-case-239",
  "spellBehaviour": "offensive",
  "set": "Starter Expansion",
  "releaseSeason": 22,
  "backgroundArtSlug": "bg-water-02",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('4157', {
  "prism": "int",
  "element": "water",
  "traits": [],
  "type": "spell",
  "cost": 0,
  "artSlug": "spell-case-200",
  "set": "Starter Expansion",
  "releaseSeason": 22,
  "backgroundArtSlug": "bg-water-03",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('4158', {
  "prism": "int",
  "element": "water",
  "traits": [],
  "type": "spell",
  "cost": 1,
  "artSlug": "spell-mara-09",
  "spellBehaviour": "offensive",
  "set": "Starter Expansion",
  "releaseSeason": 22,
  "backgroundArtSlug": "bg-water-01",
  "relatedCards": [
    "4157"
  ],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('4159', {
  "prism": "int",
  "element": "water",
  "traits": [],
  "type": "spell",
  "cost": 2,
  "artSlug": "spell-mara-07",
  "spellBehaviour": "offensive",
  "set": "Starter Expansion",
  "releaseSeason": 22,
  "backgroundArtSlug": "bg-water-02",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('4160', {
  "prism": "int",
  "element": "water",
  "traits": [],
  "type": "spell",
  "cost": 2,
  "artSlug": "spell-mara-04",
  "set": "Starter Expansion",
  "releaseSeason": 22,
  "backgroundArtSlug": "bg-water-03",
  "relatedCards": [
    "4157"
  ],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('4161', {
  "prism": "int",
  "element": "water",
  "traits": [],
  "type": "spell",
  "cost": 5,
  "artSlug": "spell-case-64",
  "set": "Starter Expansion",
  "releaseSeason": 22,
  "backgroundArtSlug": "bg-water-01",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('4162', {
  "prism": "int",
  "element": "mind",
  "traits": [],
  "type": "spell",
  "cost": 5,
  "artSlug": "spell-xavi-97",
  "set": "Starter Expansion",
  "releaseSeason": 22,
  "backgroundArtSlug": "bg-mind-02",
  "relatedCards": [],
  "textVocab": [
    "draw"
  ],
  "effectTypes": []
})
CardLibrary.set('4163', {
  "prism": "int",
  "element": "mind",
  "traits": [],
  "type": "unit",
  "cost": 1,
  "health": 3,
  "power": 1,
  "artSlug": "unit-jhona-01",
  "set": "Starter Expansion",
  "releaseSeason": 24,
  "backgroundArtSlug": "bg-mind-01",
  "relatedCards": [
    "20019"
  ],
  "textVocab": [],
  "effectTypes": [
    "Continuous"
  ]
})
CardLibrary.set('4164', {
  "prism": "hrt",
  "element": "dark",
  "traits": [],
  "type": "unit",
  "cost": 3,
  "health": 2,
  "power": 0,
  "artSlug": "unit-lobo-62",
  "set": "Starter Expansion",
  "releaseSeason": 25,
  "backgroundArtSlug": "bg-dark-03",
  "relatedCards": [],
  "textVocab": [
    "trigger-death",
    "draw"
  ],
  "effectTypes": [
    "Death"
  ]
})
CardLibrary.set('20000', {
  "prism": "tok",
  "element": "air",
  "traits": [
    "stealth",
    "banner"
  ],
  "type": "unit",
  "cost": 0,
  "health": 1,
  "power": 0,
  "artSlug": "unit-cunha-01",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-air-01",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('20001', {
  "prism": "tok",
  "element": "metal",
  "traits": [
    "guard"
  ],
  "type": "unit",
  "cost": 1,
  "health": 2,
  "power": 2,
  "artSlug": "unit-lobo-47",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-metal-03",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('20002', {
  "prism": "tok",
  "element": "dark",
  "traits": [],
  "type": "spell",
  "cost": 0,
  "artSlug": "spell-shapo-18",
  "spellBehaviour": "defensive",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-dark-02",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('20003', {
  "prism": "tok",
  "element": "earth",
  "traits": [
    "guard"
  ],
  "type": "unit",
  "cost": 0,
  "health": 1,
  "power": 0,
  "artSlug": "unit-edsoa-104",
  "attachment": "20010",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-earth-02",
  "relatedCards": [],
  "textVocab": [
    "trigger-death",
    "draw"
  ],
  "effectTypes": [
    "Death"
  ]
})
CardLibrary.set('20004', {
  "prism": "tok",
  "element": "fire",
  "traits": [],
  "type": "spell",
  "cost": 1,
  "artSlug": "spell-shapo-15",
  "spellBehaviour": "offensive",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-fire-01",
  "relatedCards": [],
  "textVocab": [
    "dust"
  ],
  "effectTypes": []
})
CardLibrary.set('20005', {
  "prism": "tok",
  "element": "mind",
  "traits": [
    "banner"
  ],
  "type": "spell",
  "cost": 1,
  "artSlug": "spell-panou-08",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-mind-02",
  "relatedCards": [],
  "textVocab": [
    "mulligan"
  ],
  "effectTypes": []
})
CardLibrary.set('20006', {
  "prism": "tok",
  "element": "earth",
  "traits": [],
  "type": "unit",
  "cost": 1,
  "health": 1,
  "power": 3,
  "artSlug": "unit-tonel-18",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-earth-01",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('20007', {
  "prism": "tok",
  "element": "light",
  "traits": [
    "lifesteal",
    "wither"
  ],
  "type": "spell",
  "cost": 1,
  "artSlug": "spell-xavi-23",
  "spellBehaviour": "offensive",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-light-01",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('20008', {
  "prism": "tok",
  "element": "mind",
  "traits": [],
  "type": "spell",
  "cost": 3,
  "artSlug": "spell-case-22",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-mind-02",
  "relatedCards": [],
  "textVocab": [
    "draw"
  ],
  "effectTypes": []
})
CardLibrary.set('20009', {
  "prism": "tok",
  "element": "water",
  "traits": [],
  "type": "enchant",
  "cost": 4,
  "artSlug": "spell-case-217",
  "spellBehaviour": "negative",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-water-03",
  "relatedCards": [],
  "textVocab": [
    "enchanted"
  ],
  "effectTypes": [
    "Continuous"
  ]
})
CardLibrary.set('20010', {
  "prism": "tok",
  "element": "earth",
  "traits": [],
  "type": "enchant",
  "cost": 3,
  "artSlug": "spell-edsoa-03",
  "spellBehaviour": "negative",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-earth-01",
  "relatedCards": [],
  "textVocab": [
    "enchanted"
  ],
  "effectTypes": [
    "Continuous"
  ]
})
CardLibrary.set('20011', {
  "prism": "tok",
  "element": "fire",
  "traits": [],
  "type": "spell",
  "cost": 3,
  "artSlug": "spell-case-28",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-fire-02",
  "relatedCards": [],
  "textVocab": [
    "stealth"
  ],
  "effectTypes": []
})
CardLibrary.set('20012', {
  "prism": "tok",
  "element": "fire",
  "traits": [],
  "type": "spell",
  "cost": 2,
  "artSlug": "spell-panou-05",
  "spellBehaviour": "defensive",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-fire-03",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('20013', {
  "prism": "tok",
  "element": "dark",
  "traits": [
    "wither"
  ],
  "type": "unit",
  "cost": 0,
  "health": 2,
  "power": 1,
  "artSlug": "unit-rubio-17",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-dark-01",
  "relatedCards": [],
  "textVocab": [
    "trigger-death"
  ],
  "effectTypes": [
    "Death"
  ]
})
CardLibrary.set('20014', {
  "prism": "tok",
  "element": "metal",
  "traits": [],
  "type": "spell",
  "cost": 0,
  "artSlug": "spell-case-43",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-metal-02",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('20015', {
  "prism": "tok",
  "element": "water",
  "traits": [],
  "type": "spell",
  "cost": 3,
  "artSlug": "spell-xavi-61",
  "spellBehaviour": "offensive",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-water-03",
  "relatedCards": [
    "20017"
  ],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('20017', {
  "prism": "tok",
  "element": "water",
  "traits": [],
  "type": "spell",
  "cost": 0,
  "artSlug": "spell-case-34",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-water-02",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('20018', {
  "prism": "tok",
  "element": "fire",
  "traits": [],
  "type": "spell",
  "cost": 8,
  "artSlug": "spell-erlan-01",
  "spellBehaviour": "offensive",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-fire-03",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('20019', {
  "prism": "tok",
  "element": "light",
  "traits": [],
  "type": "enchant",
  "cost": "no",
  "artSlug": "spell-case-18",
  "spellBehaviour": "positive",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-light-01",
  "relatedCards": [],
  "textVocab": [
    "dust",
    "enchanted"
  ],
  "effectTypes": [
    "Generic"
  ]
})
CardLibrary.set('20020', {
  "prism": "tok",
  "element": "dark",
  "traits": [
    "banner"
  ],
  "type": "spell",
  "cost": 2,
  "artSlug": "spell-case-42",
  "spellBehaviour": "defensive",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-dark-02",
  "relatedCards": [],
  "textVocab": [
    "draw"
  ],
  "effectTypes": []
})
CardLibrary.set('20021', {
  "prism": "tok",
  "element": "water",
  "traits": [],
  "type": "spell",
  "cost": 2,
  "artSlug": "spell-xavi-58",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-water-03",
  "relatedCards": [
    "20009"
  ],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('20022', {
  "prism": "tok",
  "element": "light",
  "traits": [
    "lifesteal"
  ],
  "type": "spell",
  "cost": 0,
  "artSlug": "spell-xavi-19",
  "spellBehaviour": "offensive",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-light-01",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('20023', {
  "prism": "tok",
  "element": "fire",
  "traits": [],
  "type": "enchant",
  "cost": 2,
  "artSlug": "spell-edsoa-01",
  "spellBehaviour": "negative",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-fire-02",
  "relatedCards": [],
  "textVocab": [
    "enchanted",
    "trigger-sunrise"
  ],
  "effectTypes": [
    "Sunrise"
  ]
})
CardLibrary.set('20024', {
  "prism": "tok",
  "element": "mind",
  "traits": [],
  "type": "spell",
  "cost": 4,
  "artSlug": "spell-case-26",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-mind-03",
  "relatedCards": [],
  "textVocab": [
    "dust",
    "draw"
  ],
  "effectTypes": []
})
CardLibrary.set('20025', {
  "prism": "tok",
  "element": "earth",
  "traits": [
    "guard"
  ],
  "type": "unit",
  "cost": 1,
  "health": 3,
  "power": 3,
  "artSlug": "unit-panou-31",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-earth-02",
  "relatedCards": [
    "20048"
  ],
  "textVocab": [
    "trigger-sunrise"
  ],
  "effectTypes": [
    "Sunrise"
  ]
})
CardLibrary.set('20026', {
  "prism": "tok",
  "element": "fire",
  "traits": [
    "banner",
    "wither"
  ],
  "type": "unit",
  "cost": 1,
  "health": 2,
  "power": 1,
  "artSlug": "unit-panou-38",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-fire-01",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('20027', {
  "prism": "tok",
  "element": "metal",
  "traits": [],
  "type": "enchant",
  "cost": "no",
  "artSlug": "spell-case-53",
  "spellBehaviour": "negative",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-metal-03",
  "relatedCards": [],
  "textVocab": [
    "enchanted",
    "trait"
  ],
  "effectTypes": [
    "Continuous"
  ]
})
CardLibrary.set('20028', {
  "prism": "tok",
  "element": "dark",
  "traits": [],
  "type": "enchant",
  "cost": 6,
  "artSlug": "spell-rubio-21",
  "spellBehaviour": "negative",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-dark-01",
  "relatedCards": [],
  "textVocab": [
    "dust",
    "trigger-sunset",
    "enchanted"
  ],
  "effectTypes": [
    "Sunset"
  ]
})
CardLibrary.set('20029', {
  "prism": "tok",
  "element": "metal",
  "traits": [
    "wither"
  ],
  "type": "spell",
  "cost": 1,
  "artSlug": "spell-hans-06",
  "spellBehaviour": "defensive",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-metal-02",
  "relatedCards": [],
  "textVocab": [
    "draw"
  ],
  "effectTypes": []
})
CardLibrary.set('20030', {
  "prism": "tok",
  "element": "mind",
  "traits": [],
  "type": "spell",
  "cost": 3,
  "artSlug": "spell-case-227",
  "spellBehaviour": "defensive",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-mind-03",
  "relatedCards": [],
  "textVocab": [
    "ready",
    "sleep",
    "draw"
  ],
  "effectTypes": []
})
CardLibrary.set('20031', {
  "prism": "tok",
  "element": "light",
  "traits": [],
  "type": "spell",
  "cost": 1,
  "artSlug": "spell-panou-06",
  "spellBehaviour": "offensive",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-light-01",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('20032', {
  "prism": "tok",
  "element": "mind",
  "traits": [],
  "type": "enchant",
  "cost": "no",
  "artSlug": "spell-edsoa-02",
  "spellBehaviour": "negative",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-mind-02",
  "relatedCards": [],
  "textVocab": [
    "dust",
    "sleep",
    "enchanted",
    "trigger-sunrise"
  ],
  "effectTypes": [
    "Sunrise"
  ]
})
CardLibrary.set('20033', {
  "prism": "tok",
  "element": "earth",
  "traits": [],
  "type": "spell",
  "cost": 1,
  "artSlug": "spell-xavi-67",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-earth-03",
  "relatedCards": [
    "20010"
  ],
  "textVocab": [
    "sleep"
  ],
  "effectTypes": []
})
CardLibrary.set('20034', {
  "prism": "tok",
  "element": "metal",
  "traits": [],
  "type": "spell",
  "cost": 1,
  "artSlug": "spell-rubio-24",
  "spellBehaviour": "defensive",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-metal-01",
  "relatedCards": [],
  "textVocab": [
    "guard"
  ],
  "effectTypes": []
})
CardLibrary.set('20035', {
  "prism": "tok",
  "element": "dark",
  "traits": [],
  "type": "spell",
  "cost": 3,
  "artSlug": "spell-case-61",
  "spellBehaviour": "offensive",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-dark-02",
  "relatedCards": [],
  "textVocab": [
    "dust"
  ],
  "effectTypes": []
})
CardLibrary.set('20036', {
  "prism": "tok",
  "element": "water",
  "traits": [
    "guard",
    "armor"
  ],
  "type": "unit",
  "cost": 2,
  "health": 3,
  "power": 1,
  "artSlug": "unit-xavi-20",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-water-03",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('20037', {
  "prism": "tok",
  "element": "air",
  "traits": [],
  "type": "spell",
  "cost": 4,
  "artSlug": "spell-case-183",
  "spellBehaviour": "offensive",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-air-01",
  "relatedCards": [
    "20042"
  ],
  "textVocab": [
    "draw"
  ],
  "effectTypes": []
})
CardLibrary.set('20038', {
  "prism": "tok",
  "element": "water",
  "traits": [],
  "type": "spell",
  "cost": 0,
  "artSlug": "spell-case-82",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-water-02",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('20039', {
  "prism": "tok",
  "element": "earth",
  "traits": [],
  "type": "enchant",
  "cost": 3,
  "artSlug": "spell-case-125",
  "spellBehaviour": "positive",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-earth-03",
  "relatedCards": [],
  "textVocab": [
    "enchanted"
  ],
  "effectTypes": [
    "Generic"
  ]
})
CardLibrary.set('20040', {
  "prism": "tok",
  "element": "mind",
  "traits": [],
  "type": "spell",
  "cost": 11,
  "artSlug": "spell-case-27",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-mind-01",
  "relatedCards": [],
  "textVocab": [
    "dust"
  ],
  "effectTypes": []
})
CardLibrary.set('20041', {
  "prism": "tok",
  "element": "mind",
  "traits": [],
  "type": "spell",
  "cost": 1,
  "artSlug": "spell-xavi-37",
  "spellBehaviour": "defensive",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-mind-02",
  "relatedCards": [],
  "textVocab": [
    "draw"
  ],
  "effectTypes": []
})
CardLibrary.set('20042', {
  "prism": "tok",
  "element": "air",
  "traits": [],
  "type": "enchant",
  "cost": "no",
  "artSlug": "spell-xavi-68",
  "spellBehaviour": "positive",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-air-03",
  "relatedCards": [],
  "textVocab": [
    "dust",
    "enchanted",
    "trigger-sunrise"
  ],
  "effectTypes": [
    "Continuous",
    "Sunrise"
  ]
})
CardLibrary.set('20043', {
  "prism": "tok",
  "element": "metal",
  "traits": [],
  "type": "spell",
  "cost": 3,
  "artSlug": "spell-case-79",
  "spellBehaviour": "defensive",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-metal-01",
  "relatedCards": [],
  "textVocab": [
    "dust",
    "draw"
  ],
  "effectTypes": []
})
CardLibrary.set('20044', {
  "prism": "tok",
  "element": "mind",
  "traits": [],
  "type": "spell",
  "cost": 1,
  "artSlug": "spell-miche-01",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-mind-02",
  "relatedCards": [],
  "textVocab": [
    "draw"
  ],
  "effectTypes": []
})
CardLibrary.set('20045', {
  "prism": "tok",
  "element": "light",
  "traits": [],
  "type": "spell",
  "cost": 1,
  "artSlug": "spell-case-15",
  "spellBehaviour": "defensive",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-light-03",
  "relatedCards": [],
  "textVocab": [
    "dust",
    "draw"
  ],
  "effectTypes": []
})
CardLibrary.set('20046', {
  "prism": "tok",
  "element": "water",
  "traits": [],
  "type": "spell",
  "cost": "X",
  "artSlug": "spell-xavi-29",
  "spellBehaviour": "offensive",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-water-01",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('20047', {
  "prism": "tok",
  "element": "metal",
  "traits": [],
  "type": "enchant",
  "cost": "no",
  "artSlug": "spell-xavi-35",
  "spellBehaviour": "positive",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-metal-02",
  "relatedCards": [],
  "textVocab": [
    "enchanted"
  ],
  "effectTypes": [
    "Continuous"
  ]
})
CardLibrary.set('20048', {
  "prism": "tok",
  "element": "air",
  "traits": [],
  "type": "enchant",
  "cost": "no",
  "artSlug": "spell-case-136",
  "spellBehaviour": "negative",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-air-03",
  "relatedCards": [],
  "textVocab": [
    "enchanted",
    "trait"
  ],
  "effectTypes": [
    "Continuous"
  ]
})
CardLibrary.set('20049', {
  "prism": "tok",
  "element": "dark",
  "traits": [],
  "type": "enchant",
  "cost": "no",
  "artSlug": "spell-case-126",
  "spellBehaviour": "positive",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-dark-01",
  "relatedCards": [],
  "textVocab": [
    "trigger-death",
    "enchanted",
    "draw"
  ],
  "effectTypes": [
    "Death"
  ]
})
CardLibrary.set('20050', {
  "prism": "tok",
  "element": "light",
  "traits": [],
  "type": "enchant",
  "cost": 5,
  "artSlug": "spell-case-129",
  "spellBehaviour": "negative",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-light-02",
  "relatedCards": [],
  "textVocab": [
    "enchanted"
  ],
  "effectTypes": [
    "Continuous"
  ]
})
CardLibrary.set('20051', {
  "prism": "tok",
  "element": "fire",
  "traits": [],
  "type": "enchant",
  "cost": "no",
  "artSlug": "spell-case-216",
  "spellBehaviour": "positive",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-fire-03",
  "relatedCards": [],
  "textVocab": [
    "dust",
    "enchanted",
    "draw",
    "trigger-glory"
  ],
  "effectTypes": [
    "Glory"
  ]
})
CardLibrary.set('20052', {
  "prism": "tok",
  "element": "water",
  "traits": [],
  "type": "spell",
  "cost": 2,
  "artSlug": "spell-case-93",
  "spellBehaviour": "offensive",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-water-01",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('20053', {
  "prism": "tok",
  "element": "mind",
  "traits": [],
  "type": "enchant",
  "cost": "no",
  "artSlug": "spell-case-121",
  "spellBehaviour": "positive",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-mind-02",
  "relatedCards": [],
  "textVocab": [
    "dust",
    "enchanted"
  ],
  "effectTypes": [
    "Generic"
  ]
})
CardLibrary.set('20054', {
  "prism": "tok",
  "element": "water",
  "traits": [],
  "type": "enchant",
  "cost": 2,
  "artSlug": "spell-edsoa-04",
  "spellBehaviour": "positive",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-water-03",
  "relatedCards": [],
  "textVocab": [
    "enchanted",
    "draw"
  ],
  "effectTypes": [
    "Generic"
  ]
})
CardLibrary.set('20055', {
  "prism": "tok",
  "element": "metal",
  "traits": [],
  "type": "spell",
  "cost": 1,
  "artSlug": "spell-case-38",
  "spellBehaviour": "offensive",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-metal-01",
  "relatedCards": [
    "20027"
  ],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('20056', {
  "prism": "tok",
  "element": "light",
  "traits": [],
  "type": "spell",
  "cost": 2,
  "artSlug": "spell-ksen-05",
  "spellBehaviour": "defensive",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-light-02",
  "relatedCards": [
    "20019"
  ],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('20057', {
  "prism": "tok",
  "element": "air",
  "traits": [],
  "type": "spell",
  "cost": 1,
  "artSlug": "spell-case-07",
  "spellBehaviour": "offensive",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-air-03",
  "relatedCards": [
    "20048"
  ],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('20058', {
  "prism": "tok",
  "element": "metal",
  "traits": [
    "dash"
  ],
  "type": "unit",
  "cost": 1,
  "health": 1,
  "power": 1,
  "artSlug": "unit-calle-04",
  "set": "Clash of Inventors",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-metal-03",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('20059', {
  "prism": "tok",
  "element": "light",
  "traits": [
    "banner"
  ],
  "type": "spell",
  "cost": 1,
  "artSlug": "spell-case-159",
  "set": "Clash of Inventors",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-light-02",
  "relatedCards": [],
  "textVocab": [
    "lifesteal"
  ],
  "effectTypes": []
})
CardLibrary.set('20060', {
  "prism": "tok",
  "element": "fire",
  "traits": [],
  "type": "spell",
  "cost": 2,
  "artSlug": "spell-case-259",
  "spellBehaviour": "defensive",
  "set": "Clash of Inventors",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-fire-03",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('20062', {
  "prism": "tok",
  "element": "dark",
  "traits": [],
  "type": "spell",
  "cost": 1,
  "artSlug": "spell-patty-02",
  "spellBehaviour": "offensive",
  "set": "Hexbound Invasion",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-dark-02",
  "relatedCards": [
    "20028",
    "20013"
  ],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('20063', {
  "prism": "tok",
  "element": "mind",
  "traits": [],
  "type": "unit",
  "cost": 1,
  "health": 1,
  "power": 1,
  "artSlug": "unit-calle-24",
  "attachment": "20053",
  "set": "Hexbound Invasion",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-mind-03",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('20064', {
  "prism": "tok",
  "element": "dark",
  "traits": [],
  "type": "spell",
  "cost": 0,
  "artSlug": "spell-case-150",
  "set": "Hexbound Invasion",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-dark-01",
  "relatedCards": [],
  "textVocab": [
    "draw"
  ],
  "effectTypes": []
})
CardLibrary.set('20065', {
  "prism": "tok",
  "element": "dark",
  "traits": [
    "wither"
  ],
  "type": "unit",
  "cost": 0,
  "health": 2,
  "power": 1,
  "artSlug": "unit-rubio-33",
  "set": "Hexbound Invasion",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-dark-01",
  "relatedCards": [],
  "textVocab": [
    "trigger-death"
  ],
  "effectTypes": [
    "Death"
  ]
})
CardLibrary.set('20066', {
  "prism": "tok",
  "element": "metal",
  "traits": [
    "guard"
  ],
  "type": "unit",
  "cost": 1,
  "health": 2,
  "power": 2,
  "artSlug": "unit-lobo-81",
  "set": "Hexbound Invasion",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-metal-03",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('20067', {
  "prism": "tok",
  "element": "dark",
  "traits": [
    "wither"
  ],
  "type": "unit",
  "cost": 4,
  "health": 4,
  "power": 4,
  "artSlug": "unit-mara-06",
  "set": "Starter Expansion",
  "releaseSeason": 22,
  "backgroundArtSlug": "bg-dark-01",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('20068', {
  "prism": "tok",
  "element": "fire",
  "traits": [
    "dash"
  ],
  "type": "unit",
  "cost": 1,
  "health": 1,
  "power": 1,
  "artSlug": "unit-tonel-12",
  "set": "Starter Expansion",
  "releaseSeason": 24,
  "backgroundArtSlug": "bg-fire-03",
  "relatedCards": [],
  "textVocab": [
    "trigger-death"
  ],
  "effectTypes": [
    "Death"
  ]
})
CardLibrary.set('20069', {
  "prism": "tok",
  "element": "metal",
  "traits": [
    "guard",
    "dash"
  ],
  "type": "unit",
  "cost": 4,
  "health": 3,
  "power": 2,
  "artSlug": "unit-cho-11",
  "attachment": "20047",
  "set": "Starter Expansion",
  "releaseSeason": 26,
  "backgroundArtSlug": "bg-metal-01",
  "relatedCards": [
    "20070"
  ],
  "textVocab": [
    "trigger-death"
  ],
  "effectTypes": [
    "Death"
  ]
})
CardLibrary.set('20070', {
  "prism": "tok",
  "element": "metal",
  "traits": [
    "stealth",
    "dash"
  ],
  "type": "unit",
  "cost": 4,
  "health": 2,
  "power": 3,
  "artSlug": "unit-cho-12",
  "attachment": "20047",
  "set": "Starter Expansion",
  "releaseSeason": 24,
  "backgroundArtSlug": "bg-metal-01",
  "relatedCards": [
    "20069"
  ],
  "textVocab": [
    "trigger-death"
  ],
  "effectTypes": [
    "Death"
  ]
})
CardLibrary.set('25000', {
  "prism": "tok",
  "element": "sky",
  "traits": [],
  "type": "heroAbility",
  "cost": "no",
  "perTurn": 1,
  "artSlug": "spell-mara-14",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-air-02",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('25001', {
  "prism": "tok",
  "element": "sky",
  "traits": [],
  "type": "heroAbility",
  "cost": 0,
  "startCharges": 3,
  "maxCharges": 3,
  "perTurn": 1,
  "artSlug": "spell-mara-13",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-air-03",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('25002', {
  "prism": "tok",
  "element": "sky",
  "traits": [],
  "type": "heroAbility",
  "cost": 1,
  "startCharges": 3,
  "maxCharges": 3,
  "perTurn": 1,
  "artSlug": "spell-mara-12",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-air-01",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('25003', {
  "prism": "tok",
  "element": "sky",
  "traits": [],
  "type": "heroAbility",
  "cost": 1,
  "perTurn": 1,
  "artSlug": "spell-mara-15",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-air-02",
  "relatedCards": [
    "4157"
  ],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('25004', {
  "prism": "tok",
  "element": "sky",
  "traits": [],
  "type": "heroAbility",
  "cost": "no",
  "startCounters": 0,
  "maxCounters": 5,
  "artSlug": "spell-mara-10",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-air-03",
  "relatedCards": [],
  "textVocab": [
    "draw"
  ],
  "effectTypes": []
})
CardLibrary.set('25005', {
  "prism": "tok",
  "element": "dark",
  "traits": [],
  "type": "heroAbility",
  "cost": "no",
  "artSlug": "spell-case-266",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-dark-01",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('25006', {
  "prism": "tok",
  "element": "sky",
  "traits": [],
  "type": "heroAbility",
  "cost": "no",
  "artSlug": "spell-xavi-88",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-air-02",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('25007', {
  "prism": "tok",
  "element": "sky",
  "traits": [],
  "type": "heroAbility",
  "cost": "no",
  "artSlug": "spell-mara-33",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-air-03",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('25008', {
  "prism": "tok",
  "element": "sky",
  "traits": [],
  "type": "heroAbility",
  "cost": 1,
  "startCharges": 3,
  "maxCharges": 3,
  "perTurn": 1,
  "artSlug": "spell-mara-34",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-air-01",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('25009', {
  "prism": "tok",
  "element": "sky",
  "traits": [],
  "type": "heroAbility",
  "cost": 1,
  "startCharges": 3,
  "maxCharges": 3,
  "perTurn": 1,
  "artSlug": "spell-mara-32",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-air-02",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('25010', {
  "prism": "tok",
  "element": "sky",
  "traits": [],
  "type": "heroAbility",
  "cost": "no",
  "startCounters": 0,
  "maxCounters": 4,
  "artSlug": "spell-mara-35",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-air-03",
  "relatedCards": [
    "20058"
  ],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('25011', {
  "prism": "tok",
  "element": "sky",
  "traits": [],
  "type": "heroAbility",
  "cost": 0,
  "startCharges": 3,
  "maxCharges": 3,
  "perTurn": 1,
  "artSlug": "spell-mara-40",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-air-01",
  "relatedCards": [],
  "textVocab": [
    "wither",
    "dash"
  ],
  "effectTypes": []
})
CardLibrary.set('25012', {
  "prism": "tok",
  "element": "sky",
  "traits": [],
  "type": "heroAbility",
  "cost": 0,
  "startCharges": 3,
  "maxCharges": 3,
  "perTurn": 1,
  "artSlug": "spell-mara-36",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-air-02",
  "relatedCards": [],
  "textVocab": [
    "draw"
  ],
  "effectTypes": []
})
CardLibrary.set('25013', {
  "prism": "tok",
  "element": "sky",
  "traits": [],
  "type": "heroAbility",
  "cost": 1,
  "startCharges": 3,
  "maxCharges": 3,
  "perTurn": 1,
  "artSlug": "spell-mara-37",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-air-03",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('25014', {
  "prism": "tok",
  "element": "sky",
  "traits": [],
  "type": "heroAbility",
  "cost": 1,
  "perTurn": 1,
  "artSlug": "spell-mara-38",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-air-01",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('25015', {
  "prism": "tok",
  "element": "sky",
  "traits": [],
  "type": "heroAbility",
  "cost": 1,
  "perTurn": 1,
  "artSlug": "spell-mara-38",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-air-02",
  "relatedCards": [],
  "textVocab": [
    "trigger-sunset"
  ],
  "effectTypes": [
    "Sunset"
  ]
})
CardLibrary.set('25016', {
  "prism": "tok",
  "element": "sky",
  "traits": [],
  "type": "heroAbility",
  "cost": 1,
  "perTurn": 1,
  "artSlug": "spell-mara-38",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-air-03",
  "relatedCards": [],
  "textVocab": [
    "trigger-sunset"
  ],
  "effectTypes": [
    "Sunset"
  ]
})
CardLibrary.set('25017', {
  "prism": "tok",
  "element": "sky",
  "traits": [],
  "type": "heroAbility",
  "cost": 1,
  "perTurn": 1,
  "artSlug": "spell-mara-38",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-air-01",
  "relatedCards": [],
  "textVocab": [
    "trigger-sunset"
  ],
  "effectTypes": [
    "Sunset"
  ]
})
CardLibrary.set('25018', {
  "prism": "tok",
  "element": "sky",
  "traits": [],
  "type": "heroAbility",
  "cost": 1,
  "perTurn": 1,
  "artSlug": "spell-mara-38",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-air-02",
  "relatedCards": [],
  "textVocab": [
    "trigger-sunset",
    "mulligan"
  ],
  "effectTypes": [
    "Sunset"
  ]
})
CardLibrary.set('25019', {
  "prism": "tok",
  "element": "sky",
  "traits": [],
  "type": "heroAbility",
  "cost": 1,
  "perTurn": 1,
  "artSlug": "spell-mara-38",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-air-03",
  "relatedCards": [],
  "textVocab": [
    "trigger-sunset",
    "conjure"
  ],
  "effectTypes": [
    "Sunset"
  ]
})
CardLibrary.set('25020', {
  "prism": "tok",
  "element": "sky",
  "traits": [],
  "type": "heroAbility",
  "cost": 1,
  "perTurn": 1,
  "artSlug": "spell-mara-38",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-air-01",
  "relatedCards": [
    "20063"
  ],
  "textVocab": [
    "trigger-sunset"
  ],
  "effectTypes": [
    "Sunset"
  ]
})
CardLibrary.set('25021', {
  "prism": "tok",
  "element": "sky",
  "traits": [],
  "type": "heroAbility",
  "cost": 1,
  "perTurn": 1,
  "artSlug": "spell-mara-38",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-air-02",
  "relatedCards": [],
  "textVocab": [
    "trigger-sunset"
  ],
  "effectTypes": [
    "Sunset"
  ]
})
CardLibrary.set('25022', {
  "prism": "tok",
  "element": "sky",
  "traits": [],
  "type": "heroAbility",
  "cost": 1,
  "perTurn": 1,
  "artSlug": "spell-mara-38",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-air-03",
  "relatedCards": [],
  "textVocab": [
    "trigger-sunset"
  ],
  "effectTypes": [
    "Sunset"
  ]
})
CardLibrary.set('25023', {
  "prism": "tok",
  "element": "sky",
  "traits": [],
  "type": "heroAbility",
  "cost": 1,
  "startCharges": 3,
  "maxCharges": 3,
  "perTurn": 1,
  "artSlug": "spell-case-271",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-air-01",
  "relatedCards": [
    "25024",
    "25025"
  ],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('25024', {
  "prism": "tok",
  "element": "sky",
  "traits": [],
  "type": "heroAbility",
  "cost": "no",
  "artSlug": "spell-case-271",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-air-02",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('25025', {
  "prism": "tok",
  "element": "sky",
  "traits": [],
  "type": "heroAbility",
  "cost": "no",
  "artSlug": "spell-case-271",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-air-03",
  "relatedCards": [],
  "textVocab": [
    "draw"
  ],
  "effectTypes": []
})
CardLibrary.set('25026', {
  "prism": "tok",
  "element": "sky",
  "traits": [],
  "type": "heroAbility",
  "cost": 6,
  "startCharges": 3,
  "maxCharges": 3,
  "perTurn": 1,
  "artSlug": "spell-mara-39",
  "set": "Core Set",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-air-01",
  "relatedCards": [
    "20069",
    "20070"
  ],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('30000', {
  "prism": "tut",
  "element": "earth",
  "traits": [],
  "type": "unit",
  "cost": 1,
  "health": 3,
  "power": 2,
  "artSlug": "unit-lobo-31",
  "set": "Tutorial",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-earth-01",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('30001', {
  "prism": "tut",
  "element": "air",
  "traits": [],
  "type": "unit",
  "cost": 3,
  "health": 3,
  "power": 4,
  "artSlug": "unit-panou-29",
  "set": "Tutorial",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-air-03",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('30002', {
  "prism": "tut",
  "element": "metal",
  "traits": [],
  "type": "unit",
  "cost": 2,
  "health": 3,
  "power": 3,
  "artSlug": "unit-panou-48",
  "set": "Tutorial",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-metal-02",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('30003', {
  "prism": "tut",
  "element": "water",
  "traits": [],
  "type": "unit",
  "cost": 4,
  "health": 4,
  "power": 5,
  "artSlug": "unit-edsoa-23",
  "set": "Tutorial",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-water-02",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('30004', {
  "prism": "tut",
  "element": "dark",
  "traits": [],
  "type": "unit",
  "cost": 6,
  "health": 6,
  "power": 6,
  "artSlug": "unit-panou-64",
  "set": "Tutorial",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-dark-02",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('30005', {
  "prism": "tut",
  "element": "mind",
  "traits": [],
  "type": "unit",
  "cost": 1,
  "health": 2,
  "power": 2,
  "artSlug": "unit-delat-03",
  "set": "Tutorial",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-mind-02",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('30006', {
  "prism": "tut",
  "element": "dark",
  "traits": [],
  "type": "spell",
  "cost": 99,
  "artSlug": "spell-rubio-21",
  "set": "Tutorial",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-dark-01",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('30007', {
  "prism": "tut",
  "element": "fire",
  "traits": [],
  "type": "unit",
  "cost": 4,
  "health": 3,
  "power": 5,
  "artSlug": "unit-patty-01",
  "set": "Tutorial",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-fire-01",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('30008', {
  "prism": "tut",
  "element": "water",
  "traits": [
    "guard",
    "armor"
  ],
  "type": "unit",
  "cost": 2,
  "health": 3,
  "power": 1,
  "artSlug": "unit-xavi-20",
  "set": "Tutorial",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-water-03",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('30009', {
  "prism": "tut",
  "element": "dark",
  "traits": [
    "guard",
    "banner"
  ],
  "type": "unit",
  "cost": 6,
  "health": 6,
  "power": 6,
  "artSlug": "unit-panou-64",
  "set": "Tutorial",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-dark-02",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('30010', {
  "prism": "tut",
  "element": "dark",
  "traits": [
    "wither"
  ],
  "type": "unit",
  "cost": 8,
  "health": 8,
  "power": 8,
  "artSlug": "unit-giaco-07",
  "set": "Tutorial",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-dark-01",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('30011', {
  "prism": "tut",
  "element": "metal",
  "traits": [
    "guard",
    "armor",
    "banner"
  ],
  "type": "unit",
  "cost": 6,
  "health": 2,
  "power": 4,
  "artSlug": "unit-edsoa-42",
  "set": "Tutorial",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-metal-01",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('30012', {
  "prism": "tut",
  "element": "light",
  "traits": [
    "lifesteal"
  ],
  "type": "unit",
  "cost": 4,
  "health": 4,
  "power": 3,
  "artSlug": "unit-edsoa-31",
  "set": "Tutorial",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-light-03",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('30013', {
  "prism": "tut",
  "element": "mind",
  "traits": [
    "wither"
  ],
  "type": "unit",
  "cost": 3,
  "health": 3,
  "power": 3,
  "artSlug": "unit-panou-54",
  "set": "Tutorial",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-mind-01",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('30014', {
  "prism": "tut",
  "element": "mind",
  "traits": [],
  "type": "unit",
  "cost": 7,
  "health": 9,
  "power": 9,
  "artSlug": "unit-panou-53",
  "set": "Tutorial",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-mind-01",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('30015', {
  "prism": "tut",
  "element": "light",
  "traits": [
    "banner"
  ],
  "type": "unit",
  "cost": 2,
  "health": 3,
  "power": 2,
  "artSlug": "unit-shapo-33",
  "set": "Tutorial",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-light-01",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('30016', {
  "prism": "tut",
  "element": "metal",
  "traits": [
    "armor"
  ],
  "type": "unit",
  "cost": 5,
  "health": 4,
  "power": 4,
  "artSlug": "unit-lobo-46",
  "set": "Tutorial",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-metal-01",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('30017', {
  "prism": "tut",
  "element": "water",
  "traits": [
    "guard"
  ],
  "type": "unit",
  "cost": 4,
  "health": 4,
  "power": 5,
  "artSlug": "unit-edsoa-23",
  "set": "Tutorial",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-water-02",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('30018', {
  "prism": "tut",
  "element": "fire",
  "traits": [],
  "type": "unit",
  "cost": 1,
  "health": 2,
  "power": 3,
  "artSlug": "unit-edsoa-57",
  "set": "Tutorial",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-fire-01",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('30019', {
  "prism": "tut",
  "element": "fire",
  "traits": [
    "lifesteal"
  ],
  "type": "unit",
  "cost": 4,
  "health": 3,
  "power": 5,
  "artSlug": "unit-patty-01",
  "set": "Tutorial",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-fire-01",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('30020', {
  "prism": "tut",
  "element": "earth",
  "traits": [
    "guard"
  ],
  "type": "unit",
  "cost": 4,
  "health": 5,
  "power": 3,
  "artSlug": "unit-shapo-03",
  "set": "Tutorial",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-earth-03",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('30021', {
  "prism": "tut",
  "element": "air",
  "traits": [
    "stealth"
  ],
  "type": "unit",
  "cost": 3,
  "health": 2,
  "power": 5,
  "artSlug": "unit-shapo-43",
  "set": "Tutorial",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-air-02",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('30022', {
  "prism": "tut",
  "element": "metal",
  "traits": [
    "guard"
  ],
  "type": "unit",
  "cost": 1,
  "health": 2,
  "power": 2,
  "artSlug": "unit-vini-15",
  "set": "Tutorial",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-metal-01",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('30023', {
  "prism": "tut",
  "element": "water",
  "traits": [],
  "type": "spell",
  "cost": 0,
  "artSlug": "spell-case-82",
  "set": "Tutorial",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-water-03",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('30024', {
  "prism": "tut",
  "element": "dark",
  "traits": [
    "wither"
  ],
  "type": "unit",
  "cost": 2,
  "health": 2,
  "power": 2,
  "artSlug": "unit-cunha-03",
  "set": "Tutorial",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-dark-03",
  "relatedCards": [
    "30025"
  ],
  "textVocab": [
    "trigger-death"
  ],
  "effectTypes": [
    "Death"
  ]
})
CardLibrary.set('30025', {
  "prism": "tut",
  "element": "dark",
  "traits": [
    "wither"
  ],
  "type": "unit",
  "cost": 0,
  "health": 2,
  "power": 1,
  "artSlug": "unit-rubio-17",
  "set": "Tutorial",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-dark-01",
  "relatedCards": [],
  "textVocab": [
    "trigger-death"
  ],
  "effectTypes": [
    "Death"
  ]
})
CardLibrary.set('30026', {
  "prism": "tut",
  "element": "dark",
  "traits": [
    "wither"
  ],
  "type": "unit",
  "cost": 5,
  "health": 3,
  "power": 4,
  "artSlug": "unit-lobo-12",
  "set": "Tutorial",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-dark-01",
  "relatedCards": [],
  "textVocab": [
    "trigger-play"
  ],
  "effectTypes": [
    "Play"
  ]
})
CardLibrary.set('30027', {
  "prism": "tut",
  "element": "dark",
  "traits": [
    "wither"
  ],
  "type": "unit",
  "cost": 8,
  "health": 8,
  "power": 8,
  "artSlug": "unit-giaco-07",
  "set": "Tutorial",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-dark-01",
  "relatedCards": [
    "30025"
  ],
  "textVocab": [
    "trigger-death"
  ],
  "effectTypes": [
    "Death"
  ]
})
CardLibrary.set('30028', {
  "prism": "tut",
  "element": "fire",
  "traits": [
    "guard",
    "wither",
    "banner"
  ],
  "type": "unit",
  "cost": 9,
  "health": 9,
  "power": 6,
  "artSlug": "unit-edsoa-27",
  "set": "Tutorial",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-fire-02",
  "relatedCards": [],
  "textVocab": [
    "trigger-glory"
  ],
  "effectTypes": [
    "Glory"
  ]
})
CardLibrary.set('30029', {
  "prism": "tut",
  "element": "fire",
  "traits": [],
  "type": "spell",
  "cost": 2,
  "artSlug": "spell-edsoa-05",
  "set": "Tutorial",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-fire-03",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('30030', {
  "prism": "tut",
  "element": "metal",
  "traits": [
    "armor"
  ],
  "type": "unit",
  "cost": 3,
  "health": 3,
  "power": 2,
  "artSlug": "unit-edsoa-63",
  "set": "Tutorial",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-metal-03",
  "relatedCards": [],
  "textVocab": [
    "banner-unit",
    "guard",
    "trigger-glory"
  ],
  "effectTypes": [
    "Glory"
  ]
})
CardLibrary.set('30031', {
  "prism": "tut",
  "element": "fire",
  "traits": [
    "wither"
  ],
  "type": "unit",
  "cost": 1,
  "health": 2,
  "power": 1,
  "artSlug": "unit-shapo-26",
  "attachment": "30032",
  "set": "Tutorial",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-fire-01",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('30032', {
  "prism": "tut",
  "element": "fire",
  "traits": [
    "wither"
  ],
  "type": "spell",
  "cost": 1,
  "artSlug": "spell-shapo-14",
  "set": "Tutorial",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-fire-03",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('30033', {
  "prism": "tut",
  "element": "water",
  "traits": [
    "guard"
  ],
  "type": "unit",
  "cost": 7,
  "health": 8,
  "power": 4,
  "artSlug": "unit-scava-09",
  "set": "Tutorial",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-water-03",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('30034', {
  "prism": "tut",
  "element": "dark",
  "traits": [
    "stealth",
    "lifesteal"
  ],
  "type": "unit",
  "cost": 2,
  "health": 2,
  "power": 2,
  "artSlug": "unit-rubio-27",
  "set": "Tutorial",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-dark-02",
  "relatedCards": [],
  "textVocab": [
    "trigger-sunrise"
  ],
  "effectTypes": [
    "Sunrise"
  ]
})
CardLibrary.set('30035', {
  "prism": "tut",
  "element": "dark",
  "traits": [],
  "type": "spell",
  "cost": 4,
  "artSlug": "spell-case-158",
  "set": "Tutorial",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-dark-03",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('30036', {
  "prism": "tut",
  "element": "light",
  "traits": [
    "guard",
    "lifesteal"
  ],
  "type": "unit",
  "cost": 3,
  "health": 3,
  "power": 3,
  "artSlug": "unit-edsoa-33",
  "attachment": "30037",
  "set": "Tutorial",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-light-01",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('30037', {
  "prism": "tut",
  "element": "light",
  "traits": [
    "banner"
  ],
  "type": "spell",
  "cost": 3,
  "artSlug": "spell-case-151",
  "set": "Tutorial",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-light-02",
  "relatedCards": [],
  "textVocab": [
    "banner-spell"
  ],
  "effectTypes": []
})
CardLibrary.set('30038', {
  "prism": "tut",
  "element": "water",
  "traits": [
    "guard"
  ],
  "type": "unit",
  "cost": 3,
  "health": 4,
  "power": 2,
  "artSlug": "unit-rubio-32",
  "set": "Tutorial",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-water-03",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('30039', {
  "prism": "tut",
  "element": "mind",
  "traits": [],
  "type": "spell",
  "cost": 1,
  "artSlug": "spell-case-174",
  "set": "Tutorial",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-mind-01",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('30040', {
  "prism": "tut",
  "element": "earth",
  "traits": [],
  "type": "unit",
  "cost": 10,
  "health": 11,
  "power": 11,
  "artSlug": "unit-edsoa-137",
  "set": "Tutorial",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-earth-03",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('30041', {
  "prism": "tut",
  "element": "metal",
  "traits": [
    "banner"
  ],
  "type": "unit",
  "cost": 1,
  "health": 2,
  "power": 1,
  "artSlug": "unit-lobo-32",
  "set": "Tutorial",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-metal-02",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('30042', {
  "prism": "tut",
  "element": "air",
  "traits": [],
  "type": "unit",
  "cost": 2,
  "health": 4,
  "power": 0,
  "artSlug": "unit-panou-57",
  "set": "Tutorial",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-air-02",
  "relatedCards": [],
  "textVocab": [
    "trigger-summon"
  ],
  "effectTypes": [
    "Summon"
  ]
})
CardLibrary.set('30043', {
  "prism": "tut",
  "element": "light",
  "traits": [],
  "type": "spell",
  "cost": "X",
  "artSlug": "spell-case-14",
  "set": "Tutorial",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-light-02",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('30044', {
  "prism": "tut",
  "element": "light",
  "traits": [
    "armor"
  ],
  "type": "unit",
  "cost": 1,
  "health": 1,
  "power": 1,
  "artSlug": "unit-edsoa-43",
  "attachment": "30045",
  "set": "Tutorial",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-light-01",
  "relatedCards": [],
  "textVocab": [
    "trigger-inspire-light"
  ],
  "effectTypes": [
    "Inspire"
  ]
})
CardLibrary.set('30045', {
  "prism": "tut",
  "element": "light",
  "traits": [],
  "type": "spell",
  "cost": 1,
  "artSlug": "spell-panou-06",
  "set": "Tutorial",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-light-01",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('30046', {
  "prism": "tut",
  "element": "fire",
  "traits": [],
  "type": "spell",
  "cost": 1,
  "artSlug": "spell-case-76",
  "set": "Tutorial",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-fire-02",
  "relatedCards": [
    "20023"
  ],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('30047', {
  "prism": "tut",
  "element": "earth",
  "traits": [
    "guard"
  ],
  "type": "unit",
  "cost": 3,
  "health": 5,
  "power": 3,
  "artSlug": "unit-desir-02",
  "attachment": "20010",
  "set": "Tutorial",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-earth-02",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('30048', {
  "prism": "tut",
  "element": "water",
  "traits": [],
  "type": "spell",
  "cost": 2,
  "artSlug": "spell-xavi-87",
  "set": "Tutorial",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-water-01",
  "relatedCards": [],
  "textVocab": [
    "draw"
  ],
  "effectTypes": []
})
CardLibrary.set('30049', {
  "prism": "tut",
  "element": "light",
  "traits": [
    "lifesteal",
    "stealth"
  ],
  "type": "unit",
  "cost": 3,
  "health": 1,
  "power": 3,
  "artSlug": "unit-chen-16",
  "attachment": "20019",
  "set": "Tutorial",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-light-01",
  "relatedCards": [
    "20019"
  ],
  "textVocab": [
    "lifesteal",
    "trigger-play"
  ],
  "effectTypes": [
    "Play"
  ]
})
CardLibrary.set('30050', {
  "prism": "tut",
  "element": "earth",
  "traits": [],
  "type": "unit",
  "cost": 6,
  "health": 3,
  "power": 9,
  "artSlug": "unit-vini-18",
  "set": "Tutorial",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-earth-03",
  "relatedCards": [
    "30051"
  ],
  "textVocab": [
    "trigger-death"
  ],
  "effectTypes": [
    "Death"
  ]
})
CardLibrary.set('30051', {
  "prism": "tut",
  "element": "earth",
  "traits": [],
  "type": "unit",
  "cost": 1,
  "health": 1,
  "power": 3,
  "artSlug": "unit-tonel-18",
  "set": "Tutorial",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-earth-01",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('30052', {
  "prism": "tut",
  "element": "earth",
  "traits": [
    "lifesteal"
  ],
  "type": "spell",
  "cost": 5,
  "artSlug": "spell-case-87",
  "set": "Tutorial",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-earth-02",
  "relatedCards": [],
  "textVocab": [
    "dust"
  ],
  "effectTypes": []
})
CardLibrary.set('30053', {
  "prism": "tut",
  "element": "fire",
  "traits": [
    "guard",
    "wither",
    "banner"
  ],
  "type": "unit",
  "cost": 9,
  "health": 9,
  "power": 6,
  "artSlug": "unit-edsoa-27",
  "attachment": "30059",
  "set": "Tutorial",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-fire-02",
  "relatedCards": [],
  "textVocab": [
    "trigger-glory"
  ],
  "effectTypes": [
    "Glory"
  ]
})
CardLibrary.set('30054', {
  "prism": "tut",
  "element": "light",
  "traits": [
    "lifesteal",
    "wither"
  ],
  "type": "spell",
  "cost": 9,
  "artSlug": "spell-case-173",
  "set": "Tutorial",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-light-01",
  "relatedCards": [],
  "textVocab": [
    "dust"
  ],
  "effectTypes": []
})
CardLibrary.set('30055', {
  "prism": "tut",
  "element": "fire",
  "traits": [
    "guard"
  ],
  "type": "unit",
  "cost": 8,
  "health": 6,
  "power": 8,
  "artSlug": "unit-giaco-05",
  "set": "Tutorial",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-fire-02",
  "relatedCards": [
    "20023"
  ],
  "textVocab": [
    "trigger-death"
  ],
  "effectTypes": [
    "Death"
  ]
})
CardLibrary.set('30056', {
  "prism": "tut",
  "element": "light",
  "traits": [
    "guard",
    "lifesteal"
  ],
  "type": "unit",
  "cost": 1,
  "health": 1,
  "power": 2,
  "artSlug": "unit-lobo-13",
  "attachment": "20019",
  "set": "Tutorial",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-light-01",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('30057', {
  "prism": "tut",
  "element": "earth",
  "traits": [
    "lifesteal"
  ],
  "type": "spell",
  "cost": 2,
  "artSlug": "spell-case-72",
  "set": "Tutorial",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-earth-01",
  "relatedCards": [
    "30063"
  ],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('30058', {
  "prism": "tut",
  "element": "water",
  "traits": [
    "guard"
  ],
  "type": "unit",
  "cost": 1,
  "health": 5,
  "power": 2,
  "artSlug": "unit-panou-05",
  "attachment": "20009",
  "set": "Tutorial",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-water-02",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('30059', {
  "prism": "tut",
  "element": "fire",
  "traits": [],
  "type": "spell",
  "cost": 3,
  "artSlug": "spell-case-169",
  "set": "Tutorial",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-fire-03",
  "relatedCards": [],
  "textVocab": [
    "dust"
  ],
  "effectTypes": []
})
CardLibrary.set('30060', {
  "prism": "tut",
  "element": "mind",
  "traits": [
    "stealth",
    "lifesteal"
  ],
  "type": "unit",
  "cost": 2,
  "health": 3,
  "power": 1,
  "artSlug": "unit-desir-08",
  "attachment": "20053",
  "set": "Tutorial",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-mind-02",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('30061', {
  "prism": "tut",
  "element": "dark",
  "traits": [
    "stealth"
  ],
  "type": "unit",
  "cost": 4,
  "health": 3,
  "power": 3,
  "artSlug": "unit-panou-23",
  "attachment": "30062",
  "set": "Tutorial",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-dark-03",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('30062', {
  "prism": "tut",
  "element": "dark",
  "traits": [],
  "type": "spell",
  "cost": 1,
  "artSlug": "spell-case-102",
  "set": "Tutorial",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-dark-03",
  "relatedCards": [
    "20028"
  ],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('30063', {
  "prism": "tut",
  "element": "earth",
  "traits": [
    "guard"
  ],
  "type": "unit",
  "cost": 0,
  "health": 1,
  "power": 0,
  "artSlug": "unit-edsoa-104",
  "attachment": "20010",
  "set": "Tutorial",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-earth-02",
  "relatedCards": [],
  "textVocab": [
    "trigger-death",
    "draw"
  ],
  "effectTypes": [
    "Death"
  ]
})
CardLibrary.set('30064', {
  "prism": "tut",
  "element": "water",
  "traits": [],
  "type": "spell",
  "cost": 0,
  "artSlug": "spell-case-34",
  "set": "Tutorial",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-water-02",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('30065', {
  "prism": "tut",
  "element": "dark",
  "traits": [
    "lifesteal"
  ],
  "type": "unit",
  "cost": 10,
  "health": 1,
  "power": 1,
  "artSlug": "unit-lobo-59",
  "attachment": "20047",
  "set": "Tutorial",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-dark-02",
  "relatedCards": [
    "30074"
  ],
  "textVocab": [
    "trigger-death"
  ],
  "effectTypes": [
    "Death"
  ]
})
CardLibrary.set('30066', {
  "prism": "tut",
  "element": "dark",
  "traits": [],
  "type": "spell",
  "cost": 0,
  "artSlug": "spell-case-142",
  "set": "Tutorial",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-dark-01",
  "relatedCards": [],
  "textVocab": [
    "conjure"
  ],
  "effectTypes": []
})
CardLibrary.set('30067', {
  "prism": "tut",
  "element": "fire",
  "traits": [],
  "type": "spell",
  "cost": 2,
  "artSlug": "spell-case-155",
  "set": "Tutorial",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-fire-02",
  "relatedCards": [
    "20018"
  ],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('30068', {
  "prism": "tut",
  "element": "earth",
  "traits": [],
  "type": "spell",
  "cost": 2,
  "artSlug": "spell-case-161",
  "set": "Tutorial",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-earth-03",
  "relatedCards": [
    "20003",
    "30074"
  ],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('30069', {
  "prism": "tut",
  "element": "water",
  "traits": [],
  "type": "spell",
  "cost": 2,
  "artSlug": "spell-case-148",
  "set": "Tutorial",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-water-01",
  "relatedCards": [],
  "textVocab": [
    "conjure"
  ],
  "effectTypes": []
})
CardLibrary.set('30070', {
  "prism": "tut",
  "element": "metal",
  "traits": [],
  "type": "unit",
  "cost": 2,
  "health": 2,
  "power": 2,
  "artSlug": "unit-machu-04",
  "set": "Tutorial",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-metal-01",
  "relatedCards": [
    "30065"
  ],
  "textVocab": [
    "trigger-play"
  ],
  "effectTypes": [
    "Play"
  ]
})
CardLibrary.set('30071', {
  "prism": "tut",
  "element": "mind",
  "traits": [],
  "type": "spell",
  "cost": 2,
  "artSlug": "spell-panou-02",
  "set": "Tutorial",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-mind-03",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('30072', {
  "prism": "tut",
  "element": "air",
  "traits": [],
  "type": "spell",
  "cost": 1,
  "artSlug": "spell-case-146",
  "set": "Tutorial",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-air-01",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('30073', {
  "prism": "tut",
  "element": "light",
  "traits": [],
  "type": "spell",
  "cost": 1,
  "artSlug": "spell-case-151",
  "set": "Tutorial",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-light-02",
  "relatedCards": [
    "20051"
  ],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('30074', {
  "prism": "tut",
  "element": "light",
  "traits": [],
  "type": "spell",
  "cost": 1,
  "artSlug": "spell-lobo-01",
  "set": "Tutorial",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-light-03",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('30075', {
  "prism": "tut",
  "element": "earth",
  "traits": [],
  "type": "spell",
  "cost": 1,
  "artSlug": "spell-case-154",
  "set": "Tutorial",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-earth-01",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('30076', {
  "prism": "tut",
  "element": "air",
  "traits": [],
  "type": "spell",
  "cost": 0,
  "artSlug": "spell-case-135",
  "set": "Tutorial",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-air-02",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('30077', {
  "prism": "tut",
  "element": "fire",
  "traits": [],
  "type": "spell",
  "cost": 0,
  "artSlug": "spell-case-130",
  "set": "Tutorial",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-fire-03",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('30078', {
  "prism": "tut",
  "element": "air",
  "traits": [],
  "type": "spell",
  "cost": 0,
  "artSlug": "spell-case-135",
  "set": "Tutorial",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-air-01",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('30079', {
  "prism": "tut",
  "element": "air",
  "traits": [],
  "type": "spell",
  "cost": 0,
  "artSlug": "spell-case-135",
  "set": "Tutorial",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-air-02",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('30080', {
  "prism": "tut",
  "element": "fire",
  "traits": [],
  "type": "unit",
  "cost": 1,
  "health": 2,
  "power": 1,
  "artSlug": "unit-shapo-26",
  "attachment": "30081",
  "set": "Tutorial",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-fire-01",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('30081', {
  "prism": "tut",
  "element": "fire",
  "traits": [],
  "type": "spell",
  "cost": 1,
  "artSlug": "spell-shapo-14",
  "set": "Tutorial",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-fire-01",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('30082', {
  "prism": "tut",
  "element": "water",
  "traits": [
    "guard"
  ],
  "type": "unit",
  "cost": 2,
  "health": 4,
  "power": 2,
  "artSlug": "unit-rubio-32",
  "set": "Tutorial",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-water-03",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('30083', {
  "prism": "tut",
  "element": "air",
  "traits": [
    "stealth"
  ],
  "type": "unit",
  "cost": 3,
  "health": 3,
  "power": 4,
  "artSlug": "unit-panou-29",
  "set": "Tutorial",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-air-03",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('30084', {
  "prism": "tut",
  "element": "light",
  "traits": [
    "banner"
  ],
  "type": "spell",
  "cost": 3,
  "artSlug": "spell-case-176",
  "set": "Tutorial",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-light-01",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('30085', {
  "prism": "tut",
  "element": "air",
  "traits": [
    "guard"
  ],
  "type": "unit",
  "cost": 2,
  "health": 3,
  "power": 2,
  "artSlug": "unit-brian-02",
  "set": "Tutorial",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-air-03",
  "relatedCards": [],
  "textVocab": [
    "trigger-glory"
  ],
  "effectTypes": [
    "Glory"
  ]
})
CardLibrary.set('30086', {
  "prism": "tut",
  "element": "dark",
  "traits": [
    "guard"
  ],
  "type": "unit",
  "cost": 4,
  "health": 5,
  "power": 2,
  "artSlug": "unit-miche-01",
  "set": "Tutorial",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-dark-01",
  "relatedCards": [],
  "textVocab": [
    "trigger-sunset"
  ],
  "effectTypes": [
    "Sunset"
  ]
})
CardLibrary.set('30087', {
  "prism": "tut",
  "element": "earth",
  "traits": [
    "guard"
  ],
  "type": "unit",
  "cost": 2,
  "health": 5,
  "power": 0,
  "artSlug": "unit-edsoa-30",
  "set": "Tutorial",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-earth-01",
  "relatedCards": [],
  "textVocab": [
    "trigger-summon",
    "draw"
  ],
  "effectTypes": [
    "Summon"
  ]
})
CardLibrary.set('30088', {
  "prism": "tut",
  "element": "earth",
  "traits": [],
  "type": "spell",
  "cost": 1,
  "artSlug": "spell-case-89",
  "set": "Tutorial",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-earth-02",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('30089', {
  "prism": "tut",
  "element": "mind",
  "traits": [
    "stealth"
  ],
  "type": "unit",
  "cost": 1,
  "health": 1,
  "power": 1,
  "artSlug": "unit-panou-30",
  "set": "Tutorial",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-mind-01",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('30090', {
  "prism": "tut",
  "element": "water",
  "traits": [
    "guard"
  ],
  "type": "unit",
  "cost": 6,
  "health": 8,
  "power": 4,
  "artSlug": "unit-scava-09",
  "set": "Tutorial",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-water-03",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('30091', {
  "prism": "tut",
  "element": "light",
  "traits": [],
  "type": "unit",
  "cost": 1,
  "health": 1,
  "power": 1,
  "artSlug": "unit-edsoa-43",
  "attachment": "30045",
  "set": "Tutorial",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-light-01",
  "relatedCards": [],
  "textVocab": [
    "trigger-inspire-light"
  ],
  "effectTypes": [
    "Inspire"
  ]
})
CardLibrary.set('30092', {
  "prism": "tut",
  "element": "earth",
  "traits": [],
  "type": "unit",
  "cost": 5,
  "health": 6,
  "power": 5,
  "artSlug": "unit-xavi-25",
  "attachment": "20010",
  "set": "Tutorial",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-earth-01",
  "relatedCards": [],
  "textVocab": [
    "trigger-death"
  ],
  "effectTypes": [
    "Death"
  ]
})
CardLibrary.set('30093', {
  "prism": "tut",
  "element": "water",
  "traits": [
    "wither"
  ],
  "type": "spell",
  "cost": 1,
  "artSlug": "spell-case-294",
  "set": "Tutorial",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-water-01",
  "relatedCards": [
    "20009"
  ],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('30094', {
  "prism": "tut",
  "element": "mind",
  "traits": [],
  "type": "unit",
  "cost": 2,
  "health": 3,
  "power": 1,
  "artSlug": "unit-xavi-23",
  "attachment": "30095",
  "set": "Tutorial",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-mind-01",
  "relatedCards": [],
  "textVocab": [
    "trigger-summon",
    "draw"
  ],
  "effectTypes": [
    "Summon"
  ]
})
CardLibrary.set('30095', {
  "prism": "tut",
  "element": "mind",
  "traits": [],
  "type": "spell",
  "cost": 2,
  "artSlug": "spell-case-25",
  "set": "Tutorial",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-mind-03",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('30096', {
  "prism": "tut",
  "element": "light",
  "traits": [
    "guard"
  ],
  "type": "unit",
  "cost": 3,
  "health": 3,
  "power": 3,
  "artSlug": "unit-lobo-16",
  "set": "Tutorial",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-light-03",
  "relatedCards": [],
  "textVocab": [
    "trigger-summon"
  ],
  "effectTypes": [
    "Summon"
  ]
})
CardLibrary.set('30097', {
  "prism": "tut",
  "element": "dark",
  "traits": [],
  "type": "spell",
  "cost": 1,
  "artSlug": "spell-case-117",
  "set": "Tutorial",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-dark-02",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('30098', {
  "prism": "tut",
  "element": "metal",
  "traits": [],
  "type": "spell",
  "cost": 1,
  "artSlug": "spell-hans-01",
  "set": "Tutorial",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-metal-03",
  "relatedCards": [],
  "textVocab": [
    "dust",
    "conjure",
    "draw"
  ],
  "effectTypes": []
})
CardLibrary.set('30099', {
  "prism": "tut",
  "element": "light",
  "traits": [],
  "type": "spell",
  "cost": 10,
  "artSlug": "spell-case-137",
  "set": "Tutorial",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-light-01",
  "relatedCards": [],
  "textVocab": [
    "dust"
  ],
  "effectTypes": []
})
CardLibrary.set('30100', {
  "prism": "tut",
  "element": "mind",
  "traits": [],
  "type": "spell",
  "cost": 10,
  "artSlug": "spell-case-73",
  "set": "Tutorial",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-mind-02",
  "relatedCards": [],
  "textVocab": [
    "conjure"
  ],
  "effectTypes": []
})
CardLibrary.set('30101', {
  "prism": "tut",
  "element": "dark",
  "traits": [],
  "type": "spell",
  "cost": 0,
  "artSlug": "spell-patty-02",
  "set": "Tutorial",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-dark-03",
  "relatedCards": [
    "20013"
  ],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('30102', {
  "prism": "tut",
  "element": "dark",
  "traits": [],
  "type": "spell",
  "cost": 0,
  "artSlug": "spell-case-279",
  "set": "Tutorial",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-dark-01",
  "relatedCards": [
    "20013"
  ],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('30103', {
  "prism": "tut",
  "element": "dark",
  "traits": [],
  "type": "spell",
  "cost": 0,
  "artSlug": "spell-case-266",
  "set": "Tutorial",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-dark-02",
  "relatedCards": [
    "20013",
    "20047"
  ],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('30104', {
  "prism": "tut",
  "element": "dark",
  "traits": [],
  "type": "spell",
  "cost": 0,
  "artSlug": "spell-rubio-21",
  "set": "Tutorial",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-dark-03",
  "relatedCards": [
    "20013"
  ],
  "textVocab": [
    "armor"
  ],
  "effectTypes": []
})
CardLibrary.set('30105', {
  "prism": "tut",
  "element": "dark",
  "traits": [],
  "type": "spell",
  "cost": 0,
  "artSlug": "spell-case-267",
  "set": "Tutorial",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-dark-01",
  "relatedCards": [
    "20013"
  ],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('30106', {
  "prism": "tut",
  "element": "dark",
  "traits": [],
  "type": "spell",
  "cost": 0,
  "artSlug": "spell-case-144",
  "set": "Tutorial",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-dark-02",
  "relatedCards": [
    "20013"
  ],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('30107', {
  "prism": "tut",
  "element": "dark",
  "traits": [],
  "type": "spell",
  "cost": 0,
  "artSlug": "spell-case-114",
  "set": "Tutorial",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-dark-03",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('30108', {
  "prism": "tut",
  "element": "dark",
  "traits": [
    "wither"
  ],
  "type": "spell",
  "cost": 0,
  "artSlug": "spell-case-277",
  "set": "Tutorial",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-dark-01",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('30109', {
  "prism": "tut",
  "element": "dark",
  "traits": [],
  "type": "enchant",
  "cost": "no",
  "artSlug": "spell-case-277",
  "set": "Tutorial",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-dark-02",
  "relatedCards": [],
  "textVocab": [
    "trigger-sunrise"
  ],
  "effectTypes": [
    "Sunrise"
  ]
})
CardLibrary.set('30110', {
  "prism": "tut",
  "element": "earth",
  "traits": [],
  "type": "unit",
  "cost": 2,
  "health": 5,
  "power": 1,
  "artSlug": "unit-edsoa-140",
  "set": "Tutorial",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-earth-01",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('30111', {
  "prism": "tut",
  "element": "dark",
  "traits": [],
  "type": "unit",
  "cost": 2,
  "health": 5,
  "power": 1,
  "artSlug": "unit-edsoa-145",
  "set": "Tutorial",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-dark-01",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('30112', {
  "prism": "tut",
  "element": "dark",
  "traits": [
    "guard"
  ],
  "type": "unit",
  "cost": 2,
  "health": 3,
  "power": 4,
  "artSlug": "unit-edsoa-147",
  "set": "Tutorial",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-dark-03",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('30113', {
  "prism": "tut",
  "element": "earth",
  "traits": [],
  "type": "unit",
  "cost": 2,
  "health": 4,
  "power": 1,
  "artSlug": "unit-edsoa-142",
  "set": "Tutorial",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-earth-01",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": [
    "Generic"
  ]
})
CardLibrary.set('30114', {
  "prism": "tut",
  "element": "dark",
  "traits": [
    "dash"
  ],
  "type": "unit",
  "cost": 3,
  "health": 4,
  "power": 3,
  "artSlug": "unit-edsoa-100",
  "set": "Tutorial",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-dark-02",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('30115', {
  "prism": "tut",
  "element": "metal",
  "traits": [],
  "type": "unit",
  "cost": 3,
  "health": 3,
  "power": 3,
  "artSlug": "unit-calle-86",
  "set": "Tutorial",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-metal-01",
  "relatedCards": [],
  "textVocab": [
    "trigger-play"
  ],
  "effectTypes": [
    "Play"
  ]
})
CardLibrary.set('30116', {
  "prism": "tut",
  "element": "dark",
  "traits": [],
  "type": "spell",
  "cost": 3,
  "artSlug": "spell-case-267",
  "set": "Tutorial",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-dark-03",
  "relatedCards": [
    "30112"
  ],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('30117', {
  "prism": "tut",
  "element": "earth",
  "traits": [],
  "type": "unit",
  "cost": 3,
  "health": 6,
  "power": 2,
  "artSlug": "unit-calle-93",
  "attachment": "30088",
  "set": "Tutorial",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-earth-03",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('30118', {
  "prism": "tut",
  "element": "dark",
  "traits": [],
  "type": "unit",
  "cost": 6,
  "health": 2,
  "power": 6,
  "artSlug": "unit-mara-08",
  "set": "Tutorial",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-dark-03",
  "relatedCards": [],
  "textVocab": [
    "trigger-play"
  ],
  "effectTypes": [
    "Play"
  ]
})
CardLibrary.set('30119', {
  "prism": "tut",
  "element": "dark",
  "traits": [
    "guard"
  ],
  "type": "unit",
  "cost": 7,
  "health": 8,
  "power": 8,
  "artSlug": "unit-giaco-07",
  "set": "Tutorial",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-dark-01",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('30120', {
  "prism": "tut",
  "element": "metal",
  "traits": [],
  "type": "unit",
  "cost": 7,
  "health": 5,
  "power": 5,
  "artSlug": "unit-calle-83",
  "set": "Tutorial",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-metal-03",
  "relatedCards": [
    "152"
  ],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('30121', {
  "prism": "tut",
  "element": "dark",
  "traits": [
    "guard"
  ],
  "type": "unit",
  "cost": 7,
  "health": 2,
  "power": 4,
  "artSlug": "unit-mara-04",
  "set": "Tutorial",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-dark-01",
  "relatedCards": [
    "30128"
  ],
  "textVocab": [
    "trigger-summon"
  ],
  "effectTypes": [
    "Summon"
  ]
})
CardLibrary.set('30122', {
  "prism": "tut",
  "element": "earth",
  "traits": [],
  "type": "spell",
  "cost": 3,
  "artSlug": "spell-xavi-96",
  "set": "Tutorial",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-earth-03",
  "relatedCards": [],
  "textVocab": [
    "draw"
  ],
  "effectTypes": []
})
CardLibrary.set('30123', {
  "prism": "tut",
  "element": "earth",
  "traits": [],
  "type": "spell",
  "cost": 1,
  "artSlug": "spell-mara-03",
  "set": "Tutorial",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-earth-01",
  "relatedCards": [],
  "textVocab": [
    "guard"
  ],
  "effectTypes": []
})
CardLibrary.set('30124', {
  "prism": "tut",
  "element": "metal",
  "traits": [],
  "type": "spell",
  "cost": 4,
  "artSlug": "spell-xavi-98",
  "set": "Tutorial",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-metal-02",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('30125', {
  "prism": "tut",
  "element": "earth",
  "traits": [],
  "type": "spell",
  "cost": 1,
  "artSlug": "spell-xavi-93",
  "set": "Tutorial",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-earth-03",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('30126', {
  "prism": "tut",
  "element": "earth",
  "traits": [],
  "type": "unit",
  "cost": 5,
  "health": 6,
  "power": 4,
  "artSlug": "unit-edsoa-144",
  "set": "Tutorial",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-earth-01",
  "relatedCards": [],
  "textVocab": [
    "draw"
  ],
  "effectTypes": [
    "Generic"
  ]
})
CardLibrary.set('30127', {
  "prism": "tut",
  "element": "earth",
  "traits": [],
  "type": "spell",
  "cost": 2,
  "artSlug": "spell-case-94",
  "set": "Tutorial",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-earth-02",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('30128', {
  "prism": "tut",
  "element": "dark",
  "traits": [
    "guard"
  ],
  "type": "unit",
  "cost": 5,
  "health": 2,
  "power": 4,
  "artSlug": "unit-edsoa-151",
  "set": "Tutorial",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-dark-01",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('30129', {
  "prism": "tut",
  "element": "light",
  "traits": [
    "guard"
  ],
  "type": "unit",
  "cost": 9,
  "health": 1,
  "power": 0,
  "artSlug": "unit-edsoa-122",
  "set": "Tutorial",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-light-01",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('30130', {
  "prism": "tut",
  "element": "light",
  "traits": [],
  "type": "unit",
  "cost": 0,
  "health": 1,
  "power": 1,
  "artSlug": "unit-edsoa-122",
  "set": "Tutorial",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-light-01",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": [
    "Choose"
  ]
})
CardLibrary.set('30131', {
  "prism": "tut",
  "element": "water",
  "traits": [],
  "type": "spell",
  "cost": 0,
  "artSlug": "spell-case-134",
  "set": "Tutorial",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-water-03",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": [
    "Choose"
  ]
})
CardLibrary.set('30132', {
  "prism": "tut",
  "element": "earth",
  "traits": [],
  "type": "spell",
  "cost": 0,
  "artSlug": "spell-case-152",
  "set": "Tutorial",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-earth-01",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": [
    "Choose"
  ]
})
CardLibrary.set('30133', {
  "prism": "tut",
  "element": "fire",
  "traits": [],
  "type": "spell",
  "cost": 0,
  "artSlug": "spell-shapo-14",
  "set": "Tutorial",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-fire-02",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": [
    "Choose"
  ]
})
CardLibrary.set('30134', {
  "prism": "tut",
  "element": "light",
  "traits": [
    "dash"
  ],
  "type": "unit",
  "cost": 0,
  "health": 1,
  "power": 1,
  "artSlug": "unit-edsoa-122",
  "set": "Tutorial",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-light-01",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('30135', {
  "prism": "tut",
  "element": "light",
  "traits": [
    "banner"
  ],
  "type": "unit",
  "cost": 0,
  "health": 1,
  "power": 1,
  "artSlug": "unit-edsoa-122",
  "set": "Tutorial",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-light-01",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('30136', {
  "prism": "tut",
  "element": "fire",
  "traits": [],
  "type": "spell",
  "cost": 0,
  "artSlug": "spell-shapo-14",
  "set": "Tutorial",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-fire-02",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
CardLibrary.set('30137', {
  "prism": "tut",
  "element": "fire",
  "traits": [],
  "type": "spell",
  "cost": 0,
  "artSlug": "spell-shapo-14",
  "set": "Tutorial",
  "releaseSeason": 0,
  "backgroundArtSlug": "bg-fire-03",
  "relatedCards": [],
  "textVocab": [],
  "effectTypes": []
})
VocabLibrary.set('trigger-summon', {
  "icon": "trigger-generic",
  "pattern": "{trigger:Summon:}",
  "type": "trigger"
})
VocabLibrary.set('lifesteal', {
  "icon": "trait-lifesteal",
  "pattern": "{lifesteal}",
  "type": "trait"
})
VocabLibrary.set('ready', {
  "pattern": "{ready}",
  "type": "keyword"
})
VocabLibrary.set('dust', {
  "pattern": "{dust",
  "type": "keyword"
})
VocabLibrary.set('trigger-play', {
  "icon": "trigger-play",
  "pattern": "{trigger:Play:}",
  "type": "trigger"
})
VocabLibrary.set('trigger-inspire-mind', {
  "icon": "trigger-inspire",
  "pattern": "{trigger:Inspire {Mind}:}",
  "type": "trigger"
})
VocabLibrary.set('inspire', {
  "icon": "trigger-inspire",
  "pattern": "{Inspire}",
  "type": "trigger"
})
VocabLibrary.set('trigger-inspire-guard', {
  "icon": "trigger-inspire",
  "pattern": "{trigger:Inspire Guard:}",
  "type": "trigger"
})
VocabLibrary.set('scion', {
  "pattern": "{Scion}",
  "type": "keyword"
})
VocabLibrary.set('trigger-inspire-banner', {
  "icon": "trigger-inspire",
  "pattern": "{trigger:Inspire Banner:}",
  "type": "trigger"
})
VocabLibrary.set('trigger-inspire-light', {
  "icon": "trigger-inspire",
  "pattern": "{trigger:Inspire {Light}:}",
  "type": "trigger"
})
VocabLibrary.set('trigger-slay-unit', {
  "icon": "trigger-slay",
  "pattern": "{trigger:Slay:}",
  "restrict": "unit",
  "type": "keyword"
})
VocabLibrary.set('sleep', {
  "pattern": "{Sleep",
  "type": "keyword"
})
VocabLibrary.set('trigger-death', {
  "icon": "trigger-death",
  "pattern": "{trigger:Death:}",
  "type": "trigger"
})
VocabLibrary.set('trigger-sunset', {
  "icon": "trigger-sunset",
  "pattern": "{trigger:Sunset:}",
  "type": "trigger"
})
VocabLibrary.set('trigger-inspire-earth', {
  "icon": "trigger-inspire",
  "pattern": "{trigger:Inspire {Earth}:}",
  "type": "trigger"
})
VocabLibrary.set('rune', {
  "pattern": "{rune",
  "type": "keyword"
})
VocabLibrary.set('trigger-inspire-any', {
  "icon": "trigger-inspire",
  "pattern": "{trigger:Inspire Any:}",
  "type": "trigger"
})
VocabLibrary.set('trigger-inspire-dark', {
  "icon": "trigger-inspire",
  "pattern": "{trigger:Inspire {Dark}:}",
  "type": "trigger"
})
VocabLibrary.set('wither', {
  "icon": "trait-wither",
  "pattern": "{wither}",
  "type": "trait"
})
VocabLibrary.set('enchanted', {
  "pattern": "{enchanted}",
  "type": "keyword"
})
VocabLibrary.set('blade', {
  "pattern": "{Blade}",
  "type": "keyword"
})
VocabLibrary.set('trigger-inspire-air', {
  "icon": "trigger-inspire",
  "pattern": "{trigger:Inspire {Air}:}",
  "type": "trigger"
})
VocabLibrary.set('trigger-slay-spell', {
  "icon": "trigger-slay",
  "pattern": "{trigger:Slay:}",
  "restrict": "spell",
  "type": "keyword"
})
VocabLibrary.set('enemydraw', {
  "pattern": "{enemydraw}",
  "type": "keyword"
})
VocabLibrary.set('trigger-inspire-1c', {
  "icon": "trigger-inspire",
  "pattern": "{trigger:Inspire {1c}:}",
  "type": "trigger"
})
VocabLibrary.set('armor', {
  "icon": "trait-armor",
  "pattern": "{armor}",
  "type": "trait"
})
VocabLibrary.set('trait', {
  "pattern": "{trait",
  "type": "keyword"
})
VocabLibrary.set('trigger-sunrise', {
  "icon": "trigger-sunrise",
  "pattern": "{trigger:Sunrise:}",
  "type": "trigger"
})
VocabLibrary.set('trigger-inspire-spell', {
  "icon": "trigger-inspire",
  "pattern": "{trigger:Inspire Spell:}",
  "type": "trigger"
})
VocabLibrary.set('dash', {
  "icon": "trait-dash",
  "pattern": "{dash}",
  "type": "trait"
})
VocabLibrary.set('banner-unit', {
  "icon": "trait-banner",
  "pattern": "{banner}",
  "restrict": "unit",
  "type": "trait"
})
VocabLibrary.set('stealth', {
  "icon": "trait-stealth",
  "pattern": "{stealth}",
  "type": "trait"
})
VocabLibrary.set('banner-spell', {
  "icon": "trait-banner",
  "pattern": "{banner}",
  "restrict": "spell",
  "type": "trait"
})
VocabLibrary.set('conjure', {
  "icon": "keyword-conjure",
  "pattern": "{conjure}",
  "type": "keyword"
})
VocabLibrary.set('trigger-inspire-metal', {
  "icon": "trigger-inspire",
  "pattern": "{trigger:Inspire {Metal}:}",
  "type": "trigger"
})
VocabLibrary.set('enemyconjure', {
  "pattern": "{enemyconjure}",
  "type": "keyword"
})
VocabLibrary.set('trigger-inspire-water', {
  "icon": "trigger-inspire",
  "pattern": "{trigger:Inspire {Water}:}",
  "type": "trigger"
})
VocabLibrary.set('wisp', {
  "pattern": "{Wisp}",
  "type": "keyword"
})
VocabLibrary.set('mulligan', {
  "icon": "keyword-mulligan",
  "pattern": "{mulligan}",
  "type": "keyword"
})
VocabLibrary.set('guard', {
  "icon": "trait-guard",
  "pattern": "{guard}",
  "type": "trait"
})
VocabLibrary.set('play', {
  "icon": "trigger-play",
  "pattern": "{play}",
  "type": "keyword"
})
VocabLibrary.set('draw', {
  "pattern": "{draw",
  "type": "keyword"
})
VocabLibrary.set('trigger-glory', {
  "icon": "trigger-glory",
  "pattern": "{trigger:Glory:}",
  "type": "trigger"
})
VocabLibrary.set('lowesthealth', {
  "pattern": "{lowesthealth}",
  "type": "keyword"
})
VocabLibrary.set('shroom', {
  "pattern": "{Shroom}",
  "type": "keyword"
})
