# Cloudflare background-worker audit

Cloud Weasel does not inherit the Go worker queue by assumption. Every active
runner registered by `api/cmd/opensky-worker/main.go` has an explicit product
and Cloudflare disposition, enforced by
`utils/audit-cloudflare-worker-runners.mjs` during the Cloudflare build.

Production migration `0068_conquest_v2_offchain_rewards.sql` and main Worker
version `832577c3-f39c-49c5-ac46-4e0bc1f4d38d` were deployed on 2026-08-12.
Post-deploy D1 verification found zero Conquest V2 schedules, cycles, awards,
and failure incidents, as expected for the disabled-by-default rollout. Public
webapp, Google-provider session, and Ping smoke checks returned HTTP 200.

The central reward rule is: a gameplay reward must be delivered to authoritative
off-chain inventory. It must not require a wallet, blockchain transaction, or
mint. WalletConnect remains an optional ownership integration only.

## Current inventory

| Source runner | Disposition | Cloud Weasel behavior |
| --- | --- | --- |
| `AccountDeletionRunner` | Ported | Scheduled D1 finalization with bounded, retry-safe cleanup. |
| `BalanceSyncRunner` | Superseded | Optional wallet links replace wallet balance as account authority. |
| `ConquestV2PoolRunner` | Ported | D1 preserves the source float32 pool hysteresis and snapshots its result into immutable weekly cycles; the public USDC surface remains zero-gated. |
| `ConquestV2RewardsRunner` | Ported | Explicit, disabled-by-default schedules snapshot weekly points, preserve rollover and delayed delivery, then grant deterministic expansion-only Silver cards to D1 inventory. Legacy USDC calculations are audit-only. |
| `CrashedMatchCleanupRunner` | Superseded | Authoritative match Durable Objects persist deadlines and recover them with alarms. |
| `DeckRankUpdateRunner` | Ported | Match settlement applies deck rank changes through an idempotent D1 coordinator. |
| `FixStarterDecksRunner` | Retired | One-time legacy-account repair is unnecessary for the zero-user fork; new decks are validated at write time. |
| `GiveawayOffChainTokensRunner` | Retired | Historical mass giveaways have no production producer; deliberate support grants use audited D1 operations. |
| `GrantStickerRewardsRunner` | Ported | Referral rewards use idempotent receipts and off-chain `player_items`. |
| `LazyMigrationRunner` | Retired | Per-account legacy migrations are unnecessary with zero imported users and versioned D1 migrations. |
| `LeaderboardRewardsRunner` | Ported | Scheduled, receipt-backed off-chain inventory rewards. |
| `MarkNotNewRunner` | Ported | Due updates are applied idempotently on inventory reads, so no cron failure can strand the state. |
| `OnChainPaymentEventRunner` | Retired | On-chain commerce is not a Cloud Weasel reward or payment authority. |
| `OnChainPaymentListenerRunner` | Retired | On-chain commerce is not a Cloud Weasel reward or payment authority. |
| `PromoteGrandmastersRunner` | Ported | Promotion is part of the receipt-backed leaderboard reset cycle. |
| `PushNotificationsRunner` | Ported | Disabled-by-default OneSignal projection targets Google identity IDs, retries with a stable provider idempotency key, and dead-letters without affecting in-app delivery or rewards. |
| `RankPointsHardResetRunner` | Ported | Implemented in the leaderboard reset cycle. |
| `RankPointsSoftResetRunner` | Ported | Implemented in the leaderboard reset cycle. |
| `SendTxnsRunner` | Superseded | Its 13 queues have a separate mechanical audit; live reward producers deliver off chain. |
| `SkypassAutoClaimRunner` | Ported | Bounded retries reuse immutable manual-claim receipts and deliver every earned reward off chain. |
| `SkypassEndOfSeasonRunner` | Ported | D1 season-close cycles become due at the source boundary plus ten seconds and complete once. |
| `StripeEventRunner` | Ported | Verified Stripe webhooks fulfill purchases idempotently in D1. |
| `TxnStatusRunner` | Retired | There are no reward-mint transactions whose chain status controls inventory. |

`pnpm check:cloudflare:worker-runners` fails if the Go entrypoint adds or removes
a runner without review, if mapped implementation evidence disappears, or if a
commented-out runner is accidentally counted as active.

SkyPass season close reuses the existing immutable claim receipts and off-chain
reward delivery paths rather than recreating the source mint queues. External
device push is strictly optional: without complete OneSignal configuration the
scheduled pass is a read-only no-op. In-app notifications and their off-chain
rewards remain authoritative and do not depend on it.

Conquest V2 settlement is deployed dormant by design: migration `0068` seeds no
schedule. Enabling it requires an immutable cadence, season/week anchor,
delivery delay, reward card sets, and a source settings `WeightPerSilverCard`
that gives even level-one treasure at least one off-chain item. The Worker
refuses to create a cycle or deduct points if that invariant fails. Once a
cycle begins, point rollover, award receipts, inventory grants, notifications,
and feed rows are retry-safe. Failed runs create immutable incident rows and
remain retryable indefinitely; a cycle cannot terminally strand rolled-over
points. The source USDC projection is retained only in an
operator reconciliation column and is never returned as a player reward.
