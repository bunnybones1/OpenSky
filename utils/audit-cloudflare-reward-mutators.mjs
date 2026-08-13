import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

// This is the destination-side companion to audit-cloudflare-reward-producers.
// It freezes every direct mutation of Cloud Weasel's authoritative inventory
// and progression ledgers. A new writer must be reviewed as receipt-backed,
// explicitly audited, or deterministic account bootstrap before it can ship.
export const EXPECTED_REWARD_MUTATOR_FILES = {
  'cloudflare/src/bot-match.ts': {
    count: 1,
    disposition: 'idempotent-practice-progression',
    evidenceFiles: [
      'cloudflare/migrations/0012_bot_match_reports.sql',
      'cloudflare/migrations/0072_bot_match_quest_receipts.sql'
    ],
    evidence: [
      'player_bot_match_reports',
      'player_bot_match_quest_progress',
      'PRIMARY KEY (report_id, quest_id)',
      'bot match quest receipt completion is invalid',
      'database.batch'
    ]
  },
  'cloudflare/src/conquest-delivery.ts': {
    count: 1,
    disposition: 'receipt-backed-conquest-delivery',
    evidenceFiles: ['cloudflare/migrations/0028_conquest_gold_delivery.sql'],
    evidence: [
      'player_conquest_gold_deliveries',
      'delivery_key TEXT UNIQUE',
      'database.batch'
    ]
  },
  'cloudflare/src/conquest-v2-reward-worker.ts': {
    count: 2,
    disposition: 'receipt-backed-conquest-v2-rewards',
    evidenceFiles: [
      'cloudflare/migrations/0068_conquest_v2_offchain_rewards.sql'
    ],
    evidence: [
      'player_conquest_v2_reward_awards',
      'delivery_key TEXT NOT NULL UNIQUE',
      'Conquest V2 reward awards are immutable',
      'database.batch'
    ]
  },
  'cloudflare/src/conquest.ts': {
    count: 1,
    disposition: 'atomic-conquest-entry-spend',
    evidenceFiles: ['cloudflare/migrations/0024_conquest_foundation.sql'],
    evidence: [
      'player_conquests',
      'entry_key TEXT NOT NULL UNIQUE',
      'player_conquests_active_user_idx',
      'database.batch'
    ]
  },
  'cloudflare/src/hero-skin-exchange.ts': {
    count: 2,
    disposition: 'receipt-backed-hero-exchange',
    evidenceFiles: [
      'cloudflare/migrations/0063_hero_skin_offchain_exchange.sql'
    ],
    evidence: [
      'player_hero_skin_exchanges',
      'delivery_key TEXT NOT NULL UNIQUE',
      'Hero skin exchange receipts are immutable',
      'database.batch'
    ]
  },
  'cloudflare/src/leaderboard-reward-worker.ts': {
    count: 2,
    disposition: 'receipt-backed-leaderboard-rewards',
    evidenceFiles: [
      'cloudflare/migrations/0049_leaderboard_reward_worker.sql'
    ],
    evidence: [
      'player_leaderboard_reward_awards',
      'delivery_key TEXT NOT NULL UNIQUE',
      'leaderboard reward awards are immutable',
      'database.batch'
    ]
  },
  'cloudflare/src/mobile-store-fulfillment.ts': {
    count: 3,
    disposition: 'receipt-backed-mobile-commerce',
    evidenceFiles: [
      'cloudflare/migrations/0062_mobile_store_offchain_fulfillment.sql'
    ],
    evidence: [
      'mobile_store_payments',
      'UNIQUE (provider, external_transaction_id)',
      'Mobile store payments are immutable',
      'database.batch'
    ]
  },
  'cloudflare/src/player-rpc.ts': {
    count: 14,
    disposition: 'claims-and-player-owned-state',
    evidenceFiles: [
      'cloudflare/migrations/0069_quest_claim_receipts.sql',
      'cloudflare/migrations/0005_legacy_rpc_compatibility.sql'
    ],
    evidence: [
      'player_quest_claim_receipts',
      'quest claim receipts are immutable',
      'player_skypass_claims',
      'player_deferred_item_updates',
      'delivery_key',
      'database.batch'
    ]
  },
  'cloudflare/src/player-support.ts': {
    count: 6,
    disposition: 'audited-player-support',
    evidenceFiles: [
      'cloudflare/migrations/0039_player_support_operations.sql',
      'cloudflare/migrations/0066_offchain_operator_card_grants.sql'
    ],
    evidence: [
      'staff_player_support_audit',
      'staff player support audit rows are immutable',
      'player_operator_card_grants',
      'Operator card grant receipts are immutable',
      'database.batch'
    ]
  },
  'cloudflare/src/player.ts': {
    count: 5,
    disposition: 'deterministic-account-bootstrap',
    evidenceFiles: [],
    evidence: [
      'INSERT OR IGNORE INTO game_accounts',
      'account-bootstrap',
      'STARTER_DECKS',
      'STARTER_CARDS',
      'database.batch'
    ]
  },
  'cloudflare/src/progression-support.ts': {
    count: 8,
    disposition: 'audited-staff-progression',
    evidenceFiles: ['cloudflare/migrations/0041_progression_operations.sql'],
    evidence: [
      'staff_progression_audit',
      'staff progression audit rows are immutable',
      'friend-level',
      'database.batch'
    ]
  },
  'cloudflare/src/referral-sticker-rewards.ts': {
    count: 5,
    disposition: 'receipt-backed-referral-rewards',
    evidenceFiles: ['cloudflare/migrations/0058_referral_sticker_rewards.sql'],
    evidence: [
      'referral_sticker_reward_batches',
      'referral_sticker_reward_awards',
      'claim_token TEXT NOT NULL UNIQUE',
      'referral sticker reward awards are immutable',
      'database.batch'
    ]
  },
  'cloudflare/src/silver-ticket-exchange.ts': {
    count: 2,
    disposition: 'receipt-backed-silver-exchange',
    evidenceFiles: ['cloudflare/migrations/0060_silver_ticket_exchange.sql'],
    evidence: [
      'player_silver_ticket_exchanges',
      'delivery_key TEXT NOT NULL UNIQUE',
      'Silver exchange receipts are immutable',
      'database.batch'
    ]
  },
  'cloudflare/src/skypass-support.ts': {
    count: 4,
    disposition: 'audited-skypass-support',
    evidenceFiles: [
      'cloudflare/migrations/0042_skypass_entitlement_operations.sql'
    ],
    evidence: [
      'staff_skypass_entitlement_audit',
      'staff skypass entitlement audit rows are immutable',
      'database.batch'
    ]
  },
  'cloudflare/src/stripe-checkout.ts': {
    count: 3,
    disposition: 'receipt-backed-stripe-commerce',
    evidenceFiles: ['cloudflare/migrations/0051_stripe_checkout.sql'],
    evidence: [
      'stripe_checkout_events',
      'Stripe events are immutable',
      'event_id TEXT PRIMARY KEY',
      'database.batch'
    ]
  },
  'game-server-cloudflare/src/conquest-points.ts': {
    count: 2,
    disposition: 'receipt-backed-match-conquest-points',
    evidenceFiles: ['cloudflare/migrations/0071_conquest_point_receipts.sql'],
    evidence: [
      'multiplayer_match_conquest_point_players',
      'settlement_token',
      'match Conquest point player receipts are immutable',
      'database.batch'
    ]
  },
  'game-server-cloudflare/src/conquest-settlement.ts': {
    count: 1,
    disposition: 'receipt-backed-conquest-settlement',
    evidenceFiles: ['cloudflare/migrations/0027_conquest_reward_settlement.sql'],
    evidence: [
      'player_conquest_settlements',
      'settlement_key TEXT NOT NULL UNIQUE',
      'database.batch'
    ]
  },
  'game-server-cloudflare/src/progression.ts': {
    count: 4,
    disposition: 'receipt-backed-match-progression',
    evidenceFiles: ['cloudflare/migrations/0070_match_experience_receipts.sql'],
    evidence: [
      'multiplayer_match_experience_players',
      'settlement_token',
      'match experience player receipts are immutable',
      'database.batch'
    ]
  }
}

