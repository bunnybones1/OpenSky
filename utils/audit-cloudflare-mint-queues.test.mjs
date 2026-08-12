import assert from 'node:assert/strict'
import test from 'node:test'

import { mintQueueAuditErrors, sendTxnQueues } from './audit-cloudflare-mint-queues.mjs'

const queues = [
  'ExitConquestQueue', 'MintConquestEntriesQueue', 'MintSilverCardRewardsQueue',
  'MintTicketRewardsQueue', 'MintStickerRewardsQueue', 'DelayedMintingQueue',
  'SendConquestExtraRewardQueue', 'ConquestV2SendRewardQueue',
  'MintLeaderboardRewardsQueue', 'MintCardBackRewardsQueue',
  'MintSkypassConquestTicketsQueue', 'MintSkypassSilverCardsQueue',
  'MintSkypassStickersQueue'
]
const runnerSource = `func (r *SendTxnsRunner) Queues() []string {\nreturn []string{\n${queues
  .map(queue => `${queue},`)
  .join('\n')}\n}\n}`
const activeTasks = [
  'ExitConquestTask', 'MintStickerRewardsTask', 'DelayedMintingTask',
  'ConquestV2SendRewardTask', 'MintLeaderboardRewardsTask',
  'MintCardBackRewardsTask',
  'MintSkypassSilverCardsTask', 'MintSkypassStickersTask'
]
const evidence = {
  ExitConquestQueue: 'player_conquest_settlements player_items',
  MintStickerRewardsQueue: 'referral_sticker_reward_awards player_items',
  DelayedMintingQueue: 'player_conquest_gold_deliveries player_items',
  ConquestV2SendRewardQueue: 'staff_conquest_config_permissions preview',
  MintLeaderboardRewardsQueue: 'player_leaderboard_reward_awards player_items',
  MintCardBackRewardsQueue: 'player_skypass_claims SW_CARD_BACKS',
  MintSkypassSilverCardsQueue: 'player_skypass_claims SW_SILVER_CARDS',
  MintSkypassStickersQueue: 'player_skypass_claims SW_STICKERS'
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
  assert.ok(errors.some(error => error.includes('unreviewed transaction queue')))
  assert.ok(errors.some(error => error.includes('gained 1 production producer')))
  assert.ok(errors.some(error => error.includes('missing Cloudflare evidence')))
})
