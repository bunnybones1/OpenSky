SHELL             = bash -o pipefail
TEST_FLAGS        ?= -v
# MOD_VENDOR        ?= -mod=vendor

PG_HOST           ?= 127.0.0.1
PG_PASSWORD       ?= postgres
PG_USER           ?= postgres
PG_DATABASE       ?= opensky
PG_VERSION        ?= 13

TEST_SEQUENCE			?=
TPARSE_OPTIONS			?= '-follow'

TOP := $(shell dirname $(realpath $(lastword $(MAKEFILE_LIST))))

CONFIG         ?= $(TOP)/etc/opensky-api.conf

GITTAG          ?= $(shell git describe --exact-match --tags HEAD 2>/dev/null || :)
GITBRANCH       ?= $(shell git rev-parse --abbrev-ref HEAD 2>/dev/null || :)
LONGVERSION     ?= $(shell git describe --tags --long --abbrev=8 --always HEAD)$(echo -$GITBRANCH | tr / - | grep -v '\-master' || :)
VERSION         ?= $(if $(GITTAG),$(GITTAG),$(LONGVERSION))
GITCOMMIT       ?= $(shell git log -1 --date=iso --pretty=format:%H)
GITCOMMITDATE   ?= $(shell git log -1 --date=iso --pretty=format:%cd)
GITCOMMITAUTHOR ?= $(shell git log -1 --date=iso --pretty="format:%an")

export PG_HOST
export PG_PASSWORD

all:
	@echo "*****************************************************************"
	@echo "**                 OpenSky API Build Tool                      **"
	@echo "*****************************************************************"
	@echo "make <cmd>"
	@echo ""
	@echo "commands:"
	@echo ""
	@echo " + Development:"
	@echo "   - bootstrap"
	@echo "   - run"
	@echo ""
	@echo "   - test"
	@echo "   - test-api"
	@echo "   - test-pkgs"
	@echo "   - test-data"
	@echo "   - test-e2e"
	@echo ""
	@echo "   - run-test-data"
	@echo "   - run-test-e2e"
	@echo ""
	@echo "   - lint"
	@echo ""
	@echo " + Builds:"
	@echo "   - build"
	@echo "   - clean"
	@echo "   - generate"
	@echo ""
	@echo "   - build-api"
	@echo ""
	@echo "   - build-utils"
	@echo "   - build-util-goose"
	@echo ""
	@echo "   - dist"
	@echo "   - docs"
	@echo "   - todo"
	@echo ""
	@echo "   - proto"
	@echo "   - proto-clean"
	@echo ""
	@echo " + Dep management:"
	@echo "   - dep-upgrade-all"
	@echo ""
	@echo ""
	@echo " + Database stuff:"
	@echo "   - db-reset"
	@echo "   - db-create"
	@echo "   - db-drop"
	@echo "   - db-status"
	@echo "   - db-up"
	@echo "   - db-down"
	@echo "   - db-update-schema"
	@echo ""


##
## Development
##
bootstrap: copy-sample-config db-reset db-up

copy-sample-config:
	for i in opensky-api; do \
		test -f ./etc/$$i.conf || cp ./etc/$$i.conf{.sample,}; \
	done

define run
	@go run github.com/VojtechVitek/rerun/cmd/rerun -watch ./ -ignore vendor bin tests data/schema -run \
		sh -c 'GOGC=off go build -o ./bin/$(1) ./cmd/$(1)/main.go && ./bin/$(1) -config=etc/$(2).conf'
endef

run:
	$(call run,opensky-api,opensky-api)

run-worker:
	$(call run,opensky-worker,opensky-api)

compose-run:
	$(call run,opensky-api,opensky-api.compose)

compose-run-worker:
	$(call run,opensky-worker,opensky-api.compose)

test-ci:
	@export TPARSE_OPTIONS='-follow -smallscreen -nocolor' && \
	$(MAKE) test

