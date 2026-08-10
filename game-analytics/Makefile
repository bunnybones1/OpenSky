DOCKER_IMAGE   ?= opensky/stack

GITCOMMIT ?= $(shell git log -1 --date=iso --pretty=format:%H)

.PHONY: build dist run

clean:
	rm -rf ./dist && \
	rm -rf ./node_modules

deps: clean
	pnpm


dist:
	DIST=release GITCOMMIT=$(GITCOMMIT) pnpm dist

