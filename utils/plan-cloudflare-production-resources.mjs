import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import {
  productionTargetErrors,
  REVIEWED_ACCOUNT_DELETION_WORKFLOW,
  REVIEWED_ANALYTICS_BUCKET,
  REVIEWED_ANALYTICS_DEAD_LETTER_QUEUE,
  REVIEWED_ANALYTICS_QUEUE,
  REVIEWED_AUTH_DB_ID,
  REVIEWED_CLIENT_FEEDBACK_BUCKET,
  REVIEWED_CLOUDFLARE_ACCOUNT_ID,
  REVIEWED_CONQUEST_GOLD_DEAD_LETTER_QUEUE,
  REVIEWED_CONQUEST_GOLD_QUEUE,
  REVIEWED_CONQUEST_READINESS_DRILL_WORKFLOW,
  REVIEWED_CONQUEST_V2_DEAD_LETTER_QUEUE,
  REVIEWED_CONQUEST_V2_QUEUE,
  REVIEWED_CONQUEST_V2_WORKFLOW,
  REVIEWED_LEADERBOARD_DEAD_LETTER_QUEUE,
  REVIEWED_LEADERBOARD_QUEUE,
  REVIEWED_LEADERBOARD_WORKFLOW,
  REVIEWED_PRODUCTION_TARGETS,
  REVIEWED_PUSH_NOTIFICATION_DEAD_LETTER_QUEUE,
  REVIEWED_PUSH_NOTIFICATION_QUEUE,
  REVIEWED_REFERRAL_STICKER_DEAD_LETTER_QUEUE,
  REVIEWED_REFERRAL_STICKER_QUEUE,
  REVIEWED_REFERRAL_STICKER_WORKFLOW,
  REVIEWED_SKYPASS_DEAD_LETTER_QUEUE,
  REVIEWED_SKYPASS_QUEUE,
  REVIEWED_SKYPASS_WORKFLOW
} from './run-cloudflare-production.mjs'

const MAIN_WORKER = 'opensky-webapp'
const GAME_SERVER = 'cloud-weasel-game-server'
const MATCH_SERVICE = 'cloud-weasel-match-service'
const MATCHMAKER = 'cloud-weasel-matchmaker'
const ANALYTICS_WORKER = 'cloud-weasel-game-analytics'

export const PRODUCTION_CONFIG_PATHS = Object.freeze([
  'wrangler.jsonc',
  'game-server-cloudflare/wrangler.jsonc',
  'match-service-cloudflare/wrangler.jsonc',
  'matchmaker-ts/wrangler.jsonc',
  'game-analytics/wrangler.jsonc'
])

const rootQueueBindings = [
  {
    binding: 'CONQUEST_GOLD_DELIVERY_QUEUE',
    queue: REVIEWED_CONQUEST_GOLD_QUEUE,
    deadLetterQueue: REVIEWED_CONQUEST_GOLD_DEAD_LETTER_QUEUE
  },
  {
    binding: 'CONQUEST_V2_REWARD_QUEUE',
    queue: REVIEWED_CONQUEST_V2_QUEUE,
    deadLetterQueue: REVIEWED_CONQUEST_V2_DEAD_LETTER_QUEUE
  },
  {
    binding: 'LEADERBOARD_REWARD_QUEUE',
    queue: REVIEWED_LEADERBOARD_QUEUE,
    deadLetterQueue: REVIEWED_LEADERBOARD_DEAD_LETTER_QUEUE
  },
  {
    binding: 'PUSH_NOTIFICATION_QUEUE',
    queue: REVIEWED_PUSH_NOTIFICATION_QUEUE,
    deadLetterQueue: REVIEWED_PUSH_NOTIFICATION_DEAD_LETTER_QUEUE
  },
  {
    binding: 'SKYPASS_AUTO_CLAIM_QUEUE',
    queue: REVIEWED_SKYPASS_QUEUE,
    deadLetterQueue: REVIEWED_SKYPASS_DEAD_LETTER_QUEUE
  },
  {
    binding: 'REFERRAL_STICKER_REWARD_QUEUE',
    queue: REVIEWED_REFERRAL_STICKER_QUEUE,
    deadLetterQueue: REVIEWED_REFERRAL_STICKER_DEAD_LETTER_QUEUE
  }
]

