import type {
  AccountStat,
  DeckClass,
  GameMode,
  GMListMatchesRequest,
  GMMatch,
  LeaderboardEntry,
  Match,
  MatchPlayer,
  Page,
  PlayerRank,
  PlayerRankStage,
  SortBy
} from '@opensky/proto'
import { INITIAL_RANK_STATE_JSON } from '@opensky/shared/ranked-progression'
import {
  conquestMatchMode,
  isRankedMatchModes,
  storedMatchModes
} from '@opensky/shared/match-modes'

import { sourceAccountStatWire } from './account-stat-wire'
import { libraryCardsFromDeckString } from './card-library'
import { decodeDeckString, encodeDeckString } from './deck-codec'
import { sourceCrystalIDSQL } from './account-wire'
import { sourceLeaderboardEntryWire } from './competitive-wire'
import { invalidArgument, notFound, permissionDenied } from './errors'
import {
  noUnpublishedMatchExperienceSQL,
  publishedAccountLevelSQL,
  publishedAccountXpSQL,
  publishedProfileUpdatedAtSQL,
  sourceVisibleAccountLevel,
  sourceVisibleExperienceXp,
  sourceVisibleTimestamp
} from './experience-publication'
import { goFloat32FloorHundredthsRatio, goFloat32Ratio } from './go-numbers'
import { nextLeaderboardRewardTime } from './leaderboard-reward-worker'
import { leaderboardRewardsForRank } from './leaderboard-rewards'
import { seasonFromDate } from './legacy-seasons'
import { sourceGMMatchListWire, sourceMatchWire } from './match-wire'
import { identityReferenceFor } from './rpc-principal'
import { publishedWarmUpsSQL, sourceVisibleWarmUps } from './warmup-publication'

const RANKED_MODES = new Set<GameMode>([
  'RANKED_CONSTRUCTED' as GameMode,
  'RANKED_DISCOVERY' as GameMode
])
const HISTORY_MODES = new Set<GameMode>([
  'RANKED_CONSTRUCTED' as GameMode,
  'RANKED_DISCOVERY' as GameMode,
  'CONQUEST_CONSTRUCTED' as GameMode,
  'CONQUEST_DISCOVERY' as GameMode,
  'CHALLENGE_CONSTRUCTED' as GameMode,
  'CHALLENGE_DISCOVERY' as GameMode
])
const ALL_MATCH_MODES = new Set<GameMode>([
  'TUTORIAL' as GameMode,
  'PRACTICE_BOT' as GameMode,
  'PRACTICE_PVP' as GameMode,
  'WARM_UP' as GameMode,
  ...HISTORY_MODES
])
const MATCH_STATUSES = new Set<Match['status']>([
  'UNKNOWN' as Match['status'],
  'COMPLETED' as Match['status'],
  'ABANDONED' as Match['status'],
  'FORFEITED' as Match['status'],
  'IN_PROGRESS' as Match['status'],
  'CRASHED' as Match['status']
])
const RANK_ORDER: Record<string, number> = {
  UNKNOWN: 0,
  UNRANKED: 1,
  WANDERER: 2,
  TRAINEE: 3,
  APPRENTICE: 4,
  EXPERT: 5,
  MASTER: 6,
  GRANDWEAVER: 7
}
const MAX_PAGE_SIZE = 100
const MAX_MATCH_PAGE_SIZE = 200
const DEFAULT_PAGE_SIZE = 20

interface StatRow {
  user_id: string
  game_mode: GameMode
  season: number
  win_count: number
  loss_count: number
  tie_count: number
  forfeit_count: number
  abandon_count: number
  score: number
  player_rank: PlayerRank
  player_rank_stage: PlayerRankStage
  player_rank_state: string
  win_streak: number
  loss_streak: number
  created_at: string
  updated_at: string
  level?: number
  xp?: number
  rank_position?: number | null
  rank_count?: number | null
}

interface LeaderboardRow extends StatRow {
  account_id: number
  name: string
  locale: string
  region: string | null
  tag_art_id: string | null
  title_id: number | null
  crystal_id: number | null
  user_created_at: string
  profile_updated_at: string
  level: number
  xp: number
  next_level_xp: number
  warm_ups: number
}

interface ProjectedLeaderboardRow extends LeaderboardRow {
  leaderboard_rank: number
  reward_rank?: number
}

interface MatchRow {
  id: number
  proposal_id: string
  replay_id: string
  mode: GameMode
  player1_mode: GameMode | null
  player2_mode: GameMode | null
  status: 'creating' | 'active' | 'ended' | 'failed'
  player1_user_id: string | null
  player2_user_id: string | null
  match_payload_json: string
  winner_player: number | null
  result_json: string | null
  created_at: string
  updated_at: string
  ended_at: string | null
  player1_deck_string: string | null
  player2_deck_string: string | null
  reviewed?: number
}

const MATCH_ROW_COLUMNS = `
  matches.id, matches.proposal_id, matches.replay_id, matches.mode,
  matches.player1_mode, matches.player2_mode, matches.status,
  matches.player1_user_id, matches.player2_user_id,
  matches.match_payload_json, matches.winner_player, matches.result_json,
  matches.created_at, matches.updated_at, matches.ended_at,
  (SELECT deck.deck_string
   FROM multiplayer_match_authoritative_decks deck
   WHERE deck.proposal_id = matches.proposal_id AND deck.player_index = 0)
    AS player1_deck_string,
  (SELECT deck.deck_string
   FROM multiplayer_match_authoritative_decks deck
   WHERE deck.proposal_id = matches.proposal_id AND deck.player_index = 1)
    AS player2_deck_string`

interface MatchPayloadParticipant {
  privateSeed?: { cards?: unknown; prisms?: unknown }
  gameMode?: GameMode
  account?: {
    id?: number
    address?: string
    name?: string
    region?: string
    tagArtID?: string
    crystalID?: number
  }
  playerSessionID?: string
  botSubkey?: string | false
}

interface MatchPayload {
  match?: {
    player1?: MatchPayloadParticipant
    player2?: MatchPayloadParticipant
  }
}

export interface LeaderboardRequest {
  gameMode?: GameMode
  region?: string
  playerRank?: PlayerRank
  playerNamePrefix?: string
  season?: number
}

const pageSize = (page?: Page): number =>
  Math.min(
    MAX_PAGE_SIZE,
    Number.isSafeInteger(page?.pageSize) && (page?.pageSize ?? 0) > 0
      ? page!.pageSize!
      : DEFAULT_PAGE_SIZE
  )

const matchPageSize = (page?: Page): number =>
  Math.min(
    MAX_MATCH_PAGE_SIZE,
    Number.isSafeInteger(page?.pageSize) && (page?.pageSize ?? 0) > 0
      ? page!.pageSize!
      : DEFAULT_PAGE_SIZE
  )

type MatchSortField = 'created_at' | 'id'
type MatchSortOrder = 'ASC' | 'DESC'

