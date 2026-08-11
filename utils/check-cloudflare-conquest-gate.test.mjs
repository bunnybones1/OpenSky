import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { conquestGateErrors } from './check-cloudflare-conquest-gate.mjs'

test('production keeps both Conquest queues behind the settlement gate', async () => {
  const config = JSON.parse(
    await readFile('match-service-cloudflare/wrangler.jsonc', 'utf8')
  )
  assert.deepEqual(conquestGateErrors(config), [])
})

test('fails closed if either Conquest mode is configured', () => {
  for (const mode of ['CONQUEST_CONSTRUCTED', 'CONQUEST_DISCOVERY']) {
    assert.match(
      conquestGateErrors({ vars: { ENABLED_GAME_MODES: `PRACTICE_BOT,${mode}` } })[0],
      new RegExp(mode)
    )
  }
})
