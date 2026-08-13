import { env } from 'cloudflare:workers'
import { beforeEach, describe, expect, it } from 'vitest'

import { handleApiRequest } from '../src/api'
import type { Env } from '../src/env'
import {
  createIdentitySession,
  IDENTITY_SESSION_COOKIE
} from '../src/identity-session'
import { PlayerRepository } from '../src/player'

const testEnv = env as unknown as Env
const userId = 'bot-match-rpc-user'

const rpc = async (body: object, signedIn = true) => {
  const headers = new Headers({ 'Content-Type': 'application/json' })
  if (signedIn) {
    const token = await createIdentitySession(
      userId,
      testEnv.SESSION_SIGNING_KEY
    )
    headers.set('Cookie', `${IDENTITY_SESSION_COOKIE}=${token}`)
  }
  return handleApiRequest(
    new Request('https://opensky.example/api/rpc/SkyWeaverAPI/BotMatchEnd', {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    }),
    testEnv
  )
}

const tutorialRequest = (
  overrides: Record<string, unknown> = {}
): Record<string, unknown> => ({
  mode: 'TUTORIAL',
  status: 'COMPLETED',
  winningPlayer: 1,
  deckString: '',
  turnNonce: 4,
  tutorialLevel: 'LEVEL_1',
  matchStartedAt: '2026-08-11T10:00:00.000Z',
  playerSessionId: 'tutorial-session',
  playerQuestProgressUpdates: {},
  ...overrides
})

beforeEach(async () => {
  await env.AUTH_DB.prepare('DELETE FROM users').run()
  const now = new Date().toISOString()
  await env.AUTH_DB.prepare(
    `INSERT INTO users (id, display_name, primary_email, created_at, updated_at)
     VALUES (?, 'Tutorial Weasel', 'tutorial@example.com', ?, ?)`
  )
    .bind(userId, now, now)
    .run()
  await new PlayerRepository(env.AUTH_DB).bootstrap(userId)
})

