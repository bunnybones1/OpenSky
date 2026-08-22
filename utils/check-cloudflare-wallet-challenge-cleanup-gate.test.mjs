import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { walletChallengeCleanupGateErrors } from './check-cloudflare-wallet-challenge-cleanup-gate.mjs'

const liveEvidence = async () => {
  const [walletLinks, scheduler, config, focusedTest, runnerAudit] =
    await Promise.all([
      readFile('cloudflare/src/wallet-links.ts', 'utf8'),
      readFile('cloudflare/src/index.ts', 'utf8'),
      readFile('wrangler.jsonc', 'utf8').then(JSON.parse),
      readFile('cloudflare/test/wallet-challenge-maintenance.test.ts', 'utf8'),
      readFile('utils/audit-cloudflare-worker-runners.mjs', 'utf8')
    ])
  return { walletLinks, scheduler, config, focusedTest, runnerAudit }
}

test('accepts the isolated wallet challenge cleanup effect boundary', async () => {
  assert.deepEqual(walletChallengeCleanupGateErrors(await liveEvidence()), [])
})

test('fails closed when any reviewed evidence source disappears', async () => {
  const current = await liveEvidence()
  for (const source of [
    'walletLinks',
    'scheduler',
    'focusedTest',
    'runnerAudit'
  ]) {
    assert.ok(
      walletChallengeCleanupGateErrors({ ...current, [source]: '' }).length > 0,
      `${source} removal must fail the gate`
    )
  }
  assert.ok(
    walletChallengeCleanupGateErrors({
      ...current,
      config: { triggers: { crons: [] } }
    }).length > 0
  )
})

test('rejects cleanup restored to durable-effect discovery', async () => {
  const current = await liveEvidence()
  const mutation = current.scheduler.replace(
    '.then(() => discovery.run(env))',
    '.then(async () => { await new WalletLinksRepository(env.AUTH_DB).cleanupExpired(); return discovery.run(env) })'
  )
  assert.ok(
    walletChallengeCleanupGateErrors({ ...current, scheduler: mutation }).some(
      error =>
        error.includes('durable-effect discovery still owns wallet cleanup')
    )
  )
})

test('rejects unrelated work in the disposable maintenance branch', async () => {
  const current = await liveEvidence()
  const mutation = current.scheduler.replace(
    '.cleanupExpired()',
    '.cleanupExpired().then(() => dispatchDueLeaderboardRewards(env))'
  )
  assert.ok(
    walletChallengeCleanupGateErrors({ ...current, scheduler: mutation }).some(
      error => error.includes('owns unrelated durable authority')
    )
  )
})

test('rejects missing, duplicate, or mismatched Cron Trigger topology', async () => {
  const current = await liveEvidence()
  for (const crons of [
    ['* * * * *'],
    ['* * * * *', '* * * * *'],
    ['* * * * *', '9 9 * * *']
  ]) {
    assert.ok(
      walletChallengeCleanupGateErrors({
        ...current,
        config: { triggers: { crons } }
      }).length > 0
    )
  }
})

test('rejects copied BalanceSync runner cadence and retry authority', async () => {
  const current = await liveEvidence()
  for (const forbidden of [
    'BalanceSyncRetryDelay',
    'BalanceSyncMaxRetries',
    'time.NewTicker',
    '500 * time.Millisecond',
    "status = 'DEAD'",
    'LIMIT 2'
  ]) {
    assert.ok(
      walletChallengeCleanupGateErrors({
        ...current,
        walletLinks: `${current.walletLinks}\n${forbidden}`
      }).some(error => error.includes('restored copied Go runner authority'))
    )
  }
})

test('rejects conflating BalanceSync replacement with challenge cleanup', async () => {
  const current = await liveEvidence()
  assert.ok(
    walletChallengeCleanupGateErrors({
      ...current,
      runnerAudit: current.runnerAudit.replace(
        "evidenceFile: 'cloudflare/test/wallet-contents.test.ts'",
        "evidenceFile: 'cloudflare/src/wallet-links.ts'"
      )
    }).length > 0
  )
})
