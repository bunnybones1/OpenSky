import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const legacyRuntimeBrandPatterns = [
  /<title>OpenSky<\/title>/,
  /OpenSky \|/,
  /OpenSky v/
]

export const cloudflareBrandingGateErrors = sources => {
  const errors = []

  for (const token of [
    "export const PRODUCT_NAME = 'Cloud Weasel'",
    'export const productDocumentTitle =',
    'export const productVersionLabel ='
  ]) {
    if (!sources.productBrand.includes(token)) {
      errors.push(`shared Cloud Weasel product authority is missing: ${token}`)
    }
  }

  const requiredSurfaceTokens = [
    ['game HTML title', sources.gameHtml, '<title>Cloud Weasel</title>'],
    [
      'local game titles',
      sources.gameLogic,
      "productDocumentTitle('Local Bot')"
    ],
    [
      'sandbox game title',
      sources.gameLogic,
      "productDocumentTitle('Sandbox')"
    ],
    [
      'tutorial game title',
      sources.tutorialTitle,
      'productDocumentTitle(`${title} ${description}`)'
    ],
    ['HUD build label', sources.hud, 'productVersionLabel(env.GITCOMMIT)'],
    [
      'settings build label',
      sources.settings,
      'productVersionLabel(env.GITCOMMIT)'
    ]
  ]

  for (const [surface, source, token] of requiredSurfaceTokens) {
    if (!source.includes(token)) {
      errors.push(`${surface} is not wired to Cloud Weasel product chrome`)
    }
  }

  for (const [surface, source] of [
    ['game HTML', sources.gameHtml],
    ['game logic', sources.gameLogic],
    ['tutorial title', sources.tutorialTitle],
    ['HUD', sources.hud],
    ['settings', sources.settings]
  ]) {
    if (legacyRuntimeBrandPatterns.some(pattern => pattern.test(source))) {
      errors.push(`${surface} reintroduces legacy OpenSky runtime branding`)
    }
  }

  return errors
}

const main = async () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  const read = relativePath => readFile(path.join(root, relativePath), 'utf8')
  const [productBrand, gameHtml, gameLogic, tutorialTitle, hud, settings] =
    await Promise.all([
      read('game/src/productBrand.ts'),
      read('game/index.html'),
      read('game/src/gameLogic.ts'),
      read('game/src/scenes/ui/containers/tutorialTitle.ts'),
      read('game/src/scenes/ui/containers/hud.ts'),
      read('game/src/scenes/ui/containers/settings.ts')
    ])
  const errors = cloudflareBrandingGateErrors({
    productBrand,
    gameHtml,
    gameLogic,
    tutorialTitle,
    hud,
    settings
  })

  if (errors.length) {
    for (const error of errors) {
      process.stderr.write(`Cloudflare branding gate: ${error}\n`)
    }
    process.exitCode = 1
    return
  }

  process.stdout.write(
    'Original game runtime chrome is consistently branded Cloud Weasel\n'
  )
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  await main()
}
