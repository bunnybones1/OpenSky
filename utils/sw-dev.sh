#!/usr/bin/env bash

COMMAND=$1

SW_ENV=$2

if [ $SW_ENV == "dev" -o $SW_ENV == "dev-2" -o $SW_ENV == "dev-3" -o $SW_ENV == "dev-4" -o $SW_ENV == "dev-5" -o $SW_ENV == "dev-6" -o $SW_ENV == "dev-7" -o $SW_ENV == "dev-8" -o $SW_ENV == "dev-9" -o $SW_ENV == "dev-10" -o $SW_ENV == "dev-11" -o $SW_ENV == "dev-12" -o $SW_ENV == "dev-13" -o $SW_ENV == "dev-14" -o $SW_ENV == "dev-15" -o $SW_ENV == "dev-16" -o $SW_ENV == "dev-17" -o $SW_ENV == "dev-18" -o $SW_ENV == "dev-19" -o $SW_ENV == "dev-20" -o $SW_ENV == "pts" -o $SW_ENV == "stg" ]; then
    echo "Using environment $SW_ENV"
else
    echo "Invalid environment $SW_ENV. Pass one of dev,dev-2,dev-3,dev-4,dev-5,dev-6,dev-7,dev-8,dev-9,dev-10,dev-11,dev-12,dev-13,dev-14,dev-15,dev-16,dev-17,dev-18,dev-19,dev-20,pts,stg"
    exit 1
fi

SW_ENV_WITHOUT_DASH=$(echo $SW_ENV | sed 's/-//g')

read -r -d "" PGPASSWORD <<EOM
export PGPASSWORD=\$(
    sudo cat /data/opensky-api/opensky-api.conf \
    | grep password \
    | head -n 1 \
    | sed 's/.*= //' \
    | tr -d '\"' \
)
EOM

DBNAME="$SW_ENV_WITHOUT_DASH"_opensky

if [ "$COMMAND" == "give-gm" ]; then
    ADDRESS=$3
    echo "Trying to give account $3 admin on env $2..."
    read -r -d "" COMMAND <<EOM
    $PGPASSWORD

    psql \
        -h opensky-postgres.internal.0xhorizon.net \
        -U $DBNAME \
        -d $DBNAME \
        -c "UPDATE accounts SET admin = true WHERE address ILIKE '$ADDRESS'" \
    | grep "UPDATE 1" \
    && echo "Successfully gave account $ADDRESS admin." \
    || echo "Failed to give account $ADDRESS admin!"
EOM
elif [ "$COMMAND" == "db-reset" ]; then
    read -r -d "" COMMAND <<EOM
    $PGPASSWORD

    # stop the API & worker
    sudo docker ps --filter name="opensky-api*" --filter status=running -aq | xargs sudo docker stop
    sudo docker ps --filter name="opensky-worker*" --filter status=running -aq | xargs sudo docker stop

    psql \
        -h opensky-postgres.internal.0xhorizon.net \
        -U $DBNAME \
        -d 'postgres' \
        -c "DROP DATABASE $DBNAME" \
        | grep "DROP DATABASE" \
    && psql \
        -h opensky-postgres.internal.0xhorizon.net \
        -U $DBNAME \
        -d 'postgres' \
        -c "CREATE DATABASE $DBNAME" \
        | grep "CREATE DATABASE" \
    && echo "Successfully reset $SW_ENV db. Deploy to continue." \
    || echo "Failed to reset DB on $SW_ENV!"
EOM
elif [ "$COMMAND" == "psql" ]; then
    read -r -d "" COMMAND <<EOM
    $PGPASSWORD

    TERM=xterm psql \
        -h opensky-postgres.internal.0xhorizon.net \
        -U $DBNAME \
        -d $DBNAME
EOM
elif [ "$COMMAND" == "ssh" ]; then
    gcloud compute ssh \
        --ssh-key-expire-after=1d \
        --project opensky-$SW_ENV $SW_ENV_WITHOUT_DASH-opensky-api-1
    exit 0
elif [ "$COMMAND" == "reboot" ]; then
    echo "restarting $SW_ENV_WITHOUT_DASH services..."
    gcloud compute instances stop \
        --project opensky-$SW_ENV \
        $SW_ENV_WITHOUT_DASH-opensky-api-1 \
        $SW_ENV_WITHOUT_DASH-opensky-server-1 \
        $SW_ENV_WITHOUT_DASH-opensky-match-maker-1
    gcloud compute instances start \
        --project opensky-$SW_ENV \
        $SW_ENV_WITHOUT_DASH-opensky-api-1 \
        $SW_ENV_WITHOUT_DASH-opensky-server-1 \
        $SW_ENV_WITHOUT_DASH-opensky-match-maker-1
    exit 0
else
    echo "Invalid argument."
    echo "try one of [give-gm|db-reset|ssh|psql|reboot]"
    exit 1
fi

gcloud compute ssh \
    --ssh-key-expire-after=1d \
    --command "$COMMAND" \
    --project opensky-$SW_ENV $SW_ENV_WITHOUT_DASH-opensky-api-1
