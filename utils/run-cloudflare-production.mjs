import { spawn, spawnSync } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

export const REVIEWED_CLOUDFLARE_ACCOUNT_ID = '528badc1c29c30196335df252a73c5a6'
export const REVIEWED_AUTH_DB_ID = '2ac6fbbd-359b-407c-9d87-bd62b17a7548'
export const REVIEWED_ANALYTICS_BUCKET = 'cloud-weasel-game-analytics'
export const REVIEWED_ANALYTICS_QUEUE = 'cloud-weasel-game-analytics'
export const REVIEWED_ANALYTICS_DEAD_LETTER_QUEUE =
  'cloud-weasel-game-analytics-dead-letter'
export const REVIEWED_CLIENT_FEEDBACK_BUCKET = 'cloud-weasel-client-feedback'
export const REQUIRED_PRODUCTION_SCHEMA_MIGRATION =
  '0120_grandweaver_task_attempts.sql'
export const PRODUCTION_SCHEMA_QUERY = `SELECT
  (SELECT COUNT(*) FROM d1_migrations
    WHERE name = '${REQUIRED_PRODUCTION_SCHEMA_MIGRATION}')
    AS required_migration_applied,
  (SELECT COUNT(*) FROM sqlite_schema
    WHERE type = 'table'
      AND name = 'multiplayer_match_authoritative_decks')
    AS authoritative_decks_present,
  (SELECT COUNT(*) FROM sqlite_schema
    WHERE type = 'table' AND name = 'registered_matchmaker_bots')
    AS registered_bots_present,
  (SELECT COUNT(*) FROM sqlite_schema
    WHERE type = 'trigger' AND name IN (
      'registered_matchmaker_bots_identity_no_update',
      'registered_matchmaker_bots_no_delete'
    )) AS registered_bot_guards_present,
  (SELECT COUNT(*) FROM sqlite_schema
    WHERE type = 'trigger'
      AND name = 'multiplayer_matches_user_kind_insert_guard'
      AND instr(sql, 'registered_matchmaker_bots') > 0)
    AS registered_bot_allocation_guard_present,
  (SELECT COUNT(*)
     FROM pragma_table_info('multiplayer_match_experience_players')
     WHERE name IN (
       'before_skypass_xp',
       'season_stats_existed_before',
       'season_initial_account_level_before',
       'season_achieved_account_level_before',
       'profile_updated_at_before',
       'inviter_sticker_points_existed_before',
       'inviter_sticker_points_created_at_before',
       'inviter_sticker_points_updated_at_before'
     )) AS experience_publication_columns_present,
  (SELECT COUNT(*) FROM sqlite_schema
    WHERE type = 'trigger' AND name IN (
      'multiplayer_match_experience_player_publication_state_guard',
      'multiplayer_match_experience_publication_complete_guard'
    )) AS experience_publication_guards_present,
  (SELECT COUNT(*)
     FROM pragma_table_info('multiplayer_match_experience_players')
     WHERE name = 'ranked_discovery_before')
    AS account_stat_publication_columns_present,
  (SELECT COUNT(*) FROM sqlite_schema
    WHERE type = 'table' AND name IN (
      'multiplayer_match_account_stat_snapshots',
      'multiplayer_match_account_stat_outcomes',
      'multiplayer_grandweaver_jobs'
    )) AS account_stat_publication_tables_present,
  (SELECT COUNT(*) FROM sqlite_schema
    WHERE type = 'trigger' AND name IN (
      'multiplayer_match_account_stat_snapshot_guard',
      'multiplayer_match_experience_rank_snapshot_guard',
      'multiplayer_match_account_stat_snapshot_no_update',
      'multiplayer_match_account_stat_snapshot_no_delete',
      'multiplayer_match_account_stat_outcome_guard',
      'multiplayer_match_account_stat_outcome_no_update',
      'multiplayer_match_account_stat_outcome_no_delete',
      'multiplayer_match_stats_publication_guard',
      'multiplayer_match_ranked_unlock_publication_guard',
      'multiplayer_grandweaver_job_guard',
      'multiplayer_grandweaver_job_update_guard',
      'multiplayer_grandweaver_job_no_delete'
    )) AS account_stat_publication_guards_present,
  (SELECT COUNT(*) FROM sqlite_schema
    WHERE type = 'trigger'
      AND name = 'multiplayer_match_account_stat_snapshot_guard'
      AND instr(sql, '$.match.matchSettings.season') > 0)
    AS account_stat_payload_guard_present,
  (SELECT COUNT(*)
     FROM pragma_table_info('multiplayer_grandweaver_jobs')
     WHERE name IN ('attempt_count', 'last_attempt_at', 'next_attempt_at'))
    AS grandweaver_task_columns_present,
  (SELECT COUNT(*) FROM sqlite_schema
    WHERE type = 'trigger'
      AND name = 'multiplayer_grandweaver_job_update_guard'
      AND instr(sql, 'NEW.attempt_count = OLD.attempt_count + 1') > 0
      AND instr(sql, 'NEW.next_attempt_at > NEW.last_attempt_at') > 0
      AND instr(sql, "NEW.status = 'APPLIED'") > 0
      AND instr(sql, "'FAILED'") = 0
      AND instr(sql, "ledger.status = 'ended'") > 0
      AND EXISTS (
        SELECT 1 FROM sqlite_schema task_table
        WHERE task_table.type = 'table'
          AND task_table.name = 'multiplayer_grandweaver_jobs'
          AND instr(
            task_table.sql, "status IN ('PENDING', 'APPLIED')"
          ) > 0
          AND instr(task_table.sql, 'attempt_count >= 0') > 0
          AND instr(task_table.sql, "'FAILED'") = 0
      ))
    AS grandweaver_task_contract_guard_present,
  (SELECT COUNT(*) FROM sqlite_schema
    WHERE type = 'table'
      AND name = 'multiplayer_match_deck_rank_jobs'
      AND instr(sql, "status IN ('PENDING', 'APPLIED')") > 0
      AND instr(sql, 'attempt_count >= 0') > 0
      AND instr(sql, "'FAILED'") = 0)
    AS deck_rank_job_table_present,
  (SELECT COUNT(*) FROM sqlite_schema
    WHERE type = 'trigger' AND name IN (
      'multiplayer_match_deck_rank_job_guard',
      'multiplayer_match_deck_rank_job_update_guard',
      'multiplayer_match_deck_rank_job_no_delete',
      'multiplayer_match_deck_rank_receipt_guard',
      'multiplayer_match_deck_rank_receipt_apply_job',
      'multiplayer_match_deck_rank_receipt_no_update',
      'multiplayer_match_deck_rank_receipt_no_delete'
    )) AS deck_rank_job_guards_present,
  (SELECT COUNT(*) FROM sqlite_schema
    WHERE type = 'trigger' AND (
      (name = 'multiplayer_match_deck_rank_job_guard'
        AND instr(sql, '$.match.matchSettings.season') > 0
        AND instr(sql, 'multiplayer_match_experience') > 0)
      OR
      (name = 'multiplayer_match_deck_rank_job_update_guard'
        AND instr(sql, 'NEW.attempt_count = OLD.attempt_count + 1') > 0
        AND instr(sql, 'NEW.next_attempt_at > NEW.last_attempt_at') > 0
        AND instr(sql, "'FAILED'") = 0
        AND instr(sql, "ledger.status = 'ended'") > 0)
      OR
      (name = 'multiplayer_match_deck_rank_receipt_guard'
        AND instr(sql, "ledger.status = 'ended'") > 0)
    )) AS deck_rank_job_contract_guards_present;`

