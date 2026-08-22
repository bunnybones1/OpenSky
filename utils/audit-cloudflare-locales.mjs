import { readFile, readdir } from 'node:fs/promises'
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
play.conquestRewardsInactive
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
play.rewards.percentagePoints
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

const I18NEXT_PLURAL_SUFFIX = /_(?:zero|one|two|few|many|other)$/
const STRING_COUNT_CALL =
  /\bt\(\s*(['"])([^'"]+)\1\s*,\s*\{[^}]{0,200}\bcount\s*:\s*(['"])([^'"]*)\3/g

/**
 * i18next uses `count` to select a plural suffix. A non-numeric literal such
 * as `25%` cannot select `key_one` or `key_other`, so the UI renders the raw
 * base key. Explicit plural keys remain valid because `count` is then only an
 * interpolation value.
 */
export const auditStringPluralCounts = sources => {
  const errors = []
  for (const [file, source] of Object.entries(sources)) {
    for (const match of source.matchAll(STRING_COUNT_CALL)) {
      const [, , key, , count] = match
      if (!I18NEXT_PLURAL_SUFFIX.test(key) && !Number.isFinite(Number(count))) {
        errors.push(
          `${file} passes non-numeric plural count ${JSON.stringify(count)} ` +
            `to unsuffixed key ${key}`
        )
      }
    }
  }
  return errors
}

export const auditConquestDormantRewardCopy = source => {
  const errors = []
  if (
    !/\{!displayConquestCards && \([\s\S]*?play\.conquestRewardsInactive[\s\S]*?\)\}/.test(
      source
    )
  ) {
    errors.push('Conquest reward UI is missing its inactive-pool message')
  }
  if (
    !/\{displayConquestCards && \(\s*<>[\s\S]*?<GoldMintWarning[\s\S]*?play\.over100Golds[\s\S]*?play\.silversAvailable[\s\S]*?<\/InnerContainer>\s*<\/>\s*\)\}/.test(
      source
    )
  ) {
    errors.push(
      'Conquest pool-specific Gold/Silver claims are not gated by an active pool'
    )
  }
  return errors
}

export const auditHomeConquestRewardCopy = source => {
  const errors = []
  if (!/const \{ data: conquestRewards \} = useConquestRewards\(\)/.test(source)) {
    errors.push('Home Conquest feature is missing authoritative reward data')
  }
  if (
    !/const hasActiveConquestRewards =\s*!!conquestRewards\?\.rewards\.weeklyGolds\.length/.test(
      source
    )
  ) {
    errors.push('Home Conquest feature is missing its active-pool boundary')
  }
  if (
    !/hasActiveConquestRewards\s*\? 'home\.mainFeatureConquest\.title'\s*: 'play\.conquestRewardsInactive'/.test(
      source
    )
  ) {
    errors.push(
      'Home Conquest reward claim is not replaced by inactive-pool copy'
    )
  }
  return errors
}

export const auditConquestProfileFirstPlayed = source => {
  const errors = []
  if (
    !/\{firstConquestDate && \([\s\S]*?profile\.playedConquestForFirstTimeOn[\s\S]*?firstConquestDate\.split\('T'\)\[0\][\s\S]*?\)\}/.test(
      source
    )
  ) {
    errors.push(
      'Conquest profile first-play claim is not guarded by a real source date'
    )
  }
  if (/firstConquestDate\s*\?[^:]+:\s*['"]N\/A['"]/.test(source)) {
    errors.push('Conquest profile still claims an N/A first-play date')
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

export const loadWebappSourceFiles = async rootDir => {
  const sourceRoot = path.join(rootDir, 'webapp', 'src')
  const sources = {}
  const visit = async directory => {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name)
      if (entry.isDirectory()) {
        await visit(absolute)
      } else if (/\.tsx?$/.test(entry.name)) {
        sources[path.relative(rootDir, absolute)] = await readFile(
          absolute,
          'utf8'
        )
      }
    }
  }
  await visit(sourceRoot)
  return sources
}

const isMain =
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href

if (isMain) {
  const rootDir = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '..'
  )
  const [resources, sources] = await Promise.all([
    loadWebappLocaleResources(rootDir),
    loadWebappSourceFiles(rootDir)
  ])
  const errors = [
    ...auditLocaleResources(resources),
    ...auditStringPluralCounts(sources),
    ...auditConquestDormantRewardCopy(
      sources['webapp/src/PlayPage/Conquest/ConquestInfo/ConquestInfo.tsx'] ??
        ''
    ),
    ...auditHomeConquestRewardCopy(
      sources['webapp/src/HomePage/HomePage.tsx'] ?? ''
    ),
    ...auditConquestProfileFirstPlayed(
      sources[
        'webapp/src/AccountPage/AccountIdentity/components/ConquestSection.tsx'
      ] ?? ''
    )
  ]
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
