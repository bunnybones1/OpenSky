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

### Complete Deck JSON wire — 2026-08-14

Milestone `b56d2f7a` applies the generated-wire rule to every player-facing
`Deck` projection. The Go struct has 13 public JSON fields with no
`omitempty`; its creation, update, and favorite times are pointers and
therefore serialize as explicit nulls when nil. The account ID and pagination
cursor remain private. The previous TypeScript projection returned an empty
string for an unfavorited deck's nil `favoritedAt`, and an existing loose test
had accidentally preserved that mismatch.

A shared normalizer now emits the exact field order and all three pointer arms.
The existing D1 row projection feeds List, Search, Get, Create, and Update, so
all five player-facing RPCs receive the same source-shaped response without a
schema change. It also preserves the source custom marshal behavior that
derives `isFavorite` from a non-nil favorite time. Direct Worker coverage
asserts all 13 fields, real creation/update timestamps, and null favorite time
both for starter-deck listing and after toggling a custom deck off.

The source-derived release gate parses the generated Go public/private field
set, pointer set, absence of omission, custom favorite marshal, source RPCs and
favorite regression, shared Worker projection, and all main-Worker routes. Its
mutation suite rejects ten forms of source drift, sparse nulls, favorite-time
coercion, or projection bypass. The complete release contract passed 394
main-Worker tests, 34 game-server unit tests, 93 game-server Workers tests, 31
match-service tests, 78 matchmaker tests, 25 game/browser tests, six analytics
tests, every source/off-chain audit, all service typechecks, and both
production builds. Exact-head GitHub Actions run `31868082473` passed before
deployment.

Only the main Worker was deployed, advancing it from
`d91f8375-12c4-4870-ba2b-5948c2e7fe21` to
`7592f739-3069-4dde-9c83-12b7bdc3e64d`. The game Worker remained
`a83e80fe-292d-4562-a544-e8c7949cc7f6`, the match service remained
`bed7174c-e5a6-44fb-8a0f-7c73b008dc90`, and the matchmaker remained
`a0663ea9-6fbb-49ac-9d7c-e2e530a9baea`. Cloudflare uploaded no asset changes;
the verifier resolved web asset `/assets/index-d976a081.js`, game asset
`/game/cloudflare/assets/index-79a70ba2.js`, all six exact locales, and the
release-safe cache policy on its first attempt. Public `Version`, `Ping`, and
game-mode probes returned `200` with `Cache-Control: no-store`; game and
matchmaker protocol-3 health remained healthy, both Conquest modes remained
disabled, and production D1 reported no pending migrations. Verification did
not create synthetic deck, account, match, reward, or economy state.

### Complete Card JSON wire — 2026-08-14

Milestone `f0afe396` applies the generated-wire rule to all four public Card
RPC boundaries. The Go struct has 19 public JSON fields with no `omitempty`;
its attached-spell ID, image URL, new-card flag, Silver token ID, and Gold token
ID pointers serialize as explicit nulls when nil, as does the nil-capable
keyword slice. Internal attributes and season-availability metadata remain
private. The previous TypeScript routes returned raw catalog objects, which
could leak `validFromSeason` and did not make the source null contract explicit.

A shared projection now emits the exact public field order for
`GetCardLibrary`, `GetCardsByID`, `GetCardsByDeckString`, and nested
`SearchCards` results. Internal catalog consumers retain `validFromSeason` for
reward-policy eligibility checks, so enforcing the API privacy boundary does
not weaken off-chain fulfillment rules. Direct Worker tests assert all 19
fields, nullable pointer values, the nested three-size image object, and the
absence of both private fields on direct and nested Card results.

The source-derived release gate parses the generated Go public/private field
set, pointer set, absence of omission, nested `CardImageURL` contract, all four
source RPCs and Worker projections, and continued internal season-policy use.
Its mutation suite rejects ten forms of source drift, sparse nulls, private
metadata leakage, projection bypass, or policy-metadata loss. The complete
release contract passed 394 main-Worker tests, 34 game-server unit tests, 93
game-server Workers tests, 31 match-service tests, 78 matchmaker tests, 25
game/browser tests, six analytics tests, every source/off-chain audit, all
service typechecks, and both production builds. Exact-head GitHub Actions run
`31869368136` passed before deployment.

Only the main Worker was deployed, advancing it from
`7592f739-3069-4dde-9c83-12b7bdc3e64d` to
`4c2c3160-759c-4ae5-a869-3b1d7dd174b2`. The game Worker remained
`a83e80fe-292d-4562-a544-e8c7949cc7f6`, the match service remained
`bed7174c-e5a6-44fb-8a0f-7c73b008dc90`, and the matchmaker remained
`a0663ea9-6fbb-49ac-9d7c-e2e530a9baea`. Cloudflare uploaded no asset changes;
the verifier resolved web asset `/assets/index-d976a081.js`, game asset
`/game/cloudflare/assets/index-79a70ba2.js`, all six exact locales, and the
release-safe cache policy on its first attempt. Public `Version`, `Ping`, and
game-mode probes returned `200` with `Cache-Control: no-store`; game and
matchmaker protocol-3 health remained healthy, both Conquest modes remained
disabled, and production D1 reported no pending migrations. A live
`GetCardsByID` probe returned the exact 19-field Card shape with explicit nulls
and no internal metadata. Verification did not create synthetic card, account,
match, reward, or economy state.

### Complete FeedEvent JSON wire — 2026-08-15

Milestone `3e612232` applies the generated-wire rule to the complete public
`FeedEvent` boundary. The Go struct has 16 public JSON fields with no
`omitempty`; its 11 pointer fields and three nil-capable slices serialize as
explicit nulls when unset. The account ID, match ID, and pagination cursor
remain private. The previous TypeScript feed builders forced empty card and
hero slices and returned partially populated event objects instead of the
source shape.

A shared projection now emits the exact public field order and sends nested
cards through the hardened Card serializer. As in the source RPC, `MATCH` and
`LEVELUP` events remain excluded, while `REWARD` and `TRADE` token receipts
hydrate base, Silver, and Gold cards from the generated catalog. The existing
Cloud Weasel browser encoding's `0xff` base-card frame is accepted without
altering the persisted token receipt. Direct Worker tests cover all null arms,
the exact nested 19-field Card shape, base and Gold hydration, and the Silver
Conquest V2 reward path.

The source-derived release gate parses the generated Go field order, pointer,
slice, private-field, omission, source-filter, and reward-hydration contracts;
it also requires the main Worker route and original web feed consumer to stay
connected to the shared projection. Its mutation suite rejects 12 forms of
source drift, sparse nulls, private-field leakage, Card-wire bypass, missing
frame compatibility, or route drift. The complete release contract passed 394
main-Worker tests, 34 game-server unit tests, 93 game-server Workers tests, 31
match-service tests, 78 matchmaker tests, 25 game/browser tests, six analytics
tests, every source/off-chain audit, all service typechecks, and both
production builds. Exact-head GitHub Actions run `31870915182` passed before
deployment.

Only the main Worker was deployed, advancing it from
`4c2c3160-759c-4ae5-a869-3b1d7dd174b2` to
`5e72b4ee-eac8-4bdf-8e7f-1bf6794a3bca`. The game Worker remained
`a83e80fe-292d-4562-a544-e8c7949cc7f6`, the match service remained
`bed7174c-e5a6-44fb-8a0f-7c73b008dc90`, and the matchmaker remained
`a0663ea9-6fbb-49ac-9d7c-e2e530a9baea`. Cloudflare uploaded no changed asset
bytes; the verifier resolved web asset `/assets/index-b1769b84.js`, game asset
`/game/cloudflare/assets/index-79a70ba2.js`, all six exact locales, and the
release-safe cache policy on its first attempt. The generated web entry differs
from the previous entry only in chunk filenames and its source-map name; after
normalizing those hashes, the entries are byte-for-byte identical, and no
webapp source changed in this milestone.

Public `Version`, `Ping`, and game-mode probes returned `200` with
`Cache-Control: no-store`; game and matchmaker protocol-3 health remained
healthy, practice PvP and bot modes remained enabled, both Conquest modes
remained disabled, and production D1 reported no pending migrations. A
signed-in production account page rendered its existing “Gained a Stalwart
Sentinel Card!” reward through the hydrated feed path. Verification did not
create synthetic feed, card, account, match, reward, or economy state.

### Complete Item and ItemSummary JSON wire — 2026-08-15

Milestone `9d62314c` applies the generated-wire rule to every public `Item` and
`ItemSummary` RPC boundary. The Go `Item` struct has nine public JSON fields
with no `omitempty`; contract address, update and creation timestamps, and the
new-item flag are pointers that serialize as explicit nulls when unset. The Go
`ItemSummary` struct has five public fields, including explicit nullable update
and creation timestamps. Private account identifiers and addresses remain
absent, and all generated BigInt values remain decimal JSON strings.

Shared projections now cover ownership lists, aggregate summaries, individual
and batch supply, equip results, and equipped-item lists. Identity-owned Cloud
Weasel inventory deliberately reports `contractAddress: null`: off-chain
rewards do not invent an on-chain wallet contract. Direct Worker tests assert
the exact nine- and five-field orders, all nullable arms, private-field
absence, nested batch results, common equipped-row projection, and the
off-chain contract rule.

The source-derived release gate parses the generated Go field order, pointer,
private-field, no-omission, and BigInt contracts; it also checks all six source
RPC methods, their API routes, shared projections, batch delegation, and the
common equipped-item mapper. Its mutation suite rejects 14 forms of source
drift, sparse nulls, private-field leakage, numeric BigInts, projection bypass,
or route drift. The complete release contract passed 394 main-Worker tests, 34
game-server unit tests, 93 game-server Workers tests, 31 match-service tests, 78
matchmaker tests, 25 game/browser tests, six analytics tests, every
source/off-chain audit, all service typechecks, and both production builds.
Exact-head GitHub Actions run `31872715185` passed before deployment.

Only the main Worker was deployed, advancing it from
`5e72b4ee-eac8-4bdf-8e7f-1bf6794a3bca` to
`d8cccbcd-b982-46f6-947b-9b8dd3a01255`. The game Worker remained
`a83e80fe-292d-4562-a544-e8c7949cc7f6`, the match service remained
`bed7174c-e5a6-44fb-8a0f-7c73b008dc90`, and the matchmaker remained
`a0663ea9-6fbb-49ac-9d7c-e2e530a9baea`. Cloudflare uploaded no changed asset
bytes; the verifier resolved web asset `/assets/index-d976a081.js`, game asset
`/game/cloudflare/assets/index-79a70ba2.js`, all six exact locales, and the
release-safe cache policy on its first attempt.

Public `Version`, `Ping`, item-supply, and game-mode probes returned `200` with
`Cache-Control: no-store`; the currently empty public Silver/Gold supply
returned the source-compatible `{"summary":{}}`. Game and matchmaker
protocol-3 health remained healthy, practice PvP and bot modes remained
enabled, both Conquest modes remained disabled, and production D1 reported no
pending migrations. A signed-in production account page rendered its existing
31-card Cloud Weasel inventory and reward feed through the hardened item paths.
Verification was read-only and created no synthetic item, account, match,
reward, or economy state.

### Complete CardWithBalance and BalanceTuple JSON wire — 2026-08-15

Milestone `87da0f24` applies the generated-wire rule to the nested
`SearchCards` balance result. The Go `CardWithBalance` struct has four public
JSON fields with no `omitempty`; its Card and creation-time pointers and its
nil-capable balance map serialize as explicit nulls. Its database pagination
cursor remains private. The nested `BalanceTuple` has two non-omitted fields:
a decimal-string BigInt balance and a nullable new-item pointer.

The previous TypeScript projection returned an empty map and empty timestamp
when balances were not requested, and it omitted false or unset `isNew` values.
It also limited balance rows to the three card frames, while the source query
selects every generated item type at or above `SW_BASE_CARDS`. A shared
projection now composes the protected Card wire, preserves nil versus empty-map
semantics, emits every tuple flag explicitly, and derives that complete source
item-type range. Ownership filtering remains limited to the three source card
frames, independently from the broader source balance calculation.

The source-derived release gate parses both generated structs, field order,
pointer and map nullability, private cursor, BigInt encoding, source account
guard, source item-type threshold, balance-map initialization, and nil `IsNew`
behavior. It also requires the repository query, search algorithm, composed
Card projection, API route, and complete-build/CI gate to stay connected. Its
mutation suite rejects 18 forms of source drift, sparse nulls, cursor leakage,
numeric BigInts, item-range narrowing, invented newness, or projection bypass.
The complete release contract passed 396 main-Worker tests, 34 game-server unit
tests, 93 game-server Workers tests, 31 match-service tests, 78 matchmaker
tests, 25 game/browser tests, six analytics tests, every source/off-chain
audit, all service typechecks, and both production builds. Exact-head GitHub
Actions run `31874045151` passed before deployment.

