import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

// These are execution sites, not ABI wrappers or generated bindings. Keeping
// the reviewed set exact means a new source contract call cannot silently be
// mistaken for an already-ported reward path.
export const EXPECTED_CHAIN_EFFECT_FILES = {
  'api/cmd/grant-cards/_main.go': {
    count: 2,
    disposition: 'offchain-operator-grant',
    evidence: ['player_items', 'gm-unlock-all-base-cards']
  },
  'api/lib/accounts/asset_transferer.go': {
    count: 2,
    disposition: 'retired-zero-user-migration',
    evidence: ['MigrateFromBurner', 'retired']
  },
  'api/lib/jobqueue/send_txns_runner.go': {
    count: 15,
    disposition: 'offchain-reward-ledgers',
    evidence: ['All 13 source transaction queues', 'player_items']
  },
  'api/lib/payments/onchain_transaction_composer.go': {
    count: 3,
    disposition: 'offchain-commerce-and-exchanges',
    evidence: [
      'Stripe',
      'mobile-store',
      'Silver',
      'Legacy Hero exchange'
    ]
  },
  'api/rpc/accounts.go': {
    count: 1,
    disposition: 'retired-zero-user-migration',
    evidence: ['PrepareTransferAssetsFromBurnerTransaction', 'superseded']
  },
  'api/rpc/payments.go': {
    count: 2,
    disposition: 'offchain-commerce-and-exchanges',
    evidence: [
      'PrepareOnChainInCurrencyTransaction',
      'PrepareOnChainInItemsTransaction',
      'superseded'
    ]
  }
}

const EFFECT_PATTERNS = [
  /\.(?:Mint|BatchMint|SendTransactions|ComposeTransfer|ComposeSafeBatchTransferFrom|ComposeApprove|ComposePurchaseItems|ComposeERC20|ComposeERC1155|ComposeTransactionToTransferFromBurner)\s*\(/g,
  /\.Encode\s*\(\s*"batchMint"/g
]

const sourceFiles = async directory => {
  const entries = await readdir(directory, { withFileTypes: true })
  const nested = await Promise.all(
    entries.map(entry => {
      const entryPath = path.join(directory, entry.name)
      return entry.isDirectory() ? sourceFiles(entryPath) : [entryPath]
    })
  )
  return nested.flat()
}

const isExecutableGoSource = file =>
  file.endsWith('.go') &&
  !file.endsWith('_test.go') &&
  !file.endsWith('.gen.go') &&
  !file.includes('/contracts/') &&
  !file.includes('/mock/')

export const chainEffectCount = source =>
  EFFECT_PATTERNS.reduce(
    (count, pattern) => count + [...source.matchAll(pattern)].length,
    0
  )

export const chainEffectAuditErrors = ({ sources, evidenceSources }) => {
  const errors = []
  const actual = Object.entries(sources)
    .map(([file, source]) => [file, chainEffectCount(source)])
    .filter(([, count]) => count > 0)

  for (const [file, count] of actual) {
    const review = EXPECTED_CHAIN_EFFECT_FILES[file]
    if (!review) {
      errors.push(`unreviewed source chain-effect file: ${file}`)
      continue
    }
    if (count !== review.count) {
      errors.push(
        `${file} has ${count} chain-effect callsites; reviewed count is ${review.count}`
      )
    }
  }

  for (const [file, review] of Object.entries(EXPECTED_CHAIN_EFFECT_FILES)) {
    if (!actual.some(([actualFile]) => actualFile === file)) {
      errors.push(`reviewed source chain-effect file disappeared: ${file}`)
      continue
    }
    const evidence = evidenceSources[review.disposition] ?? ''
    for (const token of review.evidence) {
      if (!evidence.includes(token)) {
        errors.push(`${file} is missing disposition evidence: ${token}`)
      }
    }
  }
  return errors
}

const main = async () => {
  const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
  const apiRoot = path.join(root, 'api')
  const files = (await sourceFiles(apiRoot)).filter(isExecutableGoSource)
  const sources = Object.fromEntries(
    await Promise.all(
      files.map(async file => [
        path.relative(root, file),
        await readFile(file, 'utf8')
      ])
    )
  )
  const [policy, rpcAudit, queueAudit, playerSupport] = await Promise.all([
    readFile(path.join(root, 'docs/OFFCHAIN_REWARD_POLICY.md'), 'utf8'),
    readFile(path.join(root, 'docs/CLOUDFLARE_RPC_AUDIT.md'), 'utf8'),
    readFile(path.join(root, 'utils/audit-cloudflare-mint-queues.mjs'), 'utf8'),
    readFile(path.join(root, 'cloudflare/src/player-support.ts'), 'utf8')
  ])
  const errors = chainEffectAuditErrors({
    sources,
    evidenceSources: {
      'offchain-operator-grant': playerSupport,
      'retired-zero-user-migration': `${policy}\n${rpcAudit}`,
      'offchain-reward-ledgers': `${policy}\n${queueAudit}`,
      'offchain-commerce-and-exchanges': `${policy}\n${rpcAudit}`
    }
  })
  if (errors.length) {
    for (const error of errors) {
      process.stderr.write(`Chain-effect audit: ${error}\n`)
    }
    process.exitCode = 1
    return
  }
  process.stdout.write(
    'All six executable Go chain-effect files have reviewed off-chain or retired dispositions\n'
  )
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main()
}
