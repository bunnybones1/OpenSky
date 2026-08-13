import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { authModeAuditErrors, EXPECTED_AUTH_MODE_FILES } from './audit-cloudflare-auth-mode.mjs'

const validSources = () => Object.fromEntries(
  Object.entries(EXPECTED_AUTH_MODE_FILES).map(([file, [count]]) => [file, 'AUTH_MODE\n'.repeat(count)])
)

const validFidelity = () => ({
  linkSection: '<ItemsLink isHorizontal={isHorizontal} /> <RanksLink isHorizontal={isHorizontal} />',
  itemsLink: 'to={makeItemsDecksRoute()}',
  marketLink: "isIdentityMarket = env.AUTH_MODE === 'google' makeNavigateToMarketDecksRoute() useCart(!isIdentityMarket)",
  playLink: 'useStoredMatchInfo() useIsTutorialCompleted() authedAccount.level >= 15',
  profileLink: 'IdentityProfileLink something <IdentityInventoryInfo />',
  profileInventory: 'identity-inventory-summary useTokenBalances useConquestAndUSDCBalances',
  expandedTag: "env.AUTH_MODE === 'google' ? <IdentityInventoryInfo /> : <WalletInfo />",
  accountInventory: 'CLOUD WEASEL INVENTORY useCardBalanceOverview useConquestAndUSDCBalances',
  feed: 'event.type === FeedEventType.REWARD getCardsFromTokenIds(_tokenIds)',
  playerRpc: "player_conquest_v2_reward_feed_events type: 'REWARD' tokenIds: parseJsonArray(row.token_ids_json).map(Number)",
  policy: 'Every preserved source behavior that required minting grants an equivalent off-chain item or entitlement. Minting is never a reason to remove an earning flow, reward, or reward receipt from the identity product. No original earning, purchase, or reward behavior may be retired because its fulfillment used minting.'
})

test('accepts the current reviewed identity divergence inventory', async () => {
  const files = Object.keys(EXPECTED_AUTH_MODE_FILES)
  const sources = Object.fromEntries(await Promise.all(files.map(async file => [file, await readFile(`webapp/src/${file}`, 'utf8')])))
  assert.deepEqual(authModeAuditErrors({ sources, fidelity: validFidelity() }), [])
})

test('rejects a new branch, count drift, hidden navigation, wallet capability, and lost reward receipt', () => {
  const sources = validSources()
  sources['new-unreviewed.tsx'] = 'AUTH_MODE'
  sources['App.tsx'] += 'AUTH_MODE'
  delete sources['env.ts']
  const fidelity = validFidelity()
  fidelity.linkSection = '<RanksLink isHorizontal={isHorizontal} /> makeItemsCardsRoute'
  fidelity.marketLink = 'makeMarketCardsRoute()'
  fidelity.playLink = 'AUTH_MODE practice only'
  fidelity.profileInventory += ' AuthenticationClient sendTransaction'
  fidelity.profileLink = 'IdentityProfileLink'
  fidelity.expandedTag = '<WalletInfo />'
  fidelity.playerRpc = "type: 'CONQUEST_V2_REWARD' amountUSDC"
  fidelity.policy = 'Rewards might be hidden.'
  const errors = authModeAuditErrors({ sources, fidelity })
  assert.ok(errors.some(error => error.includes('unreviewed AUTH_MODE')))
  assert.ok(errors.some(error => error.includes('reviewed count')))
  assert.ok(errors.some(error => error.includes('disappeared')))
  assert.ok(errors.some(error => error.includes('Decks destination')))
  assert.ok(errors.some(error => error.includes('Market navigation')))
  assert.ok(errors.some(error => error.includes('source route selector')))
  assert.ok(errors.some(error => error.includes('wallet capability')))
  assert.ok(errors.some(error => error.includes('profile chrome')))
  assert.ok(errors.some(error => error.includes('account chrome')))
  assert.ok(errors.some(error => error.includes('off-chain card evidence')))
  assert.ok(errors.some(error => error.includes('equivalence policy')))
})
