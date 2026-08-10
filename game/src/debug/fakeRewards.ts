import {
  Card,
  CardClass,
  CardElement,
  CardSet,
  CardStatus,
  CardType,
  DeckClass,
  Hero,
  ItemType,
  PlayerRank,
  PlayerRankStage,
  RankData,
  Reward,
  RewardExpReason,
  RewardType
} from '@opensky/proto'
import { NUM_GRANDWEAVERS } from '@opensky/shared/constants'
import { getUrlParam } from '@opensky/shared/utils/location'
import { BaseCard } from '@skyweaver/state-metadata'

import { getBaseCard } from '~/utils/card'
import { notEmpty } from '~/utils/jsUtils'
import { nextRank } from '~/utils/ranks'

const FakeRewardPackNameStrings = [
  'none',
  'xp',
  'basic',
  'baseCards',
  'silverCards',
  'goldCards',
  'levelUpWithAllBaseCardsUnlocked',
  'conquest1',
  'conquest2',
  'conquest3',
  'lvl10Chest',
  'conquestPity',
  'hero',
  'hero2',
  'hero3',
  'heroDualPrism',
  'rankpoints',
  'loseRankpoints',
  'rankup',
  'highLevelLevelUp',
  'heroSkin',
  'deck',
  'testGW'
] as const

type RankDataPackName = keyof typeof rankDataPacks
export type RankChangeRewardPackName =
  `rank_${RankDataPackName}_to_${RankDataPackName}`

const __rankChangeRewardPackRegex = /rank_(\w+)_to_(\w+)/

function getRankChangeRewardPacks(
  x: RankChangeRewardPackName
): [RankDataPackName, RankDataPackName]
function getRankChangeRewardPacks(
  x: string
): [RankDataPackName, RankDataPackName] | null
function getRankChangeRewardPacks(
  x: string
): [RankDataPackName, RankDataPackName] | null {
  const packKeys = Object.keys(rankDataPacks)
  const match = __rankChangeRewardPackRegex.exec(x)

  return match &&
    match.length === 3 &&
    packKeys.includes(match[1]) &&
    packKeys.includes(match[2])
    ? ([match[1], match[2]] as [RankDataPackName, RankDataPackName])
    : null
}

function isRankChangeRewardPackName(x: string): x is RankChangeRewardPackName {
  return Boolean(getRankChangeRewardPacks(x))
}

type FakeRewardPackName = (typeof FakeRewardPackNameStrings)[number]

function isFakeRewardPackName(x: string): x is FakeRewardPackName {
  return (FakeRewardPackNameStrings as readonly string[]).includes(x)
}

function cardReward(
  id: BaseCard,
  rarity: 'gold' | 'silver' | 'base' = 'base'
): Reward {
  return {
    type: RewardType.CARD,
    accountID: 0,
    card: {
      amount: 1,
      card: { id: Number.parseInt(id) } as any as Card,
      item:
        rarity === 'base'
          ? undefined
          : {
              balance: '0',
              id: 0,
              itemType:
                rarity === 'gold'
                  ? ItemType.SW_GOLD_CARDS
                  : ItemType.SW_SILVER_CARDS,
              lastUpdateID: 0,
              tokenID: 0
            }
    }
  }
}