const REWARD_LEDGER_TABLES = [
  'player_items',
  'player_card_unlocks',
  'player_profiles',
  'player_progression',
  'player_conquest_points',
  'player_skypass_season_stats',
  'player_friend_points'
]

const tableAlternation = REWARD_LEDGER_TABLES.join('|')
const mutationPattern = new RegExp(
  `\\b(?:INSERT(?:\\s+OR\\s+(?:IGNORE|REPLACE|ABORT|FAIL|ROLLBACK))?` +
    `\\s+INTO|UPDATE)\\s+(?:${tableAlternation})\\b`,
  'g'
)
const CHAIN_EFFECT_PATTERNS = [
  /prepareOnChain/i,
  /prepareTransferAssets/i,
  /sendTransaction/i,
  /MintHero/,
  /PurchaseWithUSDC/,
  /ProcessSPUSDC/
]

const stripTypeScriptComments = source =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')

export const rewardMutationCount = source =>
  [...stripTypeScriptComments(source).matchAll(mutationPattern)].length

export const rewardMutatorAuditErrors = ({ sources, evidenceSources }) => {
  const errors = []
  const actual = Object.entries(sources)
    .map(([file, source]) => [file, rewardMutationCount(source)])
    .filter(([, count]) => count > 0)

  for (const [file, count] of actual) {
    const review = EXPECTED_REWARD_MUTATOR_FILES[file]
    if (!review) {
      errors.push(`unreviewed TypeScript reward-mutator file: ${file}`)
      continue
    }
    if (count !== review.count) {
      errors.push(
        `${file} has ${count} reward-ledger mutations; reviewed count is ${review.count}`
      )
    }
    for (const pattern of CHAIN_EFFECT_PATTERNS) {
      if (pattern.test(sources[file])) {
        errors.push(
          `${file} combines a reward mutation with a chain effect: ${pattern.source}`
        )
      }
    }
  }

  for (const [file, review] of Object.entries(
    EXPECTED_REWARD_MUTATOR_FILES
  )) {
    if (!actual.some(([actualFile]) => actualFile === file)) {
      errors.push(`reviewed TypeScript reward-mutator file disappeared: ${file}`)
      continue
    }
    const evidence = evidenceSources[file] ?? ''
    for (const token of review.evidence) {
      if (!evidence.includes(token)) {
        errors.push(`${file} is missing ${review.disposition} evidence: ${token}`)
      }
    }
  }
  return errors
}

