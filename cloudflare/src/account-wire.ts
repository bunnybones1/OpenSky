import type { Account } from '@opensky/proto'

// CrystalGetter in the source service uses this exact priority table when it
// decorates accounts. Keep the SQL projection shared so profile and
// leaderboard reads cannot disagree about which off-chain crystal is active.
export const SOURCE_CRYSTAL_PRIORITY_SQL = `CASE crystal.token_id
  WHEN 7 THEN 1
  WHEN 1 THEN 2
  WHEN 2 THEN 3
  WHEN 3 THEN 4
  WHEN 8 THEN 5
  WHEN 4 THEN 6
  WHEN 5 THEN 7
  WHEN 6 THEN 8
  ELSE 9
END`

export const sourceCrystalIDSQL = (userIDExpression: string): string => `(
  SELECT crystal.token_id
  FROM player_items crystal
  WHERE crystal.user_id = ${userIDExpression}
    AND crystal.item_type = 'SW_CRYSTALS'
    AND crystal.balance > 0
  ORDER BY ${SOURCE_CRYSTAL_PRIORITY_SQL}, crystal.token_id
  LIMIT 1
)`

// The generated TypeScript declarations model RIDL pointers as optional
// properties, but encoding/json emits every Account field because the Go
// struct does not use omitempty. Nested AccountStats and AccountSettings keep
// their own source omitempty behavior.
export const sourceAccountWire = (account: Account): Account =>
  ({
    id: account.id,
    address: account.address,
    name: account.name,
    locale: account.locale,
    createdAt: account.createdAt ?? null,
    updatedAt: account.updatedAt ?? null,
    experience: account.experience,
    warmUps: account.warmUps,
    level: account.level,
    seasonLevel: account.seasonLevel,
    levelUpXP: account.levelUpXP,
    stats: account.stats ?? null,
    region: account.region ?? null,
    tagArtID: account.tagArtID ?? null,
    crystalID: account.crystalID ?? null,
    titleID: account.titleID ?? null,
    settings: account.settings ?? null,
    invitedBy: account.invitedBy ?? null,
    isBurnerWallet: account.isBurnerWallet ?? null
  }) as unknown as Account
