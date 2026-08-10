OpenSky Web App
=================

For the full local game stack, start with [`../docs/LOCAL_PLAY.md`](../docs/LOCAL_PLAY.md).

## Dev

This package is just the web front-end. The easiest way to run it against the rest of the local stack is via:

```sh
./utils/sw-local-play.sh up
```

If you only want to work on the webapp itself:

1. Run `pnpm install` at the repo root.
2. Make sure the API, assets service, and matchmaker endpoints referenced by your chosen config are reachable.
3. Run `DIST=local-api pnpm --dir webapp dev`.
