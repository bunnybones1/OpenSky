# Cloud Weasel deployment

## Production

- URL: https://opensky-webapp.dysinski-tomasz.workers.dev
- API/web Worker: `opensky-webapp` (`523cbe54-0e1b-40fc-b2e2-f3f37a2322e5`)
- Matchmaker Worker: `cloud-weasel-matchmaker` (`49bd05fd-6fcd-4f8e-aa31-00ec0d115140`)
- Match service Worker: `cloud-weasel-match-service` (`16934ac3-15b6-4e4e-9581-86b0a2646610`)
- Game Worker: `cloud-weasel-game-server` (`51d2a5be-f080-40e4-88cb-a012422be4cf`)
- Deployed source includes `492cd47` across the API/web and game Workers,
  `18e66c1` for the matchmaker and match service
- Deployed: 2026-08-12 PDT
- Applied D1 migrations: `0001` through `0045`
- Scheduled trigger: every minute for due Conquest Gold delivery and account
  anonymization

## Verified scope

- Google OpenID Connect login and identity-backed sessions
- Original OpenSky webapp shell, navigation, profile, and item views
- Cloud Weasel browser and social-preview metadata without replacing the UI
- Wallet-free starter collection and legacy read RPC compatibility
- Public trimmed, case-insensitive username account lookup with owner-only settings
- Identity-native, idempotent requests for more invitations, plus the exact
  source deprecation response for the retired wallet `SignIn` endpoint
- Source card search, including attached spells, token rows, ownership filters, and balances
- Source schema/version diagnostics backed by Worker Version Metadata
- Starter quest claims and the original quest progression chain
- Source epic-chain history, active assignment, and future-step previews
- Basic SkyPass card claims for the ported season data
- Legacy deck listing, creation, update, deletion, and deck-string encoding
- Private source deck search with exact/class/name filters and cursor pagination
- Public source deck leaderboard plus authenticated rank search, with current
  card-library scoping, score/class/card filters, highest-player accounts, and
  score-zero rows for newly saved complete decks
- Retry-safe ranked-constructed deck aggregation, including source Glicko
  transitions, Apprentice eligibility, match-status counters, current-season
  highest-player wins, a global Durable Object serializer, and D1 receipts
- Source deck ownership, class-unlock, and partial-deck validation checks
- Atomic, owner-scoped deck favorite toggling
- Identity-owned inventory, equipment, summaries, and Cloud Weasel supply reads
- Durable Conquest entry, status, statistics, points, and source treasure thresholds
- Retry-safe authoritative Conquest win/loss/draw and terminal-state progression
- Source Conquest treasure points from matches, owned deck cards, and hero skins
- Faithful per-participant matchmaking modes, including source-compatible mixed
  Practice-PvP/ranked-constructed matches without awarding or persisting ranked
  progression for the Practice participant
- Versioned Conquest card pools, exact zero-through-three-win source bundles,
  independent Silver draws, and immutable retry-safe settlement receipts
- Immediate identity-inventory Silver grants plus source-compatible 24-hour
  delayed Gold delivery, pending-card reads/counters, feed receipts, and
  five-attempt dead-letter safety
- Write-once identity referrals, top-five friend points, inviter gifts, and the
  original Invite Friends screens
- Profile reward/rank feed and competitive match history
- Source match lookup privacy with participant-only replay capabilities
- Authenticated, match-scoped opponent reports with source rejection rules,
  plain-text sanitization, UTF-8 byte caps, pending moderation state, and
  retry-safe identity audit records
- Fail-closed Google-identity staff roles, source account-status aggregates,
  the original admin-UI authorization probe, and admin-gated tombstones for the
  source-unimplemented account-list methods
- Admin-only source account discovery by username or identity reference, plus
  cursor-paginated account lists with status, creation-window, and Conquest
  eligibility filters; IP history remains truthfully empty until that source
  audit stream has a Cloudflare equivalent
- Admin-only report-signal detail and account summaries for the preserved
  moderation screens, with source payload fields, status/date filters, bounded
  cursors, and neutral scores until the separate fraud analytics model is ported
- Admin-only match inspection with account/mode/status/duration filters,
  staff-gated replay IDs, cursor sorting, and truthful unreviewed defaults;
  pending Conquest Gold inspection with actual day/week card-quantity totals
- Admin-only community-content reads for every configured banner and reusable
  one-time notification template, while the player banner RPC remains limited
  to active rows and notification delivery remains separate player state
