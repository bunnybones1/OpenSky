# Skyweaver replayer

The replayer replays Skyweaver's state logic for a match that has completed on production.

## Usage

### Running the replayer

```
RUST_BACKTRACE=1 cargo run -- --id 123456
```

The replayer is only able to replay matches whose ABI version matches the ABI version of the currently checked out WASM module.
If you see the error message "version mismatch", please checkout the commit specified in the output and try again.
