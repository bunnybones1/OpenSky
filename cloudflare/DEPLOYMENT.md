# Cloud Weasel deployment

## Production

- URL: https://opensky-webapp.dysinski-tomasz.workers.dev
- API/web Worker: `opensky-webapp` (`006c27fa-eed1-4728-84b9-d135d13ec45d`)
- Matchmaker Worker: `cloud-weasel-matchmaker` (`2c6bae51-4c9a-41ab-b178-bd087afc5908`)
- Match service Worker: `cloud-weasel-match-service` (`8db250fe-2068-45b1-97b5-66636bae80bb`)
- Game Worker: `cloud-weasel-game-server` (`45b699f8-f25b-4888-ba3b-2450adfc68d4`)
- Deployed source includes `109dd8d` for web/API and `b612af3` for game, plus the
  match-service inventory fix from `3c57de5`; matchmaker remains at `c9e2201`
- Deployed: 2026-08-11 PDT
- Applied D1 migrations: `0001` through `0034`
- Scheduled trigger: every minute for due Conquest Gold delivery

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
  eligibility filters; absent action/IP models return truthful empty histories
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
- Source-compatible `501` response for the intentionally disabled live-record read
- Local bot plus authoritative practice, ranked, challenge, and multiplayer paths
- Original Tutorial, Ranked, Practice PvP, and Conquest play screens for Google identities
- Durable matchmaking, acceptance/refusal cooldowns, active-match reconnects,
  opt-in source-compatible captcha/shadow-ban enforcement, and release-scoped
  game-abandon cooldown bridging
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

- API Worker: 21 files, 126 tests
- Match service: 9 Worker tests
- Game Worker: 24 unit and 44 Worker tests
- Matchmaker: 26 unit and 12 Worker tests
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
- Remote D1 after migrations `0027`/`0028` and a scheduled tick: zero active
  reward pools, settlements, delayed Gold deliveries, or Conquest feed events;
  the read-only verification reported `changed_db: false`
- The full legacy monorepo typecheck still has unrelated baseline failures in
  old ES-target, sheet-editor, and chain-contract packages; the affected
  Cloudflare packages are clean.