- Admin-only SkyPass reward-definition and premium-entitlement reads, with
  premium modeled as optional per-season Google-identity state and the free
  track available without a wallet or entitlement row
- Admin-only event-2 Conquest treasure-progress listing with bounded cursors,
  source point ordering and thresholds, and identity account names
- Original banner and featured-streamer mutations behind both `ADMIN` and an
  independently provisioned `CONTENT_WRITE` permission, with bounded public
  fields, HTTP(S)-only links, atomic before/after audits, and immutable audit
  triggers; production currently has no writer grants
- Audited one-time notification template create/update/delete plus player-side
  materialization with source age/address/creation-date filters, current-valid
  delivery suppression, revision-keyed retry receipts, and no wallet dependency
- Admin match-review transitions behind both `ADMIN` and an independently
  provisioned `MODERATION_WRITE` permission, with retry-idempotent state writes
  and immutable transition-only audits; production currently has no grants or
  review rows
- Source game-mode writes and status history behind both `ADMIN` and a dormant
  `GAME_MODE_WRITE` permission, with D1 as the shared authority for public
  status, matchmaker admission, and accepted-match dispatch; Conquest also
  requires an active pool and a separate recorded enablement drill
- Source moderator ban, suspension, flag, and vet actions behind both `ADMIN`
  and a dormant `ACCOUNT_ACTION_WRITE` permission, with immutable action,
  deactivation, and signal histories. Bans and suspensions are enforced at API,
  player, multiplayer-gateway, matchmaking-profile, and final-dispatch
  boundaries; bans suppress competitive ranking, all sanctions suspend delayed
  Conquest Gold, and only vetting restores disabled delivery
- Source forced rename, all-base-card unlock, warm-up correction, and starter-
  deck repair behind both `ADMIN` and a dormant `PLAYER_SUPPORT_WRITE`
  permission. Every successful change is atomic and immutably audited;
  collection repair recognizes Silver and Gold ownership of the same logical
  card, and the production capability currently has no grants
- Source forced quest completion and current-period reroll reset behind the
  same dormant player-support capability, with account-scoped assignment
  lookup, atomic immutable audits, and retry-idempotent history. Destructive
  quest deletion preserves the source production refusal after admin and
  target validation
- Source level grants and rank-point overrides behind both `ADMIN` and a
  dormant `PROGRESSION_WRITE` capability, with the source level cap, Cloud
  Weasel level offset, SkyPass/referral effects, winning Glicko state, ranked
  score behavior, deterministic top-100 Grandweaver recalculation, and an
  immutable before/after ledger. The capability also replaces the source's
  global rank-change switch and production currently has no grants
- Source premium SkyPass toggle behind both `ADMIN` and a dormant
  `ENTITLEMENT_WRITE` capability, with identity-owned per-season state,
  wallet-independent item balance, an explicit source-style giveaway cap,
  atomic immutable audits, and database guards against concurrent stale
  toggles. No production season cap or entitlement-writer grant is seeded, so
  both grants and removals currently fail closed
- Identity-native account deletion through the original settings dialog and a
  fresh Google OIDC step-up. Access stops immediately at `TO_DELETE`; the
  minute scheduler performs the source's soft anonymization after 30 days
  minus one hour, unlinks optional wallets, removes private user storage, and
  retains opaque provider tombstones so the deleted identity cannot be
  recreated. Game and audit history remain referentially intact
- Source-compatible `501` response for the intentionally disabled live-record read
- Local bot plus authoritative practice, ranked, challenge, and multiplayer paths
- Original Tutorial, Ranked, Practice PvP, and Conquest play screens for Google identities
- Durable matchmaking, acceptance/refusal cooldowns, active-match reconnects,
  opt-in source-compatible captcha/shadow-ban enforcement, and release-scoped
  game-abandon cooldown bridging
- Authoritative accepted-match account snapshots from D1: game aliases and
  locale/settings stay independent of Google profile data; rank state,
  cosmetics, card rarities, and private spectate codes are resolved by the
  service instead of trusted from the browser
- Source-faithful Conquest matchmaking preconditions: active-run progress is
  hydrated into the queue, mode and locked-hero deck class are validated at
  admission and re-read at final dispatch, the game receives both Conquest
  snapshots, and terminal 4xx rejections do not leave retrying proposals
- Authoritative WASM matches with bots, timers, hibernation, quests, XP, ranks,
  match rewards, private/public spectators, and capability-protected replays

