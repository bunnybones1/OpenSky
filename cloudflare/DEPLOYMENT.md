# Cloud Weasel deployment

## Production

- URL: https://opensky-webapp.dysinski-tomasz.workers.dev
- API/web Worker: `opensky-webapp` (`ce8ba934-3858-4764-ae3c-bae473985c7d`)
- Matchmaker Worker: `cloud-weasel-matchmaker` (`2c6bae51-4c9a-41ab-b178-bd087afc5908`)
- Match service Worker: `cloud-weasel-match-service` (`8db250fe-2068-45b1-97b5-66636bae80bb`)
- Game Worker: `cloud-weasel-game-server` (`cb372ca3-de89-4135-a1d2-f3fc40a999ed`)
- Deployed source includes `6f00087` for web/API and game, plus the match-service
  inventory fix from `3c57de5`; matchmaker remains at `c9e2201`
- Deployed: 2026-08-11 PDT
- Applied D1 migrations: `0001` through `0028`
- Scheduled trigger: every minute for due Conquest Gold delivery

## Verified scope

- Google OpenID Connect login and identity-backed sessions
- Original OpenSky webapp shell, navigation, profile, and item views
- Cloud Weasel browser and social-preview metadata without replacing the UI
- Wallet-free starter collection and legacy read RPC compatibility
- Public trimmed, case-insensitive username account lookup with owner-only settings
- Source card search, including attached spells, token rows, ownership filters, and balances
- Source schema/version diagnostics backed by Worker Version Metadata
- Starter quest claims and the original quest progression chain
- Source epic-chain history, active assignment, and future-step previews
- Basic SkyPass card claims for the ported season data
- Legacy deck listing, creation, update, deletion, and deck-string encoding
- Private source deck search with exact/class/name filters and cursor pagination
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
and administrative RPCs remain pending. Conquest queues stay disabled until an
explicit production reward pool is approved and the enablement drill validates
settlement and delayed delivery against that pool.

## Latest verification

- API Worker: 17 files, 95 tests
- Match service: 9 Worker tests
- Game Worker: 24 unit and 36 Worker tests
- Matchmaker: 26 unit and 12 Worker tests
- API, match service, and game Worker type-checks; original webapp/game
  production build
- Card-library generator, source-RPC inventory, and production Conquest gates
- Live Worker version, original interface, Cloud Weasel metadata, mode status,
  matchmaker/game protocol-v3 health, authentication boundaries, and the
  source-compatible disabled-live-record response
- Remote D1 after migrations `0027`/`0028` and a scheduled tick: zero active
  reward pools, settlements, delayed Gold deliveries, or Conquest feed events;
  the read-only verification reported `changed_db: false`
- The full legacy monorepo typecheck still has unrelated baseline failures in
  old ES-target, sheet-editor, and chain-contract packages; the affected
  Cloudflare packages are clean.
