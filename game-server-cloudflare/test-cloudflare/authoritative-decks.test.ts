import { env } from 'cloudflare:test'
import { DeckClass, GameMode } from '@opensky/proto'
import type { BaseCard } from '@skyweaver/state-metadata'
import { beforeEach, describe, expect, it } from 'vitest'

import cardLibrary from '../../cloudflare/src/generated/card-library.json'
import {
  persistAuthoritativeMatchDecks,
  readAuthoritativeMatchDecks,
  realDeckStringsFromFilledDecks
} from '../src/authoritative-decks'

const NOW = '2026-08-20T12:00:00.000Z'
const strengthCards = cardLibrary.cards
  .filter(card => card.class === 'STR')
  .map(card => String(card.id) as BaseCard)
const filledDecks = [
  strengthCards.slice(0, 30),
  strengthCards.slice(30, 60)
] as [BaseCard[], BaseCard[]]

const insertMatch = (proposalId: string) =>
  env.AUTH_DB.prepare(
    `INSERT INTO multiplayer_matches
       (proposal_id, replay_id, mode, version, player1_principal,
        player2_principal, match_payload_json, status, created_at, updated_at)
     VALUES (?, ?, ?, 'test',
             '0x1111111111111111111111111111111111111111',
             '0x2222222222222222222222222222222222222222',
             '{}', 'active', ?, ?)`
  )
    .bind(
      proposalId,
      `replay-${proposalId}`,
      GameMode.RANKED_CONSTRUCTED,
      NOW,
      NOW
    )
    .run()

beforeEach(async () => {
  await env.AUTH_DB.prepare('DELETE FROM multiplayer_matches').run()
})

describe('authoritative WASM-filled match decks', () => {
  it('persists both source deck strings once and reads their exact cards', async () => {
    const proposalId = 'authoritative-decks-once'
    await insertMatch(proposalId)
    const strings = realDeckStringsFromFilledDecks(filledDecks, [
      DeckClass.STR,
      DeckClass.STR
    ])

    await persistAuthoritativeMatchDecks(env.AUTH_DB, proposalId, strings, NOW)
    await persistAuthoritativeMatchDecks(
      env.AUTH_DB,
      proposalId,
      strings,
      '2026-08-20T12:01:00.000Z'
    )

    const stored = await readAuthoritativeMatchDecks(env.AUTH_DB, proposalId)
    expect(stored.map(deck => deck.deckString)).toEqual(strings)
    expect(stored.map(deck => deck.cardIds)).toEqual(
      filledDecks.map(cards => cards.map(Number))
    )
    expect(
      await env.AUTH_DB.prepare(
        `SELECT player_index, captured_at
         FROM multiplayer_match_authoritative_decks
         WHERE proposal_id = ? ORDER BY player_index`
      )
        .bind(proposalId)
        .all()
    ).toMatchObject({
      results: [
        { player_index: 0, captured_at: NOW },
        { player_index: 1, captured_at: NOW }
      ]
    })
  })

  it('rejects updates, direct deletes, and partial repair', async () => {
    const proposalId = 'authoritative-decks-guards'
    await insertMatch(proposalId)
    const strings = realDeckStringsFromFilledDecks(filledDecks, [
      DeckClass.STR,
      DeckClass.STR
    ])
    await env.AUTH_DB.prepare(
      `INSERT INTO multiplayer_match_authoritative_decks
         (proposal_id, player_index, deck_string, captured_at)
       VALUES (?, 0, ?, ?)`
    )
      .bind(proposalId, strings[0], NOW)
      .run()

    await expect(
      persistAuthoritativeMatchDecks(env.AUTH_DB, proposalId, strings, NOW)
    ).rejects.toThrow('authoritative match decks are incomplete')
    expect(
      await env.AUTH_DB.prepare(
        `SELECT COUNT(*) AS count FROM multiplayer_match_authoritative_decks
         WHERE proposal_id = ?`
      )
        .bind(proposalId)
        .first('count')
    ).toBe(1)
    await expect(
      env.AUTH_DB.prepare(
        `UPDATE multiplayer_match_authoritative_decks SET captured_at = ?
         WHERE proposal_id = ?`
      )
        .bind('2026-08-20T12:02:00.000Z', proposalId)
        .run()
    ).rejects.toThrow('authoritative match decks are immutable')
    await expect(
      env.AUTH_DB.prepare(
        `DELETE FROM multiplayer_match_authoritative_decks
         WHERE proposal_id = ?`
      )
        .bind(proposalId)
        .run()
    ).rejects.toThrow('authoritative match decks are immutable')
  })

  it('rejects a conflicting retry without replacing either deck', async () => {
    const proposalId = 'authoritative-decks-conflict'
    await insertMatch(proposalId)
    const strings = realDeckStringsFromFilledDecks(filledDecks, [
      DeckClass.STR,
      DeckClass.STR
    ])
    await persistAuthoritativeMatchDecks(env.AUTH_DB, proposalId, strings, NOW)

    await expect(
      persistAuthoritativeMatchDecks(
        env.AUTH_DB,
        proposalId,
        [strings[1], strings[0]],
        NOW
      )
    ).rejects.toThrow('conflict with the WASM snapshot')
    expect(
      (await readAuthoritativeMatchDecks(env.AUTH_DB, proposalId)).map(
        deck => deck.deckString
      )
    ).toEqual(strings)
  })

  it('fails closed for a syntactically plausible but malformed deck string', async () => {
    const proposalId = 'authoritative-decks-malformed'
    await insertMatch(proposalId)
    await env.AUTH_DB.prepare(
      `INSERT INTO multiplayer_match_authoritative_decks
         (proposal_id, player_index, deck_string, captured_at)
       VALUES (?, 0, 'SWxSTR02zzzz', ?), (?, 1, 'SWxSTR02zzzz', ?)`
    )
      .bind(proposalId, NOW, proposalId, NOW)
      .run()

    await expect(
      readAuthoritativeMatchDecks(env.AUTH_DB, proposalId)
    ).rejects.toThrow('authoritative match deck is malformed')
  })
})
