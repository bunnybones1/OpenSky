import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

export const EXPECTED_QUEUES = {
  ExitConquestQueue: {
    task: 'ExitConquestTask',
    sourceProducer: true,
    disposition: 'offchain',
    evidence: [
      'player_conquest_settlement_inventory_grants',
      'Conquest inventory grant receipts are immutable',
      'Conquest settlement completion is invalid'
    ]
  },
  MintConquestEntriesQueue: {
    task: 'MintConquestEntriesTask',
    sourceProducer: false,
    disposition: 'offchain-commerce',
    evidence: [
      'stripe_checkout_fulfillment_receipts',
      'Stripe fulfillment receipts are immutable',
      'Stripe payment fulfillment is invalid',
      'SW_CONQUEST_TICKET'
    ]
  },
  MintSilverCardRewardsQueue: {
    task: 'MintSilverCardRewardsTask',
    sourceProducer: false,
    disposition: 'offchain-leaderboard',
    evidence: [
      'leaderboard_reward_schedule_activations',
      'leaderboard_reward_cycle_policy_receipts',
      'player_leaderboard_reward_inventory_grants',
      'leaderboard reward inventory grants are immutable',
      'leaderboard reward receipt completion is invalid',
      'SW_SILVER_CARDS'
    ]
  },
  MintTicketRewardsQueue: {
    task: 'MintTicketRewardsTask',
    sourceProducer: false,
    disposition: 'offchain-leaderboard',
    evidence: [
      'leaderboard_reward_schedule_activations',
      'leaderboard_reward_cycle_policy_receipts',
      'player_leaderboard_reward_inventory_grants',
      'leaderboard reward inventory grants are immutable',
      'leaderboard reward receipt completion is invalid',
      'SW_CONQUEST_TICKET'
    ]
  },
  MintStickerRewardsQueue: {
    task: 'MintStickerRewardsTask',
    sourceProducer: true,
    disposition: 'offchain',
    evidence: [
      'referral_sticker_active_schedule_entries',
      'referral_sticker_reward_batch_schedule_receipts',
      'referral_sticker_reward_inventory_grants',
      'referral sticker inventory grants are immutable',
      'referral sticker reward batch update is invalid'
    ]
  },
  DelayedMintingQueue: {
    task: 'DelayedMintingTask',
    sourceProducer: true,
    disposition: 'offchain',
    evidence: [
      'player_conquest_gold_delivery_inventory_grants',
      'Conquest Gold grant receipts are immutable',
      'Conquest Gold delivery transition is invalid'
    ]
  },
  SendConquestExtraRewardQueue: {
    task: 'SendConquestExtraRewardTask',
    sourceProducer: false,
    disposition: 'retired-whole-feature',
    evidence: ['SendConquestExtraRewardQueue', 'no production producer']
  },
  ConquestV2SendRewardQueue: {
    task: 'ConquestV2SendRewardTask',
    sourceProducer: true,
    disposition: 'offchain',
    evidence: [
      'conquest_v2_reward_schedule_activations',
      'conquest_v2_reward_cycle_policy_receipts',
      'player_conquest_v2_reward_inventory_grants',
      'Conquest V2 reward inventory grants are immutable',
      'Conquest V2 reward receipt completion is invalid'
    ]
  },
  MintLeaderboardRewardsQueue: {
    task: 'MintLeaderboardRewardsTask',
    sourceProducer: true,
    disposition: 'offchain',
    evidence: [
      'leaderboard_reward_schedule_activations',
      'leaderboard_reward_cycle_policy_receipts',
      'player_leaderboard_reward_inventory_grants',
      'leaderboard reward inventory grants are immutable',
      'leaderboard reward receipt completion is invalid'
    ]
  },
  MintCardBackRewardsQueue: {
    task: 'MintCardBackRewardsTask',
    sourceProducer: true,
    disposition: 'offchain',
    evidence: [
      'player_skypass_claim_inventory_grants',
      'SkyPass claim inventory grants are immutable',
      'SkyPass claim receipt completion is invalid',
      'active SkyPass reward policy required',
      'SW_CARD_BACKS'
    ]
  },
  MintSkypassConquestTicketsQueue: {
    task: 'MintSkypassConquestTicketsTask',
    sourceProducer: false,
    disposition: 'offchain-skypass',
    evidence: [
      'player_skypass_claim_inventory_grants',
      'SkyPass claim inventory grants are immutable',
      'SkyPass claim receipt completion is invalid',
      'active SkyPass reward policy required',
      'SW_CONQUEST_TICKET'
    ]
  },
  MintSkypassSilverCardsQueue: {
    task: 'MintSkypassSilverCardsTask',
    sourceProducer: true,
    disposition: 'offchain',
    evidence: [
      'player_skypass_claim_inventory_grants',
      'SkyPass claim inventory grants are immutable',
      'SkyPass claim receipt completion is invalid',
      'active SkyPass reward policy required',
      'SW_SILVER_CARDS'
    ]
  },
  MintSkypassStickersQueue: {
    task: 'MintSkypassStickersTask',
    sourceProducer: true,
    disposition: 'offchain',
    evidence: [
      'player_skypass_claim_inventory_grants',
      'SkyPass claim inventory grants are immutable',
      'SkyPass claim receipt completion is invalid',
      'active SkyPass reward policy required',
      'SW_STICKERS'
    ]
  }
}

