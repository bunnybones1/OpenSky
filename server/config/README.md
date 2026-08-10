OpenSky/game-server config
============================

## server

Game-server API access by other internal services (ie. matchmaker)

* `host` - server host to bind
* `port` - server port to listen
* `jwtSecret` - JWT secret used for matchmaker service to communicate to the game-server.
* `accountMnemonic` - Ethereum private mnemonic used by game-server to notarize a SW match. This account does not contain any $ETH or other currencies, its just a signing account.

## logging

Game-server Logging

* `service` - the name of the service we include in the log output
* `level` - minimum log-level to record, default: info
* `json` - format json logs in json format, which also included extra details
* `concise` - concise output format used for local dev mode


## redis

Game-server uses redis to coordinate between multiple game-servers running in parallel

* `host` - redis service host
* `port` (default:6379) - redis service port


## openskyAPI

Authentication for the OpenSky-API service.

* `apiServiceToken` - privileged JWT client token for writing to the OpenSky-api service to record things such as a match history.
* `apiServiceAddress` - OpenSky-api URL.


## settings
    

| Key 	| default 	| details 	|
|-	|-	|-	|
| worker.maxThreadCount 	| 100 	| the max number of worker threads allowed to be running,  	|
| worker.minThreadPoolSize 	| 8 	| base number of worker threads in the thread pool, these threads are not terminated due to inactivity.<br>this is typically the # of CPU cores * 2 	|
| worker.maxMatchesPerThread 	| 5 	| the max number of matches that a worker thread is allowed to host at any given time 	|
| worker.threadInactiveTimeoutMs 	| 60000 	| thread inactivity timeout in milliseconds, inactive threads will be terminated after inactivity period.<br>(this does not apply to threads created in the initial thread pool) 	|
| abandonTimeout 	| 180000 	| time period a client is disconnected before considered they've abandoned, measured in milliseconds. 	|
| turnExpiryEnabled 	| true 	| whether turn timer is enabled 	|
| turnExtendable 	| true 	| whether turn timer expiry is extendable from applying actions 	|
| turnExpiry 	| 60000 	| per turn timer in milliseconds 	|
| turnExtension 	| 5000 	| turn timer extensions in milliseconds  	|
| commitRevealFirstExpiry 	| 30000 	| the first commit reveal expiry duration in milliseconds. <br>This is typically triggered on match start, when one player is not available for exchange 	|
| commitRevealExpiry 	| 3000 	| regular commit reveal expiry duration in milliseconds.<br>This is triggered during matches, when one player is not available for exchange 	|
| matchRecords.enabled 	| false 	| whether to enable match log recording 	|
| matchRecords.bufferSize 	| 100 	| the number of events the game server is buffering in memory before sending to the API to create a new log index.json 	|
| AbandonPenaltyWindowSeconds 	| 86400 	| the duration in which AFK abandons are tallied for a user, in seconds (default is 24 hours) <br>AFK abandon count is reset afterwards 	|
| AbandonInactiveTurnMax 	| 0 	| the max number of turns a player is inactive before it triggers an abandon condition<br>(any turn in which the player does not commit a valid gameplay action is considered an inactive turn) 	|
| AbandonPenalty 	| [0,0,0,0] 	| penalty array indicating the cooldown period in seconds before the player can be matched in matchmaker<br>value is picked from the array based on the number of abandons in the current abandon window 	|
| cheats 	| false 	| allow cheats in multiplayer games (on by default in DEV environments only) 	|
| chat 	| false 	| allow secret dev chat (on by default in dev & staging environments only) |
