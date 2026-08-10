#!/usr/bin/env bash
GIT_DIR=$(git rev-parse --show-toplevel)
echo "The coresponding assets repo commit for this OpenSky repo commit is $(git --git-dir "$GIT_DIR/../OpenSky-assets/.git" rev-list origin/master -- "asset-manifests/assets-manifest.game.tree.$(cat "$GIT_DIR/game/config/game.release.json" | jq -r '.ASSETS_MANIFEST_GAME_HASH').json")"
