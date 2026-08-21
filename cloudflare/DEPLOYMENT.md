# Cloud Weasel deployment

## Production

- URL: https://opensky-webapp.dysinski-tomasz.workers.dev
- API/web Worker: `opensky-webapp` (`66f26408-e3ac-4045-a63b-a0bcdd1fec08`)
- Matchmaker Worker: `cloud-weasel-matchmaker` (`063eeb90-21e3-48e5-b877-57fea7ad57ef`)
- Match service Worker: `cloud-weasel-match-service` (`700ffbb4-f8ce-401f-afeb-ba856be1a5e9`)
- Game Worker: `cloud-weasel-game-server` (`fcb811fc-43dd-4c49-a244-f1c5f91ff828`)
- Paused branch checkpoint: runtime commit `f8b1601a` is tested but not
  deployed. Migrations `0115_authoritative_match_decks.sql` and
  `0116_registered_matchmaker_bots.sql` are intentionally not applied. Apply
  them in that order at the documented quiescent boundary before deploying
  any Worker from `90ebe652` or later. Every checked-in deploy command now
  performs a fail-closed, account-pinned, read-only D1 schema preflight first;
  the migration command is intentionally exempt so it can advance the schema.
  This checkpoint also preserves the source API and matchmaker `/ping`
  heartbeats plus the game server `/` and `/ping` routes. A fail-closed
  4/4/5-route inventory is required by the complete release contract and the
  affected component deploy commands. The game server also accepts the source
  text and binary WebSocket frames and exact application `PING` prefix/ID
  behavior across Durable Object hibernation. Its mutation-tested source gate
  is required by the complete and game-server deployment contracts. Malformed
  JSON remains silent on the usable source socket, while missing or unknown
  message types empty-close without an invented player-facing error. Before a
  match context is linked, gameplay from either gateway role receives the
  source `You have no game in progress!` user error and an empty close, while
  loading progress, emote, mute, and client-error frames remain silent and do
  not prevent a later time-sync or valid bootstrap. Explicit source spectator,
  unavailable-match, and unowned-sticker errors preserve their original
  message/level and empty close. A same-socket spectator replacement is
  terminal, while a same-socket player replacement sends the source
  displacement notice, rejoins, and stays usable.
  Spectator bootstrap is selected by the first game message rather than frozen
  to the gateway's initial role, so a participant may use a separate
  connection to spectate the opponent while self-spectate and unavailable
  targets retain their exact source errors and empty close. Successful
  spectators cannot receive player-private rewards, mute stays source-silent,
  and the source 50-joined-spectator limit is independent from the reviewed
  64-socket pending-plus-joined gateway safety bound. Joined-spectator gameplay
  and loading remain fail-closed because the source forwarding paths can spoof
  player state or reach an uncaught worker error.
  Pre-join `join_server` is likewise selected by the first message. The Google
  gateway remains authoritative: anonymous sockets receive the source
  server-level `invalid authentication` wire and authenticated nonparticipants
  receive `match ended or cannot be found.`, both with an empty close. This
  restores the observable source errors without trusting legacy `authToken`
  fields or changing participant join/reconnect behavior.
  Match-info also preserves the source initialization transition: a `creating`
  row returns `in_progress_match_info` with `initialized: false`, its immutable
  release and participants, and a same-origin proposal WebSocket address. The
  original browser therefore performs its three-second retry instead of
  receiving a transient `no_match_found`; the ready `active` path still
  requires and validates its authoritative server address and match payload.
- Deployed source includes `ea989a4` for the API/web and game Workers,
  `56c606d` for recent-match recovery, `72eece1` for the
  loading-timer milestone, `1e31b4f` for socket handoff, `1d14982` for the game
  deadline milestone, `f5775cc` for half-open socket handling, `0438095` for
  Conquest settlement retry recovery, `dab4ba6` for anonymous public
  spectating, `aa53dc7` for leaderboard reward projections, `6cb51bf` for the
  dormant leaderboard reward worker, `82be98f` for source rank rollovers, and
  `c9f358c` for the source payment catalog, `5902915` for dormant Stripe
  checkout, `6dc5e12` for staff payment reads, and `284f1da` for optional
  wallet ownership proofs, and `f19fd20`/`b1597c6` for the fail-closed R2
  feedback port, `3113d17` for the gated Conquest V2 economy previews, and
  `bd1a236` for dormant App Developer Key management, `051e83a` for guarded
  SkyPass reward-definition updates, and `03fd8ca` for the off-chain reward
  policy, plus `44e6797` for the shared next-reward schedule read; matchmaker
  and match service include `309861e`. The API also includes `08bcd4d` for
  off-chain referral-sticker delivery, `30ca55a` for complete off-chain
  SkyPass delivery, `c88a7a2`/`6fa9d05` for Silver-to-ticket exchange, and
  `bc9adc7` for the original Pending Gold delivery screen, and `4fb1e1c` for
  fork-owned Discord/Twitch information, `8346b14` for the mobile-store
  off-chain ledger, `db134d0` for Samsung purchase verification, and
  `1b141eb` for Google Play verification, and `e713f20` for explicit legacy
  mobile/early-access tombstones, and `0442374` for Apple App Store Server API
  verification, plus `0fc801e`/`0895054` for the off-chain Gold-to-Hero-skin
  exchange and its preserved original-product interface, and `a8b8d89` for
  Google-mode off-chain reward presentation and regression guards, plus
  `8aaac21` for build-enforced Go-worker inventory and `d50c553` for off-chain
  SkyPass season close and auto-claim. The current API/web artifact also
  includes `8ec460f` for inventory-only card details and `fd60828` for safe
  Base/Silver/Gold navigation, plus `cdba69e` for isolated identity and legacy
  card-control component boundaries.
  It additionally includes the source-faithful read-only Market restoration
  through Heroes milestone `8d8895e` and the release-safe static-asset cache
  boundary `e0f3aee`; deployment verification is automated by `4308a5d`.
  The API and match service also include `90dbfe7`: Conquest readiness is now
  backed by the real off-chain Silver settlement and delayed-Gold delivery
  receipts, and admission closes dynamically when that verified pool expires.
  The API also includes `f9ec4ec`: referral-sticker metadata remains dormant
  until an immutable two-actor schedule activates exact off-chain rewards, and
  every point-deduction batch records the schedule version that authorized it.
  It also includes `d1cd5a6`: weekly leaderboard delivery is inert until an
  independently reviewed digest activates the exact off-chain rank curve,
  ordered season-valid card pool, deterministic draw, modes, item IDs, and
  quantities; every cycle freezes that policy before snapshotting ranks.
- Deployed: 2026-08-13 PDT
- Applied D1 migrations: `0001` through `0088`; the remote migration check
  reports no pending migrations.
- Scheduled trigger: every minute for due Conquest Gold delivery, SkyPass
  season close and auto-claim, account
  anonymization, expired wallet-proof cleanup, and explicitly configured
  leaderboard reward cycles. No leaderboard schedule is configured in
  production.

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
- Authenticated source payment-provider product discovery for the preserved
  SkyPass UI; checkout and fulfillment remain disabled rollout gates
- Legacy deck listing, creation, update, deletion, and deck-string encoding
- Private source deck search with exact/class/name filters and cursor pagination
- Public source deck leaderboard plus authenticated rank search, with current
  card-library scoping, score/class/card filters, highest-player accounts, and
  score-zero rows for newly saved complete decks
- Source-ranked player leaderboard reward projections, including the exact
  Silver curve and Conquest-ticket rank boundaries
- A retry-safe, immutable weekly leaderboard reward snapshot and delivery
  worker, deployed dormant until an explicit Cloud Weasel cadence and exact
  off-chain reward-policy digest receive independent two-actor review;
  the exact source weekly/monthly rank rollovers run only after delivery
  completes. The source-compatible next-reward read uses that same immutable
  schedule and fails explicitly while production has no configured cadence