interface MatchSortKey {
  field: MatchSortField
  order: MatchSortOrder
}

interface MatchCursor {
  id: number
  created_at?: string
}

type AdminMatchSortField = 'created_at' | 'ended_at'

interface AdminMatchSortKey {
  field: AdminMatchSortField
  order: MatchSortOrder
  response: SortBy
}

interface AdminMatchSortConfig {
  sort: AdminMatchSortKey[]
  idOrder: MatchSortOrder
}

interface AdminMatchCursor {
  id: number
  values: Array<string | null>
}

const matchSort = (page?: Page) => {
  const requested = page?.sort?.length
    ? page.sort
    : [
        {
          column: 'matches.started_at',
          order: 'DESC' as SortBy['order']
        }
      ]
  const keys: MatchSortKey[] = []
  const returnedSort: SortBy[] = []
  const seen = new Set<MatchSortField>()
  let idOrder: MatchSortOrder = 'DESC'

  for (const item of requested) {
    const order = (item.order ?? 'DESC') as MatchSortOrder
    if (order !== 'ASC' && order !== 'DESC') {
      throw invalidArgument('match sort order is invalid')
    }
    const field =
      item.column === 'matches.id' || item.column === 'id'
        ? 'id'
        : item.column === 'matches.started_at' || item.column === 'started_at'
          ? 'created_at'
          : undefined
    if (!field) {
      throw invalidArgument(`unsupported match sort column '${item.column}'`)
    }
    if (seen.has(field)) {
      throw invalidArgument(`duplicate match sort column '${item.column}'`)
    }
    seen.add(field)
    if (field === 'id') {
      idOrder = order
    } else {
      keys.push({ field, order })
      returnedSort.push({ column: item.column, order: item.order ?? 'DESC' })
    }
  }

  // The source paginator aligns the unique ID key with a sole requested sort,
  // while a multi-column request retains the ID's explicit/default direction.
  if (requested.length === 1) {
    idOrder = (requested[0].order ?? 'DESC') as MatchSortOrder
  }
  keys.push({ field: 'id', order: idOrder })
  return { keys, returnedSort }
}

const compareMatchValue = (
  left: string | number,
  right: string | number
): number =>
  typeof left === 'number' && typeof right === 'number'
    ? left - right
    : String(left).localeCompare(String(right))

const compareMatchKey = (
  left: Pick<MatchRow, 'id' | 'created_at'>,
  right: MatchCursor | Pick<MatchRow, 'id' | 'created_at'>,
  keys: MatchSortKey[]
): number => {
  for (const key of keys) {
    const leftValue = left[key.field]
    const rightValue = right[key.field]
    if (rightValue === undefined) continue
    const compared = compareMatchValue(leftValue, rightValue)
    if (compared !== 0) return key.order === 'DESC' ? -compared : compared
  }
  return 0
}

const encodeMatchCursor = (
  row: Pick<MatchRow, 'id' | 'created_at'>,
  includesStartedAt: boolean
): string =>
  btoa(
    JSON.stringify([
      String(row.id),
      ...(includesStartedAt ? [row.created_at] : [])
    ])
  )

const decodeMatchCursor = (
  cursor: string,
  includesStartedAt: boolean
): MatchCursor => {
  try {
    const values = JSON.parse(atob(cursor)) as unknown
    if (
      !Array.isArray(values) ||
      values.length !== (includesStartedAt ? 2 : 1)
    ) {
      throw new Error('cursor shape')
    }
    const id = Number(values[0])
    if (!Number.isSafeInteger(id) || id <= 0) throw new Error('cursor id')
    if (includesStartedAt && typeof values[1] !== 'string') {
      throw new Error('cursor start')
    }
    return {
      id,
      ...(includesStartedAt ? { created_at: values[1] as string } : {})
    }
  } catch {
    throw invalidArgument('page cursor is invalid')
  }
}

const adminMatchSort = (page?: Page): AdminMatchSortConfig => {
  const requested = page?.sort?.length
    ? page.sort
    : [
        {
          column: 'matches.started_at',
          order: 'DESC' as SortBy['order']
        }
      ]
  const sort: AdminMatchSortKey[] = []
  let idOrder: MatchSortOrder = 'DESC'
  for (const item of requested) {
    const order = item.order as MatchSortOrder
    if (order !== 'ASC' && order !== 'DESC') {
      throw invalidArgument('match sort is invalid')
    }
    if (item.column === 'matches.id' || item.column === 'id') {
      idOrder = order
      continue
    }
    const field = ['matches.started_at', 'started_at', 'startedAt'].includes(
      item.column
    )
      ? 'created_at'
      : ['matches.ended_at', 'ended_at', 'endedAt'].includes(item.column)
        ? 'ended_at'
        : undefined
    if (!field) throw invalidArgument('match sort is invalid')
    sort.push({ field, order, response: item })
  }
  if (sort.length === 1) idOrder = sort[0].order
  return { sort, idOrder }
}

const adminMatchValue = (
  row: Pick<MatchRow, 'created_at' | 'ended_at'>,
  field: AdminMatchSortField
) => row[field]

const compareAdminMatchValue = (
  left: string | null,
  right: string | null,
  order: MatchSortOrder
) => {
  if (left === null || right === null) {
    if (left === right) return 0
    // Match PostgreSQL's default: NULLS LAST for ASC and NULLS FIRST for DESC.
    return left === null ? (order === 'ASC' ? 1 : -1) : order === 'ASC' ? -1 : 1
  }
  const compared = left.localeCompare(right)
  return order === 'DESC' ? -compared : compared
}

const compareAdminMatchKey = (
  row: Pick<MatchRow, 'id' | 'created_at' | 'ended_at'>,
  cursorOrRow:
    | AdminMatchCursor
    | Pick<MatchRow, 'id' | 'created_at' | 'ended_at'>,
  config: AdminMatchSortConfig
) => {
  for (let index = 0; index < config.sort.length; index += 1) {
    const key = config.sort[index]
    const left = adminMatchValue(row, key.field)
    const right =
      'values' in cursorOrRow
        ? cursorOrRow.values[index]
        : adminMatchValue(cursorOrRow, key.field)
    const compared = compareAdminMatchValue(left, right, key.order)
    if (compared !== 0) return compared
  }
  const compared = row.id - cursorOrRow.id
  return config.idOrder === 'DESC' ? -compared : compared
}

const encodeAdminMatchCursor = (
  row: Pick<MatchRow, 'id' | 'created_at' | 'ended_at'>,
  config: AdminMatchSortConfig
) =>
  btoa(
    JSON.stringify([
      String(row.id),
      ...config.sort.map(key => adminMatchValue(row, key.field))
    ])
  )

