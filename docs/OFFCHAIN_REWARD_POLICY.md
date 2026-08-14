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
  off-chain item or entitlement. No original earning, purchase, or reward
  behavior may be retired because its fulfillment used minting; the player
  outcome must remain and only its fulfillment authority changes.
- Minting is never a reason to remove an earning flow, reward, or reward receipt
  from the identity product. The original outcome remains visible and useful;
  only its fulfillment authority changes from a chain to authenticated D1.
- This applies to all remaining source slices: legacy mint calls describe the
  reward's timing and contents, never its Cloud Weasel fulfillment mechanism.
  New ports must preserve those outcomes through authenticated D1 inventory or
  another explicit off-chain entitlement with an immutable operation receipt.
- Configured reward content and reward activation are separate authorities.
  Raw catalog rows must not spend progression value or appear as earnable
  rewards until an immutable, independently reviewed schedule activates the
  exact off-chain contents and thresholds.
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
- The source mass-giveaway runner is also preserved rather than retired.
  `GMGrantItems` accepts the same token-codec item-type, item-ID, and positive-
  quantity map, but binds it to a Google identity and the dormant
  `PLAYER_SUPPORT_WRITE` capability. An immutable request receipt plus one
  before/after row per item makes retries and concurrent delivery exactly-once.
  Unsupported non-codec values such as USDC are rejected, and no grant creates
  a wallet asset or transaction.
- Additive staff level grants also require a browser-generated operation key.
  The D1 receipt snapshots the profile, basic SkyPass, and inviter ledgers,
  then applies every mutation and an immutable audit row before transitioning
  to `APPLIED`. Retrying one operator click cannot grant again, while a new
  deliberate click remains a distinct source-faithful grant.
- The staff premium SkyPass toggle uses the same per-click receipt boundary.
  One key owns its grant or removal direction, inventory balance, season state,
  cap accounting, and immutable audit row. A retry therefore returns the first
  result instead of toggling the entitlement a second time.

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

Referral sticker rewards retain the source thresholds, top-five friend-point
attribution, season carry-forward, 23-hour delay, and 100 copies of each earned
sticker. Raw content metadata remains dormant until a two-actor, append-only
schedule activates an exact set of IDs and thresholds; each deduction batch
records that schedule version. The former batch mint is an identity-inventory
delivery. A batch may
move from `DELIVERING` to `DELIVERED` only when an immutable per-sticker receipt
proves its exact before balance, 100-unit credit, and resulting balance in
`player_items`. A failed finalization rolls the entire delivery back for a
clean retry, and parallel scheduled runs cannot double-credit it.

SkyPass retains all source reward variants. The four former mint queues—
Conquest tickets, stickers, Silver cards, and card backs—join the already
database-owned base cards, heroes, sticker points, and titles in one identity-
inventory claim. Each claim declares its complete per-token grant plan while
`PREPARING`, records immutable before/after balances, and becomes `APPLIED`
only after inventory, base-card unlocks, and starter-deck state agree. A failed
mixed claim rolls back every reward and receipt together; retry and concurrent
claim attempts cannot grant the same reward twice.

SkyPass earning is scoped to the source season. Each player/season row records
the immutable zero-based account level at first participation and the monotonic
highest zero-based account level achieved. Account reads, reward earning, and
infinite-reward previewing expose the source's exact `achieved - initial`
progress. Match XP, quest XP, premium fulfillment, and staff support initialize
or advance that row inside their existing atomic operation or settlement batch.
Season-close auto-claim reads only rows whose achieved level exceeds their
initial level, so lifetime account progress cannot leak into a later season and
an absent season row cannot manufacture rewards.

An imported SkyPass CSV is preparation, not reward authority. It creates an
immutable, player-invisible draft containing the exact source digest and every
definition row. A different `ADMIN` holding `SKYPASS_REWARD_WRITE` must inspect
and activate that exact version before player reads, manual claims, or season
auto-claim can use it. Activation validates the supported source item types,
quantities, card and sticker IDs, ordering, and one infinite row against a
fulfillment digest that includes the generated card catalog, starter decks,
deterministic Silver selection, and every off-chain inventory mapping. Each new
claim records that policy version and digest. Active sticker metadata and all
versioned definitions are immutable, so an approved reward cannot silently
change before fulfillment.

