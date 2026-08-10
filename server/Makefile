DOCKER_IMAGE   ?= opensky/stack

GITCOMMIT ?= $(shell git log -1 --date=iso --pretty=format:%H)
RELEASE_VERSION ?= dev
RUN_ARGS ?=

ifneq (,$(filter dist-run,$(MAKECMDGOALS)))
DIST_RUN_ARGS := $(wordlist 2,$(words $(MAKECMDGOALS)),$(MAKECMDGOALS))
ifneq ($(DIST_RUN_ARGS),)
RUN_ARGS := $(DIST_RUN_ARGS)
$(foreach arg,$(DIST_RUN_ARGS),$(eval $(arg):;@:))
endif
endif

.PHONY: build dist dist-run

clean:
	rm -rf ./dist

build:
	$(MAKE) dist

dist: clean
	pnpm ncc build src/index.ts -o dist && \
	pnpm ncc build src/worker/match.worker.ts -o dist/worker && \
	cp ../state/js-bindings/packages/node-sys/bindings_bg.wasm ./dist/worker/ && \
	sed 's/process.env.GITCOMMIT/"$(GITCOMMIT)"/g' dist/index.js > dist/index.js.new && \
	sed 's/process.env.GITCOMMIT/"$(GITCOMMIT)"/g' dist/worker/index.js > dist/worker/index.js.new && \
	mv dist/index.js.new dist/index.js && \
	mv dist/worker/index.js.new dist/worker/index.js

dist-run:
	node ./dist/index.js $(RUN_ARGS)

run:
	RELEASE_VERSION="$(RELEASE_VERSION)" node dist/index.js --config="$(PWD)/config/game-server.local.json"

test:
	pnpm test
	# pnpm lint

require-docker-tag:
	@if [ -z "$(DOCKER_TAG)" ]; then \
		echo "Missing DOCKER_TAG" && \
		exit 1; \
	fi

docker-image: require-docker-tag
	docker build -t $(DOCKER_IMAGE):server . && \
	docker tag $(DOCKER_IMAGE):server $(DOCKER_IMAGE):server-${DOCKER_TAG}

docker-push: docker-image
	docker push $(DOCKER_IMAGE):server-${DOCKER_TAG}