const decodeAdminMatchCursor = (
  value: string,
  config: AdminMatchSortConfig
): AdminMatchCursor => {
  try {
    const raw = JSON.parse(atob(value)) as unknown
    if (
      !Array.isArray(raw) ||
      raw.length !== config.sort.length + 1 ||
      typeof raw[0] !== 'string' ||
      !/^[1-9]\d*$/.test(raw[0]) ||
      raw.slice(1).some(item => item !== null && typeof item !== 'string')
    ) {
      throw new Error('cursor shape')
    }
    const id = Number(raw[0])
    if (!Number.isSafeInteger(id)) throw new Error('cursor id')
    return { id, values: raw.slice(1) as Array<string | null> }
  } catch {
    throw invalidArgument('page cursor is invalid')
  }
}

interface LeaderboardCursor {
  account_id: number
  player_rank?: PlayerRank
  score: number
  updated_at: string
}

const leaderboardHasRankFilter = (request: LeaderboardRequest): boolean =>
  request.playerRank !== undefined &&
  request.playerRank !== ('UNKNOWN' as PlayerRank)

const encodeLeaderboardCursor = (
  row: ProjectedLeaderboardRow,
  hasRankFilter: boolean
): string =>
  btoa(
    JSON.stringify([
      String(row.account_id),
      ...(!hasRankFilter ? [row.player_rank] : []),
      String(row.score),
      row.updated_at
    ])
  )

const decodeLeaderboardCursor = (
  value: string,
  hasRankFilter: boolean
): LeaderboardCursor => {
  try {
    const values = JSON.parse(atob(value)) as unknown
    const expectedLength = hasRankFilter ? 3 : 4
    if (!Array.isArray(values) || values.length !== expectedLength) {
      throw new Error('cursor shape')
    }
    const accountId = Number(values[0])
    const rank = hasRankFilter ? undefined : String(values[1])
    const score = Number(values[hasRankFilter ? 1 : 2])
    const updatedAt = values[hasRankFilter ? 2 : 3]
    if (!Number.isSafeInteger(accountId) || accountId <= 0) {
      throw new Error('cursor account')
    }
    if (rank !== undefined && RANK_ORDER[rank] === undefined) {
      throw new Error('cursor rank')
    }
    if (!Number.isSafeInteger(score)) throw new Error('cursor score')
    if (typeof updatedAt !== 'string' || updatedAt.length === 0) {
      throw new Error('cursor updated')
    }
    return {
      account_id: accountId,
      ...(rank !== undefined ? { player_rank: rank as PlayerRank } : {}),
      score,
      updated_at: updatedAt
    }
  } catch {
    throw invalidArgument('page cursor is invalid')
  }
}

const compareLeaderboardCursor = (
  row: ProjectedLeaderboardRow,
  cursor: LeaderboardCursor,
  hasRankFilter: boolean
): number =>
  (!hasRankFilter
    ? (RANK_ORDER[cursor.player_rank!] ?? 0) -
      (RANK_ORDER[row.player_rank] ?? 0)
    : 0) ||
  cursor.score - row.score ||
  row.updated_at.localeCompare(cursor.updated_at) ||
  row.account_id - cursor.account_id

const durationSeconds = (value: string, field: string): number => {
  if (!value || !/^(?:\d+(?:\.\d+)?(?:h|m|s))+$/.test(value)) {
    throw invalidArgument(`${field} invalid value`)
  }
  let seconds = 0
  for (const match of value.matchAll(/(\d+(?:\.\d+)?)(h|m|s)/g)) {
    const amount = Number(match[1])
    seconds += amount * (match[2] === 'h' ? 3600 : match[2] === 'm' ? 60 : 1)
  }
  return seconds
}

const totalExperience = (level: number, xp: number): number =>
  Math.max(0, level - 1) * 200 + xp

const GRANDWEAVER_COUNT = 100
const MISSING_ACCOUNT_SORT_ID = Number.MAX_SAFE_INTEGER

const projectedRank = (row: StatRow): number | undefined => {
  if (row.rank_position === undefined || row.rank_position === null) {
    return undefined
  }
  return ['MASTER', 'GRANDWEAVER'].includes(row.player_rank) &&
    row.rank_position > GRANDWEAVER_COUNT
    ? row.rank_position - GRANDWEAVER_COUNT
    : row.rank_position
}

const statFromRow = (
  row: StatRow,
  projection: 'account' | 'leaderboard' = 'account'
): AccountStat => {
  const gamesPlayed = row.win_count + row.loss_count + row.tie_count
  const experience = totalExperience(
    sourceVisibleAccountLevel(row.level),
    sourceVisibleExperienceXp(row.xp)
  )
  const position = projection === 'account' ? projectedRank(row) : undefined
  let rankProgress: number | undefined
  if (projection === 'account') {
    rankProgress = 0
    if (row.player_rank === ('UNRANKED' as PlayerRank)) {
      rankProgress = Math.min(1, goFloat32FloorHundredthsRatio(experience, 200))
    } else if (row.rank_count !== undefined) {
      const rankCount = row.rank_count ?? 0
      rankProgress = Math.min(
        1,
        position !== undefined
          ? goFloat32FloorHundredthsRatio(position, rankCount)
          : 0
      )
    }
  }
  return sourceAccountStatWire({
    gameMode: row.game_mode,
    winCount: row.win_count,
    lossCount: row.loss_count,
    tieCount: row.tie_count,
    forfeitCount: row.forfeit_count,
    abandonCount: row.abandon_count,
    winRatio: goFloat32Ratio(row.win_count, gamesPlayed),
    gamesPlayed,
    ...(projection === 'account' ? { experience } : {}),
    score: row.score,
    createdAt: row.created_at,
    ...(position !== undefined ? { rank: position } : {}),
    ...(rankProgress !== undefined ? { rankProgress } : {}),
    playerRank: row.player_rank,
    playerRankStage: row.player_rank_stage,
    winStreak: row.win_streak,
    lossStreak: row.loss_streak,
    season: row.season
  })
}

