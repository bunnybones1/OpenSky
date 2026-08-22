import assert from 'node:assert/strict'
import test from 'node:test'

import {
  EXPECTED_RUNNERS,
  auditWorkerRunners,
  extractActiveRunnerRegistrations
} from './audit-cloudflare-worker-runners.mjs'

const sourceFor = runners =>
  runners.map(runner => `worker.Register(New${runner}())`).join('\n')

const completeEvidence = () =>
  Object.fromEntries(
    Object.entries(EXPECTED_RUNNERS).map(([runner, review]) => [
      runner,
      review.evidence.join('\n')
    ])
  )

test('extracts active runner registrations while ignoring commented Go', () => {
  assert.deepEqual(
    extractActiveRunnerRegistrations(`
      active := NewActiveRunner()
      // ignored := NewLineCommentRunner()
      /* ignored := NewBlockCommentRunner() */
      duplicate := NewActiveRunner()
    `),
    ['ActiveRunner']
  )
})

test('accepts the complete reviewed runner map with no actionable gaps', () => {
  const audit = auditWorkerRunners({
    source: sourceFor(Object.keys(EXPECTED_RUNNERS)),
    evidenceSources: completeEvidence()
  })
  assert.deepEqual(audit.errors, [])
  assert.deepEqual(audit.byDisposition.actionable, [])
  assert.ok(audit.byDisposition.ported.includes('SkypassAutoClaimRunner'))
  assert.ok(audit.byDisposition.ported.includes('SkypassEndOfSeasonRunner'))
  assert.deepEqual(audit.byDisposition.retired, [])
})

test('rejects retirement as a disposition for an active source runner', () => {
  const original = EXPECTED_RUNNERS.FixStarterDecksRunner.disposition
  EXPECTED_RUNNERS.FixStarterDecksRunner.disposition = 'retired'
  try {
    const audit = auditWorkerRunners({
      source: sourceFor(Object.keys(EXPECTED_RUNNERS)),
      evidenceSources: completeEvidence()
    })
    assert.ok(
      audit.errors.includes(
        'FixStarterDecksRunner is an active source runner and cannot be retired; preserve its behavior as ported or superseded'
      )
    )
  } finally {
    EXPECTED_RUNNERS.FixStarterDecksRunner.disposition = original
  }
})

test('rejects unknown runners, removed reviews, and lost evidence', () => {
  const runners = Object.keys(EXPECTED_RUNNERS).filter(
    runner => runner !== 'BalanceSyncRunner'
  )
  runners.push('MysteryMintRunner')
  const evidence = completeEvidence()
  evidence.LeaderboardRewardsRunner = ''
  const audit = auditWorkerRunners({
    source: sourceFor(runners),
    evidenceSources: evidence
  })
  assert.ok(
    audit.errors.includes('unreviewed active runner: MysteryMintRunner')
  )
  assert.ok(
    audit.errors.includes(
      'reviewed runner is no longer active: BalanceSyncRunner'
    )
  )
  assert.ok(
    audit.errors.some(error =>
      error.includes('LeaderboardRewardsRunner is missing ported evidence')
    )
  )
})

test('requires push discovery and Queue consumption rather than a direct cron sender', () => {
  const evidence = completeEvidence()
  evidence.PushNotificationsRunner = evidence.PushNotificationsRunner.replace(
    'dispatchDuePushNotifications',
    'runPushNotifications'
  ).replace('handlePushNotificationQueue', 'callOneSignalFromCron')
  const audit = auditWorkerRunners({
    source: sourceFor(Object.keys(EXPECTED_RUNNERS)),
    evidenceSources: evidence
  })
  assert.ok(
    audit.errors.some(error =>
      error.includes('PushNotificationsRunner is missing ported evidence')
    )
  )
})
