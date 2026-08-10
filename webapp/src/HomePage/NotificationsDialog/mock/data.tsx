import {
  Notification,
  NotificationType,
  PlayerRank,
  PlayerRankStage
} from '~/lib/proto'

export const mockNotifications = [
  {
    id: 0,
    type: NotificationType.CONQUEST_V2_REWARD,
    conquestV2Reward: {
      season: 10,
      week: 3,
      treasureLevel: 4,
      amountUSDC: 345.45,
      silverCardAmounts: { 33: 1, 78: 1, 120: 1, 121: 1, 2116: 1, 2107: 1 }
    }
  },
  {
    id: 1,
    type: NotificationType.ONE_TIME,
    oneTime: {
      id: 0,
      name: 'test',
      data: {
        background: 'webapp/backgrounds/spbg-all-claimed.webp',
        subtitle: 'SKYPASS SEASON 15: HEXBOUND COMPLETE!',
        title: 'ALL AVAILABLE UNCLAIMED REWARDS WERE AUTO-CLAIMED'
      }
    }
  },
  {
    id: 2,
    type: NotificationType.ONE_TIME,
    oneTime: {
      id: 3,
      name: 'test xp change',
      data: {
        background: 'webapp/backgrounds/skypass-xp-level-notification.webp',
        subtitle: '',
        title: 'YOUR LEVEL XP NOW REPRESENTS \n YOUR SKYPASS LEVEL'
      }
    }
  },
  {
    id: 3,
    type: NotificationType.ONE_TIME,
    oneTime: {
      id: 1,
      name: 'test',
      data: {
        background: 'webapp/backgrounds/exbg-hexinv-conquest.webp',
        subtitle: 'NEW EXPANSION MEANS NEW CARDS!',
        title: 'SILVER CARDS FROM THE NEW EXPANSION \n CAN BE FOUND IN CONQUEST'
      }
    }
  },
  {
    id: 4,
    type: NotificationType.ONE_TIME,
    oneTime: {
      id: 2,
      name: 'test new season',
      data: {
        background: 'webapp/backgrounds/spbg-pablo-01-rewards.webp',
        subtitle: 'NEW SKYPASS SEASON ENDS ON FEBRUARY 13TH',
        title: 'HEXBOUND SEASON IS HERE! CHECK THE NEW REWARDS!',
        buttonText: 'VIEW SKYPASS',
        buttonPath: '/skypass'
      }
    }
  },
  {
    id: 5,
    type: NotificationType.LEADERBOARD_REWARD,

    leaderboardReward: {
      season: 10,
      week: 10,
      silverCardAmounts: { 65577: 5 },
      ticketAmount: 2,
      rankedConstructedRank: 12,
      rankedDiscoveryRank: 57,
      earnedConstructedPlayerRanks: [
        {
          playerRank: PlayerRank.MASTER,
          playerRankStage: PlayerRankStage.STAGE_NONE
        },
        {
          playerRank: PlayerRank.EXPERT,
          playerRankStage: PlayerRankStage.STAGE_II
        },
        {
          playerRank: PlayerRank.TRAINEE,
          playerRankStage: PlayerRankStage.STAGE_III
        }
      ],
      earnedDiscoveryPlayerRanks: [
        {
          playerRank: PlayerRank.GRANDWEAVER,
          playerRankStage: PlayerRankStage.STAGE_I
        },
        {
          playerRank: PlayerRank.APPRENTICE,
          playerRankStage: PlayerRankStage.STAGE_I
        },
        {
          playerRank: PlayerRank.WANDERER,
          playerRankStage: PlayerRankStage.STAGE_I
        }
      ]
    }
  },
  {
    id: 6,
    type: NotificationType.ONE_TIME,
    oneTime: {
      id: 5,
      name: 'SKYPASS_SEASON_20',
      data: {
        title: 'NEW SKYPASS SEASON: DEEP SEA! AVAILABLE UNTIL JUNE 5TH',
        subtitle:
          'THE SEA IS UNKNOWN TO LAND DWELLERS, WHAT THEY KNOW IS WHAT WE SHOW THEM.',
        background: 'webapp/backgrounds/skypass/spbg-pablo-05-rewards.webp',
        buttonPath: '/skypass/50/2000',
        buttonText: 'SHOW LEVEL 50 REWARD'
      }
    }
  }
] as Notification[]

