import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import {
  PRODUCTION_SCHEMA_QUERY,
  productionInvocation,
  productionOperationPlan,
  productionSchemaInvocation,
  productionSchemaRow,
  productionScriptErrors,
  productionTargetErrors,
  REVIEWED_ANALYTICS_BUCKET,
  REVIEWED_ANALYTICS_DEAD_LETTER_QUEUE,
  REVIEWED_ANALYTICS_QUEUE,
  REVIEWED_AUTH_DB_ID,
  REVIEWED_CLIENT_FEEDBACK_BUCKET,
  REVIEWED_CLOUDFLARE_ACCOUNT_ID,
  REVIEWED_CONQUEST_GOLD_DEAD_LETTER_QUEUE,
  REVIEWED_CONQUEST_GOLD_QUEUE,
  REVIEWED_CONQUEST_V2_DEAD_LETTER_QUEUE,
  REVIEWED_CONQUEST_V2_QUEUE,
  REVIEWED_CONQUEST_V2_WORKFLOW,
  REVIEWED_LEADERBOARD_DEAD_LETTER_QUEUE,
  REVIEWED_LEADERBOARD_QUEUE,
  REVIEWED_LEADERBOARD_WORKFLOW,
  REVIEWED_PUSH_NOTIFICATION_DEAD_LETTER_QUEUE,
  REVIEWED_PUSH_NOTIFICATION_QUEUE,
  REVIEWED_REFERRAL_STICKER_DEAD_LETTER_QUEUE,
  REVIEWED_REFERRAL_STICKER_QUEUE,
  REVIEWED_REFERRAL_STICKER_WORKFLOW,
  REVIEWED_SKYPASS_DEAD_LETTER_QUEUE,
  REVIEWED_SKYPASS_QUEUE,
  REVIEWED_SKYPASS_WORKFLOW,
  REVIEWED_PRODUCTION_TARGETS,
  REQUIRED_PRODUCTION_SCHEMA_MIGRATION
} from './run-cloudflare-production.mjs'

