# OpenSky Game State and Game Logic

The `state/` workspace contains the Rust match engine, the card effect implementations, the patching helper scripts, and the generated JS bindings consumed by the rest of the stack.

## Contributor workflow

For card or rules changes, use this flow:

1. Create a branch from `master`.
2. In `state/cards`, run `pnpm run patch` or `pnpm run patch status` to inspect changed card text.
3. Implement or update the Rust effect files under `state/state/src/card_effects/`.
4. Rebuild generated artifacts in `state/js-bindings`:
   - `pnpm build`
   - `pnpm gen-card-sql`
5. Validate your branch in the local stack before opening a pull request back to `master`.

Relevant docs:

- [Card Patch Workflow](../docs/workflows/card-patch-workflow.md)
- [Build State WASMs](../docs/workflows/build-state.md)
- [Update Card Library in DB](../docs/workflows/update-card-library-in-db.md)
- [Card Patch Tool](../docs/tools/card-patch-tool.md)

## Open-source scope

Some historical workflows in this area referenced internal teammates, private Google credentials, or separate private repositories used for blog assets and production content operations.
Those steps are not required for normal open-source development and are intentionally omitted here.
Public contributors should treat committed `design-data/` as the source input and focus on changes that can be built and tested from this repository plus `OpenSky-assets`.

## Useful commands

### Patch helper

```sh
cd state/cards
pnpm run patch
```

### Rebuild bindings and card SQL

```sh
cd state/js-bindings
pnpm build
pnpm gen-card-sql
```

## Errors & fixes

### command not found: wasm-pack

install wasm-pack with `cargo install wasm-pack`

### command not found: jq

install jq. on macos, `brew install jq`. on debian linuxes, `sudo apt install jq`.

### command not found: wasm-opt

install `binaryen`. on macos, `brew install binaryen`.

## Fuzz testing

The fuzzer tests Skyweaver's state logic by executing random actions forever until a runtime error occurs.

### Usage

#### Running the fuzzer

```
cd fuzzer
RUST_BACKTRACE=1 cargo run
```

#### Running the fuzzer for a specific seed

```
cd fuzzer
RUST_BACKTRACE=1 cargo run -- --seed 0x0123456789abcdef0123456789abcdef
```

## Production match replay

The replayer replays Skyweaver's state logic for a match that has completed on production.

### Usage

#### Running the replayer

```
cd replayer
RUST_BACKTRACE=1 cargo run -- --id 123456
```

The replayer is only able to replay matches whose ABI version matches the ABI version of the currently checked out WASM module.
If you see the error message "version mismatch", please checkout the commit specified in the output and try again.

## Feature Flagging New Sets

This feature has been removed. Use a branch with the new sheets tool instead.
