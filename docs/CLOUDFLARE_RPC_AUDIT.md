# Cloudflare RPC port audit

Audited 2026-08-12 with:

```sh
pnpm check:cloudflare:rpcs
```

The audit discovers exported Go `*Server` methods from `api/rpc`, compares them
with the TypeScript cases in `cloudflare/src/api.ts`, and fails if the ported
count or the critical player-facing compatibility set regresses.

| Surface                      | Methods |
| ---------------------------- | ------: |
| Source Go RPCs               |     172 |
| Ported source RPCs           |     140 |
| Remaining source RPCs        |      32 |
| Cloudflare-only RPC adapters |       0 |

## Remaining workstreams

| Workstream             | Remaining | Interpretation                                                                                                                                                                         |
| ---------------------- | --------: | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Admin and operations   |         6 | Conquest V2 previews and Stripe reads now use deployed RBAC; remaining app-key and SkyPass writes require granular authorization and immutable audits.                                |
| Commerce and wallet    |         9 | Stripe Checkout and its webhook are ported behind dormant optional configuration. Mobile receipts and on-chain methods should follow optional WalletConnect, not be copied into login. |
| Content and discovery  |         1 | The leaderboard reward-schedule read needs a Cloud Weasel product schedule.                                                                                                            |
| Internal legacy        |        10 | Several match/archive methods are already replaced by typed service bindings and Durable Objects rather than public RPCs.                                                              |
| Migration and identity |         6 | Burner/account migration, deletion, and old social-provider endpoints need explicit product decisions.                                                                                 |

The raw percentage deliberately does not claim that every missing legacy RPC is
a product gap. `InternalMatchStart` and `InternalMatchEnd`, for example, are
superseded by the separate TypeScript match service and authoritative game
Durable Object. The exact missing method list is emitted by the audit command so
it cannot drift from the repository.

## Next product contracts

`RecordGameClientFeedback` is ported with private R2 storage, payload limits,
random identity-scoped keys, rate limiting, and deletion cleanup. It remains a
fail-closed `503` after authentication in production until R2 is enabled on the
Cloudflare account and a retention lifecycle is approved.

## Recommended order

1. Approve a versioned production Conquest pool and run the pre-enable
   settlement/delayed-delivery drill; the code path is implemented and deployed.
2. Define an explicit Cloud Weasel UTC weekday/time and cadence for
   `GetNextRewardsTime`. The original values were private runtime configuration
   and are absent from this repository, so inventing them would not be a
   faithful port. Deck-rank writes, public listing, and authenticated search are
   now implemented and deployed.
3. Define the confirmation and recovery contract for any future hard deletion.
   Identity-native soft deletion is now deployed: the original settings dialog
   uses fresh Google OIDC step-up, access stops immediately, and scheduled
   anonymization follows the source delay. The source invite-request setting is
   deployed, and its deprecated `SignIn` method remains an explicit
   compatibility error rather than a second login authority.
4. Design optional WalletConnect linking and only then adapt commerce/on-chain
   methods at wallet-content boundaries.
5. Provision staff only through an audited out-of-band procedure, then add
   granular permissions and immutable audit records before porting any GM/admin
   write. The deny-by-default Google-identity `ADMIN` role, source `GMStats`, and
   the original UI's read-only authorization probe and account discovery are
   deployed. Report details and summaries are also connected to the D1 audit
   rows, with neutral scores until the separate fraud model is ported.
   Production has no staff grants.

Role-gated reads now also cover every configured banner and reusable one-time
notification template. Player banner visibility remains time-filtered, and
template definitions are deliberately distinct from per-player notification
deliveries.

Staff can also inspect SkyPass reward definitions and optional per-season
premium status. Cloud Weasel stores premium as Google-identity entitlement
state rather than authentication or wallet state, and a missing entitlement
truthfully reads false without mutating the account.

The event-2 Conquest account-progress read is role-gated and backed by the
deployed point ledger and source treasure thresholds. The legacy pool config
and summary are now ported as faithful admin previews: exact defaults,
zero-fallback settings, float32 weights, ten-unit rounding, ten treasure bands,
and immutable capability-gated writes. They intentionally do not activate the
public USDC pool or treasure amounts because those economics still need an
explicit Cloud Weasel settlement product contract.

Banner and featured-streamer mutations now demonstrate the required write
pattern: `ADMIN` plus a distinct `CONTENT_WRITE` capability, strict public-field
validation, atomic before/after snapshots, and D1 triggers that reject audit
updates or deletes. Production has no content-writer grants; the capability is
deployed but dormant until an explicit out-of-band approval.

