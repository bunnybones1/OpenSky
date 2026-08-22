import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const releaseIdentifier = /^[a-z0-9._-]{1,128}$/

const configuredBrowserRelease = environment =>
  [environment.GITCOMMIT, environment.RELEASE_VERSION, 'cloudflare']
    .find(value => value && value !== 'undefined' && value !== 'null')
    .toLowerCase()

export const releaseGateErrors = (matchmakerConfig, environment = {}) => {
  const browserRelease = configuredBrowserRelease(environment)
  const expectedRelease = String(
    matchmakerConfig?.vars?.EXPECTED_RELEASE_VERSION ?? ''
  )
    .trim()
    .toLowerCase()
  const errors = []
  if (!releaseIdentifier.test(expectedRelease)) {
    errors.push(
      'matchmaker EXPECTED_RELEASE_VERSION must be a 1-128 character release identifier'
    )
  }
  if (!releaseIdentifier.test(browserRelease)) {
    errors.push(
      'browser GITCOMMIT/RELEASE_VERSION is not a valid release identifier'
    )
  }
  if (
    releaseIdentifier.test(expectedRelease) &&
    releaseIdentifier.test(browserRelease) &&
    expectedRelease !== browserRelease
  ) {
    errors.push(
      `browser release ${browserRelease} does not match matchmaker release ${expectedRelease}`
    )
  }
  return errors
}

export const assetCachePolicyErrors = (
  workerConfig,
  workerSource,
  cachePolicySource
) => {
  const errors = []
  if (workerConfig?.assets?.run_worker_first !== true) {
    errors.push(
      'static assets must run through the Worker release cache policy'
    )
  }
  if (
    !workerSource.includes(
      'applyAssetCachePolicy(request, await env.ASSETS.fetch(request))'
    )
  ) {
    errors.push('Worker asset responses bypass the release cache policy')
  }
  for (const token of [
    "startsWith('text/html')",
    "startsWith('/locales/')",
    "'no-store'",
    'FINGERPRINTED_ASSET',
    "'public, max-age=31536000, immutable'",
    "'Cloudflare-CDN-Cache-Control'"
  ]) {
    if (!cachePolicySource.includes(token)) {
      errors.push(`static asset release cache policy is missing: ${token}`)
    }
  }
  return errors
}

const main = async () => {
  const root = path.resolve(
    path.dirname(new URL(import.meta.url).pathname),
    '..'
  )
  const configPath = path.join(root, 'matchmaker-ts', 'wrangler.jsonc')
  const config = JSON.parse(await readFile(configPath, 'utf8'))
  const workerConfig = JSON.parse(
    await readFile(path.join(root, 'wrangler.jsonc'), 'utf8')
  )
  const [workerSource, cachePolicySource] = await Promise.all([
    readFile(path.join(root, 'cloudflare/src/index.ts'), 'utf8'),
    readFile(path.join(root, 'cloudflare/src/asset-cache.ts'), 'utf8')
  ])
  const errors = [
    ...releaseGateErrors(config, process.env),
    ...assetCachePolicyErrors(workerConfig, workerSource, cachePolicySource)
  ]
  if (errors.length) {
    for (const error of errors) process.stderr.write(`Release gate: ${error}\n`)
    process.exitCode = 1
    return
  }
  process.stdout.write(
    `Browser and matchmaker release agree on ${configuredBrowserRelease(process.env)}\n`
  )
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  await main()
}