WalletConnect remains an optional future integration. Captcha is deployed but
remains disabled until Cloud Weasel hCaptcha credentials are provisioned.
Seasonal invite-sticker redemption, marketplace writes, legacy data migration,
and most administrative RPCs remain pending. No production staff identity is
provisioned. Conquest queues stay disabled until an
explicit production reward pool is approved and the enablement drill validates
settlement and delayed delivery against that pool.

## Latest verification

- API Worker: 22 files, 146 tests
- Match service: 14 Worker tests
- Game Worker: 24 unit and 48 Worker tests
- Matchmaker: 26 unit and 18 Worker tests
- API, match service, and game Worker type-checks; original webapp/game
  production build
- Card-library generator, source-RPC inventory, and production Conquest gates
- Live Worker version, original interface, Cloud Weasel metadata, mode status,
  matchmaker/game protocol-v3 health, authentication boundaries, and the
  source-compatible disabled-live-record response
- Remote D1 after migration `0029`: zero deck ranks, per-player deck wins, or
  completion receipts before the first new ranked match; the public list was
  empty, authenticated search rejected anonymous access, and the read-only
  verification reported `changed_db: false`
- Remote D1 after migration `0030`: zero account-report records before the first
  player report; anonymous submission returned `401`, the live version matched
  the deployment, and the read-only verification reported `changed_db: false`
- Live invite requests rejected anonymous access, while the retired `SignIn`
  endpoint returned the source-compatible deprecated-method `500`; Worker
  version metadata matched `acb48593-f01f-455a-93f9-3c7699705eb9`
- Remote D1 after migration `0031`: zero staff grants and one existing `ACTIVE`
  player; anonymous admin probes returned `401`, version metadata matched the
  deployment, and the read-only verification reported `changed_db: false`
- Live `GMFindAccount` and `GMListAccounts` probes both returned `401` without a
  session, production still had zero staff grants, version metadata matched
  `c9d21893-3819-4e3e-8ed3-1bfd375fbc6f`, and the D1 read reported
  `changed_db: false`
- Live signal-detail and summary probes both returned `401`; production retained
  zero staff grants and zero reports, version metadata matched
  `a5492d0f-4b2f-4a5f-9c0e-2607c4cc3382`, and both D1 reads reported
  `changed_db: false`
- Live match and pending-Gold probes both returned `401`; production had 10
  match rows, zero pending Gold deliveries, and zero staff grants. Version
  metadata matched `a36db2d7-bd1c-4cdc-ad13-eb446fb5fbe7`, and all three D1
  aggregate reads reported `changed_db: false`
- Live all-banner and notification-template probes both returned `401` without
  a session; migration `0032` was present, production had zero templates and
  zero staff grants, version metadata matched
  `676a7de5-ce02-442e-8c09-dec731570f13`, and all D1 reads reported
  `changed_db: false`
- Live SkyPass-definition and premium-entitlement probes both returned `401`
  without a session; migration `0033` was present, all 127 season-62 reward
  definitions remained available, production had zero premium entitlements and
  zero staff grants, version metadata matched
  `e5ec4321-d302-4995-9945-86424d526b8c`, and all D1 reads reported
  `changed_db: false`
- The live Conquest treasure-progress probe returned `401` without a session;
  production had zero event-2 progress rows and zero staff grants, version
  metadata matched `9f9c4e18-677f-45a5-9ad4-41dfa7c738de`, and both D1 reads
  reported `changed_db: false`
- All five live community-write probes returned `401` without a session after
  edge propagation; migration `0034` was present, production retained zero
  content-write grants, audit rows, banners, or featured streamers, version
  metadata matched `006c27fa-eed1-4728-84b9-d135d13ec45d`, and every D1 read
  reported `changed_db: false`
- The three live template-write probes and `ListNotifications` returned `401`
  without a session; migration `0035` was present, production retained zero
  templates, template audits, template deliveries, total inbox rows, or writer
  grants, version metadata matched `be11c131-00a9-4e3e-a96f-8756893bedef`, and
  every D1 read reported `changed_db: false`
- The live `GMSetReviewed` probe returned `401` without a session; migration
  `0036` was present, production retained zero moderation-writer grants, review
  rows, or review-audit rows, version metadata matched
  `d6a00372-2fee-4044-abf0-e5b45862b86d`, and every D1 read reported
  `changed_db: false`
