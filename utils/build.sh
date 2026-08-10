#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

pnpm install
pnpm --dir "$ROOT_DIR/webapp" dist
pnpm --dir "$ROOT_DIR/game" dist
pnpm --dir "$ROOT_DIR/server" build
make -C "$ROOT_DIR/api" build
make -C "$ROOT_DIR/matchmaker" build
