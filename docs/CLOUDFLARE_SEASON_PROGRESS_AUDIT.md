# Cloud Weasel season-progress audit

The source API defines a season level as
`SkypassSeasonStat.LevelProgress()`: the highest account level achieved during
that season minus the immutable account level at first participation. It is
not the lifetime account level and it is zero-based even though Cloud Weasel's
identity profile storage is one-based.

`pnpm check:cloudflare:season-progress` is part of the complete release
contract. It inventories all executable Go consumers of `LevelProgress()` and
requires evidence for the corresponding TypeScript/D1 projections:

- account and match-start account payloads;
- match, tutorial, rank-up, and quest EXP rewards;
- SkyPass earned levels and `progress + 1` infinite-reward materialization.

The audit fails when a new source consumer appears, a reviewed call count or
evidence token changes, or a TypeScript response directly substitutes a
lifetime `level`/quest `after_level` for `seasonLevel` or `currentLevel`.
Runtime tests still prove the numeric behavior, including a multi-quest batch
whose lifetime account level starts at ten while its source season baseline is
nine. The static inventory prevents a new response path from bypassing those
tests unnoticed.
