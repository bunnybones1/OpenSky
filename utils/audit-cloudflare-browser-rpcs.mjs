import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

import ts from 'typescript'

import {
  RETIRED_SOURCE_RPCS,
  REVIEWED_TS_RPC_TOMBSTONES,
  SUPERSEDED_SOURCE_RPCS,
  extractGoRpcMethods,
  extractSourcePublicRpcs,
  extractTsRpcCases,
  extractWorkerAuthenticatedRpcs
} from './audit-cloudflare-rpcs.mjs'

export { extractSourcePublicRpcs, extractWorkerAuthenticatedRpcs }

// These source calls remain in the preserved browser for the legacy wallet
// build, but Google identity mode replaces or retires them before invocation.
// The auth-mode, browser-transaction, and off-chain gates verify those guards;
// this list prevents a missing Worker handler from being mistaken for a port.
export const REVIEWED_BROWSER_RPC_NON_PORTS = {
  MigrateFromBurner: 'zero-user identity launch',
  PrepareOnChainInCurrencyTransaction: 'identity-native off-chain commerce',
  PrepareOnChainInItemsTransaction: 'identity-owned off-chain exchanges',
  PrepareTransferAssetsFromBurnerTransaction: 'optional wallets are read-only',
  RequestAccountDeletion: 'Google OIDC step-up deletion flow'
}

// Exact source RPC surface reached by the preserved webapp and game clients.
// A disappearing call can be as consequential as a missing handler: it may
// mean an original UI behavior was hidden during an auth adaptation. Additions
// likewise require an explicit review before becoming a production contract.
export const REVIEWED_BROWSER_SOURCE_RPCS = new Set([
  'AccountExistsByName',
  'AccountLeaderboard',
  'BotMatchEnd',
  'ClaimQuestRewards',
  'ClaimSkypassRewards',
  'ConquestRewards',
  'ConquestStats',
  'ConquestStatus',
  'ConquestTreasuresInfo',
  'ConquestV2Pool',
  'ConquestV2Progress',
  'CreateDeck',
  'CreateStripePaymentIntent',
  'DeckClassUnlockLevels',
  'DeleteDeck',
  'EnterConquest',
  'EquipItem',
  'FavoriteDeck',
  'GMAccountSignalSummaries',
  'GMAddBanner',
  'GMAddFeaturedStreamer',
  'GMCompleteQuest',
  'GMCreateAccountAction',
  'GMCreateOneTimeNotification',
  'GMDeleteOneTimeNotification',
  'GMDeleteQuest',
  'GMFindAccount',
  'GMGameModeSet',
  'GMGiveLevels',
  'GMHasSkypassPremium',
  'GMIsAccountBanned',
  'GMListAccountSignals',
  'GMListAccounts',
  'GMListBanners',
  'GMListMatches',
  'GMListOneTimeNotifications',
  'GMListPendingCards',
  'GMModifyBanner',
  'GMRemoveBanner',
  'GMRemoveFeaturedStreamer',
  'GMRenameAccount',
  'GMResetQuestReRolls',
  'GMResetStarterDecks',
  'GMSetRP',
  'GMSetReviewed',
  'GMSetWarmupGamesCompleted',
  'GMStats',
  'GMToggleSkypassPremium',
  'GMUnlockAllBaseCards',
  'GetAccount',
  'GetAccountStats',
  'GetAuthToken',
  'GetBanners',
  'GetCardOwnership',
  'GetCookiePolicy',
  'GetCurrentSeason',
  'GetCurrentSeasonStartTime',
  'GetDeckEquipmentByDeckString',
  'GetFeaturedStreamers',
  'GetFeed',
  'GetFriendPoints',
  'GetGameModesStatus',
  'GetItemOwnershipByType',
  'GetItemSummary',
  'GetItemSupply',
  'GetMatchArchiveRecordsURI',
  'GetNextRewardsTime',
  'GetNextSeasonTime',
  'GetPendingCards',
  'GetPointsGifted',
  'GetPrivateSpectateCode',
  'GetQuestsAutoRerollTime',
  'GetSession',
  'GetStickerOwnership',
  'GetStickers',
  'GetTwitchInfo',
  'ListDeckRanks',
  'ListDecks',
  'ListEquippedItems',
  'ListLeaderboard',
  'ListMatches',
  'ListNotifications',
  'ListPaymentProviderProducts',
  'ListQuests',
  'ListSkypassRewards',
  'ListUnlockedDeckClasses',
  'MarkDeckNotNew',
  'MarkItemsNotNew',
  'MigrateFromBurner',
  'PrepareOnChainInCurrencyTransaction',
  'PrepareOnChainInItemsTransaction',
  'PrepareTransferAssetsFromBurnerTransaction',
  'ReRollQuest',
  'RegisterAccount',
  'ReportAccount',
  'RequestAccountDeletion',
  'SaveCookiePolicy',
  'SearchCards',
  'SearchDeckRanks',
  'SetInvitedBy',
  'SetNotificationsAsSeen',
  'SetQuestsAsSeen',
  'UnequipItem',
  'UnfavoriteDeck',
  'UpdateAccount',
  'UpdateDeck',
  'UserStorageFetch',
  'UserStorageSave'
])

