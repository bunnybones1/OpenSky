OpenSky API Server
====================

For the full local game stack, start with [`../docs/LOCAL_PLAY.md`](../docs/LOCAL_PLAY.md).

## Usage

1. Install Go v1.18+
2. Install Postgres v14+ and have it running
3. Copy etc/opensky-api.conf.sample etc/opensky-api.conf
4. Create db instance, `make db-create`; `make db-reset`
5. `make run` to run the server

**Rebuild the database:** `make db-reset`

**Run db migrations:** `make db-up`

**Starting API service in dev-mode:** `make run` and, if you need background jobs, `make run-worker` in a separate terminal

## Testing

Common functionality and helpers are located in `apitest` package. This also handles truncating DB and setting up API client and server.

`Make` command `test-unit` runs all unit tests only, `test-all` runs all unit and integration tests.

Each integration test file **SHOULD** be called `SOMETHING_integration_test.go` for better recognition.

Each integration test file **SHOULD** contain a tag info at the top of the file before the package name so it gets executed only when go test or go build commands are called with `tags -integration`.
This allows us to trigger only unit tests when we want, and to track total coverage from all tests when all tests are triggered.

```go
//go:build integration
```

When running integration tests in multiple packages at once, it is important to use `-p=1` flag,
otherwise packages are built in parallel. It would cause random failures because of missing DB data, because each package containing integration tests would truncate DB and such disrupt data for other tests.

## Notes

### Updating skypass rewards

e.g. command that populates the skypass on dev6 with values from the google document, for season 19

change the target server and season accordingly

```
curl --request POST \
  --url https://dev6-api.skyweaver.net/rpc/SkyWeaverAPI/GMUpdateSkypassRewards \
  --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2NvdW50IjoiMHhlOTkzZWI2ZGYyZGQ4ZGY3N2EzZGJiMDM1Zjg4Y2ZjMGI2OWY2NTI2IiwiYXBwIjoiU2t5d2VhdmVyIiwiZXhwIjoxNzExNjQ3MjAxLCJpYXQiOjE2ODAxMTEyMDIsIm9nbiI6Imh0dHBzOi8vZGV2Ni5za3l3ZWF2ZXIubmV0In0.Z-2jpPXqowEeIr38iLdOz_uESxrjXdfmX1u0pTgAKdg' \
  --header 'Content-Type: application/json' \
  --cookie __cf_bm=EKYcfJm2CL1Ike_Wm.8ekdemUcKDSEN0H8Mmcxe3xlU-1680111157-0-Ac9YTpmTIWEgd1%2BdNTGaWTh5HxGnlm2IUgSkUbVLxbr7nPvX9ueQiNLGnEcV%2FAFenE1uryI2wcC1W9cxY0GBSEQ%3D \
  --data '{
    "season":19,
    "url": "https://docs.google.com/spreadsheets/d/e/2PACX-1vSy-v-Mj-BrxPRSJBIL3RhK_NYSDZzAI2B56Enm9bq3XOfbjVYriAs3g3HAYxc2RxTbApM_atmWE4w3/pub?gid=1232173062&single=true&output=csv"
}'
```