describe('legacy BotMatchEnd compatibility', () => {
  it('returns the source zero-XP signal for a first tutorial win', async () => {
    const response = await rpc({ req: tutorialRequest() })
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      rewards: [
        {
          accountID: 0,
          type: 'EXP',
          exp: {
            amount: 0,
            reason: 'TutorialCompleted',
            currentLevel: 1,
            requiredExp: 200,
            beforeMatchExp: 0
          }
        }
      ]
    })

    expect(
      await env.AUTH_DB.prepare(
        `SELECT level, completed FROM player_tutorial_progress
         WHERE user_id = ?`
      )
        .bind(userId)
        .first()
    ).toEqual({ level: 'LEVEL_1', completed: 1 })
  })

  it('returns the original receipt and applies quest progress only once on retry', async () => {
    const quest = await env.AUTH_DB.prepare(
      `SELECT rowid AS id FROM player_quests
       WHERE user_id = ? AND quest_type = 'OntheRoadAgain'`
    )
      .bind(userId)
      .first<{ id: number }>()
    expect(quest).not.toBeNull()

    const first = await rpc({
      req: tutorialRequest({
        playerQuestProgressUpdates: { [quest!.id]: 4 }
      })
    })
    expect((await first.json<{ rewards: unknown[] }>()).rewards).toHaveLength(1)

    const retry = await rpc({
      req: tutorialRequest({
        status: 'FORFEITED',
        winningPlayer: 2,
        playerQuestProgressUpdates: { [quest!.id]: 99 }
      })
    })
    expect((await retry.json<{ rewards: unknown[] }>()).rewards).toHaveLength(1)

    expect(
      await env.AUTH_DB.prepare(
        `SELECT progress, target, status FROM player_quests WHERE rowid = ?`
      )
        .bind(quest!.id)
        .first()
    ).toEqual({ progress: 1, target: 1, status: 'complete' })
    const reports = await env.AUTH_DB.prepare(
      `SELECT COUNT(*) AS count FROM player_bot_match_reports WHERE user_id = ?`
    )
      .bind(userId)
      .first<{ count: number }>()
    expect(reports?.count).toBe(1)
  })

  it('records only the quest delta actually applied by concurrent reports', async () => {
    const quest = await env.AUTH_DB.prepare(
      `SELECT rowid AS id FROM player_quests
       WHERE user_id = ? AND quest_type = 'OntheRoadAgain'`
    )
      .bind(userId)
      .first<{ id: number }>()
    expect(quest).not.toBeNull()

    const responses = await Promise.all([
      rpc({
        req: tutorialRequest({
          playerSessionId: 'concurrent-report-one',
          playerQuestProgressUpdates: { [quest!.id]: 1 }
        })
      }),
      rpc({
        req: tutorialRequest({
          playerSessionId: 'concurrent-report-two',
          playerQuestProgressUpdates: { [quest!.id]: 1 }
        })
      })
    ])
    expect(responses.map(response => response.status)).toEqual([200, 200])

    const receipts = await env.AUTH_DB.prepare(
      `SELECT applied_delta, before_progress, after_progress,
              application_status
       FROM player_bot_match_quest_progress
       WHERE quest_id = ?
       ORDER BY before_progress ASC, report_id ASC`
    )
      .bind(quest!.id)
      .all<{
        applied_delta: number
        before_progress: number
        after_progress: number
        application_status: string
      }>()
    expect(receipts.results).toEqual([
      {
        applied_delta: 1,
        before_progress: 0,
        after_progress: 1,
        application_status: 'APPLIED'
      },
      {
        applied_delta: 0,
        before_progress: 1,
        after_progress: 1,
        application_status: 'APPLIED'
      }
    ])
    expect(
      await env.AUTH_DB.prepare(
        'SELECT progress, status FROM player_quests WHERE rowid = ?'
      )
        .bind(quest!.id)
        .first()
    ).toEqual({ progress: 1, status: 'complete' })
    await expect(
      env.AUTH_DB.prepare(
        `UPDATE player_bot_match_quest_progress SET applied_delta = 99
         WHERE quest_id = ?`
      )
        .bind(quest!.id)
        .run()
    ).rejects.toThrow(/receipt completion is invalid/)
    await expect(
      env.AUTH_DB.prepare(
        'DELETE FROM player_bot_match_quest_progress WHERE quest_id = ?'
      )
        .bind(quest!.id)
        .run()
    ).rejects.toThrow(/receipts are immutable/)
  })

  it('applies one receipt for simultaneous retries of the same report', async () => {
    const quest = await env.AUTH_DB.prepare(
      `SELECT rowid AS id FROM player_quests
       WHERE user_id = ? AND quest_type = 'OntheRoadAgain'`
    )
      .bind(userId)
      .first<{ id: number }>()
    expect(quest).not.toBeNull()
    const request = {
      req: tutorialRequest({
        playerSessionId: 'simultaneous-retry',
        playerQuestProgressUpdates: { [quest!.id]: 1 }
      })
    }

    const responses = await Promise.all([rpc(request), rpc(request)])
    expect(responses.map(response => response.status)).toEqual([200, 200])
    expect(
      await env.AUTH_DB.prepare(
        `SELECT COUNT(*) AS count, SUM(applied_delta) AS applied
         FROM player_bot_match_quest_progress WHERE quest_id = ?`
      )
        .bind(quest!.id)
        .first()
    ).toEqual({ count: 1, applied: 1 })
  })

  it('rolls back the report and quest delta when receipt completion fails', async () => {
    const quest = await env.AUTH_DB.prepare(
      `SELECT rowid AS id FROM player_quests
       WHERE user_id = ? AND quest_type = 'OntheRoadAgain'`
    )
      .bind(userId)
      .first<{ id: number }>()
    expect(quest).not.toBeNull()
    await env.AUTH_DB.prepare(
      `CREATE TRIGGER test_bot_match_receipt_completion_failure
       BEFORE UPDATE ON player_bot_match_quest_progress
       WHEN NEW.application_status = 'APPLIED'
       BEGIN
         SELECT RAISE(ABORT, 'injected receipt completion failure');
       END`
    ).run()
    try {
      const response = await rpc({
        req: tutorialRequest({
          playerSessionId: 'rollback-report',
          playerQuestProgressUpdates: { [quest!.id]: 1 }
        })
      })
      expect(response.status).toBe(500)
      expect(
        await env.AUTH_DB.prepare(
          `SELECT COUNT(*) AS count FROM player_bot_match_reports
           WHERE user_id = ?`
        )
          .bind(userId)
          .first()
      ).toEqual({ count: 0 })
      expect(
        await env.AUTH_DB.prepare(
          'SELECT progress, status FROM player_quests WHERE rowid = ?'
        )
          .bind(quest!.id)
          .first()
      ).toEqual({ progress: 0, status: 'active' })
    } finally {
      await env.AUTH_DB.prepare(
        'DROP TRIGGER test_bot_match_receipt_completion_failure'
      ).run()
    }
  })

  it('does not complete a tutorial level when the bot wins', async () => {
    const response = await rpc({
      req: tutorialRequest({ winningPlayer: 2 })
    })
    expect(await response.json()).toEqual({ rewards: [] })
    const progress = await env.AUTH_DB.prepare(
      'SELECT COUNT(*) AS count FROM player_tutorial_progress WHERE user_id = ?'
    )
      .bind(userId)
      .first<{ count: number }>()
    expect(progress?.count).toBe(0)
  })

  it('marks the aggregate tutorial complete only after level four', async () => {
    await rpc({
      req: tutorialRequest({
        tutorialLevel: 'LEVEL_4',
        matchStartedAt: '2026-08-11T11:00:00.000Z'
      })
    })
    const progression = await env.AUTH_DB.prepare(
      'SELECT tutorial_completed FROM player_progression WHERE user_id = ?'
    )
      .bind(userId)
      .first<{ tutorial_completed: number }>()
    expect(progression?.tutorial_completed).toBe(1)
  })

  it('rejects unsupported, unfinished, malformed, and unsigned reports', async () => {
    expect(
      (await rpc({ req: tutorialRequest({ mode: 'PRACTICE_BOT' }) })).status
    ).toBe(400)
    expect(
      (await rpc({ req: tutorialRequest({ status: 'IN_PROGRESS' }) })).status
    ).toBe(400)
    expect(
      (await rpc({ req: tutorialRequest({ winningPlayer: 3 }) })).status
    ).toBe(400)
    expect((await rpc({ req: tutorialRequest() }, false)).status).toBe(401)
  })
})