const configFor = target => ({
  name: target.name,
  account_id: REVIEWED_CLOUDFLARE_ACCOUNT_ID,
  ...(target.requiresAuthDatabase
    ? {
        d1_databases: [
          {
            binding: 'AUTH_DB',
            database_name: 'opensky-auth',
            database_id: REVIEWED_AUTH_DB_ID
          }
        ]
      }
    : {}),
  ...(target.requiresConquestGoldProducer
    ? {
        queues: {
          producers: [
            {
              binding: 'CONQUEST_GOLD_DELIVERY_QUEUE',
              queue: REVIEWED_CONQUEST_GOLD_QUEUE
            }
          ]
        }
      }
    : {}),
  ...(target.requiresAnalyticsConsumer
    ? {
        r2_buckets: [
          {
            binding: 'GAME_ANALYTICS',
            bucket_name: REVIEWED_ANALYTICS_BUCKET
          }
        ],
        queues: {
          consumers: [
            {
              queue: REVIEWED_ANALYTICS_QUEUE,
              max_batch_size: 1,
              max_batch_timeout: 5,
              max_retries: 25,
              dead_letter_queue: REVIEWED_ANALYTICS_DEAD_LETTER_QUEUE,
              max_concurrency: 5,
              retry_delay: 30
            }
          ]
        },
        vars: { ANALYTICS_RELEASE_VERSION: 'cloudflare' }
      }
    : {}),
  ...(target.requiresRewardOrchestration
    ? {
        workflows: [
          {
            name: REVIEWED_CONQUEST_V2_WORKFLOW,
            binding: 'CONQUEST_V2_REWARD_WORKFLOW',
            class_name: 'ConquestV2RewardWorkflow'
          },
          {
            name: REVIEWED_LEADERBOARD_WORKFLOW,
            binding: 'LEADERBOARD_REWARD_WORKFLOW',
            class_name: 'LeaderboardRewardWorkflow'
          },
          {
            name: REVIEWED_SKYPASS_WORKFLOW,
            binding: 'SKYPASS_SEASON_CLOSE_WORKFLOW',
            class_name: 'SkypassSeasonCloseWorkflow'
          },
          {
            name: REVIEWED_REFERRAL_STICKER_WORKFLOW,
            binding: 'REFERRAL_STICKER_REWARD_WORKFLOW',
            class_name: 'ReferralStickerRewardWorkflow'
          }
        ],
        queues: {
          producers: [
            {
              queue: REVIEWED_CONQUEST_GOLD_QUEUE,
              binding: 'CONQUEST_GOLD_DELIVERY_QUEUE'
            },
            {
              queue: REVIEWED_CONQUEST_V2_QUEUE,
              binding: 'CONQUEST_V2_REWARD_QUEUE'
            },
            {
              queue: REVIEWED_LEADERBOARD_QUEUE,
              binding: 'LEADERBOARD_REWARD_QUEUE'
            },
            {
              queue: REVIEWED_PUSH_NOTIFICATION_QUEUE,
              binding: 'PUSH_NOTIFICATION_QUEUE'
            },
            {
              queue: REVIEWED_SKYPASS_QUEUE,
              binding: 'SKYPASS_AUTO_CLAIM_QUEUE'
            },
            {
              queue: REVIEWED_REFERRAL_STICKER_QUEUE,
              binding: 'REFERRAL_STICKER_REWARD_QUEUE'
            }
          ],
          consumers: [
            {
              queue: REVIEWED_CONQUEST_GOLD_QUEUE,
              dead_letter_queue: REVIEWED_CONQUEST_GOLD_DEAD_LETTER_QUEUE
            },
            {
              queue: REVIEWED_CONQUEST_V2_QUEUE,
              dead_letter_queue: REVIEWED_CONQUEST_V2_DEAD_LETTER_QUEUE
            },
            {
              queue: REVIEWED_LEADERBOARD_QUEUE,
              dead_letter_queue: REVIEWED_LEADERBOARD_DEAD_LETTER_QUEUE
            },
            {
              queue: REVIEWED_PUSH_NOTIFICATION_QUEUE,
              dead_letter_queue: REVIEWED_PUSH_NOTIFICATION_DEAD_LETTER_QUEUE
            },
            {
              queue: REVIEWED_SKYPASS_QUEUE,
              dead_letter_queue: REVIEWED_SKYPASS_DEAD_LETTER_QUEUE
            },
            {
              queue: REVIEWED_REFERRAL_STICKER_QUEUE,
              dead_letter_queue: REVIEWED_REFERRAL_STICKER_DEAD_LETTER_QUEUE
            }
          ]
        }
      }
    : {})
})

test('accepts only the pinned production service and D1 inventory', () => {
  for (const [targetPath, target] of REVIEWED_PRODUCTION_TARGETS) {
    assert.deepEqual(productionTargetErrors(targetPath, configFor(target)), [])
  }
  assert.match(
    productionTargetErrors('unknown/wrangler.jsonc', {})[0],
    /unreviewed/
  )
})

test('rejects account, environment, Worker, and database drift', () => {
  const targetPath = 'wrangler.jsonc'
  const baseline = configFor(REVIEWED_PRODUCTION_TARGETS.get(targetPath))
  for (const changed of [
    { ...baseline, name: 'lookalike-worker' },
    { ...baseline, account_id: '16b57375514eb1726a922e52bc16e4dc' },
    {
      ...baseline,
      d1_databases: [{ ...baseline.d1_databases[0], database_id: 'wrong' }]
    },
    { ...baseline, d1_databases: [] }
  ]) {
    assert.ok(productionTargetErrors(targetPath, changed).length > 0)
  }
  assert.match(
    productionTargetErrors(targetPath, baseline, {
      CLOUDFLARE_ACCOUNT_ID: '16b57375514eb1726a922e52bc16e4dc'
    })[0],
    /conflicts/
  )
})