- Source-faithful Conquest V2 weekly treasure rollover and delayed off-chain
  Silver delivery, dormant until a two-actor approval binds the exact cadence,
  settings mutation, algorithm digest, quantities, and generated-card pool;
  started cycles remain deliverable from immutable receipts
- Retry-safe ranked-constructed deck aggregation, including source Glicko
  transitions, Apprentice eligibility, match-status counters, current-season
  highest-player wins, a global Durable Object serializer, and D1 receipts
- Source deck ownership, class-unlock, and partial-deck validation checks
- Atomic, owner-scoped deck favorite toggling
- Identity-owned inventory, equipment, summaries, and Cloud Weasel supply reads
- Original Hero-skin carousel, order review, and owned-Gold selection flow,
  backed in Google-auth mode by a retry-safe, atomic 10-Gold-to-one-Hero-skin
  D1 exchange instead of a mint or wallet transaction
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
- Source referral-sticker threshold accounting, top-five friend attribution,
  23-hour delayed delivery, 100-unit sticker rewards, point carry-forward, and
  sanction pauses, with immutable retry-safe off-chain D1 receipts. Production
  has no current-season sticker definitions, so the scheduled path remains a
  read-only no-op until Cloud Weasel content is configured
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
- Capability-gated SkyPass reward imports as invisible immutable drafts, exact
  draft review through `GMListSkypassRewards`, and distinct-actor activation
  through `GMActivateSkypassRewards`. Player reads and claims use only active
  versions, with the exact off-chain fulfillment policy stored on every new
  claim receipt
- Admin-only event-2 Conquest treasure-progress listing with bounded cursors,
  source point ordering and thresholds, and identity account names
- Admin-only Conquest V2 config and summary previews preserving the source
  defaults, zero fallback, float32 weights, ten-unit pool rounding, and all ten
  treasure bands. Config mutation additionally requires the dormant
  `CONQUEST_CONFIG_WRITE` capability, uses optimistic concurrency, and appends
  immutable before/after audits; production has no capability grants. These
  previews do not activate the legacy USDC-facing public pool or treasure RPCs
- Source App Developer Key create/list/enable/disable/token RPCs behind both
  `ADMIN` and the dormant `APP_DEV_KEY_WRITE` capability. D1 preserves the
  32-character `SW01` key shape and enabled-name/email uniqueness under races;
  key state and token reveals enter immutable secret-free audits. Source-shaped
  one-year JWTs can be generated, but partner API authorization remains
  intentionally dormant pending an explicit per-method scope contract
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
- Optional EVM wallet ownership links attached to an existing Google identity,
  using exact origin-bound ERC-4361 messages, ten-minute single-use nonces,
  ERC-191 EOA signature recovery, concurrent replay rejection, database-level
  prevention of address reassignment, and account-deletion cleanup. Wallet
  proofs neither create login sessions nor authorize transactions
- Source client-feedback ingestion ported from private S3 to private R2, with
  authenticated identity-scoped keys, bounded JSON and JPEG payloads,
  collision resistance, an optimistic ten-submission-per-hour D1 guard, and
  account-deletion cleanup. Production currently returns `503` after
  authentication because R2 has not been enabled on the Cloudflare account;
  payloads are never accepted and discarded silently
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

R2 activation is pending an account-level Cloudflare choice; the live API still
returns Cloudflare error `10042`. Once enabled, create the private feedback and
analytics buckets, add reviewed retention lifecycles, deploy the analytics
consumer, and verify it before enabling either producer. The WalletConnect
browser UI and ownership-proof boundary are deployed but remain inactive
pending a public WalletConnect/Reown project ID and origin allowlist. Contract-account
ERC-1271 verification also remains pending an approved chain RPC; the deployed
proof boundary currently accepts EOAs only. Captcha is deployed but remains
disabled until Cloud Weasel hCaptcha credentials are provisioned.
Seasonal invite-sticker redemption is fully ported to delayed off-chain D1
inventory but needs an approved current-season sticker schedule. Marketplace
writes still need a Cloud Weasel product decision. Legacy account migration is retired for the zero-user
launch, and the source admin RPC surface is ported behind dormant granular
capabilities. No production staff identity is provisioned. Conquest queues stay disabled until an
explicit production reward pool is approved and the enablement drill validates
settlement and delayed delivery against that pool.

The SPA shell is served through the Worker with browser and Cloudflare edge
`no-store` directives so a successful deployment cannot leave users on an old
HTML manifest. Fingerprinted web and game assets use a one-year immutable
policy, while unhashed assets such as the service worker retain Cloudflare's
revalidation behavior. The release gate verifies both the routing boundary and
the cache-policy implementation. `pnpm deploy:cloudflare` now finishes by
running `pnpm verify:cloudflare:deployment`; it compares both production HTML
entry paths with the exact local artifact and validates the HTML and
fingerprinted-asset cache headers before reporting a successful deployment.

## Latest verification

- Client release cache-safety milestone `e0f3aee` was deployed on 2026-08-13
  as API/web Worker version `66f26408-e3ac-4045-a63b-a0bcdd1fec08`. Two
  independent production SPA responses carried both browser and edge
  `Cache-Control: no-store`, and the served manifest referenced the exact
  tested `index-1be0133a.js` entry. The fingerprinted web entry and
  `game/cloudflare` entry both returned the one-year immutable policy. A
  signed-in production client retained its Google session and rendered the
  original five-section Market navigation plus all 15 Heroes results. The
  release passed 338 main Worker tests, 216 multiplayer tests, 24 browser/game
  tests, six analytics tests, every TypeScript check, and every release and
  off-chain safety gate.

- API Worker: 44 files, 325 tests
- Match service: 27 tests
- Game Worker: 31 unit and 80 Worker tests
- Matchmaker: 47 unit and 31 Worker tests
- Game analytics: four unit and two Worker tests; deployment remains blocked
  by account-level R2 error `10042`
- API, match service, and game Worker type-checks; original webapp/game
  production build
- Card-library generator, source-RPC inventory, and production Conquest gates
- Live Worker version, original interface, Cloud Weasel metadata, mode status,
  matchmaker/game protocol-v3 health, authentication boundaries, and the
  source-compatible disabled-live-record response
- API/web Worker version `59ef2c34-4490-4cff-b38a-c1f400b1a2b0` serves commit
  `500d2d5` at 100% traffic. Migration `0089` makes an enabled Conquest V2
  cadence inert until two actors approve the exact current economy-settings
  mutation, source algorithm digest, eleven per-level Silver quantities, and
  generated-card catalog. Each started cycle freezes its exact ordered,
  season-valid card pool and settings in an immutable receipt; settings drift
  blocks new cycles but cannot strand rewards after point rollover. D1 rejects
  caller-selected pools, incomplete snapshots, incorrect quantities,
  out-of-pool cards, and awards without an active receipt. Production has 62
  immutable catalog ranges expanding to all 856 generated cards, but zero
  schedules, activations, cycles, policy receipts, entries, or awards. Live
  Version, Ping, mode-status, and app-HTML probes returned `200`; both Conquest
  modes remain false. The final read retained 31 inventory rows and total
  balance 31, made zero writes, reported `changed_db: false`, and found no
  pending migrations. The release passed all 325 API tests, 27 match-service
  tests, 31 game unit plus 80 game Worker tests, 47 matchmaker unit plus 31
  Worker tests, six analytics tests, every TypeScript check and safety audit,
  and the complete original browser/game production build.
- API/web Worker version `0caeb7a2-11b0-4146-b47d-21596795a102` serves commit
  `d1cd5a6` at 100% traffic. Migration `0088` requires two actors to activate
  the exact approved leaderboard reward digest before any enabled cadence can
  run, derives each cycle's season/week from the source calendar, freezes the
  exact ordered season-valid card pool, verifies authoritative top-500
  snapshots, and rejects award quantities or card IDs outside the source
  policy. Production has 30 immutable policy ranges expanding to 781 cards,
  but zero schedules, activations, cycles, policy receipts, snapshots, or
  awards. Live Version, Ping, mode-status, and app-HTML probes returned `200`;
  both Conquest modes remained false and `GetNextRewardsTime` correctly
  returned fail-closed `503`. The final read retained 31 inventory rows and
  total balance 31, made zero writes, reported `changed_db: false`, and found
  no pending migrations. The release passed all 318 API tests, 27
  match-service tests, 31 game unit plus 80 game Worker tests, 47 matchmaker
  unit plus 31 Worker tests, six analytics tests, every TypeScript check and
  release gate, and the complete browser/game build.
