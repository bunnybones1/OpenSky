import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { devHostGateErrors } from './check-cloudflare-dev-host-gate.mjs'

const currentInput = async () => ({
  devModeSource: await readFile('lib/shared/src/devMode.ts', 'utf8'),
  footerSource: await readFile(
    'webapp/src/shared/components/Footer/Footer.tsx',
    'utf8'
  )
})

test('accepts the reviewed production development-host boundary', async () => {
  assert.deepEqual(devHostGateErrors(await currentInput()), [])
})

test('rejects substring matching that treats workers.dev as development', async () => {
  const input = await currentInput()
  input.devModeSource = input.devModeSource.replace(
    'isDevelopmentHostname(runtimeHostname)',
    "location.hostname.includes('dev')"
  )
  const errors = devHostGateErrors(input)
  assert.ok(errors.some(error => error.includes('workers.dev')))
  assert.ok(errors.some(error => error.includes('boundary is missing')))
})

test('rejects developer navigation without the shared gate', async () => {
  const input = await currentInput()
  input.footerSource = input.footerSource.replace('{isDevMode() && (', '{true && (')
  assert.deepEqual(devHostGateErrors(input), [
    'secret debug navigation is no longer development-gated'
  ])
})
