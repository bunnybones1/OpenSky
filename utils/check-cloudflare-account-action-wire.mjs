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

const enumNames = (source, name) => {
  const block = source.match(
    new RegExp(`type ${name} uint(?:16|32|64)?\\s+const \\(([\\s\\S]*?)\\n\\)`)
  )?.[1]
  return block
    ? [...block.matchAll(new RegExp(`^\\s*${name}_(\\w+)\\s+`, 'gm'))].map(
        match => match[1]
      )
    : []
}

const section = (source, start, end) => {
  const startIndex = source.indexOf(start)
  const endIndex = source.indexOf(end, startIndex + start.length)
  if (startIndex < 0) return ''
  return source.slice(
    startIndex,
    endIndex > startIndex ? endIndex : source.length
  )
}

export const accountActionWireErrors = (
  generatedSource,
  moderationRPC,
  accountRPC,
  accountActionWire,
  repository,
  api,
  packageSource
) => {
  const errors = []
  const expectedFields = [
    field('ID', 'uint64', 'id'),
    field('AccountID', 'AccountID', '-'),
    field('AccountAddress', 'Hash', 'accountAddress'),
    field('CreatedAt', '*time.Time', 'createdAt'),
    field('UpdatedAt', '*time.Time', 'updatedAt'),
    field('ExpiresAt', '*time.Time', 'expiresAt'),
    field('ActionType', 'ActionType', 'actionType'),
    field('IsActive', 'bool', 'isActive'),
    field('CreatedBy', '*AccountID', 'createdBy'),
    field('Cursor', 'string', '-')
  ]
  if (
    JSON.stringify(
      structFields(structBody(generatedSource, 'AccountAction'))
    ) !== JSON.stringify(expectedFields)
  ) {
    errors.push('source AccountAction JSON contract changed')
  }
  if (
    JSON.stringify(enumNames(generatedSource, 'ActionType')) !==
    JSON.stringify([
      'MOD_BAN',
      'MOD_SUSPENSION',
      'AUTO_BAN',
      'AUTO_SUSPENSION',
      'DELAYED_MOD_BAN',
      'DELAYED_MOD_SUSPENSION',
      'DELAYED_AUTO_BAN',
      'DELAYED_AUTO_SUSPENSION',
      'MOD_FLAG',
      'AUTO_FLAG',
      'MOD_VET'
    ])
  ) {
    errors.push('source ActionType enum changed')
  }

  const listRoute = section(
    moderationRPC,
    'func (s *Server) GMListAccountActions(',
    'func (s *Server) GMCreateAccountAction('
  )
  for (const token of [
    'results := []*proto.AccountAction{}',
    'return paginator.Page(), results, nil'
  ]) {
    if (!listRoute.includes(token)) {
      errors.push(`source account-action list response changed: ${token}`)
    }
  }
  const bannedRoute = section(
    moderationRPC,
    'func (s *Server) GMIsAccountBanned(',
    'func (s *Server) GMAccountSignalSummaries('
  )
  if (
    !bannedRoute.includes(
      'resp := make([]*proto.AccountAction, len(activeActions))'
    )
  ) {
    errors.push('source active account-action list construction changed')
  }
  const summariesRoute = section(
    moderationRPC,
    'func (s *Server) GMAccountSignalSummaries(',
    'func (s *Server) GMListAccountSignals('
  )
  for (const token of [
    'results := []*proto.AccountSignalSummary{}',
    'res.AccountActions = actionMap[res.AccountID]'
  ]) {
    if (!summariesRoute.includes(token)) {
      errors.push(`source signal-summary action boundary changed: ${token}`)
    }
  }
  const accountsRoute = section(
    accountRPC,
    'func (s *Server) GMListAccounts(',
    'func (s *Server) GMStats('
  )
  for (const token of [
    'results := make([]*proto.GMAccount, len(accounts))',
    'res.AccountActions = actionMap[res.Account.ID]'
  ]) {
    if (!accountsRoute.includes(token)) {
      errors.push(`source GMAccount action boundary changed: ${token}`)
    }
  }

  const compactWire = accountActionWire.replace(/\s+/g, ' ')
  for (const token of [
    'id: action.id ?? 0',
    "accountAddress: action.accountAddress ?? ''",
    'createdAt: action.createdAt ?? null',
    'updatedAt: action.updatedAt ?? null',
    'expiresAt: action.expiresAt ?? null',
    "actionType: action.actionType ?? ('MOD_BAN' as ActionType)",
    'isActive: action.isActive ?? false',
    'createdBy: action.createdBy ?? null',
    'actions.map(sourceAccountActionWire)',
    'actions == null ? null : sourceAccountActionListWire(actions)'
  ]) {
    if (!compactWire.includes(token)) {
      errors.push(`main Worker account-action wire is missing: ${token}`)
    }
  }
  for (const privateField of ['accountID', 'cursor']) {
    if (new RegExp(`\\b${privateField}\\s*:`).test(accountActionWire)) {
      errors.push(`account-action wire leaks private ${privateField}`)
    }
  }

  if (!repository.includes("from './account-action-wire'")) {
    errors.push('account-action repository lost the shared wire import')
  }
  for (const token of [
    'sourceAccountActionWire(accountActionInput(row))',
    'actions: sourceAccountActionListWire(selected.map(accountActionInput))',
    'current.push(accountAction(row))',
    'return accountAction(created)'
  ]) {
    if (!repository.includes(token)) {
      errors.push(`account-action repository bypasses normalization: ${token}`)
    }
  }

  if (!api.includes("from './account-action-wire'")) {
    errors.push('main Worker lost the shared account-action wire import')
  }
  for (const [start, end] of [
    ["case 'GMListAccounts':", "case 'GMListAccountSignals':"],
    ["case 'GMAccountSignalSummaries':", "case 'GMListMatches':"]
  ]) {
    if (
      !section(api, start, end).includes('sourceNullableAccountActionListWire(')
    ) {
      errors.push(`nested account-action list bypasses source nulls: ${start}`)
    }
  }
  for (const [start, end, token] of [
    [
      "case 'GMIsAccountBanned':",
      "case 'GMListAccountActions':",
      'accountActions: actions'
    ],
    [
      "case 'GMListAccountActions':",
      "case 'GMCreateAccountAction':",
      'accountActions: result.actions'
    ],
    [
      "case 'GMCreateAccountAction':",
      "case 'GetAccountStats':",
      'accountActions.create('
    ]
  ]) {
    if (!section(api, start, end).includes(token)) {
      errors.push(`main Worker account-action route changed: ${start}`)
    }
  }

  const scripts = JSON.parse(packageSource).scripts ?? {}
  if (
    scripts['check:cloudflare:account-action-wire'] !==
    'node --test ./utils/check-cloudflare-account-action-wire.test.mjs && node ./utils/check-cloudflare-account-action-wire.mjs'
  ) {
    errors.push('package scripts lost the account-action wire gate')
  }
  if (
    !String(scripts['build:cloudflare']).includes(
      'pnpm check:cloudflare:account-action-wire'
    )
  ) {
    errors.push(
      'complete Cloudflare build bypasses the account-action wire gate'
    )
  }
  return errors
}

const main = async () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  const files = [
    'api/proto/api.gen.go',
    'api/rpc/admin_ban_tools.go',
    'api/rpc/gamemaster.go',
    'cloudflare/src/account-action-wire.ts',
    'cloudflare/src/account-actions.ts',
    'cloudflare/src/api.ts',
    'package.json'
  ]
  const values = await Promise.all(
    files.map(file => readFile(path.join(root, file), 'utf8'))
  )
  const errors = accountActionWireErrors(...values)
  if (errors.length) {
    console.error(errors.join('\n'))
    process.exitCode = 1
  } else {
    console.log(
      'AccountAction enum, required pointers, private fields, and nested nil lists preserve generated Go semantics'
    )
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  await main()
}
