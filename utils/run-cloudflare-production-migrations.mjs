import { spawn, spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import {
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import {
  productionSchemaInvocation,
  productionSchemaRow,
  productionTargetErrors,
  REVIEWED_AUTH_DB_ID,
  REVIEWED_CLOUDFLARE_ACCOUNT_ID
} from './run-cloudflare-production.mjs'

export const PRODUCTION_MIGRATION_PHASES = Object.freeze({
  'authoritative-decks': Object.freeze(['0115_authoritative_match_decks.sql']),
  'durable-runtime': Object.freeze([
    '0116_registered_matchmaker_bots.sql',
    '0117_match_experience_publication_state.sql',
    '0118_match_account_stat_publication.sql',
    '0119_match_deck_rank_jobs.sql',
    '0120_grandweaver_task_attempts.sql',
    '0121_conquest_v2_workflow_handoffs.sql',
    '0122_leaderboard_reward_workflow_handoffs.sql',
    '0123_conquest_gold_queue_delivery.sql',
    '0124_push_notification_queue_delivery.sql',
    '0125_skypass_season_close_workflow_handoffs.sql',
    '0126_referral_sticker_reward_workflow_handoffs.sql',
    '0127_account_deletion_workflow_orchestration.sql',
    '0128_conquest_readiness_drill_workflows.sql'
  ])
})

export const CUTOVER_DISABLED_GAME_MODES = Object.freeze([
  'CHALLENGE_CONSTRUCTED',
  'CHALLENGE_DISCOVERY',
  'CONQUEST_CONSTRUCTED',
  'CONQUEST_DISCOVERY',
  'PRACTICE_PVP',
  'RANKED_CONSTRUCTED',
  'RANKED_DISCOVERY',
  'WARM_UP'
])

export const PRODUCTION_MIGRATION_STATE_QUERY = `SELECT
  COALESCE((
    SELECT group_concat(name, '|')
    FROM (SELECT name FROM d1_migrations ORDER BY name)
  ), '') AS applied_migrations,
  (SELECT COUNT(*) FROM game_mode_status
    WHERE enabled <> 0 AND game_mode IN (
      ${CUTOVER_DISABLED_GAME_MODES.map(mode => `'${mode}'`).join(',\n      ')}
    )) AS enabled_allocation_modes,
  (SELECT COUNT(*) FROM multiplayer_matches
    WHERE status IN ('creating', 'active')) AS inflight_matches,
  ((SELECT COUNT(*) FROM sqlite_schema
      WHERE type = 'table'
        AND name = 'multiplayer_match_authoritative_decks')
    +
    (SELECT COUNT(*) FROM sqlite_schema
      WHERE type = 'trigger' AND name IN (
        'multiplayer_match_authoritative_decks_insert_guard',
        'multiplayer_match_authoritative_decks_no_update',
        'multiplayer_match_authoritative_decks_no_delete'
      ))) AS authoritative_deck_schema_guards;`

const sha256 = value => createHash('sha256').update(value).digest('hex')

const phaseFiles = phase => {
  const files = PRODUCTION_MIGRATION_PHASES[phase]
  if (!files) throw new Error(`unreviewed production migration phase: ${phase}`)
  return files
}

export const reviewedMigrationInventoryErrors = migrationFiles => {
  const files = [...migrationFiles].sort()
  const firstCutover = files.indexOf('0115_authoritative_match_decks.sql')
  const expectedTail = Object.values(PRODUCTION_MIGRATION_PHASES).flat()
  const errors = []
  if (firstCutover < 0) {
    errors.push('production migration inventory has no 0115 cutover boundary')
    return errors
  }
  if (files[firstCutover - 1] !== '0114_match_participant_classification.sql') {
    errors.push(
      'production migration inventory no longer enters 0115 from 0114'
    )
  }
  if (
    JSON.stringify(files.slice(firstCutover)) !== JSON.stringify(expectedTail)
  ) {
    errors.push(
      'production migration phases do not exactly cover 0115 through 0128'
    )
  }
  return errors
}

const migrationFilesAt = async root => {
  const migrationRoot = path.join(root, 'cloudflare/migrations')
  const migrationFiles = (await readdir(migrationRoot))
    .filter(file => /^\d{4}_.+\.sql$/.test(file))
    .sort()
  const errors = reviewedMigrationInventoryErrors(migrationFiles)
  if (errors.length) throw new Error(errors.join('\n'))
  return { migrationRoot, migrationFiles }
}

export const createProductionMigrationManifest = async (
  root,
  phase,
  headSha
) => {
  if (!/^[0-9a-f]{40}$/.test(headSha)) {
    throw new Error('production migration head SHA is invalid')
  }
  const selected = phaseFiles(phase)
  const { migrationRoot, migrationFiles } = await migrationFilesAt(root)
  const firstSelected = migrationFiles.indexOf(selected[0])
  const expectedAppliedBefore = migrationFiles.slice(0, firstSelected)
  const files = await Promise.all(
    selected.map(async name => ({
      name,
      sha256: sha256(await readFile(path.join(migrationRoot, name)))
    }))
  )
  const manifest = {
    version: 1,
    phase,
    headSha,
    accountId: REVIEWED_CLOUDFLARE_ACCOUNT_ID,
    databaseName: 'opensky-auth',
    databaseId: REVIEWED_AUTH_DB_ID,
    expectedAppliedBefore,
    files
  }
  return {
    ...manifest,
    confirmation: sha256(JSON.stringify(manifest))
  }
}

export const productionMigrationStateInvocation = () => [
  'd1',
  'execute',
  'opensky-auth',
  '--remote',
  '--config',
  '../wrangler.jsonc',
  '--json',
  '--command',
  PRODUCTION_MIGRATION_STATE_QUERY
]

const readOnlyResultRow = output => {
  let parsed
  try {
    parsed = typeof output === 'string' ? JSON.parse(output) : output
  } catch {
    throw new Error('production migration preflight returned invalid JSON')
  }
  const executions = Array.isArray(parsed) ? parsed : []
  const rows = executions.flatMap(execution => execution?.results ?? [])
  if (
    executions.length !== 1 ||
    executions[0]?.success !== true ||
    executions[0]?.meta?.changed_db !== false ||
    executions[0]?.meta?.changes !== 0 ||
    rows.length !== 1
  ) {
    throw new Error(
      'production migration preflight did not return one read-only row'
    )
  }
  return rows[0]
}

const migrationState = output => {
  const row = readOnlyResultRow(output)
  const applied = row.applied_migrations
    ? String(row.applied_migrations).split('|')
    : []
  if (row.enabled_allocation_modes !== 0 || row.inflight_matches !== 0) {
    throw new Error(
      'production migration cutover requires disabled allocation modes and zero in-flight matches'
    )
  }
  const expectedDeckGuards = applied.includes(
    '0115_authoritative_match_decks.sql'
  )
    ? 4
    : 0
  if (row.authoritative_deck_schema_guards !== expectedDeckGuards) {
    throw new Error(
      'production migration authoritative-deck schema is not at the reviewed phase'
    )
  }
  return { applied, row }
}

export const productionMigrationStateRow = (output, expectedApplied) => {
  const state = migrationState(output)
  if (JSON.stringify(state.applied) !== JSON.stringify(expectedApplied)) {
    throw new Error(
      'production migration receipt set is not the reviewed phase'
    )
  }
  return state.row
}

export const productionMigrationPhaseStateRow = (output, manifest) => {
  const state = migrationState(output)
  const selected = manifest.files.map(file => file.name)
  for (
    let appliedInPhase = 0;
    appliedInPhase <= selected.length;
    appliedInPhase++
  ) {
    const allowed = [
      ...manifest.expectedAppliedBefore,
      ...selected.slice(0, appliedInPhase)
    ]
    if (JSON.stringify(state.applied) === JSON.stringify(allowed)) {
      return { ...state.row, appliedInPhase }
    }
  }
  throw new Error(
    'production migration receipts are not a recoverable canonical phase prefix'
  )
}

export const exactHeadCIErrors = (run, expectedHeadSha) => {
  const errors = []
  if (run?.headSha !== expectedHeadSha)
    errors.push('CI head SHA does not match')
  if (run?.status !== 'completed') errors.push('CI run is not complete')
  if (run?.conclusion !== 'success') errors.push('CI run did not succeed')
  if (run?.event !== 'pull_request') errors.push('CI run is not a PR run')
  if (run?.workflowName !== 'Cloudflare release contract') {
    errors.push('CI run is not the reviewed release workflow')
  }
  return errors
}

export const createProductionMigrationWorkspace = async (
  root,
  manifest,
  temporaryRoot = tmpdir()
) => {
  phaseFiles(manifest.phase)
  const directory = await mkdtemp(
    path.join(temporaryRoot, `cloud-weasel-${manifest.phase}-`)
  )
  try {
    const migrationsDirectory = path.join(directory, 'migrations')
    await mkdir(migrationsDirectory)
    for (const file of manifest.files) {
      const source = path.join(root, 'cloudflare/migrations', file.name)
      const content = await readFile(source)
      if (sha256(content) !== file.sha256) {
        throw new Error(`production migration changed after plan: ${file.name}`)
      }
      await copyFile(source, path.join(migrationsDirectory, file.name))
    }
    const configPath = path.join(directory, 'wrangler.jsonc')
    await writeFile(
      configPath,
      `${JSON.stringify(
        {
          name: `cloud-weasel-migration-${manifest.phase}`,
          account_id: manifest.accountId,
          compatibility_date: '2026-07-15',
          d1_databases: [
            {
              binding: 'AUTH_DB',
              database_name: manifest.databaseName,
              database_id: manifest.databaseId,
              migrations_dir: './migrations'
            }
          ]
        },
        null,
        2
      )}\n`
    )
    return {
      directory,
      configPath,
      dispose: () => rm(directory, { recursive: true, force: true })
    }
  } catch (error) {
    await rm(directory, { recursive: true, force: true })
    throw error
  }
}

export const renderProductionMigrationPlan = manifest =>
  [
    'PLAN ONLY — no Cloudflare command was executed.',
    `Phase: ${manifest.phase}`,
    `Git head: ${manifest.headSha}`,
    `Database: ${manifest.databaseName} (${manifest.databaseId})`,
    'Files:',
    ...manifest.files.map(file => `  ${file.name} ${file.sha256}`),
    `Confirmation: ${manifest.confirmation}`,
    'After explicit authorization, apply with:',
    `  node ./utils/run-cloudflare-production-migrations.mjs apply ${manifest.phase} --confirm ${manifest.confirmation} --ci-run <run-id>`
  ].join('\n')

const checkedSpawn = (command, args, options = {}) => {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    ...options
  })
  if (result.error) throw result.error
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || `${command} failed`)
  }
  return result.stdout.trim()
}

