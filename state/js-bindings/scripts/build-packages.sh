#!/usr/bin/env bash

set -euox pipefail

if ! [ -x "$(command -v cargo)" ]; then
    echo "no cargo in path, not touching built files"
    exit 0
fi
if ! [ -x "$(command -v wasm-pack)" ]; then
    echo "no wasm-pack in path! run $ cargo install wasm-pack"
    exit 1
fi

RUSTC_VERSION_STRING="$(rustc -V)"
WASM_PACK_VERSION_STRING="$(wasm-pack -V)"
WASM_OPT_VERSION_STRING="$(wasm-opt --version)"

function version { echo "$@" | awk -F. '{ printf("%d%03d%03d%03d\n", $1,$2,$3,$4); }'; }

### get the on-filesystem versions of all the tools
IFS=$'\n' read -d '' -r LAST_RUSTC_VERSION_STRING LAST_WASM_PACK_VERSION_STRING LAST_WASM_OPT_VERSION_STRING <versions || true

# now split into just the number parts, and compare.
LAST_RUSTC_VERSION="$(echo $LAST_RUSTC_VERSION_STRING | cut -d' ' -f2)"
RUSTC_VERSION="$(echo $RUSTC_VERSION_STRING | cut -d' ' -f2)"

if [ $(version $RUSTC_VERSION) -lt $(version $LAST_RUSTC_VERSION) ]; then
    echo "Error: The on-filesystem rustc version ($LAST_RUSTC_VERSION) is greater than your current version ($RUSTC_VERSION)."
    echo "Please update Rust to $LAST_RUSTC_VERSION or greater."
    exit 1
fi

LAST_WASM_PACK_VERSION="$(echo $LAST_WASM_PACK_VERSION_STRING | cut -d' ' -f2)"
WASM_PACK_VERSION="$(echo $WASM_PACK_VERSION_STRING | cut -d' ' -f2)"

if [ $(version $WASM_PACK_VERSION) -lt $(version $LAST_WASM_PACK_VERSION) ]; then
    echo "Error: The on-filesystem wasm-pack version ($LAST_WASM_PACK_VERSION) is greater than your current version ($WASM_PACK_VERSION)."
    echo "Please update your wasm-pack to $LAST_WASM_PACK_VERSION or greater."
    exit 1
fi

LAST_WASM_OPT_VERSION="$(echo $LAST_WASM_OPT_VERSION_STRING | cut -d' ' -f3)"
WASM_OPT_VERSION="$(echo $WASM_OPT_VERSION_STRING | cut -d' ' -f3)"

if [ $(version $WASM_OPT_VERSION) -lt $(version $LAST_WASM_OPT_VERSION) ]; then
    echo "Error: The on-filesystem wasm-opt version ($LAST_WASM_OPT_VERSION) is greater than your current version ($WASM_OPT_VERSION)."
    echo "Please update your wasm-opt to $LAST_WASM_OPT_VERSION or greater."
    exit 1
fi

indent() { sed 's/^/||  /'; }

shopt -s extglob

echo "Deleting old build artifacts"
rm -rf build/ bundle/ dist-node/ dist-browser/ || exit 1
mkdir -p build/browser build/node bundle/browser bundle/node || exit 1
rm -rf packages/metadata-sys packages/browser-sys packages/node-sys || exit 1

echo "Creating sys packages..."
mkdir -p packages/metadata-sys || exit 1
mkdir -p packages/browser-sys || exit 1
mkdir -p packages/node-sys || exit 1

echo "Building typescript bindings..."
wasm-pack build --dev -d packages/metadata-sys --target browser | indent || exit 1
rm packages/metadata-sys/.gitignore || exit 1

echo "Building browser wasm..."
wasm-pack build --release -d packages/browser-sys --target browser --no-typescript | indent || exit 1
rm packages/browser-sys/.gitignore || exit 1

echo "Building node wasm..."
wasm-pack build --release -d packages/node-sys --target nodejs --no-typescript | indent || exit 1
rm packages/node-sys/.gitignore || exit 1

echo "Running wasm-opt..."
# running wasm-pack's wasm-opt followed by binaryen's yields a ~2 kB reduction in size
# we go from 5319707 bytes down to 5317976, a reduction of 1731 bytes, by allowing wasm-pack's wasm-opt to run
wasm-opt -Oz --enable-mutable-globals -o packages/browser-sys/bindings_bg.wasm packages/browser-sys/bindings_bg.wasm
wasm-opt -Oz --enable-mutable-globals -o packages/node-sys/bindings_bg.wasm packages/node-sys/bindings_bg.wasm

echo "Copying TS bindings"
cp packages/metadata-sys/bindings.d.ts packages/browser-sys || exit 1
cp packages/metadata-sys/bindings.d.ts packages/node-sys || exit 1

echo "Building metadata-sys bindings"
cat packages/metadata-sys/bindings.d.ts | pnpm exec tsx scripts/bindings/generate-type-exports.ts >tmp.d.ts || exit 1
mv tmp.d.ts packages/metadata-sys/bindings.d.ts || exit 1

echo "Fixing package.json in sys crates"
tsx scripts/bindings/rewrite-package-json.ts node || exit 1
tsx scripts/bindings/rewrite-package-json.ts browser || exit 1
tsx scripts/bindings/rewrite-package-json.ts metadata || exit 1

echo "making tsconfigs.."
echo '{"compilerOptions": {"skipLibCheck": true}}' >packages/metadata-sys/tsconfig.json || exit 1
echo '{"compilerOptions": {"skipLibCheck": true}}' >packages/browser-sys/tsconfig.json || exit 1
echo '{"compilerOptions": {"skipLibCheck": true}}' >packages/node-sys/tsconfig.json || exit 1

echo "Creating card stats typescript file & card lang json file..."
tsx scripts/bindings/create-card-stats.ts || exit 1

echo "Cleaning up metadata-sys folder"
rm packages/metadata-sys/*.js
rm packages/metadata-sys/*.wasm
echo "" >packages/metadata-sys/bindings.js

echo "Sorting exports..."
tsx scripts/bindings/sort-exports.ts

echo "Formatting typescript..."
prettier --write ./packages/**/*.ts | indent || exit 1

echo "Tagging versions"
echo $RUSTC_VERSION_STRING >versions
echo $WASM_PACK_VERSION_STRING >>versions
echo $WASM_OPT_VERSION_STRING >>versions

echo "Done!"
