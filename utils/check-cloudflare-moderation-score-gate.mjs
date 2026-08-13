import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const REQUIRED_POLICY_TEXT = [
  'not a fraud probability',
  'user faked bot matches',
  'user_agent used by bots',
  'population-wide normalization',
  'remain exactly zero'
]

export const moderationScoreGateErrors = ({
  sourceModel,
  sourceUserAgentModel,
  sourceBotMatch,
  cloudflareStaff,
  cloudflareBotMatch,
  cloudflareMigrations,
  policy
}) => {
  const errors = []
  for (const feature of [
    'user faked bot matches',
    'user_agent used by bots'
  ]) {
    if (!sourceModel.includes(`VALUES ('${feature}',`)) {
      errors.push(`latest source moderation model is missing ${feature}`)
    }
  }
  if (
    !sourceUserAgentModel.includes('CREATE MATERIALIZED VIEW ua_scores') ||
    !sourceUserAgentModel.includes('HAVING COUNT(ua.account_address) >= 5')
  ) {
    errors.push('source user-agent feature no longer matches the reviewed model')
  }
  if (
    !sourceBotMatch.includes('req.Mode != nil && *req.Mode != proto.GameMode_TUTORIAL') ||
    !sourceBotMatch.includes('signals.USER_FAKED_BOT')
  ) {
    errors.push('source bot-tampering feature no longer matches the reviewed model')
  }
  if (
    !cloudflareBotMatch.includes("request.mode !== 'TUTORIAL'") ||
    !cloudflareBotMatch.includes(
      'identity bot matches currently support tutorial mode only'
    )
  ) {
    errors.push('Cloudflare bot-match boundary no longer fails closed')
  }
  if (/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:ua_history|ua_scores|account_scores)\b/i.test(cloudflareMigrations)) {
    errors.push('moderation model storage was added without updating its safety review')
  }
  if (!cloudflareStaff.includes('0.0 AS score')) {
    errors.push('moderation summary no longer returns an explicit neutral score')
  }
  if (!/score:\s*0\b/.test(cloudflareStaff)) {
    errors.push('moderation signal details no longer return explicit neutral scores')
  }
  for (const required of REQUIRED_POLICY_TEXT) {
    if (!policy.includes(required)) {
      errors.push(`moderation score policy is missing: ${required}`)
    }
  }
  return errors
}

const main = async () => {
  const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
  const migrationsDirectory = path.join(root, 'cloudflare', 'migrations')
  const migrationFiles = (await readdir(migrationsDirectory))
    .filter(file => file.endsWith('.sql'))
    .sort()
  const [
    sourceModel,
    sourceUserAgentModel,
    sourceBotMatch,
    cloudflareStaff,
    cloudflareBotMatch,
    policy,
    ...migrations
  ] = await Promise.all([
    readFile(
      path.join(
        root,
        'api/data/schema/migrations/30000000000115_update_scores.sql'
      ),
      'utf8'
    ),
    readFile(
      path.join(
        root,
        'api/data/schema/migrations/30000000000114_add_ua_score.sql'
      ),
      'utf8'
    ),
    readFile(path.join(root, 'api/rpc/matches.go'), 'utf8'),
    readFile(path.join(root, 'cloudflare/src/staff.ts'), 'utf8'),
    readFile(path.join(root, 'cloudflare/src/bot-match.ts'), 'utf8'),
    readFile(path.join(root, 'docs/CLOUDFLARE_MODERATION_SCORE.md'), 'utf8'),
    ...migrationFiles.map(file =>
      readFile(path.join(migrationsDirectory, file), 'utf8')
    )
  ])
  const errors = moderationScoreGateErrors({
    sourceModel,
    sourceUserAgentModel,
    sourceBotMatch,
    cloudflareStaff,
    cloudflareBotMatch,
    cloudflareMigrations: migrations.join('\n'),
    policy
  })
  if (errors.length) {
    for (const error of errors) {
      process.stderr.write(`Moderation score gate: ${error}\n`)
    }
    process.exitCode = 1
    return
  }
  process.stdout.write('Moderation scores remain explicitly neutral\n')
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main()
}
