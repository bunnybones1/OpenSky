import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const requireTokens = (errors, label, source, tokens) => {
  for (const token of tokens) {
    if (!source.includes(token)) errors.push(`${label} is missing: ${token}`)
  }
}

const occurrences = (source, token) => source.split(token).length - 1

/**
 * Keeps fully bootstrapped operational match principals out of player-facing
 * discovery and unrelated reward tracks without weakening their authoritative
 * Conquest settlement path.
 */
export const systemPlayerGateErrors = evidence => {
  const errors = []
  requireTokens(errors, 'system-player migration', evidence.migration ?? '', [
    'ALTER TABLE users ADD COLUMN user_kind',
    "CHECK (user_kind IN ('PLAYER', 'SYSTEM'))",
    'CREATE TRIGGER users_kind_insert_guard',
    'CREATE TRIGGER users_kind_update_guard',
    'CREATE TRIGGER player_account_settings_system_insert_guard',
    'CREATE TRIGGER player_account_settings_system_update_guard',
    'CREATE TRIGGER player_invites_system_insert_guard',
    'CREATE TRIGGER conquest_v2_reward_entries_insert_guard',
    'CREATE TRIGGER conquest_v2_reward_cycles_snapshot_guard',
    'CREATE TRIGGER leaderboard_reward_entries_insert_guard',
    'CREATE TRIGGER leaderboard_reward_cycles_snapshot_guard',
    "account.user_kind = 'PLAYER'"
  ])
  requireTokens(
    errors,
    'match participant classification migration',
    evidence.matchMigration ?? '',
    [
      'CREATE TRIGGER multiplayer_matches_user_kind_insert_guard',
      "'readiness-drill-match-'",
      "IS NOT 'SYSTEM'",
      "IS NOT 'PLAYER'",
      'CREATE TRIGGER multiplayer_matches_participant_identity_update_guard'
    ]
  )
  requireTokens(errors, 'Conquest drill provisioning', evidence.drill ?? '', [
    'system:conquest-readiness-drill:',
    'system:conquest-readiness-opponent:',
    "VALUES (?, ?, ?, ?, ?, 'SYSTEM')"
  ])
  requireTokens(errors, 'player bootstrap', evidence.player ?? '', [
    'SELECT display_name, user_kind FROM users WHERE id = ?',
    "user.user_kind === 'SYSTEM' ? 0 : 1"
  ])
  requireTokens(errors, 'player RPC visibility', evidence.playerRpc ?? '', [
    'getAccountByReference(',
    'accountReferenceExists(',
    'accountNameExists('
  ])
  if (occurrences(evidence.playerRpc ?? '', "user_kind = 'PLAYER'") < 4) {
    errors.push(
      'player RPC visibility must protect reference, name, feed, and ownership boundaries'
    )
  }
  requireTokens(errors, 'competitive visibility', evidence.competitive ?? '', [
    "users.user_kind = 'PLAYER'",
    'hasSystemParticipant(row)',
    "throw notFound('match is private')",
    'systemParticipant'
  ])
  requireTokens(errors, 'system replay visibility', evidence.replays ?? '', [
    'found.systemParticipant',
    'optionalRpcPrincipal(request, env)',
    'requireAdmin(principal.userId)',
    "throw notFound('match with this replay ID not found')"
  ])
  requireTokens(errors, 'staff player aggregate', evidence.staff ?? '', [
    "WHERE users.user_kind = 'PLAYER'"
  ])
  for (const [label, source] of [
    ['Conquest V2 reward snapshot', evidence.conquestV2Rewards ?? ''],
    ['leaderboard reward snapshot', evidence.leaderboardRewards ?? ''],
    ['referral reward projection', evidence.referralRewards ?? '']
  ]) {
    requireTokens(errors, label, source, ["users.user_kind = 'PLAYER'"])
  }
  requireTokens(
    errors,
    'match-service player repository',
    evidence.matchRepository ?? '',
    [
      'expectedUserKind: UserKind',
      'WHERE id = ? AND user_kind = ?',
      "users.user_kind = 'PLAYER'"
    ]
  )
  requireTokens(errors, 'ordinary match builder', evidence.matchBuilder ?? '', [
    "'PLAYER'"
  ])
  requireTokens(
    errors,
    'readiness match builder',
    evidence.readinessMatch ?? '',
    [
      "target.user_kind = 'SYSTEM'",
      "account.user_kind IS NOT 'SYSTEM'",
      "'SYSTEM'"
    ]
  )
  requireTokens(
    errors,
    'ordinary match dispatch',
    evidence.matchService ?? '',
    ["repository.userHasKind(identity.userId, 'PLAYER')"]
  )
  return errors
}

const main = async () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  const [
    migration,
    matchMigration,
    drill,
    player,
    playerRpc,
    competitive,
    replays,
    staff,
    conquestV2Rewards,
    leaderboardRewards,
    referralRewards,
    matchRepository,
    matchBuilder,
    readinessMatch,
    matchService
  ] = await Promise.all([
    readFile(
      path.join(
        root,
        'cloudflare/migrations/0113_system_player_visibility.sql'
      ),
      'utf8'
    ),
    readFile(
      path.join(
        root,
        'cloudflare/migrations/0114_match_participant_classification.sql'
      ),
      'utf8'
    ),
    readFile(path.join(root, 'cloudflare/src/conquest-drill.ts'), 'utf8'),
    readFile(path.join(root, 'cloudflare/src/player.ts'), 'utf8'),
    readFile(path.join(root, 'cloudflare/src/player-rpc.ts'), 'utf8'),
    readFile(path.join(root, 'cloudflare/src/competitive.ts'), 'utf8'),
    readFile(path.join(root, 'cloudflare/src/replays.ts'), 'utf8'),
    readFile(path.join(root, 'cloudflare/src/staff.ts'), 'utf8'),
    readFile(
      path.join(root, 'cloudflare/src/conquest-v2-reward-worker.ts'),
      'utf8'
    ),
    readFile(
      path.join(root, 'cloudflare/src/leaderboard-reward-worker.ts'),
      'utf8'
    ),
    readFile(
      path.join(root, 'cloudflare/src/referral-sticker-rewards.ts'),
      'utf8'
    ),
    readFile(
      path.join(root, 'match-service-cloudflare/src/repository.ts'),
      'utf8'
    ),
    readFile(
      path.join(root, 'match-service-cloudflare/src/match-builder.ts'),
      'utf8'
    ),
    readFile(
      path.join(root, 'match-service-cloudflare/src/readiness-match.ts'),
      'utf8'
    ),
    readFile(path.join(root, 'match-service-cloudflare/src/worker.ts'), 'utf8')
  ])
  const errors = systemPlayerGateErrors({
    migration,
    matchMigration,
    drill,
    player,
    playerRpc,
    competitive,
    replays,
    staff,
    conquestV2Rewards,
    leaderboardRewards,
    referralRewards,
    matchRepository,
    matchBuilder,
    readinessMatch,
    matchService
  })
  if (errors.length) {
    for (const error of errors)
      process.stderr.write(`System-player gate: ${error}\n`)
    process.exitCode = 1
    return
  }
  process.stdout.write(
    'Operational system players are isolated from player discovery and unrelated rewards\n'
  )
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  await main()
}
