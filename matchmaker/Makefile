SHELL = bash

REDIS_VERSION  ?= 6.2-alpine
NATS_VERSION   ?= 2.7-alpine

TOP := $(shell dirname $(realpath $(lastword $(MAKEFILE_LIST))))

TPARSE_OPTIONS			?= '-follow'

CONFIG_FILE ?= etc/matchmaker.conf
RELEASE_VERSION ?= dev

GITTAG          ?= $(shell git describe --exact-match --tags HEAD 2>/dev/null || :)
GITBRANCH       ?= $(shell git rev-parse --abbrev-ref HEAD 2>/dev/null || :)
LONGVERSION     ?= $(shell git describe --tags --long --abbrev=8 --always HEAD)$(echo -$GITBRANCH | tr / - | grep -v '\-master' || :)
VERSION         ?= $(if $(GITTAG),$(GITTAG),$(LONGVERSION))
GITCOMMIT       ?= $(shell git log -1 --date=iso --pretty=format:%H)
GITCOMMITDATE   ?= $(shell git log -1 --date=iso --pretty=format:%cd)
GITCOMMITAUTHOR ?= $(shell git log -1 --date=iso --pretty="format:%an")

test:
	@set -o pipefail && go test -failfast -cover -p 1 -json ./... | go run github.com/mfridman/tparse $(TPARSE_OPTIONS)

.PHONY: lint
lint:
	@docker run -t --rm -v $(shell dirname $(TOP)):/app -v ~/.cache/golangci-lint/v1.54.2:/root/.cache -w /app golangci/golangci-lint:v1.54.2 golangci-lint run matchmaker/...

generate:
	go generate ./...

test-ci:
	@export TPARSE_OPTIONS='-follow -smallscreen -nocolor' && \
	$(MAKE) test

docker-redis:
	(docker rm -f redis || exit 0) && \
	docker run \
	 	-d \
	 	--name redis \
		-p 0.0.0.0:6379:6379 \
		redis:$(REDIS_VERSION)

run:
	@RELEASE_VERSION="$(RELEASE_VERSION)" go run github.com/VojtechVitek/rerun/cmd/rerun -watch ./ -ignore bin -run \
		sh -c 'GOGC=off go build -o ./bin/matchmaker ./cmd/matchmaker/main.go && ./bin/matchmaker -config=$(CONFIG_FILE)'

build:
	GOGC=off GOBIN=$$PWD/bin \
	go install \
		-tags='${BUILDTAGS}' \
		-gcflags='-e' \
		-ldflags='-X "github.com/horizon-games/OpenSky/matchmaker/config.GITBRANCH=$(GITBRANCH)" -X "github.com/horizon-games/OpenSky/matchmaker/config.GITCOMMIT=$(GITCOMMIT)" -X "github.com/horizon-games/OpenSky/matchmaker/config.GITCOMMITAUTHOR=$(GITCOMMITAUTHOR)" -X "github.com/horizon-games/OpenSky/matchmaker/config.GITCOMMITDATE=$(GITCOMMITDATE)" -X "github.com/horizon-games/OpenSky/matchmaker/config.VERSION=$(VERSION)"' \
		./cmd/matchmaker

print-go-version:
	@go version

build-pkgs: print-go-version
	GOGC=off GOBIN=$$PWD/bin \
	go build -v \
		-tags='${BUILDTAGS}' \
		-gcflags='-e' \
		-ldflags='-X "github.com/horizon-games/OpenSky/matchmaker/config.GITBRANCH=$(GITBRANCH)" -X "github.com/horizon-games/OpenSky/matchmaker/config.GITCOMMIT=$(GITCOMMIT)" -X "github.com/horizon-games/OpenSky/matchmaker/config.GITCOMMITAUTHOR=$(GITCOMMITAUTHOR)" -X "github.com/horizon-games/OpenSky/matchmaker/config.GITCOMMITDATE=$(GITCOMMITDATE)" -X "github.com/horizon-games/OpenSky/matchmaker/config.VERSION=$(VERSION)"' \
		./...