const accountStatRowsQuery = (where: string): string => `
  SELECT stats.*,
         ${publishedAccountLevelSQL('stats.user_id', 'profile.level')} AS level,
         ${publishedAccountXpSQL('stats.user_id', 'profile.xp')} AS xp,
         CASE
           WHEN COALESCE(settings.account_status, 'ACTIVE') IN (
             'BANNED', 'SUSPENDED', 'DELETED'
           ) THEN NULL
           ELSE (
             SELECT COUNT(*)
             FROM player_account_stats above
             LEFT JOIN player_account_settings above_settings
               ON above_settings.user_id = above.user_id
             LEFT JOIN game_accounts above_account
               ON above_account.user_id = above.user_id
             WHERE above.game_mode = stats.game_mode
               AND above.season = stats.season
               AND COALESCE(above_settings.account_status, 'ACTIVE') NOT IN (
                 'BANNED', 'SUSPENDED', 'DELETED'
               )
               AND (
                 (stats.player_rank NOT IN ('MASTER', 'GRANDWEAVER')
                   AND above.player_rank = stats.player_rank)
                 OR (stats.player_rank = 'MASTER'
                   AND above.player_rank IN ('MASTER', 'GRANDWEAVER'))
                 OR (stats.player_rank = 'GRANDWEAVER'
                   AND above.player_rank = 'GRANDWEAVER')
               )
               AND (
                 above.score > stats.score
                 OR (above.score = stats.score
                   AND above.updated_at < stats.updated_at)
                 OR (above.score = stats.score
                   AND above.updated_at = stats.updated_at
                   AND COALESCE(above_account.id, ${MISSING_ACCOUNT_SORT_ID})
                     < COALESCE(target_account.id, ${MISSING_ACCOUNT_SORT_ID}))
                 OR (above.score = stats.score
                   AND above.updated_at = stats.updated_at
                   AND COALESCE(above_account.id, ${MISSING_ACCOUNT_SORT_ID})
                     = COALESCE(target_account.id, ${MISSING_ACCOUNT_SORT_ID})
                   AND above.user_id < stats.user_id)
                 OR above.user_id = stats.user_id
               )
           )
         END AS rank_position,
         (
           SELECT COUNT(*)
           FROM player_account_stats peers
           LEFT JOIN player_account_settings peer_settings
             ON peer_settings.user_id = peers.user_id
           WHERE peers.game_mode = stats.game_mode
             AND peers.season = stats.season
             AND peers.player_rank = stats.player_rank
             AND COALESCE(peer_settings.account_status, 'ACTIVE') NOT IN (
               'BANNED', 'SUSPENDED', 'DELETED'
             )
         ) AS rank_count
  FROM player_account_stats stats
  JOIN player_profiles profile ON profile.user_id = stats.user_id
  LEFT JOIN player_account_settings settings ON settings.user_id = stats.user_id
  LEFT JOIN game_accounts target_account ON target_account.user_id = stats.user_id
  WHERE ${where}`

const syntheticStat = (
  gameMode: GameMode,
  season: number,
  level: number,
  xp: number
): AccountStat => {
  const experience = totalExperience(level, xp)
  return sourceAccountStatWire({
    gameMode,
    winCount: 0,
    lossCount: 0,
    tieCount: 0,
    forfeitCount: 0,
    abandonCount: 0,
    winRatio: 0,
    gamesPlayed: 0,
    experience,
    rankProgress: Math.min(1, goFloat32FloorHundredthsRatio(experience, 200)),
    playerRank: 'UNRANKED' as PlayerRank,
    playerRankStage: 'STAGE_NONE' as PlayerRankStage,
    winStreak: 0,
    lossStreak: 0,
    season
  })
}

const compareRows = (left: LeaderboardRow, right: LeaderboardRow): number =>
  (RANK_ORDER[right.player_rank] ?? 0) - (RANK_ORDER[left.player_rank] ?? 0) ||
  right.score - left.score ||
  left.updated_at.localeCompare(right.updated_at) ||
  left.account_id - right.account_id ||
  left.user_id.localeCompare(right.user_id)

const compareRankPositionRows = (
  left: LeaderboardRow,
  right: LeaderboardRow
): number =>
  right.score - left.score ||
  left.updated_at.localeCompare(right.updated_at) ||
  left.account_id - right.account_id ||
  left.user_id.localeCompare(right.user_id)

const compareRewardRows = (
  left: LeaderboardRow,
  right: LeaderboardRow
): number =>
  right.score - left.score ||
  right.created_at.localeCompare(left.created_at) ||
  left.account_id - right.account_id ||
  left.user_id.localeCompare(right.user_id)

const projectLeaderboardRows = (
  rows: LeaderboardRow[]
): ProjectedLeaderboardRow[] => {
  const exactPositions = new Map<string, number>()
  const rankCounts = new Map<PlayerRank, number>()
  const ordered = [...rows].sort(compareRows)
  for (const row of ordered) {
    const position = (rankCounts.get(row.player_rank) ?? 0) + 1
    rankCounts.set(row.player_rank, position)
    exactPositions.set(row.user_id, position)
  }

  const masterPositions = new Map(
    rows
      .filter(row => ['MASTER', 'GRANDWEAVER'].includes(row.player_rank))
      .sort(compareRankPositionRows)
      .map((row, index) => [row.user_id, index + 1])
  )
  const rewardPositions = new Map(
    [...rows]
      .sort(compareRewardRows)
      .slice(0, 500)
      .map((row, index) => [row.user_id, index + 1])
  )

  return ordered.map(row => {
    const rawPosition =
      row.player_rank === ('MASTER' as PlayerRank)
        ? (masterPositions.get(row.user_id) ?? 0)
        : (exactPositions.get(row.user_id) ?? 0)
    const leaderboardRank =
      row.player_rank === ('MASTER' as PlayerRank) &&
      rawPosition > GRANDWEAVER_COUNT
        ? rawPosition - GRANDWEAVER_COUNT
        : rawPosition
    const rewardRank = rewardPositions.get(row.user_id)
    return {
      ...row,
      leaderboard_rank: leaderboardRank,
      ...(rewardRank !== undefined ? { reward_rank: rewardRank } : {})
    }
  })
}

const deckClassForPrisms = (value: unknown): DeckClass => {
  const prisms = Array.isArray(value)
    ? value.map(item => String(item).toLowerCase()).sort()
    : []
  const key = prisms.join(',')
  const classes: Record<string, DeckClass> = {
    agy: 'AGY' as DeckClass,
    hrt: 'HRT' as DeckClass,
    int: 'INT' as DeckClass,
    str: 'STR' as DeckClass,
    wis: 'WIS' as DeckClass,
    'agy,hrt': 'HRA' as DeckClass,
    'agy,int': 'AGI' as DeckClass,
    'agy,str': 'STA' as DeckClass,
    'agy,wis': 'AGW' as DeckClass,
    'hrt,int': 'HRI' as DeckClass,
    'hrt,str': 'STH' as DeckClass,
    'hrt,wis': 'HRW' as DeckClass,
    'int,str': 'STI' as DeckClass,
    'int,wis': 'INW' as DeckClass,
    'str,wis': 'STW' as DeckClass
  }
  return classes[key] || ('STR' as DeckClass)
}

const participantCardIds = (
  participant: MatchPayloadParticipant | undefined
): number[] =>
  Array.isArray(participant?.privateSeed?.cards)
    ? participant.privateSeed.cards
        .map(card => Number(card))
        .filter(card => Number.isSafeInteger(card) && card > 0)
    : []

