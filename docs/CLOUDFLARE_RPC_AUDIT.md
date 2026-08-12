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
| Ported source RPCs | 90 |
| Remaining source RPCs | 82 |
| Cloudflare-only RPC adapters | 0 |

## Remaining workstreams

| Workstream | Remaining | Interpretation |
| --- | ---: | --- |
| Admin and operations | 49 | Requires a new identity/RBAC boundary before exposing source GM tools. |
| Commerce and wallet | 12 | Payment and on-chain methods should follow optional WalletConnect, not be copied into login. |
| Content and discovery | 1 | The leaderboard reward-schedule read needs a Cloud Weasel product schedule. |
| Internal legacy | 10 | Several match/archive methods are already replaced by typed service bindings and Durable Objects rather than public RPCs. |
| Migration and identity | 8 | Burner/account migration and old social-provider endpoints need explicit product decisions. |
| Other product | 2 | Account reporting and game-client feedback. |

The raw percentage deliberately does not claim that every missing legacy RPC is
a product gap. `InternalMatchStart` and `InternalMatchEnd`, for example, are
superseded by the separate TypeScript match service and authoritative game
Durable Object. The exact missing method list is emitted by the audit command so
it cannot drift from the repository.

## Next product contracts

The two remaining "other product" methods need storage and abuse boundaries,
not only handler translations:

- `ReportAccount` is authenticated and match-scoped. The source rejects a
  missing report, self-reporting, reports from non-participants, and reports
  against anyone other than the reporter's opponent in that match. It strips
  markup from comments, truncates them to 4,000 characters, and creates a
  pending account signal. The Cloudflare port should preserve all of those
  checks, use the Google-backed account identity rather than treating a wallet
  address as authentication, and retain an auditable moderation record.
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
3. Add identity-native account lifecycle and reporting, with audit trails.
4. Design optional WalletConnect linking and only then adapt commerce/on-chain
   methods at wallet-content boundaries.
5. Add an explicit staff identity/RBAC model before porting any GM/admin write.
