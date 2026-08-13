# Cloudflare RPC port audit

Audited 2026-08-12 with:

```sh
pnpm check:cloudflare:rpcs
```

Production migrations through `0067_optional_push_notifications.sql` and Worker
version `40a750cb-2ba3-445e-9ded-3faa45a84210` were deployed on 2026-08-12.
The public smoke check confirmed the new adapter exists and rejects an
unauthenticated request with `401` before reading or changing player state.

The audit discovers exported Go `*Server` methods from `api/rpc`, compares them
with the TypeScript cases in `cloudflare/src/api.ts`, and fails if the ported
count or the critical player-facing compatibility set regresses.

| Surface                         | Methods |
| ------------------------------- | ------: |
| Source Go RPCs                  |     172 |
| Functional TypeScript RPCs      |     148 |
| Source-faithful tombstones      |       4 |
| Cloudflare-superseded RPCs      |      17 |
| Deliberately retired RPCs       |       3 |
| Actionable source RPC gaps      |       0 |
| Cloudflare-only RPC adapters    |      15 |

Together, 172/172 source contracts (100%) are functionally implemented,
preserved as an already-disabled source endpoint, replaced by a reviewed Cloud
Weasel contract, or intentionally retired. This is a product-intent measure;
it is not a claim that a TypeScript `case` label is an implementation. The
release gate parses fall-through case bodies and rejects any new
`unimplemented` or deprecated terminal case without an explicit disposition.

## Completed source surface

There are no mechanically actionable Go RPC gaps. Google Play, Samsung, and
Apple verification now feed the same idempotent off-chain fulfillment ledger.
Apple uses the current App Store Server API, Worker-native ES256, Apple-specific
certificate OIDs, the complete three-certificate JWS chain, and source-pinned
Apple PKI roots. Sandbox, revoked, mismatched, future-signed, or untrusted
transactions fail before reward storage.

All functional admin/operations RPCs are now ported. The source's already-
unimplemented `AdminListAccounts` and `AdminSearchAccounts` endpoints remain
role-gated source-faithful tombstones and are not counted as functional ports.
`GMUpdateSkypassRewards` uses the
source CSV contract but adds a dormant capability, an HTTPS-origin allowlist,
bounded fetches, immutable audits, and a D1-enforced freeze after the first
claim in a season. An import now prepares an immutable, player-invisible draft
instead of immediately replacing live rewards. `GMListSkypassRewards` retains
its source-compatible active-list response by default and accepts an optional
version for exact draft review. The Cloudflare-only
`GMActivateSkypassRewards` adapter requires a different authorized actor and
activates only the reviewed version and exact off-chain fulfillment digest.

`GMGrantBaseCards` replaces the source `grant-cards` command's direct contract
mint with a capability-gated, idempotent identity-inventory grant. It preserves
all/prism selection and records an immutable receipt; it never prepares or
sends a chain transaction. `GMGrantItems` preserves the source
`GiveawayOffChainTokensRunner` item-type, item-ID, and quantity map behind the
same dormant capability, with an immutable request and before/after receipt per
item. `GMActivateSkypassRewards` is a Cloudflare-only adapter because
draft import and independent reward-policy activation are deliberately
separate authorities.

Four additional reviewed adapters operate the source-faithful original
Conquest reward-pool replacement: `GMListConquestRewardPools`,
`GMProposeConquestRewardPool`, `GMActivateConquestRewardPool`, and
`GMRetireConquestRewardPool`. They expose the existing two-actor D1 lifecycle
without inventing contents or requiring hand-written production SQL. Writes
use separate dormant capabilities, exact-manifest confirmation, immutable
idempotency receipts, and audits; none writes queue readiness or game-mode
status. The RPC audit allowlists every reviewed adapter by name and rejects a new
or missing Cloudflare-only method.

Four reviewed leaderboard adapters similarly list, propose, independently
activate, and disable immutable weekly schedule versions around the already
pinned source reward-policy digest. Monotonic compare-and-swap versions prevent
competing cadence decisions from both landing. Separate dormant capabilities,
idempotency receipts, and immutable audits keep the cron path disabled until an
explicit UTC cadence receives second-actor approval.

Four reviewed Conquest V2 adapters expose the already-versioned weekly treasure
schedule without direct D1 writes: list, propose, independently activate, and
disable. Every proposal explicitly confirms the current economy mutation,
source algorithm digest, 11-level Silver vector, eligible card sets, UTC
cadence, season/week anchor, and delivery delay. Separate dormant capabilities,
monotonic versions, immutable receipts, and a second actor keep production
inert until those product inputs are deliberately approved.

## Reviewed non-ports

- The ten `Internal*` match/account/archive RPCs are superseded by typed Worker
  service bindings, the match ledger, and authoritative Durable Objects.
