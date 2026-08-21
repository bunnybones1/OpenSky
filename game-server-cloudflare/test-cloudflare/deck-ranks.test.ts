import { env } from 'cloudflare:test'
import { DeckClass, GameMode, MatchStatus, PlayerRank } from '@opensky/proto'
import type { BaseCard } from '@skyweaver/state-metadata'
import { beforeEach, describe, expect, it } from 'vitest'

import cardLibrary from '../../cloudflare/src/generated/card-library.json'
import { encodeDeckString } from '../../cloudflare/src/deck-codec'
import {
  persistAuthoritativeMatchDecks,
  realDeckStringsFromFilledDecks
} from '../src/authoritative-decks'
import { applyDeckRanks } from '../src/deck-ranks'

const USER_1 = 'deck-rank-player-one'
const USER_2 = 'deck-rank-player-two'
const NOW = '2026-08-13T12:00:00.000Z'
const REVISION = cardLibrary.sourceSha256
const deck1 = cardLibrary.cards
  .filter(card => card.class === 'STR')
  .slice(0, 30)
  .map(card => card.id)
const deck2 = cardLibrary.cards
  .filter(card => card.class === 'STR')
  .slice(30, 60)
  .map(card => card.id)
const baseCards = (cards: number[]) =>
  cards.map(card => String(card) as BaseCard)

const payload = (left = deck1, right = deck2) =>
  JSON.stringify({
    match: {
      matchSettings: { season: 126 },
      player1: { privateSeed: { cards: left, prisms: ['str'] } },
      player2: { privateSeed: { cards: right, prisms: ['str'] } }
    }
  })

const setup = async (
  proposalId: string,
  options: {
    mode?: GameMode
    playerModes?: [GameMode, GameMode]
    leftRank?: PlayerRank
    rightRank?: PlayerRank
    payload?: string
    decks?: [number[], number[]]
  } = {}
) => {
  await env.AUTH_DB.batch([
    env.AUTH_DB.prepare(
      `INSERT INTO users
         (id, display_name, primary_email, created_at, updated_at)
       VALUES (?, 'Rank One', ?, ?, ?), (?, 'Rank Two', ?, ?, ?)`
    ).bind(
      USER_1,
      `${proposalId}-one@example.com`,
      NOW,
      NOW,
      USER_2,
      `${proposalId}-two@example.com`,
      NOW,
      NOW
    ),
    env.AUTH_DB.prepare(
      `INSERT INTO game_accounts (id, user_id, created_at)
       VALUES (1, ?, ?), (2, ?, ?)`
    ).bind(USER_1, NOW, USER_2, NOW),
    env.AUTH_DB.prepare(
      `INSERT INTO player_account_stats
         (user_id, game_mode, season, player_rank, player_rank_state,
          created_at, updated_at)
       VALUES (?, 'RANKED_CONSTRUCTED', 126, ?, '[-1,1750,350,0]', ?, ?),
              (?, 'RANKED_CONSTRUCTED', 126, ?, '[-1,1750,350,0]', ?, ?)`
    ).bind(
      USER_1,
      options.leftRank ?? PlayerRank.APPRENTICE,
      NOW,
      NOW,
      USER_2,
      options.rightRank ?? PlayerRank.APPRENTICE,
      NOW,
      NOW
    ),
    env.AUTH_DB.prepare(
      `INSERT INTO multiplayer_matches
         (proposal_id, replay_id, mode, player1_mode, player2_mode, version,
          player1_principal,
          player2_principal, player1_user_id, player2_user_id,
          match_payload_json, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'test', '0x1111111111111111111111111111111111111111',
               '0x2222222222222222222222222222222222222222', ?, ?, ?,
               'active', ?, ?)`
    ).bind(
      proposalId,
      `replay-${proposalId}`,
      options.mode ?? GameMode.RANKED_CONSTRUCTED,
      options.playerModes?.[0] ?? null,
      options.playerModes?.[1] ?? null,
      USER_1,
      USER_2,
      options.payload ?? payload(),
      NOW,
      NOW
    )
  ])
  const decks = options.decks ?? [deck1, deck2]
  await persistAuthoritativeMatchDecks(
    env.AUTH_DB,
    proposalId,
    realDeckStringsFromFilledDecks(
      [baseCards(decks[0]), baseCards(decks[1])],
      [DeckClass.STR, DeckClass.STR]
    ),
    NOW
  )
}

