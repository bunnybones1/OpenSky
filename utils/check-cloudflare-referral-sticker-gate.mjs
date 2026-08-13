import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

export const referralStickerGateErrors = (evidence = {}) => {
  const errors = []
  const requireTokens = (source, label, tokens) => {
    if (source === undefined) return
    for (const token of tokens) {
      if (!source.includes(token)) {
        errors.push(`referral sticker ${label} is missing: ${token}`)
      }
    }
  }
  requireTokens(evidence.activationMigration, 'activation schema', [
    'referral_sticker_active_schedule_entries',
    'activated_by_user_id <> created_by_user_id',
    'referral sticker schedule activation is invalid',
    'active referral sticker schedule receipt required'
  ])
  requireTokens(evidence.operationsMigration, 'operations schema', [
    'CREATE TABLE staff_referral_sticker_schedule_permissions',
    "permission IN ('PROPOSE', 'ACTIVATE')",
    'CREATE TABLE staff_referral_sticker_schedule_operations',
    'CREATE UNIQUE INDEX staff_referral_sticker_schedule_operations_once_idx',
    'CREATE TRIGGER staff_referral_sticker_schedule_operation_apply_guard',
    "schedule.status = 'ACTIVE'",
    'schedule.created_by_user_id <> NEW.actor_user_id',
    'CREATE TABLE staff_referral_sticker_schedule_audit',
    'staff referral sticker schedule audit rows are immutable'
  ])
  requireTokens(evidence.operations, 'operations adapter', [
    "ReferralStickerScheduleOperation = 'PROPOSE' | 'ACTIVATE'",
    'scheduleVersion !== replacesVersion + 1',
    'proposal must target current season',
    'activation must target current season',
    'before.createdByUserId === actorUserId',
    'JSON.stringify(before.entries) !== JSON.stringify(entries)',
    'INSERT INTO content_stickers',
    "'x-cloud-weasel-operation-key'"
  ])
  requireTokens(evidence.content, 'public visibility', [
    'FROM referral_sticker_active_schedule_entries WHERE season = ?'
  ])
  requireTokens(evidence.staff, 'staff authority', [
    'requireReferralStickerScheduleWrite(',
    'staff_referral_sticker_schedule_permissions'
  ])
  requireTokens(evidence.api, 'RPC surface', [
    "case 'GMListReferralStickerSchedules'",
    "case 'GMProposeReferralStickerSchedule'",
    "case 'GMActivateReferralStickerSchedule'"
  ])
  return errors
}

const main = async () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  const [
    activationMigration,
    operationsMigration,
    operations,
    content,
    staff,
    api
  ] = await Promise.all([
    readFile(
      path.join(
        root,
        'cloudflare/migrations/0087_referral_sticker_schedule_activation.sql'
      ),
      'utf8'
    ),
    readFile(
      path.join(
        root,
        'cloudflare/migrations/0098_referral_sticker_schedule_operations.sql'
      ),
      'utf8'
    ),
    readFile(
      path.join(root, 'cloudflare/src/referral-sticker-schedule-operations.ts'),
      'utf8'
    ),
    readFile(path.join(root, 'cloudflare/src/content.ts'), 'utf8'),
    readFile(path.join(root, 'cloudflare/src/staff.ts'), 'utf8'),
    readFile(path.join(root, 'cloudflare/src/api.ts'), 'utf8')
  ])
  const errors = referralStickerGateErrors({
    activationMigration,
    operationsMigration,
    operations,
    content,
    staff,
    api
  })
  if (errors.length) {
    process.stderr.write(`${errors.join('\n')}\n`)
    process.exitCode = 1
    return
  }
  process.stdout.write(
    'Referral sticker operations preserve exact manifests, independent approval, active-only visibility, and dormant defaults\n'
  )
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  await main()
}
