import { CardClass, DeckClass, GameMode } from '@opensky/proto'

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

export const prismsFromPrivateSeed = (
  privateSeed: Record<string, unknown>
) => {
  const values = Array.isArray(privateSeed.prisms) ? privateSeed.prisms : []
  return values
    .map(value => (typeof value === 'string' ? prismMap[value] : undefined))
    .filter((value): value is CardClass => value !== undefined)
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
export const validateGameModeDataConsistency = (
  command: FindMatchCommand
) => {
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