test('pins all reward Workflow, Queue, and dead-letter topologies', () => {
  const targetPath = 'wrangler.jsonc'
  const baseline = configFor(REVIEWED_PRODUCTION_TARGETS.get(targetPath))
  for (const changed of [
    { ...baseline, workflows: [] },
    {
      ...baseline,
      workflows: [
        { ...baseline.workflows[0], name: 'lookalike-conquest-workflow' }
      ]
    },
    {
      ...baseline,
      workflows: [
        baseline.workflows[0],
        { ...baseline.workflows[1], name: 'lookalike-leaderboard-workflow' }
      ]
    },
    { ...baseline, queues: { ...baseline.queues, producers: [] } },
    {
      ...baseline,
      queues: {
        ...baseline.queues,
        consumers: [
          { ...baseline.queues.consumers[0], dead_letter_queue: undefined }
        ]
      }
    },
    {
      ...baseline,
      queues: {
        ...baseline.queues,
        consumers: [
          baseline.queues.consumers[0],
          { ...baseline.queues.consumers[1], dead_letter_queue: undefined }
        ]
      }
    },
    {
      ...baseline,
      queues: {
        ...baseline.queues,
        producers: baseline.queues.producers.filter(
          producer => producer.binding !== 'PUSH_NOTIFICATION_QUEUE'
        )
      }
    },
    {
      ...baseline,
      queues: {
        ...baseline.queues,
        consumers: baseline.queues.consumers.map(consumer =>
          consumer.queue === REVIEWED_PUSH_NOTIFICATION_QUEUE
            ? { ...consumer, dead_letter_queue: undefined }
            : consumer
        )
      }
    },
    {
      ...baseline,
      workflows: baseline.workflows.filter(
        workflow => workflow.binding !== 'SKYPASS_SEASON_CLOSE_WORKFLOW'
      )
    },
    {
      ...baseline,
      queues: {
        ...baseline.queues,
        consumers: baseline.queues.consumers.map(consumer =>
          consumer.queue === REVIEWED_SKYPASS_QUEUE
            ? { ...consumer, dead_letter_queue: undefined }
            : consumer
        )
      }
    },
    {
      ...baseline,
      workflows: baseline.workflows.filter(
        workflow => workflow.binding !== 'REFERRAL_STICKER_REWARD_WORKFLOW'
      )
    },
    {
      ...baseline,
      queues: {
        ...baseline.queues,
        consumers: baseline.queues.consumers.map(consumer =>
          consumer.queue === REVIEWED_REFERRAL_STICKER_QUEUE
            ? { ...consumer, dead_letter_queue: undefined }
            : consumer
        )
      }
    }
  ]) {
    assert.match(productionTargetErrors(targetPath, changed)[0], /Conquest V2/)
  }
})

test('pins the analytics consumer bucket, release, retry, and dead-letter topology', () => {
  const targetPath = 'game-analytics/wrangler.jsonc'
  const baseline = configFor(REVIEWED_PRODUCTION_TARGETS.get(targetPath))
  const mutations = [
    { ...baseline, r2_buckets: [] },
    {
      ...baseline,
      r2_buckets: [
        { binding: 'GAME_ANALYTICS', bucket_name: 'lookalike-analytics' }
      ]
    },
    {
      ...baseline,
      r2_buckets: [
        ...baseline.r2_buckets,
        { binding: 'LOOKALIKE', bucket_name: REVIEWED_ANALYTICS_BUCKET }
      ]
    },
    { ...baseline, queues: { consumers: [] } },
    {
      ...baseline,
      queues: {
        ...baseline.queues,
        producers: [{ binding: 'LOOKALIKE', queue: REVIEWED_ANALYTICS_QUEUE }]
      }
    },
    {
      ...baseline,
      queues: {
        consumers: [{ ...baseline.queues.consumers[0], max_retries: 100 }]
      }
    },
    {
      ...baseline,
      queues: {
        consumers: [
          {
            ...baseline.queues.consumers[0],
            dead_letter_queue: 'lookalike-dead-letter'
          }
        ]
      }
    },
    { ...baseline, vars: { ANALYTICS_RELEASE_VERSION: 'latest' } }
  ]
  for (const changed of mutations) {
    assert.ok(productionTargetErrors(targetPath, changed).length > 0)
  }
})