One-time notification template CRUD now follows the same dormant
`CONTENT_WRITE` boundary and immutable-audit pattern. Player listing ports the
source filter evaluator for account age, identity reference, and UTC creation
date, and uses a template revision receipt to make Cloudflare retries
idempotent while preserving source reissue behavior after an earlier delivery
expires.

Match-review state now follows a separate dormant `MODERATION_WRITE` boundary.
The source boolean transition is persisted alongside the authoritative match,
identical retries are no-ops, and only real before/after changes enter the
immutable audit ledger. Production has no moderation-writer grants.

Game-mode operations are also ported as a coupled contract. The status and
history RPCs use D1 as the shared authority for the public API, matchmaker
admission, and final match dispatch. Writes require the dormant
`GAME_MODE_WRITE` capability and append immutable source-shaped history.
Conquest has an additional database-enforced active-pool plus recorded-drill
gate, so a broad administrator cannot accidentally bypass the reward rollout.

Manual account actions now follow the same fail-closed pattern. Ban,
suspension, flag, and vet writes require `ADMIN` plus the separately dormant
`ACCOUNT_ACTION_WRITE` capability. Cloud Weasel preserves the source defaults,
status transitions, moderator signals, delayed-reward behavior, and even the
legacy ordinal semantics of the mistyped account-action filter, while replacing
mutable `is_active` history with immutable deactivation records. Enforcement is
rechecked at API/session, multiplayer admission, matchmaking profile, and final
dispatch boundaries so an already queued player cannot race a sanction.

Four player-support mutations now use another separately dormant capability.
Forced rename, all-base-card unlock, warm-up correction, and starter-deck
repair require both `ADMIN` and `PLAYER_SUPPORT_WRITE`, validate the source
request boundaries, execute their data change and before/after audit atomically,
and protect every audit row from update or deletion. The card operation walks
the generated 856-card source library and treats an owned Silver or Gold copy as
ownership of that logical card instead of minting a redundant base copy.
Production has no player-support grants.

Quest support follows that same dormant capability with a dedicated immutable
ledger. `GMCompleteQuest` preserves the source's status-only mutation, scopes
the numeric assignment ID to the selected Google identity, and does not invent
progress or rewards. `GMResetQuestReRolls` only changes assignments from the
requested current daily, weekly, or seasonal period. Identical retries are
no-ops in the same D1 transaction boundary. `GMDeleteQuest` preserves the
source production refusal after role and target validation instead of exposing
a destructive non-production path from a globally deployed Worker.

Progression overrides have their own dormant `PROGRESSION_WRITE` capability
and immutable ledger. `GMGiveLevels` preserves the source's uint16 request and
effective level-1001 experience cap while translating the established Cloud
Weasel level-one baseline. It updates SkyPass level, rank eligibility, inviter
season levels, and sticker points. `GMSetRP` preserves the level-15 floor,
rank/stage thresholds, winning Glicko state, ranked-only score hook, and the
deterministic top-100 Grandweaver recalculation across both ranked modes. The
capability is the per-identity replacement for the source's global
`AllowRankEloChange` switch; production has no grants.

Premium SkyPass toggles now have a separate dormant `ENTITLEMENT_WRITE`
capability. The entitlement is stored per Google identity and season, alongside
the source-shaped `SW_SKYPASS` item balance, without making a wallet or premium
status part of login. Source production ordering is preserved: an explicit
per-season giveaway cap is checked before choosing grant or removal, so a
missing or exhausted cap fails both directions. D1 triggers enforce that cap
and reject stale concurrent toggles, and every successful change is recorded in
an immutable before/after ledger. Production has no writer grants or season cap.

The source wallet-proof `RequestAccountDeletion` transport remains visible in
the raw missing-method list because Cloud Weasel deliberately does not pretend
a Google identity is a wallet. Its product behavior is nevertheless deployed
through `/api/auth/account-deletion/start` and the existing settings UI: exact
account-name confirmation, same-origin POST, fresh Google PKCE/state step-up,
subject matching, immediate `TO_DELETE` enforcement, the source 30-days-minus-
one-hour scheduled soft deletion, personal-field anonymization, optional-wallet
unlinking, private user-storage removal, immutable request/tombstone evidence,
and duplicate-provider prevention. Game and moderation history remain intact.
