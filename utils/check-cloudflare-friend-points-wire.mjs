import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const structBody = (source, name) =>
  source.match(new RegExp(`type ${name} struct \\{([\\s\\S]*?)\\n\\}`))?.[1]

const publicStructFields = body =>
  body
    ? [...body.matchAll(/^\s*(\w+)\s+([^`]+)`[^`]*json:"([^"]+)"[^`]*`/gm)]
        .map(match => ({
          name: match[1],
          type: match[2].trim(),
          json: match[3].split(',')[0],
          omitEmpty: match[3].split(',').includes('omitempty')
        }))
        .filter(value => value.json !== '-')
    : []

const field = (name, type, json) => ({
  name,
  type,
  json,
  omitEmpty: false
})

const section = (source, start, end) => {
  const startIndex = source.indexOf(start)
  const endIndex = source.indexOf(end, startIndex + start.length)
  if (startIndex < 0) return ''
  return source.slice(
    startIndex,
    endIndex > startIndex ? endIndex : source.length
  )
}

const compact = value => value.replace(/\s+/g, ' ')

export const friendPointsWireErrors = (
  generatedSource,
  rpcSource,
  levelsSource,
  accountSource,
  itemSource,
  wireSource,
  socialSource,
  apiSource,
  packageSource
) => {
  const errors = []
  const expectedAccount = [
    field('ID', 'AccountID', 'id'),
    field('Address', 'Hash', 'address'),
    field('Name', 'string', 'name'),
    field('Locale', 'string', 'locale'),
    field('CreatedAt', '*time.Time', 'createdAt'),
    field('UpdatedAt', '*time.Time', 'updatedAt'),
    field('Experience', 'uint64', 'experience'),
    field('WarmUps', 'uint8', 'warmUps'),
    field('Level', 'uint16', 'level'),
    field('SeasonLevel', 'uint16', 'seasonLevel'),
    field('LevelUpXP', 'uint64', 'levelUpXP'),
    field('Stats', '*AccountStats', 'stats'),
    field('Region', '*Region', 'region'),
    field('TagArtID', '*string', 'tagArtID'),
    field('CrystalID', '*uint64', 'crystalID'),
    field('TitleID', '*uint64', 'titleID'),
    field('Settings', '*AccountSettingsWrapper', 'settings'),
    field('InvitedBy', '*Hash', 'invitedBy'),
    field('IsBurnerWallet', '*bool', 'isBurnerWallet')
  ]
  if (
    JSON.stringify(
      publicStructFields(structBody(generatedSource, 'Account'))
    ) !== JSON.stringify(expectedAccount)
  ) {
    errors.push('source Account JSON contract changed')
  }

  const expectedFriendPoints = [
    field('Account', '*Account', 'account'),
    field('Season', 'uint16', 'season'),
    field('Levels', 'uint64', 'levels'),
    field('Points', 'uint64', 'points'),
    field('PointsSpent', 'uint64', 'pointsSpent')
  ]
  if (
    JSON.stringify(
      publicStructFields(structBody(generatedSource, 'FriendPoints'))
    ) !== JSON.stringify(expectedFriendPoints)
  ) {
    errors.push('source FriendPoints JSON contract changed')
  }

  const generatedFriendRoute = section(
    generatedSource,
    'func (s *skyWeaverAPIServer) serveGetFriendPointsJSON(',
    'func (s *skyWeaverAPIServer) serveGetPointsGifted('
  )
  for (const token of [
    'Ret0 uint64          `json:"total"`',
    'Ret1 []*FriendPoints `json:"friends"`',
    'respContent := struct',
    '}{ret0, ret1}',
    'json.Marshal(respContent)'
  ]) {
    if (!generatedFriendRoute.includes(token)) {
      errors.push(`generated GetFriendPoints wrapper changed: ${token}`)
    }
  }
  const generatedGiftedRoute = section(
    generatedSource,
    'func (s *skyWeaverAPIServer) serveGetPointsGiftedJSON(',
    'func (s *skyWeaverAPIServer) serveGetStickers('
  )
  for (const token of [
    'Ret0 uint64   `json:"total"`',
    'Ret1 *Account `json:"inviter"`',
    'respContent := struct',
    '}{ret0, ret1}',
    'json.Marshal(respContent)'
  ]) {
    if (!generatedGiftedRoute.includes(token)) {
      errors.push(`generated GetPointsGifted wrapper changed: ${token}`)
    }
  }

  const friendRPC = section(
    rpcSource,
    'func (s *Server) GetFriendPoints(',
    'func (s *Server) GetPointsGifted('
  )
  for (const token of [
    's.validateAccountAndGetAddress(ctx, &address)',
    'season := data.CurrentSeason()',
    'GetFriendsList(accountID, season)',
    'GetStickerPoints(accountID)',
    'FindHighestCostAwardedSticker(accountID, season)',
    'stickerPoints += highestCostAwardedSticker.RequiredPoints',
    'return stickerPoints, friends, nil'
  ]) {
    if (!friendRPC.includes(token)) {
      errors.push(`source GetFriendPoints behavior changed: ${token}`)
    }
  }
  const giftedRPC = section(
    rpcSource,
    'func (s *Server) GetPointsGifted(',
    '__end_of_friend_points_rpc__'
  )
  for (const token of [
    's.validateAccountAndGetAddress(ctx, &address)',
    'repo.Accounts().FindByID(accountID)',
    'if account.InvitedByID == nil {',
    'return 0, nil, nil',
    'repo.Accounts().FindByID(*account.InvitedByID)',
    'FindByAccountIDAllSeasons(account.ID)',
    'total += level.Levels',
    'return total, inviter.Account, nil'
  ]) {
    if (!giftedRPC.includes(token)) {
      errors.push(`source GetPointsGifted behavior changed: ${token}`)
    }
  }

  const friendsQuery = section(
    levelsSource,
    'func (s *LevelsPerSeasonStore) GetFriendsList(',
    'func (s *LevelsPerSeasonStore) CarryPointsOverToNewSeason('
  )
  for (const token of [
    'COALESCE(lps.season, ?) AS season',
    'COALESCE(lps.levels, 0) AS levels',
    'COALESCE(lps.points_spent, 0) AS points_spent',
    'COALESCE(lps.points_carried + lps.levels, 0) AS points',
    '`a.id AS account.id`',
    '`a.address AS account.address`',
    '`a.name AS account.name`',
    '`a.locale AS account.locale`',
    '`a.level AS account.level`',
    '`a.region AS account.region`',
    '`a.invited_by AS account.invited_by`',
    '`a.tag_art_id AS account.tag_art_id`',
    '"a.status":     db.AnyOf(ActiveStatuses)',
    'OrderBy("-points", "a.id")',
    'Limit(5)'
  ]) {
    if (!friendsQuery.includes(token)) {
      errors.push(`source friend list query changed: ${token}`)
    }
  }
  const activeStatuses = section(
    accountSource,
    'ActiveStatuses = []proto.AccountStatus{',
    '\n\t}'
  )
  for (const status of [
    'AccountStatus_ACTIVE',
    'AccountStatus_VIP',
    'AccountStatus_SUSPENDED',
    'AccountStatus_FLAGGED',
    'AccountStatus_TO_DELETE'
  ]) {
    if (!activeStatuses.includes(status)) {
      errors.push(`source active referral statuses changed: ${status}`)
    }
  }
  for (const status of ['AccountStatus_BANNED', 'AccountStatus_DELETED']) {
    if (activeStatuses.includes(status)) {
      errors.push(
        `source active referral statuses unexpectedly include ${status}`
      )
    }
  }

  const stickerPointLookup = section(
    itemSource,
    'func (s *ItemStore) GetStickerPoints(',
    'func (s *ItemStore) SpendStickerPoints('
  )
  for (const token of [
    'StickerPointsItemID  = uint64(1)',
    'FindAccountItem(accountID, proto.ItemType_SW_STICKER_POINTS, StickerPointsItemID)',
    'return item.Balance.Uint64(), nil'
  ]) {
    if (!itemSource.includes(token) && !stickerPointLookup.includes(token)) {
      errors.push(`source sticker-point lookup changed: ${token}`)
    }
  }

  const compactWire = compact(wireSource)
  const friendAccountWire = compact(
    section(
      wireSource,
      'export const sourceFriendPointsAccountWire =',
      'export const sourceGiftedInviterAccountWire ='
    )
  )
  for (const token of [
    'createdAt: null',
    'updatedAt: null',
    'experience: 0',
    'warmUps: 0',
    'seasonLevel: 0',
    'levelUpXP: 0',
    'stats: null',
    'crystalID: null',
    'titleID: null',
    'settings: null',
    'invitedBy: null',
    'isBurnerWallet: null'
  ]) {
    if (!friendAccountWire.includes(token)) {
      errors.push(
        `main Worker partial friend Account wire is missing: ${token}`
      )
    }
  }
  const giftedAccountWire = compact(
    section(
      wireSource,
      'export const sourceGiftedInviterAccountWire =',
      '/** Recreates encoding/json output for the generated Go FriendPoints struct. */'
    )
  )
  for (const token of [
    'createdAt: account.createdAt ?? null',
    'updatedAt: account.updatedAt ?? null',
    'experience: 0',
    'warmUps: account.warmUps',
    'seasonLevel: 0',
    'levelUpXP: 0',
    'stats: null',
    'crystalID: null',
    'titleID: null',
    'settings: null',
    'invitedBy: null',
    'isBurnerWallet: null'
  ]) {
    if (!giftedAccountWire.includes(token)) {
      errors.push(
        `main Worker gifted inviter Account wire is missing: ${token}`
      )
    }
  }
  for (const token of [
    'friend.account == null ? null : sourceFriendPointsAccountWire(friend.account)',
    'response.friends === null ? null : []',
    'friend == null ? null : sourceFriendPointsWire(friend)',
    'response.inviter == null ? null : sourceGiftedInviterAccountWire(response.inviter)'
  ]) {
    if (!compactWire.includes(token)) {
      errors.push(`main Worker friend-points wire is missing: ${token}`)
    }
  }

  const compactSocial = compact(socialSource)
  for (const token of [
    "account.account_status IN ( 'ACTIVE', 'VIP', 'SUSPENDED', 'FLAGGED', 'TO_DELETE' )",
    'ORDER BY points DESC, game.id ASC',
    'LIMIT 5',
    "item_type = 'SW_STICKER_POINTS' AND token_id = 0",
    'MAX(required_points)',
    'WHERE points.invitee_user_id = ? AND points.inviter_user_id = ?',
    'game.id AS account_id, account.name AS account_name, account.locale,',
    "publishedAccountLevelSQL( 'invite.invitee_user_id', 'profile.level' )",
    'AS level, account.region, account.tag_art_id',
    'sourceVisibleAccountLevel(row.level)',
    'sourceVisibleNonNegative(row.levels)',
    'sourceVisibleNonNegative(row.points)',
    'account.created_at',
    'account.updated_at',
    'account.warm_ups'
  ]) {
    if (!compactSocial.includes(token)) {
      errors.push(`main Worker friend-points behavior is missing: ${token}`)
    }
  }
  const referralProjectionCallCount = [
    ...socialSource.matchAll(/publishedReferralLevelsSQL\(/g)
  ].length
  if (referralProjectionCallCount !== 3) {
    errors.push(
      `main Worker friend-points referral projections changed: ${referralProjectionCallCount}`
    )
  }

  if (!apiSource.includes("from './friend-points-wire'")) {
    errors.push('main Worker lost the shared friend-points wire import')
  }
  const friendRoute = section(
    apiSource,
    "case 'GetFriendPoints':",
    "case 'GetPointsGifted':"
  )
  if (!friendRoute.includes('sourceFriendPointsResponseWire(')) {
    errors.push('GetFriendPoints bypasses source normalization')
  }
  const giftedRoute = section(
    apiSource,
    "case 'GetPointsGifted':",
    "case 'EnterConquest':"
  )
  if (!giftedRoute.includes('sourcePointsGiftedResponseWire(')) {
    errors.push('GetPointsGifted bypasses source normalization')
  }

  const scripts = JSON.parse(packageSource).scripts ?? {}
  if (
    scripts['check:cloudflare:friend-points-wire'] !==
    'node --test ./utils/check-cloudflare-friend-points-wire.test.mjs && node ./utils/check-cloudflare-friend-points-wire.mjs'
  ) {
    errors.push('package scripts lost the friend-points wire gate')
  }
  if (
    !String(scripts['build:cloudflare']).includes(
      'pnpm check:cloudflare:friend-points-wire'
    )
  ) {
    errors.push(
      'complete Cloudflare build bypasses the friend-points wire gate'
    )
  }
  return errors
}

const main = async () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  const files = [
    'api/proto/api.gen.go',
    'api/rpc/friend_points.go',
    'api/data/levels_per_season.go',
    'api/data/account.go',
    'api/data/item.go',
    'cloudflare/src/friend-points-wire.ts',
    'cloudflare/src/social.ts',
    'cloudflare/src/api.ts',
    'package.json'
  ]
  const values = await Promise.all(
    files.map(file => readFile(path.join(root, file), 'utf8'))
  )
  const errors = friendPointsWireErrors(...values)
  if (errors.length) {
    console.error(errors.join('\n'))
    process.exitCode = 1
  } else {
    console.log(
      'Friend points preserve generated wrappers, partial-account zero values, active-status filtering, source top-five ordering, totals, and inviter reads'
    )
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  await main()
}
