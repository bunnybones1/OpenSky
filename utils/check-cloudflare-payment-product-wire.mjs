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

const goCatalog = source => {
  const block = section(
    source,
    'var paymentProviderProducts =',
    '\ntype productPrices'
  )
  const result = []
  let provider
  let itemType
  for (const line of block.split('\n')) {
    const providerMatch = line.match(/^\tproto\.PaymentProvider_(\w+): \{$/)
    if (providerMatch) {
      provider = providerMatch[1]
      itemType = undefined
      continue
    }
    const itemMatch = line.match(/^\t\tproto\.ItemType_(\w+): \{$/)
    if (itemMatch) {
      itemType = itemMatch[1]
      continue
    }
    const codeMatch = line.match(/^\t\t\t"([^"]+)":/)
    if (codeMatch && provider && itemType) {
      result.push(`${provider}/${itemType}/${codeMatch[1]}`)
    }
  }
  return result
}

const tsCatalog = source => {
  const block = section(
    source,
    'const providerProducts:',
    '\n\nconst quantityFromCode'
  )
  const result = []
  let provider
  let itemType
  for (const line of block.split('\n')) {
    const providerMatch = line.match(/^  ([A-Z_]+): \{$/)
    if (providerMatch) {
      provider = providerMatch[1]
      itemType = undefined
      continue
    }
    const itemMatch = line.match(/^    \[(TICKET|SKYPASS)\]: \[/)
    if (itemMatch) {
      itemType = itemMatch[1] === 'TICKET' ? 'SW_CONQUEST_TICKET' : 'SW_SKYPASS'
    }
    if (provider && itemType) {
      for (const codeMatch of line.matchAll(/'([^']+)'/g)) {
        result.push(`${provider}/${itemType}/${codeMatch[1]}`)
      }
    }
    if (itemType && (/^\s*\],?$/.test(line) || /\]: \[[^\]]*\]/.test(line))) {
      itemType = undefined
    }
  }
  return result
}

export const paymentProductWireErrors = (
  generatedSource,
  productSource,
  rpcSource,
  productCatalog,
  productWire,
  api,
  packageSource
) => {
  const errors = []
  const expectedFields = [
    field('Provider', '*PaymentProvider', 'provider'),
    field('ItemType', '*ItemType', 'itemType'),
    field('Code', 'string', 'code'),
    field('Quantity', 'uint16', 'quantity')
  ]
  if (
    JSON.stringify(
      structFields(structBody(generatedSource, 'PaymentProviderProduct'))
    ) !== JSON.stringify(expectedFields)
  ) {
    errors.push('source PaymentProviderProduct JSON contract changed')
  }
  if (
    JSON.stringify(enumNames(generatedSource, 'PaymentProvider')) !==
    JSON.stringify([
      'UNKNOWN',
      'GOOGLE_PLAY',
      'APPLE_APP_STORE',
      'STRIPE',
      'SEQUENCE',
      'SAMSUNG_GALAXY_STORE'
    ])
  ) {
    errors.push('source PaymentProvider enum changed')
  }
  if (
    JSON.stringify(enumNames(generatedSource, 'ItemType')) !==
    JSON.stringify([
      'UNKNOWN',
      'USDC',
      'SW_BASE_CARDS',
      'SW_SKYPASS',
      'SW_TITLES',
      'SW_STICKER_POINTS',
      'SW_XP',
      'SW_SILVER_DUST',
      'SW_SILVER_CARDS',
      'SW_GOLD_CARDS',
      'SW_CONQUEST_TICKET',
      'SW_CRYSTALS',
      'SW_STICKERS',
      'SW_HERO_SKINS',
      'SW_CARD_BACKS',
      'SW_HERO'
    ])
  ) {
    errors.push('source ItemType enum changed')
  }

  const sourceCatalog = goCatalog(productSource)
  const workerCatalog = tsCatalog(productCatalog)
  if (
    !sourceCatalog.length ||
    JSON.stringify(workerCatalog) !== JSON.stringify(sourceCatalog)
  ) {
    errors.push('main Worker payment product catalog drifted from Go source')
  }
  for (const token of [
    'func ListPaymentProviderProducts(provider proto.PaymentProvider, itemType *proto.ItemType, priceItemType proto.ItemType) (products []*PaymentProviderProduct)',
    'if _, ok := paymentProviderProducts[provider]; !ok {',
    'return nil',
    'index := strings.LastIndex(code, "_")',
    'return uint16(quantity)'
  ]) {
    if (!productSource.includes(token)) {
      errors.push(`source payment catalog construction changed: ${token}`)
    }
  }
  for (const token of [
    'var result []*proto.PaymentProviderProduct',
    'result = append(result, product.PaymentProviderProduct)',
    'return result, nil'
  ]) {
    if (!rpcSource.includes(token)) {
      errors.push(`source payment product response changed: ${token}`)
    }
  }
  for (const token of [
    "code.lastIndexOf('_') + 1",
    'quantity >= 0 && quantity <= 65_535',
    ': 1'
  ]) {
    if (!productCatalog.includes(token)) {
      errors.push(`main Worker quantity parsing drifted: ${token}`)
    }
  }

  const compactWire = productWire.replace(/\s+/g, ' ')
  for (const token of [
    'provider: product.provider ?? null',
    'itemType: product.itemType ?? null',
    "code: product.code ?? ''",
    'quantity: product.quantity ?? 0',
    'products.length ? products.map(sourcePaymentProviderProductWire) : null'
  ]) {
    if (!compactWire.includes(token)) {
      errors.push(`main Worker payment product wire is missing: ${token}`)
    }
  }

  if (!api.includes("from './payment-provider-product-wire'")) {
    errors.push('main Worker lost the shared payment product wire import')
  }
  if (
    !section(
      api,
      "case 'ListPaymentProviderProducts':",
      "case 'VerifySamsungGalaxyStorePayment':"
    ).includes('sourceNullablePaymentProviderProductListWire(')
  ) {
    errors.push('ListPaymentProviderProducts bypasses source normalization')
  }

  const scripts = JSON.parse(packageSource).scripts ?? {}
  if (
    scripts['check:cloudflare:payment-product-wire'] !==
    'node --test ./utils/check-cloudflare-payment-product-wire.test.mjs && node ./utils/check-cloudflare-payment-product-wire.mjs'
  ) {
    errors.push('package scripts lost the payment product wire gate')
  }
  if (
    !String(scripts['build:cloudflare']).includes(
      'pnpm check:cloudflare:payment-product-wire'
    )
  ) {
    errors.push('complete Cloudflare build bypasses the payment product gate')
  }
  return errors
}

const main = async () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  const files = [
    'api/proto/api.gen.go',
    'api/data/payment_provider_product.go',
    'api/rpc/payments.go',
    'cloudflare/src/payment-provider-products.ts',
    'cloudflare/src/payment-provider-product-wire.ts',
    'cloudflare/src/api.ts',
    'package.json'
  ]
  const values = await Promise.all(
    files.map(file => readFile(path.join(root, file), 'utf8'))
  )
  const errors = paymentProductWireErrors(...values)
  if (errors.length) {
    console.error(errors.join('\n'))
    process.exitCode = 1
  } else {
    console.log(
      'Payment product enums, catalog, required pointers, quantities, and nil lists preserve generated Go semantics'
    )
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  await main()
}
