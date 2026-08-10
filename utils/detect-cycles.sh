#!/usr/bin/env bash
(cd ./game && pnpm exec dpdm -T src/index.ts)
(cd ./webapp && pnpm exec dpdm src/index.ts)
