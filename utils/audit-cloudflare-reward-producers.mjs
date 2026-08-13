import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

// This inventory is intentionally broader than the chain-effect audit. The
// source often writes an off-chain item first and mints it later in another
// worker, so auditing only contract calls can miss the player-facing producer.
export const EXPECTED_REWARD_PRODUCER_FILES = {
  'api/data/deck.go': {
    count: 4,
    disposition: 'offchain-starter-decks',
    evidenceFiles: [
      'cloudflare/src/player-rpc.ts',
      'cloudflare/src/player-support.ts'
    ],
    evidence: ['player_decks', 'SW_BASE_CARDS', 'SW_HERO']
  },
  'api/data/item.go': {
    count: 4,
    disposition: 'offchain-item-ledger',
    evidenceFiles: [
      'cloudflare/src/player-rpc.ts',
      'game-server-cloudflare/src/progression.ts'
    ],
    evidence: ['player_items', 'player_profiles']
  },
  'api/lib/accounts/registerer.go': {
    count: 2,
    disposition: 'offchain-account-bootstrap',
    evidenceFiles: ['cloudflare/src/player.ts'],
    evidence: ['account-bootstrap', 'STARTER_DECKS', 'SW_BASE_CARDS']
  },
  'api/lib/jobqueue/fix_starter_decks.go': {
    count: 1,
    disposition: 'zero-user-repair-and-support',
    evidenceFiles: [
      'docs/CLOUDFLARE_WORKER_AUDIT.md',
      'cloudflare/src/player-support.ts'
    ],
    evidence: ['zero-user fork', 'resetStarterDecks', 'player_items']
  },
  'api/lib/jobqueue/giveaway_offchain_tokens_runner.go': {
    count: 1,
    disposition: 'producerless-giveaway-and-support',
    evidenceFiles: [
      'docs/CLOUDFLARE_WORKER_AUDIT.md',
      'cloudflare/src/player-support.ts'
    ],
    evidence: [
      'Historical mass giveaways have no production producer',
      'player_operator_card_grants',
      'grantBaseCards'
    ]
  },
  'api/lib/jobqueue/lazy_migrations.go': {
    count: 3,
    disposition: 'zero-user-bootstrap',
    evidenceFiles: [
      'docs/CLOUDFLARE_WORKER_AUDIT.md',
      'cloudflare/src/player.ts'
    ],
    evidence: ['zero imported users', 'account-bootstrap', 'STARTER_DECKS']
  },
  'api/lib/jobqueue/leaderboard_rewards_runner.go': {
    count: 1,
    disposition: 'offchain-leaderboard',
    evidenceFiles: [
      'cloudflare/src/leaderboard-reward-worker.ts',
      'cloudflare/src/leaderboard-reward-policy.ts',
      'cloudflare/migrations/0088_leaderboard_reward_policy_activation.sql'
    ],
    evidence: [
      'player_leaderboard_reward_awards',
      'SW_CONQUEST_TICKET',
      'LEADERBOARD_REWARD_POLICY_HASH',
      'leaderboard_reward_cycle_policy_receipts',
      'active leaderboard reward policy receipt required'
    ]
  },
  'api/lib/levels/xp/leveller.go': {
    count: 1,
    disposition: 'offchain-referral-progression',
    evidenceFiles: [
      'game-server-cloudflare/src/progression.ts',
      'cloudflare/src/player-rpc.ts',
      'cloudflare/src/progression-support.ts'
    ],
    evidence: ['player_friend_points', 'SW_STICKER_POINTS', 'friend-level']
  },
  'api/lib/levels/xp/updater.go': {
    count: 2,
    disposition: 'offchain-match-and-quest-xp',
    evidenceFiles: [
      'game-server-cloudflare/src/progression.ts',
      'cloudflare/src/player-rpc.ts'
    ],
    evidence: [
      'multiplayer_match_experience',
      'player_quest_claim_receipts',
      'player_profiles'
    ]
  },
  'api/lib/payments/item_gainer.go': {
    count: 2,
    disposition: 'offchain-commerce',
    evidenceFiles: [
      'cloudflare/src/stripe-checkout.ts',
      'cloudflare/src/mobile-store-fulfillment.ts',
      'cloudflare/migrations/0085_stripe_fulfillment_receipts.sql'
    ],
    evidence: [
      'stripe_checkout_events',
      'stripe_checkout_fulfillment_receipts',
      'mobile_store_payments',
      'SW_CONQUEST_TICKET',
      'player_skypass_season_stats'
    ]
  },
  'api/lib/skypass/reward_applier.go': {
    count: 6,
    disposition: 'offchain-skypass',
    evidenceFiles: [
      'cloudflare/src/player-rpc.ts',
      'cloudflare/src/skypass-reward-policy.ts',
      'cloudflare/migrations/0090_skypass_reward_policy_activation.sql'
    ],
    evidence: [
      'player_skypass_claims',
      'SW_HERO',
      'SW_BASE_CARDS',
      'SW_CONQUEST_TICKET',
      'SW_STICKERS',
      'SW_STICKER_POINTS',
      'SW_SILVER_CARDS',
      'SW_CARD_BACKS',
      'SW_TITLES',
      'SKYPASS_REWARD_POLICY_HASH',
      'active SkyPass reward policy required'
    ]
  },
  'api/rpc/decks.go': {
    count: 2,
    disposition: 'offchain-starter-deck-support',
    evidenceFiles: ['cloudflare/src/player-support.ts'],
    evidence: ['resetStarterDecks', 'player_decks', 'player_items']
  },
  'api/rpc/gamemaster.go': {
    count: 3,
    disposition: 'offchain-staff-operations',
    evidenceFiles: [
      'cloudflare/src/player-support.ts',
      'cloudflare/src/progression-support.ts'
    ],
    evidence: [
      'staff_player_support_audit',
      'staff_progression_audit',
      'SW_STICKER_POINTS'
    ]
  },
  'api/rpc/skypass.go': {
    count: 1,
    disposition: 'offchain-skypass-support',
    evidenceFiles: ['cloudflare/src/skypass-support.ts'],
    evidence: ['staff_skypass_entitlement_audit', 'player_skypass_season_stats']
  }
}

