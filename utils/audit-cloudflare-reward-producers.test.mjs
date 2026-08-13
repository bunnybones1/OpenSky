import assert from 'node:assert/strict'
import test from 'node:test'

import {
  EXPECTED_REWARD_PRODUCER_FILES,
  rewardMutationCount,
  rewardProducerAuditErrors
} from './audit-cloudflare-reward-producers.mjs'

const producerCalls = count => 'store.GainToken()\n'.repeat(count)

const reviewedInput = () => ({
  sources: Object.fromEntries(
    Object.entries(EXPECTED_REWARD_PRODUCER_FILES).map(([file, review]) => [
      file,
      producerCalls(review.count)
    ])
  ),
  evidenceSources: Object.fromEntries(
    Object.entries(EXPECTED_REWARD_PRODUCER_FILES).map(([file, review]) => [
      file,
      review.evidence.join(' ')
    ])
  )
})

test('counts source inventory helpers and direct item writes', () => {
  assert.equal(
    rewardMutationCount(`
      func (s *Store) GainToken() {}
      store.GainToken()
      data.UnlockHero(sess, id, hero)
      sess.Save(&data.Item{Item: item})
      accountCard := &Item{Item: item}
      sess.Save(accountCard)
      // store.GainXP()
    `),
    4
  )
})

test('accepts the complete reviewed reward-producer map', () => {
  assert.deepEqual(rewardProducerAuditErrors(reviewedInput()), [])
})

test('rejects a new producer, changed count, and missing evidence', () => {
  const input = reviewedInput()
  input.sources['api/lib/new_reward.go'] = 'items.GainToken()'
  input.sources['api/lib/levels/xp/leveller.go'] += 'items.GainStickerPoints()'
  input.evidenceSources['api/lib/skypass/reward_applier.go'] = ''
  const errors = rewardProducerAuditErrors(input)
  assert.ok(errors.some(error => error.includes('unreviewed source')))
  assert.ok(errors.some(error => error.includes('reviewed count')))
  assert.ok(errors.some(error => error.includes('missing offchain-skypass')))
})

test('forbids retirement as the disposition for an active reward producer', () => {
  const review = EXPECTED_REWARD_PRODUCER_FILES['api/lib/skypass/reward_applier.go']
  const original = review.disposition
  try {
    review.disposition = 'retired-whole-feature'
    assert.ok(
      rewardProducerAuditErrors(reviewedInput()).some(error =>
        error.includes('cannot use a retirement disposition')
      )
    )
  } finally {
    review.disposition = original
  }
})
