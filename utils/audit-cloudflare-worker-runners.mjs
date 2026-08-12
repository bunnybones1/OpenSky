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
    disposition: 'dormant',
    evidenceFile: 'cloudflare/src/api.ts',
    evidence: ["case 'ConquestV2Pool'", 'amount: 0, totalWeight: 0']
  },
  ConquestV2RewardsRunner: {
    disposition: 'dormant',
    evidenceFile: 'utils/audit-cloudflare-mint-queues.mjs',
    evidence: ['ConquestV2SendRewardQueue', "disposition: 'dormant'"]
  },
  CrashedMatchCleanupRunner: {
    disposition: 'superseded',
    evidenceFile: 'game-server-cloudflare/src/game-match.ts',
    evidence: ['async alarm()', 'persisted deadlines']
  },
  DeckRankUpdateRunner: {
    disposition: 'ported',
    evidenceFile: 'game-server-cloudflare/src/deck-ranks.ts',
    evidence: ['api/lib/decks/rank_updater.go', 'multiplayer_match_deck_ranks_applied']
  },
  FixStarterDecksRunner: {
    disposition: 'retired',
    evidenceFile: 'cloudflare/src/starter-decks.ts',
    evidence: ['STARTER_DECKS', 'decodeDeckString']
  },
  GiveawayOffChainTokensRunner: {
    disposition: 'retired',
    evidenceFile: 'api/lib/jobqueue/giveaway_offchain_tokens_runner.go',
    evidence: ['GiveawayOffChainTokensTask', 'used to give away off-chain tokens in mass']
  },
  GrantStickerRewardsRunner: {
    disposition: 'ported',
    evidenceFile: 'cloudflare/src/referral-sticker-rewards.ts',
    evidence: ['referral_sticker_reward_awards', 'player_items']
  },
  LazyMigrationRunner: {
    disposition: 'retired',
    evidenceFile: 'api/lib/jobqueue/lazy_migrations.go',
    evidence: ['starterDeckV2Migration', 'addHeroAda']
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
    disposition: 'retired',
    evidenceFile: 'docs/CLOUDFLARE_RPC_AUDIT.md',
    evidence: ['on-chain/burner transaction-preparation RPCs', 'off-chain reward policy']
  },
  OnChainPaymentListenerRunner: {
    disposition: 'retired',
    evidenceFile: 'docs/CLOUDFLARE_RPC_AUDIT.md',
    evidence: ['on-chain/burner transaction-preparation RPCs', 'off-chain reward policy']
  },
  PromoteGrandmastersRunner: {
    disposition: 'ported',
    evidenceFile: 'cloudflare/src/leaderboard-rank-reset.ts',
    evidence: ['grandweaverStatements', 'GRANDWEAVER_COUNT']
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
    evidence: ['All 13 source transaction queues', 'offchain']
  },
  SkypassAutoClaimRunner: {
    disposition: 'ported',
    evidenceFile: 'cloudflare/src/skypass-auto-claim.ts',
    evidence: ['claimSkypassRewards', 'player_skypass_auto_claims']
  },
  SkypassEndOfSeasonRunner: {
    disposition: 'ported',
    evidenceFile: 'cloudflare/src/skypass-auto-claim.ts',
    evidence: ['seasonStart', 'skypass_season_close_cycles']
  },
  StripeEventRunner: {
    disposition: 'ported',
    evidenceFile: 'cloudflare/src/stripe-checkout.ts',
    evidence: ['Stripe-Signature', 'stripe_checkout_events']
  },
  TxnStatusRunner: {
    disposition: 'retired',
    evidenceFile: 'utils/audit-cloudflare-mint-queues.mjs',
    evidence: ['transaction queues', 'offchain']
  }
}

export const stripGoComments = source =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')

export const extractActiveRunnerRegistrations = source => [
  ...new Set(
    [...stripGoComments(source).matchAll(/\bNew([A-Za-z0-9]+Runner)\s*\(/g)].map(
      match => match[1]
    )
  )
]

export const auditWorkerRunners = ({ source, evidenceSources }) => {
  const active = extractActiveRunnerRegistrations(source).sort()
  const reviewed = Object.keys(EXPECTED_RUNNERS).sort()
  const errors = []

  for (const runner of active) {
    if (!EXPECTED_RUNNERS[runner]) errors.push(`unreviewed active runner: ${runner}`)
  }
  for (const runner of reviewed) {
    if (!active.includes(runner)) errors.push(`reviewed runner is no longer active: ${runner}`)
    const review = EXPECTED_RUNNERS[runner]
    const evidence = evidenceSources[runner] ?? ''
    for (const token of review.evidence) {
      if (!evidence.includes(token)) {
        errors.push(`${runner} is missing ${review.disposition} evidence: ${token}`)
      }
    }
  }

  const byDisposition = Object.fromEntries(
    ['ported', 'superseded', 'retired', 'dormant', 'optional', 'actionable'].map(
      disposition => [
        disposition,
        active.filter(runner => EXPECTED_RUNNERS[runner]?.disposition === disposition)
      ]
    )
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
  const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
  const audit = await loadAudit(root)
  if (process.argv.includes('--json')) {
    process.stdout.write(`${JSON.stringify(audit, null, 2)}\n`)
  } else {
    process.stdout.write(`Active source worker runners: ${audit.active.length}\n`)
    for (const [disposition, runners] of Object.entries(audit.byDisposition)) {
      process.stdout.write(`${disposition}: ${runners.length}${
        runners.length ? ` (${runners.join(', ')})` : ''
      }\n`)
    }
  }
  if (audit.errors.length) {
    for (const error of audit.errors) process.stderr.write(`Worker audit: ${error}\n`)
    process.exitCode = 1
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main()
}