test('requires the optional game-server analytics bindings to move together', () => {
  const targetPath = 'game-server-cloudflare/wrangler.jsonc'
  const baseline = configFor(REVIEWED_PRODUCTION_TARGETS.get(targetPath))
  const enabled = {
    ...baseline,
    r2_buckets: [
      { binding: 'GAME_ANALYTICS', bucket_name: REVIEWED_ANALYTICS_BUCKET }
    ],
    queues: {
      producers: [
        ...baseline.queues.producers,
        {
          binding: 'GAME_ANALYTICS_QUEUE',
          queue: REVIEWED_ANALYTICS_QUEUE
        }
      ]
    }
  }
  assert.deepEqual(productionTargetErrors(targetPath, enabled), [])
  for (const changed of [
    { ...baseline, queues: { producers: [] } },
    { ...baseline, r2_buckets: enabled.r2_buckets },
    {
      ...baseline,
      queues: {
        producers: [
          {
            binding: 'GAME_ANALYTICS_QUEUE',
            queue: REVIEWED_ANALYTICS_QUEUE
          }
        ]
      }
    },
    {
      ...baseline,
      r2_buckets: [
        { binding: 'LOOKALIKE', bucket_name: REVIEWED_ANALYTICS_BUCKET }
      ]
    },
    {
      ...enabled,
      queues: {
        producers: [
          ...baseline.queues.producers,
          {
            binding: 'GAME_ANALYTICS_QUEUE',
            queue: 'lookalike-analytics'
          }
        ]
      }
    }
  ]) {
    assert.ok(productionTargetErrors(targetPath, changed).length > 0)
  }
})

test('pins the optional player-feedback bucket when it is enabled', () => {
  const targetPath = 'wrangler.jsonc'
  const baseline = configFor(REVIEWED_PRODUCTION_TARGETS.get(targetPath))
  assert.deepEqual(
    productionTargetErrors(targetPath, {
      ...baseline,
      r2_buckets: [
        {
          binding: 'CLIENT_FEEDBACK',
          bucket_name: REVIEWED_CLIENT_FEEDBACK_BUCKET
        }
      ]
    }),
    []
  )
  assert.ok(
    productionTargetErrors(targetPath, {
      ...baseline,
      r2_buckets: [
        { binding: 'CLIENT_FEEDBACK', bucket_name: 'lookalike-feedback' }
      ]
    }).length > 0
  )
  assert.ok(
    productionTargetErrors(targetPath, {
      ...baseline,
      r2_buckets: [
        {
          binding: 'LOOKALIKE',
          bucket_name: REVIEWED_CLIENT_FEEDBACK_BUCKET
        }
      ]
    }).length > 0
  )
})

test('builds explicit deploy and remote migration invocations', () => {
  const config = configFor(REVIEWED_PRODUCTION_TARGETS.get('wrangler.jsonc'))
  assert.deepEqual(productionInvocation('deploy', 'wrangler.jsonc', config), [
    'deploy',
    '--config',
    '../wrangler.jsonc'
  ])
  assert.deepEqual(productionInvocation('migrate', 'wrangler.jsonc', config), [
    'd1',
    'migrations',
    'apply',
    'opensky-auth',
    '--remote',
    '--config',
    '../wrangler.jsonc'
  ])
  assert.throws(
    () => productionInvocation('delete', 'wrangler.jsonc', config),
    /unsupported/
  )
})

