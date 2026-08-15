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

export const staffAccountWireErrors = (
  generatedSource,
  accountRPC,
  staffAccountWire,
  api,
  packageSource
) => {
  const errors = []
  const contracts = [
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
    ],
    [
      'GMStatsResponse',
      [
        field('TotalActiveUsers', 'uint64', 'total_active_users'),
        field('TotalSuspendedUsers', 'uint64', 'total_suspended_users'),
        field('TotalBannedUsers', 'uint64', 'total_banned_users'),
        field('TotalVIPUsers', 'uint64', 'total_vip_users'),
        field('TotalFlaggedUsers', 'uint64', 'total_flagged_users'),
        field('TotalToDeleteUsers', 'uint64', 'total_to_delete_users')
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

  const accountsRoute = section(
    accountRPC,
    'func (s *Server) GMListAccounts(',
    'func (s *Server) GMStats('
  )
  for (const token of [
    'results := make([]*proto.GMAccount, len(accounts))',
    'ipMap := make(map[proto.AccountID][]*proto.IPAddressHistory, len(accounts))',
    'actionMap := make(map[proto.AccountID][]*proto.AccountAction, len(accounts))',
    'res.AccountActions = actionMap[res.Account.ID]',
    'res.IpHistory = ipMap[res.Account.ID]'
  ]) {
    if (!accountsRoute.includes(token)) {
      errors.push(`source GMAccount boundary changed: ${token}`)
    }
  }

  const statsRoute = section(
    accountRPC,
    'func (s *Server) GMStats(',
    '// TODO: justify why we need this interface here'
  )
  for (const token of [
    'var statsResponse proto.GMStatsResponse',
    'statsResponse.TotalActiveUsers = stat.Count',
    'statsResponse.TotalSuspendedUsers = stat.Count',
    'statsResponse.TotalBannedUsers = stat.Count',
    'statsResponse.TotalVIPUsers = stat.Count',
    'statsResponse.TotalFlaggedUsers = stat.Count',
    'statsResponse.TotalToDeleteUsers = stat.Count',
    'case proto.AccountStatus_DELETED: // Do nothing',
    'return &statsResponse, nil'
  ]) {
    if (!statsRoute.includes(token)) {
      errors.push(`source GMStats boundary changed: ${token}`)
    }
  }

  const compactWire = staffAccountWire.replace(/\s+/g, ' ')
  for (const token of [
    'id: history.id ?? 0',
    "ipAddress: history.ipAddress ?? ''",
    'createdAt: history.createdAt ?? null',
    'histories.map(sourceIPAddressHistoryWire)',
    'histories == null ? null : sourceIPAddressHistoryListWire(histories)',
    'result.account == null ? null : sourceAccountWire(result.account)',
    'conquestsUnlocked: result.conquestsUnlocked ?? false',
    'sourceNullableAccountActionListWire(',
    'sourceNullableIPAddressHistoryListWire(result.ipHistory)',
    'accounts.map(sourceGMAccountWire)',
    'total_active_users: stats.total_active_users ?? 0',
    'total_suspended_users: stats.total_suspended_users ?? 0',
    'total_banned_users: stats.total_banned_users ?? 0',
    'total_vip_users: stats.total_vip_users ?? 0',
    'total_flagged_users: stats.total_flagged_users ?? 0',
    'total_to_delete_users: stats.total_to_delete_users ?? 0'
  ]) {
    if (!compactWire.includes(token)) {
      errors.push(`main Worker staff-account wire is missing: ${token}`)
    }
  }
  if (/\baccountID\s*:/.test(staffAccountWire)) {
    errors.push('staff-account wire leaks private IP-history accountID')
  }

  if (!api.includes("from './staff-account-wire'")) {
    errors.push('main Worker lost the shared staff-account wire import')
  }
  const workerStats = section(
    api,
    "case 'GMStats':",
    "case 'GMCreateAppDevKey':"
  )
  if (!workerStats.includes('sourceGMStatsWire(await staff.stats())')) {
    errors.push('main Worker GMStats route bypasses source normalization')
  }
  const workerAccounts = section(
    api,
    "case 'GMListAccounts':",
    "case 'GMListAccountSignals':"
  )
  for (const token of [
    'sourceGMAccountListWire(',
    'accountActions: actionsByUser.get(row.user_id)',
    'ipHistory: null'
  ]) {
    if (!workerAccounts.includes(token)) {
      errors.push(`main Worker GMAccount route changed: ${token}`)
    }
  }

  const scripts = JSON.parse(packageSource).scripts ?? {}
  if (
    scripts['check:cloudflare:staff-account-wire'] !==
    'node --test ./utils/check-cloudflare-staff-account-wire.test.mjs && node ./utils/check-cloudflare-staff-account-wire.mjs'
  ) {
    errors.push('package scripts lost the staff-account wire gate')
  }
  if (
    !String(scripts['build:cloudflare']).includes(
      'pnpm check:cloudflare:staff-account-wire'
    )
  ) {
    errors.push(
      'complete Cloudflare build bypasses the staff-account wire gate'
    )
  }
  return errors
}

const main = async () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  const files = [
    'api/proto/api.gen.go',
    'api/rpc/gamemaster.go',
    'cloudflare/src/staff-account-wire.ts',
    'cloudflare/src/api.ts',
    'package.json'
  ]
  const values = await Promise.all(
    files.map(file => readFile(path.join(root, file), 'utf8'))
  )
  const errors = staffAccountWireErrors(...values)
  if (errors.length) {
    console.error(errors.join('\n'))
    process.exitCode = 1
  } else {
    console.log(
      'GMAccount, IPAddressHistory, and GMStats fields, nulls, privacy, and list allocation preserve generated Go semantics without enabling IP collection'
    )
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  await main()
}