const fakeRewards: { [K in FakeRewardPackName]: Reward[] } = {
  none: [],
  testGW: [
    {
      type: RewardType.RANK,
      accountID: 0,
      rank: {
        beforeMatch: {
          rank: PlayerRank.MASTER,
          rankStage: PlayerRankStage.STAGE_NONE,
          score: 1220,
          requiredRankPoints: 1200,
          rankPosition: 4,
          scoreBelow: 0,
          scoreAbove: 1230
        },
        afterMatch: {
          rank: PlayerRank.GRANDWEAVER,
          rankStage: PlayerRankStage.STAGE_NONE,
          score: 1250,
          requiredRankPoints: 1200,
          rankPosition: 3,
          scoreBelow: 1250,
          scoreAbove: 1250
        }
      }
    }
  ],
  xp: [
    {
      type: RewardType.EXP,
      accountID: 0,
      exp: {
        reason: RewardExpReason.MatchPlayed,
        amount: 20,
        currentLevel: 12,
        requiredExp: 100,
        beforeMatchExp: 0
      }
    },
    {
      type: RewardType.EXP,
      accountID: 0,
      exp: {
        reason: RewardExpReason.DailyQuest,
        reasonExtraData: 3,
        amount: 50,
        currentLevel: 12,
        requiredExp: 100,
        beforeMatchExp: 0
      }
    },
    {
      type: RewardType.EXP,
      accountID: 0,
      exp: {
        reason: RewardExpReason.Victory,
        amount: 50,
        currentLevel: 12,
        requiredExp: 100,
        beforeMatchExp: 0
      }
    }
  ],
  basic: [
    {
      type: RewardType.RANK,
      accountID: 0,
      rank: {
        beforeMatch: {
          rank: PlayerRank.WANDERER,
          rankStage: PlayerRankStage.STAGE_NONE,
          score: 200,
          requiredRankPoints: 300,
          rankPosition: 1,
          scoreBelow: 0,
          scoreAbove: 0
        },
        afterMatch: {
          rank: PlayerRank.TRAINEE,
          rankStage: PlayerRankStage.STAGE_I,
          score: 338,
          requiredRankPoints: 400,
          rankPosition: 10,
          scoreBelow: 0,
          scoreAbove: 0
        }
      }
    },
    {
      type: RewardType.EXP,
      accountID: 0,
      exp: {
        reason: RewardExpReason.MatchPlayed,
        amount: 25,
        currentLevel: 1,
        requiredExp: 100,
        beforeMatchExp: 0
      }
    },
    {
      type: RewardType.EXP,
      accountID: 0,
      exp: {
        reason: RewardExpReason.Victory,
        amount: 75,
        currentLevel: 1,
        requiredExp: 100,
        beforeMatchExp: 0
      }
    },
    {
      type: RewardType.EXP,
      accountID: 0,
      exp: {
        reason: RewardExpReason.RankUp,
        amount: 100,
        currentLevel: 1,
        requiredExp: 100,
        beforeMatchExp: 0
      }
    }
  ],
  baseCards: (getUrlParam('baseCards') || '1')
    .split(',')
    .map(id => getBaseCard(id))
    .filter(notEmpty)
    .map(id => cardReward(id, 'base')),
  silverCards: (getUrlParam('silverCards') || '1')
    .split(',')
    .map(id => getBaseCard(id))
    .filter(notEmpty)
    .map(id => cardReward(id, 'silver')),
  goldCards: (getUrlParam('goldCards') || '1')
    .split(',')
    .map(id => getBaseCard(id))
    .filter(notEmpty)
    .map(id => cardReward(id, 'gold')),
  levelUpWithAllBaseCardsUnlocked: [
    {
      accountID: 1,
      type: RewardType.EXP,
      exp: {
        amount: 20,
        reason: RewardExpReason.MatchPlayed,
        currentLevel: 5,
        requiredExp: 100,
        beforeMatchExp: 0
      }
    },
    {
      accountID: 2,
      type: RewardType.EXP,
      rank: undefined,
      exp: {
        amount: 30,
        reason: RewardExpReason.Victory,
        currentLevel: 5,
        requiredExp: 100,
        beforeMatchExp: 0
      },
      card: undefined,
      hero: undefined
    },
    {
      accountID: 3,
      type: RewardType.EXP,
      rank: undefined,
      exp: {
        amount: 80,
        reason: RewardExpReason.DailyQuest,
        reasonExtraData: 3,
        currentLevel: 5,
        requiredExp: 100,
        beforeMatchExp: 0
      },
      card: undefined,
      hero: undefined
    },
    {
      accountID: 4,
      type: RewardType.HERO,
      hero: { hero: Hero.IRIS, deckClass: DeckClass.AGW }
    },
    {
      accountID: 5,
      type: RewardType.HERO,
      hero: { hero: Hero.BANJO, deckClass: DeckClass.HRT }
    }
  ],
  conquest1: [
    cardReward('95', 'silver'),
    {
      type: RewardType.CONQUEST_POINTS,
      accountID: 0,
      conquestV2TreasureProgress: {
        beforeMatch: {
          treasureLevel: 0,
          treasurePoints: 0,
          treasurePointsRequired: 250
        },
        afterMatch: {
          treasureLevel: 0,
          treasurePoints: 78,
          treasurePointsRequired: 172
        }
      }
    }
  ],
  conquest2: [
    cardReward('95', 'silver'),
    cardReward('2019', 'silver'),
    {
      type: RewardType.CONQUEST_POINTS,
      accountID: 0,
      conquestV2TreasureProgress: {
        beforeMatch: {
          treasureLevel: 0,
          treasurePoints: 78,
          treasurePointsRequired: 172
        },
        afterMatch: {
          treasureLevel: 0,
          treasurePoints: 200,
          treasurePointsRequired: 50
        }
      }
    }
  ],
  conquest3: [
    cardReward('95', 'silver'),
    cardReward('2019', 'gold'),
    {
      type: RewardType.CONQUEST_POINTS,
      accountID: 0,
      conquestV2TreasureProgress: {
        beforeMatch: {
          treasureLevel: 0,
          treasurePoints: 200,
          treasurePointsRequired: 50
        },
        afterMatch: {
          treasureLevel: 1,
          treasurePoints: 35,
          treasurePointsRequired: 365
        }
      }
    }
  ],
  lvl10Chest: [
    cardReward('95', 'silver'),
    cardReward('2019', 'gold'),
    {
      type: RewardType.CONQUEST_POINTS,
      accountID: 0,
      conquestV2TreasureProgress: {
        beforeMatch: {
          treasureLevel: 9,
          treasurePoints: 2950,
          treasurePointsRequired: 550
        },
        afterMatch: {
          treasureLevel: 10,
          treasurePoints: 0,
          treasurePointsRequired: 0
        }
      }
    }
  ],
  conquestPity: [cardReward('2019', 'gold')],
  hero: [
    {
      type: RewardType.HERO,
      accountID: 0,
      hero: {
        hero: Hero.SAMYA,
        deckClass: DeckClass.AGY
      }
    }
  ],
  hero2: [
    {
      type: RewardType.HERO,
      accountID: 0,
      hero: {
        hero: Hero.ADA,
        deckClass: DeckClass.STR
      }
    }
  ],
  hero3: [
    {
      type: RewardType.HERO,
      accountID: 0,
      hero: {
        hero: Hero.SITTI,
        deckClass: DeckClass.HRI
      }
    },
    {
      type: RewardType.HERO,
      accountID: 0,
      hero: {
        hero: Hero.FOX,
        deckClass: DeckClass.STA
      }
    },
    {
      type: RewardType.HERO,
      accountID: 0,
      hero: {
        hero: Hero.MIRA,
        deckClass: DeckClass.STI
      }
    }
  ],
  heroDualPrism: [
    {
      type: RewardType.HERO,
      accountID: 0,
      hero: {
        hero: Hero.SITTI,
        deckClass: DeckClass.HRI
      }
    },
    {
      type: RewardType.HERO,
      accountID: 0,
      hero: {
        hero: Hero.FOX,
        deckClass: DeckClass.STA
      }
    },
    {
      type: RewardType.HERO,
      accountID: 0,
      hero: {
        hero: Hero.MIRA,
        deckClass: DeckClass.STI
      }
    },
    {
      type: RewardType.HERO,
      accountID: 0,
      hero: {
        hero: Hero.AXEL,
        deckClass: DeckClass.HRW
      }
    },
    {
      type: RewardType.HERO,
      accountID: 0,
      hero: {
        hero: Hero.HORIK,
        deckClass: DeckClass.STH
      }
    },
    {
      type: RewardType.HERO,
      accountID: 0,
      hero: {
        hero: Hero.TITUS,
        deckClass: DeckClass.STW
      }
    },
    {
      type: RewardType.HERO,
      accountID: 0,
      hero: {
        hero: Hero.ZOEY,
        deckClass: DeckClass.HRA
      }
    },
    {
      type: RewardType.HERO,
      accountID: 0,
      hero: {
        hero: Hero.MAI,
        deckClass: DeckClass.AGI
      }
    },
    {
      type: RewardType.HERO,
      accountID: 0,
      hero: {
        hero: Hero.BANJO,
        deckClass: DeckClass.INW
      }
    }
  ],
  deck: [
    {
      accountID: 1,
      type: RewardType.EXP,
      rank: undefined,
      exp: {
        amount: 20,
        reason: RewardExpReason.MatchPlayed,
        currentLevel: 5,
        requiredExp: 100,
        beforeMatchExp: 0
      },
      card: undefined,
      hero: undefined,
      heroSkin: undefined,
      deck: undefined
    },
    {
      accountID: 2,
      type: RewardType.EXP,
      rank: undefined,
      exp: {
        amount: 30,
        reason: RewardExpReason.Victory,
        currentLevel: 5,
        requiredExp: 100,
        beforeMatchExp: 0
      },
      card: undefined,
      hero: undefined,
      heroSkin: undefined,
      deck: undefined
    },
    {
      accountID: 3,
      type: RewardType.EXP,
      rank: undefined,
      exp: {
        amount: 80,
        reason: RewardExpReason.DailyQuest,
        reasonExtraData: 6,
        currentLevel: 5,
        requiredExp: 100,
        beforeMatchExp: 0
      },
      card: undefined,
      hero: undefined,
      heroSkin: undefined,
      deck: undefined
    },
    {
      accountID: 4,
      type: RewardType.CARD,
      rank: undefined,
      exp: undefined,
      card: {
        amount: 1,
        card: {
          id: 80,
          name: 'Shogun',
          description: '{trigger:Inspire Guard:} Gain {+1/+1}.',
          asset: 'unit-tonel-16',
          class: CardClass.STR,
          element: CardElement.FIRE,
          type: CardType.UNIT,
          set: CardSet.UNKNOWN,
          manaCost: 2,
          power: 1,
          health: 3,
          attachedSpellID: 20051,
          keywords: ['GUARD', 'FURY'],
          status: CardStatus.PLAY,
          imageURL: {
            small: 'https://assets.skyweaver.net/latest/full-cards/2x/80.webp',
            medium: 'https://assets.skyweaver.net/latest/full-cards/4x/80.webp',
            large: 'https://assets.skyweaver.net/latest/full-cards/6x/80.webp'
          },
          itemType: ItemType.UNKNOWN
        },
        item: undefined
      },
      hero: undefined,
      heroSkin: undefined,
      deck: undefined
    },
    {
      accountID: 5,
      type: RewardType.CARD,
      rank: undefined,
      exp: undefined,
      card: {
        amount: 1,
        card: {
          id: 4101,
          name: "Ari's Insight",
          description: '{Draw} a card with cost equal to your available mana.',
          asset: 'spell-case-187',
          class: CardClass.INT,
          element: CardElement.WATER,
          type: CardType.SPELL,
          set: CardSet.UNKNOWN,
          manaCost: 1,
          power: 0,
          health: 0,
          attachedSpellID: undefined,
          keywords: [],
          status: CardStatus.PLAY,
          imageURL: {
            small:
              'https://assets.skyweaver.net/latest/full-cards/2x/4101.webp',
            medium:
              'https://assets.skyweaver.net/latest/full-cards/4x/4101.webp',
            large: 'https://assets.skyweaver.net/latest/full-cards/6x/4101.webp'
          },
          itemType: ItemType.UNKNOWN
        },
        item: undefined
      },
      hero: undefined,
      heroSkin: undefined,
      deck: undefined
    },
    {
      accountID: 6,
      type: RewardType.HERO,
      rank: undefined,
      exp: undefined,
      card: undefined,
      hero: { hero: Hero.LOTUS, deckClass: DeckClass.WIS },
      heroSkin: undefined,
      deck: undefined
    },
    {
      accountID: 7,
      type: RewardType.DECK,
      rank: undefined,
      exp: undefined,
      card: undefined,
      hero: undefined,
      heroSkin: undefined,
      deck: {
        deckClass: DeckClass.WIS,
        tokenIds: [
          2001, 2003, 2005, 2006, 2010, 2012, 2016, 2024, 2031, 2032, 2035,
          2037, 2045, 2046, 2047, 2049, 2051, 2054, 2064, 2068, 2069, 2071,
          2074, 2076, 2091
        ]
      }
    },
    {
      accountID: 8,
      type: RewardType.CARD,
      rank: undefined,
      exp: undefined,
      card: {
        amount: 1,
        card: {
          id: 2076,
          name: 'Windweave',
          description: '{Mulligan} your hand. {Draw} two cards.',
          asset: 'spell-xavi-06',
          class: CardClass.WIS,
          element: CardElement.AIR,
          type: CardType.SPELL,
          set: CardSet.UNKNOWN,
          manaCost: 3,
          power: 0,
          health: 0,
          attachedSpellID: undefined,
          keywords: [],
          status: CardStatus.PLAY,
          imageURL: {
            small:
              'https://assets.skyweaver.net/latest/full-cards/2x/2076.webp',
            medium:
              'https://assets.skyweaver.net/latest/full-cards/4x/2076.webp',
            large: 'https://assets.skyweaver.net/latest/full-cards/6x/2076.webp'
          },
          itemType: ItemType.UNKNOWN
        },
        item: undefined
      },
      hero: undefined,
      heroSkin: undefined,
      deck: undefined
    }
  ],
  heroSkin: [
    {
      type: RewardType.HERO_SKIN,
      accountID: 0,
      heroSkin: {
        hero: Hero.SAMYA,
        deckClass: DeckClass.AGY,
        tokenId: 999
      }
    }
  ],
  rankpoints: [
    {
      type: RewardType.RANK,
      accountID: 0,
      rank: {
        beforeMatch: {
          rank: PlayerRank.UNRANKED,
          rankStage: PlayerRankStage.STAGE_II,
          score: 0,
          requiredRankPoints: 20,
          rankPosition: 5,
          scoreBelow: 0,
          scoreAbove: 0
        },
        afterMatch: {
          rank: PlayerRank.UNRANKED,
          rankStage: PlayerRankStage.STAGE_II,
          score: 2,
          requiredRankPoints: 20,
          rankPosition: 5,
          scoreBelow: 0,
          scoreAbove: 0
        }
      }
    }
  ],
  loseRankpoints: [
    {
      type: RewardType.RANK,
      accountID: 0,
      rank: {
        beforeMatch: {
          rank: PlayerRank.UNRANKED,
          rankStage: PlayerRankStage.STAGE_II,
          score: 3,
          requiredRankPoints: 20,
          rankPosition: 5,
          scoreBelow: 0,
          scoreAbove: 0
        },
        afterMatch: {
          rank: PlayerRank.UNRANKED,
          rankStage: PlayerRankStage.STAGE_II,
          score: 1,
          requiredRankPoints: 20,
          rankPosition: 5,
          scoreBelow: 0,
          scoreAbove: 0
        }
      }
    }
  ],
  rankup: [
    {
      type: RewardType.RANK,
      accountID: 0,
      rank: {
        beforeMatch: {
          rank: PlayerRank.UNRANKED,
          rankStage: PlayerRankStage.STAGE_II,
          score: 19,
          requiredRankPoints: 20,
          rankPosition: 5,
          scoreBelow: 0,
          scoreAbove: 0
        },
        afterMatch: {
          rank: nextRank(PlayerRank.UNRANKED)!,
          rankStage: PlayerRankStage.STAGE_II,
          score: 0,
          requiredRankPoints: 20,
          rankPosition: 5,
          scoreBelow: 0,
          scoreAbove: 0
        }
      }
    }
  ],
  highLevelLevelUp: [
    {
      accountID: 1,
      type: RewardType.EXP,
      exp: {
        amount: 20,
        reason: RewardExpReason.MatchPlayed,
        currentLevel: 600,
        requiredExp: 200,
        beforeMatchExp: 0
      }
    },
    {
      accountID: 2,
      type: RewardType.EXP,
      rank: undefined,
      exp: {
        amount: 30,
        reason: RewardExpReason.Victory,
        currentLevel: 600,
        requiredExp: 200,
        beforeMatchExp: 0
      },
      card: undefined,
      hero: undefined
    },
    {
      accountID: 3,
      type: RewardType.EXP,
      rank: undefined,
      exp: {
        amount: 80,
        reason: RewardExpReason.DailyQuest,
        reasonExtraData: 3,
        currentLevel: 600,
        requiredExp: 200,
        beforeMatchExp: 0
      },
      card: undefined,
      hero: undefined
    },
    {
      accountID: 4,
      type: RewardType.EXP,
      rank: undefined,
      exp: {
        amount: 150,
        reason: RewardExpReason.DailyQuest,
        reasonExtraData: 1337,
        currentLevel: 600,
        requiredExp: 200,
        beforeMatchExp: 0
      },
      card: undefined,
      hero: undefined
    }
  ]
}

