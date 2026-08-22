import { spawnSync } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const LEADERBOARD_POLICY_VERSION = 1
const LEADERBOARD_POLICY_HASH =
  'e95c135553b81c9814e5d2c3324c3568de842738cef64093f84cfc3b148b3d3a'
const CONQUEST_V2_POLICY_VERSION = 1
const CONQUEST_V2_POLICY_HASH =
  '1f08cf35d5c39282e0f720ee6c172acd84b7d6bae2e3a8196bf802507144a0ab'
const CURRENT_SEASON_SQL = `(CAST(
    (unixepoch('now') - unixepoch('2021-11-22T14:00:00.000Z')) / 2419200
    AS INTEGER
  ) + 1)`

export const REWARD_READINESS_QUERY = `SELECT
  (SELECT COUNT(*) FROM conquest_reward_pools) AS conquest_pools_total,
  (SELECT COUNT(*) FROM conquest_approved_active_reward_pools) AS conquest_pools_approved,
  (SELECT COUNT(*) FROM conquest_verified_queue_pools
    WHERE starts_at <= strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
      AND ends_at >= strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) AS conquest_verified_pools,
  (SELECT COUNT(*) FROM leaderboard_reward_schedule_versions) AS leaderboard_schedules_total,
  (SELECT COUNT(*) FROM (
     SELECT enabled FROM leaderboard_reward_schedule_versions
      WHERE starts_at <= strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
      ORDER BY version DESC LIMIT 1
   ) WHERE enabled = 1) AS leaderboard_schedules_enabled,
  (SELECT COUNT(*)
     FROM (
       SELECT * FROM leaderboard_reward_schedule_versions
        WHERE starts_at <= strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
        ORDER BY version DESC LIMIT 1
     ) schedule
     JOIN leaderboard_reward_schedule_activations activation
       ON activation.schedule_version = schedule.version
    WHERE schedule.enabled = 1
      AND activation.status = 'ACTIVE'
      AND activation.activated_at <= strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
      AND activation.policy_version = ${LEADERBOARD_POLICY_VERSION}
      AND activation.policy_hash = '${LEADERBOARD_POLICY_HASH}') AS leaderboard_ready,
  (SELECT COUNT(*) FROM conquest_v2_reward_schedule_versions) AS conquest_v2_schedules_total,
  (SELECT COUNT(*) FROM (
     SELECT enabled FROM conquest_v2_reward_schedule_versions
      WHERE starts_at <= strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
      ORDER BY version DESC LIMIT 1
   ) WHERE enabled = 1) AS conquest_v2_schedules_enabled,
  (SELECT COUNT(*)
     FROM (
       SELECT * FROM conquest_v2_reward_schedule_versions
        WHERE starts_at <= strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
        ORDER BY version DESC LIMIT 1
     ) schedule
     JOIN conquest_v2_reward_schedule_activations activation
       ON activation.schedule_version = schedule.version
     JOIN conquest_v2_pool_settings settings
       ON settings.singleton = 1
      AND settings.version = activation.settings_version
      AND settings.mutation_id = activation.settings_mutation_id
      AND settings.weight_per_silver_card = activation.weight_per_silver_card
    WHERE schedule.enabled = 1
      AND activation.status = 'ACTIVE'
      AND activation.activated_at <= strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
      AND activation.policy_version = ${CONQUEST_V2_POLICY_VERSION}
      AND activation.policy_hash = '${CONQUEST_V2_POLICY_HASH}') AS conquest_v2_ready,
  (SELECT COUNT(*) FROM referral_sticker_schedule_versions
    WHERE season = ${CURRENT_SEASON_SQL}) AS referral_schedules_total,
  (SELECT COUNT(*) FROM referral_sticker_schedule_versions
    WHERE season = ${CURRENT_SEASON_SQL}
      AND status = 'ACTIVE'
      AND activated_at <= strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) AS referral_schedules_active,
  (SELECT COUNT(*) FROM skypass_reward_policy_versions
    WHERE season = ${CURRENT_SEASON_SQL}) AS skypass_policies_total,
  (SELECT COUNT(*) FROM skypass_reward_active_policies
    WHERE season = ${CURRENT_SEASON_SQL}
      AND activated_at <= strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) AS skypass_policies_active;`