test:
	export PG_DATABASE=opensky_test && \
	export CONFIG=$(TOP)/etc/opensky-api.test.conf && \
	($(MAKE) db-drop || exit 0) && \
	$(MAKE) db-create db-up && \
	go clean -testcache && \
	$(MAKE) -j1 \
		test-all

test-sequence:
	go clean -testcache && \
	TEST_SEQUENCE=1 $(MAKE) test

test-unit:
	@set -o pipefail && go test -failfast -cover -json ./... | go run github.com/mfridman/tparse $(TPARSE_OPTIONS)

test-all:
	@set -o pipefail && go test -failfast -cover -json -p=1 ./... -tags=integration | go run github.com/mfridman/tparse $(TPARSE_OPTIONS)


define run-test
	go run github.com/VojtechVitek/rerun/cmd/rerun -watch ./ -ignore vendor bin cmd tests/e2e/_testdata -run sh -c 'go test -failfast -v $(MOD_VENDOR) -run=$(TEST) $(1)'
endef

run-test-data:
	$(call run-test, ./tests/data)

run-test-e2e:
	$(call run-test, ./tests/e2e)

run-corsproxy-opensky:
	go run github.com/goware/corsproxy -source=https://api.skyweaver.net -listen=1337

.PHONY: lint
lint:
	@docker run -t --rm -v $(shell dirname $(TOP)):/app -v ~/.cache/golangci-lint/v1.54.2:/root/.cache -w /app golangci/golangci-lint:v1.54.2 golangci-lint run api/...

##
## Builds
##
define build
	GOGC=off GOBIN=$$PWD/bin \
	go install -v \
	  $(MOD_VENDOR) \
		-tags='$(BUILDTAGS)' \
		-gcflags='-e' \
		-ldflags='-X "github.com/horizon-games/OpenSky/api.VERSION=$(VERSION)" -X "github.com/horizon-games/OpenSky/api.GITBRANCH=$(GITBRANCH)" -X "github.com/horizon-games/OpenSky/api.GITCOMMIT=$(GITCOMMIT)" -X "github.com/horizon-games/OpenSky/api.GITCOMMITDATE=$(GITCOMMITDATE)" -X "github.com/horizon-games/OpenSky/api.GITCOMMITAUTHOR=$(GITCOMMITAUTHOR)"' \
		$(1)
endef

print-go-version:
	@go version

build: print-go-version build-utils build-opensky-api-server build-opensky-worker

build-opensky-api-server:
	$(call build, ./cmd/opensky-api)

build-opensky-worker:
	$(call build, ./cmd/opensky-worker)

build-gm-cli:
	$(call build, ./cmd/opensky-gm-cli)

build-utils: build-util-goose

build-util-goose:
	$(call build, ./cmd/util-goose)

build-pkgs: print-go-version
	GOGC=off GOBIN=$$PWD/bin \
	go build -i -v \
	  $(MOD_VENDOR) \
		-tags='$(BUILDTAGS)' \
		-gcflags='-e' \
		-ldflags='-X "github.com/horizon-games/OpenSky/api.VERSION=$(VERSION)" -X "github.com/horizon-games/OpenSky/api.GITBRANCH=$(GITBRANCH)" -X "github.com/horizon-games/OpenSky/api.GITCOMMIT=$(GITCOMMIT)" -X "github.com/horizon-games/OpenSky/api.GITCOMMITDATE=$(GITCOMMITDATE)" -X "github.com/horizon-games/OpenSky/api.GITCOMMITAUTHOR=$(GITCOMMITAUTHOR)"' \
		./...

generate:
	go generate ./...

