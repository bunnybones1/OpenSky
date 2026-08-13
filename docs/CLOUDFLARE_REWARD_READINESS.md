# Cloud Weasel reward readiness

Gameplay rewards use the Google identity and D1 inventory; WalletConnect is
optional and never receives a required reward. A source mint or burn describes
the original outcome, not Cloud Weasel's fulfillment mechanism.

Run the production audit with:

```sh
pnpm audit:cloudflare:reward-readiness
```

The command executes one read-only scalar `SELECT` through the repository's
pinned Wrangler and classifies each reward track. It mirrors runtime admission:
current UTC time and season, the latest started schedule, exact approval-policy
digests, current Conquest V2 settings, and time-bounded Conquest drill receipts.
`core-live` needs no economy schedule, `active` has its required policy
authority, and a `dormant-*` status means the TypeScript/D1 engine is deployed
but fails closed pending explicit content, activation, or a receipt-backed
rollout drill.

## Production observation — 2026-08-13

| Reward track | Status | Production authority |
| --- | --- | --- |
| Account bootstrap and starter deck | `core-live` | D1 bootstrap grants the exact source starter deck/cards. |
| Match XP and level unlocks | `core-live` | Match settlement and per-player XP receipts are deployed. |
| Quest XP and basic SkyPass progression | `core-live` | Quest claim batches and immutable XP/referral receipts are deployed. |
| SkyPass claim contents | `active` | 1 of 1 validated reward policies is active. |
| Original Conquest card settlement | `dormant-policy` | 0 reward pools; therefore 0 receipt-verified active pools. |
| Weekly leaderboard rewards | `dormant-policy` | 0 cadence rows and 0 independently approved schedules. |
| Conquest V2 weekly treasure | `dormant-policy` | 0 cadence rows and 0 current-settings policy approvals. |
| Referral sticker rewards | `dormant-policy` | 0 current-season schedules and 0 active schedules. |

The production inventory audit wrote zero rows and reported `changed_db: false`.
The minute Worker already invokes every scheduled delivery engine. A dormant
result therefore does not mean that more Go code or minting infrastructure is
required; it means Cloud Weasel has deliberately not invented reward contents
or timing that the fork owner has not approved.

The core-live Quest path also has a production earning proof. On 2026-08-13,
the signed-in Google test account completed the source Practice flow and used
the original Daily Quest UI to claim only the 100-XP `On the Road Again`
assignment. The claim advanced that quest chain to `On the Road Again II`
without opening a wallet or mint prompt. A subsequent read-only D1 query found
one immutable Quest receipt totaling exactly 100 `SW_XP`, profile XP of 100,
and basic SkyPass XP of 100; both next-level thresholds were 200. That query
reported `changed_db: false`. This intentionally changed only the test
account's earned progression through the player-facing claim action.

## Activation boundary

- SkyPass is safe to use now. Its source season-62 import was validated against
  the complete off-chain fulfillment digest and activated by migration.
- Original Conquest requires a versioned Silver/Gold pool plus the existing
  end-to-end receipt-backed drill before either queue becomes admissible.
- Leaderboard requires one explicit UTC cadence and a second-actor activation
  of the pinned rank/card/ticket policy before its first boundary.
- Conquest V2 requires an explicit cadence, current economy settings with at
  least one Silver at every eligible treasure level, and second-actor approval
  of the exact resulting quantities and card pool.
- Referral stickers require source-equivalent current-season sticker metadata
  and a distinct actor to activate its exact thresholds. With no season-62
  source schedule in the repository, the original screen correctly says
  `Coming Soon`.

No audit or scheduler is permission to guess these choices. Activation is a
product/economy decision and should remain a separate committed milestone with
the exact policy inputs, reviewer, and production proof. Conversely, minting is
never a reason to remove an original earning flow: once its policy is approved,
the outcome must be granted through the corresponding off-chain D1 inventory or
entitlement receipt.
