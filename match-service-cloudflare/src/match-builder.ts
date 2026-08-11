import { GameMode } from '@opensky/proto'
import { MatchStartPlayerInfo, MatchmakerStartMatchMessage } from '@opensky/shared/matchmaker-message-types'
import {
  BaseCard,
  CardLibrary,
  PrivateSeed,
  Rarity
} from '@skyweaver/state-metadata'

import { botDifficultyForLevel, createBotParticipant } from './bot'
import { hexToBytes, validByteArray } from './encoding'
import {
  AcceptedMatchDispatch,
  AcceptedMatchParticipant,
  BOT_PLACEHOLDER,
  DispatchProtocolError
} from './protocol'
import { MatchRepository } from './repository'

const discoveryModes = new Set<GameMode>([
  GameMode.RANKED_DISCOVERY,
  GameMode.CONQUEST_DISCOVERY,
  GameMode.CHALLENGE_DISCOVERY
])
const validPrisms = new Set(['str', 'hrt', 'agy', 'int', 'wis'])
const validRarities = new Set<Rarity>(['base', 'silver', 'gold'])

const normalizeRarities = (
  value: unknown,
  cards: Set<BaseCard>
): Map<BaseCard, Rarity> => {
  const entries =
    value instanceof Map
      ? [...value.entries()]
      : Array.isArray(value)
        ? value
        : typeof value === 'object' && value !== null
          ? Object.entries(value)
          : []
  const result = new Map<BaseCard, Rarity>()
  for (const entry of entries) {
    if (!Array.isArray(entry) || entry.length !== 2) continue
    const card = String(entry[0]) as BaseCard
    const rarity = entry[1] as Rarity
    if (cards.has(card) && validRarities.has(rarity)) result.set(card, rarity)
  }
  return result
}

const normalizePrisms = (value: unknown) => {
  if (
    !Array.isArray(value) ||
    value.length < 1 ||
    value.length > 2 ||
    value.some((prism) => typeof prism !== 'string' || !validPrisms.has(prism))
  ) {
    throw new DispatchProtocolError('invalid private seed prisms')
  }
  return value as string[]
}

const normalizeCards = (
  value: unknown,
  unlocked: Set<number>,
  mode: GameMode
) => {
  if (!Array.isArray(value) || value.length > 60) {
    throw new DispatchProtocolError('invalid private seed cards')
  }
  const cards = value.map((card) => String(card) as BaseCard)
  if (!discoveryModes.has(mode) && cards.length === 0) {
    throw new DispatchProtocolError('constructed decks cannot be empty')
  }
  for (const card of cards) {
    const numeric = Number(card)
    if (!CardLibrary.has(card) || !Number.isSafeInteger(numeric) || !unlocked.has(numeric)) {
      throw new DispatchProtocolError(`card ${card} is not unlocked`)
    }
  }
  return cards
}

const humanParticipant = async (
  participant: AcceptedMatchParticipant,
  repository: MatchRepository
): Promise<{ info: MatchStartPlayerInfo; userId: string; level: number }> => {
  const request = participant.request!
  const identity = participant.identity!
  const seed = request.privateSeed
  const prisms = normalizePrisms(seed.prisms)
  const profile = await repository.humanAccount(identity.userId, identity.principal, prisms)
  const cards = normalizeCards(seed.cards, profile.unlockedCards, request.mode)
  if (!validByteArray(seed.subkey, 20) || !validByteArray(seed.randomSeed, 16)) {
    throw new DispatchProtocolError('invalid private seed key material')
  }
  const signature = validByteArray(seed.signature, 65)
    ? seed.signature
    : Array(65).fill(0)
  const cardSet = new Set(cards)
  const privateSeed: PrivateSeed = {
    player: hexToBytes(identity.principal),
    subkey: seed.subkey,
    signature,
    prisms: prisms as PrivateSeed['prisms'],
    heroAbility:
      typeof seed.heroAbility === 'string'
        ? (seed.heroAbility as BaseCard)
        : undefined,
    cards,
    randomSeed: seed.randomSeed,
    cardRarities: normalizeRarities(seed.cardRarities, cardSet)
  }
  return {
    userId: identity.userId,
    level: profile.level,
    info: {
      privateSeed,
      gameMode: request.mode,
      account: profile.account,
      playerSessionID: request.playerSessionID,
      botSubkey: false,
      spectateCode: crypto.randomUUID(),
      quests: []
    }
  }
}

export interface BuiltMatch {
  match: MatchmakerStartMatchMessage
  userIds: [string | undefined, string | undefined]
}

export const buildMatch = async (
  dispatch: AcceptedMatchDispatch,
  matchId: number,
  replayId: string,
  season: number,
  turnTimer: boolean,
  repository: MatchRepository
): Promise<BuiltMatch> => {
  const humans = await Promise.all(
    dispatch.participants.map((participant) =>
      participant.player.address === BOT_PLACEHOLDER
        ? undefined
        : humanParticipant(participant, repository)
    )
  )
  const humanLevel = humans.find((human) => human)?.level ?? 0
  const infos = dispatch.participants.map((participant, index) =>
    participant.player.address === BOT_PLACEHOLDER
      ? createBotParticipant(participant.player.mode, humanLevel)
      : humans[index]!.info
  ) as [MatchStartPlayerInfo, MatchStartPlayerInfo]
  const hasBot = dispatch.participants.some(
    (participant) => participant.player.address === BOT_PLACEHOLDER
  )
  return {
    userIds: [humans[0]?.userId, humans[1]?.userId],
    match: {
      type: 'start_match',
      matchID: matchId,
      replayID: replayId,
      player1: infos[0],
      player2: infos[1],
      matchSettings: {
        turnTimer,
        season,
        matchmakingCode: undefined,
        ...(hasBot ? { botDifficulty: botDifficultyForLevel(humanLevel) } : {})
      }
    }
  }
}