test('requires the exact reviewed remote schema before every deploy', () => {
  assert.match(PRODUCTION_SCHEMA_QUERY, /^SELECT\b/)
  assert.doesNotMatch(
    PRODUCTION_SCHEMA_QUERY,
    /\b(?:INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|REPLACE)\b/i
  )
  for (const required of [
    REQUIRED_PRODUCTION_SCHEMA_MIGRATION,
    'multiplayer_match_authoritative_decks',
    'registered_matchmaker_bots',
    'registered_matchmaker_bots_identity_no_update',
    'registered_matchmaker_bots_no_delete',
    'multiplayer_matches_user_kind_insert_guard',
    'before_skypass_xp',
    'season_stats_existed_before',
    'profile_updated_at_before',
    'multiplayer_match_experience_player_publication_state_guard',
    'multiplayer_match_experience_publication_complete_guard',
    'ranked_discovery_before',
    'multiplayer_match_account_stat_snapshots',
    'multiplayer_match_account_stat_outcomes',
    'multiplayer_grandweaver_jobs',
    'multiplayer_match_account_stat_snapshot_guard',
    'multiplayer_match_stats_publication_guard',
    'multiplayer_match_ranked_unlock_publication_guard',
    'multiplayer_grandweaver_job_update_guard',
    'attempt_count',
    'last_attempt_at',
    'next_attempt_at',
    "status IN ('PENDING', 'APPLIED')",
    'attempt_count >= 0',
    'NEW.attempt_count = OLD.attempt_count + 1',
    'NEW.next_attempt_at > NEW.last_attempt_at',
    'instr(sql, "\'FAILED\'") = 0',
    "NEW.status = 'APPLIED'",
    'multiplayer_match_deck_rank_jobs',
    'multiplayer_match_deck_rank_job_guard',
    'multiplayer_match_deck_rank_job_update_guard',
    'multiplayer_match_deck_rank_receipt_guard',
    'multiplayer_match_deck_rank_receipt_apply_job',
    'multiplayer_match_experience',
    "ledger.status = 'ended'",
    '$.match.matchSettings.season',
    'conquest_v2_reward_cycle_orchestrations',
    'conquest_v2_reward_delivery_failures',
    'conquest_v2_reward_cycle_orchestration_insert_guard',
    'conquest_v2_reward_cycle_orchestration_update_guard',
    'conquest_v2_reward_delivery_failures_insert_guard',
    "cycle.status = 'DELIVERING'",
    'orchestration.completed_at IS NULL',
    'leaderboard_reward_cycle_orchestrations',
    'leaderboard_reward_delivery_failures',
    'leaderboard_reward_cycle_orchestration_insert_guard',
    'leaderboard_reward_cycle_orchestration_update_guard',
    'leaderboard_reward_delivery_failures_insert_guard',
    'leaderboard_rank_reset_receipts',
    "activation.status = 'ACTIVE'",
    'player_notification_push_deliveries',
    'player_notification_push_failures',
    'player_notification_push_delivery_update_guard',
    'player_notification_push_failures_insert_guard',
    "status IN ('PENDING', 'SENT')",
    'NEW.last_enqueued_at >= OLD.last_enqueued_at',
    'skypass_season_close_orchestrations',
    'skypass_auto_claim_deliveries',
    'player_skypass_auto_claim_failures',
    'autoclaimed',
    'skypass_season_close_orchestration_insert_guard',
    'player_skypass_auto_claims_insert_guard',
    'skypass_auto_claim_delivery_update_guard',
    'skypass_season_close_cycles_transition_guard',
    'policy_content_sha256',
    'fulfillment_policy_hash',
    'referral_sticker_reward_sweeps',
    'referral_sticker_reward_sweep_players',
    'referral_sticker_reward_sweep_deliveries',
    'referral_sticker_reward_queue_failures',
    'referral_sticker_reward_sweeps_insert_guard',
    'referral_sticker_reward_sweeps_snapshot_guard',
    'referral_sticker_reward_sweep_players_update_guard',
    'referral_sticker_reward_sweep_deliveries_update_guard',
    'referral_sticker_reward_queue_failures_insert_guard',
    "origin IN ('SCHEDULE', 'MIGRATION')"
  ]) {
    assert.ok(PRODUCTION_SCHEMA_QUERY.includes(required))
  }
  assert.deepEqual(productionSchemaInvocation().slice(0, 6), [
    'd1',
    'execute',
    'opensky-auth',
    '--remote',
    '--config',
    '../wrangler.jsonc'
  ])
  assert.ok(productionSchemaInvocation().includes('--json'))
})

