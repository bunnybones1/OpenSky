# OpenSky Game Server

![alt text](https://user-images.githubusercontent.com/1619025/72374680-bffbaf80-36d8-11ea-9293-6e8b730d37d0.jpg "Game Server Architecture")

For the full local game stack, start with [`../docs/LOCAL_PLAY.md`](../docs/LOCAL_PLAY.md).

## Usage

**Development:**

make sure you have a `redis` server instance running on `localhost:6379`, or edit this in `server/config/game-server.local.json`

```shell
$ pnpm --dir server start
```

This service also expects the API and matchmaker-related dependencies to be reachable. For local play, use the helper script instead of starting services one by one.

**Production:**

```shell
$ pnpm --dir server build
```