export const sendTxnQueues = source => {
  const body = source.match(
    /func \(r \*SendTxnsRunner\) Queues\(\) \[\]string \{([\s\S]*?)\n\}/
  )?.[1]
  return body
    ? [...body.matchAll(/\b([A-Za-z0-9]+Queue),/g)].map(match => match[1])
    : []
}

export const isExecutableGoSource = file =>
  file.endsWith('.go') &&
  !file.endsWith('_test.go') &&
  !file.endsWith('.gen.go') &&
  !file.includes('/contracts/') &&
  !file.includes('/mock/')

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

export const mintQueueAuditErrors = ({
  runnerSource,
  goSource,
  evidenceSources
}) => {
  const errors = []
  const actual = sendTxnQueues(runnerSource)
  if (!actual.length)
    errors.push('SendTxnsRunner queue list could not be parsed')
  for (const queue of actual) {
    if (!EXPECTED_QUEUES[queue])
      errors.push(`unreviewed transaction queue: ${queue}`)
  }
  for (const queue of Object.keys(EXPECTED_QUEUES)) {
    if (!actual.includes(queue))
      errors.push(`reviewed transaction queue disappeared: ${queue}`)
  }
  for (const [queue, review] of Object.entries(EXPECTED_QUEUES)) {
    const producers = [
      ...goSource.matchAll(new RegExp(`\\b${review.task}\\s*\\{`, 'g'))
    ].length
    if (!review.sourceProducer && producers !== 0) {
      errors.push(
        `${queue} gained ${producers} production producer(s) without review`
      )
    }
    if (review.sourceProducer && producers === 0) {
      errors.push(`${queue} lost its reviewed source producer`)
    }
    if (
      review.sourceProducer &&
      !review.disposition.startsWith('offchain')
    ) {
      errors.push(
        `${queue} has a source reward producer and must have an offchain disposition`
      )
    }
    if (
      review.disposition.startsWith('retired') &&
      (review.sourceProducer || producers > 0)
    ) {
      errors.push(
        `${queue} cannot retire a source-produced reward instead of replacing its fulfillment offchain`
      )
    }
    const evidence = evidenceSources[queue] ?? ''
    for (const token of review.evidence) {
      if (!evidence.includes(token)) {
        errors.push(`${queue} is missing Cloudflare evidence: ${token}`)
      }
    }
  }
  return errors
}