Weekly leaderboard rewards preserve the source rank projections, deterministic
Silver selection, Conquest-ticket counts, per-mode feed records, and rank-up
metadata without minting either asset. Each immutable award records the exact
per-mode source result and moves from `PREPARING` to `APPLIED` only when every
Silver/ticket before-and-after balance, per-mode feed payload, and aggregate
notification agree. A finalization failure rolls the whole delivery back; a
later retry cannot grant the same cycle twice. An enabled cadence is not reward
authority by itself: a second actor must activate a digest covering the exact
rank curve, card-pool order and season validity, deterministic draw rule,
ranked modes, item types, token IDs, and quantities before the first weekly
boundary. Every cycle records that immutable policy version and digest before
snapshotting ranks, and its season/week are derived from the source calendar.

Delayed Conquest Gold keeps the source 24-hour delivery boundary but replaces
the mint with identity inventory. One cron claim owns a
`READY` -> `PREPARING` -> `APPLIED` receipt, immutable per-card quantities and
before/after balances, and the delivered feed event in one D1 batch. A failed
batch rolls all of those effects back before incrementing its bounded retry
counter; moderation can disable and later restore only unapplied deliveries.

Quest rewards preserve the source `SW_XP` contract as identity-owned
progression; they never mint an item. Each completed assignment owns one
immutable receipt keyed by identity and source quest. A D1 claim batch computes
the before/after level and SkyPass XP snapshots from database state, applies all
progression, season-scoped SkyPass progress, and epic-chain mutations atomically,
and completes only when every requested assignment has a valid receipt.
Concurrent different claims
accumulate instead of overwriting one another, while a duplicate claim cannot
credit XP or create another epic step. As in the source leveller, each level
crossed also credits one off-chain sticker point to the player's inviter in the
same batch; no wallet or sticker mint is involved.

Conquest V2 weekly treasure follows the same rule. Its source point thresholds,
float32 weights, point rollover, expansion-only card selection, and delayed
delivery are preserved. Minted Silver is replaced by `SW_SILVER_CARDS` in D1,
protected by an immutable cycle entry and award receipt. Each award moves from
`PREPARING` to `APPLIED` only after per-card before/after inventory snapshots,
the exact feed payload, and the zero-USDC notification all agree. A failed
completion rolls back all four effects, and a retry cannot double-credit them.
Activation is rejected unless every qualifying treasure level receives at
least one off-chain item. An enabled schedule is not reward authority: a
second actor must activate a digest covering the source thresholds, float32
quantity math, generated card catalog and season rules, deterministic draw,
off-chain item mapping, and zero-USDC player contract. Approval also binds the
exact current economy-settings version, mutation ID, Silver weight, and all
eleven resulting level quantities. A settings edit makes that approval dormant
before a cycle starts. Once a cycle freezes its exact settings and ordered
eligible-card pool in an immutable receipt and rolls over points, delivery
continues from that receipt even if settings later change, so an earned reward
cannot be stranded.
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
immutable request receipt makes retries safe. It moves from `PREPARING` to
`APPLIED` only after an immutable before/after snapshot proves every selected
Gold debit and Hero-skin credit. Database triggers validate the complete price,
available inventory, exact balance changes, and atomic completion.

The Silver-to-Conquest-ticket exchange retains the source one-card/one-entry
rate without transferring or minting an ERC-1155 asset. Its immutable receipt
moves from `PREPARING` to `APPLIED` only after per-card Silver debit snapshots
and the ticket credit snapshot match canonical identity inventory. Concurrent
requests serialize in D1; retries return the first applied result, and an
injected finalization failure rolls back the receipt and every balance change.

The mobile-store fulfillment ledger is also part of this boundary. It accepts
only server-verified provider facts, binds the provider transaction to one
Google identity with a database uniqueness constraint, stores only receipt
digests, and grants tickets or the current season's premium SkyPass directly in
D1. Its serialized receipt snapshots ticket/SkyPass balances and, for premium
SkyPass, the season entitlement flag; it cannot move from `PENDING` to
`SUCCEEDED` unless the exact resulting state exists. Concurrent distinct
purchases form a complete balance history, while a failed finalization rolls
back both payment evidence and entitlement. Google Play, Samsung, and Apple
provider facts all converge on that same ledger. Apple uses the production App
Store Server API plus a verified signed
transaction chain rooted in pinned Apple PKI certificates; the deprecated
receipt blob is not reward authority. Provider credentials and raw purchase
tokens never enter reward evidence.

The source transaction-queue audit also inventories all 13 queues consumed by
`SendTxnsRunner`. It discovers task producers across every executable Go file
under `api`, rather than trusting a curated package list. Eight queues have an
active source producer and five are source-producerless compatibility queues.
Every queue that represents a player outcome, including producerless
compatibility queues, is linked to an off-chain implementation. A newly added
queue, a producer moved into a new package, a revived producerless task, or
missing Cloudflare evidence fails the production build. The producerless
Conquest extra-reward transfer is classified only as unused infrastructure: it
is a treasury asset transfer rather than a mint, has no production producer,
and has no corresponding player earning, purchase, or reward flow. It is not a
retired product feature. `SendConquestExtraRewardQueue` must remain unavailable
unless a reviewed off-chain player outcome is added first.

