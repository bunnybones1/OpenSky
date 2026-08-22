import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const compact = value => value.replace(/\s+/g, ' ')

export const rewardTimingErrors = (
  competitiveSource,
  querySource,
  hookSource,
  seasonHeaderSource,
  conquestInfoSource,
  apiSource,
  packageSource
) => {
  const errors = []
  const competitive = compact(competitiveSource)
  for (const token of [
    "from './leaderboard-reward-worker'",
    'rewardsAvailable: boolean',
    'const rewards = rewardsAvailable ? leaderboardRewardsForRank(',
    'private async leaderboardRewardsAvailable(): Promise<boolean>',
    'return (await nextLeaderboardRewardTime(this.database)) !== null',
    'catch {',
    'return false'
  ]) {
    if (!competitive.includes(token)) {
      errors.push(`leaderboard reward visibility is missing: ${token}`)
    }
  }
  if (competitive.split('this.entry(row, rewardsAvailable)').length - 1 !== 2) {
    errors.push(
      'both list and account leaderboard projections must use schedule visibility'
    )
  }

  const query = compact(querySource)
  for (const token of [
    'useNextRewardsTime = (enabled = true)',
    'enabled, retry: false'
  ]) {
    if (!query.includes(token)) {
      errors.push(`reward timing query is not fail-closed: ${token}`)
    }
  }

  const hook = compact(hookSource)
  for (const token of [
    'useTimeUntilRewards = (enabled = true)',
    'useNextRewardsTime(enabled)',
    'rewardScheduleUnavailable: enabled && isError'
  ]) {
    if (!hook.includes(token)) {
      errors.push(`reward timing hook is not fail-closed: ${token}`)
    }
  }

  if (
    !compact(seasonHeaderSource).includes(
      'if (rewardScheduleUnavailable) return null'
    )
  ) {
    errors.push('leaderboard header advertises an unavailable reward schedule')
  }
  if (
    !compact(conquestInfoSource).includes(
      'useTimeUntilRewards(displayConquestCards)'
    )
  ) {
    errors.push('dormant Conquest still requests leaderboard reward timing')
  }

  const api = compact(apiSource)
  for (const token of [
    "case 'GetNextRewardsTime':",
    "throw new RpcError( 503, 'webrpc.unavailable', 'leaderboard reward schedule is not configured' )"
  ]) {
    if (!api.includes(token)) {
      errors.push(`reward timing RPC no longer fails closed: ${token}`)
    }
  }

  const scripts = JSON.parse(packageSource).scripts ?? {}
  if (
    scripts['check:cloudflare:reward-timing'] !==
    'node --test ./utils/check-cloudflare-reward-timing.test.mjs && node ./utils/check-cloudflare-reward-timing.mjs'
  ) {
    errors.push('package scripts lost the reward timing gate')
  }
  if (
    !String(scripts['build:cloudflare']).includes(
      'pnpm check:cloudflare:reward-timing'
    )
  ) {
    errors.push('complete Cloudflare build bypasses the reward timing gate')
  }
  return errors
}

const main = async () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  const files = [
    'cloudflare/src/competitive.ts',
    'webapp/src/shared/queries/useNextRewardsTime.ts',
    'webapp/src/shared/hooks/useTimeUntilRewards.ts',
    'webapp/src/LeaderboardPage/PlayerLeaderboardPage/PlayerLeaderboardTableHeader/components/SeasonEndHeader.tsx',
    'webapp/src/PlayPage/Conquest/ConquestInfo/ConquestInfo.tsx',
    'cloudflare/src/api.ts',
    'package.json'
  ]
  const values = await Promise.all(
    files.map(file => readFile(path.join(root, file), 'utf8'))
  )
  const errors = rewardTimingErrors(...values)
  if (errors.length) {
    console.error(errors.join('\n'))
    process.exitCode = 1
  } else {
    console.log(
      'Reward amounts and countdowns require one active, approved schedule'
    )
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  await main()
}