const COUNT_FIELDS = [
  'conquest_pools_total',
  'conquest_pools_approved',
  'conquest_verified_pools',
  'leaderboard_schedules_total',
  'leaderboard_schedules_enabled',
  'leaderboard_ready',
  'conquest_v2_schedules_total',
  'conquest_v2_schedules_enabled',
  'conquest_v2_ready',
  'referral_schedules_total',
  'referral_schedules_active',
  'skypass_policies_total',
  'skypass_policies_active'
]

const configuredTrack = ({ active, configured, readiness = active }) => {
  if (readiness > 0) return 'active'
  if (active > 0) return 'dormant-readiness'
  if (configured > 0) return 'dormant-activation'
  return 'dormant-policy'
}

export const rewardReadiness = row => {
  const errors = []
  const validFields = new Set()
  for (const field of COUNT_FIELDS) {
    if (!Number.isSafeInteger(row?.[field]) || row[field] < 0) {
      errors.push(`${field} must be a non-negative safe integer`)
    } else {
      validFields.add(field)
    }
  }

  for (const [active, total] of [
    ['conquest_pools_approved', 'conquest_pools_total'],
    ['leaderboard_schedules_enabled', 'leaderboard_schedules_total'],
    ['conquest_v2_schedules_enabled', 'conquest_v2_schedules_total'],
    ['referral_schedules_active', 'referral_schedules_total'],
    ['skypass_policies_active', 'skypass_policies_total']
  ]) {
    if (
      validFields.has(active) &&
      validFields.has(total) &&
      row[active] > row[total]
    ) {
      errors.push(`${active} cannot exceed ${total}`)
    }
  }
  if (
    validFields.has('conquest_verified_pools') &&
    validFields.has('conquest_pools_approved') &&
    row.conquest_verified_pools > row.conquest_pools_approved
  ) {
    errors.push('conquest_verified_pools cannot exceed conquest_pools_approved')
  }
  if (
    validFields.has('leaderboard_ready') &&
    validFields.has('leaderboard_schedules_enabled') &&
    row.leaderboard_ready > row.leaderboard_schedules_enabled
  ) {
    errors.push('leaderboard_ready cannot exceed leaderboard_schedules_enabled')
  }
  if (
    validFields.has('conquest_v2_ready') &&
    validFields.has('conquest_v2_schedules_enabled') &&
    row.conquest_v2_ready > row.conquest_v2_schedules_enabled
  ) {
    errors.push('conquest_v2_ready cannot exceed conquest_v2_schedules_enabled')
  }

  if (errors.length) return { errors, tracks: [] }

  const tracks = [
    {
      track: 'Account bootstrap and starter deck',
      status: 'core-live',
      authority: 'D1 player bootstrap receipt'
    },
    {
      track: 'Match XP and level unlocks',
      status: 'core-live',
      authority: 'D1 match settlement receipts'
    },
    {
      track: 'Quest XP and basic SkyPass progression',
      status: 'core-live',
      authority: 'D1 quest claim receipts'
    },
    {
      track: 'SkyPass claim contents',
      status:
        row.skypass_policies_active > 0
          ? 'active'
          : row.skypass_policies_total > 0
            ? 'dormant-activation'
            : 'dormant-policy',
      authority: `${row.skypass_policies_active}/${row.skypass_policies_total} active policies`
    },
    {
      track: 'Original Conquest card settlement',
      status: configuredTrack({
        active: row.conquest_pools_approved,
        configured: row.conquest_pools_total,
        readiness: row.conquest_verified_pools
      }),
      authority: `${row.conquest_verified_pools} verified active pools`
    },
    {
      track: 'Weekly leaderboard rewards',
      status: configuredTrack({
        active: row.leaderboard_schedules_enabled,
        configured: row.leaderboard_schedules_total,
        readiness: row.leaderboard_ready
      }),
      authority: `${row.leaderboard_ready} approved enabled schedules`
    },
    {
      track: 'Conquest V2 weekly treasure',
      status: configuredTrack({
        active: row.conquest_v2_schedules_enabled,
        configured: row.conquest_v2_schedules_total,
        readiness: row.conquest_v2_ready
      }),
      authority: `${row.conquest_v2_ready} approved current-settings schedules`
    },
    {
      track: 'Referral sticker rewards',
      status: configuredTrack({
        active: row.referral_schedules_active,
        configured: row.referral_schedules_total
      }),
      authority: `${row.referral_schedules_active}/${row.referral_schedules_total} active schedules`
    }
  ]
  return { errors, tracks }
}

