# OpenSky Game Client

For the full local game stack, start with [`../docs/LOCAL_PLAY.md`](../docs/LOCAL_PLAY.md).

## Usage

**Development:**

```shell
$ DIST=local-api pnpm --dir game dev
```

go to
http://localhost:3001/?mode=bot

For the normal integrated flow, run the local stack helper and use:

http://localhost:3000/

For a fresh clone, prefer:

```shell
./utils/sw-local-play.sh bootstrap
```

**Production:**

```shell
$ pnpm dist
```

## Saving & loading a game state

**Saving**

1. Open the cheats menu
2. Click "Copy game to clipboard"
3. Paste the game on https://gist.github.com/ , and create a private gist.
4. Click the Raw button and copy the URL.

**Loading**

Go to https://beta.skyweaver.net/?serializedGameURL=YOUR_URL_HERE

:D
:|
