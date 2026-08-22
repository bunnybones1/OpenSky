import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { rewardTimingErrors } from './check-cloudflare-reward-timing.mjs'

const fixtureFiles = [
  'cloudflare/src/competitive.ts',
  'webapp/src/shared/queries/useNextRewardsTime.ts',
  'webapp/src/shared/hooks/useTimeUntilRewards.ts',
  'webapp/src/LeaderboardPage/PlayerLeaderboardPage/PlayerLeaderboardTableHeader/components/SeasonEndHeader.tsx',
  'webapp/src/PlayPage/Conquest/ConquestInfo/ConquestInfo.tsx',
  'cloudflare/src/api.ts',
  'package.json'
]

const fixtures = async () => {
  const values = await Promise.all(
    fixtureFiles.map(file => readFile(file, 'utf8'))
  )
  return Object.fromEntries(
    fixtureFiles.map((file, index) => [file, values[index]])
  )
}

const errorsFor = value => rewardTimingErrors(...Object.values(value))

test('requires one schedule authority for rank rewards and countdowns', async () => {
  assert.deepEqual(errorsFor(await fixtures()), [])
})

test('rejects API, query, hook, consumer, and build-gate drift', async () => {
  const value = await fixtures()
  const mutate = (file, from, to) => ({
    ...value,
    [file]: value[file].replace(from, to)
  })
  const mutations = [
    mutate(
      'cloudflare/src/competitive.ts',
      'const rewards = rewardsAvailable',
      'const rewards = true'
    ),
    mutate(
      'cloudflare/src/competitive.ts',
      'this.entry(row, rewardsAvailable)',
      'this.entry(row, true)'
    ),
    mutate(
      'webapp/src/shared/queries/useNextRewardsTime.ts',
      'retry: false',
      'retry: true'
    ),
    mutate(
      'webapp/src/shared/hooks/useTimeUntilRewards.ts',
      'useNextRewardsTime(enabled)',
      'useNextRewardsTime()'
    ),
    mutate(
      'webapp/src/LeaderboardPage/PlayerLeaderboardPage/PlayerLeaderboardTableHeader/components/SeasonEndHeader.tsx',
      'if (rewardScheduleUnavailable) return null',
      'if (false) return null'
    ),
    mutate(
      'webapp/src/PlayPage/Conquest/ConquestInfo/ConquestInfo.tsx',
      'useTimeUntilRewards(displayConquestCards)',
      'useTimeUntilRewards()'
    ),
    mutate(
      'cloudflare/src/api.ts',
      "'leaderboard reward schedule is not configured'",
      "'invented reward schedule'"
    ),
    mutate('package.json', 'pnpm check:cloudflare:reward-timing && ', '')
  ]
  for (const [index, mutation] of mutations.entries()) {
    assert.notDeepEqual(
      errorsFor(mutation),
      [],
      `mutation ${index + 1} must fail closed`
    )
  }
})
