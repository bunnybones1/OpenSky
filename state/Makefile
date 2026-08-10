.PHONY: test build build-deps verify-build

BROWSER_BINDINGS_HASH := $(shell sha256sum js-bindings/packages/browser-sys/bindings_bg.wasm)
NODE_BINDINGS_HASH := $(shell sha256sum js-bindings/packages/node-sys/bindings_bg.wasm)

test:
	rustc -V
	# wasm-pack -V
	cd .. && cargo test -p skyweaver-rs -- --test-threads 8
	cd .. && cargo test -p skyweaver-fuzzer
	cd .. && cargo test -p skyweaver-replayer

build:
	cd js-bindings; pnpm install; pnpm build

build-deps:
	cargo install wasm-pack
	pnpm install

verify-build: build
	echo "new browser hash: $(shell sha256sum js-bindings/packages/browser-sys/bindings_bg.wasm)"
	echo "new node hash: $(shell sha256sum js-bindings/packages/node-sys/bindings_bg.wasm)"
	# echo "$(NODE_BINDINGS_HASH)" | sha256sum -c -
	# echo "$(BROWSER_BINDINGS_HASH)" | sha256sum -c -
	echo "skipping verification for now"