Only the main Worker was deployed, advancing it from
`d8cccbcd-b982-46f6-947b-9b8dd3a01255` to
`ffece14b-ad95-4f90-8121-3c3314f31425`. The game Worker remained
`a83e80fe-292d-4562-a544-e8c7949cc7f6`, the match service remained
`bed7174c-e5a6-44fb-8a0f-7c73b008dc90`, and the matchmaker remained
`a0663ea9-6fbb-49ac-9d7c-e2e530a9baea`. Cloudflare uploaded no changed asset
bytes; the verifier resolved web asset `/assets/index-d976a081.js`, game asset
`/game/cloudflare/assets/index-79a70ba2.js`, all six exact locales, and the
release-safe cache policy on its first attempt.

Read-only production `SearchCards` probes returned `200` with
`Cache-Control: no-store`. Anonymous card 6 emitted `balanceByType: null` and
`createdAt: null`; the public account projection emitted its Base-card balance
with `isNew: null`; and card 1 retained the source's broader range by reporting
the matching `SW_HERO` tuple with an explicit null flag. Practice PvP and bot
modes remained enabled, both Conquest modes remained disabled, game and
matchmaker protocol-3 health stayed healthy, and production D1 reported no
pending migrations. The signed-in account page still rendered its 31-card
inventory and existing reward feed. Verification created no synthetic card,
item, account, match, reward, or economy state.

### Complete CardOwnershipResponse JSON wire — 2026-08-15

Milestone `6203c500` applies the generated-wire rule to the complete
`GetCardOwnership` response. The Go `CardOwnershipResponse` struct has 13
public JSON fields with no `omitempty` or pointer fields: the nested card
balance map, locked/unlocked/pending totals, and each corresponding class,
frame, and class-by-frame aggregate map. The source initializes all ten maps,
including an empty map when there are no matching rows.

For every owned card, the source also initializes Base, Silver, and Gold with a
zero-value `BalanceTuple`. Those tuples have a nil `IsNew` pointer and therefore
serialize as `isNew: null`; a stored balance row carries a real pointer, so its
false value must remain `isNew: false`. The previous TypeScript projection
invented false for zero-value frames. A shared ownership projection now
normalizes every nested tuple through the protected `BalanceTuple` wire while
emitting all 13 outer fields in generated order.

The source-derived release gate parses the generated field order, map types,
no-omission and non-pointer contract; verifies every source map initialization,
the three-frame tuple initialization, and the stored `IsNew` assignment; and
requires the shared projection, repository, API route, and complete-build/CI
gate to remain connected. Its mutation suite rejects 14 forms of source drift,
sparse tuple flags, map-initialization loss, or projection/route bypass. The
complete release contract passed 397 main-Worker tests, 34 game-server unit
tests, 93 game-server Workers tests, 31 match-service tests, 78 matchmaker
tests, 25 game/browser tests, six analytics tests, every source/off-chain
audit, all service typechecks, and both production builds. Exact-head GitHub
Actions run `31875076774` passed before deployment.

Only the main Worker was deployed, advancing it from
`ffece14b-ad95-4f90-8121-3c3314f31425` to
`d9f7e220-0aa9-4eb6-b298-f451bd96edaa`. The game Worker remained
`a83e80fe-292d-4562-a544-e8c7949cc7f6`, the match service remained
`bed7174c-e5a6-44fb-8a0f-7c73b008dc90`, and the matchmaker remained
`a0663ea9-6fbb-49ac-9d7c-e2e530a9baea`. Cloudflare uploaded no changed asset
bytes; the verifier resolved web asset `/assets/index-d976a081.js`, game asset
`/game/cloudflare/assets/index-79a70ba2.js`, all six exact locales, and the
release-safe cache policy on its first attempt.

The read-only production `GetCardOwnership` probe returned `200` with
`Cache-Control: no-store` and all 13 response fields. Card 6 emitted its stored
Base tuple as `{balance: "1", isNew: false}` and both zero-value premium frames
as `{balance: "0", isNew: null}`. The account aggregate remained 31 unlocked
and 825 locked cards. Public API `Ping` and version metadata passed; practice
PvP and bot modes remained enabled, both Conquest modes remained disabled,
game and matchmaker protocol-3 health stayed healthy, and production D1
reported no pending migrations. The signed-in original account page still
rendered its full navigation, 31/856 Base-card inventory, rank and Conquest
sections, and existing “Gained a Stalwart Sentinel Card!” reward. Verification
created no synthetic card, item, account, match, reward, or economy state.

### Complete PendingCardsResponse JSON wire — 2026-08-15

Milestone `61e136a7` applies the generated-wire rule to `GetPendingCards`. The
Go `PendingCardsResponse` has exactly three public JSON fields with no
`omitempty`: `cards`, `tokenIDs`, and `mintAt`. Both slices are nullable, and
the handler's outer result slice is also nil when an account has no delivery
tasks, so an empty account must return `{ "res": null }` rather than an empty
array. A delivery task whose card or token list is still nil must likewise
emit explicit null fields.

The embedded card is the canonical card-index projection. Its generated
`itemType` remains `UNKNOWN` and `isNew` remains null; Silver or Gold identity
is carried separately by `tokenIDs`. The previous TypeScript response invented
a Gold item type and true newness on the embedded card, returned an empty
array for no tasks, and leaked the card index's private `validFromSeason`
field. A shared pending-card projection now composes the protected Card wire
and preserves the exact three-field response shape and nil-slice behavior.

The source-derived release gate parses the generated response fields and Go
handler initialization, requires the shared projection to remain connected to
the delivery repository and API route, and composes the existing Card wire
gate for its nested object. Its mutation suite rejects 15 forms of source
drift, sparse nulls, invented enum/newness values, private catalog leakage, or
projection bypass. The complete release contract passed 400 main-Worker tests,
34 game-server unit tests, 93 game-server Workers tests, 31 match-service
tests, 78 matchmaker tests, 25 game/browser tests, six analytics tests, every
source/off-chain audit, all service typechecks, and both production builds.
Exact-head GitHub Actions run `31876497154` passed before deployment.

Only the main Worker was deployed, advancing it from
`d9f7e220-0aa9-4eb6-b298-f451bd96edaa` to
`27ea8f79-5f90-49d6-96f7-9edcacf5e751`. The game Worker remained
`a83e80fe-292d-4562-a544-e8c7949cc7f6`, the match service remained
`bed7174c-e5a6-44fb-8a0f-7c73b008dc90`, and the matchmaker remained
`a0663ea9-6fbb-49ac-9d7c-e2e530a9baea`. Cloudflare uploaded no changed asset
bytes; the verifier resolved web asset `/assets/index-d976a081.js`, game asset
`/game/cloudflare/assets/index-79a70ba2.js`, all six exact locales, and the
release-safe cache policy on its first attempt.

The signed-in production pending-cards page completed its authenticated query
without an enum or decoding error and rendered its source-compatible empty
state. Public API `Ping`, version metadata, and game-mode status returned `200`
with `Cache-Control: no-store`; practice PvP and bot modes remained enabled
and both Conquest modes remained disabled. Game and matchmaker protocol-3
health stayed healthy, and production D1 reported no pending migrations. The
signed-in original account page still rendered its full navigation, 31/856
Base-card inventory, rank and Conquest sections, match statistics, and
existing “Gained a Stalwart Sentinel Card!” reward. Verification created no
synthetic card, delivery task, item, account, match, reward, or economy state.

### Complete Page and SortBy JSON wire — 2026-08-15

Milestone `8721f75d` applies the generated-wire rule to every paginated RPC at
the shared JSON boundary. Go's `Page` has six public fields with no
`omitempty`: nullable page size, before/after cursors and availability flags,
plus a nullable sort slice. `SortBy` likewise always emits its column and
nullable order. Empty result pages therefore carry explicit null cursors,
while paginator-created availability flags remain real false values rather
than disappearing.

The source paginator also replaces an absent or empty sort request with its
effective default, removes the unique cursor key from the returned sort list,
and always allocates both availability flags. The Worker now reports the
source `created_at DESC` feed sort and the rank-sensitive leaderboard sort;
the special centered account-leaderboard response retains its source sparse
Page semantics, which the shared boundary completes with nulls. All existing
card, deck, match, account, staff, payment, and rank pagination routes pass
through the same projection.

The source-derived release gate parses both generated structs, their exact
field order/types/no-omission contract, paginator defaulting and cursor
attachment, source feed and leaderboard sort construction, the shared Worker
boundary, and the complete-build/CI connection. Its mutation suite rejects 14
forms of source drift, sparse nulls, cursor-flag loss, sort drift, boundary
bypass, or gate removal. The complete release contract passed 403 main-Worker
tests, 34 game-server unit tests, 93 game-server Workers tests, 31
match-service tests, 78 matchmaker tests, 25 game/browser tests, six analytics
tests, every source/off-chain audit, all service typechecks, and both
production builds. Exact-head GitHub Actions run `31877748621` passed before
deployment.

Only the main Worker was deployed, advancing it from
`27ea8f79-5f90-49d6-96f7-9edcacf5e751` to
`709470b3-6fd5-4be9-9113-d2f8bcd471c6`. The game Worker remained
`a83e80fe-292d-4562-a544-e8c7949cc7f6`, the match service remained
`bed7174c-e5a6-44fb-8a0f-7c73b008dc90`, and the matchmaker remained
`a0663ea9-6fbb-49ac-9d7c-e2e530a9baea`. Cloudflare uploaded no changed asset
bytes; the verifier resolved web asset `/assets/index-d976a081.js`, game asset
`/game/cloudflare/assets/index-79a70ba2.js`, all six exact locales, and the
release-safe cache policy on its first attempt.

Read-only production `SearchCards` probes returned `200` with
`Cache-Control: no-store`. An empty result emitted the exact six-field Page
with null cursors, false availability flags, and `mana_weight ASC`; a one-card
page emitted both source cursors, `hasBefore: true`, `hasAfter: false`, and the
same effective sort. Practice PvP and bot modes remained enabled and both
Conquest modes remained disabled. Game and matchmaker protocol-3 health stayed
healthy, and production D1 reported no pending migrations. The signed-in
original account page still rendered its full navigation, 31/856 Base-card
inventory, rank and Conquest sections, match statistics, and existing “Gained
a Stalwart Sentinel Card!” reward. Verification created no synthetic account,
page state, card, item, match, reward, or economy state.

### Complete player Reward JSON wire — 2026-08-15

Milestone `abc79009` applies the generated Go `Reward` wire to every
main-Worker producer and response boundary. The source union has exactly 11
public JSON fields with no `omitempty`: account, type, game mode, rank, XP,
card, hero, hero skin, deck, Conquest V2 treasure progress, and sticker
points. Every inactive pointer must therefore be an explicit null. Nested rank,
XP, card/item, deck, and treasure-progress pointers and nil slices retain the
same rule instead of disappearing from a sparse TypeScript object.

The shared projection now covers `ClaimQuestRewards`, `ReRollQuest`,
`ClaimSkypassRewards`, and `BotMatchEnd`. `ListQuests` and every empty player
reward result preserve the source handlers' nil-slice JSON as null rather than
an invented empty array. SkyPass list rows always expose `gainedRewards`, and
old persisted receipts are normalized when read. Embedded cards and items pass
through their existing generated-field projections, repairing older card
metadata while preventing internal catalog or persistence fields from leaking.

The source-derived gate parses the complete generated union and nested pointer
contracts, pins the nil-slice construction in the Go quest, SkyPass, and bot
handlers, requires all four public Worker boundaries and stored SkyPass reads,
and composes the protected Card and Item projections. Its mutation suite
rejects 14 forms of source drift, sparse variants, nil-slice invention, private
leakage, stored-receipt bypass, route bypass, or gate removal. Direct unit and
isolated D1 integration coverage assert exact union keys, nested nulls, card and
item privacy, empty reward results, quest XP/rank, SkyPass card claims, and bot
tutorial receipts.

The complete release contract passed 407 main-Worker tests, 34 game-server
unit tests, 93 game-server Workers tests, 31 match-service tests, 78 matchmaker
tests, 25 game/browser tests, six analytics tests, every source/off-chain
audit, all service typechecks, and both production builds. Exact-head GitHub
Actions run `31878912880` passed in 8m48s before deployment.

