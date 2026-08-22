import assert from 'node:assert/strict'
import test from 'node:test'

import { systemPlayerGateErrors } from './check-cloudflare-system-player-gate.mjs'

const evidence = {
  migration: [
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
  ].join('\n'),
  matchMigration: [
    'CREATE TRIGGER multiplayer_matches_user_kind_insert_guard',
    "'readiness-drill-match-'",
    "IS NOT 'SYSTEM'",
    "IS NOT 'PLAYER'",
    'CREATE TRIGGER multiplayer_matches_participant_identity_update_guard'
  ].join('\n'),
  drill: [
    'system:conquest-readiness-drill:',
    'system:conquest-readiness-opponent:',
    "VALUES (?, ?, ?, ?, ?, 'SYSTEM')"
  ].join('\n'),
  player: [
    'SELECT display_name, user_kind FROM users WHERE id = ?',
    "user.user_kind === 'SYSTEM' ? 0 : 1"
  ].join('\n'),
  playerRpc: [
    'getAccountByReference(',
    'accountReferenceExists(',
    'accountNameExists(',
    "users.user_kind = 'PLAYER'",
    "users.user_kind = 'PLAYER'",
    "users.user_kind = 'PLAYER'",
    "users.user_kind = 'PLAYER'"
  ].join('\n'),
  competitive: [
    "users.user_kind = 'PLAYER'",
    'hasSystemParticipant(row)',
    "throw notFound('match is private')",
    'systemParticipant'
  ].join('\n'),
  replays: [
    'found.systemParticipant',
    'optionalRpcPrincipal(request, env)',
    'requireAdmin(principal.userId)',
    "throw notFound('match with this replay ID not found')"
  ].join('\n'),
  staff: "WHERE users.user_kind = 'PLAYER'",
  conquestV2Rewards: "users.user_kind = 'PLAYER'",
  leaderboardRewards: "users.user_kind = 'PLAYER'",
  referralRewards: "users.user_kind = 'PLAYER'",
  matchRepository: [
    'expectedUserKind: UserKind',
    'WHERE id = ? AND user_kind = ?',
    "users.user_kind = 'PLAYER'"
  ].join('\n'),
  matchBuilder: "'PLAYER'",
  readinessMatch: [
    "target.user_kind = 'SYSTEM'",
    "account.user_kind IS NOT 'SYSTEM'",
    "'SYSTEM'"
  ].join('\n'),
  matchService: "repository.userHasKind(identity.userId, 'PLAYER')"
}

test('accepts the complete operational system-player isolation boundary', () => {
  assert.deepEqual(systemPlayerGateErrors(evidence), [])
})

test('fails closed when any isolation layer disappears', () => {
  for (const source of Object.keys(evidence)) {
    assert.ok(
      systemPlayerGateErrors({ ...evidence, [source]: '' }).length > 0,
      `${source} removal must fail the system-player gate`
    )
  }
  assert.match(
    systemPlayerGateErrors({
      ...evidence,
      playerRpc: evidence.playerRpc.replace(/users\.user_kind = 'PLAYER'/, '')
    })[0],
    /reference, name, feed, and ownership/
  )
})