const workflowBindings = [
  {
    binding: 'CONQUEST_V2_REWARD_WORKFLOW',
    name: REVIEWED_CONQUEST_V2_WORKFLOW,
    className: 'ConquestV2RewardWorkflow'
  },
  {
    binding: 'CONQUEST_READINESS_DRILL_WORKFLOW',
    name: REVIEWED_CONQUEST_READINESS_DRILL_WORKFLOW,
    className: 'ConquestReadinessDrillWorkflow'
  },
  {
    binding: 'LEADERBOARD_REWARD_WORKFLOW',
    name: REVIEWED_LEADERBOARD_WORKFLOW,
    className: 'LeaderboardRewardWorkflow'
  },
  {
    binding: 'SKYPASS_SEASON_CLOSE_WORKFLOW',
    name: REVIEWED_SKYPASS_WORKFLOW,
    className: 'SkypassSeasonCloseWorkflow'
  },
  {
    binding: 'REFERRAL_STICKER_REWARD_WORKFLOW',
    name: REVIEWED_REFERRAL_STICKER_WORKFLOW,
    className: 'ReferralStickerRewardWorkflow'
  },
  {
    binding: 'ACCOUNT_DELETION_WORKFLOW',
    name: REVIEWED_ACCOUNT_DELETION_WORKFLOW,
    className: 'AccountDeletionWorkflow'
  }
]

