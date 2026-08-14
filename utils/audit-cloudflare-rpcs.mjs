import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

export const extractGoRpcMethods = source =>
  [...source.matchAll(/^func\s+\(\w+\s+\*Server\)\s+([A-Z]\w*)\s*\(/gm)].map(
    match => match[1]
  )

export const extractTsRpcCases = source =>
  [...source.matchAll(/\bcase\s+'([A-Z]\w*)'\s*:/g)].map(match => match[1])

const rpcCaseBodies = source => {
  const matches = [...source.matchAll(/\bcase\s+'([A-Z]\w*)'\s*:/g)]
  const bodies = new Map()
  let groupedMethods = []
  for (let index = 0; index < matches.length; index++) {
    const match = matches[index]
    groupedMethods.push(match[1])
    const bodyStart = match.index + match[0].length
    const bodyEnd = matches[index + 1]?.index ?? source.length
    const body = source.slice(bodyStart, bodyEnd)
    if (!body.trim()) continue
    for (const method of groupedMethods) bodies.set(method, body)
    groupedMethods = []
  }
  return bodies
}

// A switch label is not an implementation. These are the only reviewed
// terminal compatibility cases in the TypeScript gateway; adding another
// unconditional unimplemented/deprecated case must fail the release gate.
export const REVIEWED_TS_RPC_TOMBSTONES = {
  SignIn: {
    disposition: 'source-faithful',
    evidence: [
      'throw internal(',
      'deprecated method, use GetAuthToken + RegisterAccount'
    ]
  },
  IAPVerifyGoogleProducts2: {
    disposition: 'superseded',
    evidence: [
      'throw unimplemented(',
      'VerifyGooglePlayPayment with the signed-in identity'
    ]
  },
  IAPVerifyAppleProducts2: {
    disposition: 'superseded',
    evidence: [
      'throw unimplemented(',
      'VerifyAppleAppStorePayment with the signed-in identity'
    ]
  },
  JoinEarlyAccessList: {
    disposition: 'retired',
    evidence: ['throw unimplemented(', 'Cloud Weasel early access is retired']
  },
  AdminListAccounts: {
    disposition: 'source-faithful',
    evidence: ['await staff.requireAdmin(', 'throw unimplemented()']
  },
  AdminSearchAccounts: {
    disposition: 'source-faithful',
    evidence: ['await staff.requireAdmin(', 'throw unimplemented()']
  },
  GetMatchLiveRecordsURI: {
    disposition: 'source-faithful',
    evidence: [
      'await requestBody<{ matchID?: number }>(request)',
      'throw unimplemented()'
    ]
  }
}

export const tsRpcTombstoneAuditErrors = source => {
  const errors = []
  const bodies = rpcCaseBodies(source)
  const reviewed = new Set(Object.keys(REVIEWED_TS_RPC_TOMBSTONES))

  for (const [method, review] of Object.entries(REVIEWED_TS_RPC_TOMBSTONES)) {
    const body = bodies.get(method)
    if (!body) {
      errors.push(`reviewed TypeScript RPC tombstone disappeared: ${method}`)
      continue
    }
    for (const token of review.evidence) {
      if (!body.includes(token)) {
        errors.push(
          `${method} lost ${review.disposition} tombstone evidence: ${token}`
        )
      }
    }
  }

  for (const [method, body] of bodies) {
    const terminalCompatibilityThrow =
      /\bthrow\s+unimplemented\s*\(/.test(body) ||
      /\bthrow\s+internal\s*\(\s*['"`]deprecated method/.test(body)
    if (terminalCompatibilityThrow && !reviewed.has(method)) {
      errors.push(`unreviewed TypeScript RPC tombstone: ${method}`)
    }
  }
  return errors
}

export const auditRpcCoverage = (
  sourceMethods,
  portedMethods,
  tombstones = REVIEWED_TS_RPC_TOMBSTONES
) => {
  const source = new Set(sourceMethods)
  const ported = new Set(portedMethods)
  const tombstoneMethods = new Set(Object.keys(tombstones))
  const sourceTombstones = Object.entries(tombstones)
    .filter(
      ([method, review]) =>
        source.has(method) &&
        ported.has(method) &&
        review.disposition === 'source-faithful'
    )
    .map(([method]) => method)
    .sort()
  const supersededTombstones = Object.entries(tombstones)
    .filter(
      ([method, review]) =>
        source.has(method) &&
        ported.has(method) &&
        review.disposition === 'superseded'
    )
    .map(([method]) => method)
    .sort()
  const retiredTombstones = Object.entries(tombstones)
    .filter(
      ([method, review]) =>
        source.has(method) &&
        ported.has(method) &&
        review.disposition === 'retired'
    )
    .map(([method]) => method)
    .sort()
  const implemented = [...source]
    .filter(method => ported.has(method) && !tombstoneMethods.has(method))
    .sort()
  return {
    source: [...source].sort(),
    implemented,
    sourceTombstones,
    supersededTombstones,
    retiredTombstones,
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

export const APPROVED_ACTIONABLE_SOURCE_RPCS = new Set([])

export const REVIEWED_CLOUDFLARE_RPC_ADAPTERS = new Set([
  'GMActivateConquestRewardPool',
  'GMActivateSkypassRewards',
  'GMGrantBaseCards',
  'GMGrantItems',
  'GMActivateLeaderboardRewardSchedule',
  'GMDisableLeaderboardRewardSchedule',
  'GMListLeaderboardRewardSchedules',
  'GMProposeLeaderboardRewardSchedule',
  'GMListConquestRewardPools',
  'GMListConquestReadiness',
  'GMProposeConquestRewardPool',
  'GMRetireConquestRewardPool',
  'GMActivateConquestV2RewardSchedule',
  'GMDisableConquestV2RewardSchedule',
  'GMListConquestV2RewardSchedules',
  'GMProposeConquestV2RewardSchedule',
  'GMActivateReferralStickerSchedule',
  'GMListReferralStickerSchedules',
  'GMProposeReferralStickerSchedule',
  'GMVerifyConquestReadiness'
])

export const partitionRpcGaps = methods => ({
  retired: methods.filter(method => RETIRED_SOURCE_RPCS.has(method)).sort(),
  superseded: methods
    .filter(method => SUPERSEDED_SOURCE_RPCS.has(method))
    .sort(),
  actionable: methods
    .filter(
      method =>
        !RETIRED_SOURCE_RPCS.has(method) && !SUPERSEDED_SOURCE_RPCS.has(method)
    )
    .sort()
})

export const checkRpcCoverage = audit => {
  const errors = []
  if (audit.implemented.length < 148) {
    errors.push(`ported RPC count regressed to ${audit.implemented.length}`)
  }
  const sourceTombstones = audit.sourceTombstones ?? []
  for (const method of CRITICAL_METHODS) {
    if (
      !audit.implemented.includes(method) &&
      !sourceTombstones.includes(method)
    ) {
      errors.push(`critical RPC is missing: ${method}`)
    }
  }
  const gaps = partitionRpcGaps(audit.missing)
  for (const method of gaps.actionable) {
    if (!APPROVED_ACTIONABLE_SOURCE_RPCS.has(method)) {
      errors.push(`unreviewed actionable RPC gap: ${method}`)
    }
  }
  for (const method of audit.adapters) {
    if (!REVIEWED_CLOUDFLARE_RPC_ADAPTERS.has(method)) {
      errors.push(`unreviewed Cloudflare-only RPC adapter: ${method}`)
    }
  }
  for (const method of REVIEWED_CLOUDFLARE_RPC_ADAPTERS) {
    if (!audit.adapters.includes(method)) {
      errors.push(`reviewed Cloudflare-only RPC adapter disappeared: ${method}`)
    }
  }
  return errors
}

export const rpcFulfillmentSummary = audit => {
  const gaps = partitionRpcGaps(audit.missing)
  return {
    sourceTombstones: audit.sourceTombstones ?? [],
    superseded: [
      ...gaps.superseded,
      ...(audit.supersededTombstones ?? [])
    ].sort(),
    retired: [...gaps.retired, ...(audit.retiredTombstones ?? [])].sort(),
    actionable: gaps.actionable
  }
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
  if (
    /(Card|Deck|Search|HeroUnlock|GameModes|XPBonus|RewardsTime)/.test(method)
  ) {
    return 'content-discovery'
  }
  return 'other-product'
}

export const summarizeRpcCategories = methods =>
  Object.fromEntries(
    [
      ...methods.reduce((counts, method) => {
        const category = rpcPortCategory(method)
        counts.set(category, (counts.get(category) ?? 0) + 1)
        return counts
      }, new Map())
    ].sort(([left], [right]) => left.localeCompare(right))
  )

const loadAudit = async root => {
  const rpcDirectory = path.join(root, 'api/rpc')
  const files = (await readdir(rpcDirectory))
    .filter(file => file.endsWith('.go') && !file.endsWith('_test.go'))
    .sort()
  const methods = []
  for (const file of files) {
    methods.push(
      ...extractGoRpcMethods(
        await readFile(path.join(rpcDirectory, file), 'utf8')
      )
    )
  }
  const gateway = await readFile(
    path.join(root, 'cloudflare/src/api.ts'),
    'utf8'
  )
  return {
    audit: auditRpcCoverage(methods, extractTsRpcCases(gateway)),
    tombstoneErrors: tsRpcTombstoneAuditErrors(gateway)
  }
}

const main = async () => {
  const root = path.resolve(
    path.dirname(new URL(import.meta.url).pathname),
    '..'
  )
  const { audit, tombstoneErrors } = await loadAudit(root)
  const errors = [...checkRpcCoverage(audit), ...tombstoneErrors]
  const fulfillment = rpcFulfillmentSummary(audit)
  if (process.argv.includes('--json')) {
    process.stdout.write(
      `${JSON.stringify({ ...audit, fulfillment }, null, 2)}\n`
    )
  } else {
    const fulfilled =
      audit.implemented.length +
      fulfillment.sourceTombstones.length +
      fulfillment.superseded.length +
      fulfillment.retired.length
    process.stdout.write(
      [
        `Source RPCs: ${audit.source.length}`,
        `Functional TypeScript RPCs: ${audit.implemented.length}`,
        `Source-faithful tombstones: ${fulfillment.sourceTombstones.length}`,
        `Superseded source RPCs: ${fulfillment.superseded.length}`,
        `Retired source RPCs: ${fulfillment.retired.length}`,
        `Fulfilled/retired source contracts: ${fulfilled}`,
        `Actionable source RPC gaps: ${fulfillment.actionable.length}`,
        `Cloudflare-only adapters: ${audit.adapters.length}`,
        '',
        `Actionable: ${fulfillment.actionable.join(', ')}`,
        `Source tombstones: ${fulfillment.sourceTombstones.join(', ')}`,
        `Superseded: ${fulfillment.superseded.join(', ')}`,
        `Retired: ${fulfillment.retired.join(', ')}`,
        audit.adapters.length ? `Adapters: ${audit.adapters.join(', ')}` : ''
      ]
        .filter((line, index) => line || index < 9)
        .join('\n') + '\n'
    )
  }
  if (process.argv.includes('--check') && errors.length) {
    for (const error of errors) process.stderr.write(`RPC audit: ${error}\n`)
    process.exitCode = 1
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  await main()
}
