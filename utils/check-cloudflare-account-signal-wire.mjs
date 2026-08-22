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

export const accountSignalWireErrors = (
  generatedSource,
  moderationRPC,
  accountRPC,
  accountSignalWire,
  staff,
  api,
  packageSource
) => {
  const errors = []
  const contracts = [
    [
      'AccountSignal',
      [
        field('ID', 'uint64', 'id'),
        field('AccountID', 'AccountID', '-'),
        field('SignalType', 'string', 'signalType'),
        field('SignalStatus', 'SignalStatus', 'signalStatus'),
        field('CreatedAt', '*time.Time', 'createdAt'),
        field('UpdatedAt', '*time.Time', 'updatedAt'),
        field('Payload', '[]byte', '-'),
        field('SignalData', 'interface{}', 'signalData'),
        field('Score', 'float32', 'score'),
        field('MLScore', 'float64', '-'),
        field('Cursor', 'string', '-')
      ]
    ],
    [
      'AccountSignalSummary',
      [
        field('AccountID', 'AccountID', '-'),
        field('AccountAddress', 'Hash', 'accountAddress'),
        field('Score', 'float64', 'score'),
        field('UpdatedAt', '*time.Time', 'updatedAt'),
        field('Account', '*Account', 'account'),
        field('AccountActions', '[]*AccountAction', 'accountActions'),
        field('Cursor', 'string', '-')
      ]
    ],
    [
      'IPAddressHistory',
      [
        field('ID', 'uint64', 'id'),
        field('AccountID', 'AccountID', '-'),
        field('IPAddress', 'pgtype.Inet', 'ipAddress'),
        field('CreatedAt', '*time.Time', 'createdAt')
      ]
    ],
    [
      'GMAccount',
      [
        field('Account', '*Account', 'account'),
        field('ConquestsUnlocked', 'bool', 'conquestsUnlocked'),
        field('AccountActions', '[]*AccountAction', 'accountActions'),
        field('IpHistory', '[]*IPAddressHistory', 'ipHistory')
      ]
    ]
  ]
  for (const [name, expected] of contracts) {
    if (
      JSON.stringify(structFields(structBody(generatedSource, name))) !==
      JSON.stringify(expected)
    ) {
      errors.push(`source ${name} JSON contract changed`)
    }
  }
  if (
    JSON.stringify(enumNames(generatedSource, 'SignalStatus')) !==
    JSON.stringify(['PENDING', 'ACTED_UPON', 'NOT_ACTIONABLE'])
  ) {
    errors.push('source SignalStatus enum changed')
  }

  const listRoute = section(
    moderationRPC,
    'func (s *Server) GMListAccountSignals(',
    'func (s *Server) GMSetAccountSignalStatus('
  )
  for (const token of [
    'results := []*data.AccountSignal{}',
    'signals := make([]*proto.AccountSignal, len(results))',
    'err := r.Present()',
    'signals[i] = r.AccountSignal'
  ]) {
    if (!listRoute.includes(token)) {
      errors.push(`source account-signal list response changed: ${token}`)
    }
  }
  const summariesRoute = section(
    moderationRPC,
    'func (s *Server) GMAccountSignalSummaries(',
    'func (s *Server) GMListAccountSignals('
  )
  for (const token of [
    'results := []*proto.AccountSignalSummary{}',
    'res.Account = accountMap[res.AccountID]',
    'res.AccountActions = actionMap[res.AccountID]'
  ]) {
    if (!summariesRoute.includes(token)) {
      errors.push(`source account-signal summary boundary changed: ${token}`)
    }
  }
  const accountsRoute = section(
    accountRPC,
    'func (s *Server) GMListAccounts(',
    'func (s *Server) GMStats('
  )
  for (const token of [
    'results := make([]*proto.GMAccount, len(accounts))',
    'res.IpHistory = ipMap[res.Account.ID]'
  ]) {
    if (!accountsRoute.includes(token)) {
      errors.push(`source GMAccount IP-history boundary changed: ${token}`)
    }
  }

  const compactWire = accountSignalWire.replace(/\s+/g, ' ')
  for (const token of [
    'id: signal.id ?? 0',
    "signalType: signal.signalType ?? ''",
    "signalStatus: signal.signalStatus ?? ('PENDING' as SignalStatus)",
    'createdAt: signal.createdAt ?? null',
    'updatedAt: signal.updatedAt ?? null',
    'signalData: signal.signalData ?? null',
    'score: goFloat32(signal.score ?? 0)',
    'signals.map(sourceAccountSignalWire)',
    "accountAddress: summary.accountAddress ?? ''",
    'score: summary.score ?? 0',
    'updatedAt: summary.updatedAt ?? null',
    'summary.account == null ? null : sourceAccountWire(summary.account)',
    'sourceNullableAccountActionListWire(',
    'summaries.map(sourceAccountSignalSummaryWire)'
  ]) {
    if (!compactWire.includes(token)) {
      errors.push(`main Worker account-signal wire is missing: ${token}`)
    }
  }
  for (const privateField of ['accountID', 'payload', 'mlScore', 'cursor']) {
    if (new RegExp(`\\b${privateField}\\s*:`).test(accountSignalWire)) {
      errors.push(`account-signal wire leaks private ${privateField}`)
    }
  }

  if (!staff.includes("from './account-signal-wire'")) {
    errors.push('staff repository lost the shared account-signal wire import')
  }
  if (!listRoute || !staff.includes('return sourceAccountSignalListWire(')) {
    errors.push('staff account-signal list bypasses source normalization')
  }

  if (!api.includes("from './account-signal-wire'")) {
    errors.push('main Worker lost the shared account-signal wire import')
  }
  const workerAccounts = section(
    api,
    "case 'GMListAccounts':",
    "case 'GMListAccountSignals':"
  )
  if (!workerAccounts.includes('ipHistory: null')) {
    errors.push('main Worker invents a nonnil GMAccount IP-history list')
  }
  const workerSummaries = section(
    api,
    "case 'GMAccountSignalSummaries':",
    "case 'GMListMatches':"
  )
  for (const token of [
    'sourceAccountSignalSummaryListWire(',
    'accountActions: actionsByUser.get(row.user_id)'
  ]) {
    if (!workerSummaries.includes(token)) {
      errors.push(`main Worker signal-summary route changed: ${token}`)
    }
  }

  const scripts = JSON.parse(packageSource).scripts ?? {}
  if (
    scripts['check:cloudflare:account-signal-wire'] !==
    'node --test ./utils/check-cloudflare-account-signal-wire.test.mjs && node ./utils/check-cloudflare-account-signal-wire.mjs'
  ) {
    errors.push('package scripts lost the account-signal wire gate')
  }
  if (
    !String(scripts['build:cloudflare']).includes(
      'pnpm check:cloudflare:account-signal-wire'
    )
  ) {
    errors.push(
      'complete Cloudflare build bypasses the account-signal wire gate'
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
    'cloudflare/src/account-signal-wire.ts',
    'cloudflare/src/staff.ts',
    'cloudflare/src/api.ts',
    'package.json'
  ]
  const values = await Promise.all(
    files.map(file => readFile(path.join(root, file), 'utf8'))
  )
  const errors = accountSignalWireErrors(...values)
  if (errors.length) {
    console.error(errors.join('\n'))
    process.exitCode = 1
  } else {
    console.log(
      'AccountSignal fields, enum, float32, privacy, nested nulls, and GMAccount IP-history nil preserve generated Go semantics'
    )
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  await main()
}