clean:
	rm -rf ./bin/*

dist: BUILDTAGS += production
dist: clean generate build

docs:
	@echo "TODO"

todo:
	@git grep TODO -- './*' ':!./vendor/' ':!./Makefile' || :

.PHONY: proto
proto: proto-clean
	go generate ./proto/... && \
	cp ./proto/opensky-api.gen.ts ../lib/proto/src/index.ts

proto-clean:
	rm -f ./proto/*.gen.go

.PHONY: analytics
analytics:
	go generate ./lib/analytics
	cp ./lib/analytics/analytics.gen.ts ../lib/analytics/src/analytics.gen.ts


##
## Dependency mgmt
##

# update ./vendor folder
.PHONY: vendor
vendor:
	@echo "Hi there! vendoring on OpenSky/api is now disabled, you can just use normal go modules."
#vendor:
#	@go mod tidy && \
#		rm -rf ./vendor && \
#		go mod vendor && \
#		go run github.com/goware/modvendor -copy="**/*.c **/*.h **/*.s **/*.proto"

# upgrade all go modules in go.mod to latest
dep-upgrade-all:
	@go get -u=patch



##
## Repo health checks
##
repository-check: large-file-check goimports-check

large-file-check:
	@find . -not -iname '*/.git/*' -name '*' -size +2048k -exec du -hs {} \; | grep '.*' && { echo; echo "Aborting due to big files in the git repository."; exit 1; } || :

goimports-check:
	@go run golang.org/x/tools/cmd/goimports -d $(shell find . -type f -name '*.go' -not -path "./vendor/*") | grep '.*' && { echo; echo "Aborting due to non-empty goimports output."; exit 1; } || :

clang-format-check:
	@which clang-format 2>/dev/null || echo "Get clang-format https://clang.llvm.org/docs/ClangFormat.html"
	@clang-format -i -style=LLVM $(shell find . -type f -name '*.proto' -not -path "./vendor/*")

##
## Database stuff
##
db-reset:
	@env PGPASSWORD=$(PG_PASSWORD) PG_USER=$(PG_USER) PG_HOST=$(PG_HOST) ./scripts/db.sh import $(PG_DATABASE) ./data/schema/init.sql
	@$(MAKE) db-up

db-reset-test:
	export PG_DATABASE=opensky_test && \
		export CONFIG=$(TOP)/etc/opensky-api.test.conf && ($(MAKE) db-drop || exit 0) && $(MAKE) db-create db-up

db-import:
	@env PGPASSWORD=$(PG_PASSWORD) PG_USER=$(PG_USER) PG_HOST=$(PG_HOST) ./scripts/db.sh import $(PG_DATABASE) ./opensky_dump.sql
	@$(MAKE) db-up

db-create:
	@env PG_USER=$(PG_USER) ./scripts/db.sh create $(PG_DATABASE)

db-drop:
	@env PG_USER=$(PG_USER) ./scripts/db.sh drop $(PG_DATABASE)

db-status: build-util-goose
	@./bin/util-goose -config=$(CONFIG) status

db-up: build-util-goose
	@./bin/util-goose -config=$(CONFIG) up

db-down: build-util-goose
	@./bin/util-goose -config=$(CONFIG) down

db-update-schema:
	@PGPASSWORD=$(PG_PASSWORD) pg_dump -U${PG_USER} -h$(PG_HOST) $(PG_DATABASE) --schema-only  --no-owner --no-acl --no-comments | cat > ./data/schema/schema.sql
	@PGPASSWORD=$(PG_PASSWORD) psql -U${PG_USER} -h$(PG_HOST) $(PG_DATABASE) -c "UPDATE goose_db_version SET tstamp = '2018-01-01 00:00:00'" &>/dev/null
	@PGPASSWORD=$(PG_PASSWORD) pg_dump -U${PG_USER} -h$(PG_HOST) $(PG_DATABASE) --data-only --table=goose_db_version --column-inserts | grep -v -e '^--' | cat >> ./data/schema/schema.sql

# This PostgreSQL container is of the same version provided by GCE.
docker-postgresql:
	(docker rm -f postgres || exit 0) && \
	docker run \
	 	-d \
	 	--name postgres \
		-e POSTGRES_DB=opensky \
		-e POSTGRES_PASSWORD=postgres \
		-p 0.0.0.0:5432:5432 \
		postgres:$(PG_VERSION)
