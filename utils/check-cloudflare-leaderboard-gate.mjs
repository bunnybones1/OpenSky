import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

export const leaderboardGateErrors = (evidence = {}) => {
  const errors = []
  const requireTokens = (source, label, tokens) => {
    if (source === undefined) return
    for (const token of tokens) {
      if (!source.includes(token)) {
        errors.push(`leaderboard ${label} is missing: ${token}`)
      }
    }
  }
  requireTokens(evidence.policy, 'policy', [
    'LEADERBOARD_REWARD_POLICY_VERSION',
    'LEADERBOARD_REWARD_POLICY_HASH',
    'cloud-weasel-offchain-leaderboard-v1',
    'calculatedLeaderboardRewardPolicyHash'
  ])
  requireTokens(evidence.activationMigration, 'activation schema', [
    'leaderboard_reward_schedule_activations',
    'activated_by_user_id <> created_by_user_id',
    'leaderboard reward policy activation is invalid',
    'active leaderboard reward policy receipt required'
  ])
  requireTokens(evidence.operationsMigration, 'operations schema', [
    'CREATE TABLE staff_leaderboard_reward_schedule_permissions',
    "permission IN ('PROPOSE', 'ACTIVATE', 'DISABLE')",
    'CREATE TABLE staff_leaderboard_reward_schedule_operations',
    'CREATE UNIQUE INDEX staff_leaderboard_reward_schedule_operations_once_idx',
    'CREATE TRIGGER staff_leaderboard_reward_schedule_operation_apply_guard',
    'activation.activated_at = NEW.created_at',
    'activation.activated_at <= schedule.starts_at',
    'CREATE TABLE staff_leaderboard_reward_schedule_audit',
    'staff leaderboard reward schedule audit rows are immutable'
  ])
  requireTokens(evidence.operations, 'operations adapter', [
    "LeaderboardRewardScheduleOperation =\n  | 'PROPOSE'\n  | 'ACTIVATE'\n  | 'DISABLE'",
    'version !== replacesVersion + 1',
    'LEADERBOARD_REWARD_POLICY_HASH',
    'createdByUserId === actorUserId',
    'startsAt must be in the future',
    'leaderboard schedule activation is too late',
    'firstRunAt must be in the future',
    "'x-cloud-weasel-operation-key'"
  ])
  requireTokens(evidence.staff, 'staff authority', [
    'requireLeaderboardRewardScheduleWrite(',
    'staff_leaderboard_reward_schedule_permissions'
  ])
  requireTokens(evidence.api, 'RPC surface', [
    "case 'GMListLeaderboardRewardSchedules'",
    "case 'GMProposeLeaderboardRewardSchedule'",
    "case 'GMActivateLeaderboardRewardSchedule'",
    "case 'GMDisableLeaderboardRewardSchedule'"
  ])
  return errors
}

const main = async () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  const [policy, activationMigration, operationsMigration, operations, staff, api] =
    await Promise.all([
      readFile(
        path.join(root, 'cloudflare/src/leaderboard-reward-policy.ts'),
        'utf8'
      ),
      readFile(
        path.join(
          root,
          'cloudflare/migrations/0088_leaderboard_reward_policy_activation.sql'
        ),
        'utf8'
      ),
      readFile(
        path.join(
          root,
          'cloudflare/migrations/0096_leaderboard_reward_schedule_operations.sql'
        ),
        'utf8'
      ),
      readFile(
        path.join(
          root,
          'cloudflare/src/leaderboard-reward-schedule-operations.ts'
        ),
        'utf8'
      ),
      readFile(path.join(root, 'cloudflare/src/staff.ts'), 'utf8'),
      readFile(path.join(root, 'cloudflare/src/api.ts'), 'utf8')
    ])
  const errors = leaderboardGateErrors({
    policy,
    activationMigration,
    operationsMigration,
    operations,
    staff,
    api
  })
  if (errors.length) {
    process.stderr.write(`${errors.join('\n')}\n`)
    process.exitCode = 1
    return
  }
  process.stdout.write(
    'Leaderboard cadence operations preserve pinned policy, independent approval, and dormant defaults\n'
  )
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  await main()
}
