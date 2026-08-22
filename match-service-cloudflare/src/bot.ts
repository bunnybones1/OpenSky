import { keccak_256 } from '@noble/hashes/sha3'
import { getPublicKey, utils } from '@noble/secp256k1'
import { DeckClass, GameMode } from '@opensky/proto'
import { AccountWithPrismsAndCosmeticsInfo } from '@opensky/shared/game-server-message-types'
import { MatchStartPlayerInfo } from '@opensky/shared/matchmaker-message-types'
import { PrivateSeed } from '@skyweaver/state-metadata'

import { bytesToHex } from './encoding'
import { STARTER_DECKS } from '../../cloudflare/src/starter-decks'

const BOT_NAMES = [
  'Short Circuit',
  'Beta',
  'Majordomo',
  'ASTAR',
  'Largefuse',
  'Mecha Gygax'
]

const randomBytes = (length: number) => {
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  return bytes
}

export const createBotPrivateKey = () => {
  for (;;) {
    const candidate = randomBytes(32)
    if (utils.isValidPrivateKey(candidate)) return candidate
  }
}

export const addressForBotPrivateKey = (key: Uint8Array) => {
  const publicKey = getPublicKey(key, false)
  return bytesToHex(keccak_256(publicKey.slice(1)).slice(-20)).toLowerCase()
}

export const botDifficultyForLevel = (level: number) =>
  Math.floor((0.3 + Math.min(15, Math.max(0, level)) * (0.7 / 15)) * 100) / 100

// Source oracle: matchmaker/lib/player/bot.Difficulty forces the guided Warm
// Up opponent to full strength. Other bot modes retain the level curve.
export const botDifficultyForPlayer = (mode: GameMode, level: number) =>
  mode === GameMode.WARM_UP ? 1 : botDifficultyForLevel(level)

const sourceBotDeckRules = [
  { minimumLevel: 0, deckClass: DeckClass.STR, heroAbility: '25000' },
  { minimumLevel: 6, deckClass: DeckClass.AGY, heroAbility: '25001' },
  { minimumLevel: 11, deckClass: DeckClass.WIS, heroAbility: '25004' },
  { minimumLevel: 16, deckClass: DeckClass.HRT, heroAbility: '25002' },
  { minimumLevel: 21, deckClass: DeckClass.INT, heroAbility: '25003' }
] as const

export interface SourceBotDeck {
  minimumLevel: number
  deckClass: DeckClass
  prism: PrivateSeed['prisms'][number]
  heroAbility: string
  cardIds: number[]
}

const sourceBotDecks = sourceBotDeckRules.map(rule => {
  const deck = STARTER_DECKS.find(
    candidate => candidate.deckClass === rule.deckClass
  )
  if (!deck) throw new Error(`source bot deck is missing: ${rule.deckClass}`)
  return {
    ...rule,
    prism: rule.deckClass.toLowerCase() as PrivateSeed['prisms'][number],
    cardIds: deck.cardIds
  }
}) satisfies SourceBotDeck[]

export const sourceBotDecksForLevel = (level: number) =>
  sourceBotDecks.filter(deck => deck.minimumLevel <= level)

const randomSourceBotDeckIndex = (length: number) => {
  const ceiling = 0x1_0000_0000
  const unbiasedLimit = ceiling - (ceiling % length)
  const sample = new Uint32Array(1)
  do crypto.getRandomValues(sample)
  while (sample[0] >= unbiasedLimit)
  return sample[0] % length
}

export const selectSourceBotDeck = (
  level: number,
  pickIndex: (length: number) => number = randomSourceBotDeckIndex
) => {
  const decks = sourceBotDecksForLevel(level)
  const index = pickIndex(decks.length)
  if (!Number.isInteger(index) || index < 0 || index >= decks.length) {
    throw new Error('source bot deck selector returned an invalid index')
  }
  return decks[index]
}

// BotMatchMatcher uses the unregistered level-gated source pool only for the
// always-bot modes. Ranked queues use Go's separate registered-account path,
// which remains isolated behind ENABLE_RANKED_BOTS.
const botDeckForPlayer = (mode: GameMode, level: number) =>
  mode === GameMode.PRACTICE_BOT || mode === GameMode.WARM_UP
    ? selectSourceBotDeck(level)
    : sourceBotDecks[0]

export const createBotParticipant = (
  mode: MatchStartPlayerInfo['gameMode'],
  opponentLevel: number
): MatchStartPlayerInfo => {
  const walletKey = createBotPrivateKey()
  const subkey = createBotPrivateKey()
  const address = addressForBotPrivateKey(walletKey)
  const subkeyAddress = addressForBotPrivateKey(subkey)
  const difficulty = botDifficultyForPlayer(mode, opponentLevel)
  const deck = botDeckForPlayer(mode, opponentLevel)
  const createdAt = '2020-01-01T00:00:00.000Z'
  const privateSeed: PrivateSeed = {
    player: [...hexAddressBytes(address)],
    subkey: [...hexAddressBytes(subkeyAddress)],
    signature: Array(65).fill(0),
    prisms: [deck.prism],
    heroAbility: deck.heroAbility,
    cards: deck.cardIds.map(String) as PrivateSeed['cards'],
    randomSeed: [...randomBytes(16)],
    cardRarities: new Map()
  }
  const account = {
    id: 0,
    address,
    name: BOT_NAMES[Math.round(difficulty * (BOT_NAMES.length - 1))],
    locale: 'en',
    warmUps: 0,
    level: 12,
    levelUpXP: 120,
    createdAt,
    updatedAt: createdAt,
    prisms: [deck.prism],
    deckEquipment: { stickers: [] }
  } as unknown as AccountWithPrismsAndCosmeticsInfo
  return {
    privateSeed,
    gameMode: mode,
    account,
    playerSessionID: crypto.randomUUID(),
    botSubkey: bytesToHex(subkey),
    spectateCode: crypto.randomUUID(),
    quests: []
  }
}

const hexAddressBytes = (address: string) => {
  const bytes = new Uint8Array(20)
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(
      address.slice(2 + index * 2, 4 + index * 2),
      16
    )
  }
  return bytes
}
