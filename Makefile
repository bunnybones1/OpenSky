SHELL             = bash -o pipefail
TEST_FLAGS        ?= -v
LOCAL_SEQUENCEJS  ?= 0

RED:=$(shell tput setaf 1)
GREEN:=$(shell tput setaf 2)
BOLD:=$(shell tput bold)
UNDERLINE:=$(shell tput smul)
RESET:=$(shell tput sgr 0)

define check-service-repo
	@if [ ! -d $(2) ]; then \
		echo "$(1) will not run: $(2) repository does not exist"; \
	else \
			if [ ! -f $(3) ]; \
				then \
					echo "$(1)	will not run: compose config	$(3) does not exist"; \
			fi; \
		fi;

endef

.PHONY: check-service-repos
check-service-repos:
	$(call check-service-repo, "OpenSky API", ./, ./api/etc/opensky-api.compose.conf)
	$(call check-service-repo, "OpenSky Worker", ./, ./api/etc/opensky-api.compose.conf)
	$(call check-service-repo, "OpenSky Game", ./, ./game/config/game.compose.json)
	$(call check-service-repo, "OpenSky Matchmaker", ./, ./matchmaker/etc/matchmaker.compose.conf)
	$(call check-service-repo, "OpenSky Game Server", ./, ./server/config/game-server.compose.json)
	$(call check-service-repo, "OpenSky Webapp", ./, ./webapp/config/webapp.compose.json)

.PHONY: build
build:
	./utils/build.sh

.PHONY: docker-build
docker-build:
	@sudo docker-compose build

.PHONY: run
run: check-service-repos
	@(export USE_LOCAL_SEQUENCEJS=${LOCAL_SEQUENCEJS}; sudo --preserve-env=USE_LOCAL_SEQUENCEJS docker-compose up -d)
	@echo
	@echo -e "Your stack is running at:		${RED}${BOLD}https://local.0xhorizon.net/${RESET}"
	@echo -e "		  wallet:		${RED}${BOLD}https://local-wallet.0xhorizon.net/${RESET}"
	@echo
	@echo -e "${BOLD}${UNDERLINE}'compose'${RESET}${UNDERLINE} configs are being used, not 'local'!${RESET}"
	@echo
	@echo -e "container logs:				${GREEN}${BLACKBG}${BOLD}https://logs.0xhorizon.net/${RESET}"
	@echo -e "web interface to database:		${GREEN}${BLACKBG}${BOLD}https://db.0xhorizon.net/${RESET}"
	@echo -e "routing dashboard:			${GREEN}${BLACKBG}${BOLD}https://dash.0xhorizon.net/${RESET}"
	@echo -e "cors-everywhere:			${GREEN}${BLACKBG}${BOLD}https://cors-everywhere.0xhorizon.net/${RESET}"
	@echo
	@echo if logs for a container are missing go to settings and enable "show stopped containers"
	@echo to stop entire stack run \'make stop\'
	@echo to run wallet with you local sequence.js use \'LOCAL_SEQUENCEJS=1 make run\'
	@echo
	@echo -e "${BOLD}no databases were created${RESET}"
	@echo use \'make reset-dbs\' to create/wipe local OpenSky databases.
	@echo

.PHONY: stop
stop:
	@sudo docker-compose down

.PHONY: restart
restart: stop run

.PHONY: reset-dbs
reset-dbs: reset-confirmation
	@make -C api db-reset
	@echo
	@echo databases created/wiped
	@echo run \'make restart\' to make sure services reconnected

.PHONY: reset-confirmation
reset-confirmation:
	@echo -en "This is going to wipe local OpenSky database.\nAre you sure? [y/N] " && read ans && [ $${ans:-N} = y ]

.PHONY: golang-lint
golang-lint:
	@make -C api lint
	@make -C draft lint
	@make -C matchmaker lint

.PHONY: cors-anywhere
cors-anywhere:
	docker run -d \
		--name cors-anywhere \
		--dns 1.1.1.1 \
		-p 127.0.0.1:8080:8080 \
		redocly/cors-anywhere
