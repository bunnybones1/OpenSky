#
# Builder pre-image
#
FROM opensky/nodebuilder AS builder

ARG GITBRANCH=""
ARG GITCOMMIT=""
ARG GITCOMMITDATE=""
ARG VERSION=""

WORKDIR /go/src/github.com/horizon-games/OpenSky/webapp

RUN pnpm install
RUN make dist
RUN make create_sentry_release

#
# Dist image
#
FROM nginx:stable-alpine

COPY --from=builder /go/src/github.com/horizon-games/OpenSky/webapp/dist /usr/share/nginx/html
COPY --from=builder /go/src/github.com/horizon-games/OpenSky/webapp/static/404.html /usr/share/nginx/html/
COPY --from=builder /go/src/github.com/horizon-games/OpenSky/webapp/static/404.jpeg /usr/share/nginx/html/
COPY --from=builder /go/src/github.com/horizon-games/OpenSky/webapp/static/BarlowCondensed-Regular.ttf /usr/share/nginx/html/
COPY --from=builder /go/src/github.com/horizon-games/OpenSky/webapp/config /etc/webapp
COPY --from=builder /go/src/github.com/horizon-games/OpenSky/webapp/config/nginx/opensky.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /go/src/github.com/horizon-games/OpenSky/webapp/entrypoint.sh /entrypoint.sh

EXPOSE 80

RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
