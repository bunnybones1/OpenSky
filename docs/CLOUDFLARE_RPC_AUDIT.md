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

| Surface                      | Methods |
| ---------------------------- | ------: |
| Source Go RPCs               |     172 |
| Functional TypeScript RPCs   |     148 |
| Source-faithful tombstones   |       4 |
| Cloudflare-superseded RPCs   |      17 |
| Deliberately retired RPCs    |       3 |
| Actionable source RPC gaps   |       0 |
| Cloudflare-only RPC adapters |      20 |

Together, 172/172 source contracts (100%) are functionally implemented,
preserved as an already-disabled source endpoint, replaced by a reviewed Cloud
Weasel contract, or intentionally retired. This is a product-intent measure;
it is not a claim that a TypeScript `case` label is an implementation. The
release gate parses fall-through case bodies and rejects any new
`unimplemented` or deprecated terminal case without an explicit disposition.

## Browser consumer proof — 2026-08-14

The source-method inventory is now paired with an independent consumer-side
gate, `pnpm check:cloudflare:browser-rpcs`. It parses actual TypeScript call
expressions in the preserved webapp and game rather than relying on text
search, so comments and `authToken` property access do not count as backend
contracts. It also follows the game client's `this.searchCards` wrapper, which
would otherwise be easy to omit from a direct `APIClient.opensky` search.

The checked-in consumer inventory contains exactly 108 source RPC calls. Of
those, 103 have TypeScript Worker handlers. The five remaining calls are
preserved only for the legacy wallet build and have explicit identity-product
dispositions: `MigrateFromBurner`, both `PrepareOnChainIn*Transaction` calls,
`PrepareTransferAssetsFromBurnerTransaction`, and `RequestAccountDeletion`.
The separate auth-mode, browser-transaction, route, and off-chain gates prove
that Google mode replaces those paths before invocation. A new browser call,
a removed original call, a missing Worker handler, or an unreviewed non-port
now fails the complete Cloudflare build.

Milestone `64dce51d` added the AST audit and five mutation tests. The complete
local release gate passed 382 main-Worker tests, 231 multiplayer tests, 25
browser/game tests, six analytics tests, every source/off-chain audit, and the
original production webapp/game builds. Exact-head GitHub Actions run
`31843339808` passed in 8m15s. This was a release-safety-only milestone: it
changed no runtime artifact, schema, Cloudflare binding, or production data.

### Unlocked hero deck classes — 2026-08-14

The consumer proof immediately exposed a real behavioral placeholder:
`ListUnlockedDeckClasses` authenticated the request but always returned only
`STR`. This meant a hero earned from the off-chain SkyPass inventory unlocked
its starter deck in D1 while the preserved create-deck, deck viewer, collection,
and queue UI continued to treat that hero's deck class as locked.

Milestone `0ffdbdc3` now projects the response from identity-owned `SW_HERO`
items through the source's complete 15-hero class table. It preserves the Go
contract's manually first Ada/`STR` entry, skips the persisted Ada row so it is
not duplicated, retains inventory order, and maps an invalid legacy hero ID to
`UNKNOWN_CLASS`. The original SkyPass claim UI already invalidates this exact
query after a hero reward, so no replacement UI or new cache behavior was
introduced.

The player RPC contract now covers authentication, the initial Ada-only shape,
multiple owned hero classes, ordering, de-duplication, and the source fallback
enum. All 47 player RPC tests, 383 main-Worker tests, 231 multiplayer tests, 25
browser/game tests, six analytics tests, and both production builds passed.
Exact-head GitHub Actions run `31844826757` passed in 8m47s. Worker version
`908501c9-a639-4cf8-88af-2d7cc87ba0a9` was then deployed and the fail-closed
verifier matched the exact web/game assets, six locales, and cache policy. A
public smoke probe returned `401` and `Cache-Control: no-store` before inventory
access, while `Ping` remained healthy. Production had no multi-hero account to
probe without mutating player state, so the multi-hero response is proven by
the isolated D1 Worker contract rather than a fabricated production grant.

### Seen-state and favorite mutation fidelity — 2026-08-14

The browser-consumer review also found two source-semantic gaps in preserved
inventory mutations. `MarkDeckNotNew` previously reported success for a
missing deck and for a locked starter deck, while the Go API returns not found
and failed precondition respectively. `MarkItemsNotNew` silently ignored an
invalid encoded item type inside a batch, allowing the valid portion of the
same request to be committed instead of rejecting the request atomically.