const currentHead = root =>
  checkedSpawn('git', ['rev-parse', 'HEAD'], { cwd: root })

const requireCleanPushedHead = (root, headSha) => {
  const tracked = checkedSpawn(
    'git',
    ['status', '--porcelain=v1', '--untracked-files=no'],
    { cwd: root }
  )
  if (tracked)
    throw new Error('production migration requires a clean tracked tree')
  const upstream = checkedSpawn('git', ['rev-parse', '@{upstream}'], {
    cwd: root
  })
  if (upstream !== headSha) {
    throw new Error('production migration head is not the pushed upstream head')
  }
}

const runWranglerReadOnly = (root, args, accountId) => {
  const output = checkedSpawn(
    'pnpm',
    ['--dir', 'cloudflare', 'exec', 'wrangler', ...args],
    {
      cwd: root,
      env: { ...process.env, CLOUDFLARE_ACCOUNT_ID: accountId }
    }
  )
  return output
}

const runMigrationApply = async (root, manifest, configPath) => {
  const child = spawn(
    'pnpm',
    [
      '--dir',
      'cloudflare',
      'exec',
      'wrangler',
      'd1',
      'migrations',
      'apply',
      manifest.databaseName,
      '--remote',
      '--config',
      configPath
    ],
    {
      cwd: root,
      env: {
        ...process.env,
        CLOUDFLARE_ACCOUNT_ID: manifest.accountId
      },
      stdio: 'inherit'
    }
  )
  const exitCode = await new Promise((resolve, reject) => {
    child.once('error', reject)
    child.once('exit', code => resolve(code ?? 1))
  })
  if (exitCode !== 0) throw new Error('reviewed production migration failed')
}

