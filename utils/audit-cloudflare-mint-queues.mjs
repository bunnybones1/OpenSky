import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const EXPECTED_QUEUES = {
  ExitConquestQueue: {
    task: 'ExitConquestTask',
    disposition: 'offchain',
    evidence: ['player_conquest_settlements', 'player_items']
  },
  MintConquestEntriesQueue: {
    task: 'MintConquestEntriesTask',
    disposition: 'producerless',
    evidence: []
  },
  MintSilverCardRewardsQueue: {
    task: 'MintSilverCardRewardsTask',
    disposition: 'producerless',
    evidence: []
  },
  MintTicketRewardsQueue: {
    task: 'MintTicketRewardsTask',
    disposition: 'producerless',
    evidence: []
  },
  MintStickerRewardsQueue: {
    task: 'MintStickerRewardsTask',
    disposition: 'offchain',
    evidence: ['referral_sticker_reward_awards', 'player_items']
  },
  DelayedMintingQueue: {
    task: 'DelayedMintingTask',
    disposition: 'offchain',
    evidence: ['player_conquest_gold_deliveries', 'player_items']
  },
  SendConquestExtraRewardQueue: {
    task: 'SendConquestExtraRewardTask',
    disposition: 'producerless',
    evidence: []
  },
  ConquestV2SendRewardQueue: {
    task: 'ConquestV2SendRewardTask',
    disposition: 'offchain',
    evidence: ['player_conquest_v2_reward_awards', 'player_items']
  },
  MintLeaderboardRewardsQueue: {
    task: 'MintLeaderboardRewardsTask',
    disposition: 'offchain',
    evidence: ['player_leaderboard_reward_awards', 'player_items']
  },
  MintCardBackRewardsQueue: {
    task: 'MintCardBackRewardsTask',
    disposition: 'offchain',
    evidence: ['player_skypass_claims', 'SW_CARD_BACKS']
  },
  MintSkypassConquestTicketsQueue: {
    task: 'MintSkypassConquestTicketsTask',
    disposition: 'producerless',
    evidence: []
  },
  MintSkypassSilverCardsQueue: {
    task: 'MintSkypassSilverCardsTask',
    disposition: 'offchain',
    evidence: ['player_skypass_claims', 'SW_SILVER_CARDS']
  },
  MintSkypassStickersQueue: {
    task: 'MintSkypassStickersTask',
    disposition: 'offchain',
    evidence: ['player_skypass_claims', 'SW_STICKERS']
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
    if (review.disposition === 'producerless' && producers !== 0) {
      errors.push(
        `${queue} gained ${producers} production producer(s) without review`
      )
    }
    if (review.disposition !== 'producerless' && producers === 0) {
      errors.push(`${queue} lost its reviewed source producer`)
    }
    if (review.disposition !== 'producerless') {
      const evidence = evidenceSources[queue] ?? ''
      for (const token of review.evidence) {
        if (!evidence.includes(token)) {
          errors.push(`${queue} is missing Cloudflare evidence: ${token}`)
        }
      }
    }
  }
  return errors
}

const main = async () => {
  const root = path.resolve(
    path.dirname(new URL(import.meta.url).pathname),
    '..'
  )
  const runnerSource = await readFile(
    path.join(root, 'api/lib/jobqueue/send_txns_runner.go'),
    'utf8'
  )
  const producerFiles = [
    'api/lib/conquest/state_manager.go',
    'api/lib/jobqueue/delayed_minting.go',
    'api/lib/jobqueue/grant_sticker_rewards_task.go',
    'api/lib/jobqueue/conquest_v2_rewards_runner.go',
    'api/lib/jobqueue/leaderboard_rewards_runner.go',
    'api/lib/skypass/reward_applier.go'
  ]
  const goSource = (
    await Promise.all(
      producerFiles.map(file => readFile(path.join(root, file), 'utf8'))
    )
  ).join('\n')
  const [
    conquestSettlement,
    conquestDelivery,
    referral,
    leaderboard,
    skypass,
    conquestV2
  ] = await Promise.all([
    readFile(
      path.join(root, 'game-server-cloudflare/src/conquest-settlement.ts'),
      'utf8'
    ),
    readFile(path.join(root, 'cloudflare/src/conquest-delivery.ts'), 'utf8'),
    readFile(
      path.join(root, 'cloudflare/src/referral-sticker-rewards.ts'),
      'utf8'
    ),
    readFile(
      path.join(root, 'cloudflare/src/leaderboard-reward-worker.ts'),
      'utf8'
    ),
    readFile(path.join(root, 'cloudflare/src/player-rpc.ts'), 'utf8'),
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
      readFile(path.join(root, 'docs/CLOUDFLARE_RPC_AUDIT.md'), 'utf8')
    ]).then(parts => parts.join('\n'))
  ])
  const evidenceSources = {
    ExitConquestQueue: conquestSettlement,
    MintStickerRewardsQueue: referral,
    DelayedMintingQueue: conquestDelivery,
    ConquestV2SendRewardQueue: conquestV2,
    MintLeaderboardRewardsQueue: leaderboard,
    MintCardBackRewardsQueue: skypass,
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
    'All 13 source transaction queues have reviewed Cloudflare dispositions\n'
  )
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  await main()
}