export const PRODUCTION_RESOURCE_INVENTORY = Object.freeze({
  accountId: REVIEWED_CLOUDFLARE_ACCOUNT_ID,
  databases: Object.freeze([
    Object.freeze({ name: 'opensky-auth', id: REVIEWED_AUTH_DB_ID })
  ]),
  buckets: Object.freeze([
    REVIEWED_CLIENT_FEEDBACK_BUCKET,
    REVIEWED_ANALYTICS_BUCKET
  ]),
  queues: Object.freeze(
    [
      ...rootQueueBindings.flatMap(resource => [
        resource.queue,
        resource.deadLetterQueue
      ]),
      REVIEWED_ANALYTICS_QUEUE,
      REVIEWED_ANALYTICS_DEAD_LETTER_QUEUE
    ].sort()
  ),
  queueBindings: Object.freeze([
    ...rootQueueBindings.map(resource =>
      Object.freeze({
        worker: MAIN_WORKER,
        binding: resource.binding,
        queue: resource.queue,
        role: 'producer'
      })
    ),
    ...rootQueueBindings.map(resource =>
      Object.freeze({
        worker: MAIN_WORKER,
        queue: resource.queue,
        role: 'consumer',
        deadLetterQueue: resource.deadLetterQueue
      })
    ),
    Object.freeze({
      worker: GAME_SERVER,
      binding: 'CONQUEST_GOLD_DELIVERY_QUEUE',
      queue: REVIEWED_CONQUEST_GOLD_QUEUE,
      role: 'producer'
    }),
    Object.freeze({
      worker: GAME_SERVER,
      binding: 'GAME_ANALYTICS_QUEUE',
      queue: REVIEWED_ANALYTICS_QUEUE,
      role: 'producer'
    }),
    Object.freeze({
      worker: ANALYTICS_WORKER,
      queue: REVIEWED_ANALYTICS_QUEUE,
      role: 'consumer',
      deadLetterQueue: REVIEWED_ANALYTICS_DEAD_LETTER_QUEUE,
      maxBatchSize: 1,
      maxBatchTimeout: 5,
      maxRetries: 25,
      maxConcurrency: 5,
      retryDelay: 30
    })
  ]),
  bucketBindings: Object.freeze([
    Object.freeze({
      worker: MAIN_WORKER,
      binding: 'CLIENT_FEEDBACK',
      bucket: REVIEWED_CLIENT_FEEDBACK_BUCKET
    }),
    Object.freeze({
      worker: GAME_SERVER,
      binding: 'GAME_ANALYTICS',
      bucket: REVIEWED_ANALYTICS_BUCKET
    }),
    Object.freeze({
      worker: ANALYTICS_WORKER,
      binding: 'GAME_ANALYTICS',
      bucket: REVIEWED_ANALYTICS_BUCKET
    })
  ]),
  workflows: Object.freeze(
    workflowBindings.map(workflow =>
      Object.freeze({ ...workflow, worker: MAIN_WORKER })
    )
  ),
  workers: Object.freeze([
    Object.freeze({
      path: 'wrangler.jsonc',
      name: MAIN_WORKER,
      requiredSecrets: Object.freeze([
        'GOOGLE_CLIENT_ID',
        'GOOGLE_CLIENT_SECRET',
        'INTERNAL_AUTH_SECRET',
        'SESSION_SIGNING_KEY'
      ])
    }),
    Object.freeze({
      path: 'game-server-cloudflare/wrangler.jsonc',
      name: GAME_SERVER,
      requiredSecrets: Object.freeze([
        'INTERNAL_AUTH_SECRET',
        'MATCH_OWNER_PRIVATE_KEY'
      ])
    }),
    Object.freeze({
      path: 'match-service-cloudflare/wrangler.jsonc',
      name: MATCH_SERVICE,
      requiredSecrets: Object.freeze(['INTERNAL_AUTH_SECRET'])
    }),
    Object.freeze({
      path: 'matchmaker-ts/wrangler.jsonc',
      name: MATCHMAKER,
      requiredSecrets: Object.freeze(['INTERNAL_AUTH_SECRET'])
    }),
    Object.freeze({
      path: 'game-analytics/wrangler.jsonc',
      name: ANALYTICS_WORKER,
      requiredSecrets: Object.freeze([])
    })
  ]),
  workerExposure: Object.freeze([
    Object.freeze({ worker: MAIN_WORKER, workersDev: true }),
    Object.freeze({ worker: GAME_SERVER, workersDev: true }),
    Object.freeze({ worker: MATCH_SERVICE, workersDev: false }),
    Object.freeze({ worker: MATCHMAKER, workersDev: true }),
    Object.freeze({ worker: ANALYTICS_WORKER, workersDev: true })
  ]),
  serviceBindings: Object.freeze([
    Object.freeze({
      worker: MAIN_WORKER,
      binding: 'MATCH_SERVICE',
      service: MATCH_SERVICE
    }),
    Object.freeze({
      worker: MATCH_SERVICE,
      binding: 'GAME_SERVICE',
      service: GAME_SERVER
    }),
    Object.freeze({
      worker: MATCHMAKER,
      binding: 'MATCH_SERVICE',
      service: MATCH_SERVICE
    })
  ]),
  durableObjectBindings: Object.freeze([
    Object.freeze({
      worker: MAIN_WORKER,
      binding: 'MATCHMAKER_POOLS',
      className: 'MatchmakerPool',
      scriptName: MATCHMAKER
    }),
    Object.freeze({
      worker: MAIN_WORKER,
      binding: 'GAME_MATCHES',
      className: 'GameMatch',
      scriptName: GAME_SERVER
    }),
    Object.freeze({
      worker: GAME_SERVER,
      binding: 'GAME_MATCHES',
      className: 'GameMatch'
    }),
    Object.freeze({
      worker: GAME_SERVER,
      binding: 'DECK_RANK_COORDINATOR',
      className: 'DeckRankCoordinator'
    }),
    Object.freeze({
      worker: MATCHMAKER,
      binding: 'MATCHMAKER_POOLS',
      className: 'MatchmakerPool'
    })
  ]),
  optionalIntegrations: Object.freeze([
    Object.freeze({
      name: 'WalletConnect ownership',
      requiredForCore: false,
      publicConfig: Object.freeze(['WALLETCONNECT_PROJECT_ID']),
      workerSecrets: Object.freeze([
        'WALLET_INDEXER_ACCESS_KEY',
        'WALLET_RPC_URL_137'
      ])
    }),
    Object.freeze({
      name: 'OneSignal push',
      requiredForCore: false,
      workerSecrets: Object.freeze([
        'ONESIGNAL_APP_ID',
        'ONESIGNAL_REST_API_KEY'
      ])
    }),
    Object.freeze({
      name: 'Stripe commerce',
      requiredForCore: false,
      workerSecrets: Object.freeze([
        'STRIPE_SECRET_KEY',
        'STRIPE_WEBHOOK_SECRET'
      ])
    }),
    Object.freeze({
      name: 'Twitch social data',
      requiredForCore: false,
      workerSecrets: Object.freeze(['TWITCH_CLIENT_ID', 'TWITCH_CLIENT_SECRET'])
    }),
    Object.freeze({
      name: 'mobile store verification',
      requiredForCore: false,
      workerSecrets: Object.freeze([
        'GOOGLE_PLAY_SERVICE_ACCOUNT_JSON',
        'APPLE_APP_STORE_PRIVATE_KEY'
      ])
    })
  ])
})