export const REVIEWED_PRODUCTION_TARGETS = new Map([
  [
    'wrangler.jsonc',
    {
      name: 'opensky-webapp',
      requiresAuthDatabase: true,
      supportsClientFeedback: true
    }
  ],
  [
    'game-server-cloudflare/wrangler.jsonc',
    {
      name: 'cloud-weasel-game-server',
      requiresAuthDatabase: true,
      supportsAnalyticsProducer: true
    }
  ],
  [
    'match-service-cloudflare/wrangler.jsonc',
    { name: 'cloud-weasel-match-service', requiresAuthDatabase: true }
  ],
  [
    'matchmaker-ts/wrangler.jsonc',
    { name: 'cloud-weasel-matchmaker', requiresAuthDatabase: false }
  ],
  [
    'game-analytics/wrangler.jsonc',
    {
      name: 'cloud-weasel-game-analytics',
      requiresAuthDatabase: true,
      requiresAnalyticsConsumer: true
    }
  ]
])

const normalizedTargetPath = value =>
  value.replaceAll('\\', '/').replace(/^\.\//, '')

const authDatabase = config =>
  config?.d1_databases?.filter(database => database.binding === 'AUTH_DB') ?? []

const r2Bindings = (config, binding) =>
  config?.r2_buckets?.filter(bucket => bucket.binding === binding) ?? []

const queueProducers = (config, binding) =>
  config?.queues?.producers?.filter(producer => producer.binding === binding) ??
  []

const analyticsConsumerErrors = config => {
  const errors = []
  const allBuckets = config?.r2_buckets ?? []
  const buckets = r2Bindings(config, 'GAME_ANALYTICS')
  if (
    allBuckets.length !== 1 ||
    buckets.length !== 1 ||
    buckets[0]?.bucket_name !== REVIEWED_ANALYTICS_BUCKET
  ) {
    errors.push(
      `game analytics must bind exactly one GAME_ANALYTICS R2 bucket named ${REVIEWED_ANALYTICS_BUCKET}`
    )
  }

  const consumers = config?.queues?.consumers ?? []
  const producers = config?.queues?.producers ?? []
  const expected = {
    queue: REVIEWED_ANALYTICS_QUEUE,
    max_batch_size: 1,
    max_batch_timeout: 5,
    max_retries: 25,
    dead_letter_queue: REVIEWED_ANALYTICS_DEAD_LETTER_QUEUE,
    max_concurrency: 5,
    retry_delay: 30
  }
  if (
    consumers.length !== 1 ||
    Object.entries(expected).some(
      ([key, value]) => consumers[0]?.[key] !== value
    )
  ) {
    errors.push(
      'game analytics must retain the reviewed bounded Queue consumer and dead-letter topology'
    )
  }
  if (producers.length) {
    errors.push('game analytics cannot publish to an unreviewed Queue')
  }
  if (config?.vars?.ANALYTICS_RELEASE_VERSION !== 'cloudflare') {
    errors.push('game analytics release version must remain cloudflare')
  }
  return errors
}

const optionalAnalyticsProducerErrors = config => {
  const allBuckets = config?.r2_buckets ?? []
  const allProducers = config?.queues?.producers ?? []
  const consumers = config?.queues?.consumers ?? []
  const buckets = r2Bindings(config, 'GAME_ANALYTICS')
  const producers = queueProducers(config, 'GAME_ANALYTICS_QUEUE')
  if (!allBuckets.length && !allProducers.length && !consumers.length) return []
  if (
    allBuckets.length !== 1 ||
    buckets.length !== 1 ||
    buckets[0]?.bucket_name !== REVIEWED_ANALYTICS_BUCKET ||
    allProducers.length !== 1 ||
    producers.length !== 1 ||
    producers[0]?.queue !== REVIEWED_ANALYTICS_QUEUE ||
    consumers.length
  ) {
    return [
      'game server analytics must be disabled completely or bind the reviewed R2 bucket and Queue producer together'
    ]
  }
  return []
}

const optionalClientFeedbackErrors = config => {
  const allBuckets = config?.r2_buckets ?? []
  const buckets = r2Bindings(config, 'CLIENT_FEEDBACK')
  if (!allBuckets.length) return []
  if (
    allBuckets.length !== 1 ||
    buckets.length !== 1 ||
    buckets[0]?.bucket_name !== REVIEWED_CLIENT_FEEDBACK_BUCKET
  ) {
    return [
      `client feedback must bind exactly one private R2 bucket named ${REVIEWED_CLIENT_FEEDBACK_BUCKET}`
    ]
  }
  return []
}

export const productionTargetErrors = (
  targetPath,
  config,
  environment = {}
) => {
  const normalized = normalizedTargetPath(targetPath)
  const reviewed = REVIEWED_PRODUCTION_TARGETS.get(normalized)
  if (!reviewed)
    return [`unreviewed Cloudflare production config: ${normalized}`]

  const errors = []
  if (config?.name !== reviewed.name) {
    errors.push(`${normalized} Worker name must remain ${reviewed.name}`)
  }
  if (config?.account_id !== REVIEWED_CLOUDFLARE_ACCOUNT_ID) {
    errors.push(
      `${normalized} account_id must remain the reviewed Cloud Weasel account`
    )
  }
  if (
    environment.CLOUDFLARE_ACCOUNT_ID &&
    environment.CLOUDFLARE_ACCOUNT_ID !== config?.account_id
  ) {
    errors.push(`${normalized} account_id conflicts with CLOUDFLARE_ACCOUNT_ID`)
  }

  const databases = authDatabase(config)
  if (reviewed.requiresAuthDatabase) {
    if (databases.length !== 1) {
      errors.push(`${normalized} must bind exactly one AUTH_DB`)
    } else {
      const [database] = databases
      if (database.database_name !== 'opensky-auth') {
        errors.push(`${normalized} AUTH_DB name must remain opensky-auth`)
      }
      if (database.database_id !== REVIEWED_AUTH_DB_ID) {
        errors.push(
          `${normalized} AUTH_DB id must remain the reviewed production database`
        )
      }
    }
  } else if (databases.length) {
    errors.push(`${normalized} has an unreviewed AUTH_DB binding`)
  }
  if (reviewed.requiresAnalyticsConsumer) {
    errors.push(...analyticsConsumerErrors(config))
  }
  if (reviewed.supportsAnalyticsProducer) {
    errors.push(...optionalAnalyticsProducerErrors(config))
  }
  if (reviewed.supportsClientFeedback) {
    errors.push(...optionalClientFeedbackErrors(config))
  }
  return errors
}

export const productionInvocation = (operation, targetPath, config) => {
  const normalized = normalizedTargetPath(targetPath)
  const configFromRunner = path.posix.join('..', normalized)
  if (operation === 'deploy') {
    return ['deploy', '--config', configFromRunner]
  }
  if (operation === 'migrate') {
    const databases = authDatabase(config)
    if (databases.length !== 1) {
      throw new Error(
        `${normalized} has no unambiguous AUTH_DB migration target`
      )
    }
    return [
      'd1',
      'migrations',
      'apply',
      databases[0].database_name,
      '--remote',
      '--config',
      configFromRunner
    ]
  }
  throw new Error(`unsupported Cloudflare production operation: ${operation}`)
}

export const productionSchemaInvocation = () => [
  'd1',
  'execute',
  'opensky-auth',
  '--remote',
  '--config',
  '../wrangler.jsonc',
  '--json',
  '--command',
  PRODUCTION_SCHEMA_QUERY
]

export const productionOperationPlan = (operation, targetPath, config) => {
  const operationStep = {
    kind: 'operation',
    args: productionInvocation(operation, targetPath, config)
  }
  return operation === 'deploy'
    ? [
        { kind: 'schema-preflight', args: productionSchemaInvocation() },
        operationStep
      ]
    : [operationStep]
}

export const productionSchemaRow = output => {
  let parsed
  try {
    parsed = typeof output === 'string' ? JSON.parse(output) : output
  } catch {
    throw new Error(
      'Cloudflare production schema preflight returned invalid JSON'
    )
  }
  const executions = Array.isArray(parsed) ? parsed : []
  const rows = executions.flatMap(execution => execution?.results ?? [])
  if (
    executions.length !== 1 ||
    executions[0]?.success !== true ||
    (executions[0]?.meta?.changed_db !== undefined &&
      executions[0].meta.changed_db !== false) ||
    (executions[0]?.meta?.changes !== undefined &&
      executions[0].meta.changes !== 0) ||
    rows.length !== 1
  ) {
    throw new Error(
      'Cloudflare production schema preflight did not return one read-only row'
    )
  }
  const row = rows[0]
  if (
    row?.required_migration_applied !== 1 ||
    row?.authoritative_decks_present !== 1 ||
    row?.registered_bots_present !== 1 ||
    row?.registered_bot_guards_present !== 2 ||
    row?.registered_bot_allocation_guard_present !== 1 ||
    row?.experience_publication_columns_present !== 8 ||
    row?.experience_publication_guards_present !== 2 ||
    row?.account_stat_publication_columns_present !== 1 ||
    row?.account_stat_publication_tables_present !== 3 ||
    row?.account_stat_publication_guards_present !== 12 ||
    row?.account_stat_payload_guard_present !== 1 ||
    row?.grandweaver_task_columns_present !== 3 ||
    row?.grandweaver_task_contract_guard_present !== 1 ||
    row?.deck_rank_job_table_present !== 1 ||
    row?.deck_rank_job_guards_present !== 7 ||
    row?.deck_rank_job_contract_guards_present !== 3
  ) {
    throw new Error(
      `Cloudflare production schema is not ready through ${REQUIRED_PRODUCTION_SCHEMA_MIGRATION}`
    )
  }
  return row
}

export const productionScriptErrors = (rootPackage, analyticsPackage) => {
  const scripts = rootPackage?.scripts ?? {}
  const expected = {
    'deploy:cloudflare':
      'node ./utils/run-cloudflare-production.mjs deploy wrangler.jsonc',
    'deploy:cloudflare:game-server':
      'node ./utils/run-cloudflare-production.mjs deploy game-server-cloudflare/wrangler.jsonc',
    'deploy:cloudflare:match-service':
      'node ./utils/run-cloudflare-production.mjs deploy match-service-cloudflare/wrangler.jsonc',
    'deploy:cloudflare:matchmaker':
      'node ./utils/run-cloudflare-production.mjs deploy matchmaker-ts/wrangler.jsonc',
    'deploy:cloudflare:analytics':
      'node ./utils/run-cloudflare-production.mjs deploy game-analytics/wrangler.jsonc',
    'db:migrate:cloudflare:remote':
      'node ./utils/run-cloudflare-production.mjs migrate wrangler.jsonc'
  }
  const errors = []
  const hasDirectWranglerCommand = script => /\bwrangler\s/.test(script ?? '')
  for (const [name, token] of Object.entries(expected)) {
    const script = scripts[name]
    if (!script?.includes(token)) {
      errors.push(`${name} bypasses the reviewed Cloudflare production target`)
    }
    if (hasDirectWranglerCommand(script)) {
      errors.push(`${name} contains a direct Wrangler production command`)
    }
  }
  if (
    !scripts['deploy:cloudflare:game-server']?.includes(
      'pnpm check:cloudflare:match-reward-wire'
    )
  ) {
    errors.push(
      'deploy:cloudflare:game-server bypasses the generated Go match reward wire gate'
    )
  }
  const analyticsScript = analyticsPackage?.scripts?.['deploy:cloudflare']
  if (
    !analyticsScript?.includes(
      'node ../utils/run-cloudflare-production.mjs deploy game-analytics/wrangler.jsonc'
    )
  ) {
    errors.push(
      'game-analytics deploy:cloudflare bypasses the reviewed production target'
    )
  }
  if (hasDirectWranglerCommand(analyticsScript)) {
    errors.push(
      'game-analytics deploy:cloudflare contains a direct Wrangler production command'
    )
  }
  return errors
}

const main = async () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  const commandArguments = process.argv.slice(2)
  if (commandArguments.length !== 2) {
    throw new Error(
      'usage: run-cloudflare-production.mjs <deploy|migrate> <reviewed config>'
    )
  }
  const [operation, requestedTarget] = commandArguments
  const targetPath = normalizedTargetPath(requestedTarget)
  const absoluteTarget = path.resolve(root, targetPath)
  if (!absoluteTarget.startsWith(`${root}${path.sep}`)) {
    throw new Error(
      'Cloudflare production config must be inside the repository'
    )
  }
  const config = JSON.parse(await readFile(absoluteTarget, 'utf8'))
  const schemaConfig =
    targetPath === 'wrangler.jsonc'
      ? config
      : JSON.parse(await readFile(path.join(root, 'wrangler.jsonc'), 'utf8'))
  const errors = [
    ...productionTargetErrors(targetPath, config, process.env),
    ...(targetPath === 'wrangler.jsonc'
      ? []
      : productionTargetErrors('wrangler.jsonc', schemaConfig, process.env))
  ]
  if (errors.length) throw new Error(errors.join('\n'))

  const plan = productionOperationPlan(operation, targetPath, config)
  process.stdout.write(
    `Cloudflare production target: ${config.name} in reviewed account ${config.account_id}\n`
  )
  const preflight = plan.find(step => step.kind === 'schema-preflight')
  if (preflight) {
    const check = spawnSync(
      'pnpm',
      ['--dir', 'cloudflare', 'exec', 'wrangler', ...preflight.args],
      {
        cwd: root,
        encoding: 'utf8',
        env: {
          ...process.env,
          CLOUDFLARE_ACCOUNT_ID: schemaConfig.account_id
        }
      }
    )
    if (check.error) throw check.error
    if (check.status !== 0) {
      process.stderr.write(check.stderr || check.stdout)
      process.exitCode = check.status || 1
      return
    }
    productionSchemaRow(check.stdout)
    process.stdout.write(
      `Cloudflare production schema includes ${REQUIRED_PRODUCTION_SCHEMA_MIGRATION}\n`
    )
  }
  const operationStep = plan.find(step => step.kind === 'operation')
  if (!operationStep) {
    throw new Error('Cloudflare production operation is missing')
  }
  const child = spawn(
    'pnpm',
    ['--dir', 'cloudflare', 'exec', 'wrangler', ...operationStep.args],
    {
      cwd: root,
      env: {
        ...process.env,
        CLOUDFLARE_ACCOUNT_ID: config.account_id
      },
      stdio: 'inherit'
    }
  )
  const exitCode = await new Promise((resolve, reject) => {
    child.once('error', reject)
    child.once('exit', code => resolve(code ?? 1))
  })
  process.exitCode = exitCode
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  await main()
}
