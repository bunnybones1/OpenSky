# Cloudflare background-worker audit

Cloud Weasel does not inherit the Go worker queue by assumption. Every active
runner registered by `api/cmd/opensky-worker/main.go` has an explicit product
and Cloudflare disposition, enforced by
`utils/audit-cloudflare-worker-runners.mjs` during the Cloudflare build.

Production migration `0067_optional_push_notifications.sql` and main Worker
version `40a750cb-2ba3-445e-9ded-3faa45a84210` were deployed on 2026-08-12.
Post-deploy D1 verification found zero push deliveries and zero push-enabled
notifications, as expected while OneSignal is unconfigured. Public webapp,
Google-provider session, and Ping smoke checks returned HTTP 200.

The central reward rule is: a gameplay reward must be delivered to authoritative
off-chain inventory. It must not require a wallet, blockchain transaction, or
mint. WalletConnect remains an optional ownership integration only.

## Current inventory

| Source runner | Disposition | Cloud Weasel behavior |
| --- | --- | --- |
| `AccountDeletionRunner` | Ported | Scheduled D1 finalization with bounded, retry-safe cleanup. |
| `BalanceSyncRunner` | Superseded | Optional wallet links replace wallet balance as account authority. |
| `ConquestV2PoolRunner` | Dormant | Preview-only pool calculations remain gated pending an off-chain economy contract. |
| `ConquestV2RewardsRunner` | Dormant | No production reward producer; activation requires an off-chain delivery design and tests. |
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
