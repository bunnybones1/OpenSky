# Matchmaker

The matchmaker is the service that pairs players against other players and
initiates matches between them.

For the full local game stack, start with [`../docs/LOCAL_PLAY.md`](../docs/LOCAL_PLAY.md).

## Running the service

In order to run the matchmaker for development you can use the `run` target
provided by the `Makefile`:


```
make run
```

The matchmaker depends on Game Server, API and Redis. You can run a redis
server for development with `make docker-redis`.

If you'd like to run the matchmaker without the intention of actively
developing on it, you could use Docker Compose as a starting point:

```
docker compose up matchmaker
```

## Design

The service design is inspired by [Open Match](https://open-match.dev/site/docs/guides/matchmaker/#game-services-architecture)
concept, so it would be easy to start using it in the future.

**Main components:**

- frontend - `matchmaker/lib/frontend`
- director - `matchmaker/lib/director`
- matching - `matchmaker/lib/matchmaker/matching`
- matchmaker - `matchmaker/lib/matchmaker`

### Frontend

Frontend handles a communication between the service and a client (webapp).

**Main responsibilities:**
 
- Upgrade HTTP request to a websocket connection allowing two-way communication.
- Handle incoming messages from the client.
- Validate `find_match` command.
- Listen and react on player's events.
- Send messages to the client.

### Director

Director is a set of runners periodically asking for match proposals and processing them.

**Main responsibilities:**

- Call matchmaker backend for new match proposals.
- Call matchmaker backend for accepted match proposals.
- Call OpenSky API about a start of a new match.
- Find available game server.
- Initiate the match on the game server.
- Call matchmaker backend with the match info.

### Matching (a.k.a. "match function" in Open Match)

Matching is a set of matchers called by matchmaker to find and pair players into a match proposal.

**Main responsibilities:**

- Validate candidates eligible to be paired together.
- Find the best pair based on match quality.
- Pair with a bot.

### Matchmaker

It is a composition of 4 services which can be either partly or fully implemented as custom solution or replaced
by the 3rd party service like Open Match.

- frontend service
- backend service
- query service
- status service

#### Frontend service

Processes operations called by Frontend.

**Main responsibilities:**

- Add a player to the queue waiting to find a match.
- Accept the match by the player.
- Decline the match by the player.

#### Backend service

Processes operations called by Director.

**Main responsibilities:**

- Find match proposals based on parameters by either calling Matching or listing the match proposals from the queue.
- Release the player by adding back to the queue when an issue happens in Director.
- Notify players and set acceptance timeout when the math proposal is found.
- Remove the player from the queue when the match proposal is found.
- Notify players and deleted match proposal when the match is made.

### Query service

It is called by Matching to provide a list of players in the queue.

**Main responsibilities:**

- Provide the list of players in the queue based on parameters.

#### Status service

Provides information about a state of queues, game servers and configuration.

## REST endpoints

- /
- /ping
- /matchinfo/{playerID}
- /status
- /metrics

## Client commands

### `find_match` command

The `find_match` command signals the intention of a player to join a queue
determined by the game mode.

```
{
  "type": "find_match",
  "privateSeed": {
    "cards": [],
    "prisms": ["str", "wis"],
    "player": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    "subkey": [39, 241, 103, 203, 25, 159, 160, 48, 4, 57, 217, 136, 141, 252, 161, 9, 255, 201, 27, 38],
    "signature": [0, 5, 2, 3, 89, 106, 249, 12, 236, 219, 249, 167, 104, 136, 110, 119, 17, 120, 253, 85, 97, 221, 39, 171, 0, 93, 0, 1, 0, 1, 6, 174, 76, 48, 15, 26, 54, 114, 253, 21, 132, 88, 128, 110, 88, 232, 121, 143, 174, 65, 217, 47, 64, 162, 228, 33, 108, 184, 173, 153, 210, 187, 111, 115, 29, 130, 154, 28, 14, 122, 208, 246, 227, 253, 215, 213, 153, 204, 224, 164, 11, 65, 177, 249, 65, 111, 122, 166, 227, 4, 248, 185, 89, 62, 28, 2, 1, 1, 197, 10, 222, 173, 183, 254, 21, 190, 228, 93, 203, 130, 6, 16, 205, 237, 205, 49, 78, 176, 3, 1, 3, 117, 153, 78, 131, 182, 123, 27, 165, 128, 144, 73, 57, 104, 57, 0, 206, 227, 225, 123, 88, 0, 2, 216, 119, 122, 201, 174, 35, 161, 90, 228, 108, 63, 11, 246, 2, 15, 34, 255, 220, 20, 168, 81, 22, 53, 156, 10, 167, 150, 208, 14, 162, 153, 34, 33, 66, 240, 59, 71, 217, 162, 154, 187, 60, 111, 199, 94, 167, 143, 180, 171, 126, 152, 248, 80, 27, 62, 20, 183, 245, 195, 112, 35, 160, 115, 243, 27, 2, 1, 2, 198, 237, 74, 81, 28, 174, 30, 186, 223, 155, 5, 249, 182, 148, 89, 233, 254, 169, 184, 221],
    "randomSeed": [237, 248, 180, 216, 50, 69, 188, 121, 54, 91, 180, 198, 85, 22, 139, 224],
    "cardRarities": {}
  },
  "versionHash": "dev",
  "mode": "RANKED_CONSTRUCTED"
}
`
```

If the message contains valid data, the player is pushed into a waiting pool.

### `accept_match` command

The `accept_match` command signals the intention of a player to accept a match
against another user.

```
{
  "type": "accept_match",
  "playerID": "0x0000000000000000000000000000000000000002"
}
```

In order to begin a match, both players have to accept the match, otherwise the
match will time-out. In CONQUEST mode, however, matches are auto-accepted
before timing-out.

### `decline_match` command

The `decline_match` command signals the intention of a player to decline a match
against another user.

```
{
  "type": "decline_match",
  "playerID": "0x0000000000000000000000000000000000000002"
}
```