test('places the read-only schema preflight before every deploy only', () => {
  for (const [targetPath, target] of REVIEWED_PRODUCTION_TARGETS) {
    const config = configFor(target)
    const plan = productionOperationPlan('deploy', targetPath, config)
    assert.deepEqual(
      plan.map(step => step.kind),
      ['schema-preflight', 'operation']
    )
    assert.deepEqual(plan[0].args, productionSchemaInvocation())
  }
  const config = configFor(REVIEWED_PRODUCTION_TARGETS.get('wrangler.jsonc'))
  assert.deepEqual(
    productionOperationPlan('migrate', 'wrangler.jsonc', config).map(
      step => step.kind
    ),
    ['operation']
  )
})

test('the production runner cannot bypass its reviewed preflight plan', async () => {
  const source = await readFile(
    new URL('./run-cloudflare-production.mjs', import.meta.url),
    'utf8'
  )
  const ordered = [
    'const plan = productionOperationPlan(operation, targetPath, config)',
    "const preflight = plan.find(step => step.kind === 'schema-preflight')",
    'const check = spawnSync(',
    'productionSchemaRow(check.stdout)',
    "const operationStep = plan.find(step => step.kind === 'operation')",
    'const child = spawn('
  ]
  let cursor = -1
  for (const token of ordered) {
    const index = source.indexOf(token, cursor + 1)
    assert.ok(index > cursor, `production runner is missing ordered ${token}`)
    cursor = index
  }
})