- API/web Worker version `2d9abc61-1f9b-49ee-93b3-09ccca81947e` serves commit
  `f9ec4ec` at 100% traffic. Migration `0087` separates raw sticker metadata
  from reward authority: a nonempty second actor must activate an exact,
  immutable current-season schedule before the public reward catalog or
  scheduler can use it, and immutable per-batch receipts prevent later or
  retroactive schedules from authorizing point deductions. Production has zero
  sticker metadata, schedules, schedule receipts, reward batches, awards, or
  inventory grants, so season 62 remains deliberately `Coming Soon`. Live
  Version, Ping, GetStickers, mode-status, and app-HTML probes returned `200`;
  GetStickers returned an empty list and both Conquest modes remained false.
  The final D1 read retained 31 inventory rows, made zero writes, and reported
  `changed_db: false`; no migrations remain pending. The release passed all 314
  API tests, 27 match-service tests, 31 game unit plus 80 game Worker tests, 47
  matchmaker unit plus 31 Worker tests, six analytics tests, every TypeScript
  check, the complete browser/game build, and 24 off-chain gate tests.
- API/web Worker version `b17d2cee-ee47-490f-86d9-a05ac4b95aa9` and match
  service version `700ffbb4-f8ce-401f-afeb-ba856be1a5e9` serve commit
  `90dbfe7` at 100% traffic. Migration `0086` installed receipt-backed
  readiness views plus immutable insert/update/delete and queue-enable guards.
  Read-only production probes found zero active or verified pools, readiness
  rows, settlement/delivery rows, and enabled Conquest modes. The live API
  Version, Ping, HTML, and API-to-match-service mode-status probes passed; both
  Conquest queues remain false and the remote migration list is empty.
  The same release passed 313 API tests, 27 match-service tests, 31 game unit
  tests, 80 game Worker tests, all three TypeScript checks, and every off-chain,
  source-mint, reward-producer/mutator, chain-effect, and browser-transaction
  audit.
- The preceding signed-in production browser QA navigated a real
  card from Base to Silver to Gold with the original art, lore, grades, and
  balances intact; every grade displayed off-chain inventory copy, no price,
  stock, supply, buy, or sell controls, no error boundary, and no console
  errors. The off-chain gate has 23 tests and rejects both wallet-market
  regressions and expression-bodied scroll effects that can return an invalid
  React cleanup value. Quests, basic SkyPass, decks, Heroes inventory,
  leaderboards, account, and Practice Bot also rendered under the retained
  Google session without a boundary or console error. The direct localbot URL
  reached a rendered mulligan board and hand in WebGL; it did not stop at a
  blank canvas or loading shell.
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
- Game Worker version `f5ea16d9-42fa-45ed-b4f3-f409469c9448` contains source
  `6574a62`. An identical match-creation retry now repairs either side of the
  Durable Object's two-stage initialization boundary: an empty pre-start timer
  state is completed, and a persisted deadline with a missing or late alarm is
  rescheduled without extending the healthy deadline. Immutable payload and
  release-conflict checks still run before any repair. All 24 game unit and 49
  game Worker tests and TypeScript checking passed. Live game and matcher
  protocol-v3 health passed; a read-only production aggregate remained one
  active and nine ended matches with no creating/failed rows and reported
  `changed_db: false`.
- Game Worker version `9e2bdf2b-489e-45cc-9ef1-2e9df16bd801` contains source
  `7c91592`. The authoritative match-creation boundary now independently
  decodes both player-session IDs with the same source `google/uuid` contract
  used upstream, persists canonical lowercase text, and rejects malformed
  service payloads before installing a match. This completes defense in depth
  across matcher, final allocation, and game Durable Object. All 24 game unit
  and 50 game Worker tests and TypeScript checking passed. Live game health and
  API `Ping` passed; a read-only production aggregate remained one active and
  nine ended matches with no creating/failed rows and reported
  `changed_db: false`.
- Match service version `1e0c236f-292a-40c3-9600-9f28522d2888` contains source
  `bd34e6e`. Migration `0046` adds a checked nullable accepted-dispatch
  fingerprint. New allocations bind a proposal ID to the canonical SHA-256 of
  its normalized players, identities, requests, modes, release, and acceptance
  time; active, failed, and creating retries must match before profile or game
  work. `INSERT OR IGNORE` races are rechecked after the first writer, identical
  concurrent requests coalesce to one replay/allocation, and a conflicting
  loser cannot mark the winner failed. Historical rows remain compatible via
  conservative comparison of their stored allocation fields. The rollout
  passed 23 match-service, 146 API, and 50 game Worker tests plus match-service
  TypeScript checking and the Conquest gate. Migration `0046` existed exactly
  once; all ten historical rows retained null fingerprints, zero rows were
  creating/failed, and the read-only verification reported `changed_db: false`.
  Live API `Ping`, authoritative mode status, and both multiplayer health probes
  passed with Conquest disabled.
- Matchmaker version `b5b68d91-7eb3-4aa6-a6c6-c72cb48442b9` contains source
  `f734491`. Entering `DISPATCHING` now atomically persists a 30-second Durable
  Object watchdog alarm; legacy in-flight proposals without a deadline are also
  recovered by the next alarm. A successful service response is persisted as
  an `ALLOCATED` handoff before browser delivery, so a crash can resend the
  existing match address but can never requeue players or create a competing
  match. Late declines and socket disconnects only cancel `FOUND` proposals,
  not accepted/in-flight allocations. The rollout passed 46 matcher unit and
  31 matcher Worker tests, matcher and preserved-webapp TypeScript checks, the
  release gate, and the Go director match-handler suite. Live matcher/game
  protocol-v3 health, API `Ping`, and authoritative mode status passed with
  Conquest disabled; a read-only production aggregate remained one active and
  nine ended matches with no creating/failed rows and reported
  `changed_db: false`.
- Match service version `ed5d2d3c-6618-4e71-88bc-7930c3a647c7` contains source
  `1a86cfb`. Final accepted dispatch now independently preserves the source
  version matcher: both participants must supply the same nonempty normalized
  client release before any D1 allocation or account/game work. This prevents a
  bypassed matcher from silently choosing player one's release for a mixed-
  client match. The rollout passed all 24 match-service Worker tests,
  TypeScript checking, the Go match-validator suite, and the Conquest gate.
  Live matcher/game health, API `Ping`, and authoritative mode status passed
  with Conquest disabled; a read-only production aggregate remained one active
  and nine ended matches with no creating/failed rows and reported
  `changed_db: false`.
- Match service version `51087d54-7b34-4696-91dc-cd33d77f6f71` contains source
  `2a51215`. Final accepted dispatch now independently preserves the source's
  global session validator for all modes and the challenge criterion's nonempty
  code requirement before any D1 allocation. Each participant's request was
  already checked against its own normalized player snapshot; the added cross-
  participant check prevents a bypassed matcher from pairing different
  challenge/session cohorts. Client IP compatibility intentionally stays in the
  authenticated matcher and is not copied into the internal dispatch payload.
  The rollout passed all 25 match-service Worker tests, TypeScript checking, the
  Go session/challenge-validator suites, and the Conquest gate. Live matcher/
  game health, API `Ping`, and authoritative mode status passed with Conquest
  disabled; a read-only production aggregate remained one active and nine
  ended matches with no creating/failed rows and reported `changed_db: false`.