Only the main Worker was deployed, advancing it from
`709470b3-6fd5-4be9-9113-d2f8bcd471c6` to
`fda1a2e3-a52d-4635-a61e-d6caa3f99332`. The game Worker remained
`a83e80fe-292d-4562-a544-e8c7949cc7f6`, the match service remained
`bed7174c-e5a6-44fb-8a0f-7c73b008dc90`, and the matchmaker remained
`a0663ea9-6fbb-49ac-9d7c-e2e530a9baea`. Cloudflare uploaded no changed asset
files; the verifier resolved web asset `/assets/index-d976a081.js`, game asset
`/game/cloudflare/assets/index-79a70ba2.js`, all six exact locales, and the
release-safe cache policy on its first attempt. Production D1 reported no
pending migrations.

Read-only production `Ping` returned `200` with `Cache-Control: no-store`, and
an unauthenticated SkyPass claim returned `401` with the same cache boundary
before any player-state access. The signed-in original Home, complete season-62
SkyPass, and account screens all rendered without a Reward enum or union decode
error. The account retained its full navigation, 31/856 Base-card inventory,
rank and Conquest sections, match statistics, and existing “Gained a Stalwart
Sentinel Card!” receipt. Verification did not claim, fabricate, or mutate any
production reward, account, card, item, match, or economy state.

## Quest wire fidelity rollout — 2026-08-15

The generated Go `Quest` JSON contract has 14 required fields and does not use
`omitempty`; its quest type, epic type/index/length, reward, and periodicity
pointers therefore serialize as explicit `null` when inactive. `QuestReward`
likewise always emits both `itemType` and `amount`, including a null item-type
pointer. The TypeScript repositories intentionally use sparse internal objects,
so returning those objects directly could omit enum arms that the preserved
browser decoder expects.

`cloudflare/src/quest-wire.ts` now owns the source-shaped response projection.
`ListQuests` and `GetEpicQuestChain` normalize every list element, while
`ClaimQuestRewards` and `ReRollQuest` preserve a null outer quest and normalize
the returned quest when present. The projection emits every generated field and
the nested reward pointer without changing the repositories' internal model.

The source-derived gate parses the exact `Quest` and `QuestReward` field order,
types, and JSON tags from `api/proto/api.gen.go`; checks the pointer construction
in `api/data/quest.go`; covers all four response routes; and remains in the full
Cloudflare build. Eleven mutation cases fail closed on source pointer/tag drift,
sparse enum or reward output, route bypasses, list bypasses, and build-gate
removal. Direct unit and isolated-D1 integration tests assert the exact 14-field
wire for both ordinary and epic quests.

The complete release contract passed 410 main-Worker tests, 34 game-server unit
tests, 93 game-server Workers tests, 31 match-service tests, 78 matchmaker tests,
25 game/browser tests, six analytics tests, every source/off-chain audit, all
service typechecks, and both production builds. Exact-head GitHub Actions run
`31879885749` passed in 9m47s before deployment.

Only the main Worker was deployed, advancing it from
`fda1a2e3-a52d-4635-a61e-d6caa3f99332` to
`4a32473b-411c-4183-ba38-72b3f33d217f`. The game Worker remained
`a83e80fe-292d-4562-a544-e8c7949cc7f6`, the match service remained
`bed7174c-e5a6-44fb-8a0f-7c73b008dc90`, and the matchmaker remained
`a0663ea9-6fbb-49ac-9d7c-e2e530a9baea`. Cloudflare uploaded no changed asset
files; the verifier resolved web asset `/assets/index-b6aa1ef3.js`, game asset
`/game/cloudflare/assets/index-79a70ba2.js`, all six exact locales, and the
release-safe cache policy on its first attempt. Production D1 reported no
pending migrations.

Read-only production `Ping` returned `200` with `Cache-Control: no-store`, and
an unauthenticated `ListQuests` request returned `401` with the same cache
boundary before player-state access. The signed-in original `/quests/daily`
screen rendered its daily and starter-chain quests, reward amounts, progress,
and existing claim control without an enum/decode error; the complete season-62
SkyPass also rendered successfully. Verification did not click Claim or mutate
any production quest, reward, account, card, item, match, or economy state.

## SkyPass wire fidelity rollout — 2026-08-15

The generated Go SkyPass response mixes required pointer fields with
`omitempty` fields. `tier`, `itemType`, and `gainedRewards` therefore serialize
as explicit `null` when nil, while a zero `amount`, nil `attributes`, and empty
nested attribute slices are omitted. A nonnil empty attributes pointer still
serializes as `{}`, and a nonnil empty gained-reward slice remains `[]`.
Returning the repositories' convenient TypeScript shapes directly could lose
that distinction and make the preserved browser decoder reject a valid reward.

`cloudflare/src/skypass-wire.ts` now owns the shared source-shaped projection
for player and staff routes. It covers the response, level, reward, and nested
attribute structs and composes the already protected Reward union for
`gainedRewards`. Player and staff repositories retain whether D1 stored a nil
attributes pointer rather than inflating it into an object with empty slices.
`ListSkypassRewards`, both GM list views, GM update, and Cloudflare's staged
activation path all pass through the same serializer.

The source-derived gate parses every generated Go field, type, JSON tag, and
`omitempty` marker; pins the Go lister's nil/list construction; requires the
nullable D1 provenance and every response boundary; and remains in the complete
Cloudflare build. Fifteen mutations fail closed on pointer/tag changes, zero or
empty omission drift, source construction drift, stored-provenance loss, route
bypasses, and gate removal. Direct unit and isolated-D1 integration coverage
assert exact null, omission, empty-slice, nested Reward, player, and staff
behavior.

The complete release contract passed 414 main-Worker tests, 34 game-server unit
tests, 93 game-server Workers tests, 31 match-service tests, 78 matchmaker tests,
25 game/browser tests, six analytics tests, every source/off-chain audit, all
service typechecks, and both production builds. Exact-head GitHub Actions run
`31881389659` passed in 10m4s before deployment.

Only the main Worker was deployed, advancing it from
`4a32473b-411c-4183-ba38-72b3f33d217f` to
`0caab9ac-4418-441e-b79a-814a572640c1`. The game Worker remained
`a83e80fe-292d-4562-a544-e8c7949cc7f6`, the match service remained
`bed7174c-e5a6-44fb-8a0f-7c73b008dc90`, and the matchmaker remained
`a0663ea9-6fbb-49ac-9d7c-e2e530a9baea`. Cloudflare uploaded no changed asset
files; the verifier resolved web asset `/assets/index-d976a081.js`, game asset
`/game/cloudflare/assets/index-79a70ba2.js`, all six exact locales, and the
release-safe cache policy on its first attempt. Production D1 reported no
pending migrations.

Read-only production `Ping` returned `200` with `Cache-Control: no-store`, and
an unauthenticated `ListSkypassRewards` request returned `401` with the same
cache boundary before player-state access. The signed-in original `/skypass`
screen rendered season 62, the full level track, reward labels, premium control,
and its existing claim control without an enum or union decode error.
Verification did not click Claim or mutate any production SkyPass, reward,
account, card, item, match, or economy state.

## Notification wire fidelity rollout — 2026-08-15

The generated Go notification response is a five-value enum-discriminated
union. Its `type` pointer is required, inactive outer variants use
`omitempty`, and active leaderboard, Conquest, one-time, and season-start
payloads contain a second mix of required pointers, maps, slices, scalars, and
optional fields. In particular, nil leaderboard maps and rank slices and nil
nested rank enum pointers serialize as explicit `null`; one-time template
`createdAt`, `updatedAt`, and `updatedBy` are also required pointers. Both the
player list and staff template list originate as nil Go slices and therefore
serialize as `null` when empty.

`cloudflare/src/notification-wire.ts` now owns that complete source-shaped
projection. It selects only the union arm matching `NotificationType`, fills
the required zero-value fields for older sparse D1 payloads, strips inactive
arms, preserves required nulls and optional omissions, and normalizes the
public player list plus all three staff template response routes. This keeps
the repositories' storage-friendly internal representation away from the
preserved browser decoder.

The source-derived gate parses all seven generated Go structs and the exact
five-value enum; pins both source RPCs' nil-list construction and the data
model's active-arm validation; requires all four Worker response boundaries;
and remains in the complete Cloudflare build. Sixteen mutations fail closed on
enum, pointer, tag, omission, nil-list, validator, route, and gate drift. Direct
unit and isolated-D1 integration coverage asserts every union arm, inactive-arm
privacy, nested enum nulls, sparse stored payload repair, source-null lists, and
staff template omission rules.

The complete release contract passed 420 main-Worker tests, 34 game-server unit
tests, 93 game-server Workers tests, 31 match-service tests, 78 matchmaker tests,
25 game/browser tests, six analytics tests, every source/off-chain audit, all
service typechecks, and both production builds. Exact-head GitHub Actions run
`31882617389` passed in 8m17s before deployment.

Only the main Worker was deployed, advancing it from
`0caab9ac-4418-441e-b79a-814a572640c1` to
`28cc547b-d26b-4079-8e0d-a13af6a08ea2`. The game Worker remained
`a83e80fe-292d-4562-a544-e8c7949cc7f6`, the match service remained
`bed7174c-e5a6-44fb-8a0f-7c73b008dc90`, and the matchmaker remained
`a0663ea9-6fbb-49ac-9d7c-e2e530a9baea`. Cloudflare uploaded no changed asset
files; the verifier resolved web asset `/assets/index-d976a081.js`, game asset
`/game/cloudflare/assets/index-79a70ba2.js`, all six exact locales, and the
release-safe cache policy on its first attempt. Production D1 reported no
pending migrations.

Read-only production `Ping` returned `200` with `Cache-Control: no-store`, and
an unauthenticated `ListNotifications` request returned `401` with the same
cache boundary before player-state access. The signed-in original `/home`
screen consumed the source-null empty notification list and rendered its full
navigation and content without an enum or union decode error. Verification did
not dismiss, mark seen, fabricate, or mutate any production notification,
reward, account, card, item, match, or economy state.

## Banner wire fidelity rollout — 2026-08-15

The generated Go `Banner` response has nine fields and a three-value
`BannerType` enum. Its `type` and `color` pointers do not use `omitempty`, so
they serialize as explicit `null` when nil; `link`, `startAt`, and `endAt` are
the actual optional fields. Both the player and staff source stores begin with
nil Go slices and therefore serialize the outer banner list as `null` when no
rows are available.

`cloudflare/src/banner-wire.ts` now owns the shared source-shaped projection.
It emits the six required fields with their Go zero values, preserves explicit
nulls for `type` and `color`, omits only the three source-optional fields, and
normalizes empty player and staff lists to `null`. `GetBanners` and
`GMListBanners` use that same serializer, keeping D1's convenient internal
shape away from the preserved browser decoder.

The source-derived gate parses all nine generated fields, their exact types,
JSON names, and `omitempty` markers; pins the exact `INFO`, `WARNING`, and
`EMERGENCY` enum; checks both nil-slice source paths and both Worker response
routes; and remains in the complete Cloudflare build. Ten mutation cases fail
closed on field, enum, pointer, omission, nil-list, route, or build-gate drift.
Three direct unit tests assert complete values, required nulls and zero values,
optional omissions, and empty-list semantics.

The complete release contract passed 423 main-Worker tests, 34 game-server unit
tests, 93 game-server Workers tests, 31 match-service tests, 78 matchmaker tests,
25 game/browser tests, six analytics tests, every source/off-chain audit, all
service typechecks, and both production builds. Exact-head GitHub Actions run
`31883583103` passed in 9m44s before deployment.

Only the main Worker was deployed, advancing it from
`28cc547b-d26b-4079-8e0d-a13af6a08ea2` to
`364ed0b3-2d6f-4bee-9265-449d3fbe64cb`. The game Worker remained
`a83e80fe-292d-4562-a544-e8c7949cc7f6`, the match service remained
`bed7174c-e5a6-44fb-8a0f-7c73b008dc90`, and the matchmaker remained
`a0663ea9-6fbb-49ac-9d7c-e2e530a9baea`. Cloudflare uploaded no changed asset
files; the verifier resolved web asset `/assets/index-d976a081.js`, game asset
`/game/cloudflare/assets/index-79a70ba2.js`, all six exact locales, and the
release-safe cache policy on its first attempt. Production D1 reported no
pending migrations.

Read-only production `Ping` returned `200` with `Cache-Control: no-store`, and
public `GetBanners` returned the source-faithful `{"banners":null}` with the
same cache boundary. The signed-in original `/home` screen consumed that null
list and rendered the existing account, Items, Ranks, Market, and Play
navigation plus Home content without an enum or decoder error. Verification
did not dismiss, create, update, delete, fabricate, or mutate any production
banner, account, reward, card, item, match, or economy state.