test('accepts only one successful complete read-only schema row', () => {
  const complete = {
    required_migration_applied: 1,
    authoritative_decks_present: 1,
    registered_bots_present: 1,
    registered_bot_guards_present: 2,
    registered_bot_allocation_guard_present: 1,
    experience_publication_columns_present: 8,
    experience_publication_guards_present: 2,
    account_stat_publication_columns_present: 1,
    account_stat_publication_tables_present: 3,
    account_stat_publication_guards_present: 12,
    account_stat_payload_guard_present: 1,
    grandweaver_task_columns_present: 3,
    grandweaver_task_contract_guard_present: 1,
    deck_rank_job_table_present: 1,
    deck_rank_job_guards_present: 7,
    deck_rank_job_contract_guards_present: 3,
    conquest_v2_workflow_tables_present: 2,
    conquest_v2_workflow_guards_present: 6,
    conquest_v2_workflow_contract_guards_present: 3,
    leaderboard_workflow_tables_present: 2,
    leaderboard_workflow_guards_present: 6,
    leaderboard_workflow_contract_guards_present: 3,
    conquest_gold_queue_tables_present: 1,
    conquest_gold_queue_guards_present: 4,
    conquest_gold_queue_contract_guards_present: 2,
    conquest_gold_readiness_effect_view_present: 1,
    push_notification_queue_tables_present: 2,
    push_notification_queue_guards_present: 5,
    push_notification_queue_contract_guards_present: 3,
    skypass_workflow_tables_present: 3,
    skypass_autoclaimed_column_present: 1,
    skypass_workflow_guards_present: 14,
    skypass_workflow_contract_guards_present: 5,
    referral_sticker_workflow_tables_present: 4,
    referral_sticker_workflow_guards_present: 14,
    referral_sticker_workflow_contract_guards_present: 6
  }
  assert.deepEqual(
    productionSchemaRow(
      JSON.stringify([
        {
          results: [complete],
          success: true,
          meta: { changed_db: false, changes: 0 }
        }
      ])
    ),
    complete
  )
  for (const output of [
    'not JSON',
    JSON.stringify([]),
    JSON.stringify([{ results: [complete], success: false }]),
    JSON.stringify([
      {
        results: [complete],
        success: true,
        meta: { changed_db: true, changes: 1 }
      }
    ]),
    JSON.stringify([
      { results: [{ ...complete, registered_bots_present: 0 }], success: true }
    ]),
    JSON.stringify([
      {
        results: [{ ...complete, experience_publication_columns_present: 7 }],
        success: true
      }
    ]),
    JSON.stringify([
      {
        results: [{ ...complete, experience_publication_guards_present: 1 }],
        success: true
      }
    ]),
    JSON.stringify([
      {
        results: [{ ...complete, account_stat_publication_columns_present: 0 }],
        success: true
      }
    ]),
    JSON.stringify([
      {
        results: [{ ...complete, account_stat_publication_tables_present: 2 }],
        success: true
      }
    ]),
    JSON.stringify([
      {
        results: [{ ...complete, account_stat_publication_guards_present: 11 }],
        success: true
      }
    ]),
    JSON.stringify([
      {
        results: [{ ...complete, account_stat_payload_guard_present: 0 }],
        success: true
      }
    ]),
    JSON.stringify([
      {
        results: [{ ...complete, grandweaver_task_columns_present: 2 }],
        success: true
      }
    ]),
    JSON.stringify([
      {
        results: [{ ...complete, grandweaver_task_contract_guard_present: 0 }],
        success: true
      }
    ]),
    JSON.stringify([
      {
        results: [{ ...complete, deck_rank_job_table_present: 0 }],
        success: true
      }
    ]),
    JSON.stringify([
      {
        results: [{ ...complete, deck_rank_job_guards_present: 6 }],
        success: true
      }
    ]),
    JSON.stringify([
      {
        results: [{ ...complete, deck_rank_job_contract_guards_present: 2 }],
        success: true
      }
    ]),
    JSON.stringify([
      {
        results: [{ ...complete, conquest_v2_workflow_tables_present: 1 }],
        success: true
      }
    ]),
    JSON.stringify([
      {
        results: [{ ...complete, conquest_v2_workflow_guards_present: 5 }],
        success: true
      }
    ]),
    JSON.stringify([
      {
        results: [
          { ...complete, conquest_v2_workflow_contract_guards_present: 2 }
        ],
        success: true
      }
    ]),
    JSON.stringify([
      {
        results: [{ ...complete, leaderboard_workflow_tables_present: 1 }],
        success: true
      }
    ]),
    JSON.stringify([
      {
        results: [{ ...complete, leaderboard_workflow_guards_present: 5 }],
        success: true
      }
    ]),
    JSON.stringify([
      {
        results: [
          { ...complete, leaderboard_workflow_contract_guards_present: 2 }
        ],
        success: true
      }
    ]),
    JSON.stringify([
      {
        results: [{ ...complete, conquest_gold_queue_tables_present: 0 }],
        success: true
      }
    ]),
    JSON.stringify([
      {
        results: [{ ...complete, conquest_gold_queue_guards_present: 3 }],
        success: true
      }
    ]),
    JSON.stringify([
      {
        results: [
          { ...complete, conquest_gold_queue_contract_guards_present: 1 }
        ],
        success: true
      }
    ]),
    JSON.stringify([
      {
        results: [
          { ...complete, conquest_gold_readiness_effect_view_present: 0 }
        ],
        success: true
      }
    ]),
    JSON.stringify([
      {
        results: [{ ...complete, push_notification_queue_tables_present: 1 }],
        success: true
      }
    ]),
    JSON.stringify([
      {
        results: [{ ...complete, push_notification_queue_guards_present: 4 }],
        success: true
      }
    ]),
    JSON.stringify([
      {
        results: [
          { ...complete, push_notification_queue_contract_guards_present: 2 }
        ],
        success: true
      }
    ]),
    JSON.stringify([
      {
        results: [{ ...complete, skypass_workflow_tables_present: 2 }],
        success: true
      }
    ]),
    JSON.stringify([
      {
        results: [{ ...complete, skypass_autoclaimed_column_present: 0 }],
        success: true
      }
    ]),
    JSON.stringify([
      {
        results: [{ ...complete, skypass_workflow_guards_present: 13 }],
        success: true
      }
    ]),
    JSON.stringify([
      {
        results: [{ ...complete, skypass_workflow_contract_guards_present: 4 }],
        success: true
      }
    ]),
    JSON.stringify([
      {
        results: [{ ...complete, referral_sticker_workflow_tables_present: 3 }],
        success: true
      }
    ]),
    JSON.stringify([
      {
        results: [
          { ...complete, referral_sticker_workflow_guards_present: 13 }
        ],
        success: true
      }
    ]),
    JSON.stringify([
      {
        results: [
          { ...complete, referral_sticker_workflow_contract_guards_present: 5 }
        ],
        success: true
      }
    ]),
    JSON.stringify([{ results: [complete, complete], success: true }])
  ]) {
    assert.throws(
      () => productionSchemaRow(output),
      /schema preflight|not ready/
    )
  }
})

