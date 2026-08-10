#!/usr/bin/env bash
set -eu

PG_USER=${PG_USER:-postgres}

if [ ! -z "${PG_PASSWORD}" ]; then
	export PGPASSWORD="${PG_PASSWORD}"
fi

echo "PG_HOST: ${PG_HOST}, PG_USER: ${PG_USER}"

function usage() {
    echo "Usage:"
    echo "  $0 import DATABASE FILES..."
    echo "  $0 create DATABASE"
    echo "  $0 drop DATABASE"
    echo "  $0 terminate DATABASE"
    exit 1
}

test -z "${1-}" && usage
command="$1"
shift

test -z "${1-}" && usage
database="$1"
shift

create=$(cat <<EOF
    DO
    \$body\$
    BEGIN
      IF NOT EXISTS (
        SELECT * FROM pg_catalog.pg_user WHERE usename = 'opensky'
      ) THEN
        CREATE USER opensky WITH PASSWORD 'talesfromthecrypt';
      END IF;
    END
    \$body\$;

    CREATE DATABASE $database ENCODING 'UTF-8' LC_COLLATE='en_US.UTF-8' LC_CTYPE='en_US.UTF-8' TEMPLATE template0 OWNER opensky;
    \c $database

    GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO opensky;
    GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO opensky;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON TABLES TO opensky;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON SEQUENCES TO opensky;
EOF
)

terminate=$(cat <<EOF
    SELECT pg_terminate_backend(pg_stat_activity.pid)
    FROM pg_stat_activity
    WHERE pg_stat_activity.datname = '$database' AND pid <> pg_backend_pid();
EOF
)

drop=$(cat <<EOF
    DROP DATABASE IF EXISTS $database;
EOF
)

case "$command" in
  "create")
    echo "$create" | psql -h${PG_HOST} -U${PG_USER} -v ON_ERROR_STOP=1
    ;;
  "import")
    echo "$terminate" "$drop" "$create" | cat - $* | psql -h${PG_HOST} -U${PG_USER} template1 -v ON_ERROR_STOP=1
    ;;
  "drop")
    echo "$terminate" "$drop" | psql -h${PG_HOST} -U${PG_USER} -v ON_ERROR_STOP=1
    ;;
  "terminate")
    echo "$terminate" | psql -h${PG_HOST} -U${PG_USER} -v ON_ERROR_STOP=1
    ;;
  *)
    echo "$command: no such command"
    usage
    ;;
esac

exit $?
