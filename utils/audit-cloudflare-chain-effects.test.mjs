import assert from 'node:assert/strict'
import test from 'node:test'

import {
  chainEffectAuditErrors,
  chainEffectCount,
  EXPECTED_CHAIN_EFFECT_FILES,
  mintEffectCount
} from './audit-cloudflare-chain-effects.mjs'

const callsites = count => '.Mint()\n'.repeat(count)
const transferCallsites = count => '.ComposeTransfer()\n'.repeat(count)

const reviewedInput = () => ({
  sources: Object.fromEntries(
    Object.entries(EXPECTED_CHAIN_EFFECT_FILES).map(([file, review]) => [
      file,
      review.disposition.startsWith('retired')
        ? transferCallsites(review.count)
        : callsites(review.count)
    ])
  ),
  evidenceSources: Object.values(EXPECTED_CHAIN_EFFECT_FILES).reduce(
    (evidence, review) => ({
      ...evidence,
      [review.disposition]: [
        evidence[review.disposition],
        ...review.evidence
      ]
        .filter(Boolean)
        .join(' ')
    }),
    {}
  )
})

test('counts source mint, transfer, payment, and transaction execution', () => {
  assert.equal(
    chainEffectCount(`
      cardcontract.Mint()
      artifact.Encode("batchMint", to, ids)
      wallet.SendTransactions(ctx, signed)
      contract.ComposeSafeBatchTransferFrom(from, to, tokens, nil)
      composer.ComposeERC1155(ctx, account, product, quantity, ids)
    `),
    5
  )
  assert.equal(
    mintEffectCount(`
      cardcontract.Mint()
      cardcontract.BatchMint()
      artifact.Encode("batchMint", to, ids)
      wallet.SendTransactions(ctx, signed)
      contract.ComposeSafeBatchTransferFrom(from, to, tokens, nil)
    `),
    3
  )
})

test('accepts the complete reviewed source chain-effect map', () => {
  assert.deepEqual(chainEffectAuditErrors(reviewedInput()), [])
})

test('rejects a new effect, changed callsite count, and missing evidence', () => {
  const input = reviewedInput()
  input.sources['api/new_reward_minter.go'] = 'contract.Mint()'
  input.sources['api/lib/jobqueue/send_txns_runner.go'] += 'wallet.SendTransactions()'
  input.evidenceSources['offchain-operator-grant'] = ''
  const errors = chainEffectAuditErrors(input)
  assert.ok(errors.some(error => error.includes('unreviewed source')))
  assert.ok(errors.some(error => error.includes('reviewed count')))
  assert.ok(errors.some(error => error.includes('missing disposition evidence')))
})

test('forbids retiring any original mint outcome', () => {
  const input = reviewedInput()
  const review = EXPECTED_CHAIN_EFFECT_FILES['api/cmd/grant-cards/_main.go']
  const original = review.disposition
  try {
    review.disposition = 'retired-zero-user-feature'
    input.evidenceSources['retired-zero-user-feature'] = review.evidence.join(' ')
    const errors = chainEffectAuditErrors(input)
    assert.ok(
      errors.some(error =>
        error.includes('executes a source mint and must have an offchain disposition')
      )
    )
  } finally {
    review.disposition = original
  }
})