const sourceFiles = async directory => {
  const entries = await readdir(directory, { withFileTypes: true })
  const nested = await Promise.all(
    entries.map(entry => {
      const entryPath = path.join(directory, entry.name)
      return entry.isDirectory() ? sourceFiles(entryPath) : [entryPath]
    })
  )
  return nested.flat()
}

const isSourceTypeScript = file =>
  file.endsWith('.ts') &&
  !file.endsWith('.test.ts') &&
  !file.endsWith('.spec.ts') &&
  !file.endsWith('.d.ts')

const main = async () => {
  const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
  const sourceDirectories = [
    'cloudflare/src',
    'game-server-cloudflare/src',
    'match-service-cloudflare/src'
  ]
  const files = (
    await Promise.all(
      sourceDirectories.map(directory => sourceFiles(path.join(root, directory)))
    )
  )
    .flat()
    .filter(isSourceTypeScript)
  const sources = Object.fromEntries(
    await Promise.all(
      files.map(async file => [
        path.relative(root, file),
        await readFile(file, 'utf8')
      ])
    )
  )
  const evidenceSources = Object.fromEntries(
    await Promise.all(
      Object.entries(EXPECTED_REWARD_MUTATOR_FILES).map(
        async ([file, review]) => [
          file,
          (
            await Promise.all(
              [file, ...review.evidenceFiles].map(evidenceFile =>
                readFile(path.join(root, evidenceFile), 'utf8')
              )
            )
          ).join('\n')
        ]
      )
    )
  )
  const errors = rewardMutatorAuditErrors({ sources, evidenceSources })
  if (errors.length) {
    for (const error of errors) {
      process.stderr.write(`Reward mutator audit: ${error}\n`)
    }
    process.exitCode = 1
    return
  }
  const mutationCount = Object.values(EXPECTED_REWARD_MUTATOR_FILES).reduce(
    (sum, review) => sum + review.count,
    0
  )
  process.stdout.write(
    `All ${Object.keys(EXPECTED_REWARD_MUTATOR_FILES).length} TypeScript reward-mutator files and ${mutationCount} ledger writes have reviewed off-chain dispositions\n`
  )
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main()
}
