import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const extractCron = (source, name) =>
  source.match(new RegExp(`export const ${name} = '([^']+)'`))?.[1]

export const walletChallengeCleanupGateErrors = (evidence = {}) => {
  const errors = []
  const requireTokens = (source, label, tokens) => {
    if (source === undefined) return
    for (const token of tokens) {
      if (!source.includes(token)) {
        errors.push(`wallet challenge cleanup ${label} is missing: ${token}`)
      }
    }
  }

  requireTokens(evidence.walletLinks, 'proof/retention contract', [
    'const CHALLENGE_SECONDS = 10 * 60',
    'const CHALLENGE_RETENTION_SECONDS = 24 * 60 * 60',
    'const MAX_ACTIVE_CHALLENGES = 5',
    'WALLET_CHALLENGE_CLEANUP_CRON',
    'await this.cleanupExpired(createdAt)',
    'WHERE expires_at <= ?'
  ])
  requireTokens(evidence.scheduler, 'Cron routing', [
    'DURABLE_EFFECT_DISCOVERY_CRON',
    'controller.cron === WALLET_CHALLENGE_CLEANUP_CRON',
    'controller.cron !== DURABLE_EFFECT_DISCOVERY_CRON',
    'unsupported Cron Trigger',
    'dispatchPendingAccountDeletions(env)',
    'runScheduled(controller, env, ctx)'
  ])

  if (evidence.scheduler !== undefined) {
    const maintenanceStart = evidence.scheduler.indexOf(
      'if (controller.cron === WALLET_CHALLENGE_CLEANUP_CRON)'
    )
    const discoveryStart = evidence.scheduler.indexOf(
      'if (controller.cron !== DURABLE_EFFECT_DISCOVERY_CRON)',
      Math.max(maintenanceStart, 0)
    )
    if (maintenanceStart < 0 || discoveryStart <= maintenanceStart) {
      errors.push('wallet cleanup does not precede the durable-effect branch')
    } else {
      const maintenance = evidence.scheduler.slice(
        maintenanceStart,
        discoveryStart
      )
      requireTokens(maintenance, 'isolated branch', [
        'new WalletLinksRepository(env.AUTH_DB)',
        '.cleanupExpired()',
        'return'
      ])
      for (const forbidden of [
        'dispatchDue',
        'dispatchPending',
        'Workflow',
        'Queue',
        'DurableObject',
        'alarm',
        'retry',
        'attempt'
      ]) {
        if (maintenance.includes(forbidden)) {
          errors.push(
            `wallet cleanup branch owns unrelated durable authority: ${forbidden}`
          )
        }
      }
      const durableEffectBranch = evidence.scheduler.slice(discoveryStart)
      if (durableEffectBranch.includes('.cleanupExpired()')) {
        errors.push('durable-effect discovery still owns wallet cleanup')
      }
    }
    if (evidence.scheduler.match(/\.cleanupExpired\(\)/g)?.length !== 1) {
      errors.push('wallet cleanup must have exactly one scheduled owner')
    }
  }

  if (
    evidence.walletLinks !== undefined &&
    evidence.scheduler !== undefined &&
    evidence.config !== undefined
  ) {
    const cleanupCron = extractCron(
      evidence.walletLinks,
      'WALLET_CHALLENGE_CLEANUP_CRON'
    )
    const discoveryCron = extractCron(
      evidence.scheduler,
      'DURABLE_EFFECT_DISCOVERY_CRON'
    )
    const configured = evidence.config.triggers?.crons
    if (
      !cleanupCron ||
      !discoveryCron ||
      cleanupCron === discoveryCron ||
      !Array.isArray(configured) ||
      configured.length !== 2 ||
      new Set(configured).size !== 2 ||
      !configured.includes(cleanupCron) ||
      !configured.includes(discoveryCron)
    ) {
      errors.push('wallet cleanup does not have one isolated Cron Trigger')
    }
  }

  requireTokens(evidence.focusedTest, 'effect tests', [
    "it('keeps proof validity through the final millisecond and rejects the deadline'",
    "it('retains challenges inside 24 hours and removes pending or consumed rows at the boundary'",
    "it('performs the same guarded cleanup opportunistically during challenge creation'",
    "it('runs cleanup alone for its dedicated Cron Trigger'",
    "it('fails closed for an unreviewed Cron Trigger'",
    "status: 'CONSUMED'",
    '{ AUTH_DB: env.AUTH_DB } as Env'
  ])
  requireTokens(evidence.runnerAudit, 'BalanceSync disposition', [
    'BalanceSyncRunner',
    "evidenceFile: 'cloudflare/test/wallet-contents.test.ts'",
    'projects only reviewed Polygon asset balances without mutating inventory',
    'keeps the contents endpoint private to the Google session',
    'fails closed on provider errors'
  ])

  for (const forbidden of [
    'BalanceSyncRetryDelay',
    'BalanceSyncMaxRetries',
    'BalanceSyncWorkGroup',
    'BalanceSyncTask',
    'time.NewTicker',
    'UpdateFailedTasks',
    '500 * time.Millisecond',
    'MAX_CLEANUP_RETRIES',
    "status = 'DEAD'",
    'LIMIT 2'
  ]) {
    if (
      evidence.walletLinks?.includes(forbidden) ||
      evidence.scheduler?.includes(forbidden)
    ) {
      errors.push('wallet cleanup restored copied Go runner authority')
    }
  }
  return errors
}

const main = async () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  const [walletLinks, scheduler, config, focusedTest, runnerAudit] =
    await Promise.all([
      readFile(path.join(root, 'cloudflare/src/wallet-links.ts'), 'utf8'),
      readFile(path.join(root, 'cloudflare/src/index.ts'), 'utf8'),
      readFile(path.join(root, 'wrangler.jsonc'), 'utf8').then(JSON.parse),
      readFile(
        path.join(root, 'cloudflare/test/wallet-challenge-maintenance.test.ts'),
        'utf8'
      ),
      readFile(
        path.join(root, 'utils/audit-cloudflare-worker-runners.mjs'),
        'utf8'
      )
    ])
  const errors = walletChallengeCleanupGateErrors({
    walletLinks,
    scheduler,
    config,
    focusedTest,
    runnerAudit
  })
  if (errors.length) {
    process.stderr.write(`${errors.join('\n')}\n`)
    process.exitCode = 1
    return
  }
  process.stdout.write(
    'Wallet proofs preserve exact validity and retention while isolated cleanup remains disposable and BalanceSync stays superseded\n'
  )
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  await main()
}