export const rewardReadinessRow = output => {
  const parsed = typeof output === 'string' ? JSON.parse(output) : output
  const executions = Array.isArray(parsed) ? parsed : []
  const rows = executions.flatMap(execution => execution?.results ?? [])
  if (
    executions.some(
      execution =>
        execution?.success !== true ||
        execution?.meta?.changed_db !== false ||
        execution?.meta?.changes !== 0
    ) ||
    rows.length !== 1
  ) {
    throw new Error('reward readiness query did not return one successful row')
  }
  return rows[0]
}

export const rewardReadinessEnvironment = (environment, accountId) => ({
  ...environment,
  // Read-only production evidence must follow the same pinned account
  // boundary as deployment and migrations. Never let a stale shell variable
  // redirect this query to a different Cloudflare account.
  CLOUDFLARE_ACCOUNT_ID: accountId
})

const printReport = ({ tracks }) => {
  const widths = {
    track: Math.max(
      'Reward track'.length,
      ...tracks.map(row => row.track.length)
    ),
    status: Math.max('Status'.length, ...tracks.map(row => row.status.length))
  }
  process.stdout.write(
    `${'Reward track'.padEnd(widths.track)}  ${'Status'.padEnd(widths.status)}  Authority\n`
  )
  process.stdout.write(
    `${'-'.repeat(widths.track)}  ${'-'.repeat(widths.status)}  ---------\n`
  )
  for (const row of tracks) {
    process.stdout.write(
      `${row.track.padEnd(widths.track)}  ${row.status.padEnd(widths.status)}  ${row.authority}\n`
    )
  }
}

const main = async () => {
  if (
    !/^\s*SELECT\b/i.test(REWARD_READINESS_QUERY) ||
    /\b(?:INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|REPLACE)\b/i.test(
      REWARD_READINESS_QUERY
    )
  ) {
    throw new Error('reward readiness audit must remain a read-only SELECT')
  }
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  const config = JSON.parse(
    await readFile(path.join(root, 'wrangler.jsonc'), 'utf8')
  )
  const command = spawnSync(
    'pnpm',
    [
      '--dir',
      'cloudflare',
      'exec',
      'wrangler',
      'd1',
      'execute',
      'opensky-auth',
      '--remote',
      '--config',
      '../wrangler.jsonc',
      '--json',
      '--command',
      REWARD_READINESS_QUERY
    ],
    {
      cwd: root,
      encoding: 'utf8',
      env: rewardReadinessEnvironment(process.env, config.account_id)
    }
  )
  if (command.status !== 0) {
    process.stderr.write(command.stderr || command.stdout)
    process.exitCode = command.status || 1
    return
  }
  const report = rewardReadiness(rewardReadinessRow(command.stdout))
  if (report.errors.length) {
    for (const error of report.errors)
      process.stderr.write(`Reward readiness: ${error}\n`)
    process.exitCode = 1
    return
  }
  if (process.argv.includes('--json')) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
  } else {
    printReport(report)
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  await main()
}