const main = async () => {
  const root = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '..'
  )
  const runnerSource = await readFile(
    path.join(root, 'api/lib/jobqueue/send_txns_runner.go'),
    'utf8'
  )
  const producerFiles = (await sourceFiles(path.join(root, 'api'))).filter(
    isExecutableGoSource
  )
  const goSource = (
    await Promise.all(
      producerFiles.map(file => readFile(file, 'utf8'))
    )
  ).join('\n')
  const [
    conquestSettlement,
    conquestDelivery,
    referral,
    leaderboard,
    skypass,
    conquestV2,
    stripeCheckout,
    policy
  ] = await Promise.all([
    Promise.all([
      readFile(
        path.join(root, 'game-server-cloudflare/src/conquest-settlement.ts'),
        'utf8'
      ),
      readFile(
        path.join(
          root,
          'cloudflare/migrations/0075_conquest_settlement_receipts.sql'
        ),
        'utf8'
      )
    ]).then(parts => parts.join('\n')),
    Promise.all([
      readFile(path.join(root, 'cloudflare/src/conquest-delivery.ts'), 'utf8'),
      readFile(
        path.join(
          root,
          'cloudflare/migrations/0076_conquest_gold_delivery_receipts.sql'
        ),
        'utf8'
      )
    ]).then(parts => parts.join('\n')),
    Promise.all([
      readFile(
        path.join(root, 'cloudflare/src/referral-sticker-rewards.ts'),
        'utf8'
      ),
      readFile(
        path.join(
          root,
          'cloudflare/migrations/0082_referral_sticker_delivery_receipts.sql'
        ),
        'utf8'
      ),
      readFile(
        path.join(
          root,
          'cloudflare/migrations/0087_referral_sticker_schedule_activation.sql'
        ),
        'utf8'
      )
    ]).then(parts => parts.join('\n')),
    Promise.all([
      readFile(
        path.join(root, 'cloudflare/src/leaderboard-reward-worker.ts'),
        'utf8'
      ),
      readFile(
        path.join(
          root,
          'cloudflare/migrations/0080_leaderboard_reward_receipts.sql'
        ),
        'utf8'
      ),
      readFile(
        path.join(
          root,
          'cloudflare/migrations/0088_leaderboard_reward_policy_activation.sql'
        ),
        'utf8'
      )
    ]).then(parts => parts.join('\n')),
    Promise.all([
      readFile(path.join(root, 'cloudflare/src/player-rpc.ts'), 'utf8'),
      readFile(
        path.join(
          root,
          'cloudflare/migrations/0083_skypass_claim_fulfillment_receipts.sql'
        ),
        'utf8'
      ),
      readFile(
        path.join(
          root,
          'cloudflare/migrations/0090_skypass_reward_policy_activation.sql'
        ),
        'utf8'
      )
    ]).then(parts => parts.join('\n')),
    Promise.all([
      readFile(
        path.join(root, 'cloudflare/src/conquest-v2-economy.ts'),
        'utf8'
      ),
      readFile(
        path.join(root, 'cloudflare/src/conquest-v2-reward-worker.ts'),
        'utf8'
      ),
      readFile(path.join(root, 'cloudflare/src/api.ts'), 'utf8'),
      readFile(path.join(root, 'cloudflare/src/staff.ts'), 'utf8'),
      readFile(path.join(root, 'docs/CLOUDFLARE_RPC_AUDIT.md'), 'utf8'),
      readFile(
        path.join(
          root,
          'cloudflare/migrations/0079_conquest_v2_reward_receipts.sql'
        ),
        'utf8'
      ),
      readFile(
        path.join(
          root,
          'cloudflare/migrations/0089_conquest_v2_reward_policy_activation.sql'
        ),
        'utf8'
      )
    ]).then(parts => parts.join('\n')),
    Promise.all([
      readFile(path.join(root, 'cloudflare/src/stripe-checkout.ts'), 'utf8'),
      readFile(
        path.join(
          root,
          'cloudflare/migrations/0085_stripe_fulfillment_receipts.sql'
        ),
        'utf8'
      )
    ]).then(parts => parts.join('\n')),
    readFile(path.join(root, 'docs/OFFCHAIN_REWARD_POLICY.md'), 'utf8')
  ])
  const evidenceSources = {
    ExitConquestQueue: conquestSettlement,
    MintConquestEntriesQueue: stripeCheckout,
    MintSilverCardRewardsQueue: leaderboard,
    MintTicketRewardsQueue: leaderboard,
    MintStickerRewardsQueue: referral,
    DelayedMintingQueue: conquestDelivery,
    SendConquestExtraRewardQueue: policy,
    ConquestV2SendRewardQueue: conquestV2,
    MintLeaderboardRewardsQueue: leaderboard,
    MintCardBackRewardsQueue: skypass,
    MintSkypassConquestTicketsQueue: skypass,
    MintSkypassSilverCardsQueue: skypass,
    MintSkypassStickersQueue: skypass
  }
  const errors = mintQueueAuditErrors({
    runnerSource,
    goSource,
    evidenceSources
  })
  if (errors.length) {
    for (const error of errors)
      process.stderr.write(`Mint queue audit: ${error}\n`)
    process.exitCode = 1
    return
  }
  process.stdout.write(
    'All 13 source transaction queues have explicit off-chain or whole-feature-retirement dispositions\n'
  )
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  await main()
}
