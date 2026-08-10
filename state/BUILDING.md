# OpenSky State

## Installing Dependencies

### NixOS

```bash
$ nix-shell
```

### Other OS

Follow the instructions at https://rustup.rs/

```bash
$ rustup install nightly-2019-09-05
$ rustup default nightly-2019-09-05
```

## Building

`cd` to this directory (probably `SkyWeaver/state`)

### Running tests

```bash
$ cd state
$ cargo test
# or, to watch the folder and re-run tests on-save
$ cargo watch -x test
```

### Building `.wasm` and Typescript bindings

If you want the game client to reflect your changes in rust, you need to build the `.wasm` and commit the resulting `bundle` folder to git.

```bash
$ cd js-bindings
$ npm run build
```
