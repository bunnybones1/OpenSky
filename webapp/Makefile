DOCKER_IMAGE   ?= opensky/stack

GITCOMMIT ?= $(shell git log -1 --date=iso --pretty=format:%H)

.PHONY: build dist run

clean:
	rm -rf ./dist && \
	rm -rf ./node_modules

run:
	pnpm dev

deps: clean
	pnpm

build:
	pnpm && $(MAKE) dist

dist:
	GITCOMMIT=$(GITCOMMIT) pnpm dist

test:
	pnpm test
	make check-game-manifest-deployed
	make check-webapp-manifest-deployed

require-docker-tag:
	@if [ -z "$(DOCKER_TAG)" ]; then \
		echo "Missing DOCKER_TAG" && \
		exit 1; \
	fi

docker-image: require-docker-tag
	docker build -t $(DOCKER_IMAGE):webapp . && \
	docker tag $(DOCKER_IMAGE):webapp $(DOCKER_IMAGE):webapp-${DOCKER_TAG}

docker-push: docker-image
	docker push $(DOCKER_IMAGE):webapp-${DOCKER_TAG}

check-game-manifest-deployed:
	cat ./config/webapp.release.json | grep -Eo '"ASSETS_MANIFEST_GAME_HASH": "(\w+)"' | cut -d ':' -f 2 | sed 's/"//g' | xargs echo -n | sed -r "s&(.*)&https://assets.skyweaver.net/asset-manifests/assets-manifest.game.tree.\1.json&" | xargs curl --head --fail --silent --output /dev/null

check-webapp-manifest-deployed:
	cat ./config/webapp.release.json | grep -Eo '"ASSETS_MANIFEST_WEBAPP_HASH": "(\w+)"' | cut -d ':' -f 2 | sed 's/"//g' | xargs echo -n | sed -r "s&(.*)&https://assets.skyweaver.net/asset-manifests/assets-manifest.webapp.tree.\1.json&" | xargs curl --head --fail --silent --output /dev/null

create_sentry_release: setup_sentry_release upload_sourcemaps release_finalize

setup_sentry_release:
	./node_modules/.bin/sentry-cli releases new $(GITCOMMIT)

upload_sourcemaps:
	./node_modules/.bin/sentry-cli releases files $(GITCOMMIT) \
	upload-sourcemaps ./dist/ --validate dist/

release_finalize:
	./node_modules/.bin/sentry-cli releases finalize $(GITCOMMIT)