- Matchmaker version `063eeb90-21e3-48e5-b877-57fea7ad57ef` and match service
  version `d4245da4-c8f2-4c1c-bea9-3496ea5de292` contain source `309861e`.
  Practice Bot, Warm Up, and optional ranked replacement bots now copy the
  human player's client release and original queue timestamp exactly like the
  Go `player/bot.Factory.CreateUnregistered` contract. The final match-service
  boundary permits bot placeholders for Practice Bot and Warm Up, requires the
  bot and human modes to match, rejects challenge/Conquest bots, and keeps
  ranked/PvP bots behind the explicit `ENABLE_RANKED_BOTS=false` production
  switch shared with the matcher. The rollout passed 47 matcher unit, 31
  matcher Worker, and 26 match-service Worker tests, both TypeScript checks,
  release parity, the Conquest production gate, and the Go director handler
  suite. Live matcher/game health, API `Ping`, authoritative mode status, and
  practice client HTML passed with Conquest disabled. A read-only production
  aggregate remained one active and nine ended matches with no creating/failed
  rows; D1 remained at 46 migrations and reported `changed_db: false`.
- Game Worker version `b6fe6455-7d2c-4a24-b84c-c296c092c006` contains source
  `a3a5358`. Each match now persists the source's separate three-minute
  asset-loading expiry from its original creation time. If exactly one player
  finishes loading, commit/reveal is advanced through the source
  `tryDispatch` sequence and the no-show is abandoned; if neither loads, the
  match ends without progression, rewards, or an abandon penalty. Loading
  completion is monotonic, overdue deadlines schedule immediately, and older
  Durable Objects backfill the deadline without receiving a new grace period.
  The rollout passed all 24 game unit and 52 game Worker tests, TypeScript
  checking, and an 8.9 MB Wrangler dry-run bundle. Live game health, API
  `Ping`, and authoritative mode status passed with Conquest disabled. A
  read-only production aggregate remained one active and nine ended matches;
  the pre-existing active row was unchanged and the queries reported
  `changed_db: false`.
- Game Worker version `380ef699-ecc0-4297-8167-86d65eaf00a9` contains source
  `2eafebb`. Authenticated sockets may still perform the source time-sync
  handshake before `join_server`, but pre-join loading-progress messages are
  now silently ignored exactly like the original `MatchManager` with no linked
  match context. They cannot mutate durable load state, satisfy the new
  no-show timer, or manufacture an abandonment winner without first completing
  the join/subkey path. The rollout passed all 24 game unit and 53 game Worker
  tests plus TypeScript checking. Live game health and authoritative mode
  status passed with Conquest disabled; the read-only production aggregate
  remained one active and nine ended matches and reported `changed_db: false`.
- Game Worker version `9c00e461-5632-4924-8c2e-60fc949abc4f` contains source
  `a652b95`. The internal `abandon_match` event is no longer accepted as a
  browser WebSocket command: the original outer server generated it only after
  its disconnect timeout, while voluntary concessions travel through signed
  gameplay diffs. Cloudflare now preserves that boundary, and the completion
  integration exercises disconnect, durable abandon deadline, authoritative
  game-over, rewards, and penalty recording instead of a client-forged event.
  The rollout passed all 24 game unit and 53 game Worker tests plus TypeScript
  checking. Live game health and API `Ping` passed; a read-only production
  aggregate remained one active and nine ended matches and reported
  `changed_db: false`.
- Game Worker version `2c9040ad-52f7-472f-9fc6-2e74db06f7e8` contains source
  `ef953d3`. Completed matches now preserve the source recent-match reconnect:
  after Durable Object eviction a participant can join the ended match and
  receives its final private authoritative store, finished-game timer state,
  replay ID, pinned release, and the exact per-player reward list persisted in
  D1. Live completion and persisted recovery share one reward array, preventing
  drift as reward sources evolve; matches that expired before either player
  loaded remain non-reconnectable. The rollout passed all 24 game unit and 53
  game Worker tests plus TypeScript checking. Live game health and authoritative
  mode status passed with Conquest disabled; a read-only production aggregate
  remained one active and nine ended matches and reported `changed_db: false`.
- Game Worker version `02134a49-7560-4a10-85e3-08b0217ad5f4` contains source
  `308a948`. Client emotes now enforce the source tagged union with exactly one
  of hero emote, enabled chat, or sticker; mixed payloads cannot smuggle a
  second variant through server sanitization. A player sticker is also checked
  against the immutable equipped-sticker list loaded into the accepted match,
  matching the original outer server's ownership check before relay or replay
  archival. The rollout passed all 25 game unit and 54 game Worker tests plus
  TypeScript checking. Live game health passed; a read-only production
  aggregate remained one active and nine ended matches and reported
  `changed_db: false`.
- API/web version `d7fe1517-3ce2-476f-a655-380ffcdd0c3c` and game version
  `06aace30-7c3e-4a68-a5dc-4d20978e19d4` contain source `56c606d`.
  Match-info now preserves the source's 24-hour `recent_match_info` refresh
  path: D1 selects only the participant's newest allocation, while the game
  Durable Object returns that participant's final private store and persisted
  rewards directly. Active-match lookup remains available for spectators, but
  recent private state is participant-only; no-load results, expired results,
  and old results superseded by a newer match attempt fail closed. Migration
  `0047` adds both participant lookup indexes. The rollout passed all 148 API,
  25 game-unit, and 54 game-Worker tests, both TypeScript checks, and both
  Wrangler dry-run bundles. Live game health and app HTML returned `200`, the
  unauthenticated match-info boundary returned `401`, migration/index checks
  passed, and a read-only production aggregate remained one active and nine
  ended matches with `changed_db: false`.
- Game Worker version `cbbb929a-2724-4a9b-bf62-a5b9fde17bf8` contains source
  `72eece1`. Loading progress remains monotonic and continues to relay source UI
  messages, but only the player's first incomplete-to-finished transition may
  enter authoritative match-state and timer logic. Repeated completion packets
  can no longer reset a turn or commit/reveal deadline, and fractional progress
  cannot refresh the original loading grace alarm. The rollout passed all 25
  unit and 56 game-Worker tests, TypeScript checking, and the 8.9 MB Wrangler
  dry-run bundle. Live game health passed; a read-only production aggregate
  remained one active and nine ended matches and reported `changed_db: false`.
- Game Worker version `3847ce54-550f-4b7d-8c47-552af1833485` contains source
  `1e31b4f`. A second authenticated WebSocket no longer displaces the joined
  player during upgrade; ownership transfers only after the replacement
  successfully completes its role bootstrap. Closing an unjoined replacement
  leaves the original socket and player state intact, while a completed handoff
  closes the old socket only after the new durable attachment is joined, so its
  close callback cannot create an abandon deadline. The rollout passed all 25
  unit and 57 game-Worker tests, TypeScript checking, and the 8.9 MB Wrangler
  dry-run bundle. Live game health passed; a read-only production aggregate
  remained one active and nine ended matches and reported `changed_db: false`.
- Game Worker version `00abd8fe-a501-4228-a579-edc9798c76a4` contains source
  `1d14982`. Disconnect now preserves any existing player-owned commit/reveal
  or active-turn deadline exactly while installing the independent, later
  abandon deadline and keeping the Durable Object alarm on the earliest event.
  Only the source owner-pending reveal case dispatches immediately and enters
  normal state-transition timer calculation. This prevents disconnect from
  shortening or extending a reveal/turn window without an authoritative
  action. The rollout passed all 25 unit and 58 game-Worker tests, TypeScript
  checking, and the 8.9 MB Wrangler dry-run bundle. Live game health passed; a
  read-only production aggregate remained one active and nine ended matches and
  reported `changed_db: false`.
- Game Worker version `930ff389-a51b-4002-a340-92a94a78e726` contains source
  `f5775cc`. Disconnect suppression now requires another open, successfully
  joined player socket for that principal. A half-open replacement waiting for
  `join_server` cannot keep the real player's durable state connected after the
  joined socket closes, suppress the opponent disconnect notice, or prevent the
  abandon deadline. The completed-handoff path remains atomic and deadline-
  free. The rollout passed all 25 unit and 59 game-Worker tests, TypeScript
  checking, and the 8.9 MB Wrangler dry-run bundle. Live game health passed; a
  read-only production aggregate remained one active and nine ended matches and
  reported `changed_db: false`.