## Payment product wire fidelity rollout — 2026-08-15

The generated Go `PaymentProviderProduct` response has four required fields.
Its `provider` and `itemType` enum pointers do not use `omitempty`, so they
serialize as explicit `null` when nil; `code` and `quantity` retain their Go
zero values. The source RPC builds its result from a nil slice, and unsupported
providers or item types therefore return `{"products":null}` instead of an
empty array. That distinction also matters to the preserved purchase hook,
which guards a null catalog before reading the first product.

`cloudflare/src/payment-provider-product-wire.ts` now owns that source-shaped
projection and nullable-list boundary. The existing repository remains free to
use convenient arrays internally, while `ListPaymentProviderProducts` emits
the exact required pointers and nil-list result. No payment, checkout, reward,
inventory, wallet, or authentication authority was added or changed.

The source-derived gate parses all four generated fields, the exact six-value
`PaymentProvider` and 16-value `ItemType` enums, and the complete 22-product Go
provider/item/code catalog. It also pins the source and TypeScript quantity
parser, the RPC's nil-result construction, the shared serializer, the route,
and its inclusion in the complete build. Fourteen mutations fail closed on
enum, catalog, pointer, quantity, nil-list, route, or gate drift. Three direct
wire tests plus authenticated catalog integration coverage assert populated
values, required nulls and zero values, and unsupported-result semantics.

The complete release contract passed 426 main-Worker tests, 34 game-server unit
tests, 93 game-server Workers tests, 31 match-service tests, 78 matchmaker tests,
25 game/browser tests, six analytics tests, every source/off-chain audit, all
service typechecks, and both production builds. Exact-head GitHub Actions run
`31884877018` passed in 9m39s before deployment.

Only the main Worker was deployed, advancing it from
`364ed0b3-2d6f-4bee-9265-449d3fbe64cb` to
`8f53e2e2-338b-457b-876e-00abd1b083a6`. The game Worker remained
`a83e80fe-292d-4562-a544-e8c7949cc7f6`, the match service remained
`bed7174c-e5a6-44fb-8a0f-7c73b008dc90`, and the matchmaker remained
`a0663ea9-6fbb-49ac-9d7c-e2e530a9baea`. Cloudflare uploaded no changed asset
files; the verifier resolved web asset `/assets/index-d976a081.js`, game asset
`/game/cloudflare/assets/index-79a70ba2.js`, all six exact locales, and the
release-safe cache policy on its first attempt. Production D1 reported no
pending migrations.

Read-only production `Ping` returned `200` with `Cache-Control: no-store`, and
an unauthenticated populated-catalog request returned `401` with the same cache
boundary before player-state access. The signed-in original `/home` screen
still rendered the existing account and full Items, Ranks, Market, and Play
navigation. The browser harness does not expose page-network primitives, so
the authenticated populated/null response proof remains the isolated D1 Worker
integration test rather than an invented production claim. Verification did
not create a checkout, payment, reward, inventory record, or wallet state.

## Game-mode history wire fidelity rollout — 2026-08-15

The generated Go `GameModeStatusHistory` model has six fields, but only four
are public JSON: `id`, `gameMode`, `enabled`, and `createdAt`. Its enum and
timestamp pointers do not use `omitempty`, so missing values serialize as
explicit `null`; the private account ID and pagination cursor must never reach
the wire. The exact source `GameMode` enum has 11 values, including both
`PRACTICE_BOT` and `PRACTICE_PVP`. The source history handler starts from a nil
Go slice, so an empty result serializes as `{"statusHistory":null}`.

`cloudflare/src/game-mode-history-wire.ts` now owns that source-shaped
projection and nullable-list boundary. `GMGameModeStatusHistory` passes every
row through the shared serializer, supplies the Go zero values for required
scalars, preserves required pointer nulls, and excludes both private fields.
This is a serialization-only change; it does not alter game-mode status,
administrative authority, matchmaking, games, accounts, or rewards.

The source-derived gate parses all six generated fields and their JSON tags,
pins the exact 11-value enum, checks the source nil-list construction and
Worker route, and remains in the complete Cloudflare build. Ten mutations fail
closed on enum, pointer, privacy, nil-list, route, or build-gate drift. Three
direct wire tests plus isolated-D1 staff integration coverage assert required
nulls and zero values, populated `PRACTICE_PVP`, private-field exclusion, and
the source-null empty result.

The complete release contract passed 429 main-Worker tests, 34 game-server unit
tests, 93 game-server Workers tests, 31 match-service tests, 78 matchmaker
tests, 25 game/browser tests, six analytics tests, every source/off-chain
audit, all service typechecks, and both production builds. Exact-head GitHub
Actions run `31886111412` passed in 9m28s before deployment.

Only the main Worker was deployed, advancing it from
`8f53e2e2-338b-457b-876e-00abd1b083a6` to
`141a516e-5d31-409b-93c1-e1fa2114ed17`. The game Worker remained
`a83e80fe-292d-4562-a544-e8c7949cc7f6`, the match service remained
`bed7174c-e5a6-44fb-8a0f-7c73b008dc90`, and the matchmaker remained
`a0663ea9-6fbb-49ac-9d7c-e2e530a9baea`. Cloudflare uploaded no changed asset
files; the verifier resolved web asset `/assets/index-d976a081.js`, game asset
`/game/cloudflare/assets/index-79a70ba2.js`, all six exact locales, and the
release-safe cache policy on its first attempt. Production D1 reported no
pending migrations.

Read-only production `Ping` returned `200` with `Cache-Control: no-store`, and
an unauthenticated `GMGameModeStatusHistory` request returned `401` with the
same cache boundary before staff-data access. No production admin grant was
created merely to inspect an empty staff response. Verification did not change
game-mode status, create history, start matchmaking, launch a game, or mutate
any account, reward, or economy state.

## Payment and payment-log wire fidelity rollout — 2026-08-15

The generated Go `Payment` model has six required public JSON fields plus a
private pagination cursor. Its `status`, `provider`, and `createdAt` pointers
do not use `omitempty`, so absent values serialize as explicit `null` while the
cursor never reaches the wire. `PaymentLog` likewise has four required fields;
its data and timestamp pointers are explicit null when absent, and a nonnil
`PaymentLogData` always emits both `type` and raw `data`. The exact source
domains contain four payment statuses and six providers.

Unlike several nil-backed list handlers, both source staff payment RPCs use
`make` with the result length. Empty payments and logs therefore serialize as
`[]`, not `null`. `cloudflare/src/payment-wire.ts` now owns the shared row,
nested-data, and make-backed list projections. `GMListPayments` and
`GMListPaymentLogs` pass every result through those projections without
changing Stripe checkout, payment status, fulfillment, inventory, wallet,
authentication, or staff authority.

The source-derived gate parses the complete generated `Payment`, `PaymentLog`,
and custom `PaymentLogData` structs, their JSON tags, the exact status/provider
enums, both Go `make` constructions, both Worker routes, and the private cursor
boundary. Fifteen mutations fail closed on enum, pointer, privacy, nested-data,
empty-list, route, or build-gate drift. Four direct wire tests plus isolated-D1
staff integration coverage assert required nulls and zero values, populated
Stripe rows and logs, exact public keys, cursor exclusion, and both empty-array
results through the real RPC boundary.

The complete release contract passed 433 main-Worker tests, 34 game-server unit
tests, 93 game-server Workers tests, 31 match-service tests, 78 matchmaker
tests, 25 game/browser tests, six analytics tests, every source/off-chain
audit, all service typechecks, and both production builds. Exact-head GitHub
Actions run `31887805687` passed in 9m44s before deployment.

Only the main Worker was deployed, advancing it from
`141a516e-5d31-409b-93c1-e1fa2114ed17` to
`8b61df99-fd31-4099-b38d-c59cf2ea763c`. The game Worker remained
`a83e80fe-292d-4562-a544-e8c7949cc7f6`, the match service remained
`bed7174c-e5a6-44fb-8a0f-7c73b008dc90`, and the matchmaker remained
`a0663ea9-6fbb-49ac-9d7c-e2e530a9baea`. Cloudflare uploaded no changed asset
files; the verifier resolved web asset `/assets/index-b1769b84.js`, game asset
`/game/cloudflare/assets/index-79a70ba2.js`, all six exact locales, and the
release-safe cache policy on its first attempt. Production D1 reported no
pending migrations.

Read-only production `Ping` returned `200` with `Cache-Control: no-store`.
Unauthenticated `GMListPayments` and `GMListPaymentLogs` requests both returned
`401` with the same cache boundary before staff-data access. No production
admin grant or synthetic payment was created to inspect a populated response;
that exact proof remains the isolated-D1 Worker integration test. Verification
did not create a checkout, payment, log, fulfillment, reward, inventory record,
or wallet state.

## App developer key wire fidelity rollout — 2026-08-15

The generated Go `AppDevKey` model has nine required public JSON fields plus a
private pagination cursor. Its creator, updater, creation-time, and update-time
pointers do not use `omitempty`, so absent values serialize as explicit `null`;
the cursor must never reach the wire. The source list handler starts from a
nonnil empty slice, so an empty result serializes as `[]` rather than `null`.

`cloudflare/src/app-dev-key-wire.ts` now owns that exact projection and
make-backed list boundary. Create, list, and token-reveal responses all pass
through the shared serializer. The signed app-developer JWT's `app` claim uses
the same normalized value, while the repository's private audit snapshots
remain unchanged. This is a serialization-only change; it does not alter key
generation, token signing, enable/disable behavior, authentication, staff
authority, accounts, games, rewards, payments, or wallets.

The source-derived gate parses the complete generated struct and JSON tags,
pins the source create/list/token construction, checks all three Worker route
boundaries, enforces the private cursor and empty-array result, and remains in
the complete Cloudflare build. Ten mutations fail closed on pointer, privacy,
list, repository, route, or build-gate drift. Three direct wire tests plus the
isolated-D1 staff integration coverage assert all required nulls and zero
values, populated key projection, exact public keys, cursor exclusion, and the
empty-array result.

The complete release contract passed 436 main-Worker tests, 34 game-server unit
tests, 93 game-server Workers tests, 31 match-service tests, 78 matchmaker
tests, 25 game/browser tests, six analytics tests, every source/off-chain
audit, all service typechecks, and both production builds. Exact-head GitHub
Actions run `31889567405` passed before deployment.

Only the main Worker was deployed, advancing it from
`8b61df99-fd31-4099-b38d-c59cf2ea763c` to
`e9b5e721-ae53-4eb4-b93b-a8e5c47acc08`. The game Worker remained
`a83e80fe-292d-4562-a544-e8c7949cc7f6`, the match service remained
`bed7174c-e5a6-44fb-8a0f-7c73b008dc90`, and the matchmaker remained
`a0663ea9-6fbb-49ac-9d7c-e2e530a9baea`. Cloudflare uploaded no changed asset
files; the verifier resolved web asset `/assets/index-d976a081.js`, game asset
`/game/cloudflare/assets/index-79a70ba2.js`, all six exact locales, and the
release-safe cache policy on its first attempt. Production D1 reported no
pending migrations.

Read-only production `Ping` returned `200` with `Cache-Control: no-store`, and
an unauthenticated `GMListAppDevKeys` request returned `401` with the same cache
boundary before staff-data access. No production admin grant, developer key,
or developer token was created merely to inspect a populated response; that
exact proof remains the isolated-D1 Worker integration test. Verification did
not enable, disable, reveal, create, or otherwise mutate any production key,
account, game, reward, payment, inventory, or wallet state.

## Account action wire fidelity rollout — 2026-08-15

The generated Go `AccountAction` model has eight public JSON fields and two
private fields. `createdAt`, `updatedAt`, `expiresAt`, and `createdBy` are
pointers without `omitempty`, so absent values serialize as explicit `null`;
the private account ID and pagination cursor must never reach the wire. The
source defines eleven `ActionType` values. Its top-level staff list starts from
a nonnil empty slice and therefore serializes as `[]`, while action slices read
from absent per-account map entries remain nil and serialize as `null` inside
`GMAccount` and `AccountSignalSummary` results.

`cloudflare/src/account-action-wire.ts` now owns the exact public projection,
pointer boundary, privacy boundary, nonnil list result, and nullable nested-list
result. Repository list, create, and active-action reads pass through the shared
serializer, as do the nested account and signal-summary routes. This is a
serialization-only change; it does not alter sanction decisions, expiration,
staff authority, authentication, accounts, games, rewards, payments, or
wallets.