const matchPlayer = (
  participant: MatchPayloadParticipant | undefined,
  userId: string | null,
  authoritativeDeckString?: string
): MatchPlayer => {
  const account = participant?.account || {}
  const privateSeed = participant?.privateSeed || {}
  const initialDeckClass = deckClassForPrisms(privateSeed.prisms)
  const cardIds = participantCardIds(participant)
  const initDeckString = encodeDeckString(cardIds, initialDeckClass)
  const authoritativeDeck = authoritativeDeckString
    ? decodeDeckString(authoritativeDeckString)
    : undefined
  if (
    authoritativeDeckString &&
    libraryCardsFromDeckString(authoritativeDeckString).length !== 30
  ) {
    throw new Error('authoritative match deck is incomplete')
  }
  const registeredBot = userId?.startsWith('system:bot:') === true
  return {
    id: Number.isSafeInteger(account.id) ? account.id! : 0,
    address:
      userId && !registeredBot
        ? identityReferenceFor(userId)
        : typeof account.address === 'string'
          ? account.address
          : '',
    name: typeof account.name === 'string' ? account.name : 'Unknown Player',
    ...(typeof account.region === 'string' ? { region: account.region } : {}),
    ...(typeof account.tagArtID === 'string'
      ? { tagArtID: account.tagArtID }
      : {}),
    ...(typeof account.crystalID === 'number'
      ? { crystalID: account.crystalID }
      : {}),
    deckString: authoritativeDeckString ?? initDeckString,
    initDeckString,
    deckClass: authoritativeDeck?.deckClass ?? initialDeckClass,
    ...(typeof participant?.playerSessionID === 'string'
      ? { playerSessionId: participant.playerSessionID }
      : {}),
    isBot: typeof participant?.botSubkey === 'string'
  }
}

const matchFromRow = (row: MatchRow): Match | null => {
  let payload: MatchPayload
  let resultBody: {
    reason?: unknown
    status?: unknown
    turnCount?: unknown
    moveCount?: unknown
    player1Moves?: unknown
    player2Moves?: unknown
  }
  try {
    payload = JSON.parse(row.match_payload_json) as MatchPayload
    resultBody = row.result_json ? JSON.parse(row.result_json) : {}
  } catch {
    return null
  }
  const hasPlayer1Deck = row.player1_deck_string !== null
  const hasPlayer2Deck = row.player2_deck_string !== null
  if (hasPlayer1Deck !== hasPlayer2Deck) return null
  let player1: MatchPlayer
  let player2: MatchPlayer
  try {
    player1 = matchPlayer(
      payload.match?.player1,
      row.player1_user_id,
      row.player1_deck_string ?? undefined
    )
    player2 = matchPlayer(
      payload.match?.player2,
      row.player2_user_id,
      row.player2_deck_string ?? undefined
    )
  } catch {
    return null
  }
  const storedStatus =
    typeof resultBody.status === 'string' ? resultBody.status : undefined
  const status =
    row.status === 'active' || row.status === 'creating'
      ? 'IN_PROGRESS'
      : row.status === 'failed'
        ? 'CRASHED'
        : ['ABANDONED', 'FORFEITED', 'COMPLETED'].includes(storedStatus ?? '')
          ? storedStatus!
          : resultBody.reason === 'abandoned'
            ? 'ABANDONED'
            : resultBody.reason === 'forfeited'
              ? 'FORFEITED'
              : 'COMPLETED'
  const modes = storedMatchModes(row)
  return sourceMatchWire({
    id: row.id,
    status: status as Match['status'],
    player1,
    player2,
    player1GameMode: modes[0],
    player2GameMode: modes[1],
    initPlayer1DeckNumCards: participantCardIds(payload.match?.player1).length,
    initPlayer2DeckNumCards: participantCardIds(payload.match?.player2).length,
    player1DeckClass: player1.deckClass,
    player2DeckClass: player2.deckClass,
    ...(row.winner_player !== null
      ? { winningPlayer: row.winner_player + 1 }
      : {}),
    turnNonce:
      typeof resultBody.turnCount === 'number' ? resultBody.turnCount : 0,
    player1Moves:
      typeof resultBody.player1Moves === 'number'
        ? resultBody.player1Moves
        : typeof resultBody.moveCount === 'number'
          ? resultBody.moveCount
          : 0,
    player2Moves:
      typeof resultBody.player2Moves === 'number'
        ? resultBody.player2Moves
        : typeof resultBody.moveCount === 'number'
          ? resultBody.moveCount
          : 0,
    metrics: {},
    startedAt: row.created_at,
    ...(row.ended_at ? { endedAt: row.ended_at } : {}),
    updatedAt: row.updated_at,
    createdAt: row.created_at,
    replayID: row.replay_id
  })
}

export class CompetitiveRepository {
  constructor(private readonly database: D1Database) {}

  async ensureCurrentStats(userId: string, now = new Date().toISOString()) {
    const season = seasonFromDate()
    await this.database.batch([
      ...[...RANKED_MODES].map(mode =>
        this.database
          .prepare(
            `INSERT OR IGNORE INTO player_account_stats
               (user_id, game_mode, season, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?)`
          )
          .bind(userId, mode, season, now, now)
      ),
      this.database
        .prepare(
          `UPDATE player_account_stats
           SET player_rank = 'WANDERER', player_rank_stage = 'STAGE_I',
               score = 0, player_rank_state = ?, updated_at = ?
           WHERE user_id = ? AND season = ? AND player_rank = 'UNRANKED'
             AND game_mode IN ('RANKED_CONSTRUCTED', 'RANKED_DISCOVERY')
             AND EXISTS (
               SELECT 1 FROM player_profiles profile
               WHERE profile.user_id = player_account_stats.user_id
                 AND ((MAX(profile.level, 1) - 1) * 200 + profile.xp) >= 200
             )
             AND ${noUnpublishedMatchExperienceSQL(
               'player_account_stats.user_id'
             )}`
        )
        .bind(INITIAL_RANK_STATE_JSON, now, userId, season)
    ])
  }

  async currentStats(userId: string): Promise<{
    rankedConstructed: AccountStat
    rankedDiscovery: AccountStat
  }> {
    await this.ensureCurrentStats(userId)
    const season = seasonFromDate()
    const rows = await this.database
      .prepare(
        accountStatRowsQuery(
          `stats.user_id = ? AND stats.season = ?
           AND stats.game_mode IN ('RANKED_CONSTRUCTED', 'RANKED_DISCOVERY')`
        )
      )
      .bind(userId, season)
      .all<StatRow>()
    const byMode = new Map(rows.results.map(row => [row.game_mode, row]))
    return {
      rankedConstructed: statFromRow(
        byMode.get('RANKED_CONSTRUCTED' as GameMode)!
      ),
      rankedDiscovery: statFromRow(byMode.get('RANKED_DISCOVERY' as GameMode)!)
    }
  }

