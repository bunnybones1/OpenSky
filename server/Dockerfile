#
# Builder pre-image
#
FROM opensky/nodebuilder AS builder

ARG GITBRANCH=""
ARG GITCOMMIT=""
ARG GITCOMMITDATE=""
ARG VERSION=""

WORKDIR /go/src/github.com/horizon-games/OpenSky/server

RUN pnpm install --offline
RUN make build


#
# Dist image
#
FROM node:18.6-buster-slim

COPY --from=builder /go/src/github.com/horizon-games/OpenSky/server/dist/ /game-server/

ENV NODE_OPTIONS=--openssl-legacy-provider

EXPOSE 1637

CMD ["node", "/game-server/index.js", "--config", "/etc/game-server.json"]
