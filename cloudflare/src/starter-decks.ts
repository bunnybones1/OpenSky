import type { DeckClass } from '@opensky/proto'

import { decodeDeckString } from './deck-codec'

export const STRENGTH_STARTER_DECK =
  'SWxSTR0224gSjisS9WiYTUwzdwyc7xYgw9eR2us1aSrgBNHNAnSpFH8P7Sb4RdUXCD8c7FjHgbLwCJXttb1C7upZe7'

const STARTER_DECK_SPECS = [
  {
    key: 'strength',
    name: 'Ada Starter',
    heroId: 1,
    hero: 'ADA',
    deckClass: 'STR',
    deckString: STRENGTH_STARTER_DECK,
    unlocked: true
  },
  {
    key: 'agility',
    name: 'Samya Starter',
    heroId: 2,
    hero: 'SAMYA',
    deckClass: 'AGY',
    deckString:
      'SWxAGY024CAxrwfsrA9eYhhNyQi9pLjFcmGceZxi9zK3oQUVNZFNg42TuUXzo6irh9u49sBQP844boVSuuixb8WA6f',
    unlocked: false
  },
  {
    key: 'wisdom',
    name: 'Lotus Starter',
    heroId: 4,
    hero: 'LOTUS',
    deckClass: 'WIS',
    deckString:
      'SWxWIS02nCENV54aRu9uTosF6Tei62TFXoS481AMhWfBPZaqsXSZuDWLoyrXoZsEct8XSBDhWnT8R74VoXARLx3Sns',
    unlocked: false
  },
  {
    key: 'heart',
    name: 'Bouran Starter',
    heroId: 7,
    hero: 'BOURAN',
    deckClass: 'HRT',
    deckString:
      'SWxHRT02dWkxwmpWSaJL6tFSNjLUNFYvxNt9Xsfcy6D6AFdETPMg1PQhyuKew86KfKJP7hJqbZrcApx1FfMkBVmCyq',
    unlocked: false
  },
  {
    key: 'intellect',
    name: 'Ari Starter',
    heroId: 11,
    hero: 'ARI',
    deckClass: 'INT',
    deckString:
      'SWxINT02e3kzYSxdTHe1948dHZ9g8ieNZm4U8jXhhn29WdfXYn7XbG7QDiXu1bBGyWa79M2fTH1g1k5vYkgPrU4YNj',
    unlocked: false
  }
] as const

export interface StarterDeck {
  key: string
  name: string
  heroId: number
  hero: string
  deckClass: DeckClass
  deckString: string
  cardIds: number[]
  unlocked: boolean
}

export const STARTER_DECKS: StarterDeck[] = STARTER_DECK_SPECS.map(spec => ({
  ...spec,
  deckClass: spec.deckClass as DeckClass,
  cardIds: decodeDeckString(spec.deckString).cardIds
}))

export const STARTER_DECK_BY_HERO_ID = new Map(
  STARTER_DECKS.map(deck => [deck.heroId, deck])
)