  async accountStats(address: string, seasons?: number[]) {
    if (!address.startsWith('identity:')) return null
    const userId = address.slice('identity:'.length)
    const profile = await this.database
      .prepare(
        `SELECT ${publishedAccountLevelSQL(
          'profile.user_id',
          'profile.level'
        )} AS level,
                ${publishedAccountXpSQL('profile.user_id', 'profile.xp')} AS xp
         FROM player_profiles profile
         JOIN users ON users.id = profile.user_id
         WHERE profile.user_id = ? AND users.user_kind = 'PLAYER'`
      )
      .bind(userId)
      .first<{ level: number; xp: number }>()
    if (!profile) return null
    const visibleProfile = {
      level: sourceVisibleAccountLevel(profile.level),
      xp: sourceVisibleExperienceXp(profile.xp)
    }

    const currentSeason = seasonFromDate()
    const requested =
      seasons && seasons.length > 0
        ? [...new Set(seasons)]
        : Array.from({ length: currentSeason }, (_, index) => index + 1)
    if (
      requested.length > 256 ||
      requested.some(
        season =>
          !Number.isSafeInteger(season) || season < 1 || season > currentSeason
      )
    ) {
      throw invalidArgument('seasons are invalid')
    }
    await this.ensureCurrentStats(userId)
    const placeholders = requested.map(() => '?').join(',')
    const rows = await this.database
      .prepare(
        accountStatRowsQuery(
          `stats.user_id = ? AND stats.season IN (${placeholders})
           AND stats.game_mode IN ('RANKED_CONSTRUCTED', 'RANKED_DISCOVERY')
           AND COALESCE(settings.account_status, 'ACTIVE') NOT IN (
             'BANNED', 'SUSPENDED', 'DELETED'
           )`
        )
      )
      .bind(userId, ...requested)
      .all<StatRow>()
    const byKey = new Map(
      rows.results.map(row => [`${row.season}:${row.game_mode}`, row])
    )
    const statsFor = (mode: GameMode) =>
      requested
        .sort((left, right) => left - right)
        .map(season => {
          const row = byKey.get(`${season}:${mode}`)
          return row
            ? statFromRow(row)
            : syntheticStat(
                mode,
                season,
                visibleProfile.level,
                visibleProfile.xp
              )
        })
    return {
      constructedStats: statsFor('RANKED_CONSTRUCTED' as GameMode),
      discoveryStats: statsFor('RANKED_DISCOVERY' as GameMode)
    }
  }

  private async leaderboardRows(request: LeaderboardRequest) {
    if (!request.gameMode || request.gameMode === ('UNKNOWN' as GameMode)) {
      throw invalidArgument('gameMode is required')
    }
    if (!RANKED_MODES.has(request.gameMode)) {
      throw invalidArgument('gameMode is invalid')
    }
    const season = request.season || seasonFromDate()
    if (!Number.isSafeInteger(season) || season < 1) {
      throw invalidArgument('season is invalid')
    }
    const result = await this.database
      .prepare(
        `SELECT stats.*, game.id AS account_id,
                account.name, account.locale, account.region,
                account.tag_art_id, account.title_id,
                ${sourceCrystalIDSQL('stats.user_id')} AS crystal_id,
                users.created_at AS user_created_at,
                ${publishedProfileUpdatedAtSQL(
                  'stats.user_id',
                  'profile.updated_at'
                )} AS profile_updated_at,
                ${publishedAccountLevelSQL(
                  'stats.user_id',
                  'profile.level'
                )} AS level,
                ${publishedAccountXpSQL('stats.user_id', 'profile.xp')} AS xp,
                profile.next_level_xp,
                ${publishedWarmUpsSQL(
                  'stats.user_id',
                  'account.warm_ups'
                )} AS warm_ups
         FROM player_account_stats stats
         JOIN users ON users.id = stats.user_id
         JOIN player_profiles profile ON profile.user_id = stats.user_id
         JOIN player_account_settings account ON account.user_id = stats.user_id
         JOIN game_accounts game ON game.user_id = stats.user_id
         WHERE stats.game_mode = ? AND stats.season = ?
           AND account.leaderboard_eligible = 1
           AND users.user_kind = 'PLAYER'
           AND account.account_status NOT IN ('BANNED', 'SUSPENDED', 'DELETED')`
      )
      .bind(request.gameMode, season)
      .all<LeaderboardRow>()
    let rows = projectLeaderboardRows(
      result.results.map(row => ({
        ...row,
        level: sourceVisibleAccountLevel(row.level),
        xp: sourceVisibleExperienceXp(row.xp),
        profile_updated_at: sourceVisibleTimestamp(row.profile_updated_at),
        warm_ups: sourceVisibleWarmUps(row.warm_ups)
      }))
    )
    if (request.region) {
      const region = request.region.trim().toUpperCase()
      rows = rows.filter(row => row.region === region)
    }
    if (
      request.playerRank &&
      request.playerRank !== ('UNKNOWN' as PlayerRank)
    ) {
      rows = rows.filter(row => row.player_rank === request.playerRank)
    }
    if (request.playerNamePrefix !== undefined) {
      const prefix = request.playerNamePrefix.trim()
      if (prefix && !/^[\w.-]+$/.test(prefix)) {
        throw invalidArgument('name contains characters that are not allowed')
      }
      if (prefix.length >= 3) {
        const needle = prefix.toLocaleLowerCase()
        rows = rows.filter(row => row.name.toLocaleLowerCase().includes(needle))
      }
    }
    return rows
  }

  private entry(
    row: ProjectedLeaderboardRow,
    rewardsAvailable: boolean
  ): LeaderboardEntry {
    const rewards = rewardsAvailable
      ? leaderboardRewardsForRank(row.reward_rank ?? 0)
      : { silverCards: 0, conquestTickets: 0 }
    return sourceLeaderboardEntryWire({
      account: {
        id: row.account_id,
        address: identityReferenceFor(row.user_id),
        name: row.name,
        locale: row.locale,
        createdAt: row.user_created_at,
        updatedAt: row.profile_updated_at,
        experience: row.xp,
        warmUps: row.warm_ups,
        level: row.level,
        // The source leaderboard hydrates its Account directly from the data
        // row, where SeasonLevel is a non-database projection and remains zero.
        seasonLevel: 0,
        levelUpXP: row.next_level_xp,
        ...(row.region ? { region: row.region } : {}),
        ...(row.tag_art_id ? { tagArtID: row.tag_art_id } : {}),
        ...(row.crystal_id !== null ? { crystalID: row.crystal_id } : {}),
        ...(row.title_id !== null ? { titleID: row.title_id } : {})
      },
      accountStat: statFromRow(row, 'leaderboard'),
      rank: row.leaderboard_rank,
      rankedSilverReward: rewards.silverCards,
      rankedTicketReward: rewards.conquestTickets
    })
  }

