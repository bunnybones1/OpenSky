# Cloudflare service audit

Cloud Weasel has a mechanically checked disposition for every original Docker
workload, local compose service, and executable Go entrypoint. The release gate
is `pnpm check:cloudflare:services`; adding a workload or removing its evidence
without reviewing this inventory fails the Cloudflare build.

## Product workloads

| Original workload   | Cloudflare disposition                                                                                                                                                             |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `webapp`            | Original Vite client served by the main Worker Assets binding.                                                                                                                     |
| `game`              | Original Vite game client served beneath the main Worker asset tree.                                                                                                               |
| `api` API target    | TypeScript API and Google identity gateway backed by D1.                                                                                                                           |
| `api` worker target | Main Worker cron plus Durable Object alarms; each registered source runner also has a separate mechanical audit.                                                                   |
| `matchmaker`        | `matchmaker-ts`, using Durable Objects and a separate match service.                                                                                                               |
| `server`            | `game-server-cloudflare` authoritative Durable Objects, coordinated by `match-service-cloudflare`, with receipt-gated final publication. The source server was already TypeScript. |
| `game-analytics`    | TypeScript Worker/Queue/R2 port is complete, tested, and live. A bounded production replay completed its D1 receipt and all three source-compatible CSV outputs.                   |
| `chain`             | Superseded by off-chain D1 reward receipts, verified Stripe/mobile purchase receipts, and inventory exchanges. WalletConnect remains read-only and optional.                       |

`sheets` is an internal Tauri/Vite content tool, not a hosted player service.
`asset-pipeline`, `bot`, and the Go GM/stress/migration utilities are operator,
test, or build tooling rather than always-on workloads. The grant-cards operator
flow has a dedicated off-chain TypeScript RPC adapter. The legacy JWT utility
is superseded by Google OIDC for players, Cloudflare service bindings between
Workers, and identity-scoped staff roles/capabilities; it is not a missing
authentication runtime.

## Local infrastructure

The root compose file is a development environment, not a production service
manifest. D1 supersedes Postgres, Durable Objects supersede Redis, and
Cloudflare routing supersedes Traefik. Dozzle, pgweb, localhost bridging, and
CORS proxying remain local conveniences. Its `draft` entry is a stale orphan:
there is no `draft/` source directory in this checkout and it is not part of the
product description or Cloudflare runtime.

## Operational status and remaining product configuration

- The production analytics bucket, consumer, replay producer, `0115`
  authoritative-deck boundary, D1 receipt, and three CSV outputs were verified
  end to end on 2026-08-22. See
  [`CLOUDFLARE_PRODUCTION_LAUNCH.md`](./CLOUDFLARE_PRODUCTION_LAUNCH.md).
- External device push has a disabled-by-default OneSignal adapter. An empty or
  malformed app ID now makes every SDK operation inert, and the optional
  welcome destination must be configured as an explicit HTTPS URL. Activation
  needs a Cloud Weasel OneSignal app and key; in-app notification delivery stays
  authoritative and independent of the provider.
- Twitch discovery is optional and fail closed. Without Cloud Weasel Twitch
  client credentials the original Home/Play live-channel component renders
  nothing, performs no query retry, and exposes no legacy creator-program call
  to action. Activation also requires an explicitly configured HTTPS Cloud
  Weasel creator-program URL if that call to action is desired.
- WalletConnect ownership reads, active Conquest/leaderboard schedules, and
  marketplace behavior require explicit product configuration or decisions;
  they are not missing server processes.
