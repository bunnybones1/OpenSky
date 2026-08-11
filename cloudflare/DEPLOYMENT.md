# Cloud Weasel deployment

## Production

- URL: https://opensky-webapp.dysinski-tomasz.workers.dev
- API/web Worker: `opensky-webapp` (`ffd6f488-879c-4673-b547-cb3a1e1137ab`)
- Matchmaker Worker: `cloud-weasel-matchmaker` (`2c6bae51-4c9a-41ab-b178-bd087afc5908`)
- Match service Worker: `cloud-weasel-match-service` (`dc2b0617-e805-4564-b6b7-dd582021a114`)
- Game Worker: `cloud-weasel-game-server` (`dc82be9f-5cd1-48f5-bb46-ab346a1f1b7e`)
- Deployed component commits: web/API `f8d2eb8`; game `c7a7f00`; matchmaker
  `c9e2201`; match service `dbd4ea2`
- Deployed: 2026-08-11
- Applied D1 migrations: `0001` through `0026`

## Verified scope

- Google OpenID Connect login and identity-backed sessions
- Original OpenSky webapp shell, navigation, profile, and item views
- Wallet-free starter collection and legacy read RPC compatibility
- Public trimmed, case-insensitive username account lookup with owner-only settings
- Source card search, including attached spells, token rows, ownership filters, and balances
- Source schema/version diagnostics backed by Worker Version Metadata
- Starter quest claims and the original quest progression chain
- Basic SkyPass card claims for the ported season data
- Legacy deck listing, creation, update, deletion, and deck-string encoding
- Private source deck search with exact/class/name filters and cursor pagination
- Source deck ownership, class-unlock, and partial-deck validation checks
- Atomic, owner-scoped deck favorite toggling
- Identity-owned inventory, equipment, summaries, and Cloud Weasel supply reads
- Durable Conquest entry, status, statistics, points, and source treasure thresholds
- Retry-safe authoritative Conquest win/loss/draw and terminal-state progression
- Source Conquest treasure points from matches, owned deck cards, and hero skins
- Write-once identity referrals, top-five friend points, inviter gifts, and the
  original Invite Friends screens
- Profile reward/rank feed and competitive match history
- Local bot plus authoritative practice, ranked, challenge, and multiplayer paths
- Original Tutorial, Ranked, Practice PvP, and Conquest play screens for Google identities
- Durable matchmaking, acceptance/refusal cooldowns, active-match reconnects,
  opt-in source-compatible captcha/shadow-ban enforcement, and release-scoped
  game-abandon cooldown bridging
- Authoritative WASM matches with bots, timers, hibernation, quests, XP, ranks,
  match rewards, private/public spectators, and capability-protected replays

WalletConnect remains an optional future integration. Captcha is deployed but
remains disabled until Cloud Weasel hCaptcha credentials are provisioned.
Conquest card reward selection and settlement, seasonal invite-sticker
redemption, marketplace writes, legacy data migration, and administrative RPCs
remain pending. Conquest queues stay disabled until the remaining card rewards
are transactionally connected to authoritative completion.