const REWARD_MUTATION_NAMES = [
  'GainToken',
  'GainStickerPoints',
  'GainXP',
  'GainConquestTickets',
  'UnlockHero',
  'UnlockStarterDeckByDeckClass',
  'UnlockStarterDecksByLevel',
  'CreateStarterDecks'
]

const escapeRegex = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const mutationAlternation = REWARD_MUTATION_NAMES.map(escapeRegex).join('|')

const stripGoComments = source =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')

export const rewardMutationCount = source => {
  const withoutDeclarations = stripGoComments(source).replace(
    new RegExp(
      `\\bfunc\\s+(?:\\([^)]*\\)\\s*)?(?:${mutationAlternation})\\s*\\(`,
      'g'
    ),
    'func reviewedDeclaration('
  )
  const namedCalls = [
    ...withoutDeclarations.matchAll(
      new RegExp(`\\b(?:${mutationAlternation})\\s*\\(`, 'g')
    )
  ].length
  const literalItemSaves = [
    ...withoutDeclarations.matchAll(
      /\.Save\s*\(\s*&(?:data\.)?Item\s*\{/g
    )
  ].length
  const itemVariables = [
    ...withoutDeclarations.matchAll(
      /\b([A-Za-z_][A-Za-z0-9_]*)\s*:=\s*&(?:data\.)?Item\s*\{/g
    )
  ].map(match => match[1])
  const variableItemSaves = itemVariables.reduce(
    (count, variable) =>
      count +
      [
        ...withoutDeclarations.matchAll(
          new RegExp(`\\.Save\\s*\\(\\s*${escapeRegex(variable)}\\s*\\)`, 'g')
        )
      ].length,
    0
  )
  return namedCalls + literalItemSaves + variableItemSaves
}

export const rewardProducerAuditErrors = ({ sources, evidenceSources }) => {
  const errors = []
  const actual = Object.entries(sources)
    .map(([file, source]) => [file, rewardMutationCount(source)])
    .filter(([, count]) => count > 0)

  for (const [file, count] of actual) {
    const review = EXPECTED_REWARD_PRODUCER_FILES[file]
    if (!review) {
      errors.push(`unreviewed source reward-producer file: ${file}`)
      continue
    }
    if (count !== review.count) {
      errors.push(
        `${file} has ${count} reward mutations; reviewed count is ${review.count}`
      )
    }
  }
  for (const [file, review] of Object.entries(
    EXPECTED_REWARD_PRODUCER_FILES
  )) {
    if (!actual.some(([actualFile]) => actualFile === file)) {
      errors.push(`reviewed source reward-producer file disappeared: ${file}`)
      continue
    }
    if (
      review.disposition.startsWith('retired') ||
      review.disposition.includes('whole-feature')
    ) {
      errors.push(
        `${file} is an active source reward producer and cannot use a retirement disposition`
      )
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

const isSourceGo = file =>
  file.endsWith('.go') &&
  !file.endsWith('_test.go') &&
  !file.endsWith('.gen.go') &&
  !file.includes('/contracts/') &&
  !file.includes('/mock/') &&
  !file.includes('/apitest/')

const main = async () => {
  const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
  const files = (await sourceFiles(path.join(root, 'api'))).filter(isSourceGo)
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
      Object.entries(EXPECTED_REWARD_PRODUCER_FILES).map(
        async ([file, review]) => [
          file,
          (
            await Promise.all(
              review.evidenceFiles.map(evidenceFile =>
                readFile(path.join(root, evidenceFile), 'utf8')
              )
            )
          ).join('\n')
        ]
      )
    )
  )
  const errors = rewardProducerAuditErrors({ sources, evidenceSources })
  if (errors.length) {
    for (const error of errors) {
      process.stderr.write(`Reward producer audit: ${error}\n`)
    }
    process.exitCode = 1
    return
  }
  process.stdout.write(
    `All ${Object.keys(EXPECTED_REWARD_PRODUCER_FILES).length} source reward-producer files have reviewed non-retirement Cloudflare dispositions\n`
  )
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main()
}