const __rankElos = {
  wanderer: { score: 1200, position: 15 },
  trainee: { score: 0, position: 0 },
  apprentice: { score: 1400, position: 15 },
  expert: { score: 1490, position: 5 },
  master: {
    bottomBottom: { score: 1500, position: 130 },
    bottomMiddle: { score: 1525, position: 122 },
    middleBottom: { score: 1545, position: 20 },
    middleMiddle: { score: 1550, position: 20 },
    topBottom: { score: 1600, position: 1 },
    topMiddle: { score: 1650, position: 1 }
  },
  grandweaver: {
    bottomBottom: { score: 1725, position: NUM_GRANDWEAVERS },
    bottomMiddle: { score: 1735, position: NUM_GRANDWEAVERS - 10 },
    middleBottom: {
      score: 1750,
      position: Math.round(NUM_GRANDWEAVERS / 2) + 5
    },
    middleMiddle: {
      score: 1755,
      position: Math.round(NUM_GRANDWEAVERS / 2)
    },
    topBottom: { score: 1775, position: 2 },
    topMiddle: { score: 1780, position: 1 },
    topTop: { score: 1790, position: 1 }
  }
} as const

const master = {
  rank: PlayerRank.MASTER,
  rankStage: PlayerRankStage.STAGE_NONE,
  score: 0,
  requiredRankPoints: 1300,
  scoreBelow: 0,
  scoreAbove: __rankElos.grandweaver.bottomMiddle.score
}

