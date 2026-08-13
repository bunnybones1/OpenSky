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
- Google-auth product copy describes these items as Cloud Weasel inventory,
  collectibles, exchanges, claims, or deliveries. Mint/tradable badges and
  blockchain-wallet reward copy remain confined to the legacy-wallet product.
- WalletConnect remains optional. A verified wallet may contribute read-only
  external ownership to content views, but it does not authenticate the player,
  own the Cloud Weasel account, or become the destination for earned rewards.
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

Existing SkyPass claim receipts, Conquest delivery keys, leaderboard award
receipts, referral-sticker award batches, and Stripe webhook receipts are the
reference implementations. New reward paths must test duplicate, concurrent,
rollback, and retry behavior before production deployment. The release gate
scans every producer module for both canonical `player_items` writes and an
idempotent receipt/delivery key, in addition to excluding transaction code from
the Google-identity route tree.

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
`SendTxnsRunner`. Eight have an active source producer and must remain linked to
an off-chain implementation or an explicit dormant product gate; five have no
production producer and must stay producerless unless reviewed. A newly added
queue, a revived producerless task, or missing Cloudflare evidence fails the
production build.

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