export const mockClaimReward = {
  SW_SINGLE_BASE_CARD: {
    rewards: [
      {
        accountAddress: '0xa91295ed2443e0ffc175c0a8687727df8a298f81',
        type: 'CARD',
        gameMode: null,
        rank: null,
        exp: null,
        card: {
          amount: 1,
          description: '',
          card: {
            id: 2,
            name: 'Reinforce',
            description:
              'Summon two {card:20001}. Give \nally units with {guard} {+1/+1}.',
            asset: 'spell-case-177',
            class: 'STR',
            element: 'METAL',
            type: 'SPELL',
            manaCost: 4,
            power: 0,
            health: 0,
            attachedSpellID: null,
            keywords: [],
            status: 'PLAY',
            set: 'CORE_SET',
            imageURL: {
              small: 'https://assets.skyweaver.net/latest/full-cards/2x/2.webp',
              medium: 'https://assets.skyweaver.net/latest/full-cards/4x/2.webp',
              large: 'https://assets.skyweaver.net/latest/full-cards/6x/2.webp'
            },
            itemType: 'UNKNOWN',
            isNew: null,
            silverCardTokenId: 65538,
            goldCardTokenId: 131074
          },
          item: null
        },
        hero: null,
        heroSkin: null,
        deck: null,
        conquestV2TreasureProgress: null
      },
      {
        accountAddress: '0xa91295ed2443e0ffc175c0a8687727df8a298f81',
        type: 'CARD',
        gameMode: null,
        rank: null,
        exp: null,
        card: {
          amount: 1,
          description: '',
          card: {
            id: 2,
            name: 'Reinforce',
            description:
              'Summon two {card:20001}. Give \nally units with {guard} {+1/+1}.',
            asset: 'spell-case-177',
            class: 'STR',
            element: 'METAL',
            type: 'SPELL',
            manaCost: 4,
            power: 0,
            health: 0,
            attachedSpellID: null,
            keywords: [],
            status: 'PLAY',
            set: 'CORE_SET',
            imageURL: {
              small: 'https://assets.skyweaver.net/latest/full-cards/2x/2.webp',
              medium: 'https://assets.skyweaver.net/latest/full-cards/4x/2.webp',
              large: 'https://assets.skyweaver.net/latest/full-cards/6x/2.webp'
            },
            itemType: 'UNKNOWN',
            isNew: null,
            silverCardTokenId: 65538,
            goldCardTokenId: 131074
          },
          item: null
        },
        hero: null,
        heroSkin: null,
        deck: null,
        conquestV2TreasureProgress: null
      },
      {
        accountAddress: '0xa91295ed2443e0ffc175c0a8687727df8a298f81',
        type: 'CARD',
        gameMode: null,
        rank: null,
        exp: null,
        card: {
          amount: 1,
          description: '',
          card: {
            id: 2,
            name: 'Reinforce',
            description:
              'Summon two {card:20001}. Give \nally units with {guard} {+1/+1}.',
            asset: 'spell-case-177',
            class: 'STR',
            element: 'METAL',
            type: 'SPELL',
            manaCost: 4,
            power: 0,
            health: 0,
            attachedSpellID: null,
            keywords: [],
            status: 'PLAY',
            set: 'CORE_SET',
            imageURL: {
              small: 'https://assets.skyweaver.net/latest/full-cards/2x/2.webp',
              medium: 'https://assets.skyweaver.net/latest/full-cards/4x/2.webp',
              large: 'https://assets.skyweaver.net/latest/full-cards/6x/2.webp'
            },
            itemType: 'UNKNOWN',
            isNew: null,
            silverCardTokenId: 65538,
            goldCardTokenId: 131074
          },
          item: null
        },
        hero: null,
        heroSkin: null,
        deck: null,
        conquestV2TreasureProgress: null
      },
      {
        accountAddress: '0xa91295ed2443e0ffc175c0a8687727df8a298f81',
        type: 'CARD',
        gameMode: null,
        rank: null,
        exp: null,
        card: {
          amount: 1,
          description: '',
          card: {
            id: 2,
            name: 'Reinforce',
            description:
              'Summon two {card:20001}. Give \nally units with {guard} {+1/+1}.',
            asset: 'spell-case-177',
            class: 'STR',
            element: 'METAL',
            type: 'SPELL',
            manaCost: 4,
            power: 0,
            health: 0,
            attachedSpellID: null,
            keywords: [],
            status: 'PLAY',
            set: 'CORE_SET',
            imageURL: {
              small: 'https://assets.skyweaver.net/latest/full-cards/2x/2.webp',
              medium: 'https://assets.skyweaver.net/latest/full-cards/4x/2.webp',
              large: 'https://assets.skyweaver.net/latest/full-cards/6x/2.webp'
            },
            itemType: 'UNKNOWN',
            isNew: null,
            silverCardTokenId: 65538,
            goldCardTokenId: 131074
          },
          item: null
        },
        hero: null,
        heroSkin: null,
        deck: null,
        conquestV2TreasureProgress: null
      },
      {
        accountAddress: '0xa91295ed2443e0ffc175c0a8687727df8a298f81',
        type: 'CARD',
        gameMode: null,
        rank: null,
        exp: null,
        card: {
          amount: 1,
          description: '',
          card: {
            id: 2,
            name: 'Reinforce',
            description:
              'Summon two {card:20001}. Give \nally units with {guard} {+1/+1}.',
            asset: 'spell-case-177',
            class: 'STR',
            element: 'METAL',
            type: 'SPELL',
            manaCost: 4,
            power: 0,
            health: 0,
            attachedSpellID: null,
            keywords: [],
            status: 'PLAY',
            set: 'CORE_SET',
            imageURL: {
              small: 'https://assets.skyweaver.net/latest/full-cards/2x/2.webp',
              medium: 'https://assets.skyweaver.net/latest/full-cards/4x/2.webp',
              large: 'https://assets.skyweaver.net/latest/full-cards/6x/2.webp'
            },
            itemType: 'UNKNOWN',
            isNew: null,
            silverCardTokenId: 65538,
            goldCardTokenId: 131074
          },
          item: null
        },
        hero: null,
        heroSkin: null,
        deck: null,
        conquestV2TreasureProgress: null
      }
    ]
  },
  SW_MULTI_BASE_CARDS: {
    rewards: [
      {
        accountAddress: '0xa91295ed2443e0ffc175c0a8687727df8a298f81',
        type: 'CARD',
        gameMode: null,
        rank: null,
        exp: null,
        card: {
          amount: 1,
          description: '',
          card: {
            id: 121,
            name: 'Armis Medic',
            description:
              '{trigger:Sunset:} Add {card:20001} to your hand. This game, ~your {card:20001} have {Lifesteal}~.',
            asset: 'unit-edsoa-92',
            class: 'STR',
            element: 'METAL',
            type: 'UNIT',
            manaCost: 2,
            power: 2,
            health: 1,
            attachedSpellID: null,
            keywords: ['ARMOR', 'LIFESTEAL'],
            status: 'PLAY',
            set: 'HEXBOUND_INVASION',
            imageURL: {
              small: 'https://assets.skyweaver.net/latest/full-cards/2x/121.webp',
              medium: 'https://assets.skyweaver.net/latest/full-cards/4x/121.webp',
              large: 'https://assets.skyweaver.net/latest/full-cards/6x/121.webp'
            },
            itemType: 'UNKNOWN',
            isNew: null,
            silverCardTokenId: 65657,
            goldCardTokenId: 131193
          },
          item: null
        },
        hero: null,
        heroSkin: null,
        deck: null,
        conquestV2TreasureProgress: null
      },
      {
        accountAddress: '0xa91295ed2443e0ffc175c0a8687727df8a298f81',
        type: 'CARD',
        gameMode: null,
        rank: null,
        exp: null,
        card: {
          amount: 1,
          description: '',
          card: {
            id: 4125,
            name: 'Hexswindler',
            description:
              "{trigger:Play:} Swap this unit's attachment with target enemy unit's attachment.",
            asset: 'unit-edsoa-100',
            class: 'INT',
            element: 'DARK',
            type: 'UNIT',
            manaCost: 2,
            power: 2,
            health: 3,
            attachedSpellID: 20028,
            keywords: ['STEALTH', 'HEX'],
            status: 'PLAY',
            set: 'HEXBOUND_INVASION',
            imageURL: {
              small: 'https://assets.skyweaver.net/latest/full-cards/2x/4125.webp',
              medium: 'https://assets.skyweaver.net/latest/full-cards/4x/4125.webp',
              large: 'https://assets.skyweaver.net/latest/full-cards/6x/4125.webp'
            },
            itemType: 'UNKNOWN',
            isNew: null,
            silverCardTokenId: 69661,
            goldCardTokenId: 135197
          },
          item: null
        },
        hero: null,
        heroSkin: null,
        deck: null,
        conquestV2TreasureProgress: null
      },
      {
        accountAddress: '0xa91295ed2443e0ffc175c0a8687727df8a298f81',
        type: 'CARD',
        gameMode: null,
        rank: null,
        exp: null,
        card: {
          amount: 1,
          description: '',
          card: {
            id: 2124,
            name: 'Ruined Visage',
            description:
              '{trigger:Play:} Gain power and health equal to the health of target ally unit.',
            asset: 'unit-patty-11',
            class: 'WIS',
            element: 'EARTH',
            type: 'UNIT',
            manaCost: 4,
            power: 0,
            health: 2,
            attachedSpellID: 20010,
            keywords: ['GUARD', 'ROOTS'],
            status: 'PLAY',
            set: 'HEXBOUND_INVASION',
            imageURL: {
              small: 'https://assets.skyweaver.net/latest/full-cards/2x/2124.webp',
              medium: 'https://assets.skyweaver.net/latest/full-cards/4x/2124.webp',
              large: 'https://assets.skyweaver.net/latest/full-cards/6x/2124.webp'
            },
            itemType: 'UNKNOWN',
            isNew: null,
            silverCardTokenId: 67660,
            goldCardTokenId: 133196
          },
          item: null
        },
        hero: null,
        heroSkin: null,
        deck: null,
        conquestV2TreasureProgress: null
      },
      {
        accountAddress: '0xa91295ed2443e0ffc175c0a8687727df8a298f81',
        type: 'CARD',
        gameMode: null,
        rank: null,
        exp: null,
        card: {
          amount: 1,
          description: '',
          card: {
            id: 3121,
            name: 'Rot Hound',
            description:
              "{trigger:Play:} Trigger target ally unit's {death} effect(s).",
            asset: 'unit-tonel-04',
            class: 'HRT',
            element: 'DARK',
            type: 'UNIT',
            manaCost: 2,
            power: 1,
            health: 3,
            attachedSpellID: null,
            keywords: ['DASH'],
            status: 'PLAY',
            set: 'HEXBOUND_INVASION',
            imageURL: {
              small: 'https://assets.skyweaver.net/latest/full-cards/2x/3121.webp',
              medium: 'https://assets.skyweaver.net/latest/full-cards/4x/3121.webp',
              large: 'https://assets.skyweaver.net/latest/full-cards/6x/3121.webp'
            },
            itemType: 'UNKNOWN',
            isNew: null,
            silverCardTokenId: 68657,
            goldCardTokenId: 134193
          },
          item: null
        },
        hero: null,
        heroSkin: null,
        deck: null,
        conquestV2TreasureProgress: null
      },
      {
        accountAddress: '0xa91295ed2443e0ffc175c0a8687727df8a298f81',
        type: 'CARD',
        gameMode: null,
        rank: null,
        exp: null,
        card: {
          amount: 1,
          description: '',
          card: {
            id: 2120,
            name: 'Sunpetal',
            description: '{trigger:Sunset:} ~Gain 1 mana~ next turn.',
            asset: 'unit-lobo-71',
            class: 'WIS',
            element: 'EARTH',
            type: 'UNIT',
            manaCost: 2,
            power: 1,
            health: 3,
            attachedSpellID: null,
            keywords: ['LIFESTEAL'],
            status: 'PLAY',
            set: 'HEXBOUND_INVASION',
            imageURL: {
              small: 'https://assets.skyweaver.net/latest/full-cards/2x/2120.webp',
              medium: 'https://assets.skyweaver.net/latest/full-cards/4x/2120.webp',
              large: 'https://assets.skyweaver.net/latest/full-cards/6x/2120.webp'
            },
            itemType: 'UNKNOWN',
            isNew: null,
            silverCardTokenId: 67656,
            goldCardTokenId: 133192
          },
          item: null
        },
        hero: null,
        heroSkin: null,
        deck: null,
        conquestV2TreasureProgress: null
      }
    ]
  },
  SW_CONQUEST_TICKET: {
    rewards: [
      {
        accountAddress: '0xa91295ed2443e0ffc175c0a8687727df8a298f81',
        type: 'CONQUEST_TICKET',
        gameMode: null,
        rank: null,
        exp: null,
        card: null,
        hero: null,
        heroSkin: null,
        deck: null,
        conquestV2TreasureProgress: null
      }
    ]
  },
  SW_STICKER: {
    rewards: [
      {
        accountAddress: '0xa91295ed2443e0ffc175c0a8687727df8a298f81',
        type: 'CONQUEST_TICKET',
        gameMode: null,
        rank: null,
        exp: null,
        card: null,
        hero: null,
        heroSkin: null,
        deck: null,
        conquestV2TreasureProgress: null
      }
    ]
  },
  SW_STARTER_DECK: {
    rewards: [
      {
        accountAddress: '0xa91295ed2443e0ffc175c0a8687727df8a298f81',
        type: 'DECK',
        gameMode: null,
        rank: null,
        exp: null,
        card: null,
        hero: null,
        heroSkin: null,
        deck: {
          deckClass: 'AGY',
          tokenIds: [
            1008, 1014, 1015, 1017, 1020, 1025, 1026, 1030, 1031, 1032, 1035, 1043,
            1047, 1053, 1055, 1062, 1063, 1069, 1070, 1074, 1077, 1079, 1080, 1101,
            1114
          ]
        },
        conquestV2TreasureProgress: null
      },
      {
        accountAddress: '0xa91295ed2443e0ffc175c0a8687727df8a298f81',
        type: 'HERO',
        gameMode: null,
        rank: null,
        exp: null,
        card: null,
        hero: {
          hero: 'SAMYA',
          deckClass: 'AGY'
        },
        heroSkin: null,
        deck: null,
        conquestV2TreasureProgress: null
      }
    ]
  },
  SW_DUO_PRISM_HERO: {
    rewards: [
      {
        accountAddress: '0xa91295ed2443e0ffc175c0a8687727df8a298f81',
        type: 'HERO',
        gameMode: null,
        rank: null,
        exp: null,
        card: null,
        hero: {
          hero: 'FOX',
          deckClass: 'STA'
        },
        heroSkin: null,
        deck: null,
        conquestV2TreasureProgress: null
      }
    ]
  },
  SW_CARDBACK: {
    rewards: [
      {
        accountAddress: '0xa91295ed2443e0ffc175c0a8687727df8a298f81',
        type: 'CARD_BACK',
        gameMode: null,
        rank: null,
        exp: null,
        card: null,
        hero: null,
        heroSkin: null,
        deck: null,
        conquestV2TreasureProgress: null
      }
    ]
  }
}
