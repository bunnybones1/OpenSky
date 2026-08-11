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
| Ported source RPCs | 81 |
| Remaining source RPCs | 91 |
| Cloudflare-only RPC adapters | 0 |

## Remaining workstreams

| Workstream | Remaining | Interpretation |
| --- | ---: | --- |
| Admin and operations | 49 | Requires a new identity/RBAC boundary before exposing source GM tools. |
| Commerce and wallet | 12 | Payment and on-chain methods should follow optional WalletConnect, not be copied into login. |
| Content and discovery | 6 | Deck search, deck-rank search, and deck validation. |
| Internal legacy | 10 | Several match/archive methods are already replaced by typed service bindings and Durable Objects rather than public RPCs. |
| Migration and identity | 8 | Burner/account migration and old social-provider endpoints need explicit product decisions. |
| Other product | 6 | Account reporting, feedback, version, live-record and miscellaneous reads. |

The raw percentage deliberately does not claim that every missing legacy RPC is
a product gap. `InternalMatchStart` and `InternalMatchEnd`, for example, are
superseded by the separate TypeScript match service and authoritative game
Durable Object. The exact missing method list is emitted by the audit command so
it cannot drift from the repository.

## Recommended order

1. Finish deterministic Conquest card reward selection and settlement; this is
   the remaining blocker before its matchmaking modes can be enabled.
2. Finish public content discovery (deck search, deck-rank search, and deck
   validation). Card search, the card library, and both lookup RPCs now derive
   deterministically from the source API's latest generated card migration.
3. Add identity-native account lifecycle and reporting, with audit trails.
4. Design optional WalletConnect linking and only then adapt commerce/on-chain
   methods at wallet-content boundaries.
5. Add an explicit staff identity/RBAC model before porting any GM/admin write.
