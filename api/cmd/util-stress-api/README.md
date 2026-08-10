Stress testing utility for OpenSky-API
========================================

## Usage

$ `cd cmd/util-stress-api`
$ `go run . -config=../../etc/opensky-api.conf -run=ping -n 1000 -c 200`
$ `go run . -config=../../etc/opensky-api.conf -run=matchrecords -n 1000 -c 200`

etc.


## Notes

* the timing isn't fully correct as it should only measure server processing time but it includes
all of the client side requests -- however, as a stress tool it works just fine to blast the api server.


## Other

You can also try a stress testing tool like `hey` which is pretty cool but the arguments don't seem to work.

hey -m POST -H "Content-Type: application/json" \
  -H "Authorization: BEARER eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzZXJ2aWNlIjoic3RyZXNzIn0.wOpjIngyHrIRABYtirn5bCiM6uZ65La1rfhDHnsoTeE" \
  -d '{"matchID": 123, "index": 1, "jsonStringData": "asdklfjasldkfklasdjfkl;asdfkl;asjdflk;ajsdfkl;jasdflk;jasdfkl;jaskld;fjaskl;dfjaslk;dfjlaks;dfjlka;sdfjlk;asfd"}' \
  -t 20 -c 10 \
  https://local.0xhorizon.net:1337/rpc/SkyWeaverAPI/InternalAppendMatchArchiveRecords
