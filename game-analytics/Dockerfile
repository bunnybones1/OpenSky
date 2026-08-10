#
# Builder pre-image
#
FROM opensky/nodebuilder AS builder

ARG GITBRANCH=""
ARG GITCOMMIT=""
ARG GITCOMMITDATE=""
ARG VERSION=""

WORKDIR /go/src/github.com/horizon-games/OpenSky/game-analytics

RUN pnpm install
RUN make dist


#
# Deploy image
#
FROM google/cloud-sdk:latest AS deploy-image

RUN apt-get update -y --allow-releaseinfo-change && apt-get install zip -y

COPY --from=builder /go/src/github.com/horizon-games/OpenSky/game-analytics/dist/* /game-analytics/
COPY --from=builder /go/src/github.com/horizon-games/OpenSky/game-analytics/entrypoint.sh /

RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]


#
# Dist image
#
FROM node:14-buster-slim

COPY --from=builder /go/src/github.com/horizon-games/OpenSky/game-analytics/dist/* /game-analytics/

EXPOSE 1637

CMD ["node", "/game-analytics/server.js", "--config", "/etc/game-analytics.json"]