The source-derived gate parses the complete generated struct and JSON tags,
all eleven enum values, the source list construction and active-action lookup,
the nested nil-map behavior, the repository and API routes, and the build
gate. Twelve mutations fail closed on field, enum, pointer, privacy, list,
repository, route, or build-gate drift. Four direct wire tests plus isolated-D1
staff integration coverage assert required nulls and zero values, populated
projection, exact public keys, private-field exclusion, top-level `[]`, and
nested `null` results.

The complete release contract passed 440 main-Worker tests, 34 game-server unit
tests, 93 game-server Workers tests, 31 match-service tests, 78 matchmaker
tests, 25 game/browser tests, six analytics tests, every source/off-chain
audit, all service typechecks, and both production builds. Exact-head GitHub
Actions run `31890869649` passed in 8m59s before deployment.

Only the main Worker was deployed, advancing it from
`e9b5e721-ae53-4eb4-b93b-a8e5c47acc08` to
`782d9e39-c848-423d-8eed-85fb11797a68`. The game Worker remained
`a83e80fe-292d-4562-a544-e8c7949cc7f6`, the match service remained
`bed7174c-e5a6-44fb-8a0f-7c73b008dc90`, and the matchmaker remained
`a0663ea9-6fbb-49ac-9d7c-e2e530a9baea`. Cloudflare uploaded no changed asset
files; the verifier resolved web asset `/assets/index-d976a081.js`, game asset
`/game/cloudflare/assets/index-79a70ba2.js`, all six exact locales, and the
release-safe cache policy on its first attempt. Production D1 reported no
pending migrations.

Read-only production `Ping` returned `200` with `Cache-Control: no-store`, and
an unauthenticated `GMListAccountActions` request returned `401` with the same
cache boundary before staff-data access. No production admin grant, account
action, or signal was created merely to inspect a populated response; that
exact proof remains the isolated-D1 Worker integration test. Verification did
not create a sanction, account action, signal, game, reward, payment, inventory
record, or wallet state.

## Account signal wire fidelity rollout — 2026-08-15

The generated Go `AccountSignal` model has seven public JSON fields and four
private fields. `signalData` is an interface field without `omitempty`, so an
absent value serializes as explicit `null`; `score` has Go `float32` precision.
The generated `AccountSignalSummary` publishes its address, `float64` score,
timestamps, account pointer, and account-action slice while keeping its account
ID and cursor private. The source defines all three `SignalStatus` values.
Direct signal and summary routes construct nonnil empty slices and therefore
serialize as `[]`; absent nested account and account-action map entries remain
nil and serialize as `null`. The same source nil-map rule means a `GMAccount`
without recorded IP addresses publishes `ipHistory: null`, not an invented
empty list.

`cloudflare/src/account-signal-wire.ts` now owns the exact public signal and
summary projections, numeric widths, pointer boundaries, privacy boundaries,
and nonnil list results. The staff signal route and account-summary route pass
through those shared serializers, and the nested action list composes the
already source-locked account-action serializer. `GMListAccounts` now preserves
the source's nullable IP-history value. This is a serialization-only change; it
does not alter signal scoring, staff authority, authentication, sanctions,
accounts, games, rewards, payments, inventory, or wallets.

The source-derived gate parses both complete generated structs and JSON tags,
all three status values, list construction and nil-map behavior, staff and API
routes, shared serializer composition, and the build gate. Fifteen mutations
fail closed on field, enum, numeric-width, pointer, privacy, list, route,
composition, IP-history, or build-gate drift. The existing account-action gate
was also strengthened to follow the composed nested serializer. Six direct
wire tests plus isolated-D1 staff integration coverage assert required nulls
and zero values, exact public keys, private-field exclusion, top-level `[]`,
nested `null`, and nullable IP history.

The complete release contract passed 446 main-Worker tests, 34 game-server unit
tests, 93 game-server Workers tests, 31 match-service tests, 78 matchmaker
tests, 25 game/browser tests, six analytics tests, every source/off-chain
audit, all service typechecks, and both production builds. Exact-head GitHub
Actions run `31892776384` passed in 9m47s before deployment.

Only the main Worker was deployed, advancing it from
`782d9e39-c848-423d-8eed-85fb11797a68` to
`21379f89-437c-4c2f-8590-bb9195aee18d`. The game Worker remained
`a83e80fe-292d-4562-a544-e8c7949cc7f6`, the match service remained
`bed7174c-e5a6-44fb-8a0f-7c73b008dc90`, and the matchmaker remained
`a0663ea9-6fbb-49ac-9d7c-e2e530a9baea`. Cloudflare uploaded no changed asset
files; the verifier resolved web asset `/assets/index-d976a081.js`, game asset
`/game/cloudflare/assets/index-79a70ba2.js`, all six exact locales, and the
release-safe cache policy on its first attempt. Production D1 reported no
pending migrations.

Read-only production `Ping` returned `200` with `Cache-Control: no-store`.
Unauthenticated `GMListAccountSignals` and `GMAccountSignalSummaries` requests
both returned `401` with the same cache boundary before staff-data access. No
production admin grant, account signal, report, action, sanction, or reward was
created merely to inspect populated responses; exact positive-path proof
remains in isolated-D1 Worker integration tests. Verification did not mutate
any production account, game, reward, payment, inventory, or wallet state.

## Staff account and statistics wire fidelity rollout — 2026-08-15

The generated Go `IPAddressHistory` model has three public JSON fields and one
private account ID. Its time pointer lacks `omitempty`, so an absent creation
time serializes as explicit `null`. `GMAccount` has exactly four public fields:
the account pointer, Conquest-unlocked flag, account-action slice, and IP-history
slice. The source allocates the outer account result as nonnil `[]`, while both
nested slices come from map lookups and therefore remain `null` when absent.
The generated `GMStatsResponse` always emits all six snake-case `uint64`
counters, including zero values.

`cloudflare/src/staff-account-wire.ts` now owns the exact IP-history,
`GMAccount`, and `GMStatsResponse` projections. It composes the existing Account
and AccountAction privacy boundaries, preserves required zero/null values, and
normalizes both staff routes at the API boundary. A populated IP-history
serializer is covered with fabricated test data, but production collection
remains deliberately disabled: starting to collect IP addresses requires a
separate privacy, retention, and operator-access decision. Until then,
`GMListAccounts` preserves the source nil-map result as `ipHistory: null`.

The source-derived gate parses all three complete generated structs and JSON
tags, source account-list allocation and map lookups, all status-count switch
arms, both Worker routes, nested serializer composition, and the build gate.
Fifteen mutations fail closed on field, pointer, privacy, list, status, route,
composition, IP-collection, or build-gate drift. The existing AccountAction
gate now follows the composed staff-account serializer. Five direct wire tests
plus isolated-D1 staff integration coverage assert populated and nil IP
history, exact `GMAccount` keys, nested privacy, all six statistic counters,
and nonnil outer lists.

The complete release contract passed 451 main-Worker tests, 34 game-server unit
tests, 93 game-server Workers tests, 31 match-service tests, 78 matchmaker
tests, 25 game/browser tests, six analytics tests, every source/off-chain
audit, all service typechecks, and both production builds. Exact-head GitHub
Actions run `31894517781` passed in 9m20s before deployment.

Only the main Worker was deployed, advancing it from
`21379f89-437c-4c2f-8590-bb9195aee18d` to
`19a3dd90-d6b4-4c03-8f93-b79613bc558d`. The game Worker remained
`a83e80fe-292d-4562-a544-e8c7949cc7f6`, the match service remained
`bed7174c-e5a6-44fb-8a0f-7c73b008dc90`, and the matchmaker remained
`a0663ea9-6fbb-49ac-9d7c-e2e530a9baea`. Cloudflare uploaded no changed asset
files; the verifier resolved web asset `/assets/index-d976a081.js`, game asset
`/game/cloudflare/assets/index-79a70ba2.js`, all six exact locales, and the
release-safe cache policy on its first attempt. Production D1 reported no
pending migrations.

Read-only production `Version` returned the new Worker ID and `Ping` returned
`200`; both used `Cache-Control: no-store`. Unauthenticated `GMStats` and
`GMListAccounts` requests both returned `401` with the same cache boundary
before staff-data access. No production admin grant or populated response was
fabricated; exact positive-path proof remains in isolated-D1 Worker tests.
Verification did not collect an IP address or mutate any production account,
staff role, action, signal, report, sanction, game, reward, payment, inventory,
or wallet state.

## Account report request fidelity rollout — 2026-08-15

The generated Go `Report` request has three non-pointer JSON fields:
`reportedAddress`, `matchId`, and `reporterComment`. Consequently,
`encoding/json` decodes an omitted or explicit-null comment as the empty-string
zero value; only a nil outer report pointer is the source's "missing report
data" case. The Worker previously required all three properties to be present
and rejected the source-valid omitted-comment request.

Milestone `1b195e23` introduces one request normalizer that recreates the Go
zero values while rejecting malformed JavaScript types and unsafe numeric
values. `ReportAccount` still requires the outer report object, resolves the
reported account through the actual match participants, rejects self-reporting
and nonparticipants, applies the source strict plain-text sanitizer, caps the
stored comment at 4,000 UTF-8 bytes without splitting a code point, and keeps
the D1 report receipt idempotent per match and reporter. Google identity
references remain the Cloud Weasel account-address adaptation; WalletConnect
is not required to submit or receive an account report.

The source-derived gate parses the complete generated `Report` struct, the Go
handler's lookup, participant, sanitizer, cap, pending-signal, and persistence
rules, the Worker route, and the preserved game's exact three-field request.
Fifteen mutations fail closed on generated fields, nil handling, source policy,
Worker zero values, sanitization, opponent authorization, API routing, browser
request shape, or build-gate drift. Direct and isolated-D1 integration tests
prove that an omitted comment returns success and persists `comment: ""` while
the existing authentication, participant, sanitization, byte-cap, and
idempotency cases remain intact.

The complete release contract passed 452 main-Worker tests, 34 game-server unit
tests, 93 game-server Workers tests, 31 match-service tests, 78 matchmaker
tests, 25 game/browser tests, six analytics tests, every source/off-chain
audit, all service typechecks, and both production builds. Exact-head GitHub
Actions run `31896469895` passed in 9m23s before deployment.

Only the main Worker was deployed, advancing it from
`19a3dd90-d6b4-4c03-8f93-b79613bc558d` to
`d975fa6f-305a-48ef-a109-bb0f0a9341b9`. The game Worker remained
`a83e80fe-292d-4562-a544-e8c7949cc7f6`, the match service remained
`bed7174c-e5a6-44fb-8a0f-7c73b008dc90`, and the matchmaker remained
`a0663ea9-6fbb-49ac-9d7c-e2e530a9baea`. Cloudflare uploaded no changed asset
files; the verifier resolved web asset `/assets/index-b1769b84.js`, game asset
`/game/cloudflare/assets/index-79a70ba2.js`, all six exact locales, and the
release-safe cache policy on its first attempt. Production D1 reported no
pending migrations.

Read-only production `Version` returned the new Worker ID and `Ping` returned
`200`; both used `Cache-Control: no-store`. An unauthenticated omitted-comment
`ReportAccount` request returned `401` with the same cache boundary before any
match lookup or write. No production account, match, or report was fabricated
to probe the authenticated positive path; exact proof remains in isolated-D1
Worker integration tests. Verification did not mutate any production account,
signal, report, sanction, game, reward, payment, inventory, or wallet state.

## Staff match response fidelity rollout — 2026-08-15

The generated Go `GMMatch` response has exactly three JSON fields: the
`match` pointer, the non-pointer `reviewed` boolean, and the `duration`
pointer. None use `omitempty`, so an in-progress match must contain
`"duration": null`; the source handler also allocates its result with `make`,
so an empty staff match list is `[]`, not null. The Worker previously omitted
the duration property when its D1 match had no end time.

Milestone `f06bd300` adds one composed staff-match projection beside the
existing exact `Match`/`MatchPlayer` projection. It emits all three fields,
normalizes both pointers to explicit null, preserves numeric zero duration,
and maps an empty input to a non-nil empty list. The staff repository now uses
that projection at its single response boundary, so existing D1 rows are
repaired on read without mutation.

The source-derived match gate now parses the complete `GMMatch` struct, both
pointer fields, the absence of JSON omission, and the Go handler's non-nil
result allocation. It also requires the shared Worker projection and the
staff API boundary. Nine independent mutations fail closed on source pointer
or allocation drift, missing nulls, raw row projection, and existing
match/replay boundary bypasses. Direct serializer tests cover nil pointers and
the empty list; an isolated-D1 repository test proves an active match exposes
exactly `match`, `reviewed`, and `duration`, with the duration set to null.

