#!/bin/bash
set -e

gsutil -m rsync -x '\..*|.*/\.[^/]*$|.*/\..*/.*$|(.*\.map$)$' -r '/sheets/' gs://opensky-game-files/sheets/${GITCOMMIT}/
gsutil -m -h 'Content-Type:application/json' rsync -x '.*[.](?!map$)[^.]*$' -r '/sheets/' gs://opensky-game-files/sheets/${GITCOMMIT}/
