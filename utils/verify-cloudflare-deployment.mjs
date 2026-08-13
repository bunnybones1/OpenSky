import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const DEFAULT_BASE_URL = 'https://opensky-webapp.dysinski-tomasz.workers.dev'
const ENTRY_PATTERN = /<script[^>]+src="([^"]*\/assets\/index-[a-f0-9]{8}\.js)"/
const VERIFIED_LOCALES = ['en', 'es-ES', 'fr', 'pt-BR', 'zh', 'pig']
const MAX_VERIFICATION_ATTEMPTS = 12
const VERIFICATION_RETRY_DELAY_MS = 5_000

export const extractEntryPath = html => html.match(ENTRY_PATTERN)?.[1]

const hasDirective = (headers, name, directive) =>
  (headers[name] || '').toLowerCase().includes(directive)

export const deploymentVerificationErrors = ({
  localWebHtml,
  localGameHtml,
  remoteWeb,
  remoteGame,
  remoteWebAsset,
  remoteGameAsset,
  localLocales = {},
  remoteLocales = {}
}) => {
  const errors = []
  const localWebEntry = extractEntryPath(localWebHtml)
  const localGameEntry = extractEntryPath(localGameHtml)
  const remoteWebEntry = extractEntryPath(remoteWeb.body)
  const remoteGameEntry = extractEntryPath(remoteGame.body)

  for (const [name, entry] of [
    ['local web', localWebEntry],
    ['local game', localGameEntry],
    ['production web', remoteWebEntry],
    ['production game', remoteGameEntry]
  ]) {
    if (!entry) errors.push(`${name} HTML has no fingerprinted entry asset`)
  }

  if (localWebEntry && remoteWebEntry && localWebEntry !== remoteWebEntry) {
    errors.push(
      `production web entry ${remoteWebEntry} does not match tested ${localWebEntry}`
    )
  }
  if (localGameEntry && remoteGameEntry && localGameEntry !== remoteGameEntry) {
    errors.push(
      `production game entry ${remoteGameEntry} does not match tested ${localGameEntry}`
    )
  }

  for (const [name, response] of [
    ['production web HTML', remoteWeb],
    ['production game HTML', remoteGame]
  ]) {
    if (response.status !== 200) {
      errors.push(`${name} returned HTTP ${response.status}`)
    }
    if (!hasDirective(response.headers, 'cache-control', 'no-store')) {
      errors.push(`${name} is not browser no-store`)
    }
    if (
      !hasDirective(
        response.headers,
        'cloudflare-cdn-cache-control',
        'no-store'
      )
    ) {
      errors.push(`${name} is not Cloudflare edge no-store`)
    }
  }

  for (const locale of Object.keys(localLocales)) {
    const response = remoteLocales[locale]
    if (!response) {
      errors.push(`production ${locale} locale was not fetched`)
      continue
    }
    if (response.status !== 200) {
      errors.push(
        `production ${locale} locale returned HTTP ${response.status}`
      )
    }
    if (response.body !== localLocales[locale]) {
      errors.push(`production ${locale} locale does not match tested artifact`)
    }
    if (!hasDirective(response.headers, 'cache-control', 'no-store')) {
      errors.push(`production ${locale} locale is not browser no-store`)
    }
    if (
      !hasDirective(
        response.headers,
        'cloudflare-cdn-cache-control',
        'no-store'
      )
    ) {
      errors.push(`production ${locale} locale is not Cloudflare edge no-store`)
    }
  }

  for (const [name, response] of [
    ['production web entry', remoteWebAsset],
    ['production game entry', remoteGameAsset]
  ]) {
    if (response.status !== 200) {
      errors.push(`${name} returned HTTP ${response.status}`)
    }
    if (
      !hasDirective(response.headers, 'cache-control', 'max-age=31536000') ||
      !hasDirective(response.headers, 'cache-control', 'immutable')
    ) {
      errors.push(`${name} is not browser immutable for one year`)
    }
    if (
      !hasDirective(
        response.headers,
        'cloudflare-cdn-cache-control',
        'max-age=31536000'
      ) ||
      !hasDirective(
        response.headers,
        'cloudflare-cdn-cache-control',
        'immutable'
      )
    ) {
      errors.push(`${name} is not Cloudflare edge immutable for one year`)
    }
  }

  return { errors, localWebEntry, localGameEntry }
}