const sourceFiles = async directory => {
  const entries = await readdir(directory, { withFileTypes: true })
  const nested = await Promise.all(
    entries.map(entry => {
      const entryPath = path.join(directory, entry.name)
      return entry.isDirectory() ? sourceFiles(entryPath) : [entryPath]
    })
  )
  return nested.flat().filter(file => /\.tsx?$/.test(file))
}

const propertyPath = node => {
  if (ts.isIdentifier(node)) return [node.text]
  if (node.kind === ts.SyntaxKind.ThisKeyword) return ['this']
  if (ts.isPropertyAccessExpression(node)) {
    const parent = propertyPath(node.expression)
    return parent ? [...parent, node.name.text] : undefined
  }
  return undefined
}

/**
 * Finds actual TypeScript call expressions, so commented examples and mere
 * authToken property reads cannot inflate the browser contract inventory.
 */
export const extractBrowserRpcCalls = (
  source,
  receiverPaths = [['APIClient', 'opensky'], ['apiClient']]
) => {
  const file = ts.createSourceFile(
    'browser.tsx',
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
  )
  const receivers = new Set(receiverPaths.map(parts => parts.join('.')))
  const methods = new Set()
  const visit = node => {
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression)
    ) {
      const receiver = propertyPath(node.expression.expression)?.join('.')
      if (receiver && receivers.has(receiver)) {
        methods.add(node.expression.name.text)
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(file)
  return [...methods].sort()
}

export const browserMethodToRpc = method =>
  method.length > 0 ? `${method[0].toUpperCase()}${method.slice(1)}` : method

/**
 * Finds reviewed RPC names used as exact test literals or complete WebRPC
 * endpoint URLs. Comments and descriptive strings cannot satisfy the gate.
 */
export const extractRpcTestReferences = (source, knownRpcs) => {
  const file = ts.createSourceFile(
    'contract.test.ts',
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
  )
  const known = new Set(knownRpcs)
  const methods = new Set()
  const visit = node => {
    if (ts.isStringLiteralLike(node)) {
      if (known.has(node.text)) methods.add(node.text)
      const endpoint = node.text.match(
        /\/rpc\/SkyWeaverAPI\/([A-Za-z][A-Za-z0-9]*)(?:[?#].*)?$/
      )?.[1]
      if (endpoint && known.has(endpoint)) methods.add(endpoint)
    }
    ts.forEachChild(node, visit)
  }
  visit(file)
  return [...methods].sort()
}

export const browserRpcTestAuditErrors = ({
  browserMethods,
  testedRpcs,
  reviewedNonPorts = REVIEWED_BROWSER_RPC_NON_PORTS
}) => {
  const tested = new Set(testedRpcs)
  const nonPorts = new Set(Object.keys(reviewedNonPorts))
  return browserMethods
    .map(browserMethodToRpc)
    .filter(rpc => !nonPorts.has(rpc) && !tested.has(rpc))
    .map(rpc => `browser Worker RPC has no direct contract-test reference: ${rpc}`)
}

export const browserRpcAccessAuditErrors = ({
  browserMethods,
  sourcePublicRpcs,
  workerAuthenticatedRpcs,
  reviewedNonPorts = REVIEWED_BROWSER_RPC_NON_PORTS
}) => {
  const sourcePublic = new Set(sourcePublicRpcs)
  const workerAuthenticated = new Set(workerAuthenticatedRpcs)
  const nonPorts = new Set(Object.keys(reviewedNonPorts))
  return browserMethods.map(browserMethodToRpc).flatMap(rpc => {
    if (nonPorts.has(rpc)) return []
    const sourceAccess = sourcePublic.has(rpc) ? 'public' : 'authenticated'
    const workerAccess = workerAuthenticated.has(rpc)
      ? 'authenticated'
      : 'public'
    return sourceAccess === workerAccess
      ? []
      : [
          `browser RPC access drift: ${rpc} is ${sourceAccess} in source and ${workerAccess} in Worker`
        ]
  })
}

export const browserRpcAuditErrors = ({
  browserMethods,
  sourceMethods,
  workerMethods,
  tombstones = REVIEWED_TS_RPC_TOMBSTONES,
  reviewedNonPorts = REVIEWED_BROWSER_RPC_NON_PORTS,
  reviewedBrowserRpcs = REVIEWED_BROWSER_SOURCE_RPCS
}) => {
  const errors = []
  const source = new Set(sourceMethods)
  const worker = new Set(workerMethods)
  const reviewed = new Set(Object.keys(reviewedNonPorts))
  const terminal = new Set(Object.keys(tombstones))
  const observed = new Set(browserMethods.map(browserMethodToRpc))

  for (const rpc of observed) {
    if (!reviewedBrowserRpcs.has(rpc)) {
      errors.push(`unreviewed browser source RPC call: ${rpc}`)
    }
  }
  for (const rpc of reviewedBrowserRpcs) {
    if (!observed.has(rpc)) {
      errors.push(`reviewed browser source RPC call disappeared: ${rpc}`)
    }
  }

  for (const method of browserMethods) {
    const rpc = browserMethodToRpc(method)
    if (!source.has(rpc)) {
      errors.push(`browser call is not a source RPC: ${method}`)
      continue
    }
    if (worker.has(rpc)) continue
    if (!reviewed.has(rpc)) {
      errors.push(`browser source RPC has no Worker handler: ${rpc}`)
    }
  }

  for (const rpc of reviewed) {
    if (!source.has(rpc)) {
      errors.push(`reviewed browser non-port is not a source RPC: ${rpc}`)
    }
    if (!RETIRED_SOURCE_RPCS.has(rpc) && !SUPERSEDED_SOURCE_RPCS.has(rpc)) {
      errors.push(`reviewed browser non-port lacks an RPC disposition: ${rpc}`)
    }
    if (worker.has(rpc) && !terminal.has(rpc)) {
      errors.push(`reviewed browser non-port unexpectedly has a Worker handler: ${rpc}`)
    }
  }

  for (const rpc of [...RETIRED_SOURCE_RPCS, ...SUPERSEDED_SOURCE_RPCS]) {
    const browserMethod = `${rpc[0].toLowerCase()}${rpc.slice(1)}`
    if (browserMethods.includes(browserMethod) && !reviewed.has(rpc)) {
      errors.push(`browser non-port lacks an invocation review: ${rpc}`)
    }
  }
  return errors
}

const main = async () => {
  const root = path.resolve(
    path.dirname(new URL(import.meta.url).pathname),
    '..'
  )
  const [browserFiles, rpcFiles, gateway, testFiles, accessControl] =
    await Promise.all([
      Promise.all([
        sourceFiles(path.join(root, 'webapp/src')),
        sourceFiles(path.join(root, 'game/src'))
      ]).then(groups => groups.flat()),
      readdir(path.join(root, 'api/rpc')).then(files =>
        files
          .filter(file => file.endsWith('.go') && !file.endsWith('_test.go'))
          .sort()
      ),
      readFile(path.join(root, 'cloudflare/src/api.ts'), 'utf8'),
      sourceFiles(path.join(root, 'cloudflare/test')),
      readFile(
        path.join(root, 'api/rpc/middleware/access_control.go'),
        'utf8'
      )
    ])
  const browserMethods = new Set()
  for (const file of browserFiles) {
    const receiverPaths = [['APIClient', 'opensky'], ['apiClient']]
    if (file === path.join(root, 'game/src/apiClient.ts')) {
      receiverPaths.push(['this'])
    }
    for (const method of extractBrowserRpcCalls(
      await readFile(file, 'utf8'),
      receiverPaths
    )) {
      browserMethods.add(method)
    }
  }
  const sourceMethods = []
  for (const file of rpcFiles) {
    sourceMethods.push(
      ...extractGoRpcMethods(
        await readFile(path.join(root, 'api/rpc', file), 'utf8')
      )
    )
  }
  const methods = [...browserMethods].sort()
  const rpcMethods = methods.map(browserMethodToRpc)
  const testedRpcs = new Set()
  for (const file of testFiles) {
    for (const rpc of extractRpcTestReferences(
      await readFile(file, 'utf8'),
      rpcMethods
    )) {
      testedRpcs.add(rpc)
    }
  }
  const errors = [
    ...browserRpcAuditErrors({
      browserMethods: methods,
      sourceMethods,
      workerMethods: extractTsRpcCases(gateway)
    }),
    ...browserRpcTestAuditErrors({
      browserMethods: methods,
      testedRpcs
    }),
    ...browserRpcAccessAuditErrors({
      browserMethods: methods,
      sourcePublicRpcs: extractSourcePublicRpcs(accessControl),
      workerAuthenticatedRpcs: extractWorkerAuthenticatedRpcs(gateway)
    })
  ]
  if (errors.length) {
    for (const error of errors) {
      process.stderr.write(`Browser RPC audit: ${error}\n`)
    }
    process.exitCode = 1
    return
  }
  const nonPorts = methods.filter(method =>
    Object.hasOwn(
      REVIEWED_BROWSER_RPC_NON_PORTS,
      browserMethodToRpc(method)
    )
  )
  if (process.argv.includes('--json')) {
    process.stdout.write(
      `${JSON.stringify(
        {
          browserMethods: methods,
          rpcMethods,
          reviewedNonPorts: nonPorts.map(browserMethodToRpc),
          testedWorkerRpcs: [...testedRpcs].sort()
        },
        null,
        2
      )}\n`
    )
    return
  }
  process.stdout.write(
    `All ${methods.length} browser RPC calls have Worker handlers or reviewed identity dispositions; ${methods.length - nonPorts.length} Worker-backed calls preserve source public/auth boundaries and have direct contract-test references, while ${nonPorts.length} legacy calls are guarded non-ports\n`
  )
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  await main()
}
