import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const TRANSACTION_PATTERN =
  /\.sendTransaction\s*\(|\bprepareOnChain(?:InCurrency|InItems)?Transaction\s*\(|\bprepareTransferAssetsFromBurnerTransaction\s*\(|\buseSendTransactions\s*\(/g

const EXPECTED_FILES = {
  'HeroFeaturePage/ReviewMintOrderButton/MintHeroesDialog/MintHeroesModalControls/useConfirmHeroMintOrder/useConfirmHeroMintOrder.ts':
    {
      count: 1,
      disposition: 'google-offchain-guarded-hero'
    },
  'MarketPage/ViewOrderButton/CartDialog/components/CartControlsRow.tsx': {
    count: 1,
    disposition: 'excluded-product-surface',
    routeToken: 'MarketPage'
  },
  'PurchaseConquestPage/PurchaseWithUSDCDialog/hooks/useProcessConquestUSDCOrder.ts':
    {
      count: 4,
      disposition: 'excluded-product-surface',
      routeToken: 'PurchaseConquestPage'
    },
  'SelectSilversPage/SelectSilversCards/ViewSelectedCardsButton/BurnSilversDialog/BurnSilversControlsRow/components/ConfirmConvertSilverCardsDialog.tsx':
    {
      count: 2,
      disposition: 'google-offchain-guarded'
    },
  'SkyPassPurchasePage/SkyPassPurchaseInfo/SkyPassPurchaseButtons/hooks/useProcessSPUSDCOrder.ts':
    {
      count: 4,
      disposition: 'google-control-substituted',
      routeToken: 'SkyPassPurchasePage'
    },
  'clients/AuthenticationClient/AuthenticationClient.ts': {
    count: 2,
    disposition: 'legacy-wallet-infrastructure'
  },
  'clients/AuthenticationClient/Wallet/Wallet.ts': {
    count: 2,
    disposition: 'legacy-wallet-infrastructure'
  },
  'shared/components/BasketDialog/BasketDialog.tsx': {
    count: 1,
    disposition: 'excluded-product-surface',
    routeToken: 'MarketPage'
  },
  'shared/hooks/market/useSendTransactions.ts': {
    count: 1,
    disposition: 'guarded-consumer-helper'
  }
}

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

export const browserTransactionAuditErrors = ({
  sources,
  identityRoutes,
  skypassPurchaseControls = ''
}) => {
  const errors = []
  const actualFiles = Object.entries(sources)
    .map(([file, source]) => [
      file,
      [...source.matchAll(TRANSACTION_PATTERN)].length
    ])
    .filter(([, count]) => count > 0)

  for (const [file, count] of actualFiles) {
    const review = EXPECTED_FILES[file]
    if (!review) {
      errors.push(`unreviewed browser transaction callsite: ${file}`)
      continue
    }
    if (count !== review.count) {
      errors.push(
        `${file} has ${count} transaction callsites; reviewed count is ${review.count}`
      )
    }
  }

  for (const [file, review] of Object.entries(EXPECTED_FILES)) {
    if (!actualFiles.some(([actual]) => actual === file)) {
      errors.push(`reviewed browser transaction file disappeared: ${file}`)
      continue
    }
    if (
      review.disposition === 'excluded-product-surface' &&
      identityRoutes.includes(review.routeToken)
    ) {
      errors.push(
        `Google IdentityApp exposes transaction surface: ${review.routeToken}`
      )
    }
  }

  const silverFile = Object.entries(EXPECTED_FILES).find(
    ([, review]) => review.disposition === 'google-offchain-guarded'
  )?.[0]
  const silverSource = silverFile ? (sources[silverFile] ?? '') : ''
  const googleGuard = silverSource.indexOf("env.AUTH_MODE === 'google'")
  const offchainExchange = silverSource.indexOf(
    'identityClient.exchangeSilverCardsForTickets',
    googleGuard
  )
  const googleReturn = silverSource.indexOf('return', offchainExchange)
  const legacyWallet = silverSource.indexOf('AuthenticationClient.wallet')
  if (
    googleGuard < 0 ||
    offchainExchange < googleGuard ||
    googleReturn < offchainExchange ||
    legacyWallet < googleReturn
  ) {
    errors.push('reviewed Silver callsite no longer exits through D1 first')
  }

  const heroFile = Object.entries(EXPECTED_FILES).find(
    ([, review]) => review.disposition === 'google-offchain-guarded-hero'
  )?.[0]
  const heroSource = heroFile ? (sources[heroFile] ?? '') : ''
  const heroGoogleGuard = heroSource.indexOf("env.AUTH_MODE === 'google'")
  const heroOffchainExchange = heroSource.indexOf(
    'identityClient.exchangeGoldCardsForHeroSkins',
    heroGoogleGuard
  )
  const heroGoogleReturn = heroSource.indexOf('return', heroOffchainExchange)
  const heroLegacyWallet = heroSource.indexOf(
    'getHeroMintTxns',
    heroGoogleReturn
  )
  if (
    heroGoogleGuard < 0 ||
    heroOffchainExchange < heroGoogleGuard ||
    heroGoogleReturn < heroOffchainExchange ||
    heroLegacyWallet < heroGoogleReturn
  ) {
    errors.push('reviewed Hero callsite no longer exits through D1 first')
  }

  if (identityRoutes.includes('SkyPassPurchasePage')) {
    for (const token of [
      "env.AUTH_MODE === 'google'",
      'IdentitySkyPassPurchaseButtons',
      'LegacySkyPassPurchaseButtons'
    ]) {
      if (!skypassPurchaseControls.includes(token)) {
        errors.push(
          `Google SkyPass purchase control substitution is missing: ${token}`
        )
      }
    }
  }

  return errors
}

const main = async () => {
  const root = path.resolve(
    path.dirname(new URL(import.meta.url).pathname),
    '..'
  )
  const webappSourceRoot = path.join(root, 'webapp/src')
  const files = await sourceFiles(webappSourceRoot)
  const sources = Object.fromEntries(
    await Promise.all(
      files.map(async file => [
        path.relative(webappSourceRoot, file),
        await readFile(file, 'utf8')
      ])
    )
  )
  const identityRoutes = await readFile(
    path.join(webappSourceRoot, 'IdentitySession/IdentityApp.tsx'),
    'utf8'
  )
  const skypassPurchaseControls = await readFile(
    path.join(
      webappSourceRoot,
      'SkyPassPurchasePage/SkyPassPurchaseInfo/SkyPassPurchaseButtons/SkyPassPurchaseButtons.tsx'
    ),
    'utf8'
  )
  const errors = browserTransactionAuditErrors({
    sources,
    identityRoutes,
    skypassPurchaseControls
  })
  if (errors.length) {
    for (const error of errors)
      process.stderr.write(`Browser transaction audit: ${error}\n`)
    process.exitCode = 1
    return
  }
  process.stdout.write(
    'All nine browser transaction files have reviewed Cloudflare dispositions\n'
  )
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  await main()
}
