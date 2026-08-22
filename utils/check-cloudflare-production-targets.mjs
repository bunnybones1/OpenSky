import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import {
  productionScriptErrors,
  productionTargetErrors,
  REVIEWED_PRODUCTION_TARGETS
} from './run-cloudflare-production.mjs'

const main = async () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  const entries = await Promise.all(
    [...REVIEWED_PRODUCTION_TARGETS].map(async ([targetPath]) => [
      targetPath,
      JSON.parse(await readFile(path.join(root, targetPath), 'utf8'))
    ])
  )
  const [rootPackage, analyticsPackage] = await Promise.all([
    readFile(path.join(root, 'package.json'), 'utf8').then(JSON.parse),
    readFile(path.join(root, 'game-analytics/package.json'), 'utf8').then(
      JSON.parse
    )
  ])
  const errors = [
    ...entries.flatMap(([targetPath, config]) =>
      productionTargetErrors(targetPath, config)
    ),
    ...productionScriptErrors(rootPackage, analyticsPackage)
  ]
  if (errors.length) {
    process.stderr.write(`${errors.join('\n')}\n`)
    process.exitCode = 1
    return
  }
  process.stdout.write(
    'Cloudflare production account, Worker names, D1 target, and command paths are pinned\n'
  )
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  await main()
}
