# Matchmaker TypeScript port ledger

This package ports behavior from the Go `matchmaker` component without changing
the client wire contract or combining it with the game server.

| TypeScript module | Go source oracle |
| --- | --- |
| `src/model.ts` | `matchmaker/lib/player`, `matchmaker/lib/mappings` |
| `src/quality.ts` | `matchmaker/lib/matchmaker/matching/matchers/matchquality` |
| `src/criteria.ts` | `matchmaker/lib/matchmaker/matching/matchers/matchvalidators` |
| `src/matcher.ts` | `player_combinator.go`, `pvp_match_matcher.go`, `match_proposal.go` |

Tests intentionally reproduce boundary values from the corresponding Go tests.
Runtime-specific queue, WebSocket, persistence, and director adapters are kept
outside these pure modules and must pass these tests before deployment.
