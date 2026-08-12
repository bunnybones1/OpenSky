# Cloudflare RPC port audit

Audited 2026-08-11 with:

```sh
pnpm check:cloudflare:rpcs
```

The audit discovers exported Go `*Server` methods from `api/rpc`, compares them
with the TypeScript cases in `cloudflare/src/api.ts`, and fails if the ported
count or the critical player-facing compatibility set regresses.

| Surface | Methods |
| --- | ---: |
| Source Go RPCs | 172 |
| Ported source RPCs | 105 |
| Remaining source RPCs | 67 |
| Cloudflare-only RPC adapters | 0 |

## Remaining workstreams

| Workstream | Remaining | Interpretation |
| --- | ---: | --- |
| Admin and operations | 37 | Remaining reads can build on deployed RBAC; writes require granular authorization and immutable audits. |
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
