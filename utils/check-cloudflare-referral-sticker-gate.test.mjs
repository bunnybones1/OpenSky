import assert from 'node:assert/strict'
import test from 'node:test'

import { referralStickerGateErrors } from './check-cloudflare-referral-sticker-gate.mjs'

const validEvidence = () => ({
  activationMigration: [
    'referral_sticker_active_schedule_entries',
    'activated_by_user_id <> created_by_user_id',
    'referral sticker schedule activation is invalid',
    'active referral sticker schedule receipt required'
  ].join('\n'),
  operationsMigration: [
    'CREATE TABLE staff_referral_sticker_schedule_permissions',
    "permission IN ('PROPOSE', 'ACTIVATE')",
    'CREATE TABLE staff_referral_sticker_schedule_operations',
    'CREATE UNIQUE INDEX staff_referral_sticker_schedule_operations_once_idx',
    'CREATE TRIGGER staff_referral_sticker_schedule_operation_apply_guard',
    "schedule.status = 'ACTIVE'",
    'schedule.created_by_user_id <> NEW.actor_user_id',
    'CREATE TABLE staff_referral_sticker_schedule_audit',
    'staff referral sticker schedule audit rows are immutable'
  ].join('\n'),
  operations: [
    "ReferralStickerScheduleOperation = 'PROPOSE' | 'ACTIVATE'",
    'scheduleVersion !== replacesVersion + 1',
    'proposal must target current season',
    'activation must target current season',
    'before.createdByUserId === actorUserId',
    'JSON.stringify(before.entries) !== JSON.stringify(entries)',
    'INSERT INTO content_stickers',
    "'x-cloud-weasel-operation-key'"
  ].join('\n'),
  content: 'FROM referral_sticker_active_schedule_entries WHERE season = ?',
  staff: [
    'requireReferralStickerScheduleWrite(',
    'staff_referral_sticker_schedule_permissions'
  ].join('\n'),
  api: [
    "case 'GMListReferralStickerSchedules'",
    "case 'GMProposeReferralStickerSchedule'",
    "case 'GMActivateReferralStickerSchedule'"
  ].join('\n')
})

test('accepts the reviewed referral sticker operations boundary', () => {
  assert.deepEqual(referralStickerGateErrors(validEvidence()), [])
})

test('fails closed when any referral sticker evidence source disappears', () => {
  const evidence = validEvidence()
  for (const source of Object.keys(evidence)) {
    assert.ok(
      referralStickerGateErrors({ ...evidence, [source]: '' }).length > 0,
      `${source} removal must fail the gate`
    )
  }
})

test('fails closed when active-only visibility or independent approval disappears', () => {
  const evidence = validEvidence()
  assert.ok(
    referralStickerGateErrors({ ...evidence, content: '' }).some(error =>
      error.includes('active_schedule_entries')
    )
  )
  assert.ok(
    referralStickerGateErrors({
      ...evidence,
      operationsMigration: evidence.operationsMigration.replace(
        'schedule.created_by_user_id <> NEW.actor_user_id',
        ''
      )
    }).some(error => error.includes('created_by_user_id'))
  )
})