Milestone `eb314f09` restores those contracts. Deck mutations now verify
identity ownership and unlocked state before updating, with source-compatible
`404` and `412` WebRPC errors. Item mutations validate every token ID and item
type before building the D1 batch, so a mixed valid/invalid request produces no
partial state change. The same contract suite now directly covers favorite and
unfavorite deck persistence, unlocked/locked/missing deck seen state,
immediate sticker and deferred card-back seen state, atomic invalid batches,
numeric validation, authentication, and required arguments.

All 49 player RPC tests, 385 main-Worker tests, 231 multiplayer tests, 25
browser/game tests, six analytics tests, every source/off-chain audit, and both
production builds passed. Exact-head GitHub Actions run `31846317892` passed in
8m57s. Worker version `59bc4a28-ef2b-4bc9-89e7-61d5a1132708` was then deployed;
the fail-closed verifier matched web asset `/assets/index-d976a081.js`, game
asset `/game/cloudflare/assets/index-79a70ba2.js`, all six exact locales, and
the release-safe cache policy. A public probe kept `Ping` healthy, while an
unauthenticated `MarkDeckNotNew` request returned `401` and
`Cache-Control: no-store` without mutating production player data.

### Countdown and direct browser-contract proof — 2026-08-14

Milestone `468293bc` pins the source season calendar and reroll boundaries in
deterministic Worker tests. The contract covers the exact season anchor,
season 62, the source's one-second current-season offset, the next-season
boundary, and daily, weekly, and seasonal quest reroll times. It changes no
runtime behavior; its purpose is to prevent a plausible-looking replacement
calendar from drifting away from the original product.

Milestone `e2c49e01` strengthens the browser-consumer gate further. Every one
of the 103 Worker-backed RPC calls made by the preserved webapp and game must
now have an exact method literal or endpoint URL in the Worker contract tests;
comments and descriptive strings do not count. Together with the five guarded
legacy-wallet non-ports, all 108 original browser calls now have a fail-closed
implementation disposition. Exact-head GitHub Actions run `31848249281`
passed the complete release contract in 9m02s. Both milestones are
release-safety-only and required no production deployment.

### Public account-read access fidelity — 2026-08-14

The browser access audit found three authentication-boundary regressions.
`GetCardOwnership` ignored its source `accountAddress` argument and returned
the signed-in viewer's collection even while viewing someone else's account.
`AccountLeaderboard` required a login although the source allows a public,
explicit account target. Conversely, `GetStickers` and
`GetStickersBySeason` had become public even though the source access map
requires an authenticated player.

Milestone `de1a2322` restores those source contracts. Public targeted account
reads validate that the requested identity exists and return that identity's
inventory; a signed-in request without a target still falls back to the
current player. Missing or unknown targets fail with `400`, and sticker
metadata again rejects unauthenticated calls with `401`. The release gate now
compares the source and Worker public/authenticated boundary for every one of
the 103 Worker-backed browser RPCs, including fall-through aliases.

All 391 main-Worker tests, 231 multiplayer tests, 25 browser/game tests, six
analytics tests, every source/off-chain audit, and both production builds
passed. Exact-head GitHub Actions run `31848909429` passed in 9m06s. Worker
version `1b4e12ed-6dc4-44e4-a76a-49ee08b7032b` was then deployed; the
fail-closed verifier matched web asset `/assets/index-d976a081.js`, game asset
`/game/cloudflare/assets/index-79a70ba2.js`, all six exact locales, and the
release-safe cache policy. Read-only production probes returned healthy
`Ping`, `400` for public collection and leaderboard reads without a target,
and `401` for an unauthenticated sticker read, all with
`Cache-Control: no-store`.

### Complete source access proof — 2026-08-14

Milestone `c55b6d55` extends the public/authenticated comparison from browser
consumers to every functional source RPC. All 148 functional methods must now
have a source access-map entry and an exact Worker access disposition. A
missing source entry, a missing Worker case, or any public/authenticated drift
fails the release audit. The browser audit reuses the same parser so the two
gates cannot silently disagree.

The full release contract passed with 391 main-Worker tests, 231 multiplayer
tests, 25 browser/game tests, and six analytics tests. Exact-head GitHub
Actions run `31850389303` passed in 8m52s. This was a release-safety milestone
only and did not require a production deployment.

### Replay and match-history fidelity — 2026-08-14

The replay failure reported after the game engine loaded was caused by archive
JSON decoding plain objects where the original engine expects `Map` values.
Milestone `24e9c8e4` restores the tagged `Map` values before WASM enum decoding.
The checked-in parser subsequently decoded every one of the 80 chunks in a
real completed production practice-PvP replay; the initialization record
revived both the card-instance and card-rarity maps and all 79 gameplay
records decoded without the enum exception. This verification was read-only
and performed no D1 writes.

