#
# Builder pre-image
#
FROM opensky/nodebuilder AS builder

ARG GITBRANCH=""
ARG GITCOMMIT=""
ARG GITCOMMITDATE=""
ARG VERSION=""

WORKDIR /go/src/github.com/horizon-games/OpenSky/sheets

RUN make dist

#
# Dist image
#
FROM google/cloud-sdk:latest

COPY --from=builder /go/src/github.com/horizon-games/OpenSky/sheets/dist/sheets/ /sheets/
COPY entrypoint.sh /

RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
