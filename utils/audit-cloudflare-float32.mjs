import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const faithful = (evidenceFiles, evidence) => ({
  disposition: 'source-faithful-wire',
  evidenceFiles,
  evidence
})

const reviewed = (disposition, evidenceFiles, evidence) => ({
  disposition,
  evidenceFiles,
  evidence
})

// RIDL float32 is a wire contract, not merely a TypeScript `number`. Go's JSON
// encoder emits the shortest decimal that round-trips to the same float32.
// Every source message field therefore needs either matching boundary logic or
// an explicit Cloud Weasel product disposition with executable evidence.
export const REVIEWED_FLOAT32_FIELDS = {
  'AccountStat.winRatio': faithful(
    [
      'cloudflare/src/competitive.ts',
      'cloudflare/src/go-numbers.ts',
      'cloudflare/test/player-rpc.test.ts'
    ],
    [
      'winRatio: goFloat32Ratio(row.win_count, gamesPlayed)',
      '"winRatio":0.33333334'
    ]
  ),
  'AccountStat.rankProgress': faithful(
    [
      'cloudflare/src/competitive.ts',
      'cloudflare/src/go-numbers.ts',
      'cloudflare/test/player-rpc.test.ts'
    ],
    ['goFloat32FloorHundredthsRatio', '"rankProgress":0.58']
  ),
  'FeedEvent.conquestV2Reward': reviewed(
    'offchain-card-reward-replaces-cash-field',
    ['cloudflare/src/player-rpc.ts', 'docs/OFFCHAIN_REWARD_POLICY.md'],
    ["type: 'REWARD'", 'actual off-chain card value', 'Conquest V2']
  ),
  'DeckRank.winRatio': faithful(
    [
      'cloudflare/src/deck-ranks.ts',
      'cloudflare/src/go-numbers.ts',
      'cloudflare/test/deck-ranks-rpc.test.ts'
    ],
    [
      'win_ratio: goFloat32Ratio(row.win_count, row.games_played)',
      '"winRatio":0.33333334'
    ]
  ),
  'DeckRank.gamesPlayed': faithful(
    ['cloudflare/src/deck-ranks.ts', 'cloudflare/test/deck-ranks-rpc.test.ts'],
    [
      'gamesPlayed: goFloat32(row.games_played)',
      '"gamesPlayed":16777216',
      "[string1, '16777217']"
    ]
  ),
  'ConquestStats.discoveryWinRate': faithful(
    ['cloudflare/src/conquest.ts', 'cloudflare/test/conquest-rpc.test.ts'],
    ['result.discoveryWinRate = goFloat32Percentage(', 'discoveryWinRate: 100']
  ),
  'ConquestStats.constructedWinRate': faithful(
    ['cloudflare/src/conquest.ts', 'cloudflare/test/conquest-rpc.test.ts'],
    [
      'result.constructedWinRate = goFloat32Percentage(',
      '"constructedWinRate":33.333336'
    ]
  ),
  'IAPPurchaseRequest.totalPrice': reviewed(
    'superseded-legacy-iap-request',
    ['cloudflare/src/api.ts'],
    [
      "case 'IAPVerifyGoogleProducts2'",
      'VerifyGooglePlayPayment with the signed-in identity',
      "case 'IAPVerifyAppleProducts2'",
      'VerifyAppleAppStorePayment with the signed-in identity'
    ]
  ),
  'IAPPurchaseRequest.pricePerUnit': reviewed(
    'superseded-legacy-iap-request',
    ['cloudflare/src/api.ts'],
    [
      "case 'IAPVerifyGoogleProducts2'",
      'VerifyGooglePlayPayment with the signed-in identity',
      "case 'IAPVerifyAppleProducts2'",
      'VerifyAppleAppStorePayment with the signed-in identity'
    ]
  ),
  'AccountSignal.score': reviewed(
    'neutral-moderation-compatibility-value',
    [
      'cloudflare/src/staff.ts',
      'docs/CLOUDFLARE_MODERATION_SCORE.md',
      'cloudflare/test/staff-rpc.test.ts'
    ],
    [
      'Aggregate fraud probability belongs to a',
      'score: 0',
      'neutral compatibility value'
    ]
  ),
  'ConquestV2Pool.totalWeight': reviewed(
    'offchain-zero-public-cash-pool',
    ['cloudflare/src/api.ts', 'cloudflare/test/conquest-rpc.test.ts'],
    ["case 'ConquestV2Pool'", 'pool: { amount: 0, totalWeight: 0 }']
  ),
  'ConquestV2PoolConfigData.topWeightUnitPrice': faithful(
    [
      'cloudflare/src/conquest-v2-economy.ts',
      'cloudflare/test/conquest-v2-economy.test.ts'
    ],
    [
      "validateUpdate(\n        'topWeightUnitPrice'",
      'return goFloat32(value)',
      'topWeightUnitPrice: 2'
    ]
  ),
  'ConquestV2PoolConfigData.bottomWeightUnitPrice': faithful(
    [
      'cloudflare/src/conquest-v2-economy.ts',
      'cloudflare/test/conquest-v2-economy.test.ts'
    ],
    [
      "validateUpdate(\n        'bottomWeightUnitPrice'",
      'return goFloat32(value)',
      'bottomWeightUnitPrice: 1.8'
    ]
  ),
  'ConquestV2PoolConfigData.weightPerSilverCard': faithful(
    [
      'cloudflare/src/conquest-v2-economy.ts',
      'cloudflare/test/conquest-v2-economy.test.ts'
    ],
    [
      "validateUpdate(\n        'weightPerSilverCard'",
      'return goFloat32(value)',
      'weightPerSilverCard: 0.05'
    ]
  ),
  'ConquestV2TreasureLevelSummary.totalWeight': faithful(
    [
      'cloudflare/src/conquest-v2-economy.ts',
      'cloudflare/test/conquest-v2-economy.test.ts'
    ],
    ['totalWeight: goFloat32(', 'totalWeight: 3.19']
  ),
  'ConquestV2Summary.totalWeight': faithful(
    [
      'cloudflare/src/conquest-v2-economy.ts',
      'cloudflare/test/conquest-v2-economy.test.ts'
    ],
    ['totalWeight: goFloat32(totalWeight)', 'summary.totalWeight).toBe(4.19)']
  ),
  'ConquestV2Summary.weightUnitPrice': faithful(
    [
      'cloudflare/src/conquest-v2-economy.ts',
      'cloudflare/test/conquest-v2-economy.test.ts'
    ],
    [
      'weightUnitPrice: roundWeightUnitPrice(pool.amount, totalWeight)',
      'summary.weightUnitPrice).toBe(0.2387)'
    ]
  ),
  'NotificationConquestV2Reward.amountUSDC': reviewed(
    'offchain-zero-cash-notification',
    [
      'cloudflare/src/conquest-v2-reward-worker.ts',
      'cloudflare/test/conquest-v2-reward-worker.test.ts',
      'docs/OFFCHAIN_REWARD_POLICY.md'
    ],
    ['amountUSDC: 0 as const', 'amountUSDC: 0', 'Conquest V2']
  ),
  'GooglePlayPaymentResponse.totalPrice': reviewed(
    'provider-verified-client-price-not-authority',
    [
      'cloudflare/src/mobile-store-verification.ts',
      'cloudflare/test/google-play-verification.test.ts'
    ],
    [
      'androidpublisher/v3/applications/',
      'purchase.orderId !== transactionId',
      'verification_sha256'
    ]
  ),
  'AppleAppStorePaymentResponse.totalPrice': reviewed(
    'provider-signed-milliunit-price-authority',
    [
      'cloudflare/src/mobile-store-verification.ts',
      'cloudflare/test/apple-app-store-verification.test.ts'
    ],
    [
      'Math.round(providerResponse.totalPrice * 1_000) !== priceMilliunits',
      'totalPrice: priceMilliunits / 1_000',
      'signedTransactionInfo'
    ]
  ),
  'SamsungGalaxyStorePaymentResponse.itemPrice': reviewed(
    'provider-receipt-price-authority',
    [
      'cloudflare/src/mobile-store-verification.ts',
      'cloudflare/test/mobile-store-verification.test.ts'
    ],
    [
      'const totalPrice = Number(receipt.paymentAmount)',
      "paymentAmount: '7.99'",
      "receipt.mode !== 'PRODUCTION'"
    ]
  ),
  'AnalyticsItemPurchase.pricePerUnit': reviewed(
    'superseded-by-verified-payment-ledger',
    [
      'cloudflare/src/mobile-store-fulfillment.ts',
      'cloudflare/migrations/0062_mobile_store_offchain_fulfillment.sql',
      'cloudflare/migrations/0081_mobile_store_fulfillment_receipts.sql'
    ],
    ['mobile_store_payments', 'before_balance', 'verification_sha256']
  ),
  'AnalyticsItemPurchase.totalPrice': reviewed(
    'superseded-by-verified-payment-ledger',
    [
      'cloudflare/src/mobile-store-fulfillment.ts',
      'cloudflare/migrations/0062_mobile_store_offchain_fulfillment.sql',
      'cloudflare/migrations/0081_mobile_store_fulfillment_receipts.sql'
    ],
    ['mobile_store_payments', 'before_balance', 'verification_sha256']
  )
}