The same replay exposed two match-list projection regressions. Initial deck
sizes were hardcoded to zero, and the global move count was duplicated for
both players. Milestone `147d8992` derives the exact initial card counts from
the authoritative private match seeds and records the source's separate
per-player move metric, counting only `Attack` and `PlayCard`. Historical
records retain the old aggregate-count fallback instead of becoming
unreadable.

All 391 main-Worker tests, 232 multiplayer tests, 25 browser/game tests, six
analytics tests, source/off-chain audits, typechecks, and both production
builds passed. Exact-head GitHub Actions run `31851123135` passed in 8m54s.
Game Worker version `a88966dd-6e41-4d99-824c-1c273145f9b5` and main Worker
version `d90edf60-f3b5-4ab5-9c84-5817f149604f` were deployed. The fail-closed
verifier matched web asset `/assets/index-d976a081.js`, game asset
`/game/cloudflare/assets/index-79a70ba2.js`, all six locales, and the release-
safe cache policy. Read-only production probes returned healthy API and game
workers with `Cache-Control: no-store`; the affected replay now reports both
30-card initial decks and all 80 archive records.

### Canonical SkyPass reward cards — 2026-08-14

The Go SkyPass reward applier returns the complete `card.Card` selected from
the source card index and changes only its reward `itemType`. The TypeScript
port instead constructed a placeholder from a short name table and inferred
class ranges. Most card rewards therefore reached the preserved claim dialog
with empty descriptions, assets, and image URLs; `UNKNOWN` element, type, and
set values; zero stats; and an invented `isNew: true` flag.

Milestone `a1ee00c9` now projects rewards from the checked-in canonical card
library. Base-card and hero-starter unlock rows use the same canonical name and
class instead of the removed fallback table. `ListSkypassRewards` also
rehydrates previously persisted placeholder card receipts at read time, so an
existing immutable receipt renders correctly without being rewritten. The
source's nullable `isNew` field remains `null`, while the reward frame is still
set explicitly as the Go applier does.

The isolated Worker contract covers a card outside the former name table,
including its description, asset, class, element, type, stats, set, image URLs,
inventory unlock, and read-time repair of a legacy placeholder. The focused
player RPC suite passed 50/50 tests; the complete release gate passed 392 main-
Worker tests, 232 multiplayer tests, 25 browser/game tests, six analytics
tests, every source/off-chain audit, all typechecks, and both production
builds. Exact-head GitHub Actions run `31855485197` passed in 8m14s.

Main Worker version `0f94187f-9e42-42ad-84ec-c9525e73a3d0` was then deployed.
The fail-closed verifier matched web asset `/assets/index-b6aa1ef3.js`, game
asset `/game/cloudflare/assets/index-79a70ba2.js`, all six exact locales, and
the release-safe cache policy on its first attempt. Public probes returned a
healthy `Ping` and an unauthenticated `ClaimSkypassRewards` rejection with
`Cache-Control: no-store`. No production reward was claimed or fabricated;
the authenticated mutation path is proven by isolated D1 Worker tests.

### Complete match metadata JSON wire — 2026-08-14

Milestone `92bb3d04` closes the remaining generated-wire gap around match
history, match detail, admin match views, and replay metadata. The Go `Match`
and `MatchPlayer` structs do not use JSON `omitempty`: all 21 public match
fields and all 11 player fields are present, and nil pointers serialize as
explicit nulls. The TypeScript projection had omitted missing region, tag art,
crystal, session, winner, tutorial, and timestamp values. That sparse shape
could reach the same preserved enum-sensitive client path as the earlier
reward-union mismatch.

A shared source-shaped normalizer now runs at the single persisted-match row
projection used by every list, detail, staff, and replay-capability read.
Existing D1 rows therefore receive the corrected shape on read without being
rewritten. The source-derived release gate parses both generated Go structs,
their exact field order, every pointer, and the absence of `omitempty`; mutation
coverage rejects source drift, a missing null arm, a raw database projection,
or a replay boundary that bypasses normalization. Direct exact-object tests
cover nil match/player pointers, the account match-list boundary, completed
replay metadata, and the source-valid in-progress null winner/end time.

The complete local release contract passed 393 main-Worker tests, 34
game-server unit tests, 93 game-server Workers tests, 31 match-service tests,
78 matchmaker tests, 25 game/browser tests, six analytics tests, every
source/off-chain audit, all typechecks, and both production builds. Exact-head
GitHub Actions run `31861410988` passed in 9m02s before deployment.