- Game Worker version `1972e669-c857-4981-b185-2ed849d01254` contains source
  `0438095`. A completion retry after an already-durable Conquest settlement
  now recovers the immutable receipt even though the run is `COMPLETED`, so the
  final match result and player reward message retain the exact Silver/Gold
  payload without redrawing, regranting inventory, duplicating feed events, or
  enqueueing another delayed Gold delivery. The rollout passed all 25 unit and
  59 game-Worker tests, both affected TypeScript checks, the 148-test API
  regression suite, release/RPC/card and Conquest gates, and the 8.9 MB Wrangler
  dry-run bundle. Live protocol-v3 health and deployed version metadata passed;
  a read-only production aggregate remained one active and nine ended matches
  with no creating/failed rows, zero active Conquest pools, settlements, or
  Gold deliveries, and `changed_db: false`.
- API/web Worker version `05ef2754-c0d9-4c4f-ab67-de25457e36c7` and game Worker
  version `199f6e0c-ab1b-4e48-8c3e-cb9ca34d8c95` contain source `ea989a4`.
  Conquest status/stat reads, authoritative match progression, and settlement
  now share one decoder matching the source JSONB-to-`map[uint64]` contract:
  nil maps, uint64 key canonicalization, and unknown enum normalization are
  preserved, while invalid JSON, non-object shapes, nonnumeric/out-of-range
  keys, and invalid value types fail closed. Progression rejects before either
  player or the per-match receipt changes; settlement rejects before inventory,
  feed, delivery, receipt, or status changes. The rollout passed all 25 unit,
  67 game-Worker, and 149 API tests, both affected TypeScript checks, all
  compatibility/safety gates, and both Wrangler bundles. Live app HTML, API
  `Ping`, game protocol-v3 health, and both version records passed. A read-only
  production scan found zero Conquest runs or malformed progress rows and
  retained one active and nine ended matches, no creating/failed rows, no
  active Conquest pool/reward rows, and `changed_db: false`.
- Migration `0048_conquest_progress_json_guard.sql` contains source `ef15cfb`
  and restores PostgreSQL JSONB's first write boundary for D1's TEXT-backed
  Conquest progress: syntactically invalid JSON is rejected on insert/update,
  while the deployed shared decoder continues to enforce the source typed-map
  shape. The full gate passed with 31 unit, 67 game-Worker, and 149 API tests,
  both affected TypeScript checks, all compatibility/safety gates, and both
  Wrangler bundles. Production applied exactly one `0048` row and exposes both
  guard triggers. A read-only scan found zero Conquest runs, invalid/non-object
  progress, active pools, settlements, or Gold deliveries; the match aggregate
  remained one active and nine ended with no creating/failed rows and
  `changed_db: false`. Live API and game protocol-v3 health passed after the
  migration.
- API/web Worker version `a8eacf61-d2b5-4825-bf2b-3b7ed8b48dbe` and game
  Worker version `03392572-84e0-47cf-9f55-08dff28fbb41` contain source
  `dab4ba6`. The source anonymous public-spectator path is restored without
  weakening player authentication: public match-info returns only active
  matches, the gateway replaces all browser identity headers with an ephemeral
  `anonymous-*` identity, and the game Durable Object refuses that identity if
  its principal collides with a participant. Anonymous viewers cannot enter the
  matchmaker, recover a participant's private ended-match payload, join as a
  player, or use account-owned stickers. The rollout passed all 150 API, 31
  game-unit, and 69 game-Worker tests, both TypeScript checks, every
  release/RPC/card/Conquest safety gate, and the 1.2 MB/8.9 MB Wrangler dry-run
  bundles. Live app HTML, API `Ping`/version/mode status, game protocol-v3
  health, anonymous active-match lookup, and a real anonymous spectator
  WebSocket reconnect/list handshake passed; direct game-service upgrade was
  rejected with `401`. A read-only production aggregate remained one active
  and nine ended matches, zero active Conquest pools/runs/settlements/Gold
  deliveries, and `changed_db: false`.
- API/web Worker version `85179357-10e9-44c1-b996-601de266a448` contains source
  `aa53dc7`. Ranked-constructed and ranked-discovery leaderboard entries now
  project the exact source rewards: ranks 1-100 use the original
  `floor(1.7^(120/(rank+26)))` Silver curve, ranks 1-100 show two Conquest
  tickets, ranks 101-250 show one, and no rewards appear after rank 500. The
  helper matches the source totals of 250 Silver cards and 350 tickets per
  leaderboard. It performs no grants and does not expose a countdown; the
  weekly distribution worker, idempotent delivery, and explicit Cloud Weasel
  schedule remain separate rollout gates. The rollout passed all 153 API tests,
  TypeScript checking, release/RPC/card/Conquest safety gates, the production
  asset build, and the 1.2 MB Wrangler dry-run bundle. Live Worker metadata
  reported the deployed version, app HTML returned `200`, and a public,
  no-store production query returned rank 1 with 10 Silver and two tickets.
- API/web Worker version `b0223357-9751-423e-9b19-3a4dbac023f8` contains source
  `6cb51bf`. Migration `0049_leaderboard_reward_worker.sql` adds immutable,
  versioned schedule and cycle records, top-500 ranked-mode snapshots,
  deterministic source-compatible Silver draws, identity-inventory ticket and
  card grants, feed/notification receipts, bounded batches, retry recovery,
  concurrency serialization, and five-attempt dead-letter handling. The
  migration intentionally inserts no schedule: after multiple production cron
  ticks, schedules, cycles, entries, awards, feed events, and linked
  notifications all remained zero and the verification reported
  `changed_db: false`; migration `0049` existed exactly once. The rollout passed
  all 163 API tests, TypeScript checking, the 131/172 RPC guard, all 856-card
  generation checks, release and Conquest gates, the production asset build,
  and the 1.2 MB Wrangler dry-run bundle. Live Worker metadata, API `Ping`, app
  HTML, and rank-one 10-Silver/two-ticket projection passed. Rank reset behavior,
  `GetNextRewardsTime`, and production schedule activation remain explicit
  rollout gates.
- API/web Worker version `181c3d6f-adb9-4770-89d6-215167e1ec74` contains source
  `82be98f`. Migration `0050_leaderboard_rank_resets.sql` adds the four nullable
  source weekly score snapshots, immutable per-cycle reset receipts, and
  fail-closed four-number rank-state guards. Completed week-one-through-three
  deliveries now preserve the source score snapshot, Apprentice III/Master/
  Grandweaver floors, 75-point RD inflation capped at 350, and top-100
  Grandweaver recalculation. Week four carries the source rank-specific floors
  and Glicko rating transform into the next season, replaces the prior season's
  score with its source integer mean of nonzero weekly scores, excludes banned
  statuses, and recalculates Grandweavers in both seasons. Reset mutations and
  their receipt commit atomically; failure injection, retry, and concurrent-cron
  tests prove rewards are not granted twice and RD is not inflated twice. The
  rollout passed all 168 API tests, TypeScript checking, the 131/172 RPC guard,
  all 856-card checks, release and Conquest gates, the production asset build,
  and a 1.25 MiB Wrangler dry-run bundle. Live version metadata, API `Ping`, app
  HTML, and the rank-one 10-Silver/two-ticket projection passed. Production
  migration `0050` existed once with all four week columns; after a scheduled
  tick, schedules, cycles, entries, awards, feed events, linked notifications,
  and reset receipts all remained zero with `changed_db: false`. The schedule
  and `GetNextRewardsTime` remain explicit product rollout gates.
