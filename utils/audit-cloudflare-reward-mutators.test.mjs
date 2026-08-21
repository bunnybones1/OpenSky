import assert from 'node:assert/strict'
import test from 'node:test'

import {
  EXPECTED_REWARD_MUTATOR_FILES,
  rewardMutationCount,
  rewardMutatorAuditErrors
} from './audit-cloudflare-reward-mutators.mjs'

const mutationCalls = count =>
  'database.prepare(`INSERT INTO player_items (user_id) VALUES (?)`)\n'.repeat(
    count
  )

const reviewedInput = () => ({
  sources: Object.fromEntries(
    Object.entries(EXPECTED_REWARD_MUTATOR_FILES).map(([file, review]) => [
      file,
      mutationCalls(review.count)
    ])
  ),
  evidenceSources: Object.fromEntries(
    Object.entries(EXPECTED_REWARD_MUTATOR_FILES).map(([file, review]) => [
      file,
      review.evidence.join(' ')
    ])
  )
})

test('counts authoritative reward-ledger writes but ignores comments', () => {
  assert.equal(
    rewardMutationCount(`
      database.prepare('INSERT INTO player_items (user_id) VALUES (?)')
      database.prepare('INSERT OR IGNORE INTO player_card_unlocks (user_id) VALUES (?)')
      database.prepare('INSERT OR IGNORE INTO player_conquest_points (user_id) VALUES (?)')
      database.prepare('UPDATE player_profiles SET xp = xp + 10')
      database.prepare('UPDATE player_friend_points SET points_spent = 1')
      // database.prepare('UPDATE player_progression SET basic_skypass_xp = 10')
    `),
    5
  )
})

test('accepts the complete reviewed TypeScript mutator map', () => {
  assert.deepEqual(rewardMutatorAuditErrors(reviewedInput()), [])
})

test('rejects a new mutator, changed count, and missing evidence', () => {
  const input = reviewedInput()
  input.sources['cloudflare/src/new-reward.ts'] = mutationCalls(1)
  input.sources['cloudflare/src/conquest-delivery.ts'] += mutationCalls(1)
  input.evidenceSources['cloudflare/src/player.ts'] = ''
  const errors = rewardMutatorAuditErrors(input)
  assert.ok(errors.some(error => error.includes('unreviewed TypeScript')))
  assert.ok(errors.some(error => error.includes('reviewed count')))
  assert.ok(errors.some(error => error.includes('deterministic-account-bootstrap')))
})

test('rejects a chain effect beside an off-chain reward mutation', () => {
  const input = reviewedInput()
  input.sources['cloudflare/src/conquest-delivery.ts'] +=
    '\nwallet.sendTransaction([])'
  assert.ok(
    rewardMutatorAuditErrors(input).some(error =>
      error.includes('combines a reward mutation with a chain effect')
    )
  )
})

test('requires registered bot progression writes to remain system-only', () => {
  const input = reviewedInput()
  input.evidenceSources['match-service-cloudflare/src/registered-bot.ts'] =
    input.evidenceSources['match-service-cloudflare/src/registered-bot.ts']
      .replace("VALUES (?, ?, ?, NULL, ?, ?, 'SYSTEM')", '')
  assert.ok(
    rewardMutatorAuditErrors(input).some(error =>
      error.includes('deterministic-system-bot-bootstrap')
    )
  )
})