Only the main Worker was deployed, advancing it from
`0f94187f-9e42-42ad-84ec-c9525e73a3d0` to
`4f444875-bbe5-476a-97b4-bebe16a46a6d`. The game Worker remained
`a83e80fe-292d-4562-a544-e8c7949cc7f6`, the match service remained
`bed7174c-e5a6-44fb-8a0f-7c73b008dc90`, and the matchmaker remained
`a0663ea9-6fbb-49ac-9d7c-e2e530a9baea`. The production verifier resolved web
asset `/assets/index-d976a081.js`, game asset
`/game/cloudflare/assets/index-79a70ba2.js`, all six exact locales, and the
release-safe cache policy on its first attempt.

Public `Ping`, `Version`, game-mode, and protocol-v3 game-health probes
returned `200` with `no-store`; both Practice modes remained enabled and both
Conquest modes remained disabled. The signed-in production account rendered
its real human-practice match 12 in `LATEST MATCHES`, and its existing replay
loaded through the engine to the 2:59/3:00 replay scene with both players and
controls visible and no enum error. The read-only reward-readiness audit kept
SkyPass `1/1` active and every policy-gated reward track dormant. Verification
created no match, reward, receipt, inventory row, pool, queue, D1 migration, or
economy authority.

### Complete Conquest status JSON wire — 2026-08-14

Milestone `973a25ba` applies the same generated-wire discipline to the
player-facing `ConquestStatus` and `ConquestStats` responses. The Go `Conquest`
struct has nine public JSON fields and no JSON `omitempty`; its deck class,
creation time, and end time are pointers. An in-progress conquest therefore
includes an explicit `"endedAt": null`, while the TypeScript projection had
conditionally omitted that field. Strict source-shaped consumers could reject
the sparse object even though the underlying conquest state was valid.

A dedicated normalizer now emits all nine fields with explicit null pointer
arms while retaining the generated TypeScript domain type used by the match
service. The source-derived release gate parses the exact generated `Conquest`
and 11-field `ConquestStats` structures, pointer sets, field order, and absence
of JSON omission. Mutation coverage rejects source drift, a missing null arm,
an incomplete statistics object, or a main-Worker boundary that bypasses the
shared projection. The direct Worker test asserts the exact status object for
an in-progress conquest, including the derived hero deck class and null end
time.

The complete release contract passed 393 main-Worker tests, 34 game-server
unit tests, 93 game-server Workers tests, 31 match-service tests, 78 matchmaker
tests, 25 game/browser tests, six analytics tests, every source/off-chain
audit, all service typechecks, and both production builds. Exact-head GitHub
Actions run `31863349134` passed in 7m36s before deployment.

Only the main Worker was deployed, advancing it from
`4f444875-bbe5-476a-97b4-bebe16a46a6d` to
`4075b6a3-1f2b-4da5-9408-1dc70af1dc86`. The game Worker, match service, and
matchmaker were not deployed, and no D1 migration ran. The fail-closed
verifier again resolved web asset `/assets/index-d976a081.js`, game asset
`/game/cloudflare/assets/index-79a70ba2.js`, all six exact locales, and the
release-safe cache policy on its first attempt. Public `Version`, `Ping`, and
game-mode probes returned `200` with `Cache-Control: no-store`; the game Worker
remained healthy on protocol 3, and both Conquest modes remained disabled.

### Complete Account profile JSON wire — 2026-08-14

Milestone `60c91b09` applies the generated-wire rule to every Cloudflare
`Account` projection. The Go struct has 19 public JSON fields with no
`omitempty`; ten are pointers and therefore serialize as explicit nulls when
unset. The previous TypeScript identity, wallet-compatibility, and leaderboard
objects conditionally omitted values such as settings, region, title, crystal,
inviter, and burner status. Public reads now retain the source privacy boundary
by returning null settings and burner status, while owner and staff reads keep
their permitted nested values. Nested `AccountStats` and `AccountSettings`
continue to honor their own source `omitempty` tags.

The shared projection also restores the source `CrystalGetter` decoration from
identity-owned off-chain inventory. Profile and leaderboard reads select a
positive `SW_CRYSTALS` balance with the exact source priority order
`7, 1, 2, 3, 8, 4, 5, 6`; this remains an account cosmetic and does not require
a wallet. Direct Worker tests cover the exact 19-field owner and public shapes,
privacy nulls, source crystal fallback after a balance reaches zero, and the
leaderboard/deck-rank boundaries. A source-derived mutation gate rejects field,
pointer, nested-omission, priority, positive-balance, projection, or API-route
drift and is required by the complete CI build.

