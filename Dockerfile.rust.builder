FROM opensky-rust-builder:latest AS with-creds

RUN --mount=type=secret,id=deploy_key cp /run/secrets/deploy_key /root/.ssh/deploy_key && \
    chmod 600 /root/.ssh/deploy_key

FROM with-creds AS builder

# Source
WORKDIR /go/src/github.com/horizon-games/OpenSky

# pre-download all deps
RUN mkdir -p ./design-data/rust/src \
    && echo "// dummy file" > ./design-data/rust/src/lib.rs

RUN mkdir -p ./sheets/src-tauri/src \
    && echo "fn main() {}" > ./sheets/src-tauri/src/main.rs

RUN mkdir -p ./state/state/src \
    && echo "fn main() {}" > ./state/state/build.rs \
    && echo "// dummy file" > ./state/state/src/lib.rs

RUN mkdir -p ./state/fuzzer/src \
    && echo "fn main() {}" > ./state/fuzzer/src/main.rs

RUN mkdir -p ./state/replayer/src \
    && echo "fn main() {}" > ./state/replayer/src/main.rs

RUN mkdir -p ./state/js-bindings/src \
    && echo "// dummy file" > ./state/js-bindings/src/lib.rs

FROM builder AS prepped-builder

COPY ["./Cargo.toml", "./Cargo.lock", "./"]
COPY "./design-data/rust/Cargo.toml" "./design-data/rust/"
COPY "./sheets/src-tauri/Cargo.toml" "./sheets/src-tauri/"
COPY "./state/state/Cargo.toml" "./state/state/"
COPY "./state/fuzzer/Cargo.toml" "./state/fuzzer/"
COPY "./state/replayer/Cargo.toml" "./state/replayer/"
COPY "./state/js-bindings/Cargo.toml" "./state/js-bindings/"

RUN cargo test && cargo test --release

ADD . ./
FROM prepped-builder AS rust-builder
