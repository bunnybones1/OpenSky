# Cloud Weasel production launch

Cloud Weasel launched on Cloudflare production on 2026-08-22:

<https://opensky-webapp.dysinski-tomasz.workers.dev>

The rollout used runtime commit
`d6299092a1d2a01f8dfd9557b7cda99118462b84`, after exact-head draft-PR CI
run [32554722755](https://github.com/bunnybones1/OpenSky/actions/runs/32554722755)
passed. The deploy runner rechecked the pushed head, CI result, production D1
schema, and reviewed topology before each upload. The original webapp and game
client remain the player interface.

## Production boundary

- D1 migrations `0115` through `0128` were applied with the staged,
  content-addressed production runner. Wrangler reports no pending migrations.
- The two private R2 buckets, fourteen Queue/DLQ containers, six Workflows,
  five Workers, Durable Object/service bindings, and required secret-name sets
  match the reviewed production plan.
- Google identity owns the application session. WalletConnect remains optional
  and read-only with respect to login and reward authority.
- Player rewards remain off-chain D1 entitlements. Analytics is observational
  and cannot grant inventory.
- Both ranked/PvP bot flags remain false. Both Conquest modes remain disabled;
  no reward pool or optional reward schedule was activated for launch.

The deployed Worker versions are:

| Component                             | Cloudflare version                     |
| ------------------------------------- | -------------------------------------- |
| Main API and original web/game assets | `dac529c2-e1e1-4bbf-8ec4-f676ca0cc06e` |
| Authoritative game server             | `ef5a80d8-1461-4e78-8af5-9a5c11636217` |
| Match service                         | `8e9b3818-81d4-43e2-9f81-0ae0a2521aa7` |
| Matchmaker                            | `1725bf38-f8f2-40b5-8c30-376e3d4b90e7` |
| Game analytics                        | `f1f84276-60cd-4423-a1e3-b5b13edd8a6b` |

Public Ping, authoritative game-mode status, game-server health, matchmaker
health, and analytics health all returned `200` with `Cache-Control: no-store`.
The public Version RPC reported the main Worker version above. The deployment
verifier resolved web entry `/assets/index-fd3d9163.js`, game entry
`/game/cloudflare/assets/index-ccb53c4b.js`, all six locale assets, and the
release-safe cache policy.

## Controlled cutover

The existing authenticated `GMGameModeSet` path disabled the six previously
enabled allocation modes before the schema boundary. Production then had zero
`creating` or `active` matches. After migrations, provisioning, deploys, and
the bounded match proof, the same control plane restored:

- `CHALLENGE_CONSTRUCTED`
- `CHALLENGE_DISCOVERY`
- `PRACTICE_PVP`
- `RANKED_CONSTRUCTED`
- `RANKED_DISCOVERY`
- `WARM_UP`

The twelve changes are preserved as immutable `game_mode_status_history` rows.
`PRACTICE_BOT` and `TUTORIAL` stayed enabled throughout. The final public
status has all non-Conquest modes enabled and both Conquest modes disabled.

## Bounded player proof

An authenticated player completed production Practice Bot match `13`
(`c084e9de-43c6-41a9-a389-afb544609e22`) through the original client. The
player conceded after the game began, so the authoritative outcome is the
expected bot/player-index-1 win with `FORFEITED` status and no XP or item
reward.

The terminal publication proof showed:

- one ended match ledger row and zero in-flight matches;
- one immutable player experience receipt, the matching aggregate receipt,
  and both final authoritative deck strings;
- a private replay manifest with 20 records and 31,530 bytes;
- one analytics receipt completed on its first attempt; and
- private match, game-state, and move CSV objects beneath the deterministic
  analytics prefix.

The earlier human Practice match `12` was also opened from the account match
list. Its replay loaded through the final frame in the production game client,
confirming the reported enum failure no longer reproduces.

## Remaining product work

The baseline launch is complete. Work that remains is separately gated product
expansion, not a missing launch dependency:

- replace licensed original art and remaining OpenSky/Skyweaver presentation
  with Cloud Weasel weasel-themed assets as rights and product direction allow;
- configure WalletConnect/Reown only if optional external ownership reads are
  wanted;
- configure optional hCaptcha, OneSignal, Twitch, marketplace, referral, and
  leaderboard policies before exposing those integrations;
- run longer reconnect, concurrent PvP, matchmaking-cadence, and regional
  production soaks as traffic grows; and
- keep Conquest closed until the separately authorized pool proposal,
  activation, three-match readiness drill, 24-hour Gold-delivery observation,
  and independent verification are complete.
