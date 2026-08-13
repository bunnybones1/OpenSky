import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

export const SUPPORTED_WEBAPP_LOCALES = [
  'en',
  'es-ES',
  'fr',
  'pt-BR',
  'zh',
  'pig'
]

// These strings replace wallet-first, transaction, and minting copy in the
// original interface. Missing translations silently fall back to English, so
// this explicit contract must grow whenever that product surface grows.
export const CLOUD_WEASEL_LOCALE_KEYS = `
cardDetails.baseExplanationOffchain
cardDetails.goldExplanationOffchain
cardDetails.inventoryBalance
cardDetails.offchainInventory
cardDetails.silverExplanationOffchain
deleteAccount.googleConfirmation
generic.Collected
heroFeature.offchainExchangeDelivered
heroFeature.offchainExchangeExplanation
heroFeature.offchainExchangeFinal
heroFeature.offchainExchangeRate
heroFeature.offchainOrderDetailsTitle
heroFeature.selectGoldCards
heroFeature.unlockHeroSkins
identityAuth.cancelled
identityAuth.continueWithGoogle
identityAuth.description
identityAuth.failed
identityAuth.notConfigured
identityAuth.playPractice
identityAuth.signOut
identityAuth.statusUnavailable
identityAuth.walletOptional
play.completedDeliveryNumCards
play.completedDeliverySpecificCard
play.conquestDeckPointsTooltipMessageOffchain
play.conquestWeeklyGoldsOffchain
play.delayedDelivery_one
play.delayedDelivery_other
play.delayedGoldDelivery
play.deliveryIn
play.deliveryInProgress
play.exchangeRate
play.gameModes.CONQUEST.pendingGoldsOffchain
play.noDeliveriesPending
play.rewards.levelWeeklyTreasureLineTwoOffchain
play.silverExchangeFinal
play.silverExchangeFinalTooltip
play.silverExchangeRate
play.silverExchangeWarning
play.silverTicketsReceived_one
play.silverTicketsReceived_other
play.ticketsReceived
play.treasureRewardsInactive
play.treasureToolTipHeaderOffchain
profile.walletConnect
profile.walletConnectInactive
profile.walletConnecting
profile.walletConnections
profile.walletConnectionsDescription
profile.walletConnectionsEmpty
profile.walletContentsEmpty
profile.walletContentsInactive
profile.walletContentsTruncated
profile.walletRefreshContents
profile.walletUnlink
profile.walletUnlinkConfirm
purchaseSkypass.unavailable
skypass.detailsDescsOffchain.CardBack
skypass.detailsDescsOffchain.ConquestTickets
skypass.detailsDescsOffchain.NewSticker
skypass.detailsDescsOffchain.SilverCard
skypass.detailsDescsOffchain.StickerPoints
skypass.premiumDescOffchain
tooltip.conquestRulesLineSevenOffchain
tooltip.goldCardsExplainerLineOneOffchain
tooltip.goldCardsExplainerLineTwoOffchain
tooltip.progressionInfoOffchain
tooltip.silverCardsExplainerLineOneOffchain
tooltip.silverCardsExplainerLineTwoOffchain
`
  .trim()
  .split('\n')

const getString = (resource, key) =>
  key.split('.').reduce((value, part) => value?.[part], resource)

const flattenStringKeys = (node, prefix = '') =>
  Object.entries(node).flatMap(([part, value]) => {
    const key = prefix ? `${prefix}.${part}` : part
    return typeof value === 'string'
      ? [key]
      : value && typeof value === 'object'
        ? flattenStringKeys(value, key)
        : []
  })

const isCloudWeaselLocaleKey = key =>
  key.includes('Offchain') ||
  key.startsWith('identityAuth.') ||
  /^profile\.wallet(?:Connect|Connections|Contents|Refresh|Unlink)/.test(key) ||
  [
    'cardDetails.inventoryBalance',
    'deleteAccount.googleConfirmation',
    'generic.Collected',
    'heroFeature.selectGoldCards',
    'heroFeature.unlockHeroSkins',
    'purchaseSkypass.unavailable'
  ].includes(key) ||
  /^play\.(?:completedDelivery|delayedDelivery|delayedGoldDelivery|deliveryIn|exchangeRate|noDeliveriesPending|silverExchange|silverTicketsReceived|ticketsReceived|treasureRewardsInactive)/.test(
    key
  )

const structuralTokens = value => [
  ...[...value.matchAll(/{{\s*([^}]+?)\s*}}/g)].map(
    match => `{{${match[1].trim()}}}`
  ),
  ...[...value.matchAll(/<\/?[A-Za-z][^>]*>/g)].map(match => match[0])
]

export const auditLocaleResources = (
  resources,
  keys = CLOUD_WEASEL_LOCALE_KEYS,
  locales = SUPPORTED_WEBAPP_LOCALES
) => {
  const errors = []
  const english = resources.en
  if (!english) return ['missing locale resource: en']

  const reviewedKeys = new Set(keys)
  for (const key of flattenStringKeys(english).filter(isCloudWeaselLocaleKey)) {
    if (!reviewedKeys.has(key)) {
      errors.push(`unreviewed Cloud Weasel locale key: ${key}`)
    }
  }

  for (const locale of locales) {
    const resource = resources[locale]
    if (!resource) {
      errors.push(`missing locale resource: ${locale}`)
      continue
    }
    for (const key of keys) {
      const source = getString(english, key)
      const translated = getString(resource, key)
      if (typeof source !== 'string' || !source.trim()) {
        errors.push(`English locale contract is missing: ${key}`)
        continue
      }
      if (typeof translated !== 'string' || !translated.trim()) {
        errors.push(`${locale} is missing Cloud Weasel locale key: ${key}`)
        continue
      }
      const sourceTokens = structuralTokens(source)
      const translatedTokens = structuralTokens(translated)
      if (JSON.stringify(sourceTokens) !== JSON.stringify(translatedTokens)) {
        errors.push(
          `${locale}.${key} changed interpolation/markup tokens: ` +
            `${JSON.stringify(sourceTokens)} -> ${JSON.stringify(translatedTokens)}`
        )
      }
      if (
        source.includes('Cloud Weasel') &&
        !translated.includes('Cloud Weasel')
      ) {
        errors.push(`${locale}.${key} dropped the Cloud Weasel product name`)
      }
    }
  }
  return errors
}

export const loadWebappLocaleResources = async rootDir =>
  Object.fromEntries(
    await Promise.all(
      SUPPORTED_WEBAPP_LOCALES.map(async locale => [
        locale,
        JSON.parse(
          await readFile(
            path.join(rootDir, 'webapp', 'locales', locale, 'webapp.json'),
            'utf8'
          )
        )
      ])
    )
  )

const isMain =
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href

if (isMain) {
  const rootDir = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '..'
  )
  const resources = await loadWebappLocaleResources(rootDir)
  const errors = auditLocaleResources(resources)
  if (errors.length) {
    console.error(errors.join('\n'))
    process.exitCode = 1
  } else {
    console.log(
      `Cloud Weasel locale audit passed: ${CLOUD_WEASEL_LOCALE_KEYS.length} ` +
        `identity/reward keys across ${SUPPORTED_WEBAPP_LOCALES.length} locales.`
    )
  }
}