The complete release contract passed 453 main-Worker tests, 34 game-server
unit tests, 93 game-server Workers tests, 31 match-service tests, 78
matchmaker tests, 25 game/browser tests, six analytics tests, every
source/off-chain audit, all service typechecks, and both production builds.
Exact-head GitHub Actions run `31898063960` passed in 9m28s before deployment.

Only the main Worker was deployed, advancing it from
`d975fa6f-305a-48ef-a109-bb0f0a9341b9` to
`9b6253da-ff09-4a38-a04a-0bea0d5f8499`. The game Worker remained
`a83e80fe-292d-4562-a544-e8c7949cc7f6`, the match service remained
`bed7174c-e5a6-44fb-8a0f-7c73b008dc90`, and the matchmaker remained
`a0663ea9-6fbb-49ac-9d7c-e2e530a9baea`. Cloudflare uploaded no changed asset
files; the verifier resolved web asset `/assets/index-d976a081.js`, game asset
`/game/cloudflare/assets/index-79a70ba2.js`, all six exact locales, and the
release-safe cache policy after edge convergence. Production D1 reported no
pending migrations.

Read-only production `Version` returned the new Worker ID and `Ping` returned
`200`; both used `Cache-Control: no-store`. An unauthenticated
`GMListMatches` request returned `401` with the same cache boundary before any
staff-data read. D1 contained the same 12 ended matches, zero in-progress
matches, and zero match reviews before and after deployment; both snapshots
reported `changed_db: false` and zero rows written. No production match or
staff grant was fabricated to exercise the positive path; exact proof remains
in isolated-D1 Worker tests.

## Conquest V2 response fidelity rollout — 2026-08-15

The generated Go Conquest V2 response family has no `omitempty` JSON fields.
In particular, `ConquestV2PoolConfigData.MaxPoolCeiling` is a pointer, and the
source pool manager deliberately leaves that pointer nil in the `Settings`
projection while populating it in `Default` and `Final`. The settings response
must therefore include `"maxPoolCeiling": null`; the Worker previously omitted
the property. The source staff progress handler also starts with a nil result
slice, so a page with no event-2 rows must return `data: null`, not `[]`.

Milestone `62b840cf` adds one shared source-wire module for the complete
Conquest V2 family: pool, treasure info, config data/config pointers, summary
and treasure-level slices, treasure progress, account progress pointers, and
pointer-valued treasure maps. The economy repository and all player/staff RPC
boundaries now use those projections. This repairs existing responses on read
without enabling the dormant legacy cash pool, changing reward policy, or
writing production data.

The source-derived gate parses all eight generated Go structs, pointer and
slice types, absence of JSON omission, pool-manager constructor behavior,
summary allocation, the staff handler's nil list, and the public treasure
map's pointer values. Fourteen independent mutations fail closed on struct,
pointer, slice, map, repository, route, or build-gate drift. Direct serializer
tests distinguish nil from allocated empty slices and preserve nil pointers;
isolated-D1 RPC tests cover the real empty staff page and exact config output.

The complete release contract passed 458 main-Worker tests, 34 game-server
unit tests, 93 game-server Workers tests, 31 match-service tests, 78
matchmaker tests, 25 game/browser tests, six analytics tests, every
source/off-chain audit, all service typechecks, and both production builds.
Exact-head GitHub Actions run `31900254562` passed in 10m00s before deployment.

Only the main Worker was deployed, advancing it from
`9b6253da-ff09-4a38-a04a-0bea0d5f8499` to
`f5d96739-e503-4015-a347-4d41d6368edf`. The game Worker remained
`a83e80fe-292d-4562-a544-e8c7949cc7f6`, the match service remained
`bed7174c-e5a6-44fb-8a0f-7c73b008dc90`, and the matchmaker remained
`a0663ea9-6fbb-49ac-9d7c-e2e530a9baea`. Cloudflare uploaded no changed asset
files; the verifier resolved web asset `/assets/index-d976a081.js`, game asset
`/game/cloudflare/assets/index-79a70ba2.js`, all six exact locales, and the
release-safe cache policy on its first attempt. Production D1 reported no
pending migrations.

Read-only production `Version` returned the new Worker ID and `Ping` returned
`200`; both used `Cache-Control: no-store`. Unauthenticated config and staff
progress requests returned `401` with that cache boundary. The dormant public
pool remained `{ "amount": 0, "totalWeight": 0 }`, and all eleven public
treasure levels remained off-chain zero values. Before and after snapshots
both found one settings row at version zero and no pool cache, config audit,
event-2 progress, or reward-schedule rows; both reported `changed_db: false`
and zero rows written. No production staff grant or Conquest state was
fabricated to exercise a positive admin path; exact proof remains in the
isolated-D1 Worker tests.

## Competitive response fidelity rollout — 2026-08-15

The generated Go `DeckRank`, `DeckRankAccount`, and `LeaderboardEntry`
responses emit every public JSON field without `omitempty`. `DeckRank.Score`
and both `DeckRankAccount` members are pointers, a nil card-ID slice encodes as
null, and the two deck aggregate ratios are scanned as float32 values. The Go
public deck leaderboard also deliberately differs from authenticated search:
it leaves `deckRank.highestPlayerAddress` at the zero hash and permits
`highestPlayer: null` when the stored highest-player ID is invalid, while
search explicitly hydrates the address. The Worker previously filled the
nested public-list address and rejected the source-valid nil player with an
error.

Milestone `08fe6563` adds one shared competitive projection for deck ranks,
deck-rank accounts, and leaderboard entries. It emits explicit pointer/slice
nulls, applies source-shortest float32 JSON values, excludes the Go-private rank
state, card revision, and cursor, and composes the existing protected Account
and AccountStat projections. The deck repository now keeps the public-list and
authenticated-search address paths distinct and returns the nullable top player
instead of fabricating an account or failing the whole public page.

The source-derived competitive gate parses all three generated Go structs,
their public fields, pointer and float32 types, the public-list allocation and
nil-player branch, search address hydration, leaderboard account/reward
hydration, both Worker repositories, all four RPC boundaries, and the complete
build. Fourteen independent mutations fail closed on source, null, hydration,
privacy, route, or gate drift. The existing Account gate was strengthened to
prove the new composed leaderboard boundary still reaches `sourceAccountWire`;
it was not relaxed to accept raw nested accounts. Direct serializer tests cover
nil pointers/slices, private-field removal, and float32 values, while
isolated-D1 RPC tests cover the real nullable public top-player row and the
different search projection.

The complete release contract passed 462 main-Worker tests, 34 game-server
unit tests, 93 game-server Workers tests, 31 match-service tests, 78
matchmaker tests, 25 game/browser tests, six analytics tests, every
source/off-chain audit, all service typechecks, and both production builds.
Exact-head GitHub Actions run `31902595397` passed in 7m48s before deployment.

Only the main Worker was deployed, advancing it from
`f5d96739-e503-4015-a347-4d41d6368edf` to
`c3bc86b1-8877-4efd-b4eb-72a1af0a3d29`. The game Worker remained
`a83e80fe-292d-4562-a544-e8c7949cc7f6`, the match service remained
`bed7174c-e5a6-44fb-8a0f-7c73b008dc90`, and the matchmaker remained
`a0663ea9-6fbb-49ac-9d7c-e2e530a9baea`. Cloudflare uploaded no changed asset
files; the verifier resolved web asset `/assets/index-d976a081.js`, game asset
`/game/cloudflare/assets/index-79a70ba2.js`, all six exact locales, and the
release-safe cache policy on its first attempt. Production D1 reported no
pending migrations.

Read-only production `Version` returned the new Worker ID and `Ping` returned
`200`; both used `Cache-Control: no-store`. Public `ListDeckRanks` returned the
source-shaped allocated empty `res: []` page, and unauthenticated
`SearchDeckRanks` returned `401` before data access. A one-entry public
leaderboard shape probe returned exactly the five generated entry fields, the
19-field protected Account projection, and the 18-field public AccountStat
projection without logging player values. Before and after D1 snapshots both
found zero deck-rank rows, zero positive or nil-player rank rows, six ranked
stat rows, and three eligible accounts; both reported `changed_db: false` and
zero rows written. No production account, deck rank, leaderboard stat, reward,
or staff grant was created or changed for verification.

## Game-mode status response fidelity rollout — 2026-08-15

The generated Go `GameModesStatus` response contains exactly ten required
boolean fields. `GetGameModesStatus` initializes every field to true and then
applies the persisted override for each exact `GameMode` case. The Cloudflare
match service already returned all ten authoritative fields, including the
separate practice-bot and practice-PvP switches, but the public Worker only
validated those required fields and then returned the upstream object itself.
That allowed future match-service metadata to cross a JSON boundary where Go's
generated struct would have discarded it.

`cloudflare/src/game-mode-history-wire.ts` now owns an explicit
`sourceGameModesStatusWire` projection as well as the existing history
projection. The public RPC still fails closed unless all ten upstream values
are booleans, then emits only the ten generated fields in source order. Direct
tests cover mixed values, Go zero values, and unknown-field removal. The
isolated-D1 RPC test deliberately supplies private upstream metadata and proves
it cannot reach `GetGameModesStatus`. The source-derived gate now pins the
generated field names/tags, all-ten-enabled source constructor, all ten switch
cases, explicit Worker projection, history contract, and build integration.
Fifteen mutations fail closed on status, enum, pointer, privacy, nil-list,
route, or build-gate drift.

The complete local release contract passed 464 main-Worker tests, 34
game-server unit tests, 93 game-server Workers tests, 31 match-service tests,
78 matchmaker tests, 25 game/browser tests, six analytics tests, every
source/off-chain audit, all service typechecks, and both production builds.
Exact-head GitHub Actions run `31904102647` passed in 10m1s for runtime commit
`a380f399d1ee599da068c3e58882f651441bd986` before deployment.

Only the main Worker was deployed, advancing it from
`c3bc86b1-8877-4efd-b4eb-72a1af0a3d29` to
`726ac476-8567-43f3-89bb-d3ac7d85691f`. The game Worker remained
`a83e80fe-292d-4562-a544-e8c7949cc7f6`, the match service remained
`bed7174c-e5a6-44fb-8a0f-7c73b008dc90`, and the matchmaker remained
`a0663ea9-6fbb-49ac-9d7c-e2e530a9baea`. Cloudflare uploaded no changed asset
files. The verifier resolved web asset `/assets/index-d976a081.js`, game asset
`/game/cloudflare/assets/index-79a70ba2.js`, all six exact locales, and the
release-safe cache policy on its first attempt.

Read-only production `Version`, `Ping`, and `GetGameModesStatus` probes all
returned `200` with `Cache-Control: no-store`. `Version` reported the exact new
Worker ID. The game-mode response contained exactly the ten generated keys:
tutorial, practice PvP, practice bot, warm-up, both ranked modes, both Conquest
modes, and both challenge modes. The deployed operational values remained
unchanged: all non-Conquest modes were true and both independently gated
Conquest modes were false. Production D1 reported no pending migrations. The
verification made no database writes and changed no account, queue, match,
reward, wallet, or staff state.

## Social-info response fidelity rollout — 2026-08-15

The generated Go social response surface consists of the two-field
`DiscordInfoResponse`, the three-field `TwitchInfoResponse`, and all 14 required
`TwitchStream` fields. None uses `omitempty`. The Twitch stream list is a Go
slice of pointers and each stream's tag IDs are another slice, so nil outer
slices, nil stream elements, and nil tag slices serialize as explicit `null`.
On a cache hit the source unmarshals cached JSON back into the generated
response struct before returning it, which discards unknown cache metadata and
restores missing fields to their Go zero values.

`cloudflare/src/social-info-wire.ts` now owns explicit Discord, Twitch
response, nested stream, and nullable-list projections. Both public RPC routes
pass fresh or cached repository output through those projections. Direct tests
cover all required fields, scalar zero values, nullable slices/pointer elements,
and unknown-field exclusion. An isolated-D1 integration test inserts cached
top-level and nested private metadata, proves neither value reaches the public
RPC, and proves no provider request occurs on the cache hit.

The source-derived gate parses all three generated structs and their exact JSON
tags, pins the source's struct-cache unmarshal, external-stream decode and count
behavior, requires every explicit Worker field, checks both public routes, and
is mandatory in the complete Cloudflare build. Eleven mutations fail closed
on generated fields, slice/pointer semantics, source cache behavior, private
field insertion, route bypass, or build-gate removal.

