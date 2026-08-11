# Cloud Weasel deployment

## Production

- URL: https://opensky-webapp.dysinski-tomasz.workers.dev
- API/web Worker: `opensky-webapp` (`d15079d2-8ba4-4123-bd18-c405ea7f3258`)
- Matchmaker Worker: `cloud-weasel-matchmaker` (`2c6bae51-4c9a-41ab-b178-bd087afc5908`)
- Match service Worker: `cloud-weasel-match-service` (`3c6e42be-d092-4fb7-a5dd-9b52e7467cce`)
- Game Worker: `cloud-weasel-game-server` (`4e1fb030-8e5c-4d08-9120-b1b10c33f4e3`)
- Deployed component commits: web/API `bd0b430`; multiplayer services `c9e2201`
- Deployed: 2026-08-11
- Applied D1 migrations: `0001` through `0022`

## Verified scope

- Google OpenID Connect login and identity-backed sessions
- Original OpenSky webapp shell, navigation, profile, and item views
- Wallet-free starter collection and legacy read RPC compatibility
- Starter quest claims and the original quest progression chain
- Basic SkyPass card claims for the ported season data
- Legacy deck listing, creation, update, deletion, and deck-string encoding
- Identity-owned inventory, equipment, summaries, and Cloud Weasel supply reads
- Profile reward/rank feed and competitive match history
- Local bot plus authoritative practice, ranked, challenge, and multiplayer paths
- Durable matchmaking, acceptance/refusal cooldowns, active-match reconnects,
  opt-in source-compatible captcha/shadow-ban enforcement, and release-scoped
  game-abandon cooldown bridging
- Authoritative WASM matches with bots, timers, hibernation, quests, XP, ranks,
  match rewards, private/public spectators, and capability-protected replays

WalletConnect remains an optional future integration. Captcha is deployed but
remains disabled until Cloud Weasel hCaptcha credentials are provisioned.
Conquest, social/invite APIs, marketplace writes, legacy data migration, and
administrative RPCs remain pending.
