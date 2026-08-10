#
# Builder pre-image
#
FROM opensky/nodebuilder AS builder

ARG GITBRANCH=""
ARG GITCOMMIT=""
ARG GITCOMMITDATE=""
ARG VERSION=""

WORKDIR /go/src/github.com/horizon-games/OpenSky/game

RUN pnpm install
RUN make dist
RUN make create_sentry_release


#
# Dist image
#
FROM google/cloud-sdk:latest

COPY --from=builder /go/src/github.com/horizon-games/OpenSky/game/config /etc/game
COPY --from=builder /go/src/github.com/horizon-games/OpenSky/game/dist/game/ /game/
COPY --from=builder /go/src/github.com/horizon-games/OpenSky/game/entrypoint.sh /entrypoint.sh

RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