- The four on-chain/burner transaction-preparation RPCs are superseded by the
  [off-chain reward policy](./OFFCHAIN_REWARD_POLICY.md). WalletConnect remains
  an optional ownership read, not a reward destination.
- `RequestAccountDeletion` is superseded by the deployed Google OIDC step-up
  web flow.
- `MigrateAccount` and `MigrateFromBurner` are retired for a zero-user Google-
  identity launch. Future providers get new reviewed account-linking flows.
- Four source-disabled endpoints remain source-faithful tombstones rather than
  being inflated into the functional-port count: deprecated `SignIn`, the two
  source-unimplemented `Admin*Accounts` endpoints, and disabled
  `GetMatchLiveRecordsURI`.
- The wallet-address-based `IAPVerifyGoogleProducts2` and
  `IAPVerifyAppleProducts2` methods are authenticated tombstones directing
  current clients to identity-scoped verification. `JoinEarlyAccessList` is an
  explicit public tombstone because Cloud Weasel is live and has no Mailchimp
  dependency.

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

`GetNextRewardsTime` now reads the same immutable D1 schedule version used by
the weekly distribution worker and preserves the source's strictly-after-now
weekly boundary. It fails explicitly with `503` while production has no active
schedule, so the preserved UI cannot advertise an invented reward time.

`GetDiscordInfo` and `GetTwitchInfo` preserve the source response shapes and
one-minute cache through D1. Discord uses a configurable public widget URL;
Twitch uses standard app client credentials directly instead of the source's
private Skyweaver token proxy. Both return a clear `503` until Cloud Weasel's
own server/app identifiers and Twitch secret are configured. The preserved
live-channel component now consumes the ported Twitch RPC again and remains
hidden while that optional integration is unavailable.

## Recommended order

1. Approve a versioned production Conquest pool and run the pre-enable
   settlement/delayed-delivery drill; the code path is implemented and deployed.
2. Define an explicit Cloud Weasel UTC weekday/time and add its immutable D1
   schedule version. `GetNextRewardsTime` and the distribution worker share
   that authority and are implemented; the original schedule values were
   private runtime configuration and are absent from this repository, so
   production remains deliberately unconfigured. Deck-rank writes, public
   listing, and authenticated search are implemented and deployed.
3. Define the confirmation and recovery contract for any future hard deletion.
   Identity-native soft deletion is now deployed: the original settings dialog
   uses fresh Google OIDC step-up, access stops immediately, and scheduled
   anonymization follows the source delay. The source invite-request setting is
   deployed, and its deprecated `SignIn` method remains an explicit
   compatibility error rather than a second login authority.
4. Add optional WalletConnect only at external-ownership read boundaries. Game
   rewards remain off-chain and do not depend on a wallet.
5. Provision staff only through an audited out-of-band procedure. Every current
   GM/admin write is ported with a granular dormant capability and immutable
   audit. The deny-by-default Google-identity `ADMIN` role, source `GMStats`, and
   the original UI's read-only authorization probe and account discovery are
   deployed. Report details and summaries are also connected to the D1 audit
   rows. Their required numeric score remains explicitly neutral because the
   source classifier's population-normalized user-agent and bot-endpoint-abuse
   inputs do not have equivalent Cloudflare contracts; the release gate and
   [moderation-score boundary](./CLOUDFLARE_MODERATION_SCORE.md) prevent a
   partial model from being presented as a fraud probability.
   Production has no staff grants.

Role-gated reads now also cover every configured banner and reusable one-time
notification template. Player banner visibility remains time-filtered, and
template definitions are deliberately distinct from per-player notification
deliveries.

Staff can also inspect SkyPass reward definitions and optional per-season
premium status. Cloud Weasel stores premium as Google-identity entitlement
state rather than authentication or wallet state, and a missing entitlement
truthfully reads false without mutating the account.

SkyPass definition review and activation require both `ADMIN` and the separate
`SKYPASS_REWARD_WRITE` permission. Only active versions are player-visible;
each new claim records its immutable policy version and digest, and every
source mint-queue item is fulfilled as identity-owned D1 inventory.

App Developer Key management is ported behind `ADMIN` plus a separately
dormant `APP_DEV_KEY_WRITE` capability. It preserves source-format keys,
enabled-name/email uniqueness, source pagination, disable/re-enable semantics,
and source-shaped one-year JWT generation while adding immutable secret-free
audits and database race guards. The generated partner tokens intentionally do
not authorize API methods yet: the source encoded the full object in `app` but
its middleware cast that claim to a string, so silently repairing the bug would
create new production authority without an approved scope contract.

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
gate backed by the real off-chain settlement and delayed-delivery receipt keys.
Match admission rechecks the proof and active time window so a broad
administrator cannot bypass the reward rollout or leave an expired pool open.

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