const canonical = value =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? Object.fromEntries(
        Object.entries(value)
          .sort(([left], [right]) => left.localeCompare(right))
          .map(([key, nested]) => [key, canonical(nested)])
      )
    : value

const sorted = values =>
  values
    .map(canonical)
    .sort((left, right) =>
      JSON.stringify(left).localeCompare(JSON.stringify(right))
    )

const mismatch = (errors, label, actual, expected) => {
  if (JSON.stringify(sorted(actual)) !== JSON.stringify(sorted(expected))) {
    errors.push(
      `production resource ${label} does not match reviewed inventory`
    )
  }
}

export const productionResourceInventoryErrors = (
  configs,
  environment = {}
) => {
  const errors = []
  for (const worker of PRODUCTION_RESOURCE_INVENTORY.workers) {
    const config = configs[worker.path]
    if (!config) {
      errors.push(`production resource inventory is missing ${worker.path}`)
      continue
    }
    errors.push(...productionTargetErrors(worker.path, config, environment))
  }

  const entries = PRODUCTION_RESOURCE_INVENTORY.workers
    .map(worker => [worker, configs[worker.path]])
    .filter(([, config]) => config)
  mismatch(
    errors,
    'D1 bindings',
    entries.flatMap(([worker, config]) =>
      (config.d1_databases ?? []).map(database => ({
        worker: worker.name,
        binding: database.binding,
        name: database.database_name,
        id: database.database_id
      }))
    ),
    [MAIN_WORKER, GAME_SERVER, MATCH_SERVICE, ANALYTICS_WORKER].map(worker => ({
      worker,
      binding: 'AUTH_DB',
      name: 'opensky-auth',
      id: REVIEWED_AUTH_DB_ID
    }))
  )
  mismatch(
    errors,
    'Worker exposure',
    entries.map(([worker, config]) => ({
      worker: worker.name,
      workersDev: config.workers_dev
    })),
    PRODUCTION_RESOURCE_INVENTORY.workerExposure
  )
  mismatch(
    errors,
    'R2 bindings',
    entries.flatMap(([worker, config]) =>
      (config.r2_buckets ?? []).map(bucket => ({
        worker: worker.name,
        binding: bucket.binding,
        bucket: bucket.bucket_name
      }))
    ),
    PRODUCTION_RESOURCE_INVENTORY.bucketBindings
  )
  mismatch(
    errors,
    'Queue bindings',
    entries.flatMap(([worker, config]) => [
      ...(config.queues?.producers ?? []).map(producer => ({
        worker: worker.name,
        binding: producer.binding,
        queue: producer.queue,
        role: 'producer'
      })),
      ...(config.queues?.consumers ?? []).map(consumer => ({
        worker: worker.name,
        queue: consumer.queue,
        role: 'consumer',
        deadLetterQueue: consumer.dead_letter_queue,
        ...(consumer.max_batch_size === undefined
          ? {}
          : { maxBatchSize: consumer.max_batch_size }),
        ...(consumer.max_batch_timeout === undefined
          ? {}
          : { maxBatchTimeout: consumer.max_batch_timeout }),
        ...(consumer.max_retries === undefined
          ? {}
          : { maxRetries: consumer.max_retries }),
        ...(consumer.max_concurrency === undefined
          ? {}
          : { maxConcurrency: consumer.max_concurrency }),
        ...(consumer.retry_delay === undefined
          ? {}
          : { retryDelay: consumer.retry_delay })
      }))
    ]),
    PRODUCTION_RESOURCE_INVENTORY.queueBindings
  )
  mismatch(
    errors,
    'Workflow bindings',
    entries.flatMap(([worker, config]) =>
      (config.workflows ?? []).map(workflow => ({
        worker: worker.name,
        binding: workflow.binding,
        name: workflow.name,
        className: workflow.class_name
      }))
    ),
    PRODUCTION_RESOURCE_INVENTORY.workflows
  )
  mismatch(
    errors,
    'service bindings',
    entries.flatMap(([worker, config]) =>
      (config.services ?? []).map(service => ({
        worker: worker.name,
        binding: service.binding,
        service: service.service
      }))
    ),
    PRODUCTION_RESOURCE_INVENTORY.serviceBindings
  )
  mismatch(
    errors,
    'Durable Object bindings',
    entries.flatMap(([worker, config]) =>
      (config.durable_objects?.bindings ?? []).map(binding => ({
        worker: worker.name,
        binding: binding.name,
        className: binding.class_name,
        ...(binding.script_name ? { scriptName: binding.script_name } : {})
      }))
    ),
    PRODUCTION_RESOURCE_INVENTORY.durableObjectBindings
  )

  const main = configs['wrangler.jsonc']
  const game = configs['game-server-cloudflare/wrangler.jsonc']
  const matchService = configs['match-service-cloudflare/wrangler.jsonc']
  const matchmaker = configs['matchmaker-ts/wrangler.jsonc']
  if (
    JSON.stringify(main?.triggers?.crons) !==
    JSON.stringify(['* * * * *', '17 3 * * *'])
  ) {
    errors.push('production resource Cron inventory is not reviewed')
  }
  if (
    main?.version_metadata?.binding !== 'WORKER_VERSION' ||
    main?.assets?.binding !== 'ASSETS' ||
    main?.assets?.directory !== './webapp/dist' ||
    main?.assets?.run_worker_first !== true ||
    main?.assets?.not_found_handling !== 'single-page-application'
  ) {
    errors.push('production resource original-webapp asset boundary drifted')
  }
  if (
    game?.migrations?.[0]?.tag !== 'v1' ||
    game?.migrations?.[1]?.tag !== 'v2' ||
    JSON.stringify(game?.migrations?.[0]?.new_sqlite_classes) !==
      JSON.stringify(['GameMatch']) ||
    JSON.stringify(game?.migrations?.[1]?.new_sqlite_classes) !==
      JSON.stringify(['DeckRankCoordinator']) ||
    matchmaker?.migrations?.[0]?.tag !== 'v1' ||
    JSON.stringify(matchmaker?.migrations?.[0]?.new_sqlite_classes) !==
      JSON.stringify(['MatchmakerPool'])
  ) {
    errors.push(
      'production resource Durable Object migration inventory drifted'
    )
  }
  if (
    matchService?.vars?.ENABLE_RANKED_BOTS !== 'false' ||
    matchmaker?.vars?.ENABLE_RANKED_BOTS !== 'false' ||
    matchmaker?.vars?.STRICT_CONQUEST_MATCHING !== 'false'
  ) {
    errors.push('production resource plan would activate a gated game path')
  }
  return errors
}

