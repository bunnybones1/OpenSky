import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

// Every active registration in api/cmd/opensky-worker/main.go must have an
// explicit Cloud Weasel disposition. In particular, an on-chain runner is not
// considered ported merely because the TypeScript application has a similarly
// named endpoint.
export const EXPECTED_RUNNERS = {
  AccountDeletionRunner: {
    disposition: 'ported',
    evidenceFile: 'cloudflare/src/account-deletion.ts',
    evidence: ['finalizeDue', "status = 'PENDING' AND execute_at <= ?"]
  },
  BalanceSyncRunner: {
    disposition: 'superseded',
    evidenceFile: 'cloudflare/src/wallet-links.ts',
    evidence: ['WalletLinksRepository', 'cleanupExpired']
  },
  ConquestV2PoolRunner: {
    disposition: 'ported',
    evidenceFile: 'cloudflare/src/conquest-v2-economy.ts',
    evidence: ['poolSnapshot', 'conquest_v2_pool_cache']
  },
  ConquestV2RewardsRunner: {
    disposition: 'ported',
    evidenceFile: 'cloudflare/src/conquest-v2-reward-worker.ts',
    evidence: [
      'runDueConquestV2Rewards',
      'conquest_v2_reward_schedule_activations',
      'conquest_v2_reward_cycle_policy_receipts',
      'player_conquest_v2_reward_awards',
      'player_items'
    ]
  },
  CrashedMatchCleanupRunner: {
    disposition: 'superseded',
    evidenceFile: 'game-server-cloudflare/src/game-match.ts',
    evidence: ['async alarm()', 'persisted deadlines']
  },
  DeckRankUpdateRunner: {
    disposition: 'ported',
    evidenceFile: 'game-server-cloudflare/src/deck-ranks.ts',
    evidence: [
      'stageDeckRankJob',
      'runDeckRankJob',
      'multiplayer_match_deck_rank_jobs',
      'DECK_RANK_UPDATE_RETRY_DELAY_MS = 5_000',
      'DECK_RANK_UPDATE_MAX_ATTEMPTS = 5',
      'waiting for terminal match publication',
      'multiplayer_match_deck_ranks_applied'
    ]
  },
  FixStarterDecksRunner: {
    disposition: 'superseded',
    evidenceFile: 'cloudflare/src/player-support.ts',
    evidence: ['resetStarterDecks', 'RESET_STARTER_DECKS', 'SW_BASE_CARDS']
  },
  GiveawayOffChainTokensRunner: {
    disposition: 'superseded',
    evidenceFile: 'cloudflare/migrations/0093_operator_item_grant_receipts.sql',
    evidence: [
      'player_operator_item_grants',
      'player_operator_item_grant_inventory_grants',
      'Operator item grant receipt completion is invalid'
    ]
  },
  GrantStickerRewardsRunner: {
    disposition: 'ported',
    evidenceFile: 'cloudflare/src/referral-sticker-rewards.ts',
    evidence: ['referral_sticker_reward_awards', 'player_items']
  },
  LazyMigrationRunner: {
    disposition: 'superseded',
    evidenceFile: 'cloudflare/src/player.ts',
    evidence: [
      "VALUES (?, 'SW_HERO', 1, 1, 1, 'account-bootstrap'",
      'for (const deck of STARTER_DECKS)',
      "'starter-deck'"
    ]
  },
  LeaderboardRewardsRunner: {
    disposition: 'ported',
    evidenceFile: 'cloudflare/src/leaderboard-reward-worker.ts',
    evidence: ['player_leaderboard_reward_awards', 'player_items']
  },
  MarkNotNewRunner: {
    disposition: 'ported',
    evidenceFile: 'cloudflare/src/player-rpc.ts',
    evidence: ['applyDeferredItemUpdates', 'player_deferred_item_updates']
  },
  OnChainPaymentEventRunner: {
    disposition: 'superseded',
    evidenceFile: 'cloudflare/src/stripe-checkout.ts',
    evidence: [
      'premiumSkypassCommerceCapability',
      'SW_CONQUEST_TICKET',
      'stripe_checkout_events',
      'player_items'
    ]
  },
  OnChainPaymentListenerRunner: {
    disposition: 'superseded',
    evidenceFile: 'cloudflare/src/stripe-checkout.ts',
    evidence: [
      'webhookSignature',
      "request.headers.get('Stripe-Signature')",
      'SUCCESS_EVENTS',
      'stripe_checkout_events',
      'player_items'
    ]
  },
  PromoteGrandmastersRunner: {
    disposition: 'ported',
    evidenceFile: 'game-server-cloudflare/src/progression.ts',
    evidence: [
      'runPublishedGrandweaverJob',
      'multiplayer_grandweaver_jobs',
      'GRANDWEAVER_RETRY_DELAY_MS = 15_000',
      'GRANDWEAVER_MAX_ATTEMPTS = 5',
      'grandweaverStatements',
      'failExhaustedGrandweaverJob'
    ]
  },
  PushNotificationsRunner: {
    disposition: 'ported',
    evidenceFile: 'cloudflare/src/push-notifications.ts',
    evidence: [
      'runPushNotifications',
      'include_aliases',
      'idempotency_key',
      "status = 'SENT'"
    ]
  },
  RankPointsHardResetRunner: {
    disposition: 'ported',
    evidenceFile: 'cloudflare/src/leaderboard-rank-reset.ts',
    evidence: ['hardResetStatements', 'leaderboard_rank_reset_receipts']
  },
  RankPointsSoftResetRunner: {
    disposition: 'ported',
    evidenceFile: 'cloudflare/src/leaderboard-rank-reset.ts',
    evidence: ['softResetStatements', 'leaderboard_rank_reset_receipts']
  },
  SendTxnsRunner: {
    disposition: 'superseded',
    evidenceFile: 'utils/audit-cloudflare-mint-queues.mjs',
    evidence: [
      'All 12 player-outcome transaction queues have off-chain fulfillment',
      'unused infrastructure'
    ]
  },
  SkypassAutoClaimRunner: {
    disposition: 'ported',
    evidenceFile: 'cloudflare/src/skypass-auto-claim.ts',
    evidence: [
      'claimSkypassRewards',
      'player_skypass_auto_claims',
      'skypass_reward_active_rewards'
    ]
  },
  SkypassEndOfSeasonRunner: {
    disposition: 'ported',
    evidenceFile: 'cloudflare/src/skypass-auto-claim.ts',
    evidence: [
      'seasonStart',
      'skypass_season_close_cycles',
      'skypass_reward_active_rewards'
    ]
  },
  StripeEventRunner: {
    disposition: 'ported',
    evidenceFile: 'cloudflare/src/stripe-checkout.ts',
    evidence: ['Stripe-Signature', 'stripe_checkout_events']
  },
  TxnStatusRunner: {
    disposition: 'superseded',
    evidenceFile: 'utils/audit-cloudflare-mint-queues.mjs',
    evidence: [
      'All 12 player-outcome transaction queues have off-chain fulfillment',
      'receipt'
    ]
  }
}