- Live `GMGameModeSet` and `GMGameModeStatusHistory` probes returned `401`
  without a session after edge propagation; migration `0037` was present and
  the public status stayed unchanged with both Conquest queues disabled.
  Production retained zero game-mode writer grants, history rows, or Conquest
  readiness approvals; version metadata on the live routes propagated to
  `c67f5725-04bd-47f3-a3f1-067cfb7e3aa0` from source `ef7fc36`, and every D1
  verification read reported `changed_db: false`
- Live `GMListAccountActions` and `GMCreateAccountAction` probes returned `401`
  without a session; migration `0038` was present and the app, Google auth
  configuration, API ping, game-mode status, and matchmaker protocol-v3 health
  all passed. Production retained zero account-action writer grants, action,
  deactivation, signal, or disabled-delivery rows; its one existing account
  remained leaderboard-eligible. API, match-service, and matchmaker versions
  propagated to `300f56ff-6019-49d8-bcc7-2c254c3bae86`,
  `177a62e5-e7ad-4142-b029-f9f4d87123d8`, and
  `c493d4d0-3e69-4cbf-93be-de0dc235a4a7`, and every D1 verification read
  reported `changed_db: false`
- Live `GMRenameAccount`, `GMUnlockAllBaseCards`,
  `GMSetWarmupGamesCompleted`, and `GMResetStarterDecks` probes all returned
  `401` without a session; migration `0039` was present, Google login remained
  configured, and API `Ping` passed. Production retained zero player-support
  grants or audit rows, and its one existing account remained at zero warm-ups.
  The corrected 498-file static deployment served the canonical practice-game
  index and its 4.5 MB hashed bundle with HTML and JavaScript content types
  respectively, after an incomplete 157-file upload had briefly exposed the
  webapp SPA fallback at the game route. API version
  `3ea599d6-bff3-4341-be27-c3025dc3b6ec` contains source `dc5ab33`, and every
  D1 verification read reported `changed_db: false`
- Live `GMCompleteQuest`, `GMResetQuestReRolls`, and `GMDeleteQuest` probes all
  returned `401` without a session; migration `0040` was present, API `Ping`
  passed, and the game bundle remained JavaScript. Production retained zero
  player-support grants or quest-support audits and its three existing quest
  assignments remained one active and two complete. API version
  `3e6533dc-37de-48f8-8909-e9412ea11f63` contains source `f054600`, all 498
  static assets were recognized, and every D1 verification read reported
  `changed_db: false`
- Live `GMGiveLevels` and `GMSetRP` probes returned `401` without a session;
  migration `0041` existed exactly once, API `Ping` passed, and the practice
  bundle remained JavaScript. Production retained zero progression grants or
  audits, its one profile stayed at level 1 with zero XP, and its two current
  rank rows were unchanged. API version
  `fc31b8f1-6f23-4677-b885-c52de1629b31` contains source `cf2a43b`, all 498
  static assets were recognized, and every D1 verification read reported
  `changed_db: false`. A first D1 request returned Cloudflare `7403` before
  execution under the wrong OAuth account; explicitly removing the optional
  account override selected the repository-pinned account and applied `0041`
  once
- The live `GMToggleSkypassPremium` probe returned `401` without a session;
  migration `0042` existed exactly once, API `Ping` passed, and the exact
  4.3 MB practice-game entry remained JavaScript. Production retained zero
  entitlement-writer grants, season giveaway caps, entitlement audits, premium
  item balances, or premium stats, so the deployed operation is dormant and
  fails closed. API version `ff595b05-c845-4c78-aa2f-c6a1589db46f` contains
  source `0dae6c1`, all 498 static assets were recognized, and the D1
  verification read reported `changed_db: false`
- The live identity-native deletion start returned `401` without a session and
  `403` for a cross-origin request; migration `0043` existed exactly once,
  API `Ping`, original webapp HTML, and the exact 4.3 MB practice-game entry
  all passed. Production retained zero deletion requests, provider tombstones,
  `TO_DELETE`, or `DELETED` accounts, and its one existing user was unchanged.
  Final API version `5a690489-47ec-4d67-b014-f4fecd949263` contains backend
  source `9fb4e7c` and webapp source `c80d59b`; the final safety pass also
  prevents a ban or suspension applied during Google step-up from racing the
  deletion transition. All 498 static assets were recognized,
  and the D1 verification read reported `changed_db: false`
- Match service version `4ce3627e-69fb-48b2-9169-5f203ede55e9` contains source
  `013a246`. Its deployment passed the Conquest fail-closed gate; the public
  API `Ping` and API-to-match-service `GetGameModesStatus` binding both passed,
  with both Conquest modes still disabled. The authoritative match snapshot
  now carries the D1 game alias, locale, warm-ups, account cosmetics, current
  rank state, inventory-derived card rarities, and the persistent spectate code
  checked by the game Durable Object