const parseApplyArguments = args => {
  if (
    args.length !== 6 ||
    args[2] !== '--confirm' ||
    args[4] !== '--ci-run' ||
    !/^\d+$/.test(args[5])
  ) {
    throw new Error(
      'usage: run-cloudflare-production-migrations.mjs apply <phase> --confirm <digest> --ci-run <run-id>'
    )
  }
  return { phase: args[1], confirmation: args[3], ciRunId: args[5] }
}

const main = async () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  const args = process.argv.slice(2)
  if (args.length === 2 && args[0] === 'plan') {
    const manifest = await createProductionMigrationManifest(
      root,
      args[1],
      currentHead(root)
    )
    process.stdout.write(`${renderProductionMigrationPlan(manifest)}\n`)
    return
  }
  if (args[0] !== 'apply') {
    throw new Error(
      'usage: run-cloudflare-production-migrations.mjs <plan|apply> <reviewed phase>'
    )
  }

  const { phase, confirmation, ciRunId } = parseApplyArguments(args)
  const baseConfig = JSON.parse(
    await readFile(path.join(root, 'wrangler.jsonc'), 'utf8')
  )
  const targetErrors = productionTargetErrors(
    'wrangler.jsonc',
    baseConfig,
    process.env
  )
  if (targetErrors.length) throw new Error(targetErrors.join('\n'))
  const headSha = currentHead(root)
  const manifest = await createProductionMigrationManifest(root, phase, headSha)
  if (confirmation !== manifest.confirmation) {
    throw new Error('production migration confirmation does not match the plan')
  }
  requireCleanPushedHead(root, headSha)
  const ci = JSON.parse(
    checkedSpawn(
      'gh',
      [
        'run',
        'view',
        ciRunId,
        '--json',
        'headSha,status,conclusion,event,workflowName,url'
      ],
      { cwd: root }
    )
  )
  const ciErrors = exactHeadCIErrors(ci, headSha)
  if (ciErrors.length) throw new Error(ciErrors.join('\n'))

  productionMigrationPhaseStateRow(
    runWranglerReadOnly(
      root,
      productionMigrationStateInvocation(),
      manifest.accountId
    ),
    manifest
  )

  const workspace = await createProductionMigrationWorkspace(root, manifest)
  try {
    await runMigrationApply(root, manifest, workspace.configPath)
    const expectedAppliedAfter = [
      ...manifest.expectedAppliedBefore,
      ...manifest.files.map(file => file.name)
    ]
    productionMigrationStateRow(
      runWranglerReadOnly(
        root,
        productionMigrationStateInvocation(),
        manifest.accountId
      ),
      expectedAppliedAfter
    )
    if (phase === 'durable-runtime') {
      productionSchemaRow(
        runWranglerReadOnly(
          root,
          productionSchemaInvocation(),
          manifest.accountId
        )
      )
    }
  } finally {
    await workspace.dispose()
  }
  process.stdout.write(
    `Production migration phase ${phase} completed and verified at ${headSha}\n`
  )
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  await main()
}
