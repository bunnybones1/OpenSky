#!/bin/bash
set -e

TARGETS=("release" "stg" "pts" "dev" "dev2" "dev3" "dev4" "dev5" "dev6" "dev7" "dev8" "dev9" "dev10")

for TARGET in "${TARGETS[@]}"
do
  cd /game-analytics; zip -r ../function.zip *
  gsutil cp '/function.zip' gs://opensky-game-files/game-analytics/${GITCOMMIT}.zip
done