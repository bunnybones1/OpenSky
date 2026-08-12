import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const LEGACY_TRANSACTION_SURFACES = [
  'SkyPassPurchasePage',
  'PurchaseConquestPage',
  'HeroFeaturePage',
  'SelectSilversPage',
  'SelectGoldCardsForSkinPage'
]

const TRANSACTION_PATTERNS = [
  /prepareOnChain/i,
  /prepareTransferAssets/i,
  /sendTransaction/i,
  /MintHero/i,
  /PurchaseWithUSDC/i,
  /ProcessSPUSDC/i
]

export const offchainGateErrors = ({
  webappConfig,
  identityRoutes,
  appSource,
  policySource
}) => {
  const errors = []
  if (webappConfig?.AUTH_MODE !== 'google') {
    errors.push('Cloudflare webapp AUTH_MODE must remain google')
  }
  if (webappConfig?.AUTO_REGISTER_WALLET !== false) {
    errors.push('Cloudflare webapp must not auto-register a wallet')
  }
  if (!/env\.AUTH_MODE\s*===\s*['"]google['"]\s*\?\s*<IdentityApp\s*\/>/.test(appSource)) {
    errors.push('App must route Google auth through IdentityApp')
  }
  for (const surface of LEGACY_TRANSACTION_SURFACES) {
    if (identityRoutes.includes(surface)) {
      errors.push(`IdentityApp must not import or render ${surface}`)
    }
  }
  for (const pattern of TRANSACTION_PATTERNS) {
    if (pattern.test(identityRoutes)) {
      errors.push(`IdentityApp contains legacy transaction code: ${pattern.source}`)
    }
  }
  for (const required of [
    'D1 inventory is the canonical authority',
    'No game flow asks a player to mint a reward',
    'Apply the inventory change and fulfillment receipt in one D1 transaction'
  ]) {
    if (!policySource.includes(required)) {
      errors.push(`off-chain reward policy is missing: ${required}`)
    }
  }
  return errors
}

const main = async () => {
  const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
  const [configSource, identityRoutes, appSource, policySource] =
    await Promise.all([
      readFile(path.join(root, 'webapp/config/webapp.cloudflare.json'), 'utf8'),
      readFile(path.join(root, 'webapp/src/IdentitySession/IdentityApp.tsx'), 'utf8'),
      readFile(path.join(root, 'webapp/src/App.tsx'), 'utf8'),
      readFile(path.join(root, 'docs/OFFCHAIN_REWARD_POLICY.md'), 'utf8')
    ])
  const errors = offchainGateErrors({
    webappConfig: JSON.parse(configSource),
    identityRoutes,
    appSource,
    policySource
  })
  if (errors.length) {
    for (const error of errors) process.stderr.write(`Off-chain gate: ${error}\n`)
    process.exitCode = 1
    return
  }
  process.stdout.write(
    'Cloudflare identity routes exclude legacy mint transactions; D1 rewards remain canonical\n'
  )
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main()
}
