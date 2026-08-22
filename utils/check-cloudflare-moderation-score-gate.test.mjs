import assert from 'node:assert/strict'
import test from 'node:test'

import { moderationScoreGateErrors } from './check-cloudflare-moderation-score-gate.mjs'

const validInput = () => ({
  sourceModel: [
    "VALUES ('user faked bot matches', 1.1)",
    "VALUES ('user_agent used by bots', 1.2)"
  ].join('\n'),
  sourceUserAgentModel: [
    'CREATE MATERIALIZED VIEW ua_scores',
    'HAVING COUNT(ua.account_address) >= 5'
  ].join('\n'),
  sourceBotMatch: [
    'req.Mode != nil && *req.Mode != proto.GameMode_TUTORIAL',
    'signals.USER_FAKED_BOT'
  ].join('\n'),
  cloudflareStaff: '0.0 AS score\nscore: 0',
  cloudflareBotMatch: [
    "request.mode !== 'TUTORIAL'",
    'identity bot matches currently support tutorial mode only'
  ].join('\n'),
  cloudflareMigrations: 'CREATE TABLE player_account_reports (id INTEGER);',
  policy: [
    'not a fraud probability',
    'user faked bot matches',
    'user_agent used by bots',
    'population-wide normalization',
    'remain exactly zero'
  ].join('\n')
})

test('accepts the reviewed neutral-score boundary', () => {
  assert.deepEqual(moderationScoreGateErrors(validInput()), [])
})

test('rejects a fabricated or accidentally non-neutral score', () => {
  const input = validInput()
  input.cloudflareStaff = '0.42 AS score\nscore: weightedSignal'
  assert.deepEqual(moderationScoreGateErrors(input), [
    'moderation summary no longer returns an explicit neutral score',
    'moderation signal details no longer return explicit neutral scores'
  ])
})

test('requires review when model storage is introduced', () => {
  const input = validInput()
  input.cloudflareMigrations = 'CREATE TABLE account_scores (score REAL);'
  assert.deepEqual(moderationScoreGateErrors(input), [
    'moderation model storage was added without updating its safety review'
  ])
})

test('detects source feature contract drift', () => {
  const input = validInput()
  input.sourceUserAgentModel = 'CREATE MATERIALIZED VIEW ua_scores'
  assert.deepEqual(moderationScoreGateErrors(input), [
    'source user-agent feature no longer matches the reviewed model'
  ])
})
