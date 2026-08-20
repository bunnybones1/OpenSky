import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { cloudflareBrandingGateErrors } from './check-cloudflare-branding-gate.mjs'

const currentInput = async () => {
  const [productBrand, gameHtml, gameLogic, tutorialTitle, hud, settings] =
    await Promise.all([
      readFile('game/src/productBrand.ts', 'utf8'),
      readFile('game/index.html', 'utf8'),
      readFile('game/src/gameLogic.ts', 'utf8'),
      readFile('game/src/scenes/ui/containers/tutorialTitle.ts', 'utf8'),
      readFile('game/src/scenes/ui/containers/hud.ts', 'utf8'),
      readFile('game/src/scenes/ui/containers/settings.ts', 'utf8')
    ])
  return { productBrand, gameHtml, gameLogic, tutorialTitle, hud, settings }
}

test('accepts the reviewed Cloud Weasel game runtime branding', async () => {
  assert.deepEqual(cloudflareBrandingGateErrors(await currentInput()), [])
})

test('rejects mutation of the shared product-name authority', async () => {
  const input = await currentInput()
  input.productBrand = input.productBrand.replace('Cloud Weasel', 'Other Name')
  assert.ok(
    cloudflareBrandingGateErrors(input).some(error =>
      error.includes('shared Cloud Weasel product authority')
    )
  )
})

test('rejects a missing helper on every original-game runtime surface', async () => {
  const mutations = [
    ['gameHtml', '<title>Cloud Weasel</title>', '<title>Other Name</title>'],
    [
      'gameLogic',
      "productDocumentTitle('Local Bot')",
      "'Other Name | Local Bot'"
    ],
    ['gameLogic', "productDocumentTitle('Sandbox')", "'Other Name | Sandbox'"],
    [
      'tutorialTitle',
      'productDocumentTitle(`${title} ${description}`)',
      '`${title} ${description}`'
    ],
    ['hud', 'productVersionLabel(env.GITCOMMIT)', "'Other Name vlocal'"],
    ['settings', 'productVersionLabel(env.GITCOMMIT)', "'Other Name vlocal'"]
  ]

  for (const [field, current, replacement] of mutations) {
    const input = await currentInput()
    input[field] = input[field].replace(current, replacement)
    assert.ok(
      cloudflareBrandingGateErrors(input).some(error =>
        error.includes('is not wired to Cloud Weasel product chrome')
      ),
      `${field} mutation should fail closed`
    )
  }
})

test('rejects legacy OpenSky titles and build labels', async () => {
  const mutations = [
    ['gameHtml', '<title>Cloud Weasel</title>', '<title>OpenSky</title>'],
    ['gameLogic', "productDocumentTitle('Local Bot')", "'OpenSky | Local Bot'"],
    [
      'tutorialTitle',
      'productDocumentTitle(`${title} ${description}`)',
      '`OpenSky | ${title} ${description}`'
    ],
    ['hud', 'productVersionLabel(env.GITCOMMIT)', "'OpenSky vlocal'"],
    ['settings', 'productVersionLabel(env.GITCOMMIT)', "'OpenSky vlocal'"]
  ]

  for (const [field, current, replacement] of mutations) {
    const input = await currentInput()
    input[field] = input[field].replace(current, replacement)
    assert.ok(
      cloudflareBrandingGateErrors(input).some(error =>
        error.includes('legacy OpenSky runtime branding')
      ),
      `${field} legacy mutation should fail closed`
    )
  }
})
