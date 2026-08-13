# Cloud Weasel off-chain reward policy

Cloud Weasel launches with Google identity accounts and no migrated OpenSky
players. D1 inventory is the canonical authority for game rewards. A source
item-type name may remain in the compatibility wire format, but it does not
imply an NFT, token mint, blockchain transaction, or cash-redemption right.

## Product boundary

- Quests, the basic SkyPass, Conquest, leaderboard awards, purchases, and
  support grants credit off-chain `player_items` or the relevant identity-
  scoped entitlement/ledger.
- No game flow asks a player to mint a reward or prepares a transaction that
  transfers a game reward to a wallet.
- Every preserved source behavior that required minting grants an equivalent
  off-chain item or entitlement. A reward may disappear only when its entire
  earning or purchase behavior is explicitly retired; removing only the mint
  step is not a valid disposition.
- Google-auth product copy describes these items as Cloud Weasel inventory,
  collectibles, exchanges, claims, or deliveries. Mint/tradable badges and
  blockchain-wallet reward copy remain confined to the legacy-wallet product.
  A successful Google-identity claim must also stay in that product boundary:
  post-claim wallet-conversion prompts are legacy-wallet behavior and cannot be
  reached after an off-chain delivery.
- WalletConnect remains optional. A verified wallet may contribute read-only
  external ownership to content views, but it does not authenticate the player,
  own the Cloud Weasel account, or become the destination for earned rewards.
  The wallet-content adapter is an authenticated observational projection. It
  filters a configured chain and contract, never writes `player_items`, and is
  included in the same release-gate scan as game analytics.
  The browser connector requests only `personal_sign`; transaction signing,
  sending, swaps, on-ramps, wallet-based authentication, and connector
  analytics are disabled and guarded by the production release check.
- Legacy burner/account migration is retired for the zero-user launch. Future
  identity providers must link to the Google-owned account through a new
  reviewed flow, not revive the source migration RPCs.
- Mobile-store receipts, if Cloud Weasel ships them, must fulfill the same
  off-chain inventory contract as Stripe. Store verification never mints.
- Source-only operator grants follow the same rule. The legacy `grant-cards`
  command's contract mint is replaced by the capability-gated player-support
  `GMGrantBaseCards` adapter and immutable request receipt in `player_items`; it
  never becomes a Cloudflare contract call. The source's all/prism selection is
  preserved, while its wallet address is replaced by an identity reference.
- Additive staff level grants also require a browser-generated operation key.
  The D1 receipt snapshots the profile, basic SkyPass, and inviter ledgers,
  then applies every mutation and an immutable audit row before transitioning
  to `APPLIED`. Retrying one operator click cannot grant again, while a new
  deliberate click remains a distinct source-faithful grant.

## Required grant invariants

Every reward producer must:

1. Bind the grant to a Google identity and a stable source event or idempotency
   key.
2. Apply the inventory change and fulfillment receipt in one D1 transaction.
3. Make retries and concurrent delivery safe; one source event grants at most
   once.
4. Record enough immutable evidence to reconcile the source, item type, token
   or content ID, quantity, actor/system, and time without storing provider
   secrets.
5. Keep item IDs in the established off-chain representation. Wallet token-ID
   encoding belongs only in an optional ownership adapter.

Existing quest-XP and SkyPass claim receipts, Conquest delivery keys,
leaderboard award receipts, referral-sticker award batches, and Stripe webhook
receipts are the reference implementations. New reward paths must test
duplicate, concurrent, rollback, and retry behavior before production
deployment. The release gate scans every producer module for both canonical
`player_items` writes and an idempotent receipt/delivery key, in addition to
excluding transaction code from the Google-identity route tree.

Quest rewards preserve the source `SW_XP` contract as identity-owned
progression; they never mint an item. Each completed assignment owns one
immutable receipt keyed by identity and source quest. A D1 claim batch computes
the before/after level and SkyPass XP snapshots from database state, applies all
progression and epic-chain mutations atomically, and completes only when every
requested assignment has a valid receipt. Concurrent different claims
accumulate instead of overwriting one another, while a duplicate claim cannot
credit XP or create another epic step. As in the source leveller, each level
crossed also credits one off-chain sticker point to the player's inviter in the
same batch; no wallet or sticker mint is involved.

Conquest V2 weekly treasure follows the same rule. Its source point thresholds,
float32 weights, point rollover, expansion-only card selection, and delayed
delivery are preserved. Minted Silver is replaced by `SW_SILVER_CARDS` in D1,
protected by an immutable cycle entry and award receipt. Activation is rejected
unless every qualifying treasure level receives at least one off-chain item.
The former USDC amount is reconciliation metadata only: it must never become
inventory, a claim, a notification value, or player-facing promise without a
separately reviewed noncash reward design.

The Google-auth webapp must project only deliverable Conquest V2 value. With no
enabled safe schedule, treasure tooltips say rewards are inactive. With one,
the public source-shaped contract reports exact Silver counts and always zero
USDC. Identity-mode notification and feed branches fail closed against legacy
cash fields, while the preserved wallet UI may continue rendering its original
contracts outside `IdentityApp`.

The Legacy Hero exchange is also governed by this policy. It retains the
source product's price of ten identity-owned Gold cards per Hero skin, but D1
atomically debits the selected Gold inventory and credits `SW_HERO_SKINS`.
There is no USDC fee, wallet transfer, contract call, or minted asset. An
immutable request receipt makes retries safe, and database triggers validate
the complete price and available inventory before any balance changes.

