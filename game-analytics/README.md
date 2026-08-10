### Game Analytics

## Local Testing

In order to run the game analytics match processor locally on a test match, execute `pnpm run gen-card-analytics {match-id}`, passing in the a recent matchID from a production match. Make sure you have a valid jwt for the api in the secrets folder locally.

If you get `webrpc unauthenticated error: unauthorized` error, you have a bad JWT. (grab an updated one from local storage in play.skyweaver.net)

If you get `webrpc not found error: match not found`, you forgot to pass a matchID as an argument.

If you see `Replay version miss-match, skipping...`, then you are trying to read a match that is too old, and a prod deploy with new state code has been deployed since that match.