export const extractMessageFloat32Fields = source => {
  const fields = []
  let message
  for (const line of source.split(/\r?\n/)) {
    const messageMatch = /^message\s+([A-Za-z_][A-Za-z0-9_]*)\s*$/.exec(line)
    if (messageMatch) {
      message = messageMatch[1]
      continue
    }
    if (/^\S/.test(line)) {
      message = undefined
      continue
    }
    if (!message) continue
    const fieldMatch =
      /^\s+-\s+([A-Za-z_][A-Za-z0-9_]*)\??:\s*float32(?:\s|$)/.exec(line)
    if (fieldMatch) fields.push(`${message}.${fieldMatch[1]}`)
  }
  return fields
}

export const float32AuditErrors = ({
  source,
  evidenceSources,
  reviews = REVIEWED_FLOAT32_FIELDS
}) => {
  const errors = []
  const actual = new Set(extractMessageFloat32Fields(source))
  const reviewedFields = new Set(Object.keys(reviews))

  for (const field of actual) {
    if (!reviewedFields.has(field)) {
      errors.push(`unreviewed source float32 message field: ${field}`)
    }
  }
  for (const [field, review] of Object.entries(reviews)) {
    if (!actual.has(field)) {
      errors.push(`reviewed source float32 message field disappeared: ${field}`)
      continue
    }
    if (
      !review.disposition ||
      !review.evidenceFiles?.length ||
      !review.evidence?.length
    ) {
      errors.push(`incomplete float32 review: ${field}`)
      continue
    }
    const evidence = evidenceSources[field] ?? ''
    for (const token of review.evidence) {
      if (!evidence.includes(token)) {
        errors.push(
          `${field} is missing ${review.disposition} evidence: ${token}`
        )
      }
    }
  }
  return errors
}

