FROM opensky/gobuilder AS builder

ARG GITBRANCH=""
ARG GITCOMMIT=""
ARG GITCOMMITDATE=""
ARG GITCOMMITAUTHOR=""
ARG GITTAG=""
ARG VERSION=""
ARG LONGVERSION=""

WORKDIR /go/src/github.com/horizon-games/OpenSky/matchmaker

RUN make build

#
# Matchmaker dist image
#
FROM alpine:3.13 as matchmaker

RUN apk add --no-cache ca-certificates

WORKDIR /matchmaker

COPY --from=builder /go/src/github.com/horizon-games/OpenSky/matchmaker/bin/matchmaker /matchmaker/bin/matchmaker

EXPOSE 8888

ENV CONFIG_FILE /etc/match-maker.conf

CMD ["/matchmaker/bin/matchmaker", "-config", "/etc/match-maker.conf"]