export const stripGoComments = source =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')

export const extractActiveRunnerRegistrations = source => [
  ...new Set(
    [
      ...stripGoComments(source).matchAll(/\bNew([A-Za-z0-9]+Runner)\s*\(/g)
    ].map(match => match[1])
  )
]

export const auditWorkerRunners = ({ source, evidenceSources }) => {
  const active = extractActiveRunnerRegistrations(source).sort()
  const reviewed = Object.keys(EXPECTED_RUNNERS).sort()
  const errors = []

  for (const runner of active) {
    if (!EXPECTED_RUNNERS[runner])
      errors.push(`unreviewed active runner: ${runner}`)
  }
  for (const runner of reviewed) {
    if (!active.includes(runner))
      errors.push(`reviewed runner is no longer active: ${runner}`)
    const review = EXPECTED_RUNNERS[runner]
    if (review.disposition === 'retired') {
      errors.push(
        `${runner} is an active source runner and cannot be retired; preserve its behavior as ported or superseded`
      )
    }
    const evidence = evidenceSources[runner] ?? ''
    for (const token of review.evidence) {
      if (!evidence.includes(token)) {
        errors.push(
          `${runner} is missing ${review.disposition} evidence: ${token}`
        )
      }
    }
  }

  const byDisposition = Object.fromEntries(
    [
      'ported',
      'superseded',
      'retired',
      'dormant',
      'optional',
      'actionable'
    ].map(disposition => [
      disposition,
      active.filter(
        runner => EXPECTED_RUNNERS[runner]?.disposition === disposition
      )
    ])
  )
  return { active, reviewed, byDisposition, errors }
}

const loadAudit = async root => {
  const source = await readFile(
    path.join(root, 'api/cmd/opensky-worker/main.go'),
    'utf8'
  )
  const evidenceSources = {}
  for (const [runner, review] of Object.entries(EXPECTED_RUNNERS)) {
    evidenceSources[runner] = await readFile(
      path.join(root, review.evidenceFile),
      'utf8'
    )
  }
  return auditWorkerRunners({ source, evidenceSources })
}

const main = async () => {
  const root = path.resolve(
    path.dirname(new URL(import.meta.url).pathname),
    '..'
  )
  const audit = await loadAudit(root)
  if (process.argv.includes('--json')) {
    process.stdout.write(`${JSON.stringify(audit, null, 2)}\n`)
  } else {
    process.stdout.write(
      `Active source worker runners: ${audit.active.length}\n`
    )
    for (const [disposition, runners] of Object.entries(audit.byDisposition)) {
      process.stdout.write(
        `${disposition}: ${runners.length}${
          runners.length ? ` (${runners.join(', ')})` : ''
        }\n`
      )
    }
  }
  if (audit.errors.length) {
    for (const error of audit.errors)
      process.stderr.write(`Worker audit: ${error}\n`)
    process.exitCode = 1
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  await main()
}