const grandweaver = {
  rank: PlayerRank.GRANDWEAVER,
  rankStage: PlayerRankStage.STAGE_NONE,
  score: 0,
  requiredRankPoints: 0
}

const rankDataPacks = {
  // wandererFloor: {
  //   rank: PlayerRank.UNRANKED,
  //   rankStage: PlayerRankStage.STAGE_NONE,
  //   score: 0,
  //   requiredRankPoints: 1200,
  //   rankPosition: __rankElos.wanderer.position,
  //   scoreBelow: 0,
  //   scoreAbove: 0
  // },
  // wandererLow: {
  //   rank: PlayerRank.UNRANKED,
  //   rankStage: PlayerRankStage.STAGE_II,
  //   score: 2,
  //   requiredRankPoints: 20,
  //   rankPosition: __rankElos.wanderer.position,
  //   scoreBelow: 0,
  //   scoreAbove: 0
  // },
  traineeFloor: {
    rank: PlayerRank.TRAINEE,
    rankStage: PlayerRankStage.STAGE_I,
    score: 359,
    requiredRankPoints: 400,
    rankPosition: __rankElos.trainee.position,
    scoreBelow: 0,
    scoreAbove: 0
  },

  traineeLow: {
    rank: PlayerRank.TRAINEE,
    rankStage: PlayerRankStage.STAGE_II,
    score: 444,
    requiredRankPoints: 500,
    rankPosition: __rankElos.trainee.position,
    scoreBelow: 0,
    scoreAbove: 0
  },

  traineeHigh: {
    rank: PlayerRank.TRAINEE,
    rankStage: PlayerRankStage.STAGE_III,
    score: 523,
    requiredRankPoints: 600,
    rankPosition: __rankElos.trainee.position,
    scoreBelow: 0,
    scoreAbove: 0
  },
  apprenticeFloor: {
    rank: PlayerRank.APPRENTICE,
    rankStage: PlayerRankStage.STAGE_I,
    score: 657,
    requiredRankPoints: 700,
    rankPosition: __rankElos.apprentice.position,
    scoreBelow: 0,
    scoreAbove: 0
  },
  apprenticeLow: {
    rank: PlayerRank.APPRENTICE,
    rankStage: PlayerRankStage.STAGE_II,
    score: 718,
    requiredRankPoints: 800,
    rankPosition: __rankElos.apprentice.position,
    scoreBelow: 0,
    scoreAbove: 0
  },
  apprenticeHigh: {
    rank: PlayerRank.APPRENTICE,
    rankStage: PlayerRankStage.STAGE_III,
    score: 848,
    requiredRankPoints: 900,
    rankPosition: __rankElos.apprentice.position,
    scoreBelow: 0,
    scoreAbove: 0
  },

  expertFloor: {
    rank: PlayerRank.EXPERT,
    rankStage: PlayerRankStage.STAGE_I,
    score: 978,
    requiredRankPoints: 1000,
    rankPosition: __rankElos.expert.position,
    scoreBelow: 0,
    scoreAbove: 0
  },

  expertLow: {
    rank: PlayerRank.EXPERT,
    rankStage: PlayerRankStage.STAGE_II,
    score: 1045,
    requiredRankPoints: 1100,
    rankPosition: __rankElos.expert.position,
    scoreBelow: 0,
    scoreAbove: 0
  },

  expertHigh: {
    rank: PlayerRank.EXPERT,
    rankStage: PlayerRankStage.STAGE_III,
    score: 1176,
    requiredRankPoints: 1200,
    rankPosition: __rankElos.expert.position,
    scoreBelow: 0,
    scoreAbove: 0
  },

  masterBottomBottom: {
    ...master,
    score: __rankElos.master.bottomBottom.score,
    rankPosition: __rankElos.master.bottomBottom.position,
    scoreAbove: __rankElos.grandweaver.bottomBottom.score
  },
  masterBottom: {
    ...master,
    score: __rankElos.master.bottomMiddle.score,
    rankPosition: __rankElos.master.bottomMiddle.position,
    scoreAbove: __rankElos.grandweaver.bottomBottom.score
  },

  masterMiddleBottom: {
    ...master,
    score: __rankElos.master.middleBottom.score,
    rankPosition: __rankElos.master.middleBottom.position,
    scoreAbove: __rankElos.grandweaver.bottomBottom.score
  },
  masterMiddle: {
    ...master,
    score: __rankElos.master.middleMiddle.score, //1550
    rankPosition: __rankElos.master.middleMiddle.position, //20
    scoreAbove: __rankElos.grandweaver.bottomBottom.score //1725
  },

  masterTopBottom: {
    ...master,
    score: __rankElos.master.topBottom.score, //1600
    rankPosition: __rankElos.master.topBottom.position, //1
    scoreAbove: __rankElos.grandweaver.bottomBottom.score //1725
  },
  masterTop: {
    ...master,
    score: __rankElos.master.topMiddle.score,
    rankPosition: __rankElos.master.topMiddle.position,
    scoreAbove: __rankElos.grandweaver.bottomBottom.score
  },
  gwBottomBottom: {
    ...grandweaver,
    score: __rankElos.grandweaver.bottomBottom.score, //1725
    rankPosition: __rankElos.grandweaver.bottomBottom.position, //100
    scoreBelow: __rankElos.master.topMiddle.score, //1650
    scoreAbove: __rankElos.grandweaver.bottomMiddle.score //1735
  },
  gwBottom: {
    ...grandweaver,
    score: __rankElos.grandweaver.bottomMiddle.score + 1, //1735
    rankPosition: __rankElos.grandweaver.bottomMiddle.position, //90
    scoreBelow: __rankElos.grandweaver.bottomBottom.score, //1725
    scoreAbove: __rankElos.grandweaver.middleBottom.score //1750
  },
  gwMiddleBottom: {
    ...grandweaver,
    score: __rankElos.grandweaver.middleBottom.score, //1750
    rankPosition: __rankElos.grandweaver.middleBottom.position, // 50
    scoreBelow: __rankElos.grandweaver.bottomMiddle.score, //1735
    scoreAbove: __rankElos.grandweaver.middleMiddle.score //1755
  },
  gwMiddle: {
    ...grandweaver,
    score: __rankElos.grandweaver.middleMiddle.score, //1755
    rankPosition: __rankElos.grandweaver.middleMiddle.position,
    scoreBelow: __rankElos.grandweaver.middleBottom.score,
    scoreAbove: __rankElos.grandweaver.topBottom.score
  },
  gwTopBottom: {
    ...grandweaver,
    score: __rankElos.grandweaver.topBottom.score,
    rankPosition: __rankElos.grandweaver.topBottom.position,
    scoreBelow: __rankElos.grandweaver.middleMiddle.score,
    scoreAbove: __rankElos.grandweaver.topMiddle.score
  },
  gwTop: {
    ...grandweaver,
    score: __rankElos.grandweaver.topMiddle.score,
    rankPosition: __rankElos.grandweaver.topMiddle.position,
    scoreBelow: __rankElos.grandweaver.topBottom.score,
    scoreAbove: __rankElos.grandweaver.topMiddle.score
  },
  gwTopTop: {
    ...grandweaver,
    score: __rankElos.grandweaver.topTop.score,
    rankPosition: __rankElos.grandweaver.topTop.position,
    scoreBelow: __rankElos.grandweaver.middleMiddle.score,
    scoreAbove: __rankElos.grandweaver.topTop.score
  }
}