const configArgs = ['--config', '../wrangler.jsonc']

export const productionResourcePreflightInvocations = () => {
  const invocations = [
    {
      stage: 'foundation',
      kind: 'D1 database',
      name: 'opensky-auth',
      args: ['d1', 'list', '--json', ...configArgs]
    },
    ...PRODUCTION_RESOURCE_INVENTORY.buckets.map(name => ({
      stage: 'foundation',
      kind: 'R2 bucket',
      name,
      args: ['r2', 'bucket', 'info', name, '--json', ...configArgs]
    })),
    ...PRODUCTION_RESOURCE_INVENTORY.queues.map(name => ({
      stage: 'foundation',
      kind: 'Queue',
      name,
      args: ['queues', 'info', name, ...configArgs]
    })),
    ...rootQueueBindings.map(resource => ({
      stage: 'deployed topology',
      kind: 'Queue consumer',
      name: resource.queue,
      args: [
        'queues',
        'consumer',
        'worker',
        'list',
        resource.queue,
        '--json',
        ...configArgs
      ]
    })),
    {
      stage: 'deployed topology',
      kind: 'Queue consumer',
      name: REVIEWED_ANALYTICS_QUEUE,
      args: [
        'queues',
        'consumer',
        'worker',
        'list',
        REVIEWED_ANALYTICS_QUEUE,
        '--json',
        ...configArgs
      ]
    },
    ...PRODUCTION_RESOURCE_INVENTORY.workflows.map(workflow => ({
      stage: 'deployed topology',
      kind: 'Workflow',
      name: workflow.name,
      args: ['workflows', 'describe', workflow.name, ...configArgs]
    })),
    ...PRODUCTION_RESOURCE_INVENTORY.workers.map(worker => ({
      stage: 'deployed topology',
      kind: 'Worker deployment',
      name: worker.name,
      args: [
        'deployments',
        'list',
        '--name',
        worker.name,
        '--json',
        ...configArgs
      ]
    })),
    ...PRODUCTION_RESOURCE_INVENTORY.workers
      .filter(worker => worker.requiredSecrets.length)
      .map(worker => ({
        stage: 'credential presence',
        kind: 'Worker secrets',
        name: worker.name,
        args: [
          'secret',
          'list',
          '--name',
          worker.name,
          '--format',
          'json',
          ...configArgs
        ]
      }))
  ]
  return invocations
}

