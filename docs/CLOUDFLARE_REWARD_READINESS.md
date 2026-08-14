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

| Reward track                           | Status           | Production authority                                                              |
| -------------------------------------- | ---------------- | --------------------------------------------------------------------------------- |
| Account bootstrap and starter deck     | `core-live`      | D1 bootstrap grants the exact source starter deck/cards.                          |
| Match XP and level unlocks             | `core-live`      | Match settlement and per-player XP receipts are deployed.                         |
| Quest XP and basic SkyPass progression | `core-live`      | Quest claim batches and immutable XP/referral receipts are deployed.              |
| SkyPass claim contents                 | `active`         | 1 of 1 validated reward policies is active.                                       |
| Original Conquest card settlement      | `dormant-policy` | 0 independently approved reward pools; therefore 0 receipt-verified active pools. |
| Weekly leaderboard rewards             | `dormant-policy` | 0 cadence rows and 0 independently approved schedules.                            |
| Conquest V2 weekly treasure            | `dormant-policy` | 0 cadence rows and 0 current-settings policy approvals.                           |
| Referral sticker rewards               | `dormant-policy` | 0 current-season schedules and 0 active schedules.                                |

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

The active SkyPass policy has a matching production claim proof. On
2026-08-13, after the Quest claim made level 1 earnable, the same Google test
account used the original SkyPass UI to claim only its free level-1 Base Card.
The page changed the control to `Reward Claimed` and never rendered a wallet or
mint prompt. Read-only D1 verification resolved the browser's awarded card ID
to season-62 reward definition `4`: its application is `APPLIED` under an
immutable delivery key, with one `SW_BASE_CARDS` grant for card `140`, balance
`0 -> 1`, current balance `1`, and unlock source `skypass:4`. The verification
reported `changed_db: false`; the only state change was the player-facing claim
itself.

## Activation boundary

- SkyPass is safe to use now. Its source season-62 import was validated against
  the complete off-chain fulfillment digest and activated by migration.
- Original Conquest requires a versioned draft Silver/Gold pool, an immutable
  exact-manifest proposal, independent activation approval, and the existing
  end-to-end receipt-backed drill before either queue becomes admissible.
  Reviewed staff adapters now perform proposal, approval, and retirement
  without direct SQL, while production retains zero capability grants and zero
  pools until the fork owner supplies and reviews the contents. A separate
  dormant verifier adapter can bind only the exact database-proven settlement
  and 24-hour delivery receipt pair from the required isolated drill; it cannot
  create rewards or enable a queue.
- Leaderboard requires one explicit UTC cadence and a second-actor activation
  of the pinned rank/card/ticket policy before its first boundary. Reviewed
  staff adapters now propose, independently activate, list, and immediately
  disable immutable schedule versions without direct SQL; production retains
  zero capability grants and zero cadence rows until that policy decision.
- Conquest V2 requires an explicit cadence, current economy settings with at
  least one Silver at every eligible treasure level, and second-actor approval
  of the exact resulting quantities and card pool. Reviewed staff adapters now
  list the authoritative review inputs and propose, independently activate, or
  immediately disable immutable schedules without direct SQL. Production still
  has zero capability grants and zero schedule rows, so this operational
  surface remains dormant until those economy choices are supplied.
- Referral stickers require source-equivalent current-season sticker metadata
  and a distinct actor to activate its exact thresholds. Reviewed staff
  adapters now atomically import and propose one exact current-season manifest,
  list every immutable version, and require a separately authorized actor to
  confirm and activate that same manifest. Raw metadata remains invisible and
  cannot authorize a reward. Production retains zero capability grants and
  zero schedules, so with no approved source schedule the original screen
  correctly says `Coming Soon`.

No audit or scheduler is permission to guess these choices. Activation is a
product/economy decision and should remain a separate committed milestone with
the exact policy inputs, reviewer, and production proof. Conversely, minting is
never a reason to remove an original earning flow: once its policy is approved,
the outcome must be granted through the corresponding off-chain D1 inventory or
entitlement receipt.