const ranks = () =>
  env.AUTH_DB.prepare(
    `SELECT deck_string, score, highest_player_user_id, win_count, loss_count,
            forfeit_count, abandon_count, tie_count, games_played, win_ratio
     FROM player_deck_ranks WHERE library_revision = ? ORDER BY deck_string`
  )
    .bind(REVISION)
    .all<{
      deck_string: string
      score: number
      highest_player_user_id: string | null
      win_count: number
      loss_count: number
      forfeit_count: number
      abandon_count: number
      tie_count: number
      games_played: number
      win_ratio: number
    }>()

beforeEach(async () => {
  await env.AUTH_DB.prepare(
    'DROP TRIGGER IF EXISTS reject_deck_rank_update'
  ).run()
  await env.AUTH_DB.batch([
    env.AUTH_DB.prepare('DELETE FROM multiplayer_match_deck_ranks_applied'),
    env.AUTH_DB.prepare('DELETE FROM player_deck_rank_wins'),
    env.AUTH_DB.prepare('DELETE FROM player_deck_ranks'),
    env.AUTH_DB.prepare('DELETE FROM player_account_stats'),
    env.AUTH_DB.prepare('DELETE FROM multiplayer_matches'),
    env.AUTH_DB.prepare('DELETE FROM game_accounts'),
    env.AUTH_DB.prepare('DELETE FROM users')
  ])
})

