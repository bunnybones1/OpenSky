# Skyweaver fuzzer

The fuzzer tests Skyweaver's state logic by executing random actions forever until a runtime error occurs.

## Usage

### Running the fuzzer

```
RUST_BACKTRACE=1 cargo run
```

### Running the fuzzer for a specific seed

```
RUST_BACKTRACE=1 cargo run -- --seed 0x0123456789abcdef0123456789abcdef
```
