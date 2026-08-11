# Cloud Weasel deployment

## Production

- URL: https://opensky-webapp.dysinski-tomasz.workers.dev
- Cloudflare Worker: `opensky-webapp`
- Cloudflare version: `2a45de9c-2d2a-4323-b3d9-6950dee9120c`
- Deployed source commit: `985cd4a`
- Deployed: 2026-08-10
- Applied D1 migrations: `0001` through `0007`

## Verified scope

- Google OpenID Connect login and identity-backed sessions
- Original OpenSky webapp shell, navigation, profile, and item views
- Wallet-free starter collection and legacy read RPC compatibility
- Starter quest claims and the original quest progression chain
- Basic SkyPass card claims for the ported season data
- Legacy deck listing, creation, update, deletion, and deck-string encoding
- Practice mode using the original local-bot game client

WalletConnect remains an optional future integration. Wallet-dependent trading,
marketplace, ranked, and other backend RPCs are not part of this deployment
milestone yet.
