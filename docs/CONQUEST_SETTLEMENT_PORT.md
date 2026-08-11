# Conquest settlement port contract

This is the remaining gate before Cloud Weasel may enable Conquest matchmaking.
It records the source behavior in `api/lib/conquest/state_manager.go` and the
Cloudflare safety boundary so reward pools are not inferred from UI copy or old
assets.

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

## Already ported

- `applyConquestProgress` records both players and its per-proposal receipt in
  one D1 batch.
- A loss or third win ends the run exactly once; zero-win losses become
  `COMPLETED`, while earned bundles become `REWARDS_PENDING`.
- Event-2 treasure points and their retry receipt are independent of card
  settlement.
- Production Conquest modes are false in both the match service and API status.

## Missing authoritative inputs

Cloud Weasel has no approved equivalents for:

- `rewards_excluded_card_sets`;
- the current weekly Gold token-ID pool and its validity window;
- the delayed-Gold delivery policy now that wallet ownership is optional;
- the operational retry/dead-letter policy for failed settlement.

These are product configuration, not derivable source constants. Until they are
provided, selecting from all 856 active cards or advertising an arbitrary Gold
pool would be incompatible behavior.

## Cloudflare transaction boundary

Add a settlement receipt keyed by the Conquest run ID, containing the source
bundle counts, selected base card IDs, configured pool version, and timestamps.
The settlement operation must atomically:

1. require a terminal `REWARDS_PENDING` run with no receipt;
2. validate that every selected ID belongs to the versioned eligible pool;
3. insert/increment the player's Silver and Gold inventory rows;
4. append source-shaped immediate/delayed feed receipts;
5. insert the immutable settlement receipt; and
6. move the run to `COMPLETED`.

Retries must return the stored receipt without drawing again. A pool-version
change must not alter a receipt already chosen. No HTTP request or Durable
Object alarm may partially grant inventory before the receipt is durable.

## Required tests and rollout gates

- Differential bundle counts for 0, 1, 2, and 3 wins.
- Independent Silver draws, sorted settlement token IDs, and weekly-Gold-only
  selection.
- Empty, expired, or malformed pools fail closed without changing the run.
- Concurrent and alarm-retry settlement grants exactly one bundle.
- D1 rollback coverage for failures at each statement in the batch.
- Feed events, inventory balances, Conquest stats, and terminal status agree.
- Production read-only probes show no pre-enable Conquest rows or grants.
- Conquest mode flags remain false until all checks pass against the deployed
  Worker version and an explicit pool configuration.

WalletConnect is not part of this gate. Card contents belong to the Google
identity inventory first; a later optional wallet link can merge or export
wallet-held contents without becoming login authority.