- API/web Worker version `77fe71c2-59f2-4835-98aa-e08888707101` contains source
  `c9f358c`. Authenticated Google identities can again load the exact source
  payment-provider matrix for Google Play, Apple App Store, Stripe, Sequence,
  and Samsung, including item types, product codes, and code-derived quantities.
  The preserved browser can therefore discover Stripe's `skypass_0001` without
  treating wallet state as authentication. This milestone is read-only:
  `CreateStripePaymentIntent`, webhook verification, idempotent fulfillment,
  and all on-chain/mobile purchase paths remain unported and fail closed. The
  rollout passed all 171 API tests, TypeScript checking, the improved 132/172
  RPC guard, all card/release/Conquest gates, and a 1.25 MiB Wrangler dry-run
  bundle. Live version metadata, API `Ping`, and app HTML passed; the catalog
  returned `401` without a session as required. A read-only D1 regression check
  kept the leaderboard schedule, cycle, and reset counts at zero with migration
  `0050` present once and `changed_db: false`.
- API/web Worker version `c3762cbe-b048-47d2-a54a-34ea4d73fa8d` contains source
  `5902915`. Migration `0051_stripe_checkout.sql` adds guarded payment attempts
  and immutable webhook-event receipts without inserting configuration or
  payment data. Authenticated Google identities can create source-shaped Stripe
  Checkout Sessions only when the optional secrets, redirect URLs, and selected
  Price ID are provisioned. Stripe idempotency keys survive indeterminate
  responses; raw-body signatures, an authenticated Stripe event lookup, local
  identity/product metadata, payment status, and amount shape are all checked
  before SkyPass or Conquest-ticket inventory is granted atomically with its
  receipt. Duplicate/concurrent delivery, fulfillment rollback and retry,
  delayed payment methods, and out-of-order paid-after-failure events are
  covered. The rollout passed all 185 API tests, Cloudflare TypeScript checking,
  the 134/172 RPC guard, card/release/Conquest gates, and the production asset
  build. Live app HTML and API `Ping` passed; anonymous checkout returned `401`
  and the unsigned webhook failed closed because Stripe is unconfigured.
  Production retained zero Stripe payments/events with all four update/delete
  guards present and a read-only post-probe check reported `changed_db: false`.
- API/web Worker version `8f3fcdf3-db34-44bb-b41f-5595e22c72f9` contains source
  `6dc5e12`. Migration `0052_stripe_staff_reads.sql` ports the source
  `GMListPayments` and `GMListPaymentLogs` read contracts behind the existing
  deny-by-default `ADMIN` role. D1 assigns each opaque Stripe payment UUID a
  stable immutable numeric compatibility ID and records source-shaped intent,
  Checkout Session, and retrieved-event logs without making that ID a
  fulfillment authority. Status/provider/identity filters, descending creation
  order, bounded cursor pages, and per-payment reverse-chronological logs are
  preserved. The rollout passed all 187 API tests, Cloudflare TypeScript
  checking, the 136/172 RPC guard, all card/release/Conquest gates, and the
  production asset build. Live app HTML and API `Ping` passed; both staff RPCs
  returned `401` anonymously. Production retained zero payments, events,
  numeric staff IDs, or logs with all five creation/immutability guards present
  and the verification reported `changed_db: false`.
- API/web Worker version `8eae3f01-d69f-4e5f-a7b3-1adbe4f06d12` contains source
  `284f1da`. Migration `0053_optional_wallet_links.sql` adds optional,
  Google-identity-scoped EVM wallet ownership proofs without enabling wallet
  login. The Worker constructs and persists the exact origin-bound ERC-4361
  message, verifies ERC-191 EOA signatures, atomically consumes each ten-minute
  challenge once, refuses cross-account transfers, and unlinks wallet and
  pending-proof data during account deletion. D1 independently prevents
  challenge tampering and verified-address reassignment; the scheduler removes
  proof records one day after expiry. The rollout passed all 197 API tests,
  Cloudflare TypeScript checking, release gates, the production asset build,
  and a 1.55 MiB/220 KiB-gzip Wrangler bundle. Live anonymous and cross-origin
  challenge probes returned `401` and `403`; Google provider discovery and app
  HTML returned `200`. Production has zero challenges or links, migration
  `0053` exists once with both guards, and the read-only post-probe check
  reported `changed_db: false`. The browser WalletConnect adapter is not exposed
  until its public project ID is provisioned; ERC-1271 contract wallets remain
  fail-closed until an approved chain RPC is configured.
- API/web Worker version `9dd1c47d-845e-46ae-9d4d-26d4bdfa331f` contains source
  `f19fd20` plus fail-closed rollout commit `b1597c6`. The source
  `RecordGameClientFeedback` contract is ported from AWS S3 to a private R2
  binding with identity-scoped random object keys, 512-KiB JSON and 5-MiB JPEG
  caps, signature-byte JPEG validation, cleanup on partial writes, and private
  feedback deletion during account anonymization. Migration
  `0054_client_feedback_limits.sql` adds a guarded, optimistic ten-upload/hour
  identity limiter; simultaneous tests admit exactly ten and delete rejected
  objects. The rollout passed all 206 API tests, Cloudflare TypeScript checking,
  the 137/172 RPC guard, release gates, the production build, and a
  1.55-MiB/221-KiB-gzip Wrangler bundle. Cloudflare returned `10042` because R2
  is not enabled for this account, so no bucket was created and no R2 binding
  was deployed. The live RPC still requires authentication and then fails with
  explicit `503` rather than discarding feedback. Anonymous RPC access returned
  `401`; Google provider discovery and app HTML returned `200`. Production has
  zero limiter rows, migration `0054` exists once with its transition guard,
  and the post-probe D1 check reported `changed_db: false`.
- API/web Worker version `704c4049-e6fe-44b7-8824-28f7bec9aeef` contains source
  `3113d17`. Migration `0055_conquest_v2_economy_preview.sql` ports
  `GMSetConquestV2PoolConfig`, `GMGetConquestV2PoolConfig`, and
  `GMGetConquestV2Summary` to D1 while preserving the Go source's partial
  updates, negative-value ignore behavior, zero-to-default composition,
  float32 treasure weights, ten-unit pool rounding, maximum ceiling, and
  ten-band event-2 summary. Admin reads remain role-gated; writes also require
  a separately dormant `CONQUEST_CONFIG_WRITE` capability and use optimistic
  concurrency plus immutable audit rows. The legacy USDC public pool and
  treasure responses deliberately remain at zero until Cloud Weasel has an
  approved settlement product contract. The rollout passed all 213 API tests,
  Cloudflare TypeScript checking, the 140/172 RPC guard, the production build,
  and a 1.56-MiB/224-KiB-gzip Wrangler dry run. Live app and version routes
  returned `200`, all three new anonymous probes returned `401`, and the
  public pool remained zero. Production has zero capability grants, audits, or
  cache rows; the empty settings singleton remains at version zero, migration
  `0055` exists once with all four transition/immutability guards, and every
  post-probe D1 read reported `changed_db: false`.
- API/web Worker version `aefc18ec-ee27-4b49-8149-c57f95d23632` contains source
  `bd1a236`. Migration `0056_app_developer_keys.sql` ports all five source App
  Developer Key management RPCs while adding a dormant `APP_DEV_KEY_WRITE`
  capability, source-format `SW01` secrets, partial unique indexes for enabled
  names/emails, optimistic state transitions, and immutable secret-free
  create/enable/disable/token-reveal audits. Generated JWTs preserve the
  source's full AppDevKey claim and one-year expiry, but deliberately remain
  non-authorizing until a separate partner-method scope is reviewed. The
  rollout passed all 220 API tests, Cloudflare TypeScript checking, the 145/172
  RPC guard, production build, and a 1.58-MiB/226-KiB-gzip Wrangler dry run.
  Live app/version routes returned `200` and all five anonymous management
  probes returned `401`. Production has zero keys, grants, or audits; migration
  `0056` exists once with two enabled-uniqueness indexes and all four guards,
  and every post-probe D1 read reported `changed_db: false`.
