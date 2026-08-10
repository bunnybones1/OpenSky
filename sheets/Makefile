DOCKER_IMAGE   ?= opensky/stack

GITCOMMIT ?= $(shell git log -1 --date=iso --pretty=format:%H)

.PHONY: test-rust dist
test-rust:
	cd .. && cargo test -p app
dist:
	GITCOMMIT=$(GITCOMMIT) pnpm dist
