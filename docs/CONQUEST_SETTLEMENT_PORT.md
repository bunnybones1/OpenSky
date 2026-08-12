# Conquest settlement port contract

This records the implemented source behavior in
`api/lib/conquest/state_manager.go` and the remaining production enablement
gate. Reward pools are never inferred from UI copy or old assets.

## Source behavior

When a run reaches its first loss or third win, the source counts wins and
creates this bundle:

| Wins | Silver cards | Gold cards | Terminal state |
| ---: | ---: | ---: | --- |
| 0 | 0 | 0 | `COMPLETED` |
| 1 | 1 | 0 | `REWARDS_PENDING` |
| 2 | 2 | 0 | `REWARDS_PENDING` |
| 3 | 1 | 1 | `REWARDS_PENDING` |

Silver selection uses the active card index after excluding the configured card
sets and cards invalid for the current season. Each Silver draw is independent,
so the two-win bundle can contain the same base card twice. Gold selection uses
the current weekly Gold token-ID pool. The source emits an immediate `REWARD`
feed event for Silvers and a `DELAYED_REWARD` event for Gold, enqueues one exit
task containing sorted Silver token IDs and Gold token IDs, and completes the
run only after that task settles.

## Implemented

- `applyConquestProgress` records both players and its per-proposal receipt in
  one D1 batch.
- A loss or third win ends the run exactly once; zero-win losses become
  `COMPLETED`, while earned bundles become `REWARDS_PENDING`.
- Event-2 treasure points and their retry receipt are independent of card
  settlement.
- Production Conquest modes are false in both the match service and API status.
- Versioned Silver/Gold pool storage fails closed for missing, expired, or
  malformed pools.
- The zero-through-three-win source bundle, independent Silver draws, sorted
  token IDs, immutable settlement receipt, inventory grants, feed receipts,
  and terminal status update share an atomic D1 batch.
- If settlement succeeds before a later match-finalization step fails, the
  retry recovers the completed run's immutable receipt by authoritative match
  ID. This preserves the match result/reward payload without redrawing or
  regranting.
- Silver is granted immediately. Gold is exposed as pending for 24 hours and a
  minute Worker schedule delivers it atomically to identity inventory.
- Concurrent delivery claims are receipt-keyed; retries are idempotent;
  malformed or repeatedly failing deliveries dead-letter after five attempts.

## Remaining authoritative input

Cloud Weasel still has no approved production values for:

- the Silver-eligible card IDs equivalent to the source's current-season index
  after `rewards_excluded_card_sets` filtering; and
- the weekly Gold card IDs and validity window.

These are product configuration, not derivable source constants. Until they are
provided, selecting from all 856 active cards or advertising an arbitrary Gold
pool would be incompatible behavior.

The delayed-Gold policy is now the source default of 24 hours, with five
attempts before dead-lettering. Rewards belong to Google identity inventory;
WalletConnect remains optional.

## Cloudflare transaction boundary

The settlement receipt is keyed by the Conquest run ID and contains the source
bundle counts, selected base card IDs, configured pool version, and timestamps.
The settlement operation must atomically:

1. require a terminal `REWARDS_PENDING` run with no receipt;
2. validate that every selected ID belongs to the versioned eligible pool;
3. insert/increment Silver inventory and create a pending Gold delivery;
4. append source-shaped immediate/delayed feed receipts;
5. insert the immutable settlement receipt; and
6. move the run to `COMPLETED`.

Retries must return the stored receipt without drawing again. A pool-version
change must not alter a receipt already chosen. No HTTP request or Durable
Object alarm may partially grant inventory before the receipt is durable.

## Verified tests and remaining rollout gates

- Differential bundle counts for 0, 1, 2, and 3 wins.
- Independent Silver draws, sorted settlement token IDs, and weekly-Gold-only
  selection.
- Empty, expired, or malformed pools fail closed without changing the run.
- Concurrent and alarm-retry settlement grants exactly one bundle.
- A match-finalization retry after settlement returns the original reward
  payload with one settlement, one delayed delivery, and no duplicate feed or
  inventory writes.
- D1 rollback coverage for failures at each statement in the batch.
- Feed events, inventory balances, Conquest stats, and terminal status agree.
- Production read-only probes show no pre-enable Conquest rows or grants.
- Conquest mode flags remain false until all checks pass against the deployed
  Worker version and an explicit pool configuration.

The implementation and tests above are deployed. Before enabling either mode,
operations must create and review a bounded active pool, exercise one isolated
three-win settlement through delayed delivery, verify inventory/feed/receipt
agreement, and re-run the production mode gate. Production currently has zero
active pool rows and zero Conquest settlement/delivery rows.

`pnpm deploy:cloudflare:match-service` runs the gate before Wrangler. The gate
reads the actual production match-service config and fails if either Conquest
mode is enabled. Removing it is an explicit part of the settlement rollout,
not a configuration-only change.

WalletConnect is not part of this gate. Card contents belong to the Google
identity inventory first; a later optional wallet link can merge or export
wallet-held contents without becoming login authority.
