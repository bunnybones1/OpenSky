import { env } from 'cloudflare:workers'
import { expect, it } from 'vitest'

import { handleApiRequest } from '../src/api'
import type { Env } from '../src/env'

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

  const configured = await requestNextRewardTime()
  expect(configured.status).toBe(200)
  expect(await configured.json()).toEqual({ res: firstRun.toISOString() })
})
