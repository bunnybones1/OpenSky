import { CardClass, DeckClass, GameMode } from '@opensky/proto'
import { BaseCard, CardLibrary } from '@skyweaver/state-metadata'

import { prismsToDeckClass } from './model'
import { FindMatchCommand, ProtocolError } from './protocol'

const prismMap: Record<string, CardClass> = {
  str: CardClass.STR,
  hrt: CardClass.HRT,
  agy: CardClass.AGY,
  int: CardClass.INT,
  wis: CardClass.WIS,
  tok: CardClass.TOK,
  STR: CardClass.STR,
  HRT: CardClass.HRT,
  AGY: CardClass.AGY,
  INT: CardClass.INT,
  WIS: CardClass.WIS,
  TOK: CardClass.TOK
}

const validByteArray = (value: unknown, length: number): value is number[] =>
  Array.isArray(value) &&
  value.length === length &&
  value.every(byte => Number.isInteger(byte) && byte >= 0 && byte <= 255)

const principalBytes = (principal: string) => {
  const bytes: number[] = []
  for (let index = 2; index < principal.length; index += 2) {
    bytes.push(Number.parseInt(principal.slice(index, index + 2), 16))
  }
  return bytes
}

export const prismsFromPrivateSeed = (privateSeed: Record<string, unknown>) => {
  const values = Array.isArray(privateSeed.prisms) ? privateSeed.prisms : []
  return values
    .map(value => (typeof value === 'string' ? prismMap[value] : undefined))
    .filter((value): value is CardClass => value !== undefined)
}

const invalidPrivateSeed = () =>
  new ProtocolError('INVALID_PRIVATE_SEED', 'INVALID_PRIVATE_SEED')

// The Google session at the gateway replaces the source JWT's account claim as
// identity authority. Canonicalize the remaining wire types exactly once so a
// malformed seed cannot occupy durable queue/proposal state.
export const normalizePrivateSeedForIdentity = (
  command: FindMatchCommand,
  principal: string
): FindMatchCommand => {
  const seed = command.privateSeed
  const prisms = prismsFromPrivateSeed(seed)
  const rawPrisms = seed.prisms
  const rawCards = seed.cards === undefined ? [] : seed.cards
  if (
    !/^0x[0-9a-f]{40}$/.test(principal) ||
    !validByteArray(seed.subkey, 20) ||
    !validByteArray(seed.randomSeed, 16) ||
    !Array.isArray(rawPrisms) ||
    rawPrisms.length < 1 ||
    rawPrisms.length > 2 ||
    prisms.length !== rawPrisms.length ||
    prismsToDeckClass(prisms) === DeckClass.UNKNOWN_CLASS ||
    !Array.isArray(rawCards) ||
    rawCards.length > 5_000
  ) {
    throw invalidPrivateSeed()
  }

  let cards: string[]
  try {
    cards = rawCards.map(card => {
      if (typeof card !== 'string' || !/^\+?\d+$/.test(card)) {
        throw invalidPrivateSeed()
      }
      const numeric = BigInt(card)
      if (numeric > 0xffffffffffffffffn) throw invalidPrivateSeed()
      return numeric.toString()
    })
  } catch (error) {
    if (error instanceof ProtocolError) throw error
    throw invalidPrivateSeed()
  }

  return {
    ...command,
    privateSeed: {
      ...seed,
      player: principalBytes(principal),
      subkey: [...seed.subkey],
      signature: validByteArray(seed.signature, 65)
        ? [...seed.signature]
        : Array(65).fill(0),
      prisms: prisms.map(prism => prism.toLowerCase()),
      cards,
      randomSeed: [...seed.randomSeed],
      // Source player.setPrivateSeed never trusts this client claim.
      cardRarities: {}
    }
  }
}

const isRandomPrivateSeed = (privateSeed: Record<string, unknown>) => {
  const cards = privateSeed.cards
  const prisms = prismsFromPrivateSeed(privateSeed)
  return (
    (cards === undefined || (Array.isArray(cards) && cards.length === 0)) &&
    prismsToDeckClass(prisms) !== DeckClass.UNKNOWN_CLASS
  )
}

// Source oracle: frontend/findmatch/validators/game_mode_data_consistency.go.
// Preserve both the accepted combinations and the source error ordering.
export const validateGameModeDataConsistency = (command: FindMatchCommand) => {
  const randomDeck = isRandomPrivateSeed(command.privateSeed)
  switch (command.mode) {
    case GameMode.RANKED_DISCOVERY:
    case GameMode.CONQUEST_DISCOVERY:
      if (!randomDeck) {
        throw new ProtocolError('DECK_IS_NOT_RANDOM', 'DECK_IS_NOT_RANDOM')
      }
      return
    case GameMode.CHALLENGE_CONSTRUCTED:
      if (command.sessionID.length === 0) {
        throw new ProtocolError('SESSION_IS_EMPTY', 'SESSION_IS_EMPTY')
      }
      return
    case GameMode.CHALLENGE_DISCOVERY:
      if (command.sessionID.length === 0) {
        throw new ProtocolError('SESSION_IS_EMPTY', 'SESSION_IS_EMPTY')
      }
      if (!randomDeck) {
        throw new ProtocolError('DECK_IS_NOT_RANDOM', 'DECK_IS_NOT_RANDOM')
      }
      return
  }
}

const invalidDeck = () => new ProtocolError('SERVER_ERROR', 'invalid deck')

// Source oracle: player_factory.go removes unowned cards before deck.go calls
// CheckDeck. The API then rejects duplicates/oversize through ownership/count
// checks and rejects decks spanning more than two card prisms. Return the
// filtered command so durable tickets and dispatch carry the same deck the Go
// player factory placed in PrivateSeed, not the browser's unowned claims.
export const validateOwnedDeckForAdmission = (
  command: FindMatchCommand,
  ownedCardIds: Iterable<number>
): FindMatchCommand => {
  const rawCards = command.privateSeed.cards
  if (
    !Array.isArray(rawCards) ||
    rawCards.some(card => typeof card !== 'string')
  ) {
    throw invalidPrivateSeed()
  }

  const owned = new Set([...ownedCardIds].map(card => String(card)))
  const cards = rawCards.filter(
    (card): card is string =>
      typeof card === 'string' &&
      owned.has(card) &&
      CardLibrary.has(card as BaseCard)
  )
  cards.sort((left, right) => Number(left) - Number(right))
  if (cards.length > 30 || new Set(cards).size !== cards.length) {
    throw invalidDeck()
  }

  const cardPrisms = new Set(
    cards.map(card => CardLibrary.get(card as BaseCard)!.prism)
  )
  if (cardPrisms.size > 2) throw invalidDeck()

  return {
    ...command,
    privateSeed: {
      ...command.privateSeed,
      cards
    }
  }
}