The browser transaction audit separately freezes every direct transaction
callsite in the preserved webapp. Product surfaces excluded from `IdentityApp`,
legacy-wallet infrastructure, and the guarded Silver and Hero exchanges each
have an explicit disposition and reviewed callsite count. A new callsite, a
newly reachable legacy product surface, or an identity exchange that can fall
through to the wallet branch fails the production build.

Off-chain fulfillment must remain player-visible, not merely reconcilable in
D1. The reward-visibility audit binds every non-retired transaction queue to
the original product surface that shows its result:

- Conquest Silver and pending/delivered Gold appear in the rewards feed and
  pending-delivery page.
- Leaderboard and Conquest V2 awards atomically create feed and inbox rows; the
  original Home dialog renders their cards, ranks, and tickets.
- SkyPass claims return exact reward objects to the original claim dialog and
  persist matching feed/inventory state.
- Referral stickers appear as new items in the original sticker collection.
- Purchased tickets appear in the top/account identity inventory.

Because leaderboard and Conquest V2 awards are delivered by scheduled Workers,
the Home inbox query refreshes once per minute while mounted. It does not poll
in background tabs. Inventory collections retain their existing one-minute
refresh, and immediate claim/exchange paths continue invalidating their exact
queries. A new queue, a removed projection, or a day-stale inbox now fails the
Cloudflare build.

Identity-mode card details preserve the source grade and balance interface but
read it as Cloud Weasel inventory. The Items library, Silver exchange selector,
and Gold exchange selector all opt into the same inventory-only projection.
That projection mounts balance rows and off-chain explanations, never market
price, stock, total-supply, or cart controls. The legacy components and copy
remain available only to the legacy-wallet app, and the off-chain release gate
checks both branches so a reusable card detail cannot silently reconnect D1
inventory to wallet-market authority.

The source chain-effect audit is broader than the transaction-queue and browser
audits. It discovers executable Go calls that mint, send a transaction, compose
a token transfer, or compose an on-chain payment. Every current callsite has an
exact count and an off-chain or zero-user-retirement disposition. Contract ABI
wrappers are excluded because they do not execute a product action themselves;
any new use of one from product code is discovered and fails the build until it
has an explicit Cloud Weasel replacement.

The source `chain` Docker workload is superseded rather than treated as a
retired product. Its contracts and deployment script implemented mint factories,
wallet payments, and legacy exchanges; the corresponding player outcomes are
now owned by authenticated D1 reward receipts, Stripe or mobile-store receipts,
and the Silver/Gold inventory exchanges above. The service audit rejects a
blanket retirement label for any reviewed source Docker workload.

The source reward-producer audit starts one layer earlier. It inventories every
Go file that directly grants XP, tickets, sticker points, heroes, starter decks,
or item rows—even if that file never calls a contract itself. Exact callsite
counts and implementation evidence cover account bootstrap, matches, quests,
SkyPass, commerce, leaderboard/referral rewards, and operator/repair flows. A
new producer or an expanded producer fails the build until its complete earning
behavior has an off-chain TypeScript destination. Retirement is not a valid
disposition for a source reward producer.

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
Quest receipts also snapshot the claim season and its immutable pre-claim
SkyPass `initial`/`achieved` baseline. Each EXP reward in a multi-quest claim
therefore reports the source `LevelProgress` after that individual reward,
without substituting the lifetime account level or consulting mutable state
after the receipt is committed.

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

The Cloudflare release gate also keeps preserved legacy transaction controls
out of `IdentityApp`. Premium SkyPass retains its original page, artwork, reward
details, and premium-track entry, but Google identities mount only an
identity-native Stripe control; the nested USDC/silver wallet path cannot
mount. Stripe availability is an authenticated server capability and remains
disabled until all secrets, exact Price ID, webhook, and redirect configuration
are present. Checkout creation and the retrieved signed event must match the
source USD 14.95 price, while D1 independently refuses a successful SkyPass
payment at any other amount. Google copy describes D1 inventory and hides the
legacy mint badges. The same rule applies to any future paid Conquest ticket
UI, whose source price is pinned at USD 1.50. The Hero-skin interface may be
exposed to Google identities only through the off-chain Gold exchange; its
legacy wallet transaction implementation remains excluded.

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
