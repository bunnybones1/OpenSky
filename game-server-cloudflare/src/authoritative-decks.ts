import { DeckClass } from '@opensky/proto'
import { encode, VERSION } from '@opensky/deck-string-codec'
import { CODE_PRISMS, PrismClass } from '@opensky/shared/constants'
import { BaseCard, CardLibrary } from '@skyweaver/state-metadata'

import { decodeDeckString } from '../../cloudflare/src/deck-codec'

const COMPLETE_DECK_SIZE = 30

export type RealDeckStrings = [string, string]

export interface AuthoritativeMatchDeck {
  deckString: string
  deckClass: DeckClass
  cardIds: number[]
}

interface AuthoritativeDeckRow {
  player_index: 0 | 1
  deck_string: string
}

export class AuthoritativeMatchDeckError extends Error {}

const validateDeck = (deckString: string): AuthoritativeMatchDeck => {
  let decoded: ReturnType<typeof decodeDeckString>
  try {
    decoded = decodeDeckString(deckString)
  } catch {
    throw new AuthoritativeMatchDeckError(
      'authoritative match deck is malformed'
    )
  }
  const { cardIds, deckClass } = decoded
  if (
    cardIds.length !== COMPLETE_DECK_SIZE ||
    cardIds.some(
      cardId =>
        !Number.isSafeInteger(cardId) ||
        cardId <= 0 ||
        !CardLibrary.has(String(cardId) as BaseCard)
    )
  ) {
    throw new AuthoritativeMatchDeckError(
      'authoritative match deck is malformed'
    )
  }

  const allowedPrisms = CODE_PRISMS[deckClass]
  const cardPrisms = new Set<PrismClass>()
  for (const cardId of cardIds) {
    const prism = CardLibrary.get(
      String(cardId) as BaseCard
    )!.prism.toUpperCase()
    if (prism in PrismClass) cardPrisms.add(prism as PrismClass)
  }
  if (
    allowedPrisms.length < 1 ||
    cardPrisms.size < 1 ||
    [...cardPrisms].some(prism => !allowedPrisms.includes(prism))
  ) {
    throw new AuthoritativeMatchDeckError(
      'authoritative match deck is malformed'
    )
  }

  return { deckString, deckClass, cardIds }
}

/**
 * Mirrors server/src/worker/match/Match.ts: the source captures the first
 * WASM `secret.filledDeck` for each player and encodes it with the submitted
 * prism-derived class. These are the strings later stored on data.Match.
 */
export const realDeckStringsFromFilledDecks = (
  filledDecks: [readonly BaseCard[], readonly BaseCard[]],
  deckClasses: [DeckClass, DeckClass]
): RealDeckStrings =>
  filledDecks.map((cards, player) => {
    const deckString = encode(VERSION, [...cards], deckClasses[player])
    if (!deckString) {
      throw new AuthoritativeMatchDeckError(
        'authoritative match deck could not be encoded'
      )
    }
    return validateDeck(deckString).deckString
  }) as RealDeckStrings

export const decodeAuthoritativeMatchDeck = (deckString: string) =>
  validateDeck(deckString)

export const readAuthoritativeMatchDeckStrings = async (
  database: D1Database,
  proposalId: string
): Promise<RealDeckStrings> => {
  const rows = await database
    .prepare(
      `SELECT player_index, deck_string
       FROM multiplayer_match_authoritative_decks
       WHERE proposal_id = ? ORDER BY player_index`
    )
    .bind(proposalId)
    .all<AuthoritativeDeckRow>()
  if (
    rows.results.length !== 2 ||
    rows.results[0]?.player_index !== 0 ||
    rows.results[1]?.player_index !== 1
  ) {
    throw new AuthoritativeMatchDeckError(
      'authoritative match decks are incomplete'
    )
  }
  return [rows.results[0].deck_string, rows.results[1].deck_string]
}

export const readAuthoritativeMatchDecks = async (
  database: D1Database,
  proposalId: string
): Promise<[AuthoritativeMatchDeck, AuthoritativeMatchDeck]> => {
  const deckStrings = await readAuthoritativeMatchDeckStrings(
    database,
    proposalId
  )
  return [validateDeck(deckStrings[0]), validateDeck(deckStrings[1])]
}

/**
 * Installs both source deck strings with one statement. A partial or
 * conflicting prior snapshot is never repaired silently: the post-read must
 * exactly match both strings or match finalization fails closed.
 */
export const persistAuthoritativeMatchDecks = async (
  database: D1Database,
  proposalId: string,
  deckStrings: RealDeckStrings,
  capturedAt: string
) => {
  validateDeck(deckStrings[0])
  validateDeck(deckStrings[1])
  await database
    .prepare(
      `INSERT INTO multiplayer_match_authoritative_decks
         (proposal_id, player_index, deck_string, captured_at)
       SELECT ?, candidate.player_index, candidate.deck_string, ?
       FROM (
         SELECT 0 AS player_index, ? AS deck_string
         UNION ALL SELECT 1, ?
       ) candidate
       WHERE NOT EXISTS (
         SELECT 1 FROM multiplayer_match_authoritative_decks
         WHERE proposal_id = ?
       )`
    )
    .bind(proposalId, capturedAt, deckStrings[0], deckStrings[1], proposalId)
    .run()

  const stored = await readAuthoritativeMatchDeckStrings(database, proposalId)
  if (stored[0] !== deckStrings[0] || stored[1] !== deckStrings[1]) {
    throw new AuthoritativeMatchDeckError(
      'authoritative match decks conflict with the WASM snapshot'
    )
  }
}
