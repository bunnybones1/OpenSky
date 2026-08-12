import { keccak_256 } from '@noble/hashes/sha3'
import { getPublicKey, utils } from '@noble/secp256k1'
import { AccountWithPrismsAndCosmeticsInfo } from '@opensky/shared/game-server-message-types'
import { MatchStartPlayerInfo } from '@opensky/shared/matchmaker-message-types'
import { PrivateSeed } from '@skyweaver/state-metadata'

import { bytesToHex } from './encoding'

const STARTER_CARD_IDS = [
  6, 68, 136, 137, 138, 139, 141, 142, 143, 144, 145, 146, 147, 148, 149,
  150, 151, 152, 153, 154, 155, 156, 157, 158, 159, 160, 161, 162, 163, 164
]
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

const privateKey = () => {
  for (;;) {
    const candidate = randomBytes(32)
    if (utils.isValidPrivateKey(candidate)) return candidate
  }
}

const addressForPrivateKey = (key: Uint8Array) => {
  const publicKey = getPublicKey(key, false)
  return bytesToHex(keccak_256(publicKey.slice(1)).slice(-20)).toLowerCase()
}

export const botDifficultyForLevel = (level: number) =>
  Math.floor((0.3 + Math.min(15, Math.max(0, level)) * (0.7 / 15)) * 100) / 100

export const createBotParticipant = (
  mode: MatchStartPlayerInfo['gameMode'],
  opponentLevel: number
): MatchStartPlayerInfo => {
  const walletKey = privateKey()
  const subkey = privateKey()
  const address = addressForPrivateKey(walletKey)
  const subkeyAddress = addressForPrivateKey(subkey)
  const difficulty = botDifficultyForLevel(opponentLevel)
  const createdAt = '2020-01-01T00:00:00.000Z'
  const privateSeed: PrivateSeed = {
    player: [...hexAddressBytes(address)],
    subkey: [...hexAddressBytes(subkeyAddress)],
    signature: Array(65).fill(0),
    prisms: ['str'],
    heroAbility: '25000',
    cards: STARTER_CARD_IDS.map(String) as PrivateSeed['cards'],
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
    prisms: ['str'],
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
    bytes[index] = Number.parseInt(address.slice(2 + index * 2, 4 + index * 2), 16)
  }
  return bytes
}