const __assertPacksContainRankData: {
  [K in keyof typeof rankDataPacks]: RankData
} = rankDataPacks
void __assertPacksContainRankData
export function getFakeRewards(rewardPacksString = ''): Reward[] | null {
  if (rewardPacksString.length === 0) {
    return null
  }
  // 'basic,conquest' will concat rewards in packs "basic" and "conquest"
  const userPackNames = rewardPacksString.split(',')
  const packNames = userPackNames.filter(
    (str: string): str is FakeRewardPackName | RankChangeRewardPackName =>
      isFakeRewardPackName(str) || isRankChangeRewardPackName(str)
  )
  const invalidPackNames = userPackNames.filter(
    c => !(packNames as string[]).includes(c)
  )
  if (invalidPackNames.length) {
    alert(`DEBUG: Invalid reward pack names ${invalidPackNames.join(',')}`)
  }
  if (packNames.length === 0) {
    return null
  }

  return ([] as Reward[]).concat(
    ...packNames.map(pn => {
      if (isFakeRewardPackName(pn)) {
        return fakeRewards[pn]
      } else {
        const [beforeMatch, afterMatch] = getRankChangeRewardPacks(pn)
        const rankReward: Reward[] = [
          {
            type: RewardType.RANK,
            accountID: 0,
            rank: {
              beforeMatch: rankDataPacks[beforeMatch],
              afterMatch: rankDataPacks[afterMatch]
            }
          }
        ]
        return rankReward
      }
    })
  )
}
