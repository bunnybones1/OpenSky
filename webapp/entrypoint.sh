#!/bin/sh

if [[ -z "$DIST" ]]; then
  export DIST=dev;
fi

APP_CONFIG=`cat /etc/webapp/webapp.${DIST}.json | tr '\n' ' '`

if [[ -z "${APP_CONFIG}" ]]; then
  echo "config file is empty, exiting.."
  exit 0
fi

sed -i 's|\/\*APP_CONFIG>>\*\/ {} \/\*<<APP_CONFIG\*\/|'"$APP_CONFIG"'|g' /usr/share/nginx/html/index.html

case ${DIST} in
  (dev|dev2|dev3|stg|staging) ;; # sourcemaps allowed here
  (*) rm /usr/share/nginx/html/**/*.map;;
esac


if [[ -z "$@" ]]; then
  /usr/sbin/nginx -g 'daemon off;'
else
  exec "$@"
fi