describe('source ranked-constructed deck aggregates', () => {
  it('applies completed win/loss counters and Glicko score once', async () => {
    await setup('deck-rank-completed')
    const first = await applyDeckRanks(
      env.AUTH_DB,
      'deck-rank-completed',
      126,
      0,
      MatchStatus.COMPLETED,
      NOW
    )
    expect(first.applied).toBe(true)
    expect(first.deckStrings).toEqual([
      encodeDeckString(deck1, DeckClass.STR),
      encodeDeckString(deck2, DeckClass.STR)
    ])
    const completed = (await ranks()).results
    expect(
      completed.find(
        row => row.deck_string === encodeDeckString(deck2, DeckClass.STR)
      )
    ).toMatchObject({
      score: 0,
      highest_player_user_id: null,
      win_count: 0,
      loss_count: 1,
      games_played: 1,
      win_ratio: 0
    })
    const winningDeck = completed.find(
      row => row.deck_string === encodeDeckString(deck1, DeckClass.STR)
    )!
    expect(winningDeck).toMatchObject({
      highest_player_user_id: USER_1,
      win_count: 1,
      loss_count: 0,
      games_played: 1,
      win_ratio: 1
    })
    expect(winningDeck.score).toBeGreaterThan(0)

    const retried = await applyDeckRanks(
      env.AUTH_DB,
      'deck-rank-completed',
      126,
      0,
      MatchStatus.COMPLETED,
      '2026-08-13T12:01:00.000Z'
    )
    expect(retried).toMatchObject({ applied: false, processedAt: NOW })
    expect((await ranks()).results.map(row => row.games_played)).toEqual([1, 1])
  })

  it('keeps source forfeit and abandon counters in addition to loss', async () => {
    await setup('deck-rank-forfeit')
    await applyDeckRanks(
      env.AUTH_DB,
      'deck-rank-forfeit',
      126,
      0,
      MatchStatus.FORFEITED,
      NOW
    )
    const loser = (await ranks()).results.find(
      row => row.deck_string === encodeDeckString(deck2, DeckClass.STR)
    )!
    expect(loser).toMatchObject({ loss_count: 1, forfeit_count: 1 })
    // The current source trigger counts wins + losses + ties. A forfeit is a
    // loss subtype, not a second played game.
    expect(loser.games_played).toBe(1)
  })

  it('creates both records but saves only Apprentice-or-higher updates', async () => {
    await setup('deck-rank-trainee', { leftRank: PlayerRank.TRAINEE })
    await applyDeckRanks(
      env.AUTH_DB,
      'deck-rank-trainee',
      126,
      0,
      MatchStatus.COMPLETED,
      NOW
    )
    const result = (await ranks()).results
    expect(result).toHaveLength(2)
    expect(
      result.find(
        row => row.deck_string === encodeDeckString(deck1, DeckClass.STR)
      )
    ).toMatchObject({ score: 0, win_count: 0, highest_player_user_id: USER_1 })
    expect(
      result.find(
        row => row.deck_string === encodeDeckString(deck2, DeckClass.STR)
      )
    ).toMatchObject({ loss_count: 1, highest_player_user_id: null })
  })

  it('uses each participant mode for mixed practice/ranked deck eligibility', async () => {
    await setup('deck-rank-mixed', {
      playerModes: [GameMode.PRACTICE_PVP, GameMode.RANKED_CONSTRUCTED]
    })
    await applyDeckRanks(
      env.AUTH_DB,
      'deck-rank-mixed',
      126,
      0,
      MatchStatus.COMPLETED,
      NOW
    )
    const result = (await ranks()).results
    expect(result).toHaveLength(2)
    expect(
      result.find(
        row => row.deck_string === encodeDeckString(deck1, DeckClass.STR)
      )
    ).toMatchObject({ win_count: 0, highest_player_user_id: USER_1 })
    expect(
      result.find(
        row => row.deck_string === encodeDeckString(deck2, DeckClass.STR)
      )
    ).toMatchObject({ loss_count: 1, highest_player_user_id: null })
  })

  it('preserves the source mirror-match alias and ordered double transition', async () => {
    await setup('deck-rank-mirror', {
      payload: payload(deck1, deck1),
      decks: [deck1, deck1]
    })
    await applyDeckRanks(
      env.AUTH_DB,
      'deck-rank-mirror',
      126,
      0,
      MatchStatus.COMPLETED,
      NOW
    )
    expect((await ranks()).results).toEqual([
      expect.objectContaining({
        win_count: 1,
        loss_count: 1,
        games_played: 2,
        win_ratio: 0.5,
        highest_player_user_id: USER_1
      })
    ])
  })

  it('records a draw once per distinct deck and does not count a winner', async () => {
    await setup('deck-rank-draw')
    await applyDeckRanks(
      env.AUTH_DB,
      'deck-rank-draw',
      126,
      undefined,
      MatchStatus.COMPLETED,
      NOW
    )
    expect((await ranks()).results).toEqual([
      expect.objectContaining({ tie_count: 1, games_played: 1 }),
      expect.objectContaining({ tie_count: 1, games_played: 1 })
    ])
    expect(
      (await env.AUTH_DB.prepare('SELECT * FROM player_deck_rank_wins').all())
        .results
    ).toHaveLength(0)
  })

  it('ignores other modes and ranks the engine-filled deck for a partial seed', async () => {
    await setup('deck-rank-other-mode', { mode: GameMode.RANKED_DISCOVERY })
    expect(
      await applyDeckRanks(
        env.AUTH_DB,
        'deck-rank-other-mode',
        126,
        0,
        MatchStatus.COMPLETED,
        NOW
      )
    ).toMatchObject({ applied: false, deckStrings: [null, null] })
    expect((await ranks()).results).toHaveLength(0)

    await env.AUTH_DB.batch([
      env.AUTH_DB.prepare('DELETE FROM multiplayer_matches'),
      env.AUTH_DB.prepare('DELETE FROM player_account_stats'),
      env.AUTH_DB.prepare('DELETE FROM game_accounts'),
      env.AUTH_DB.prepare('DELETE FROM users')
    ])
    await setup('deck-rank-partial', { payload: payload([136], [166]) })
    expect(
      await applyDeckRanks(
        env.AUTH_DB,
        'deck-rank-partial',
        126,
        0,
        MatchStatus.COMPLETED,
        NOW
      )
    ).toMatchObject({
      applied: true,
      deckStrings: [
        encodeDeckString(deck1, DeckClass.STR),
        encodeDeckString(deck2, DeckClass.STR)
      ]
    })
    expect((await ranks()).results).toHaveLength(2)
  })

  it('serializes concurrent completions through the coordinator', async () => {
    await setup('deck-rank-concurrent-one')
    await env.AUTH_DB.prepare(
      `INSERT INTO multiplayer_matches
         (proposal_id, replay_id, mode, version, player1_principal,
          player2_principal, player1_user_id, player2_user_id,
          match_payload_json, status, created_at, updated_at)
       SELECT 'deck-rank-concurrent-two', 'replay-deck-rank-concurrent-two',
              mode, version, player1_principal, player2_principal,
              player1_user_id, player2_user_id, match_payload_json,
              status, created_at, updated_at
       FROM multiplayer_matches WHERE proposal_id = 'deck-rank-concurrent-one'`
    ).run()
    await persistAuthoritativeMatchDecks(
      env.AUTH_DB,
      'deck-rank-concurrent-two',
      realDeckStringsFromFilledDecks(
        [baseCards(deck1), baseCards(deck2)],
        [DeckClass.STR, DeckClass.STR]
      ),
      NOW
    )
    await env.AUTH_DB.prepare(
      `UPDATE player_account_stats
       SET score = 600, player_rank_stage = 'STAGE_I',
           player_rank_state = '[-1,1750,350,600]'
       WHERE game_mode = 'RANKED_CONSTRUCTED' AND season = 126`
    ).run()
    const coordinator = env.DECK_RANK_COORDINATOR.getByName('current-library')
    const apply = (proposalId: string) =>
      coordinator.fetch('https://deck-rank-coordinator/internal/apply', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-cloud-weasel-internal-auth': 'game-server-test-secret'
        },
        body: JSON.stringify({
          proposalId,
          season: 126,
          winner: 0,
          status: MatchStatus.COMPLETED,
          processedAt: NOW
        })
      })
    const proposalIds = [
      'deck-rank-concurrent-one',
      'deck-rank-concurrent-two'
    ] as const
    const responses = await Promise.all([
      apply('deck-rank-concurrent-one'),
      apply('deck-rank-concurrent-two')
    ])
    expect(responses.map(response => response.status).sort()).toEqual([
      200, 409
    ])
    const waitingIndex = responses.findIndex(
      response => response.status === 409
    )
    expect(waitingIndex).toBeGreaterThanOrEqual(0)
    await expect(responses[waitingIndex].json()).resolves.toEqual({
      error: 'waiting_for_match_publication'
    })
    const publishedProposalId = proposalIds[waitingIndex === 0 ? 1 : 0]
    await env.AUTH_DB.prepare(
      `UPDATE multiplayer_matches SET status = 'ended', updated_at = ?
       WHERE proposal_id = ?`
    )
      .bind(NOW, publishedProposalId)
      .run()
    const retry = await apply(proposalIds[waitingIndex])
    expect(retry.status).toBe(200)
    const stats = await env.AUTH_DB.prepare(
      `SELECT user_id, win_count, loss_count, tie_count
       FROM player_account_stats
       WHERE game_mode = 'RANKED_CONSTRUCTED' AND season = 126
       ORDER BY user_id`
    ).all<{
      user_id: string
      win_count: number
      loss_count: number
      tie_count: number
    }>()
    expect(stats.results).toEqual([
      { user_id: USER_1, win_count: 2, loss_count: 0, tie_count: 0 },
      { user_id: USER_2, win_count: 0, loss_count: 2, tie_count: 0 }
    ])
    const result = (await ranks()).results
    expect(
      result.find(
        row => row.deck_string === encodeDeckString(deck1, DeckClass.STR)
      )
    ).toMatchObject({ win_count: 2, games_played: 2 })
    expect(
      result.find(
        row => row.deck_string === encodeDeckString(deck2, DeckClass.STR)
      )
    ).toMatchObject({ loss_count: 2, games_played: 2 })
  })

  it('rolls back every aggregate write when a D1 batch statement fails', async () => {
    await setup('deck-rank-rollback')
    await env.AUTH_DB.prepare(
      `CREATE TRIGGER reject_deck_rank_update
       BEFORE UPDATE ON player_deck_ranks
       BEGIN SELECT RAISE(ABORT, 'reject deck rank update'); END`
    ).run()
    await expect(
      applyDeckRanks(
        env.AUTH_DB,
        'deck-rank-rollback',
        126,
        0,
        MatchStatus.COMPLETED,
        NOW
      )
    ).rejects.toThrow('reject deck rank update')
    expect((await ranks()).results).toHaveLength(0)
    expect(
      await env.AUTH_DB.prepare(
        `SELECT 1 FROM multiplayer_match_deck_ranks_applied
         WHERE proposal_id = 'deck-rank-rollback'`
      ).first()
    ).toBeNull()
  })
})
