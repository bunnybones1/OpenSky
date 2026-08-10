# Local Architecture

This page describes the supported single-machine development stack used by [`./utils/sw-local-play.sh`](../utils/sw-local-play.sh).

## Service graph

```text
browser
  |
  +--> webapp (:3000)
  |      |
  |      +--> proxied game client (/game/dev/) --> game dev server (:3001)
  |      +--> api (:1337)
  |      +--> matchmaker websocket (:8888)
  |
  +--> assets (:4001)

matchmaker (:8888)
  |
  +--> redis (:6379)
  +--> api (:1337)
  +--> server registry in redis

server (:8000)
  |
  +--> api (:1337)
  +--> redis (:6379)

api (:1337)
  |
  +--> postgres (:5432)

webapp + game
  |
  +--> assets (:4001)
  +--> external Sequence endpoints via cors-anywhere (:8080)
```

## Port map

| Port | Service | Role |
| --- | --- | --- |
| `3000` | `webapp` | Main browser entrypoint and proxy for `/game/dev/` |
| `3001` | `game` | Vite game dev server |
| `1337` | `api` | Accounts, progression, inventory, config |
| `4001` | `assets` | Static card and game assets |
| `5432` | `postgres` | Persistent DB |
| `6379` | `redis` | Matchmaker and server coordination |
| `8000` | `server` | Match/game server |
| `8080` | `cors-anywhere` | Local proxy for external endpoints |
| `8888` | `matchmaker` | Queueing and match creation |

## Release contract

Local play works because the participating services share the same release value:

- `webapp`
- `game`
- `server`
- `matchmaker`

For local development, the supported value is `RELEASE_VERSION=dev`.

That value controls:

- the browser path segment: `/game/dev/`
- matchmaker compatibility checks
- game-server registry versioning
- websocket routing to the correct game server

Production builds still use real `GITCOMMIT` values when `RELEASE_VERSION` is unset.

## Why the game stays on port `3000`

The game client is served by the game dev server on `:3001`, but the browser should enter through `http://localhost:3000/game/dev/`.

That keeps the webapp and game on the same browser origin, which matters for local auth state stored in `localStorage`.

## Debug order

When local play breaks, check in this order:

1. `./utils/sw-local-play.sh smoke`
2. `./utils/sw-local-play.sh status`
3. `.local/sw-local-play/logs/`
4. [LOCAL_PLAY.md](LOCAL_PLAY.md)
5. [LOCAL_COMPATIBILITY.md](LOCAL_COMPATIBILITY.md)
