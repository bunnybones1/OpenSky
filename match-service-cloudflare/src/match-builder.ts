import { GameMode } from '@opensky/proto'
import { DECKCLASS_ABILITIES } from '@opensky/shared/constants'
import {
  MatchStartPlayerInfo,
  MatchmakerStartMatchMessage
} from '@opensky/shared/matchmaker-message-types'
import { prismsToDeckClass } from '@opensky/shared/helpers'
import { BaseCard, CardLibrary, PrivateSeed } from '@skyweaver/state-metadata'

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
const normalizePrisms = (value: unknown) => {
  if (
    !Array.isArray(value) ||
    value.length < 1 ||
    value.length > 2 ||
    value.some(prism => typeof prism !== 'string' || !validPrisms.has(prism))
  ) {
    throw new DispatchProtocolError('invalid private seed prisms')
  }
  return value as string[]
}

const normalizeCards = (
  value: unknown,
  unlocked: Map<number, unknown>,
  mode: GameMode
) => {
  const values = value === undefined ? [] : value
  if (!Array.isArray(values)) {
    throw new DispatchProtocolError('invalid private seed cards')
  }
  if (discoveryModes.has(mode) && values.length !== 0) {
    throw new DispatchProtocolError('DECK_IS_NOT_RANDOM')
  }
  if (values.length > 30) {
    throw new DispatchProtocolError('invalid deck: more than 30 cards')
  }
  const cards = values.map(card => String(card) as BaseCard)
  if (new Set(cards).size !== cards.length) {
    throw new DispatchProtocolError('invalid deck: duplicate cards')
  }
  const cardPrisms = new Set<string>()
  for (const card of cards) {
    const numeric = Number(card)
    const metadata = CardLibrary.get(card)
    if (
      !/^\d+$/.test(card) ||
      !metadata ||
      !Number.isSafeInteger(numeric) ||
      !unlocked.has(numeric)
    ) {
      throw new DispatchProtocolError(`card ${card} is not unlocked`)
    }
    cardPrisms.add(metadata.prism)
  }
  if (cardPrisms.size > 2) {
    throw new DispatchProtocolError('invalid deck: more than two prisms')
  }
  return cards
}

const humanParticipant = async (
  participant: AcceptedMatchParticipant,
  repository: MatchRepository,
  currentSeason: number
): Promise<{ info: MatchStartPlayerInfo; userId: string; level: number }> => {
  const request = participant.request!
  const identity = participant.identity!
  const seed = request.privateSeed
  const prisms = normalizePrisms(seed.prisms)
  const profile = await repository.humanAccount(
    identity.userId,
    identity.principal,
    prisms,
    currentSeason,
    request.mode
  )
  const cards = normalizeCards(seed.cards, profile.unlockedCards, request.mode)
  if (
    !validByteArray(seed.subkey, 20) ||
    !validByteArray(seed.randomSeed, 16)
  ) {
    throw new DispatchProtocolError('invalid private seed key material')
  }
  const signature = validByteArray(seed.signature, 65)
    ? seed.signature
    : Array(65).fill(0)
  const cardSet = new Set(cards)
  const heroAbility =
    DECKCLASS_ABILITIES[prismsToDeckClass(prisms as PrivateSeed['prisms'])]
  const privateSeed: PrivateSeed = {
    player: hexToBytes(identity.principal),
    subkey: seed.subkey,
    signature,
    prisms: prisms as PrivateSeed['prisms'],
    heroAbility,
    cards,
    randomSeed: seed.randomSeed,
    // The original matchmaker replaced client-supplied rarity claims with the
    // inventory it loaded from the API. Keep this a plain object so it survives
    // the JSON service hop into the game Durable Object.
    cardRarities: Object.fromEntries(
      [...profile.unlockedCards]
        .filter(([card]) => cardSet.has(String(card) as BaseCard))
        .map(([card, rarity]) => [String(card), rarity])
    ) as never
  }
  return {
    userId: identity.userId,
    level: profile.level,
    info: {
      privateSeed,
      gameMode: request.mode,
      account: profile.account,
      ...(profile.conquestInfo ? { conquestInfo: profile.conquestInfo } : {}),
      playerSessionID: request.playerSessionID,
      botSubkey: false,
      spectateCode: profile.spectateCode,
      quests: profile.quests
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
    dispatch.participants.map(participant =>
      participant.player.address === BOT_PLACEHOLDER
        ? undefined
        : humanParticipant(participant, repository, season)
    )
  )
  const humanLevel = humans.find(human => human)?.level ?? 0
  const infos = dispatch.participants.map((participant, index) =>
    participant.player.address === BOT_PLACEHOLDER
      ? createBotParticipant(participant.player.mode, humanLevel)
      : humans[index]!.info
  ) as [MatchStartPlayerInfo, MatchStartPlayerInfo]
  const hasBot = dispatch.participants.some(
    participant => participant.player.address === BOT_PLACEHOLDER
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
        // Source customgameservers/client.go uses player one's normalized
        // session verbatim, including the empty non-challenge value.
        matchmakingCode: dispatch.participants[0].player.sessionId,
        ...(hasBot ? { botDifficulty: botDifficultyForLevel(humanLevel) } : {})
      }
    }
  }
}
