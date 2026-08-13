import { env } from 'cloudflare:workers'
import { expect, it } from 'vitest'

import { handleApiRequest } from '../src/api'
import type { Env } from '../src/env'
import {
  LEADERBOARD_REWARD_POLICY_HASH,
  LEADERBOARD_REWARD_POLICY_VERSION
} from '../src/leaderboard-reward-policy'

const testEnv = env as unknown as Env
const endpoint =
  'https://opensky.example/api/rpc/SkyWeaverAPI/GetNextRewardsTime'

const requestNextRewardTime = () =>
  handleApiRequest(
    new Request(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}'
    }),
    testEnv
  )

it('serves only an explicitly configured next reward boundary', async () => {
  const unavailable = await requestNextRewardTime()
  expect(unavailable.status).toBe(503)
  expect(await unavailable.json()).toEqual({
    code: 'webrpc.unavailable',
    msg: 'leaderboard reward schedule is not configured',
    status: 503
  })

  const firstRun = new Date('2099-08-12T17:30:00.000Z')
  await env.AUTH_DB.prepare(
    `INSERT INTO leaderboard_reward_schedule_versions
       (version, enabled, weekday_utc, hour_utc, minute_utc, first_run_at,
        starts_at, reason, created_at)
     VALUES (1, 1, ?, ?, ?, ?, '2026-08-12T00:00:00.000Z',
             'test future schedule', '2026-08-12T00:00:00.000Z')`
  )
    .bind(
      firstRun.getUTCDay(),
      firstRun.getUTCHours(),
      firstRun.getUTCMinutes(),
      firstRun.toISOString()
    )
    .run()
  await env.AUTH_DB.prepare(
    `INSERT INTO leaderboard_reward_schedule_activations
       (schedule_version, status, policy_version, policy_hash,
        created_by_user_id, activated_by_user_id, reason, review_reference,
        created_at, activated_at)
     VALUES (1, 'DRAFT', ?, ?, 'system:test-author', NULL,
             'test policy', 'test:review',
             '2026-08-12T00:00:00.000Z', NULL)`
  )
    .bind(LEADERBOARD_REWARD_POLICY_VERSION, LEADERBOARD_REWARD_POLICY_HASH)
    .run()
  await env.AUTH_DB.prepare(
    `UPDATE leaderboard_reward_schedule_activations
     SET status = 'ACTIVE', activated_by_user_id = 'system:test-reviewer',
         activated_at = '2026-08-12T00:00:00.000Z'
     WHERE schedule_version = 1`
  ).run()

  const configured = await requestNextRewardTime()
  expect(configured.status).toBe(200)
  expect(await configured.json()).toEqual({ res: firstRun.toISOString() })
})
