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

import { encodeDeckString } from './deck-codec'
import { invalidArgument, notFound, permissionDenied } from './errors'
import { seasonFromDate } from './legacy-seasons'
import { identityReferenceFor } from './rpc-principal'

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
const PUBLIC_MATCH_MODES = new Set<GameMode>([
  'RANKED_CONSTRUCTED' as GameMode,
  'RANKED_DISCOVERY' as GameMode,
  'CONQUEST_CONSTRUCTED' as GameMode,
  'CONQUEST_DISCOVERY' as GameMode
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
}

interface LeaderboardRow extends StatRow {
  name: string
  locale: string
  region: string | null
  tag_art_id: string | null
  title_id: number | null
  user_created_at: string
  profile_updated_at: string
  level: number
  xp: number
  next_level_xp: number
  basic_skypass_level: number
}

interface MatchRow {
  id: number
  proposal_id: string
  replay_id: string
  mode: GameMode
  status: 'creating' | 'active' | 'ended' | 'failed'
  player1_user_id: string | null
  player2_user_id: string | null
  match_payload_json: string
  winner_player: number | null
  result_json: string | null
  created_at: string
  updated_at: string
  ended_at: string | null
  reviewed?: number
}

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

const encodeCursor = (offset: number): string =>
  btoa(JSON.stringify({ offset }))

const decodeCursor = (cursor?: string): number => {
  if (!cursor) return 0
  try {
    const value = JSON.parse(atob(cursor)) as { offset?: unknown }
    return Number.isSafeInteger(value.offset) && (value.offset as number) >= 0
      ? (value.offset as number)
      : 0
  } catch {
    throw invalidArgument('page cursor is invalid')
  }
}

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

const statFromRow = (row: StatRow, rank?: number): AccountStat => {
  const gamesPlayed = row.win_count + row.loss_count + row.tie_count
  const experience = totalExperience(row.level ?? 1, row.xp ?? 0)
  const rankProgress =
    row.player_rank === ('UNRANKED' as PlayerRank)
      ? Math.min(1, Math.floor((experience / 200) * 100) / 100)
      : undefined
  return {
    gameMode: row.game_mode,
    winCount: row.win_count,
    lossCount: row.loss_count,
    tieCount: row.tie_count,
    forfeitCount: row.forfeit_count,
    abandonCount: row.abandon_count,
    winRatio: gamesPlayed > 0 ? row.win_count / gamesPlayed : 0,
    gamesPlayed,
    experience,
    score: row.score,
    createdAt: row.created_at,
    ...(rank !== undefined ? { rank } : {}),
    ...(rankProgress !== undefined ? { rankProgress } : {}),
    playerRank: row.player_rank,
    playerRankStage: row.player_rank_stage,
    playerRankState: row.player_rank_state,
    winStreak: row.win_streak,
    lossStreak: row.loss_streak,
    season: row.season
  }
}

const syntheticStat = (
  gameMode: GameMode,
  season: number,
  level: number,
  xp: number
): AccountStat =>
  statFromRow({
    user_id: '',
    game_mode: gameMode,
    season,
    win_count: 0,
    loss_count: 0,
    tie_count: 0,
    forfeit_count: 0,
    abandon_count: 0,
    score: 0,
    player_rank: 'UNRANKED' as PlayerRank,
    player_rank_stage: 'STAGE_NONE' as PlayerRankStage,
    player_rank_state: '',
    win_streak: 0,
    loss_streak: 0,
    created_at: new Date(0).toISOString(),
    updated_at: new Date(0).toISOString(),
    level,
    xp
  })

const compareRows = (left: StatRow, right: StatRow): number =>
  (RANK_ORDER[right.player_rank] ?? 0) - (RANK_ORDER[left.player_rank] ?? 0) ||
  right.score - left.score ||
  left.updated_at.localeCompare(right.updated_at) ||
  left.user_id.localeCompare(right.user_id)

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

const matchPlayer = (
  participant: MatchPayloadParticipant | undefined,
  userId: string | null
): MatchPlayer => {
  const account = participant?.account || {}
  const privateSeed = participant?.privateSeed || {}
  const deckClass = deckClassForPrisms(privateSeed.prisms)
  const cardIds = Array.isArray(privateSeed.cards)
    ? privateSeed.cards
        .map(card => Number(card))
        .filter(card => Number.isSafeInteger(card) && card > 0)
    : []
  const deckString = encodeDeckString(cardIds, deckClass)
  return {
    id: Number.isSafeInteger(account.id) ? account.id! : 0,
    address: userId
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
    deckString,
    initDeckString: deckString,
    deckClass,
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
  }
  try {
    payload = JSON.parse(row.match_payload_json) as MatchPayload
    resultBody = row.result_json ? JSON.parse(row.result_json) : {}
  } catch {
    return null
  }
  const player1 = matchPlayer(payload.match?.player1, row.player1_user_id)
  const player2 = matchPlayer(payload.match?.player2, row.player2_user_id)
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
  return {
    id: row.id,
    status: status as Match['status'],
    player1,
    player2,
    player1GameMode: row.mode,
    player2GameMode: row.mode,
    initPlayer1DeckNumCards: 0,
    initPlayer2DeckNumCards: 0,
    player1DeckClass: player1.deckClass,
    player2DeckClass: player2.deckClass,
    ...(row.winner_player !== null
      ? { winningPlayer: row.winner_player + 1 }
      : {}),
    turnNonce:
      typeof resultBody.turnCount === 'number' ? resultBody.turnCount : 0,
    player1Moves:
      typeof resultBody.moveCount === 'number' ? resultBody.moveCount : 0,
    player2Moves:
      typeof resultBody.moveCount === 'number' ? resultBody.moveCount : 0,
    metrics: {},
    startedAt: row.created_at,
    ...(row.ended_at ? { endedAt: row.ended_at } : {}),
    updatedAt: row.updated_at,
    createdAt: row.created_at,
    replayID: row.replay_id
  }
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
             )`
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
        `SELECT stats.*, profile.level, profile.xp
         FROM player_account_stats stats
         JOIN player_profiles profile ON profile.user_id = stats.user_id
         WHERE stats.user_id = ? AND stats.season = ?
           AND stats.game_mode IN ('RANKED_CONSTRUCTED', 'RANKED_DISCOVERY')`
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
      .prepare('SELECT level, xp FROM player_profiles WHERE user_id = ?')
      .bind(userId)
      .first<{ level: number; xp: number }>()
    if (!profile) return null

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
        `SELECT stats.*, profile.level, profile.xp
         FROM player_account_stats stats
         JOIN player_profiles profile ON profile.user_id = stats.user_id
         WHERE stats.user_id = ? AND stats.season IN (${placeholders})
           AND stats.game_mode IN ('RANKED_CONSTRUCTED', 'RANKED_DISCOVERY')`
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
            : syntheticStat(mode, season, profile.level, profile.xp)
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
        `SELECT stats.*, account.name, account.locale, account.region,
                account.tag_art_id, account.title_id,
                users.created_at AS user_created_at,
                profile.updated_at AS profile_updated_at,
                profile.level, profile.xp, profile.next_level_xp,
                progression.basic_skypass_level
         FROM player_account_stats stats
         JOIN users ON users.id = stats.user_id
         JOIN player_profiles profile ON profile.user_id = stats.user_id
         JOIN player_progression progression ON progression.user_id = stats.user_id
         JOIN player_account_settings account ON account.user_id = stats.user_id
         WHERE stats.game_mode = ? AND stats.season = ?`
      )
      .bind(request.gameMode, season)
      .all<LeaderboardRow>()
    let rows = result.results
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
    return rows.sort(compareRows)
  }

  private entry(
    row: LeaderboardRow,
    allRows: LeaderboardRow[]
  ): LeaderboardEntry {
    const rank =
      allRows.findIndex(candidate => candidate.user_id === row.user_id) + 1
    return {
      account: {
        id: 0,
        address: identityReferenceFor(row.user_id),
        name: row.name,
        locale: row.locale,
        createdAt: row.user_created_at,
        updatedAt: row.profile_updated_at,
        experience: row.xp,
        warmUps: 0,
        level: row.level,
        seasonLevel: row.basic_skypass_level,
        levelUpXP: row.next_level_xp,
        isBurnerWallet: false,
        ...(row.region ? { region: row.region } : {}),
        ...(row.tag_art_id ? { tagArtID: row.tag_art_id } : {}),
        ...(row.title_id !== null ? { titleID: row.title_id } : {})
      },
      accountStat: statFromRow(row, rank),
      rank,
      rankedSilverReward: 0,
      rankedTicketReward: 0
    }
  }

  async listLeaderboard(page: Page | undefined, request: LeaderboardRequest) {
    const rows = await this.leaderboardRows(request)
    const size = pageSize(page)
    const offset = decodeCursor(page?.before)
    const slice = rows.slice(offset, offset + size)
    const nextOffset = offset + slice.length
    return {
      page: {
        pageSize: size,
        ...(nextOffset < rows.length
          ? { hasBefore: true, after: encodeCursor(nextOffset) }
          : { hasBefore: false }),
        ...(offset > 0 ? { hasAfter: true } : { hasAfter: false })
      } satisfies Page,
      res: slice.map(row => this.entry(row, rows))
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
    await this.ensureCurrentStats(userId)
    const rows = await this.leaderboardRows(request)
    const target = rows.findIndex(row => row.user_id === userId)
    if (target < 0)
      throw invalidArgument('no leaderboard entry for this player')
    const size = pageSize(page)
    const start = Math.max(
      0,
      Math.min(target - Math.floor(size / 2), rows.length - size)
    )
    return {
      page: { pageSize: Math.min(size, rows.length) } satisfies Page,
      res: rows.slice(start, start + size).map(row => this.entry(row, rows))
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
        `SELECT id, proposal_id, replay_id, mode, status, player1_user_id,
                player2_user_id, match_payload_json, winner_player,
                result_json, created_at, updated_at, ended_at
         FROM multiplayer_matches
         WHERE status = 'ended'
           AND (player1_user_id = ? OR player2_user_id = ?)
         ORDER BY created_at DESC, id DESC`
      )
      .bind(userId, userId)
      .all<MatchRow>()
    const rows = result.results.filter(row => HISTORY_MODES.has(row.mode))
    const size = pageSize(page)
    const offset = decodeCursor(page?.before)
    const slice = rows.slice(offset, offset + size)
    const nextOffset = offset + slice.length
    const matches = slice
      .map(matchFromRow)
      .filter((match): match is Match => match !== null)
    return {
      page: {
        pageSize: size,
        ...(nextOffset < rows.length
          ? { hasBefore: true, after: encodeCursor(nextOffset) }
          : { hasBefore: false }),
        ...(offset > 0 ? { hasAfter: true } : { hasAfter: false })
      } satisfies Page,
      res: matches
    }
  }

  async listAdminMatches(
    page: Page | undefined,
    request: GMListMatchesRequest | undefined
  ): Promise<{ page: Page; res: GMMatch[] }> {
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
        `SELECT matches.id, matches.proposal_id, matches.replay_id,
                matches.mode, matches.status, matches.player1_user_id,
                matches.player2_user_id, matches.match_payload_json,
                matches.winner_player, matches.result_json,
                matches.created_at, matches.updated_at, matches.ended_at,
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
          (!req.modes?.length || req.modes.includes(value.row.mode)) &&
          (!req.statuses?.length ||
            req.statuses.includes(value.match.status)) &&
          (minimum === undefined ||
            (value.duration !== undefined && value.duration >= minimum)) &&
          (maximum === undefined ||
            (value.duration !== undefined && value.duration <= maximum)) &&
          (req.reviewed === undefined ||
            (value.row.reviewed === 1) === req.reviewed)
      )

    const sort = page?.sort?.length
      ? page.sort
      : [{ column: 'started_at', order: 'DESC' as SortBy['order'] }]
    for (const item of sort) {
      if (
        !['started_at', 'startedAt', 'ended_at', 'endedAt'].includes(
          item.column
        )
      ) {
        throw invalidArgument(`unsupported match sort column '${item.column}'`)
      }
      if (!['ASC', 'DESC'].includes(item.order)) {
        throw invalidArgument('match sort order is invalid')
      }
    }
    mapped.sort((left, right) => {
      for (const item of sort) {
        const ended = item.column === 'ended_at' || item.column === 'endedAt'
        const leftValue = ended
          ? (left.row.ended_at ?? '')
          : left.row.created_at
        const rightValue = ended
          ? (right.row.ended_at ?? '')
          : right.row.created_at
        const compared = leftValue.localeCompare(rightValue)
        if (compared) return item.order === 'DESC' ? -compared : compared
      }
      return right.row.id - left.row.id
    })

    const size = pageSize(page)
    const offset = decodeCursor(page?.before ?? page?.after)
    const slice = mapped.slice(offset, offset + size)
    const nextOffset = offset + slice.length
    return {
      page: {
        pageSize: size,
        before: slice.length
          ? encodeCursor(Math.max(0, offset - size))
          : undefined,
        after: slice.length ? encodeCursor(nextOffset) : undefined,
        hasBefore: nextOffset < mapped.length,
        hasAfter: offset > 0,
        sort
      },
      res: slice.map(value => ({
        match: value.match,
        reviewed: value.row.reviewed === 1,
        ...(value.duration !== undefined ? { duration: value.duration } : {})
      }))
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
        `SELECT id, proposal_id, replay_id, mode, status, player1_user_id,
                player2_user_id, match_payload_json, winner_player,
                result_json, created_at, updated_at, ended_at
         FROM multiplayer_matches
         WHERE id = ?`
      )
      .bind(matchId)
      .first<MatchRow>()
    if (!row) throw notFound('match not found')

    const participant =
      row.player1_user_id === userId || row.player2_user_id === userId
    if (!participant && !PUBLIC_MATCH_MODES.has(row.mode)) {
      throw notFound('match is private')
    }
    const match = matchFromRow(row)
    if (!match) throw notFound('match not found')
    return participant ? match : { ...match, replayID: '' }
  }

  async matchByReplay(matchId: number, replayId: string) {
    const row = await this.database
      .prepare(
        `SELECT id, proposal_id, replay_id, mode, status, player1_user_id,
                player2_user_id, match_payload_json, winner_player,
                result_json, created_at, updated_at, ended_at
         FROM multiplayer_matches
         WHERE id = ? AND replay_id = ?`
      )
      .bind(matchId, replayId)
      .first<MatchRow>()
    if (!row) return null
    const match = matchFromRow(row)
    return match
      ? {
          match,
          proposalId: row.proposal_id,
          inProgress: row.ended_at === null,
          startedAt: row.created_at
        }
      : null
  }
}
