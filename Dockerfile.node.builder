FROM opensky-rust-builder:latest AS with-creds

RUN --mount=type=secret,id=deploy_key cp /run/secrets/deploy_key /root/.ssh/deploy_key && \
    chmod 600 /root/.ssh/deploy_key

FROM with-creds AS builder

# Source
WORKDIR /go/src/github.com/horizon-games/OpenSky

# pre-download all deps
COPY ./pnpm-lock.yaml ./
COPY patches patches
RUN pnpm fetch

# add source code
ADD . ./
FROM builder AS node-builder

# setup the project, which will trigger prepare to build all sources too
RUN pnpm install

# detect symlink loops
RUN find -L . > /dev/null