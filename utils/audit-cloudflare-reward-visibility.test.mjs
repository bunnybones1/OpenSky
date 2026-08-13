import assert from 'node:assert/strict'
import test from 'node:test'

import { EXPECTED_QUEUES } from './audit-cloudflare-mint-queues.mjs'
import {
  EXPECTED_VISIBILITY,
  rewardVisibilityAuditErrors
} from './audit-cloudflare-reward-visibility.mjs'

const completeEvidence = () => ({
  ...Object.fromEntries(
    Object.entries(EXPECTED_VISIBILITY).map(([queue, tokens]) => [
      queue,
      tokens.join('\n')
    ])
  ),
  notificationQuery: `
    staleTime: THIRTY_SECONDS,
    refetchInterval: ONE_MINUTE
  `
})

test('accepts a player-visible outcome for every non-retired mint queue', () => {
  assert.deepEqual(
    rewardVisibilityAuditErrors({ evidenceSources: completeEvidence() }),
    []
  )
  assert.equal(Object.keys(EXPECTED_VISIBILITY).length, 12)
  assert.equal(Object.keys(EXPECTED_QUEUES).length, 13)
})

test('rejects invisible grants, new queues, and day-stale notifications', () => {
  const queueReviews = {
    ...EXPECTED_QUEUES,
    MintMysteryRewardsQueue: {
      disposition: 'offchain',
      evidence: [],
      sourceProducer: true,
      task: 'MintMysteryRewardsTask'
    }
  }
  const evidenceSources = completeEvidence()
  evidenceSources.MintStickerRewardsQueue = ''
  evidenceSources.notificationQuery = 'staleTime: ONE_DAY'
  const errors = rewardVisibilityAuditErrors({ queueReviews, evidenceSources })
  assert.ok(errors.some(error => error.includes('MintStickerRewardsQueue')))
  assert.ok(errors.some(error => error.includes('MintMysteryRewardsQueue')))
  assert.ok(errors.some(error => error.includes('THIRTY_SECONDS')))
  assert.ok(errors.some(error => error.includes('ONE_MINUTE')))
})

test('rejects a retired flow with an active player visibility contract', () => {
  const original = EXPECTED_QUEUES.MintSkypassStickersQueue.disposition
  try {
    EXPECTED_QUEUES.MintSkypassStickersQueue.disposition =
      'retired-whole-feature'
    const errors = rewardVisibilityAuditErrors({
      evidenceSources: completeEvidence()
    })
    assert.ok(
      errors.some(error =>
        error.includes('retired but has an active visibility contract')
      )
    )
  } finally {
    EXPECTED_QUEUES.MintSkypassStickersQueue.disposition = original
  }
})

test('rejects notification polling in background tabs', () => {
  const evidenceSources = completeEvidence()
  evidenceSources.notificationQuery += '\nrefetchIntervalInBackground: true'
  assert.ok(
    rewardVisibilityAuditErrors({ evidenceSources }).some(error =>
      error.includes('background tabs')
    )
  )
})