- API/web Worker version `7f6d027b-fe52-43c6-8607-4f789ed25912` contains source
  `051e83a` plus policy milestone `03fd8ca`. Migration
  `0057_skypass_reward_updates.sql` ports the final source admin RPC,
  `GMUpdateSkypassRewards`, with the source eight-column CSV shape, reward
  identity/ID reuse, last-row infinity, item validation, and off-chain content
  IDs. Cloud Weasel additionally requires `ADMIN`, the separately dormant
  `SKYPASS_REWARD_WRITE` capability, and an explicit HTTPS-origin allowlist;
  fetches are bounded and redirects are revalidated. Whole-season replacement
  uses optimistic concurrency and immutable before/after audits, while seven D1
  guards freeze an entire season after its first claim. The rollout passed all
  228 API tests, Cloudflare TypeScript checking, the revised 146 direct / 15
  superseded / 2 retired RPC audit, release and card gates, the 472-file
  browser/game production build, and a 1.60-MiB/231-KiB-gzip Wrangler dry run.
  Live app/version and canonical Google session discovery returned `200`,
  Google OAuth start returned a PKCE `302`, and the new anonymous RPC returned
  `401`. Production has zero staff roles, reward-write grants, update versions,
  or audits; its 127 reward definitions were unchanged, migration `0057` exists
  once with all seven guards, and the post-probe D1 read reported
  `changed_db: false`. No reward CSV origin is configured, so the mutation
  remains doubly fail-closed even if a capability were granted accidentally.
- API/web Worker version `e5660e23-6306-49c9-996e-3cbdfa1b9b43` contains source
  `08bcd4d`. Migration `0058_referral_sticker_rewards.sql` replaces the source
  referral contract mint with canonical identity inventory while preserving
  threshold spending, top-five friend attribution, season carry-forward, the
  source 23-hour delay, and 100 units per earned sticker. Immutable batch/award
  rows and D1 transaction batches make duplicate, concurrent, failed, and
  retried delivery safe; sanctioned accounts pause before preparation or
  delivery. The strengthened release gate now scans every active reward
  producer for both canonical inventory writes and an idempotent receipt key.
  The rollout passed all 236 API tests, Cloudflare TypeScript checking, release
  gates, and the 472-file browser/game production build. Homepage, Google auth
  discovery, and `GetStickers` returned `200`. After a live scheduled tick,
  production still had zero sticker definitions, zero referral batches, zero
  referral awards, and 31 existing inventory rows; migration `0058` existed
  once with all four guards, and the read-only verification reported
  `changed_db: false`.
- API/web Worker version `15c51a4b-c27d-49cf-91c4-6f31760b8088` contains source
  `30ca55a`. Migration `0059_skypass_offchain_delivery.sql` completes the
  source SkyPass reward applier for Conquest tickets, stickers, sticker points,
  Silver cards, card backs, and titles, alongside the already-ported base cards
  and heroes. Source earning, amounts, content IDs, response payloads, and feed
  evidence remain compatible, but the three original mint-queue families now
  write identity-owned D1 inventory. A unique per-request delivery key makes
  every inventory statement conditional on the winning immutable claim receipt,
  so duplicate, retried, and simultaneous requests grant each reward once. The
  rollout passed all 238 API tests, the focused 33-test player RPC suite,
  Cloudflare TypeScript checking, release and off-chain gates, and production
  deployment. Live homepage, canonical Google provider discovery, and `Ping`
  returned `200`; the staff SkyPass definition RPC returned `401` anonymously.
  Production had zero existing claims before migration and retained zero claims
  and 31 inventory rows after the read-only probes. Migration `0059`, its unique
  delivery-key index, column, and two receipt guards each exist once, and the
  final D1 verification reported `changed_db: false`.
- API/web Worker version `9c7ba2fc-85eb-4f0a-8036-22fc7b7cb730` contains source
  `c88a7a2` plus D1 parser compatibility commit `6fa9d05`. Migration
  `0060_silver_ticket_exchange.sql` restores the original Silver-card selection,
  quantity, warning, and confirmation screens to Google identities while
  replacing the Sequence transfer with an atomic off-chain exchange at the
  source price of one Silver card per Conquest ticket. A browser request key and
  independent delivery key make identical retries idempotent; D1 JSON quantity
  and live inventory guards serialize competing requests before any debit, and
  every debit and ticket credit is conditional on the winning immutable receipt.
  The rollout passed all 240 API tests, the focused six-test player API suite,
  both Worker and webapp TypeScript checks, touched-file lint, release/off-chain
  gates, and the 498-file production browser/game build. The first remote D1
  attempt rejected a trigger `CASE` expression as incomplete and made no schema
  changes; the equivalent split-trigger form was retested, committed separately,
  and applied as seven commands. Live homepage, `/select-silvers/cards`, and
  Google provider discovery returned `200`; the exchange endpoint returned
  `401` anonymously. Production retains zero exchange receipts and 31 inventory
  rows, migration `0060` exists once with all four guards, and the final D1 read
  reported `changed_db: false`.
- API/web Worker version `31db4f6c-4515-43a0-8799-8556aaed3037` contains source
  `bc9adc7` and restores the original Pending Gold route for Google identities.
  Delayed Conquest Gold was already delivered to off-chain D1 inventory; this
  milestone exposes the preserved pending-card screen and changes only its
  Google-mode player copy from minting to delivery while retaining legacy copy
  for legacy authentication builds. The off-chain release gate now rejects a
  regression to player-facing mint language, while source transaction-queue
  audit milestone `aaf9308` inventories all 13 legacy queues and requires every
  active producer to retain off-chain evidence or an explicit dormant gate.
  Six off-chain gate tests, two queue-audit tests, touched-file lint, webapp
  TypeScript checking, and the complete 498-file browser/game build passed.
  Live `/pending-golds` and Google provider discovery returned `200`, while
  anonymous `GetPendingCards` returned `401`. The release needed no migration;
  production remained at zero Gold deliveries, zero Silver exchanges, and 31
  inventory rows after read-only verification.
- API/web Worker version `c2680362-fb9e-4c87-ba41-b9a7d0fa4437` contains
  hardening milestone `33d572f`. Google Silver exchanges now skip the legacy
  Sequence payment-product request entirely, and the release gate proves that
  the identity-native exchange completes and returns before the preserved
  legacy-wallet branch. Seven off-chain gate tests, touched-file lint, webapp
  TypeScript checking, and the complete 498-file browser/game build passed.
  Live `/select-silvers/cards`, `/pending-golds`, and Google provider discovery
  returned `200`; the exchange endpoint remained authenticated and returned
  `401` anonymously. No schema or reward-economy change was required.
- API/web Worker version `9578a7ac-3011-4b79-a191-476489fe410b` contains source
  `4fb1e1c`. Migration `0061_social_info_cache.sql` ports the source one-minute
  public-response cache to D1. `GetDiscordInfo` now reads a configurable Cloud
  Weasel widget URL, while `GetTwitchInfo` uses standard Twitch client
  credentials directly rather than the source's private Skyweaver token proxy;
  the original live-channel component consumes that RPC again. Production has
  none of the fork-owned identifiers or Twitch secret, so both methods return a
  deliberate `503` and the live-channel section remains hidden. The rollout
  passed all 244 Worker tests, four focused social tests, both Worker and webapp
  TypeScript checks, touched-file lint, all release gates, the 149-direct-RPC
  audit, and the complete 498-file browser/game build. Live `/play` and Google
  provider discovery returned `200`; both social RPCs returned `503` on the
  final retry. Migration `0061` exists once, its cache is empty, 31 inventory
  rows were unchanged, and the read-only D1 check reported `changed_db: false`.
- API/web Worker version `9a52ceec-cfeb-48b0-b0ce-272685d72de4` contains
  fulfillment milestone `8346b14` and Samsung verifier milestone `db134d0`.
  Migration `0062_mobile_store_offchain_fulfillment.sql` adds a unique,
  immutable provider-transaction ledger whose winning receipt and inventory
  update share one D1 batch. Mobile tickets and premium SkyPass now have the
  same identity-owned fulfillment contract as Stripe, with receipt digests in
  place of raw provider tokens. The Samsung source RPC uses the current fixed
  HTTPS receipt API and additionally requires a matching Cloud Weasel package,
  production mode, successful status, payment ID, and item ID. Production has
  no Samsung package configured, so the integration remains fail-closed. Five
  fulfillment tests, five Samsung verification tests, all 254 Worker tests,
  TypeScript, the 150-direct-RPC audit, every off-chain/transaction gate, and
  the complete 498-file browser/game build passed. The final live anonymous
  RPC probe returned `401`; migration `0062` exists once with both guards,
  mobile payments remain zero, inventory remains 31 rows, and the D1 read
  reported `changed_db: false`.