The complete local release contract passed 468 main-Worker tests across 79
files, 34 game-server unit tests, 93 game-server Workers tests, 31 match-service
tests, 78 matchmaker tests, 25 game/browser tests, six analytics tests, every
source/off-chain audit, all service typechecks, and both production builds.
Exact-head GitHub Actions run `31905471005` passed in 9m23s for runtime commit
`ec7f60e018abe1b930963da0323cf741dc486447` before deployment.

Only the main Worker was deployed, advancing it from
`726ac476-8567-43f3-89bb-d3ac7d85691f` to
`f1358a94-0415-4d5c-af9a-535b0d26378c`. The game Worker remained
`a83e80fe-292d-4562-a544-e8c7949cc7f6`, the match service remained
`bed7174c-e5a6-44fb-8a0f-7c73b008dc90`, and the matchmaker remained
`a0663ea9-6fbb-49ac-9d7c-e2e530a9baea`. Cloudflare uploaded no new asset
files. The verifier resolved web asset `/assets/index-b1769b84.js`, unchanged
game asset `/game/cloudflare/assets/index-79a70ba2.js`, all six exact locales,
and the release-safe cache policy on its first attempt.

Read-only production `Version` and `Ping` returned `200` with
`Cache-Control: no-store`, and `Version` reported the exact new Worker ID.
`GetDiscordInfo` and `GetTwitchInfo` both continued to fail closed with
`503 webrpc.unavailable` and `Cache-Control: no-store` because Cloud Weasel's
optional provider identifiers/secrets are deliberately not configured. This
rollout did not enable either provider, seed a cache response, or invent social
data. Production D1 reported no pending migrations. Verification made no
database writes and changed no account, content, provider, queue, match, reward,
wallet, or staff state.

## Content catalog response fidelity rollout — 2026-08-15

The generated Go content surface consists of the one-field
`TwitchFeaturedStreamer`, all six required `Sticker` fields, the required
`StickerOwnershipResponse.stickerBalances` map, and both required
`BalanceTuple` fields. None uses `omitempty`. `GetStickerOwnership` explicitly
allocates its response map, but constructs each stored balance tuple with only
`Balance`; the unset `*bool IsNew` pointer therefore serializes as
`isNew: null`, not `false`. The Worker repository had incorrectly invented
`false` even when the D1 row's unrelated inventory-newness flag was true.

`cloudflare/src/content-wire.ts` now owns explicit featured-streamer, sticker,
list, and sticker-ownership projections. The three catalog/ownership route
families use those projections, unknown repository or schedule fields are
discarded, and a nil pointer stored in the source's pointer-valued ownership map
remains `null`. The established Cloud Weasel inactive-schedule adaptation still
returns an allocated empty sticker list so the preserved UI can show its
reviewed `Coming Soon` state; this rollout did not fabricate a source schedule
or activate rewards.

Direct tests cover every required field, Go zero values, unknown-field
exclusion, allocated empty ownership maps, nested nil pointers, and nil
`BalanceTuple.IsNew`. An isolated-D1 route test proves that a positive stored
sticker balance returns `{balance: "3", isNew: null}` and remains owned by the
authenticated Google identity. The source-derived gate parses all four
generated structs, pins the source list/not-found and allocated-map behavior,
checks the featured-streamer store, requires the exact Worker boundaries, and
is mandatory in the complete build. Twelve mutations fail closed on generated
fields, pointers, allocations, source tuple construction, private-field
insertion, route bypass, repository substitution, or build-gate removal.

The complete local release contract passed 471 main-Worker tests across 80
files, 34 game-server unit tests, 93 game-server Workers tests, 31 match-service
tests, 78 matchmaker tests, 25 game/browser tests, six analytics tests, every
source/off-chain audit, all service typechecks, and both production builds.
Exact-head GitHub Actions run `31907064967` passed in 9m57s for runtime commit
`dbf13e4ac8dad58cd7af216d2142d0ed20288843` before deployment.

Only the main Worker was deployed, advancing it from
`f1358a94-0415-4d5c-af9a-535b0d26378c` to
`106119ba-2662-4990-9e10-2a4fbacb25a4`. The game Worker remained
`a83e80fe-292d-4562-a544-e8c7949cc7f6`, the match service remained
`bed7174c-e5a6-44fb-8a0f-7c73b008dc90`, and the matchmaker remained
`a0663ea9-6fbb-49ac-9d7c-e2e530a9baea`. Cloudflare uploaded no new asset
files. The verifier resolved web asset `/assets/index-d976a081.js`, unchanged
game asset `/game/cloudflare/assets/index-79a70ba2.js`, all six exact locales,
and the release-safe cache policy after four edge-propagation attempts.

Read-only production `Version`, `Ping`, and `GetFeaturedStreamers` returned
`200` with `Cache-Control: no-store`; `Version` reported the exact new Worker
ID and the empty content table returned `{streamers: []}`. Anonymous
`GetStickers` and `GetStickerOwnership` requests both returned
`401 webrpc.unauthenticated` with `Cache-Control: no-store`, preserving the
source authenticated boundary. Before/after D1 aggregates both found zero
featured streamers, zero active sticker schedule entries, and zero positive
sticker inventory rows, with `changed_db: false` and zero rows written. No
production content, schedule, identity, or reward state was fabricated for the
probe, and production D1 reported no pending migrations.

## Replay enum regression closure — 2026-08-15

A production practice-versus-player replay launched from the preserved Account
Matches list was reproduced through the exact player route. The reported
`Enum variant not found` failure came from archived game states containing
tagged JavaScript `Map` values for secret enum-keyed state. A raw JSON parser
turned those maps into ordinary objects before the Rust/WASM constructor tried
to decode them. The production game bundle already contained the tagged-map
reviver from runtime fix `24e9c8e4`; replaying the affected historical match on
the current deployment completed normally. No match identifier or player
identity is retained in this evidence.

Runtime regression commit `b0271620313c2279626cc20dc83f8fa8594e0d0c`
adds the missing end-to-end boundary proof: an archive is serialized as JSON,
revived through `gameStateParse`, passed into the real `StateBindings.WasmMatch`
constructor, advanced with an authoritative `raw_apply` diff, and serialized
again. The test explicitly proves that both secret collections remain maps.
Game-server typecheck, 34 unit tests, 93 Workers tests, and all 25 game/browser
tests passed. Exact-head GitHub Actions run `31909026508` passed before the test
commit was accepted. This was a regression-evidence milestone only, so no
runtime was redeployed for it.

## Friend-points response fidelity rollout — 2026-08-15

The source friend-points RPCs return deliberately partial Account values, not
fully decorated account records. Friend rows select only the source fields and
leave generated runtime/account decorators at their Go zero values; gifted
inviter rows preserve the source database fields but likewise retain null/zero
runtime fields. The generated wrappers always include `total`, `friends`, and
`inviter`, with allocated empty friend lists and nullable inviter pointers.

`cloudflare/src/friend-points-wire.ts` now owns those exact projections. The
repository filters invitees to the source-visible active-status set, orders
tied rows by numeric game-account ID, limits the list to five, and computes
gifted levels across every season as the source does. The sticker-point balance
uses only Cloud Weasel's canonical off-chain token `0`; fabricated balances for
other token IDs cannot inflate the total. Source-derived mutation coverage pins
the generated structs, Go zero/null semantics, source account/status queries,
single-item sticker-point lookup, canonical token filter, route projections,
and mandatory release gate.

Runtime commits `f67806a3cec8d79d82944def32c861d600d6d7c4` and
`2a5aa6911a6bca48875a2744d9d4cd7b88a4f639` passed the complete local release
contract: 475 main-Worker tests across 81 files, 34 game-server unit tests, 93
game-server Workers tests, 31 match-service tests, 78 matchmaker tests, 25
game/browser tests, six analytics tests, every source/off-chain audit, all
service typechecks, and both production builds. Exact-head GitHub Actions run
`31910811391` passed in 9m48s for `2a5aa691` before deployment.

Only the main Worker was deployed, advancing it from
`106119ba-2662-4990-9e10-2a4fbacb25a4` to
`3d804d4d-84a6-4eae-8ec8-c62015d76c40`. The game Worker remained
`a83e80fe-292d-4562-a544-e8c7949cc7f6`, the match service remained
`bed7174c-e5a6-44fb-8a0f-7c73b008dc90`, and the matchmaker remained
`a0663ea9-6fbb-49ac-9d7c-e2e530a9baea`. Cloudflare uploaded no new asset
files. The verifier resolved web asset `/assets/index-b6aa1ef3.js`, unchanged
game asset `/game/cloudflare/assets/index-79a70ba2.js`, all six exact locales,
and the release-safe cache policy on its first attempt.

Read-only production `Version` and `Ping` returned `200` with
`Cache-Control: no-store`, and `Version` reported the exact new Worker ID.
Anonymous `GetFriendPoints` and `GetPointsGifted` requests both returned
`401 webrpc.unauthenticated` with `Cache-Control: no-store`. Under the existing
Google session, the preserved Invite Friends rewards page loaded friend/reward
content without an auth prompt, generic failure, or enum error. An identity-free
D1 aggregate found zero invite, friend-point, canonical point-balance, and
noncanonical point-balance rows with `changed_db: false` and zero rows written.
Production D1 reported no pending migrations. Verification changed no account,
invite, reward, wallet, match, queue, content, or staff state.

## Deck-equipment response fidelity rollout — 2026-08-15

The generated Go `DeckEquipment` response always emits all three fields:
`stickers` is nullable when its source slice was never allocated, while
`heroSkin` and `cardBack` are nullable pointers. The Cloudflare repository
previously built a sparse object, so an account without equipment received
`{}` instead of the source response
`{"stickers":null,"heroSkin":null,"cardBack":null}`.

`cloudflare/src/deck-equipment-wire.ts` now owns that exact response boundary.
It preserves populated sticker lists and numeric hero/card-back selections while
restoring generated nulls for every absent field. Source-derived mutation
coverage pins the generated struct and JSON tags, source handler allocation,
equipped sticker/card-back selection, hero-skin ownership mapping, repository
query, route projection, and mandatory release-gate inclusion.

Runtime commit `56c15c7987ea21ecac3ea6c6b876990dd93c4394` passed the
complete local release contract: 477 main-Worker tests across 82 files, 34
game-server unit tests, 93 game-server Workers tests, 31 match-service tests,
78 matchmaker tests, 25 game/browser tests, six analytics tests, every
source/off-chain audit, all service typechecks, and both production builds.
Exact-head GitHub Actions run `31912479628` passed before deployment.

Only the main Worker was deployed, advancing it from
`3d804d4d-84a6-4eae-8ec8-c62015d76c40` to
`53018052-85cd-47ce-9d19-96200a914d6f`. The game Worker remained
`a83e80fe-292d-4562-a544-e8c7949cc7f6`, the match service remained
`bed7174c-e5a6-44fb-8a0f-7c73b008dc90`, and the matchmaker remained
`a0663ea9-6fbb-49ac-9d7c-e2e530a9baea`. The deployment verifier resolved web
asset `/assets/index-d976a081.js`, unchanged game asset
`/game/cloudflare/assets/index-79a70ba2.js`, all six exact locales, and the
release-safe cache policy after normal edge propagation.

Read-only production `Version` and `Ping` returned `200` with
`Cache-Control: no-store`, and `Version` reported the exact new Worker ID.
Anonymous `GetDeckEquipmentByDeckString` returned
`401 webrpc.unauthenticated` with `Cache-Control: no-store`. Under the existing
Google session, the preserved Practice-vs-Bot page loaded the ADA starter deck
at 30/30 without an auth fallback or generic failure; no match was started and
no equipment was changed. An identity-free D1 aggregate found zero equipped
item rows, zero invalid item types, zero writes, and `changed_db: false`.
Production D1 reported no pending migrations. Verification changed no account,
equipment, inventory, deck, match, reward, wallet, queue, content, or staff
state.

## Cookie-policy input fidelity rollout — 2026-08-15

The source middleware authenticates both `GetCookiePolicy` and
`SaveCookiePolicy`, so the Cloudflare access boundary was already correct and
remains unchanged. The input decoder was not faithful: generated Go accepts an
omitted or null `cookieOptions` map as nil, rejects non-boolean values during
JSON decoding, and the handler rejects every name outside the exact
`AUTHENTICATION`, `MARKETPLACE`, `GEO_BLOCKING`, and `PRODUCT_ANALYTICS` enum
before saving. The TypeScript adapter previously rejected a missing map while
silently accepting and normalizing unknown or non-boolean entries.

Runtime commit `7b58db70e075b3844250d4ee8b0448c118d42c00` now preserves
the source map-decoding boundary. Omitted and null maps restore the appropriate
wallet or identity defaults, unknown names return the source
`webrpc.unknown` error, and invalid value types return
`webrpc.invalid_argument`. Validation completes before the repository call, so
a mixed invalid request cannot partially update D1. Google identity policy
continues to store only essential authentication and optional product analytics;
the source's Marketplace and geo-blocking defaults remain available only for
legacy wallet sessions and do not regain product authority.