The mobile-store fulfillment ledger is also part of this boundary. It accepts
only server-verified provider facts, binds the provider transaction to one
Google identity with a database uniqueness constraint, stores only receipt
digests, and grants tickets or the current season's premium SkyPass directly in
D1. Google Play, Samsung, and Apple provider facts all converge on that same
ledger. Apple uses the production App Store Server API plus a verified signed
transaction chain rooted in pinned Apple PKI certificates; the deprecated
receipt blob is not reward authority. Provider credentials and raw purchase
tokens never enter reward evidence.

The source transaction-queue audit also inventories all 13 queues consumed by
`SendTxnsRunner`. Eight have an active source producer and five are source-
producerless compatibility queues. Every queue, including the producerless
ones, is linked to an off-chain implementation or an explicit whole-feature
retirement. A newly added queue, a revived producerless task, or missing
Cloudflare evidence fails the production build. The producerless Conquest
extra-reward transfer is the only whole-feature retirement: the source has no
production producer, and Cloud Weasel has no corresponding earning or purchase
flow. `SendConquestExtraRewardQueue` therefore has no production producer and
must remain unavailable unless a reviewed off-chain reward design is added
first.

The browser transaction audit separately freezes every direct transaction
callsite in the preserved webapp. Product surfaces excluded from `IdentityApp`,
legacy-wallet infrastructure, and the guarded Silver and Hero exchanges each
have an explicit disposition and reviewed callsite count. A new callsite, a
newly reachable legacy product surface, or an identity exchange that can fall
through to the wallet branch fails the production build.

The source chain-effect audit is broader than the transaction-queue and browser
audits. It discovers executable Go calls that mint, send a transaction, compose
a token transfer, or compose an on-chain payment. Every current callsite has an
exact count and an off-chain or zero-user-retirement disposition. Contract ABI
wrappers are excluded because they do not execute a product action themselves;
any new use of one from product code is discovered and fails the build until it
has an explicit Cloud Weasel replacement.

The source reward-producer audit starts one layer earlier. It inventories every
Go file that directly grants XP, tickets, sticker points, heroes, starter decks,
or item rows—even if that file never calls a contract itself. Exact callsite
counts and implementation evidence cover account bootstrap, matches, quests,
SkyPass, commerce, leaderboard/referral rewards, and operator/repair flows. A
new producer or an expanded producer fails the build until its complete earning
behavior has an off-chain TypeScript destination or a reviewed whole-feature
retirement.

The destination-side reward-mutator audit independently freezes every direct
TypeScript write to authoritative inventory, card unlocks, XP/profile state,
basic SkyPass state, Conquest points, and referral points. Each writer has an
exact callsite count plus a reviewed receipt, support audit, entry-spend, or
deterministic-bootstrap disposition. A new writer, a changed writer, missing
receipt evidence, or any chain-effect call beside a reward write fails the
Cloudflare build. This ensures that Cloud Weasel-only features are held to the
same no-mint rule as behavior ported from Go.

Match and quest XP use immutable per-award D1 receipts. Their before/after
level state is calculated inside the same serialized batch that updates the
profile, basic SkyPass, ranked unlock, and referral sticker points. Concurrent
claims or different matches ending together therefore add every earned reward
without either overwriting the other, while a retry returns the existing
receipt without granting again.

Ranked player and deck rating transitions are stateful rather than additive.
The game server therefore serializes both through one global Durable Object in
the source operation order. This prevents simultaneous match completions from
losing counters, Glicko changes, or the rank-up XP receipt passed into the
off-chain experience settlement.

Conquest event points likewise use immutable per-player match receipts. The
source 13,750-point cap and before/after treasure progress are calculated from
the current D1 balance inside settlement, so simultaneous matches cannot award
the same remaining cap space or report stale progress.

Tutorial/local-bot quest progress uses the same serialized receipt pattern.
Each stable match report snapshots the quest progress actually available when
its D1 batch runs, applies only that delta, and then completes the receipt.
Concurrent distinct reports cannot claim the same remaining progress, while
simultaneous retries of one report cannot replay it.

The Cloudflare release gate also keeps the preserved legacy transaction pages
out of `IdentityApp`. Premium SkyPass is currently disabled; when product and
Stripe configuration are ready, its original page may return only after the
USDC/silver mint controls are removed and Checkout continues to fulfill the
off-chain receipt contract. The same rule applies to any future paid Conquest
ticket UI. The Hero-skin interface may be exposed to Google identities only
through the off-chain Gold exchange; its legacy wallet transaction
implementation remains excluded.

## Source RPC disposition

`PrepareOnChainTransaction`, `PrepareOnChainInCurrencyTransaction`,
`PrepareOnChainInItemsTransaction`, and
`PrepareTransferAssetsFromBurnerTransaction` are superseded by this policy,
not waiting to be copied. `MigrateAccount` and `MigrateFromBurner` are retired.
`RequestAccountDeletion` is already replaced by the Google OIDC step-up web
flow. The mechanical audit keeps these source names visible and separately
reports the small set of genuinely actionable integration gaps.

The deprecated `IAPVerifyGoogleProducts2` and `IAPVerifyAppleProducts2`
contracts are explicit authenticated tombstones. Their source behavior selected
the account from a caller-provided wallet address, so it cannot be adapted to a
Google-owned identity without weakening authorization. Current mobile clients
must use the modern provider-verification RPCs, which always fulfill the signed-
in identity. `JoinEarlyAccessList` is also retired: Cloud Weasel is a live fork,
not a new waitlist, and has no Mailchimp dependency.
