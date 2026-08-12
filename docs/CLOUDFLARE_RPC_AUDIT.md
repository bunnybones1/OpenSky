# Cloudflare RPC port audit

Audited 2026-08-12 with:

```sh
pnpm check:cloudflare:rpcs
```

The audit discovers exported Go `*Server` methods from `api/rpc`, compares them
with the TypeScript cases in `cloudflare/src/api.ts`, and fails if the ported
count or the critical player-facing compatibility set regresses.

| Surface | Methods |
| --- | ---: |
| Source Go RPCs | 172 |
| Ported source RPCs | 128 |
| Remaining source RPCs | 44 |
| Cloudflare-only RPC adapters | 0 |

## Remaining workstreams

| Workstream | Remaining | Interpretation |
| --- | ---: | --- |
| Admin and operations | 14 | Remaining reads can build on deployed RBAC; writes require granular authorization and immutable audits. |
| Commerce and wallet | 12 | Payment and on-chain methods should follow optional WalletConnect, not be copied into login. |
| Content and discovery | 1 | The leaderboard reward-schedule read needs a Cloud Weasel product schedule. |
| Internal legacy | 10 | Several match/archive methods are already replaced by typed service bindings and Durable Objects rather than public RPCs. |
| Migration and identity | 6 | Burner/account migration, deletion, and old social-provider endpoints need explicit product decisions. |
| Other product | 1 | Private game-client feedback storage and retention. |

The raw percentage deliberately does not claim that every missing legacy RPC is
a product gap. `InternalMatchStart` and `InternalMatchEnd`, for example, are
superseded by the separate TypeScript match service and authoritative game
Durable Object. The exact missing method list is emitted by the audit command so
it cannot drift from the repository.

## Next product contracts

The remaining "other product" method needs private storage and abuse
boundaries, not only a handler translation. `ReportAccount` is now deployed
with its source participant/opponent checks, plain-text sanitization,
4,000-byte cap, pending moderation state, and an auditable Google-identity
record. It accepts the principal-shaped opponent address used by the original
game UI only as a match-local lookup, never as authentication.

- `RecordGameClientFeedback` is authenticated and writes a private JSON dump
  plus an optional base64 JPEG. The Cloudflare equivalent should use a private
  R2 bucket, enforce body/image size and MIME limits before decoding, avoid
  identity-bearing object names, and define retention and staff-access policy.
  Until those controls exist, leaving this RPC absent is safer and more
  faithful than accepting feedback without durable private storage.

## Recommended order

1. Approve a versioned production Conquest pool and run the pre-enable
   settlement/delayed-delivery drill; the code path is implemented and deployed.
2. Define an explicit Cloud Weasel UTC weekday/time and cadence for
   `GetNextRewardsTime`. The original values were private runtime configuration
   and are absent from this repository, so inventing them would not be a
   faithful port. Deck-rank writes, public listing, and authenticated search are
   now implemented and deployed.
3. Define the destructive confirmation and recovery contract for
   identity-native account deletion; match-scoped reporting is now deployed.
   The source invite-request setting is deployed, and its deprecated `SignIn`
   method remains an explicit compatibility error rather than a second login
   authority.
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

The event-2 Conquest account-progress read is also role-gated and backed by the
deployed point ledger and source treasure thresholds. The legacy pool config
and summary are still absent because their USDC-style economics do not map
faithfully to Cloud Weasel's versioned card pools without an explicit product
contract.

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