export const verifyDeploymentWithRetries = async ({
  verify,
  maxAttempts = MAX_VERIFICATION_ATTEMPTS,
  retryDelayMs = VERIFICATION_RETRY_DELAY_MS,
  sleep = delay => new Promise(resolve => setTimeout(resolve, delay))
}) => {
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1) {
    throw new Error('maxAttempts must be a positive integer')
  }

  let result
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    result = await verify(attempt)
    if (result.errors.length === 0) return { result, attempts: attempt }
    if (attempt < maxAttempts) await sleep(retryDelayMs)
  }

  return { result, attempts: maxAttempts }
}

const fetchSnapshot = async (url, includeBody = false) => {
  const response = await fetch(url, {
    headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' }
  })
  return {
    status: response.status,
    headers: Object.fromEntries(
      [...response.headers.entries()].map(([name, value]) => [
        name.toLowerCase(),
        value
      ])
    ),
    body: includeBody ? await response.text() : ''
  }
}

const main = async () => {
  const root = path.resolve(
    path.dirname(new URL(import.meta.url).pathname),
    '..'
  )
  const baseUrl = (process.argv[2] || DEFAULT_BASE_URL).replace(/\/$/, '')
  const [localWebHtml, localGameHtml, localLocaleEntries] = await Promise.all([
    readFile(path.join(root, 'webapp/dist/index.html'), 'utf8'),
    readFile(path.join(root, 'webapp/dist/game/cloudflare/index.html'), 'utf8'),
    Promise.all(
      VERIFIED_LOCALES.map(async locale => [
        locale,
        await readFile(
          path.join(
            root,
            'webapp/dist/locales/cloudflare',
            locale,
            'webapp.json'
          ),
          'utf8'
        )
      ])
    )
  ])
  const localLocales = Object.fromEntries(localLocaleEntries)
  const localWebEntry = extractEntryPath(localWebHtml)
  const localGameEntry = extractEntryPath(localGameHtml)
  if (!localWebEntry || !localGameEntry) {
    throw new Error(
      'local Cloudflare artifact has no fingerprinted entry asset'
    )
  }

  const verification = await verifyDeploymentWithRetries({
    verify: async attempt => {
      const releaseProbe = `verify=${Date.now()}-${attempt}`
      const [
        remoteWeb,
        remoteGame,
        remoteWebAsset,
        remoteGameAsset,
        remoteLocaleEntries
      ] = await Promise.all([
        fetchSnapshot(`${baseUrl}/?${releaseProbe}`, true),
        fetchSnapshot(
          `${baseUrl}/game/cloudflare/?mode=LOCAL_BOT&skipAuth&${releaseProbe}`,
          true
        ),
        fetchSnapshot(new URL(localWebEntry, baseUrl).href),
        fetchSnapshot(new URL(localGameEntry, baseUrl).href),
        Promise.all(
          VERIFIED_LOCALES.map(async locale => [
            locale,
            await fetchSnapshot(
              `${baseUrl}/locales/cloudflare/${locale}/webapp.json?${releaseProbe}`,
              true
            )
          ])
        )
      ])

      return deploymentVerificationErrors({
        localWebHtml,
        localGameHtml,
        remoteWeb,
        remoteGame,
        remoteWebAsset,
        remoteGameAsset,
        localLocales,
        remoteLocales: Object.fromEntries(remoteLocaleEntries)
      })
    }
  })
  const { result } = verification
  if (result.errors.length) {
    for (const error of result.errors) {
      process.stderr.write(`Deployment verification: ${error}\n`)
    }
    process.exitCode = 1
    return
  }

  process.stdout.write(
    `Verified ${baseUrl}: web ${result.localWebEntry}, ` +
      `game ${result.localGameEntry}, ${VERIFIED_LOCALES.length} exact locales, ` +
      `release-safe cache policy after ${verification.attempts} attempt(s)\n`
  )
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  await main()
}