  async listLeaderboard(page: Page | undefined, request: LeaderboardRequest) {
    const rows = await this.leaderboardRows(request)
    const size = pageSize(page)
    if (page?.before && page.after) {
      throw invalidArgument('page cannot use before and after together')
    }
    const hasRankFilter = leaderboardHasRankFilter(request)
    let start = 0
    let end = Math.min(rows.length, size)
    if (page?.before) {
      const cursor = decodeLeaderboardCursor(page.before, hasRankFilter)
      const next = rows.findIndex(
        row => compareLeaderboardCursor(row, cursor, hasRankFilter) > 0
      )
      start = next < 0 ? rows.length : next
      end = Math.min(rows.length, start + size)
    } else if (page?.after) {
      const cursor = decodeLeaderboardCursor(page.after, hasRankFilter)
      const previousEnd = rows.findIndex(
        row => compareLeaderboardCursor(row, cursor, hasRankFilter) >= 0
      )
      end = previousEnd < 0 ? rows.length : previousEnd
      start = Math.max(0, end - size)
    }
    const slice = rows.slice(start, end)
    const rewardsAvailable = await this.leaderboardRewardsAvailable()
    return {
      page: {
        pageSize: size,
        hasBefore: end < rows.length,
        hasAfter: start > 0,
        sort: [
          ...(!hasRankFilter
            ? [
                {
                  column: 'player_rank',
                  order: 'DESC' as SortBy['order']
                }
              ]
            : []),
          { column: 'st.score', order: 'DESC' as SortBy['order'] },
          { column: 'st.updated_at', order: 'ASC' as SortBy['order'] }
        ],
        ...(slice.length > 0
          ? {
              before: encodeLeaderboardCursor(slice[0], hasRankFilter),
              after: encodeLeaderboardCursor(
                slice[slice.length - 1],
                hasRankFilter
              )
            }
          : {})
      } satisfies Page,
      res: slice.map(row => this.entry(row, rewardsAvailable))
    }
  }

  async accountLeaderboard(
    page: Page | undefined,
    request: LeaderboardRequest & { accountAddress: string }
  ) {
    if (!request.accountAddress.startsWith('identity:')) {
      throw invalidArgument('accountAddress is invalid')
    }
    const userId = request.accountAddress.slice('identity:'.length)
    const player = await this.database
      .prepare(`SELECT 1 FROM users WHERE id = ? AND user_kind = 'PLAYER'`)
      .bind(userId)
      .first()
    if (!userId || !player) {
      throw invalidArgument('no leaderboard entry for this player')
    }
    await this.ensureCurrentStats(userId)
    const rows = await this.leaderboardRows({
      gameMode: request.gameMode,
      season: request.season
    })
    const targetRow = rows.find(row => row.user_id === userId)
    if (!targetRow)
      throw invalidArgument('no leaderboard entry for this player')
    const rankRows = rows.filter(
      row => row.player_rank === targetRow.player_rank
    )
    const target = rankRows.findIndex(row => row.user_id === userId)
    if (target < 0)
      throw invalidArgument('no leaderboard entry for this player')
    const size = Math.min(
      pageSize(page),
      targetRow.player_rank === ('GRANDWEAVER' as PlayerRank)
        ? GRANDWEAVER_COUNT
        : MAX_PAGE_SIZE
    )
    const start = Math.max(
      0,
      Math.min(target - Math.floor(size / 2), rankRows.length - size)
    )
    const rewardsAvailable = await this.leaderboardRewardsAvailable()
    return {
      page: { pageSize: Math.min(size, rankRows.length) } satisfies Page,
      res: rankRows
        .slice(start, start + size)
        .map(row => this.entry(row, rewardsAvailable))
    }
  }

  private async leaderboardRewardsAvailable(): Promise<boolean> {
    try {
      return (await nextLeaderboardRewardTime(this.database)) !== null
    } catch {
      // A malformed schedule must not prevent the leaderboard from loading or
      // advertise rewards that the distribution worker cannot safely issue.
      return false
    }
  }

  async listMatches(
    userId: string,
    page: Page | undefined,
    requestedAddress?: string
  ) {
    const ownAddress = identityReferenceFor(userId)
    if (requestedAddress && requestedAddress !== ownAddress) {
      throw permissionDenied('you can only view your own match history')
    }
    const result = await this.database
      .prepare(
        `SELECT ${MATCH_ROW_COLUMNS}
         FROM multiplayer_matches matches
         WHERE matches.status = 'ended'
           AND (matches.player1_user_id = ? OR matches.player2_user_id = ?)`
      )
      .bind(userId, userId)
      .all<MatchRow>()
    const rows = result.results.filter(row =>
      storedMatchModes(row).some(mode => HISTORY_MODES.has(mode))
    )
    if (page?.before && page?.after) {
      throw invalidArgument('using before and after together is invalid')
    }
    const { keys, returnedSort } = matchSort(page)
    rows.sort((left, right) => compareMatchKey(left, right, keys))
    const size = matchPageSize(page)
    const includesStartedAt = keys.some(key => key.field === 'created_at')
    const cursorValue = page?.before ?? page?.after
    const cursor = cursorValue
      ? decodeMatchCursor(cursorValue, includesStartedAt)
      : undefined
    let candidates = rows
    let slice: MatchRow[]
    let hasBefore = false
    let hasAfter = false
    if (cursor && page?.before) {
      candidates = rows.filter(row => compareMatchKey(row, cursor, keys) > 0)
      slice = candidates.slice(0, size)
      hasBefore = candidates.length > size
      hasAfter = true
    } else if (cursor && page?.after) {
      candidates = rows.filter(row => compareMatchKey(row, cursor, keys) < 0)
      slice = candidates.slice(Math.max(0, candidates.length - size))
      hasBefore = true
      hasAfter = candidates.length > size
    } else {
      slice = rows.slice(0, size)
      hasBefore = rows.length > size
    }
    const matches = slice
      .map(matchFromRow)
      .filter((match): match is Match => match !== null)
    return {
      page: {
        pageSize: size,
        hasBefore,
        hasAfter,
        sort: returnedSort,
        ...(slice.length
          ? {
              before: encodeMatchCursor(slice[0], includesStartedAt),
              after: encodeMatchCursor(
                slice[slice.length - 1],
                includesStartedAt
              )
            }
          : {})
      } satisfies Page,
      res: matches
    }
  }

