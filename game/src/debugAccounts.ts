import { StickerLibrary } from '@opensky/shared/cosmetics'
import { AccountWithPrismsAndCosmeticsInfo } from '@opensky/shared/game-server-message-types'
import { Player, PlayerState, Prism } from '@skyweaver/state-metadata'

import { getRandomPrism } from './helpers/typeHelpers'
import queryParams from './queryParams'
const prisms = queryParams.setPrism?.split(',') as Prism[]
const playerOnePrisms = prisms ?? getRandomPrism()
const playerTwoPrisms = prisms ?? getRandomPrism()
export const debugAccounts: [
  AccountWithPrismsAndCosmeticsInfo,
  AccountWithPrismsAndCosmeticsInfo
] = [
  {
    id: 123,
    address: '0x123123123123',
    name: 'Debug Player',
    locale: 'en',
    warmUps: 0,
    createdAt: '01/01/2020',
    updatedAt: '01/01/2020',
    experience: 0,
    level: 12,
    titleID: 5000,
    seasonLevel: 1,
    levelUpXP: 200,
    prisms: playerOnePrisms,
    deckEquipment: {
      stickers: [...new Set([...StickerLibrary.values()])].map(s => s.id),
      cardBack:
        queryParams.fakeCardBacks && queryParams.fakeCardBacks.length
          ? queryParams.fakeCardBacks
              .split(',')
              .map(num => Number.parseInt(num, 10))[0]
          : undefined
    }
  },
  {
    id: 123,
    address: '0x123123123123',
    name: 'Debug Opponent',
    locale: 'en',
    warmUps: 0,
    createdAt: '01/01/2020',
    updatedAt: '01/01/2020',
    experience: 0,
    level: 12,
    seasonLevel: 1,
    levelUpXP: 200,
    titleID: 5000,
    prisms: playerTwoPrisms,
    deckEquipment: {
      stickers: [],
      cardBack:
        queryParams.fakeCardBacks && queryParams.fakeCardBacks.length
          ? queryParams.fakeCardBacks
              .split(',')
              .map(num => Number.parseInt(num, 10))[0]
          : undefined
    }
  }
]

export const debugPlayerStates: { [K in Player]: PlayerState } = {
  0: {
    id: 0,
    prisms: playerOnePrisms,
    mana: 10,
    maxMana: 11,
    doneCardSelection: true,
    bannerSize: 3,
    inspireRepeat: 1,
    gloryRepeat: 1,
    extraManaNextTurn: 1,
    heroAbilityBase: undefined,
    thisTurnStats: {
      alliesDied: [],
      heroHpLost: 0,
      heroHpGained: 0,
      heroAttacked: false,
      heroWasDamaged: false,
      numSpellsCast: 0,
      numHeroAttacks: 0,
      baseCardsPlayed: [],
      unitsSummoned: [],
      heroHpAtTurnStart: 0
    },
    heroAbilityCastsOrTriggersSinceLastTurnStart: 0,
    gameStats: {
      totalHeroHealthLost: 0,
      totalHordeDamage: 0,
      fatigueAmount: 0
    },
    globalCardModifiers: [],
    baseCardSwaps: new Map()
  },
  1: {
    id: 1,
    prisms: playerTwoPrisms,
    mana: 10,
    maxMana: 11,
    doneCardSelection: true,
    bannerSize: 3,
    inspireRepeat: 1,
    gloryRepeat: 1,
    extraManaNextTurn: 1,
    heroAbilityBase: undefined,
    thisTurnStats: {
      alliesDied: [],
      heroHpLost: 0,
      heroHpGained: 0,
      heroAttacked: false,
      heroWasDamaged: false,
      numSpellsCast: 0,
      numHeroAttacks: 0,
      baseCardsPlayed: [],
      unitsSummoned: [],
      heroHpAtTurnStart: 0
    },
    heroAbilityCastsOrTriggersSinceLastTurnStart: 0,
    gameStats: {
      totalHeroHealthLost: 0,
      totalHordeDamage: 0,
      fatigueAmount: 0
    },
    globalCardModifiers: [],
    baseCardSwaps: new Map()
  }
}