The complete release contract passed 394 main-Worker tests, 34 game-server
unit tests, 93 game-server Workers tests, 31 match-service tests, 78 matchmaker
tests, 25 game/browser tests, six analytics tests, every source/off-chain
audit, all service typechecks, and both production builds. Exact-head GitHub
Actions run `31864996362` passed before deployment.

Only the main Worker was deployed, advancing it from
`4075b6a3-1f2b-4da5-9408-1dc70af1dc86` to
`f2919ba4-3849-4163-a197-c718573d1f34`. The game Worker remained
`a83e80fe-292d-4562-a544-e8c7949cc7f6`, the match service remained
`bed7174c-e5a6-44fb-8a0f-7c73b008dc90`, and the matchmaker remained
`a0663ea9-6fbb-49ac-9d7c-e2e530a9baea`. Cloudflare uploaded no asset changes;
the verifier resolved web asset `/assets/index-d976a081.js`, game asset
`/game/cloudflare/assets/index-79a70ba2.js`, all six exact locales, and the
release-safe cache policy on its first attempt. Public `Version`, `Ping`, and
game-mode probes returned `200` with `Cache-Control: no-store`; game and
matchmaker protocol-3 health remained healthy, both Conquest modes remained
disabled, and production D1 reported no pending migrations. Verification did
not create synthetic account, item, match, reward, or economy state.

### Complete AccountStat JSON wire — 2026-08-14

Milestone `f34a57f8` applies the generated-wire rule to every public
`AccountStat` projection. The Go struct has 19 public JSON fields; its six
non-`omitempty` pointers (`experience`, `score`, `createdAt`, `rank`,
`rankProgress`, and `season`) serialize as explicit nulls when unset. The sole
omitted public-tagged field is the internal Glicko `playerRankState`. The
previous TypeScript projections omitted some nil pointer fields and did not
make the public-versus-internal state boundary explicit.

A shared normalizer now emits the complete public shape while allowing the
typed internal match profile to opt into `playerRankState`. Account profile and
history reads derive experience, rank, and rank progress; synthetic missing
seasons preserve the source's nil score, creation time, and rank; leaderboard
entries preserve their source score and creation time while keeping derived
experience, rank, and rank progress null. Direct Worker tests assert the exact
18-field public object, the synthetic and leaderboard null arms, absence of
internal Glicko state on public responses, and unchanged internal D1 state.

The source-derived release gate parses the generated Go field order, all six
pointer arms, the sole `omitempty` field, the public/internal RPC regressions,
synthetic-season construction, leaderboard projection, and each main-Worker
route. Its mutation suite rejects 13 forms of source drift, sparse nulls,
internal-state leakage, or projection bypass. The complete release contract
passed 394 main-Worker tests, 34 game-server unit tests, 93 game-server Workers
tests, 31 match-service tests, 78 matchmaker tests, 25 game/browser tests, six
analytics tests, every source/off-chain audit, all service typechecks, and both
production builds. Exact-head GitHub Actions run `31866726129` passed before
deployment.

Only the main Worker was deployed, advancing it from
`f2919ba4-3849-4163-a197-c718573d1f34` to
`d91f8375-12c4-4870-ba2b-5948c2e7fe21`. The game Worker remained
`a83e80fe-292d-4562-a544-e8c7949cc7f6`, the match service remained
`bed7174c-e5a6-44fb-8a0f-7c73b008dc90`, and the matchmaker remained
`a0663ea9-6fbb-49ac-9d7c-e2e530a9baea`. Cloudflare uploaded no asset changes;
the verifier resolved web asset `/assets/index-d976a081.js`, game asset
`/game/cloudflare/assets/index-79a70ba2.js`, all six exact locales, and the
release-safe cache policy on its first attempt. Public `Version`, `Ping`, and
game-mode probes returned `200` with `Cache-Control: no-store`; game and
matchmaker protocol-3 health remained healthy, both Conquest modes remained
disabled, and production D1 reported no pending migrations. Verification did
not create synthetic account, statistic, match, reward, or economy state.

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

Two additional Conquest-readiness adapters list only the database-verified
three-win drill tuples and bind one exact settlement/delivery pair through a
separate dormant verifier capability. The write cannot fabricate the drill,
change reward inventory, or enable a mode; it replaces the last hand-written
readiness row with an idempotent immutable audit.

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

Three reviewed referral-sticker adapters list versions, atomically import and
propose one exact current-season sticker manifest, and independently activate
that same manifest. The catalog remains player-invisible until activation;
monotonic versions, separate dormant capabilities, immutable idempotency
receipts, and exact-threshold confirmation keep metadata from becoming reward
authority by itself.

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