  async listAdminMatches(
    page: Page | undefined,
    request: GMListMatchesRequest | undefined
  ): Promise<{ page: Page; res: GMMatch[] }> {
    if (page?.before !== undefined && page.after !== undefined) {
      throw invalidArgument('using before and after together is invalid')
    }
    const req = request ?? ({} as GMListMatchesRequest)
    let requestedUserId: string | undefined
    if (req.accountAddress !== undefined) {
      if (!req.accountAddress.startsWith('identity:')) {
        throw invalidArgument('cannot find account')
      }
      requestedUserId = req.accountAddress.slice('identity:'.length)
      const exists = await this.database
        .prepare('SELECT 1 FROM users WHERE id = ?')
        .bind(requestedUserId)
        .first()
      if (!requestedUserId || !exists)
        throw invalidArgument('cannot find account')
    }
    if (req.modes?.some(mode => !ALL_MATCH_MODES.has(mode))) {
      throw invalidArgument('match modes are invalid')
    }
    if (req.statuses?.some(status => !MATCH_STATUSES.has(status))) {
      throw invalidArgument('match statuses are invalid')
    }
    const minimum = req.min_duration
      ? durationSeconds(req.min_duration, 'min_duration')
      : undefined
    const maximum = req.max_duration
      ? durationSeconds(req.max_duration, 'max_duration')
      : undefined
    if (minimum !== undefined && maximum !== undefined && minimum > maximum) {
      throw invalidArgument('match duration range is invalid')
    }
    const result = await this.database
      .prepare(
        `SELECT ${MATCH_ROW_COLUMNS},
                COALESCE(review.reviewed, 0) AS reviewed
         FROM multiplayer_matches matches
         LEFT JOIN match_reviews review ON review.match_id = matches.id`
      )
      .all<MatchRow>()
    const mapped = result.results
      .filter(
        row =>
          !requestedUserId ||
          row.player1_user_id === requestedUserId ||
          row.player2_user_id === requestedUserId
      )
      .map(row => {
        const match = matchFromRow(row)
        if (!match) return null
        const duration = row.ended_at
          ? Math.max(
              0,
              (Date.parse(row.ended_at) - Date.parse(row.created_at)) / 1000
            )
          : undefined
        return { row, match, duration }
      })
      .filter(
        (
          value
        ): value is {
          row: MatchRow
          match: Match
          duration: number | undefined
        } => value !== null
      )
      .filter(
        value =>
          (!req.modes?.length ||
            storedMatchModes(value.row).some(mode =>
              req.modes!.includes(mode)
            )) &&
          (!req.statuses?.length ||
            req.statuses.includes(value.match.status)) &&
          (minimum === undefined ||
            (value.duration !== undefined && value.duration >= minimum)) &&
          (maximum === undefined ||
            (value.duration !== undefined && value.duration <= maximum)) &&
          (req.reviewed === undefined ||
            (value.row.reviewed === 1) === req.reviewed)
      )

    const sort = adminMatchSort(page)
    mapped.sort((left, right) =>
      compareAdminMatchKey(left.row, right.row, sort)
    )
    const size = matchPageSize(page)
    const cursorValue = page?.before ?? page?.after
    const cursor = cursorValue
      ? decodeAdminMatchCursor(cursorValue, sort)
      : undefined
    let candidates = mapped
    let slice: typeof mapped
    let hasBefore = false
    let hasAfter = false
    if (cursor && page?.before !== undefined) {
      candidates = mapped.filter(
        value => compareAdminMatchKey(value.row, cursor, sort) > 0
      )
      slice = candidates.slice(0, size)
      hasBefore = candidates.length > size
      hasAfter = true
    } else if (cursor && page?.after !== undefined) {
      candidates = mapped.filter(
        value => compareAdminMatchKey(value.row, cursor, sort) < 0
      )
      slice = candidates.slice(Math.max(0, candidates.length - size))
      hasBefore = true
      hasAfter = candidates.length > size
    } else {
      slice = mapped.slice(0, size)
      hasBefore = mapped.length > size
    }
    return {
      page: {
        pageSize: size,
        before: slice.length
          ? encodeAdminMatchCursor(slice[0].row, sort)
          : undefined,
        after: slice.length
          ? encodeAdminMatchCursor(slice[slice.length - 1].row, sort)
          : undefined,
        hasBefore,
        hasAfter,
        sort: sort.sort.map(key => key.response)
      },
      res: sourceGMMatchListWire(
        slice.map(value => ({
          match: value.match,
          reviewed: value.row.reviewed === 1,
          duration: value.duration
        }))
      )
    }
  }

  async setReviewed(
    actorUserId: string,
    matchId: number,
    reviewed: boolean
  ): Promise<boolean> {
    if (!Number.isSafeInteger(matchId) || matchId <= 0) {
      throw invalidArgument('matchId is invalid')
    }
    if (typeof reviewed !== 'boolean') {
      throw invalidArgument('reviewed is invalid')
    }
    const now = new Date().toISOString()
    const desired = reviewed ? 1 : 0
    const results = await this.database.batch([
      this.database
        .prepare(
          `INSERT INTO match_review_audit
             (match_id, previous_reviewed, reviewed, actor_user_id, created_at)
           SELECT matches.id, COALESCE(review.reviewed, 0), ?, ?, ?
           FROM multiplayer_matches matches
           LEFT JOIN match_reviews review ON review.match_id = matches.id
           WHERE matches.id = ? AND COALESCE(review.reviewed, 0) <> ?`
        )
        .bind(desired, actorUserId, now, matchId, desired),
      this.database
        .prepare(
          `INSERT INTO match_reviews
             (match_id, reviewed, reviewer_user_id, created_at, updated_at)
           SELECT id, ?, ?, ?, ? FROM multiplayer_matches WHERE id = ?
           ON CONFLICT(match_id) DO UPDATE SET
             reviewed = excluded.reviewed,
             reviewer_user_id = excluded.reviewer_user_id,
             updated_at = excluded.updated_at`
        )
        .bind(desired, actorUserId, now, now, matchId)
    ])
    if (results[1].meta.changes !== 1) throw notFound('match not found')
    return true
  }

  async getMatch(userId: string, matchId: number): Promise<Match> {
    if (!Number.isSafeInteger(matchId) || matchId <= 0) {
      throw invalidArgument('matchID is invalid')
    }
    const row = await this.database
      .prepare(
        `SELECT ${MATCH_ROW_COLUMNS}
         FROM multiplayer_matches matches
         WHERE matches.id = ?`
      )
      .bind(matchId)
      .first<MatchRow>()
    if (!row) throw notFound('match not found')

    const systemParticipant = await this.hasSystemParticipant(row)
    if (systemParticipant) throw notFound('match is private')

    const participant =
      row.player1_user_id === userId || row.player2_user_id === userId
    const modes = storedMatchModes(row)
    if (
      !participant &&
      !isRankedMatchModes(modes) &&
      conquestMatchMode(modes) === undefined
    ) {
      throw notFound('match is private')
    }
    const match = matchFromRow(row)
    if (!match) throw notFound('match not found')
    return participant ? match : { ...match, replayID: '' }
  }

  async matchByReplay(matchId: number, replayId: string) {
    const row = await this.database
      .prepare(
        `SELECT ${MATCH_ROW_COLUMNS}
         FROM multiplayer_matches matches
         WHERE matches.id = ? AND matches.replay_id = ?`
      )
      .bind(matchId, replayId)
      .first<MatchRow>()
    if (!row) return null
    const systemParticipant = await this.hasSystemParticipant(row)
    const match = matchFromRow(row)
    return match
      ? {
          match,
          proposalId: row.proposal_id,
          inProgress: row.ended_at === null,
          startedAt: row.created_at,
          systemParticipant
        }
      : null
  }

  private async hasSystemParticipant(row: MatchRow): Promise<boolean> {
    const userIds = [row.player1_user_id, row.player2_user_id].filter(
      (userId): userId is string => userId !== null
    )
    if (userIds.length === 0) return false
    const system = await this.database
      .prepare(
        `SELECT 1 FROM users account
         LEFT JOIN registered_matchmaker_bots bot ON bot.user_id = account.id
         WHERE account.user_kind = 'SYSTEM' AND bot.user_id IS NULL
           AND account.id IN (${userIds.map(() => '?').join(',')})
         LIMIT 1`
      )
      .bind(...userIds)
      .first()
    return Boolean(system)
  }
}
