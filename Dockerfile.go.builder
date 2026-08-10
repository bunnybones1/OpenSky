FROM opensky-golang-builder:latest AS builder

ARG GITBRANCH=""
ARG GITCOMMIT=""
ARG GITCOMMITDATE=""
ARG GITCOMMITAUTHOR=""
ARG GITTAG=""
ARG VERSION=""
ARG LONGVERSION=""

# Source
WORKDIR /go/src/github.com/horizon-games/OpenSky

# adding the entire repo into the builder image, but we should
# not persist the builder image outside of the local building machine
ADD . ./

# TODO Use workspaces to cache deps
# pre-build packages for api and api test
RUN make -C api build-pkgs
RUN make -C matchmaker build-pkgs
RUN make -C draft build-pkgs