The source-derived release gate pins the generated enum and request map, Go
defaults, handler validation and modifiability rule, integration evidence,
middleware access, Worker error codes, validation-before-write ordering, and
the complete-build inclusion. Mutation coverage rejects enum, access, default,
decode, write-order, test, and gate drift. The isolated Worker contract also
proves that both invalid-name and invalid-type requests leave the stored policy
and timestamp unchanged.

The complete local release contract passed 478 main-Worker tests across 82
files, 34 game-server unit tests, 93 game-server Workers tests, 31
match-service tests, 78 matchmaker tests, 25 game/browser tests, six analytics
tests, every source/off-chain audit, all service typechecks, and both production
builds. Exact-head GitHub Actions run `31914333098` passed before deployment.

Only the main Worker was deployed, advancing it from
`53018052-85cd-47ce-9d19-96200a914d6f` to
`89a36662-9fdc-402b-9579-071ccc4eef5d`. The game Worker remained
`a83e80fe-292d-4562-a544-e8c7949cc7f6`, the match service remained
`bed7174c-e5a6-44fb-8a0f-7c73b008dc90`, and the matchmaker remained
`a0663ea9-6fbb-49ac-9d7c-e2e530a9baea`. Cloudflare uploaded no new asset
files. The deployment verifier resolved web asset
`/assets/index-d976a081.js`, unchanged game asset
`/game/cloudflare/assets/index-79a70ba2.js`, all six exact locales, and the
release-safe cache policy on its first attempt.

Read-only production `Version` and `Ping` returned `200` with
`Cache-Control: no-store`, and `Version` reported the exact new Worker ID.
Anonymous `GetCookiePolicy` and `SaveCookiePolicy` requests both returned
`401 webrpc.unauthenticated` with `Cache-Control: no-store`, proving that the
source authentication boundary still precedes both reads and writes. An
identity-free D1 aggregate found zero policy rows, zero unknown option names,
zero writes, and `changed_db: false`; production D1 reported no pending
migrations. Verification changed no account, cookie-policy, inventory, deck,
match, reward, wallet, queue, content, or staff state.

## Auth/session null-account fidelity rollout — 2026-08-15

The generated Go auth responses always emit their nullable account pointer.
Before wallet registration, both `GetAuthToken` and `GetSession` therefore
return `account: null`; the Cloudflare adapter previously omitted that property.
That sparse response could make an otherwise valid pre-registration session
look structurally different from the source contract.

Runtime commit `6bea89d5af503e3e4e1ea921ce157e00245020d4` restores the
generated wire shape without inventing an account. Both auth methods now emit
the stored account object when one exists and an explicit null when it does
not. The source-derived account-wire gate pins the generated nullable pointer
and JSON tag, source nil behavior and integration assertion, both Worker route
projections, their tests, and mandatory release-gate inclusion. Mutation tests
reject source, route, response, test, and gate drift.

The complete local release contract passed 478 main-Worker tests across 82
files, 34 game-server unit tests, 93 game-server Workers tests, 31
match-service tests, 78 matchmaker tests, 25 game/browser tests, six analytics
tests, every source/off-chain audit, all service typechecks, and both production
builds. Exact-head GitHub Actions run `31915565883` passed before deployment.

Only the main Worker was deployed, advancing it from
`89a36662-9fdc-402b-9579-071ccc4eef5d` to
`63039160-233d-47b7-831c-11658749cfe3`. The game Worker remained
`a83e80fe-292d-4562-a544-e8c7949cc7f6`, the match service remained
`bed7174c-e5a6-44fb-8a0f-7c73b008dc90`, and the matchmaker remained
`a0663ea9-6fbb-49ac-9d7c-e2e530a9baea`. Cloudflare uploaded no changed asset
files. The deployment verifier resolved web asset
`/assets/index-b1769b84.js`, unchanged game asset
`/game/cloudflare/assets/index-79a70ba2.js`, all six exact locales, and the
release-safe cache policy after normal edge propagation.

Read-only production `Version` and `Ping` returned `200` with
`Cache-Control: no-store`, and `Version` reported the exact new Worker ID.
Anonymous `GetSession` returned `401 webrpc.unauthenticated` with
`Cache-Control: no-store`. Under the existing Google session, the preserved
Practice-vs-Bot page loaded the ADA starter deck at 30/30 without an auth
fallback, generic failure, or enum error; no match was started. An
identity-free D1 aggregate found zero legacy wallet accounts, zero writes, and
`changed_db: false`; production D1 reported no pending migrations. Verification
changed no account, identity, inventory, deck, match, reward, wallet, queue,
content, or staff state.

## Wallet-proof decode fidelity rollout — 2026-08-15

Generated Go decodes `ethAuthProofString` into a non-pointer string. An omitted
field, a null field, or a null request body therefore reaches `GetAuthToken` as
the empty string and fails the source ETHAuth decoder as
`403 webrpc.permission_denied`. A scalar/array request body or a non-string
field fails JSON unmarshalling first as `400 webrpc.invalid_argument`. The
Cloudflare adapter previously returned `400` for an omitted proof and allowed a
numeric proof to reach `.split()`, producing an internal `500`.

Runtime commit `b7e10ca3418b03990ed6669eebf8b803cae8d73b` restores that
decode boundary. The request adapter preserves Go's empty-string zero value for
omitted and null fields, rejects incompatible JSON types before verification,
and maps malformed proof format, address, claim JSON, primitive claims, missing
claims, and wrong claim field types to the source permission-denied boundary.
The signed-origin mismatch remains the source's distinct invalid-argument
error. No malformed input can reach the Sequence verifier as a JavaScript type
error.

The source-derived account/auth gate now also pins the generated request field
and JSON tag, the Go handler's permission-denied wrapping, Worker zero-value and
type decoder, proof error mapping, route tests, parser tests, and complete-build
inclusion. Mutation coverage rejects request-type, source-error, decoder,
parser, origin, test, and gate drift.

The complete local release contract passed 491 main-Worker tests across 82
files, 34 game-server unit tests, 93 game-server Workers tests, 31
match-service tests, 78 matchmaker tests, 25 game/browser tests, six analytics
tests, every source/off-chain audit, all service typechecks, and both production
builds. Exact-head GitHub Actions run `31916934051` passed before deployment.

Only the main Worker was deployed, advancing it from
`63039160-233d-47b7-831c-11658749cfe3` to
`d6e83041-2dd8-4e61-9094-dba784f5de6b`. The game Worker remained
`a83e80fe-292d-4562-a544-e8c7949cc7f6`, the match service remained
`bed7174c-e5a6-44fb-8a0f-7c73b008dc90`, and the matchmaker remained
`a0663ea9-6fbb-49ac-9d7c-e2e530a9baea`. Cloudflare uploaded no changed asset
files. The deployment verifier resolved unchanged web asset
`/assets/index-d976a081.js`, unchanged game asset
`/game/cloudflare/assets/index-79a70ba2.js`, all six exact locales, and the
release-safe cache policy after normal edge propagation.

Read-only production `Version` and `Ping` returned `200` with
`Cache-Control: no-store`, and `Version` reported the exact new Worker ID.
Omitted, null-body, and null-field `GetAuthToken` probes returned
`403 webrpc.permission_denied`; numeric-field and array-body probes returned
`400 webrpc.invalid_argument`. All used `Cache-Control: no-store`, and the
previous internal `500` was absent. Under the existing Google session, the
preserved Practice-vs-Bot page loaded the ADA starter deck at 30/30 without an
auth fallback, generic failure, or enum error; no match was started. An
identity-free D1 aggregate found zero legacy wallet accounts, zero writes, and
`changed_db: false`; production D1 reported no pending migrations. Verification
changed no account, identity, inventory, deck, match, reward, wallet, queue,
content, or staff state.

## Pending-card source-read fidelity rollout — 2026-08-15

The source `GetPendingCards` response preserves every delayed-task token ID but
only projects canonical card data for recognized Silver or Gold token types
whose lower 16-bit ID exists in `CardIndex`. `CardOwnership` performs the same
token walk and counts the actual frame. The Worker previously required an exact
all-Gold `card_ids_json` projection and could turn a readable historical task
into an internal error.

Runtime commit `1d4e7e0d74956aa6deab7086d1c6204e33d51d64` ports that
tolerant source read exactly. Delivery remains a separate strict boundary: an
invalid configured Gold bundle grants no inventory and follows the existing
bounded retry/dead-letter path. Focused coverage combines a valid Silver token,
an unsupported item token, and a missing canonical Gold card, then proves the
partial read, actual-frame ownership count, failed delivery attempt, and zero
inventory grant. The source-derived pending-card audit adds mutation coverage
for the token mask/type codes, card projection, response token IDs, ownership
frame, and accidental restoration of the stricter card-ID dependency.

The complete local release contract passed 492 main-Worker tests across 82
files, 34 game-server unit tests, 93 game-server Workers tests, 31
match-service tests, 78 matchmaker tests, 25 game/browser tests, six analytics
tests, every source/off-chain audit, all service typechecks, and both production
builds. Exact-head GitHub Actions run `31918941364` passed in 10m19s before
deployment.

Only the main Worker was deployed, advancing it from
`d6e83041-2dd8-4e61-9094-dba784f5de6b` to
`8b9794e8-3909-4519-8757-26c3c82d43bc`; Cloudflare uploaded no updated asset
files. The strict deployment verifier matched web entry
`/assets/index-b1769b84.js`, game entry
`/game/cloudflare/assets/index-79a70ba2.js`, six exact locales, and the cache
policy on its first attempt. Production `Version` and `Ping` returned `200`
with `Cache-Control: no-store`; anonymous `GetPendingCards` returned the
expected authenticated `401` boundary.

No migration was required or pending. A read-only D1 aggregate reported three
users, 94 inventory rows, zero Conquest settlements, delayed Gold rows, Gold
grant receipts, or Silver exchanges, zero writes, and `changed_db: false`.
The reward-readiness audit retained original Conquest as `dormant-policy` with
zero verified active pools. Verification created no synthetic task, reward,
pool, queue, capability, or economy authority.

## Replay reconstruction UI cleanup rollout — 2026-08-15

The live Practice-PvP replay proof for the enum fix exposed one non-fatal game
console error after state reconstruction: a deferred card-selection UI callback
could run after reconstruction had cleared `cardSelectionState`. The callback
then asked the bot helper to update suggestions for a selection that no longer
existed. It did not stop playback, but it made a successful replay look
unhealthy and obscured real failures in browser verification.

Runtime commit `4810de116357b589b22d000d59b9c830a1eb79a1` makes a
card-selection UI refresh conditional on both the system and its selection
state being active. Active selection behavior is unchanged. A focused game
test pins the cleared-state no-op and enabled-state predicate. The complete
local release contract passed 492 main-Worker tests across 82 files, 34
game-server unit tests, 93 game-server Workers tests, 31 match-service tests,
78 matchmaker tests, 27 game/browser tests, six analytics tests, all
source/off-chain audits and typechecks, and both production builds. Exact-head
GitHub Actions run `31920918875` passed in 10m19s before deployment.

Only the main Worker/static asset package was deployed, advancing it from
`8b9794e8-3909-4519-8757-26c3c82d43bc` to
`272b5cbe-6d13-4a6a-9237-476a0e1bf535`. The strict verifier matched web asset
`/assets/index-d976a081.js`, game asset
`/game/cloudflare/assets/index-7e9c419b.js`, all six exact locales, and the
release-safe cache policy on its first attempt. `Ping`, `Version`, game-mode,
and Conquest-reward probes returned `200` with `Cache-Control: no-store`;
Practice PvP stayed enabled, both Conquest modes stayed disabled, and
`weeklyGolds` stayed empty.

The signed-in preserved Account Matches route then launched the same completed
human Practice replay. The new game bundle reached its 2:59/3:00 result scene
with both players and playback controls visible, no enum/map exception, and no
`No card selection state` diagnostic. A read-only D1 aggregate found three
users, 94 inventory rows, and zero Conquest runs, settlements, Gold deliveries,
settlement grants, Gold grants, Silver exchanges, or reward pools; Wrangler
reported zero rows written and `changed_db: false`. No migrations were pending,
and every policy-gated reward track remained dormant. R2 availability was also
rechecked and still failed with Cloudflare code `10042`, so the private
analytics/replay-archive pipeline remains intentionally undeployed until R2 is
enabled on the account.

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
