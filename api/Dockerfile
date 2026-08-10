#
# Builder pre-image
#
FROM opensky/gobuilder AS builder

ARG GITBRANCH=""
ARG GITCOMMIT=""
ARG GITCOMMITDATE=""
ARG GITCOMMITAUTHOR=""
ARG GITTAG=""
ARG VERSION=""
ARG LONGVERSION=""

WORKDIR /go/src/github.com/horizon-games/OpenSky/api

RUN make build


#
# API dist image
#
FROM alpine:3.19 as api

RUN apk add --no-cache ca-certificates

WORKDIR /api

COPY --from=builder /go/src/github.com/horizon-games/OpenSky/api/bin/opensky-api /api/bin/opensky-api
COPY --from=builder /go/src/github.com/horizon-games/OpenSky/api/bin/util-goose /api/bin/util-goose
COPY --from=builder /go/src/github.com/horizon-games/OpenSky/api/data/schema/migrations/*.sql /api/data/schema/migrations/
COPY --from=builder /go/src/github.com/horizon-games/OpenSky/api/data/schema/migrations/*.json /api/data/schema/migrations/

EXPOSE 1337

ENV CONFIG_FILE /api/opensky-api.conf

CMD ["/api/bin/opensky-api", "-config", "/etc/opensky-api.conf"]


#
# Worker dist image
#
FROM alpine:3.19 as worker

RUN apk add --no-cache ca-certificates

WORKDIR /worker

COPY --from=builder /go/src/github.com/horizon-games/OpenSky/api/bin/opensky-worker /worker/bin/opensky-worker

EXPOSE 1337

ENV CONFIG_FILE /worker/opensky-worker.conf

CMD ["/worker/bin/opensky-worker", "-config", "/etc/opensky-worker.conf"]
