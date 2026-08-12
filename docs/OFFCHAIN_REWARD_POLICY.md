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
- WalletConnect remains optional. A verified wallet may contribute read-only
  external ownership to content views, but it does not authenticate the player,
  own the Cloud Weasel account, or become the destination for earned rewards.
- Legacy burner/account migration is retired for the zero-user launch. Future
  identity providers must link to the Google-owned account through a new
  reviewed flow, not revive the source migration RPCs.
- Mobile-store receipts, if Cloud Weasel ships them, must fulfill the same
  off-chain inventory contract as Stripe. Store verification never mints.

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
scans all five producer modules for both canonical `player_items` writes and an
idempotent receipt/delivery key, in addition to excluding transaction code from
the Google-identity route tree.

The source transaction-queue audit also inventories all 13 queues consumed by
`SendTxnsRunner`. Nine have an active source producer and must remain linked to
an off-chain implementation or an explicit dormant product gate; four have no
production producer and must stay producerless unless reviewed. A newly added
queue, a revived producerless task, or missing Cloudflare evidence fails the
production build.

The Cloudflare release gate also keeps the preserved legacy transaction pages
out of `IdentityApp`. Premium SkyPass is currently disabled; when product and
Stripe configuration are ready, its original page may return only after the
USDC/silver mint controls are removed and Checkout continues to fulfill the
off-chain receipt contract. The same rule applies to any future paid Conquest
ticket UI. Hero-skin minting remains a legacy-wallet surface, not a Cloud
Weasel reward path.

## Source RPC disposition

The four `PrepareOnChain*`/burner-transfer RPCs are superseded by this policy,
not waiting to be copied. `MigrateAccount` and `MigrateFromBurner` are retired.
`RequestAccountDeletion` is already replaced by the Google OIDC step-up web
flow. The mechanical audit keeps these source names visible and separately
reports the small set of genuinely actionable integration gaps.