export const productionResourcePreflightPlanErrors = invocations => {
  const errors = []
  const forbidden = new Set([
    'create',
    'delete',
    'deploy',
    'put',
    'purge',
    'resume-delivery',
    'trigger',
    'update'
  ])
  for (const invocation of invocations) {
    if (
      invocation.args.some(argument => forbidden.has(argument)) ||
      invocation.args.includes('migrations') ||
      invocation.args.includes('apply')
    ) {
      errors.push(
        `${invocation.kind} ${invocation.name} is not a read-only preflight`
      )
    }
  }
  if (
    new Set(invocations.map(item => JSON.stringify(item))).size !==
    invocations.length
  ) {
    errors.push('production resource preflight contains a duplicate query')
  }
  return errors
}

export const renderProductionResourcePlan = () => {
  const inventory = PRODUCTION_RESOURCE_INVENTORY
  const invocations = productionResourcePreflightInvocations()
  const errors = productionResourcePreflightPlanErrors(invocations)
  if (errors.length) throw new Error(errors.join('\n'))
  return [
    'PLAN ONLY — no Cloudflare command was executed.',
    `Account: ${inventory.accountId}`,
    `Foundation: ${inventory.databases.length} D1, ${inventory.buckets.length} R2, ${inventory.queues.length} Queues/DLQs`,
    `Deployed topology: ${inventory.workers.length} Workers, ${inventory.workflows.length} Workflows, ${inventory.serviceBindings.length} service bindings, ${inventory.durableObjectBindings.length} Durable Object bindings`,
    'Required secret names (values are never read):',
    ...inventory.workers
      .filter(worker => worker.requiredSecrets.length)
      .map(worker => `  ${worker.name}: ${worker.requiredSecrets.join(', ')}`),
    'Optional integrations remain non-blocking:',
    ...inventory.optionalIntegrations.map(item => `  ${item.name}`),
    'Read-only preflight commands:',
    ...invocations.map(
      invocation =>
        `  [${invocation.stage}] pnpm --dir cloudflare exec wrangler ${invocation.args.join(' ')}`
    )
  ].join('\n')
}

const loadConfigs = async root =>
  Object.fromEntries(
    await Promise.all(
      PRODUCTION_CONFIG_PATHS.map(async configPath => [
        configPath,
        JSON.parse(await readFile(path.join(root, configPath), 'utf8'))
      ])
    )
  )

const main = async () => {
  if (process.argv.length !== 3 || process.argv[2] !== 'plan') {
    throw new Error('usage: plan-cloudflare-production-resources.mjs plan')
  }
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  const errors = productionResourceInventoryErrors(
    await loadConfigs(root),
    process.env
  )
  if (errors.length) throw new Error(errors.join('\n'))
  process.stdout.write(`${renderProductionResourcePlan()}\n`)
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  await main()
}
