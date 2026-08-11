# Cloud Weasel deployment

## Production

- URL: https://opensky-webapp.dysinski-tomasz.workers.dev
- API/web Worker: `opensky-webapp` (`d15079d2-8ba4-4123-bd18-c405ea7f3258`)
- Matchmaker Worker: `cloud-weasel-matchmaker` (`839347c9-83d1-4b44-befc-b96a73d33fcc`)
- Match service Worker: `cloud-weasel-match-service` (`0368327d-21e7-4d74-a70c-ba8fd28ae9a4`)
- Game Worker: `cloud-weasel-game-server` (`8c93af91-509b-4e2a-a12d-a51a032e1664`)
- Deployed source commits through: `bd0b430`
- Deployed: 2026-08-11
- Applied D1 migrations: `0001` through `0021`

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
- Durable matchmaking, acceptance/refusal cooldowns, and active-match reconnects
- Authoritative WASM matches with bots, timers, hibernation, quests, XP, ranks,
  match rewards, private/public spectators, and capability-protected replays

WalletConnect remains an optional future integration. Conquest, captcha/shadow
ban policy, game-abandon cooldown sharing, social/invite APIs, marketplace
writes, legacy data migration, and administrative RPCs remain pending.
