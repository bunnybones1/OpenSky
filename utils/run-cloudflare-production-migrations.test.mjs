import assert from 'node:assert/strict'
import { mkdtemp, readFile, readdir, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import {
  createProductionMigrationManifest,
  createProductionMigrationWorkspace,
  CUTOVER_DISABLED_GAME_MODES,
  exactHeadCIErrors,
  PRODUCTION_MIGRATION_PHASES,
  PRODUCTION_MIGRATION_STATE_QUERY,
  productionMigrationPhaseStateRow,
  productionMigrationStateInvocation,
  productionMigrationStateRow,
  renderProductionMigrationPlan,
  reviewedMigrationInventoryErrors
} from './run-cloudflare-production-migrations.mjs'
import {
  REVIEWED_AUTH_DB_ID,
  REVIEWED_CLOUDFLARE_ACCOUNT_ID
} from './run-cloudflare-production.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const headSha = 'a'.repeat(40)

const stateOutput = ({ applied, deckGuards = 0, ...overrides }) =>
  JSON.stringify([
    {
      results: [
        {
          applied_migrations: applied.join('|'),
          enabled_allocation_modes: 0,
          inflight_matches: 0,
          authoritative_deck_schema_guards: deckGuards,
          ...overrides
        }
      ],
      success: true,
      meta: { changed_db: false, changes: 0 }
    }
  ])

test('reviewed phases exactly cover the migration tail after 0114', async () => {
  const migrationFiles = (
    await readdir(path.join(root, 'cloudflare/migrations'))
  )
    .filter(file => /^\d{4}_.+\.sql$/.test(file))
    .sort()
  assert.deepEqual(reviewedMigrationInventoryErrors(migrationFiles), [])
  const first = migrationFiles.indexOf('0115_authoritative_match_decks.sql')
  assert.equal(
    migrationFiles[first - 1],
    '0114_match_participant_classification.sql'
  )
  assert.deepEqual(
    migrationFiles.slice(first),
    Object.values(PRODUCTION_MIGRATION_PHASES).flat()
  )
  assert.ok(
    reviewedMigrationInventoryErrors(
      migrationFiles.filter(
        file => file !== '0120_grandweaver_task_attempts.sql'
      )
    ).length > 0
  )
})

test('manifests pin exact files, receipts, target, head, and confirmation', async () => {
  const first = await createProductionMigrationManifest(
    root,
    'authoritative-decks',
    headSha
  )
  const second = await createProductionMigrationManifest(
    root,
    'durable-runtime',
    headSha
  )

  assert.deepEqual(
    first.files.map(file => file.name),
    ['0115_authoritative_match_decks.sql']
  )
  assert.equal(
    first.expectedAppliedBefore.at(-1),
    '0114_match_participant_classification.sql'
  )
  assert.equal(
    second.expectedAppliedBefore.at(-1),
    '0115_authoritative_match_decks.sql'
  )
  assert.deepEqual(
    second.files.map(file => file.name),
    PRODUCTION_MIGRATION_PHASES['durable-runtime']
  )
  assert.equal(second.files.length, 13)
  assert.equal(first.accountId, REVIEWED_CLOUDFLARE_ACCOUNT_ID)
  assert.equal(first.databaseId, REVIEWED_AUTH_DB_ID)
  assert.match(first.confirmation, /^[0-9a-f]{64}$/)
  assert.notEqual(
    first.confirmation,
    (
      await createProductionMigrationManifest(
        root,
        'authoritative-decks',
        'b'.repeat(40)
      )
    ).confirmation
  )
  await assert.rejects(
    createProductionMigrationManifest(root, 'all-pending', headSha),
    /unreviewed/
  )
  await assert.rejects(
    createProductionMigrationManifest(root, 'authoritative-decks', 'HEAD'),
    /head SHA/
  )
})

test('migration state preflight is fixed, read-only, and cutover complete', () => {
  assert.match(PRODUCTION_MIGRATION_STATE_QUERY, /^SELECT\b/)
  assert.doesNotMatch(
    PRODUCTION_MIGRATION_STATE_QUERY,
    /\b(?:INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|REPLACE)\b/i
  )
  for (const mode of CUTOVER_DISABLED_GAME_MODES) {
    assert.ok(PRODUCTION_MIGRATION_STATE_QUERY.includes(`'${mode}'`))
  }
  assert.ok(PRODUCTION_MIGRATION_STATE_QUERY.includes('d1_migrations'))
  assert.ok(PRODUCTION_MIGRATION_STATE_QUERY.includes('creating'))
  assert.ok(PRODUCTION_MIGRATION_STATE_QUERY.includes('active'))
  assert.deepEqual(productionMigrationStateInvocation().slice(0, 6), [
    'd1',
    'execute',
    'opensky-auth',
    '--remote',
    '--config',
    '../wrangler.jsonc'
  ])
  assert.ok(productionMigrationStateInvocation().includes('--json'))
})

test('migration state accepts only the exact read-only phase boundary', async () => {
  const first = await createProductionMigrationManifest(
    root,
    'authoritative-decks',
    headSha
  )
  assert.equal(
    productionMigrationStateRow(
      stateOutput({ applied: first.expectedAppliedBefore }),
      first.expectedAppliedBefore
    ).inflight_matches,
    0
  )
  const appliedAfter = [
    ...first.expectedAppliedBefore,
    ...first.files.map(file => file.name)
  ]
  assert.equal(
    productionMigrationStateRow(
      stateOutput({ applied: appliedAfter, deckGuards: 4 }),
      appliedAfter
    ).authoritative_deck_schema_guards,
    4
  )

  for (const output of [
    stateOutput({ applied: [...first.expectedAppliedBefore, 'lookalike.sql'] }),
    stateOutput({
      applied: first.expectedAppliedBefore,
      enabled_allocation_modes: 1
    }),
    stateOutput({ applied: first.expectedAppliedBefore, inflight_matches: 1 }),
    stateOutput({ applied: appliedAfter, deckGuards: 3 }),
    JSON.stringify([
      {
        results: [{ applied_migrations: '' }],
        success: true,
        meta: { changed_db: true, changes: 0 }
      }
    ]),
    JSON.stringify([
      {
        results: [{ applied_migrations: '' }],
        success: true,
        meta: { changed_db: false, changes: 1 }
      }
    ]),
    JSON.stringify([
      {
        results: [{ applied_migrations: '' }, { applied_migrations: '' }],
        success: true,
        meta: { changed_db: false, changes: 0 }
      }
    ]),
    'not-json'
  ]) {
    assert.throws(
      () => productionMigrationStateRow(output, first.expectedAppliedBefore),
      /preflight|receipt|cutover|authoritative-deck/
    )
  }
})

test('migration preflight resumes only an exact canonical phase prefix', async () => {
  const manifest = await createProductionMigrationManifest(
    root,
    'durable-runtime',
    headSha
  )
  const selected = manifest.files.map(file => file.name)
  const partial = [...manifest.expectedAppliedBefore, ...selected.slice(0, 4)]
  assert.equal(
    productionMigrationPhaseStateRow(
      stateOutput({ applied: partial, deckGuards: 4 }),
      manifest
    ).appliedInPhase,
    4
  )
  const complete = [...manifest.expectedAppliedBefore, ...selected]
  assert.equal(
    productionMigrationPhaseStateRow(
      stateOutput({ applied: complete, deckGuards: 4 }),
      manifest
    ).appliedInPhase,
    selected.length
  )
  for (const applied of [
    [...manifest.expectedAppliedBefore, selected[1]],
    [...manifest.expectedAppliedBefore, selected[0], selected[2]],
    [...partial, 'lookalike.sql']
  ]) {
    assert.throws(
      () =>
        productionMigrationPhaseStateRow(
          stateOutput({ applied, deckGuards: 4 }),
          manifest
        ),
      /canonical phase prefix/
    )
  }
})

test('exact-head CI accepts only the reviewed successful PR workflow', () => {
  const complete = {
    headSha,
    status: 'completed',
    conclusion: 'success',
    event: 'pull_request',
    workflowName: 'Cloudflare release contract'
  }
  assert.deepEqual(exactHeadCIErrors(complete, headSha), [])
  for (const changed of [
    { ...complete, headSha: 'b'.repeat(40) },
    { ...complete, status: 'in_progress' },
    { ...complete, conclusion: 'failure' },
    { ...complete, event: 'push' },
    { ...complete, workflowName: 'lookalike' }
  ]) {
    assert.ok(exactHeadCIErrors(changed, headSha).length > 0)
  }
})

test('temporary workspace exposes only the confirmed phase to Wrangler', async t => {
  const temporaryRoot = await mkdtemp(path.join(tmpdir(), 'cloud-weasel-test-'))
  t.after(() => rm(temporaryRoot, { recursive: true, force: true }))
  const manifest = await createProductionMigrationManifest(
    root,
    'durable-runtime',
    headSha
  )
  const workspace = await createProductionMigrationWorkspace(
    root,
    manifest,
    temporaryRoot
  )
  assert.deepEqual((await readdir(workspace.directory)).sort(), [
    'migrations',
    'wrangler.jsonc'
  ])
  assert.deepEqual(
    (await readdir(path.join(workspace.directory, 'migrations'))).sort(),
    [...PRODUCTION_MIGRATION_PHASES['durable-runtime']]
  )
  const config = JSON.parse(await readFile(workspace.configPath, 'utf8'))
  assert.deepEqual(config.d1_databases, [
    {
      binding: 'AUTH_DB',
      database_name: 'opensky-auth',
      database_id: REVIEWED_AUTH_DB_ID,
      migrations_dir: './migrations'
    }
  ])
  assert.equal(config.account_id, REVIEWED_CLOUDFLARE_ACCOUNT_ID)
  assert.equal(config.services, undefined)
  assert.equal(config.workflows, undefined)
  assert.equal(config.queues, undefined)
  await workspace.dispose()
  await assert.rejects(stat(workspace.directory), /ENOENT/)
})

test('temporary workspace is removed when a planned file changes', async t => {
  const temporaryRoot = await mkdtemp(path.join(tmpdir(), 'cloud-weasel-test-'))
  t.after(() => rm(temporaryRoot, { recursive: true, force: true }))
  const manifest = await createProductionMigrationManifest(
    root,
    'authoritative-decks',
    headSha
  )
  manifest.files[0].sha256 = '0'.repeat(64)
  const before = await readdir(temporaryRoot)
  await assert.rejects(
    createProductionMigrationWorkspace(root, manifest, temporaryRoot),
    /changed after plan/
  )
  assert.deepEqual(await readdir(temporaryRoot), before)
})

test('plan output is non-mutating and requires its exact digest to apply', async () => {
  const manifest = await createProductionMigrationManifest(
    root,
    'authoritative-decks',
    headSha
  )
  const output = renderProductionMigrationPlan(manifest)
  assert.match(output, /^PLAN ONLY — no Cloudflare command was executed\./)
  assert.ok(output.includes(manifest.confirmation))
  assert.ok(
    output.includes(
      `apply authoritative-decks --confirm ${manifest.confirmation} --ci-run <run-id>`
    )
  )
})

test('apply path preserves ordered fail-closed phase boundaries', async () => {
  const source = await readFile(
    new URL('./run-cloudflare-production-migrations.mjs', import.meta.url),
    'utf8'
  )
  const main = source.slice(source.indexOf('const main = async () =>'))
  const ordered = [
    'productionTargetErrors(',
    'if (confirmation !== manifest.confirmation)',
    'requireCleanPushedHead(root, headSha)',
    'exactHeadCIErrors(ci, headSha)',
    'productionMigrationPhaseStateRow(',
    'createProductionMigrationWorkspace(root, manifest)',
    'await runMigrationApply(root, manifest, workspace.configPath)',
    'productionMigrationStateRow(',
    'productionSchemaRow('
  ]
  let cursor = -1
  for (const token of ordered) {
    const index = main.indexOf(token, cursor + 1)
    assert.ok(index > cursor, `migration runner is missing ordered ${token}`)
    cursor = index
  }
  assert.equal(
    main.match(/await runMigrationApply\(/g)?.length,
    1,
    'migration runner must have exactly one reviewed apply boundary'
  )
  assert.doesNotMatch(source, /run-cloudflare-production\.mjs migrate/)
})