const main = async () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  const source = await readFile(path.join(root, 'api/proto/api.ridl'), 'utf8')
  const evidenceSources = Object.fromEntries(
    await Promise.all(
      Object.entries(REVIEWED_FLOAT32_FIELDS).map(async ([field, review]) => [
        field,
        (
          await Promise.all(
            review.evidenceFiles.map(file =>
              readFile(path.join(root, file), 'utf8')
            )
          )
        ).join('\n')
      ])
    )
  )
  const errors = float32AuditErrors({ source, evidenceSources })
  if (errors.length) {
    for (const error of errors) {
      process.stderr.write(`Float32 contract audit: ${error}\n`)
    }
    process.exitCode = 1
    return
  }
  const dispositionCounts = Object.values(REVIEWED_FLOAT32_FIELDS).reduce(
    (counts, review) => {
      counts[review.disposition] = (counts[review.disposition] ?? 0) + 1
      return counts
    },
    {}
  )
  process.stdout.write(
    `All ${Object.keys(REVIEWED_FLOAT32_FIELDS).length} source float32 message fields have reviewed Cloudflare dispositions\n`
  )
  for (const [disposition, count] of Object.entries(dispositionCounts).sort()) {
    process.stdout.write(`${disposition}: ${count}\n`)
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  await main()
}
