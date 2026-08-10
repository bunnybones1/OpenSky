#!/bin/bash
set -e

TARGETS=("release" "stg" "staging" "pts" "dev" "dev2" "dev3")

for TARGET in "${TARGETS[@]}"
do
  APP_CONFIG=`cat /etc/game/game.${TARGET}.json | tr '\n' ' '`
  cp /game/index.html /game/${TARGET}.html
  sed -i 's|\/\*APP_CONFIG>>\*\/ {} \/\*<<APP_CONFIG\*\/|'"$APP_CONFIG"'|g' /game/${TARGET}.html
done

rm /game/index.html

gsutil -m rsync -x '\..*|.*/\.[^/]*$|.*/\..*/.*$|(.*\.map$)$' -r '/game/' gs://opensky-game-files/game/${GITCOMMIT}/
gsutil -m -h 'Content-Type:application/json' rsync -x '.*[.](?!map$)[^.]*$' -r '/game/' gs://opensky-game-files/game/${GITCOMMIT}/
