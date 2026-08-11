# Cloud Weasel deployment

## Production

- URL: https://opensky-webapp.dysinski-tomasz.workers.dev
- API/web Worker: `opensky-webapp` (`f3663c8b-76a9-45cc-84ae-1ffd08dd4c40`)
- Matchmaker Worker: `cloud-weasel-matchmaker` (`2c6bae51-4c9a-41ab-b178-bd087afc5908`)
- Match service Worker: `cloud-weasel-match-service` (`3c6e42be-d092-4fb7-a5dd-9b52e7467cce`)
- Game Worker: `cloud-weasel-game-server` (`e534216e-7183-4c30-8fd3-e007e883dcd7`)
- Deployed component commits: web/API `216f30d`; game `04772bf`; matchmaker and
  match service `c9e2201`
- Deployed: 2026-08-11
- Applied D1 migrations: `0001` through `0024`

## Verified scope

- Google OpenID Connect login and identity-backed sessions
- Original OpenSky webapp shell, navigation, profile, and item views
- Wallet-free starter collection and legacy read RPC compatibility
- Starter quest claims and the original quest progression chain
- Basic SkyPass card claims for the ported season data
- Legacy deck listing, creation, update, deletion, and deck-string encoding
- Identity-owned inventory, equipment, summaries, and Cloud Weasel supply reads
- Durable Conquest entry, status, statistics, points, and source treasure thresholds
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
Conquest match-end progression and reward settlement, seasonal invite-sticker
redemption, marketplace writes, legacy data migration, and administrative RPCs
remain pending. Conquest queues stay disabled until progression and rewards are
transactionally connected to authoritative match completion.