test('requires every package deployment path to use the target runner', () => {
  const rootPackage = {
    scripts: {
      'deploy:cloudflare':
        'pnpm build && node ./utils/run-cloudflare-production.mjs deploy wrangler.jsonc',
      'deploy:cloudflare:game-server':
        'pnpm check:cloudflare:match-reward-wire && node ./utils/run-cloudflare-production.mjs deploy game-server-cloudflare/wrangler.jsonc',
      'deploy:cloudflare:match-service':
        'node ./utils/run-cloudflare-production.mjs deploy match-service-cloudflare/wrangler.jsonc',
      'deploy:cloudflare:matchmaker':
        'node ./utils/run-cloudflare-production.mjs deploy matchmaker-ts/wrangler.jsonc',
      'deploy:cloudflare:analytics':
        'node ./utils/run-cloudflare-production.mjs deploy game-analytics/wrangler.jsonc',
      'db:migrate:cloudflare:remote':
        'node ./utils/run-cloudflare-production.mjs migrate wrangler.jsonc'
    }
  }
  const analyticsPackage = {
    scripts: {
      'deploy:cloudflare':
        'node ../utils/run-cloudflare-production.mjs deploy game-analytics/wrangler.jsonc'
    }
  }
  assert.deepEqual(productionScriptErrors(rootPackage, analyticsPackage), [])
  const guardedGameDeploy = rootPackage.scripts['deploy:cloudflare:game-server']
  rootPackage.scripts['deploy:cloudflare:game-server'] =
    guardedGameDeploy.replace('pnpm check:cloudflare:match-reward-wire && ', '')
  assert.ok(
    productionScriptErrors(rootPackage, analyticsPackage).some(error =>
      error.includes('match reward wire gate')
    )
  )
  rootPackage.scripts['deploy:cloudflare:game-server'] = guardedGameDeploy
  rootPackage.scripts['deploy:cloudflare'] += ' && wrangler deploy lookalike'
  assert.ok(
    productionScriptErrors(rootPackage, analyticsPackage).some(error =>
      error.includes('direct Wrangler')
    )
  )
  rootPackage.scripts['deploy:cloudflare'] =
    'node ./utils/run-cloudflare-production.mjs deploy wrangler.jsonc && pnpm exec wrangler --config lookalike.jsonc deploy'
  assert.ok(
    productionScriptErrors(rootPackage, analyticsPackage).some(error =>
      error.includes('direct Wrangler')
    )
  )
})