- Game Worker version `3535d130-8e3d-47f4-bbe7-d730eeacb389` contains source
  `fbe7080`. Migration `0044` existed exactly once after deployment; production
  had zero warm-up settlement receipts and zero progressed accounts, and the
  read-only verification reported `changed_db: false`. The Worker health probe
  passed. Completed practice matches now advance the source 0-3 warm-up counter
  through an idempotent receipt, including the source's practice-bot win and
  completed-draw edge cases
- Match service version `04dd3921-94a6-4016-bd5a-0608d3025545` and matchmaker
  version `a6f9470b-2c72-4428-8c5a-d11bd9bea3d2` contain source `cae1ea6`.
  Their 11 match-service, 26 unit, and 16 Worker tests passed before deployment.
  Live matchmaker protocol-v3 health, public API `Ping`, and the API-to-match-
  service mode-status binding passed; both Conquest queues remained disabled.
- API/web version `523cbe54-0e1b-40fc-b2e2-f3f37a2322e5`, match service
  version `80e109e1-ba12-4858-8b67-2327a87e195f`, matchmaker version
  `eddc0240-7eb6-4ceb-8798-6eb484b30779`, and game version
  `51d2a5be-f080-40e4-88cb-a012422be4cf` contain source `492cd47`.
  Migration `0045` existed exactly once, and all 10 existing match rows had
  both participant modes backfilled with no nulls; the read-only verification
  reported `changed_db: false`. The live API `Ping`, public mode status, and
  both protocol-v3 health probes passed, with both Conquest queues still
  disabled. The rollout passed 146 API, 14 match-service, 24 game-unit, 48
  game-Worker, 26 matchmaker-unit, and 17 matchmaker-Worker tests.
- Matchmaker version `599c8f8f-0c32-4d53-876c-5f9f40d13043` contains source
  `d4b59c2`. The source `OUTDATED_CLIENT` admission check now rejects a browser
  release other than the configured `cloudflare` release before captcha or D1
  profile work, while a four-test deployment gate prevents browser/matchmaker
  release drift. All 26 unit and 18 Worker tests, TypeScript type checking, and
  the corresponding Go validator/matcher suites passed. Live protocol-v3
  health, API `Ping`, and the `/game/cloudflare/` client path passed after
  deployment.
- Match service version `91d51aae-89de-4269-a4e1-39909b857ed1` and matchmaker
  version `d0c2f800-7ea9-43b5-8e1f-bc51ca590ed3` contain source `cd4832d`.
  Discovery/challenge admission now preserves the source random-deck and
  nonempty-session contract, final dispatch rechecks deck and queued-session
  integrity, and challenge codes reach the game payload. The rollout passed 31
  matchmaker unit, 20 matchmaker Worker, and 17 match-service Worker tests,
  affected-package type checking, the release/Conquest deployment gates, and
  corresponding Go validator/matcher suites. Live protocol-v3 health, API
  `Ping`, public mode status, game client HTML, and the game Worker health probe
  passed; both Conquest queues remain disabled.
- Match service version `cae5bc9e-6619-4e32-9d62-de62e6e6fcc4` contains source
  `4071faa`. Its final deck normalization now follows the Go player-factory
  order: unknown and unowned card claims are removed before the 30-card,
  duplicate, and two-prism checks, and inventory-wide card rarities remain
  available for matchmaking quality. Type checking and all 17 Worker tests
  passed before deployment. Live API `Ping`, public mode status, and both
  protocol-v3 health probes passed; both Conquest queues remain disabled.
- Matchmaker version `f0e4cde3-00c5-4c47-93e7-54e898ed7e2f` contains source
  `ba36911`. Its Google-session admission now overwrites browser player bytes
  with the trusted principal, validates and canonicalizes private-seed key,
  prism, and card wire data before durable queueing, and discards rarity claims
  while retaining wallet-free zero signatures. All 38 unit and 21 Worker tests,
  TypeScript type checking, the release gate, and scoped Go auth/private-seed
  source suites passed. The broader recursive Go player run additionally hit
  the untouched legacy bot package's fixed-signature expectation; it was not
  changed. Live protocol-v3 health, API `Ping`, public mode status, and game
  client HTML passed; both Conquest queues remain disabled.