- API/web Worker version `962960cf-3db7-4073-a133-c6c65d68f14f` contains
  Google Play milestone `1b141eb`. The source RPC now uses a dedicated Play
  service-account JSON key to sign an RS256 assertion in Workers WebCrypto,
  exchanges it only at Google's OAuth token endpoint, and reads the current
  Android Publisher product-purchase endpoint with encoded package/product/
  purchase-token parameters. It requires the configured Cloud Weasel package,
  matching order/product/token values, and Google's purchased state before the
  shared D1 ledger can grant inventory. Login OAuth credentials are not reused,
  and raw purchase tokens are not stored. Production has neither a Play package
  nor service-account secret, so the integration remains fail-closed. A real
  ephemeral RSA keypair exercised JWT claims and signature verification; all
  258 Worker tests, TypeScript, the 151-direct-RPC audit, release gates, and the
  complete browser/game build passed. Both live mobile-payment RPCs returned
  `401` anonymously, while mobile payments remained zero and inventory remained
  31 rows with `changed_db: false`.
- API/web Worker version `ef89b704-f0c7-4c1e-9d62-0c05313a3dad` contains
  retirement milestone `e713f20`. The two deprecated mobile RPCs now require a
  signed-in identity before returning an explicit `501` directing current
  clients to identity-scoped provider verification; they can no longer select
  reward ownership from a caller-provided wallet address. The obsolete public
  early-access RPC is an explicit `501` tombstone with no Mailchimp dependency.
  All 261 Worker tests, TypeScript, the 171-of-172 fulfilled/retired RPC audit,
  every off-chain/transaction gate, and the complete 498-file browser/game
  build passed. Live probes returned the expected `501`/`401` boundaries, while
  mobile payments remained zero, inventory remained 31 rows, and the D1 check
  reported zero writes and `changed_db: false`.
- API/web Worker version `21078126-9518-4fe8-8ff0-0e6767189f0d` contains Apple
  verification milestone `0442374`. It replaces the source's deprecated
  `verifyReceipt` dependency with the production App Store Server API, signs a
  five-minute ES256 authorization token in Workers WebCrypto, and verifies the
  returned signed transaction against its complete three-certificate chain,
  Apple transaction/intermediate OIDs, certificate validity and CA/key usages,
  and the three official source-pinned Apple root certificates. It then checks
  production environment, bundle, transaction, product, quantity, ownership,
  revocation, signed date, currency, and milliunit price before the shared D1
  ledger can grant off-chain inventory. Production has no Apple identifiers or
  private key, so the integration remains fail-closed. All 266 Worker tests,
  TypeScript, pinned-lock validation, the 172-of-172 fulfilled/retired RPC
  audit, every off-chain/transaction gate, the complete browser/game build, and
  a Wrangler bundle dry run passed. Live anonymous probes for Apple, Google,
  and Samsung all returned `401`; mobile payments remained zero, inventory
  remained 31 rows, and the read-only D1 check reported zero writes and
  `changed_db: false`.
- API/web Worker version `58127ee0-0c68-4dd2-9a67-f8dde44f9b0c` contains Hero
  exchange milestones `0fc801e` and `0895054`. Migration
  `0063_hero_skin_offchain_exchange.sql` adds immutable, idempotent exchange
  receipts and database-enforced inventory/price guards. Google-auth players
  use the original Hero carousel, review dialog, and Gold-card picker, while a
  same-origin authenticated API atomically debits exactly ten owned Gold cards
  and credits one identity-owned Hero skin without a wallet, USDC, on-chain
  transaction, or mint. The Worker suite passed all 268 tests; TypeScript, all
  reward and transaction gates, and the complete 472-file browser/game build
  passed. A signed-in production browser check exercised the carousel, review
  dialog, and picker without submitting an exchange and found no console
  errors. The anonymous endpoint probe returned `401`; migration `0063` exists
  once, Hero exchanges remained zero, inventory remained 31 rows, and both
  read-only D1 checks reported zero writes and `changed_db: false`.
- API/web Worker version `e0d19426-c3f3-4d59-9e23-58c54de6425a` contains
  off-chain reward-presentation milestone `a8b8d89`. Google-auth Conquest,
  SkyPass, referral, profile-card, and reward-feed surfaces now describe
  identity inventory, collectibles, claims, and delayed delivery rather than
  minting, tradability, or blockchain-wallet ownership. The original wording
  and visual badges remain conditional legacy-wallet behavior. The off-chain
  release gate now inventories those Google reward surfaces and rejects either
  a missing auth guard or legacy ownership language. Nine gate tests,
  touched-file lint, webapp TypeScript, every release/RPC/transaction audit,
  and the complete 472-file browser/game build passed. Signed-in production
  checks found no visible mint/tradable language or console errors on Conquest
  and SkyPass. The final D1 query reported 31 inventory rows, zero Hero
  exchanges, zero writes, and `changed_db: false`.
- API/web Worker version `ec76765a-2b9a-4bb2-8ba8-4ba83af1dde1` contains
  background-worker audit milestone `8aaac21` and SkyPass auto-claim milestone
  `d50c553`. The build now inventories all 23 active Go worker runners and
  fails on an unreviewed registration or missing TypeScript evidence: 11 are
  ported, three superseded, six retired, two dormant, one optional, and none
  remain actionable. Migration `0064_skypass_season_auto_claim.sql` adds
  immutable per-reward and per-player season receipts, a one-per-season in-app
  notification, five-attempt failure records, and a close-cycle guard. The
  minute scheduler processes at most ten players and five rewards per player
  per tick, resumes without duplicate inventory, honors free and entitled
  premium tracks, and starts at the source boundary plus ten seconds. All 272
  Worker tests passed, including concurrent execution and poisoned definitions;
  TypeScript, reward/transaction gates, and the complete 472-file browser/game
  build also passed. Production only has season 62 definitions, whose close is
  2026-08-24T14:00:10Z, so deployment created no cycle or claim. The final D1
  query reported one user, 31 inventory rows, zero SkyPass claims, auto-claims,
  failures, or notifications, migration 64, zero writes, and `changed_db:
false`; the production URL returned HTTP 200.
- API/web Worker version `2f8abff7-6c04-4ef3-b191-8d079d2db8fa` contains
  SkyPass exact-policy milestone `3fedd99`. Migration
  `0090_skypass_reward_policy_activation.sql` converts the preserved 127-row
  season-62 track into immutable version 1 and passes it through the same D1
  activation validator as every future import. CSV updates now create
  player-invisible drafts; a distinct `ADMIN` with the dormant
  `SKYPASS_REWARD_WRITE` permission must inspect and activate the exact source
  and fulfillment digests. Player reads, manual claims, and season auto-claim
  use only active definitions, and each new claim pins policy version 1 and
  fulfillment hash `f6238e5e2c07a7e803c3b4f5c54c44d9f275fd94c2af04988a58301a40618bcb`.
  The full release passed all policy/RPC/transaction audits, 326 main Worker
  tests, 216 multiplayer tests, analytics tests, TypeScript checks, and the
  browser/game production build. Live homepage, Version, Ping, and game-mode
  probes returned `200`; Cloud Weasel branding remained intact, Practice Bot
  stayed enabled, and both Conquest modes stayed disabled. Anonymous active
  SkyPass, draft-review, and activation probes returned `401`. Post-cron D1
  verification found all 127 active ordinals and one infinite reward, zero
  claims, drafts, failures, close cycles, or capability grants, and unchanged
  inventory at 31 rows / balance 31 with `changed_db: false`.
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
