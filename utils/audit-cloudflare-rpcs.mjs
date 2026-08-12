import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

export const extractGoRpcMethods = source =>
  [...source.matchAll(/^func\s+\(\w+\s+\*Server\)\s+([A-Z]\w*)\s*\(/gm)].map(
    match => match[1]
  )

export const extractTsRpcCases = source =>
  [...source.matchAll(/\bcase\s+'([A-Z]\w*)'\s*:/g)].map(match => match[1])

export const auditRpcCoverage = (sourceMethods, portedMethods) => {
  const source = new Set(sourceMethods)
  const ported = new Set(portedMethods)
  const implemented = [...source].filter(method => ported.has(method)).sort()
  return {
    source: [...source].sort(),
    implemented,
    missing: [...source].filter(method => !ported.has(method)).sort(),
    adapters: [...ported].filter(method => !source.has(method)).sort()
  }
}

const CRITICAL_METHODS = [
  'AvailableXPBonuses',
  'ClaimQuestRewards',
  'Clock',
  'CheckDeck',
  'ConquestPoints',
  'ConquestStats',
  'ConquestStatus',
  'ConquestV2Progress',
  'CreateDeck',
  'DeleteDeck',
  'EnterConquest',
  'GetAccount',
  'GetAccountByUsername',
  'GetAccountStats',
  'GetCardLibrary',
  'GetCardsByDeckString',
  'GetCardsByID',
  'GetBatchItemSupply',
  'GetFeed',
  'GetEpicQuestChain',
  'GetGameModesStatus',
  'GetItemOwnershipByType',
  'GetItemSummary',
  'GetItemSuppliesByType',
  'GetMatch',
  'GetMatchLiveRecordsURI',
  'ListDecks',
  'ListLeaderboard',
  'ListMatches',
  'ListQuests',
  'HeroUnlockLevels',
  'Ping',
  'SearchCards',
  'SearchDecks',
  'SetInvitedBy',
  'ToggleDeckFavorite',
  'UpdateAccount',
  'UpdateDeck',
  'UserStorageFetch',
  'UserStorageSave',
  'Version'
]

// These are explicit Cloud Weasel product decisions, not an excuse to hide
// unknown source gaps. Anything missing from the TypeScript gateway and absent
// from these reviewed sets remains actionable and fails the audit unless it is
// added to the short approved-gap list below.
export const RETIRED_SOURCE_RPCS = new Set([
  'MigrateAccount',
  'MigrateFromBurner'
])

export const SUPERSEDED_SOURCE_RPCS = new Set([
  'InternalAppendMatchArchiveRecords',
  'InternalAppendMatchLiveRecords',
  'InternalConquestStatus',
  'InternalGetAccount',
  'InternalGetAccountStats',
  'InternalGetBotAccounts',
  'InternalGetPrivateSpectateCode',
  'InternalListUnlockedDeckStrings',
  'InternalMatchEnd',
  'InternalMatchStart',
  'PrepareOnChainInCurrencyTransaction',
  'PrepareOnChainInItemsTransaction',
  'PrepareOnChainTransaction',
  'PrepareTransferAssetsFromBurnerTransaction',
  'RequestAccountDeletion'
])

export const APPROVED_ACTIONABLE_SOURCE_RPCS = new Set([
  'IAPVerifyAppleProducts2',
  'IAPVerifyGoogleProducts2',
  'JoinEarlyAccessList',
  'VerifyAppleAppStorePayment'
])

export const partitionRpcGaps = methods => ({
  retired: methods.filter(method => RETIRED_SOURCE_RPCS.has(method)).sort(),
  superseded: methods
    .filter(method => SUPERSEDED_SOURCE_RPCS.has(method))
    .sort(),
  actionable: methods
    .filter(
      method =>
        !RETIRED_SOURCE_RPCS.has(method) &&
        !SUPERSEDED_SOURCE_RPCS.has(method)
    )
    .sort()
})

export const checkRpcCoverage = audit => {
  const errors = []
  if (audit.implemented.length < 149) {
    errors.push(`ported RPC count regressed to ${audit.implemented.length}`)
  }
  for (const method of CRITICAL_METHODS) {
    if (!audit.implemented.includes(method)) {
      errors.push(`critical RPC is missing: ${method}`)
    }
  }
  const gaps = partitionRpcGaps(audit.missing)
  for (const method of gaps.actionable) {
    if (!APPROVED_ACTIONABLE_SOURCE_RPCS.has(method)) {
      errors.push(`unreviewed actionable RPC gap: ${method}`)
    }
  }
  return errors
}

export const rpcPortCategory = method => {
  if (/^(GM|Admin)/.test(method)) return 'admin-operations'
  if (/^Internal/.test(method)) return 'internal-legacy'
  if (
    /(Payment|Stripe|IAP|OnChain|AppStore|GooglePlay|Samsung|TransferAssets)/.test(
      method
    )
  ) {
    return 'commerce-wallet'
  }
  if (
    /(Migrate|Burner|SignIn|AccountDeletion|EarlyAccess|Invites|Discord|Twitch)/.test(
      method
    )
  ) {
    return 'migration-identity'
  }
  if (/(Card|Deck|Search|HeroUnlock|GameModes|XPBonus|RewardsTime)/.test(method)) {
    return 'content-discovery'
  }
  return 'other-product'
}

export const summarizeRpcCategories = methods =>
  Object.fromEntries(
    [...methods.reduce((counts, method) => {
      const category = rpcPortCategory(method)
      counts.set(category, (counts.get(category) ?? 0) + 1)
      return counts
    }, new Map())].sort(([left], [right]) => left.localeCompare(right))
  )

const loadAudit = async root => {
  const rpcDirectory = path.join(root, 'api/rpc')
  const files = (await readdir(rpcDirectory))
    .filter(file => file.endsWith('.go') && !file.endsWith('_test.go'))
    .sort()
  const methods = []
  for (const file of files) {
    methods.push(
      ...extractGoRpcMethods(await readFile(path.join(rpcDirectory, file), 'utf8'))
    )
  }
  const gateway = await readFile(path.join(root, 'cloudflare/src/api.ts'), 'utf8')
  return auditRpcCoverage(methods, extractTsRpcCases(gateway))
}

const main = async () => {
  const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
  const audit = await loadAudit(root)
  const errors = checkRpcCoverage(audit)
  if (process.argv.includes('--json')) {
    process.stdout.write(
      `${JSON.stringify({ ...audit, gaps: partitionRpcGaps(audit.missing) }, null, 2)}\n`
    )
  } else {
    const gaps = partitionRpcGaps(audit.missing)
    const fulfilled =
      audit.implemented.length + gaps.superseded.length + gaps.retired.length
    process.stdout.write(
      [
        `Source RPCs: ${audit.source.length}`,
        `Ported source RPCs: ${audit.implemented.length}`,
        `Superseded source RPCs: ${gaps.superseded.length}`,
        `Retired source RPCs: ${gaps.retired.length}`,
        `Fulfilled/retired source contracts: ${fulfilled}`,
        `Actionable source RPC gaps: ${gaps.actionable.length}`,
        `Cloudflare-only adapters: ${audit.adapters.length}`,
        '',
        `Actionable: ${gaps.actionable.join(', ')}`,
        `Superseded: ${gaps.superseded.join(', ')}`,
        `Retired: ${gaps.retired.join(', ')}`,
        audit.adapters.length ? `Adapters: ${audit.adapters.join(', ')}` : ''
      ]
        .filter((line, index) => line || index < 8)
        .join('\n') + '\n'
    )
  }
  if (process.argv.includes('--check') && errors.length) {
    for (const error of errors) process.stderr.write(`RPC audit: ${error}\n`)
    process.exitCode = 1
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main()
}
