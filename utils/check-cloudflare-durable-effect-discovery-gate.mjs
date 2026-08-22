import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

export const EXPECTED_DURABLE_EFFECT_DISCOVERIES = [
  ['conquest-gold-delivery', 'dispatchDueConquestGoldDeliveries(env)'],
  [
    'conquest-readiness-drill',
    'dispatchPendingConquestReadinessDrills(env)'
  ],
  ['conquest-v2-rewards', 'dispatchDueConquestV2Rewards(env)'],
  ['leaderboard-rewards', 'dispatchDueLeaderboardRewards(env)'],
  ['referral-sticker-rewards', 'dispatchDueReferralStickerRewards(env)'],
  ['skypass-auto-claims', 'dispatchDueSkypassAutoClaims(env)'],
  [
    'push-notifications',
    'dispatchDuePushNotifications(env.AUTH_DB, env)'
  ],
  ['account-deletions', 'dispatchPendingAccountDeletions(env)']
]

const scheduledSource = source => {
  const start = source.indexOf('export const runScheduled')
  const end = source.indexOf('\n\nexport default', start)
  return start >= 0 && end > start ? source.slice(start, end) : ''
}

export const durableEffectDiscoveryGateErrors = (evidence = {}) => {
  const errors = []
  const scheduler = evidence.scheduler
  if (scheduler !== undefined) {
    const scheduled = scheduledSource(scheduler)
    for (const token of [
      'DURABLE_EFFECT_DISCOVERIES',
      'durableEffectDiscoveries = DURABLE_EFFECT_DISCOVERIES',
      'for (const discovery of durableEffectDiscoveries)',
      'ctx.waitUntil(',
      'Promise.resolve()',
      '.then(() => discovery.run(env))'
    ]) {
      if (!scheduled.includes(token) && !scheduler.includes(token)) {
        errors.push(`durable effect discovery is missing: ${token}`)
      }
    }
    for (const [name, invocation] of EXPECTED_DURABLE_EFFECT_DISCOVERIES) {
      if (!scheduler.includes(`name: '${name}'`)) {
        errors.push(`durable effect discovery inventory is missing: ${name}`)
      }
      if (!scheduler.includes(invocation)) {
        errors.push(
          `durable effect discovery invocation is missing: ${invocation}`
        )
      }
    }
    if (/Promise\.all(?:Settled)?\s*\(/.test(scheduled)) {
      errors.push('durable effect discovery restored one aggregate lifetime')
    }
    if (scheduled.includes('.catch(')) {
      errors.push('durable effect discovery swallows a responsibility failure')
    }
  }

  if (evidence.focusedTest !== undefined) {
    for (const token of [
      "it('retains the complete reviewed responsibility inventory'",
      "it('keeps a sibling discovery alive after an independent rejection'",
      'expect(pending).toHaveLength(2)',
      'Promise.allSettled(pending)',
      "'independent-completed'"
    ]) {
      if (!evidence.focusedTest.includes(token)) {
        errors.push(`durable effect discovery test is missing: ${token}`)
      }
    }
  }

  if (evidence.decision !== undefined) {
    for (const token of [
      '`ctx.waitUntil` registration per independent discovery responsibility',
      'failure cannot curtail Conquest readiness',
      'every unapplied migration'
    ]) {
      if (!evidence.decision.includes(token)) {
        errors.push(`durable effect discovery decision is missing: ${token}`)
      }
    }
  }

  if (
    evidence.packageJson !== undefined &&
    !evidence.packageJson.scripts?.['build:cloudflare']?.includes(
      'pnpm check:cloudflare:durable-effect-discovery-gate'
    )
  ) {
    errors.push('complete release bypasses durable effect discovery gate')
  }
  return errors
}

const main = async () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  const [scheduler, focusedTest, decision, packageJson] = await Promise.all([
    readFile(path.join(root, 'cloudflare/src/index.ts'), 'utf8'),
    readFile(
      path.join(root, 'cloudflare/test/durable-effect-discovery.test.ts'),
      'utf8'
    ),
    readFile(
      path.join(root, 'docs/CLOUDFLARE_UNDEPLOYED_ROLLOUT_AUDIT.md'),
      'utf8'
    ),
    readFile(path.join(root, 'package.json'), 'utf8').then(JSON.parse)
  ])
  const errors = durableEffectDiscoveryGateErrors({
    scheduler,
    focusedTest,
    decision,
    packageJson
  })
  if (errors.length) {
    process.stderr.write(`${errors.join('\n')}\n`)
    process.exitCode = 1
    return
  }
  process.stdout.write(
    'Durable effect discoveries retain independent Worker execution lifetimes\n'
  )
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  await main()
}
