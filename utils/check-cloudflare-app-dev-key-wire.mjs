import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const structBody = (source, name) =>
  source.match(new RegExp(`type ${name} struct \\{([\\s\\S]*?)\\n\\}`))?.[1]

const structFields = body =>
  body
    ? [...body.matchAll(/^\s*(\w+)\s+([^`]+)`[^`]*json:"([^"]+)"[^`]*`/gm)].map(
        match => ({
          name: match[1],
          type: match[2].trim(),
          json: match[3].split(',')[0],
          omitEmpty: match[3].split(',').includes('omitempty')
        })
      )
    : []

const field = (name, type, json, omitEmpty = false) => ({
  name,
  type,
  json,
  omitEmpty
})

const section = (source, start, end) => {
  const startIndex = source.indexOf(start)
  const endIndex = source.indexOf(end, startIndex + start.length)
  if (startIndex < 0) return ''
  return source.slice(
    startIndex,
    endIndex > startIndex ? endIndex : source.length
  )
}

export const appDevKeyWireErrors = (
  generatedSource,
  rpcSource,
  appDevKeyWire,
  repository,
  api,
  packageSource
) => {
  const errors = []
  const expectedFields = [
    field('ID', 'uint64', 'id'),
    field('AppKey', 'string', 'appKey'),
    field('Name', 'string', 'name'),
    field('Email', 'string', 'email'),
    field('Disabled', 'bool', 'disabled'),
    field('CreatedBy', '*AccountID', 'createdBy'),
    field('UpdatedBy', '*AccountID', 'updatedBy'),
    field('CreatedAt', '*time.Time', 'createdAt'),
    field('UpdatedAt', '*time.Time', 'updatedAt'),
    field('Cursor', 'string', '-')
  ]
  if (
    JSON.stringify(structFields(structBody(generatedSource, 'AppDevKey'))) !==
    JSON.stringify(expectedFields)
  ) {
    errors.push('source AppDevKey JSON contract changed')
  }

  const createRoute = section(
    rpcSource,
    'func (s *Server) GMCreateAppDevKey(',
    'func (s *Server) GMGetAppDevKeyToken('
  )
  for (const token of [
    'CreatedBy: &gmAccount.ID',
    'return appDevKey.AppDevKey, nil'
  ]) {
    if (!createRoute.includes(token)) {
      errors.push(`source app-dev-key create response changed: ${token}`)
    }
  }
  const tokenRoute = section(
    rpcSource,
    'func (s *Server) GMGetAppDevKeyToken(',
    'func (s *Server) GMListAppDevKeys('
  )
  if (!tokenRoute.includes('return appDevKey.AppDevKey, tokenString, nil')) {
    errors.push('source app-dev-key token response changed')
  }
  const listRoute = section(
    rpcSource,
    'func (s *Server) GMListAppDevKeys(',
    'func (s *Server) GMDisableAppDevKey('
  )
  for (const token of [
    'results := []*proto.AppDevKey{}',
    'return paginator.Page(), results, nil'
  ]) {
    if (!listRoute.includes(token)) {
      errors.push(`source app-dev-key list response changed: ${token}`)
    }
  }

  const compactWire = appDevKeyWire.replace(/\s+/g, ' ')
  for (const token of [
    'id: appDevKey.id ?? 0',
    "appKey: appDevKey.appKey ?? ''",
    "name: appDevKey.name ?? ''",
    "email: appDevKey.email ?? ''",
    'disabled: appDevKey.disabled ?? false',
    'createdBy: appDevKey.createdBy ?? null',
    'updatedBy: appDevKey.updatedBy ?? null',
    'createdAt: appDevKey.createdAt ?? null',
    'updatedAt: appDevKey.updatedAt ?? null',
    'appDevKeys.map(sourceAppDevKeyWire)'
  ]) {
    if (!compactWire.includes(token)) {
      errors.push(`main Worker app-dev-key wire is missing: ${token}`)
    }
  }
  if (/\bcursor\s*:/.test(appDevKeyWire)) {
    errors.push('app-dev-key wire leaks the private cursor')
  }

  if (!repository.includes("from './app-dev-key-wire'")) {
    errors.push('app-dev-key repository lost the shared wire import')
  }
  for (const token of [
    'sourceAppDevKeyWire(appDevKeyInput(row))',
    'return present(created)',
    'data: sourceAppDevKeyListWire(selected.map(appDevKeyInput))',
    'const appDevKey = present(row)'
  ]) {
    if (!repository.includes(token)) {
      errors.push(
        `app-dev-key repository bypasses source normalization: ${token}`
      )
    }
  }

  for (const [start, end, token] of [
    [
      "case 'GMCreateAppDevKey':",
      "case 'GMListAppDevKeys':",
      'appDevKeys.create('
    ],
    [
      "case 'GMListAppDevKeys':",
      "case 'GMDisableAppDevKey':",
      'appDevKeys.list('
    ],
    [
      "case 'GMGetAppDevKeyToken':",
      "case 'GMFindAccount':",
      'appDevKeys.token('
    ]
  ]) {
    if (!section(api, start, end).includes(token)) {
      errors.push(`main Worker app-dev-key route changed: ${start}`)
    }
  }

  const scripts = JSON.parse(packageSource).scripts ?? {}
  if (
    scripts['check:cloudflare:app-dev-key-wire'] !==
    'node --test ./utils/check-cloudflare-app-dev-key-wire.test.mjs && node ./utils/check-cloudflare-app-dev-key-wire.mjs'
  ) {
    errors.push('package scripts lost the app-dev-key wire gate')
  }
  if (
    !String(scripts['build:cloudflare']).includes(
      'pnpm check:cloudflare:app-dev-key-wire'
    )
  ) {
    errors.push('complete Cloudflare build bypasses the app-dev-key wire gate')
  }
  return errors
}

const main = async () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  const files = [
    'api/proto/api.gen.go',
    'api/rpc/app_dev_keys.go',
    'cloudflare/src/app-dev-key-wire.ts',
    'cloudflare/src/app-dev-keys.ts',
    'cloudflare/src/api.ts',
    'package.json'
  ]
  const values = await Promise.all(
    files.map(file => readFile(path.join(root, file), 'utf8'))
  )
  const errors = appDevKeyWireErrors(...values)
  if (errors.length) {
    console.error(errors.join('\n'))
    process.exitCode = 1
  } else {
    console.log(
      'AppDevKey required pointers, private cursor, list, routes, and token claims preserve generated Go semantics'
    )
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  await main()
}
