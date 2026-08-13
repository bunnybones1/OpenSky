import assert from 'node:assert/strict'
import test from 'node:test'

import {
  EXPECTED_QUEUES,
  mintQueueAuditErrors,
  sendTxnQueues
} from './audit-cloudflare-mint-queues.mjs'

const queues = [
  'ExitConquestQueue',
  'MintConquestEntriesQueue',
  'MintSilverCardRewardsQueue',
  'MintTicketRewardsQueue',
  'MintStickerRewardsQueue',
  'DelayedMintingQueue',
  'SendConquestExtraRewardQueue',
  'ConquestV2SendRewardQueue',
  'MintLeaderboardRewardsQueue',
  'MintCardBackRewardsQueue',
  'MintSkypassConquestTicketsQueue',
  'MintSkypassSilverCardsQueue',
  'MintSkypassStickersQueue'
]
const runnerSource = `func (r *SendTxnsRunner) Queues() []string {\nreturn []string{\n${queues
  .map(queue => `${queue},`)
  .join('\n')}\n}\n}`
const activeTasks = [
  'ExitConquestTask',
  'MintStickerRewardsTask',
  'DelayedMintingTask',
  'ConquestV2SendRewardTask',
  'MintLeaderboardRewardsTask',
  'MintCardBackRewardsTask',
  'MintSkypassSilverCardsTask',
  'MintSkypassStickersTask'
]
const evidence = {
  ExitConquestQueue:
    'player_conquest_settlement_inventory_grants Conquest inventory grant receipts are immutable Conquest settlement completion is invalid',
  MintConquestEntriesQueue:
    'stripe_checkout_fulfillment_receipts Stripe fulfillment receipts are immutable Stripe payment fulfillment is invalid SW_CONQUEST_TICKET',
  MintSilverCardRewardsQueue:
    'leaderboard_reward_schedule_activations leaderboard_reward_cycle_policy_receipts player_leaderboard_reward_inventory_grants leaderboard reward inventory grants are immutable leaderboard reward receipt completion is invalid SW_SILVER_CARDS',
  MintTicketRewardsQueue:
    'leaderboard_reward_schedule_activations leaderboard_reward_cycle_policy_receipts player_leaderboard_reward_inventory_grants leaderboard reward inventory grants are immutable leaderboard reward receipt completion is invalid SW_CONQUEST_TICKET',
  MintStickerRewardsQueue:
    'referral_sticker_active_schedule_entries referral_sticker_reward_batch_schedule_receipts referral_sticker_reward_inventory_grants referral sticker inventory grants are immutable referral sticker reward batch update is invalid',
  DelayedMintingQueue:
    'player_conquest_gold_delivery_inventory_grants Conquest Gold grant receipts are immutable Conquest Gold delivery transition is invalid',
  SendConquestExtraRewardQueue:
    'SendConquestExtraRewardQueue has no production producer',
  ConquestV2SendRewardQueue:
    'conquest_v2_reward_schedule_activations conquest_v2_reward_cycle_policy_receipts player_conquest_v2_reward_inventory_grants Conquest V2 reward inventory grants are immutable Conquest V2 reward receipt completion is invalid',
  MintLeaderboardRewardsQueue:
    'leaderboard_reward_schedule_activations leaderboard_reward_cycle_policy_receipts player_leaderboard_reward_inventory_grants leaderboard reward inventory grants are immutable leaderboard reward receipt completion is invalid',
  MintCardBackRewardsQueue:
    'player_skypass_claim_inventory_grants SkyPass claim inventory grants are immutable SkyPass claim receipt completion is invalid SW_CARD_BACKS',
  MintSkypassConquestTicketsQueue:
    'player_skypass_claim_inventory_grants SkyPass claim inventory grants are immutable SkyPass claim receipt completion is invalid SW_CONQUEST_TICKET',
  MintSkypassSilverCardsQueue:
    'player_skypass_claim_inventory_grants SkyPass claim inventory grants are immutable SkyPass claim receipt completion is invalid SW_SILVER_CARDS',
  MintSkypassStickersQueue:
    'player_skypass_claim_inventory_grants SkyPass claim inventory grants are immutable SkyPass claim receipt completion is invalid SW_STICKERS'
}

test('parses and accepts the complete reviewed transaction queue map', () => {
  assert.deepEqual(sendTxnQueues(runnerSource), queues)
  assert.deepEqual(
    mintQueueAuditErrors({
      runnerSource,
      goSource: activeTasks.map(task => `${task}{}`).join('\n'),
      evidenceSources: evidence
    }),
    []
  )
})

test('rejects a new queue, a revived producerless queue, and missing evidence', () => {
  const errors = mintQueueAuditErrors({
    runnerSource: runnerSource.replace(
      'ExitConquestQueue,',
      'ExitConquestQueue,\nMintMysteryRewardsQueue,'
    ),
    goSource: `${activeTasks.map(task => `${task}{}`).join('\n')}\nMintTicketRewardsTask{}`,
    evidenceSources: { ...evidence, MintStickerRewardsQueue: '' }
  })
  assert.ok(
    errors.some(error => error.includes('unreviewed transaction queue'))
  )
  assert.ok(
    errors.some(error => error.includes('gained 1 production producer'))
  )
  assert.ok(errors.some(error => error.includes('missing Cloudflare evidence')))
})

test('rejects a mint replacement that loses exact fulfillment evidence', () => {
  const errors = mintQueueAuditErrors({
    runnerSource,
    goSource: activeTasks.map(task => `${task}{}`).join('\n'),
    evidenceSources: {
      ...evidence,
      MintConquestEntriesQueue:
        'stripe_checkout_events player_items SW_CONQUEST_TICKET'
    }
  })
  assert.ok(
    errors.some(
      error =>
        error.includes('MintConquestEntriesQueue') &&
        error.includes('stripe_checkout_fulfillment_receipts')
    )
  )
})

test('forbids retirement as the disposition for any source-produced reward', () => {
  const review = EXPECTED_QUEUES.ExitConquestQueue
  const original = review.disposition
  try {
    review.disposition = 'retired-whole-feature'
    const errors = mintQueueAuditErrors({
      runnerSource,
      goSource: activeTasks.map(task => `${task}{}`).join('\n'),
      evidenceSources: evidence
    })
    assert.ok(
      errors.some(error =>
        error.includes('must have an offchain disposition')
      )
    )
    assert.ok(
      errors.some(error =>
        error.includes('cannot retire a source-produced reward')
      )
    )
  } finally {
    review.disposition = original
  }
})