- Matchmaker version `af69e787-3744-4563-9f96-fd80b46cd577` contains source
  `3b18e95`. Accepted match-service allocation now has a three-attempt bounded
  retry budget; exhaustion removes the old proposal and restores connected
  humans to durable queue tickets without a refusal or timeout penalty, matching
  the Go director's player-release outcome. All 38 unit and 22 Worker tests,
  TypeScript type checking, the four-test release gate, and the scoped Go
  director/custom-matcher suites passed. Live protocol-v3 health, API `Ping`,
  authoritative service-bound mode status, and game client HTML passed; both
  Conquest queues remain disabled.
- Matchmaker version `04ba29c2-3d25-41a4-a9ac-38b0bfcb4e66` contains source
  `f99a429`. Its Durable Object now refreshes the D1-backed game-mode
  switchboard on the source's ten-second cache interval even for one waiting
  player, drains disabled tickets with `GAME_MODE_DISABLED`, and cancels
  disabled accepted proposals with `SERVER_SHUTDOWN`. Status refresh failures
  pause matching/dispatch, preserve durable state, and retain an alarm retry.
  All 38 unit and 25 Worker tests, matcher and preserved-webapp type checks, the
  four-test release gate, and Go game-mode-checker/custom-matcher suites passed.
  Live protocol-v3 health, API `Ping`, authoritative service-bound mode status,
  and game client HTML passed; both Conquest queues remain disabled.
- Matchmaker version `e9667be2-66ed-45d5-ad57-dc14564dac5a` contains source
  `71818bc`. Final game-side assignment now preserves the Go director's player
  shuffle without queue-order bias; a cryptographically random proposal UUID
  supplies a deterministic retry-safe coin flip after canonical address order,
  and the selected order is persisted before match-service dispatch. A Durable
  Object alarm also recovers a crash after both acceptances were persisted but
  before that transition completed. All 40 unit and 27 Worker tests, matcher and
  preserved-webapp type checks, the four-test release gate, and the Go director
  match-handler suite passed. Live protocol-v3 health, API `Ping`, authoritative
  service-bound mode status, and game client HTML passed; both Conquest queues
  remain disabled.
- Match service version `80da4b3c-d476-442a-9b3f-a42cd8e3ef97` contains source
  `952bb56` and `2a192d6`. A successful idempotent retry after a transient game-
  Worker failure now activates the same failed D1 allocation, preserving its
  match/replay IDs and installed payload, and verifies activation before
  returning success. Newest-allocation-wins guards prevent an older delayed
  retry from dispatching over or superseding a later active match; the stale row
  ends with typed `PLAYER_HAS_EXISTING_MATCH`, and failure recording cannot
  rewrite that audit state. Type checking, the Conquest production gate, and all
  19 Worker tests passed. Live protocol-v3 health, API `Ping`, authoritative
  service-bound mode status, and game client HTML passed; both Conquest queues
  remain disabled. A read-only production aggregate found one active and nine
  ended matches, no creating/failed rows, and reported `changed_db: false`.
- Match service version `16934ac3-15b6-4e4e-9581-86b0a2646610` and matchmaker
  version `49bd05fd-6fcd-4f8e-aa31-00ec0d115140` contain source `18e66c1`.
  Human player-session IDs now follow the source Go `google/uuid` decoder at
  both the browser-message and final-dispatch boundaries: canonical, compact,
  braced, and UUID-URN forms are accepted and marshalled to canonical lowercase
  text, while malformed or inconsistent values fail closed. The match service's
  internally generated bot session is now a source-compatible UUID too. All 46
  matcher unit, 27 matcher Worker, and 20 match-service Worker tests and both
  TypeScript checks passed. Live matcher protocol-v3 health, API `Ping`, the
  authoritative mode-status binding, and game client HTML passed; both Conquest
  queues remain disabled. A read-only production aggregate remained one active
  and nine ended matches with no creating/failed rows and reported
  `changed_db: false`.
- Wrangler OAuth now exposes two Cloudflare accounts. D1 commands must pass
  the repository config so its pinned account/database IDs select production.
  An explicit environment override produced Cloudflare `7403` before execution
  during the `0038` rollout; removing it resolved the same database and applied
  the migration once.
- Remote D1 after migrations `0027`/`0028` and a scheduled tick: zero active
  reward pools, settlements, delayed Gold deliveries, or Conquest feed events;
  the read-only verification reported `changed_db: false`
- The full legacy monorepo typecheck still has unrelated baseline failures in
  old ES-target, sheet-editor, and chain-contract packages; the affected
  Cloudflare packages are clean.
