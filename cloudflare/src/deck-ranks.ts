import cardLibrary from './generated/card-library.json'
import type {
  Account,
  DeckClass,
  DeckRank,
  DeckRankAccount,
  Page,
  SearchDeckRanksRequest,
  SortBy
} from '@opensky/proto'

import { invalidArgument, notFound } from './errors'
import { identityReferenceFor } from './rpc-principal'

export const CURRENT_DECK_RANK_LIBRARY_REVISION = cardLibrary.sourceSha256
const DEFAULT_PAGE_SIZE = 20
const MAX_PAGE_SIZE = 200
const COMPLETE_DECK_SIZE = 30
const activeCardIds = new Set(cardLibrary.cards.map(card => card.id))
const SORT_COLUMNS: Record<string, keyof DeckRankRow | undefined> = {
  cards_revision: 'library_revision',
  cardsRevision: 'library_revision',
  deck_string: 'deck_string',
  deckString: 'deck_string',
  class: 'deck_class',
  score: 'score',
  win_count: 'win_count',
  winCount: 'win_count',
  loss_count: 'loss_count',
  lossCount: 'loss_count',
  forfeit_count: 'forfeit_count',
  forfeitCount: 'forfeit_count',
  abandon_count: 'abandon_count',
  abandonCount: 'abandon_count',
  tie_count: 'tie_count',
  tieCount: 'tie_count',
  games_played: 'games_played',
  gamesPlayed: 'games_played',
  win_ratio: 'win_ratio',
  winRatio: 'win_ratio'
}

interface DeckRankRow {
  library_revision: string
  deck_string: string
  deck_class: DeckClass
  card_ids_json: string
  score: number
  highest_player_user_id: string | null
  highest_player_account_id: number | null
  win_count: number
  loss_count: number
  forfeit_count: number
  abandon_count: number
  tie_count: number
  games_played: number
  win_ratio: number
}

interface DeckRankResult {
  page: Page
  rows: DeckRankRow[]
}

const pageSize = (page?: Page) =>
  Math.min(
    MAX_PAGE_SIZE,
    Number.isSafeInteger(page?.pageSize) && (page?.pageSize ?? 0) > 0
      ? page!.pageSize!
      : DEFAULT_PAGE_SIZE
  )

const compareValue = (left: unknown, right: unknown) => {
  if (typeof left === 'number' && typeof right === 'number') return left - right
  return String(left).localeCompare(String(right))
}

interface DeckRankSortConfig {
  sort: SortBy[]
  uniqueOrder: SortBy['order']
}

interface DeckRankCursor {
  deckString: string
  values: string[]
}

const requestedSort = (
  page: Page | undefined,
  search: boolean
): DeckRankSortConfig => {
  const requested = page?.sort?.length
    ? page.sort
    : [
        { column: 'score', order: 'DESC' as SortBy['order'] },
        {
          column: 'cards_revision',
          order: (search ? 'ASC' : 'DESC') as SortBy['order']
        }
      ]
  const sort: SortBy[] = []
  let uniqueOrder = 'DESC' as SortBy['order']
  for (const item of requested) {
    if (!(item.column in SORT_COLUMNS)) {
      throw invalidArgument(
        `unsupported deck-rank sort column '${item.column}'`
      )
    }
    if (!['ASC', 'DESC'].includes(item.order)) {
      throw invalidArgument('deck-rank sort order is invalid')
    }
    if (SORT_COLUMNS[item.column] === 'deck_string') {
      uniqueOrder = item.order
    } else {
      sort.push(item)
    }
  }
  if (sort.length === 1) uniqueOrder = sort[0].order
  return { sort, uniqueOrder }
}

const sortRows = (rows: DeckRankRow[], config: DeckRankSortConfig) => {
  return rows.sort((left, right) => {
    for (const item of config.sort) {
      const column = SORT_COLUMNS[item.column]
      if (!column) continue
      const compared = compareValue(left[column], right[column])
      if (compared) return item.order === 'DESC' ? -compared : compared
    }
    return config.uniqueOrder === 'ASC'
      ? left.deck_string.localeCompare(right.deck_string)
      : right.deck_string.localeCompare(left.deck_string)
  })
}

const encodeCursor = (row: DeckRankRow, config: DeckRankSortConfig): string =>
  btoa(
    JSON.stringify([
      row.deck_string,
      ...config.sort.map(item => String(row[SORT_COLUMNS[item.column]!]))
    ])
  )

const decodeCursor = (
  value: string,
  config: DeckRankSortConfig
): DeckRankCursor => {
  try {
    const values = JSON.parse(atob(value)) as unknown
    if (
      !Array.isArray(values) ||
      values.length !== config.sort.length + 1 ||
      values.some(item => typeof item !== 'string') ||
      !values[0]
    ) {
      throw new Error('cursor shape')
    }
    return {
      deckString: values[0] as string,
      values: values.slice(1) as string[]
    }
  } catch {
    throw invalidArgument('page cursor is invalid')
  }
}

const cursorValue = (value: string, column: keyof DeckRankRow) => {
  if (
    [
      'score',
      'win_count',
      'loss_count',
      'forfeit_count',
      'abandon_count',
      'tie_count',
      'games_played',
      'win_ratio'
    ].includes(column)
  ) {
    const parsed = Number(value)
    if (!Number.isFinite(parsed))
      throw invalidArgument('page cursor is invalid')
    return parsed
  }
  return value
}

const compareCursor = (
  row: DeckRankRow,
  cursor: DeckRankCursor,
  config: DeckRankSortConfig
) => {
  for (const [index, item] of config.sort.entries()) {
    const column = SORT_COLUMNS[item.column]
    if (!column) continue
    const compared = compareValue(
      row[column],
      cursorValue(cursor.values[index], column)
    )
    if (compared) return item.order === 'DESC' ? -compared : compared
  }
  return config.uniqueOrder === 'ASC'
    ? row.deck_string.localeCompare(cursor.deckString)
    : cursor.deckString.localeCompare(row.deck_string)
}

const deckRank = (row: DeckRankRow): DeckRank => ({
  deckString: row.deck_string,
  class: row.deck_class,
  cardIds: JSON.parse(row.card_ids_json) as number[],
  winCount: row.win_count,
  lossCount: row.loss_count,
  forfeitCount: row.forfeit_count,
  abandonCount: row.abandon_count,
  tieCount: row.tie_count,
  winRatio: row.win_ratio,
  gamesPlayed: row.games_played,
  score: row.score,
  highestPlayerID: String(row.highest_player_account_id ?? 0),
  highestPlayerAddress: row.highest_player_user_id
    ? identityReferenceFor(row.highest_player_user_id)
    : ''
})

export const completeDeckRankInsert = (
  database: D1Database,
  input: {
    deckString: string
    deckClass: DeckClass
    cardIds: number[]
    userId: string
    now: string
  }
): D1PreparedStatement | undefined =>
  input.cardIds.length === COMPLETE_DECK_SIZE &&
  new Set(input.cardIds).size === COMPLETE_DECK_SIZE &&
  input.cardIds.every(cardId => activeCardIds.has(cardId))
    ? database
        .prepare(
          `INSERT OR IGNORE INTO player_deck_ranks
             (library_revision, deck_string, deck_class, card_ids_json,
              highest_player_user_id, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          CURRENT_DECK_RANK_LIBRARY_REVISION,
          input.deckString,
          input.deckClass,
          JSON.stringify(
            [...input.cardIds].sort((left, right) => left - right)
          ),
          input.userId,
          input.now,
          input.now
        )
    : undefined

export class DeckRanksRepository {
  constructor(private readonly database: D1Database) {}

  private async query(
    page: Page | undefined,
    search: boolean,
    filter: (row: DeckRankRow) => boolean
  ): Promise<DeckRankResult> {
    const result = await this.database
      .prepare(
        `SELECT ranks.library_revision, ranks.deck_string, ranks.deck_class,
                ranks.card_ids_json,
                ranks.score, ranks.highest_player_user_id,
                account.id AS highest_player_account_id,
                ranks.win_count, ranks.loss_count, ranks.forfeit_count,
                ranks.abandon_count, ranks.tie_count, ranks.games_played,
                ranks.win_ratio
         FROM player_deck_ranks ranks
         LEFT JOIN game_accounts account
           ON account.user_id = ranks.highest_player_user_id
         LEFT JOIN player_account_settings settings
           ON settings.user_id = ranks.highest_player_user_id
         WHERE ranks.library_revision = ?
           AND (ranks.highest_player_user_id IS NULL
             OR settings.leaderboard_eligible = 1)`
      )
      .bind(CURRENT_DECK_RANK_LIBRARY_REVISION)
      .all<DeckRankRow>()
    if (page?.before && page.after) {
      throw invalidArgument('before and after cannot be used together')
    }
    const config = requestedSort(page, search)
    const rows = sortRows(result.results.filter(filter), config)
    const size = pageSize(page)
    let start = 0
    let end = Math.min(rows.length, size)
    if (page?.before) {
      const requested = decodeCursor(page.before, config)
      const next = rows.findIndex(
        row => compareCursor(row, requested, config) > 0
      )
      start = next < 0 ? rows.length : next
      end = Math.min(rows.length, start + size)
    } else if (page?.after) {
      const requested = decodeCursor(page.after, config)
      const previousEnd = rows.findIndex(
        row => compareCursor(row, requested, config) >= 0
      )
      end = previousEnd < 0 ? rows.length : previousEnd
      start = Math.max(0, end - size)
    }
    const slice = rows.slice(start, end)
    return {
      page: {
        pageSize: size,
        hasBefore: end < rows.length,
        hasAfter: start > 0,
        sort: config.sort,
        before: slice.length ? encodeCursor(slice[0], config) : undefined,
        after: slice.length
          ? encodeCursor(slice[slice.length - 1], config)
          : undefined
      },
      rows: slice
    }
  }

  async list(
    page: Page | undefined,
    requestedClass: DeckClass | undefined,
    accountForUser: (userId: string) => Promise<Account | null>
  ): Promise<{ page: Page; res: DeckRankAccount[] }> {
    const result = await this.query(
      page,
      false,
      row =>
        row.score > 0 &&
        (!requestedClass ||
          requestedClass === ('UNKNOWN_CLASS' as DeckClass) ||
          row.deck_class === requestedClass)
    )
    const res: DeckRankAccount[] = []
    for (const row of result.rows) {
      if (!row.highest_player_user_id) throw notFound('missing account')
      const account = await accountForUser(row.highest_player_user_id)
      if (!account) throw notFound('missing account')
      res.push({ deckRank: deckRank(row), highestPlayer: account })
    }
    return { page: result.page, res }
  }

  async search(
    page: Page | undefined,
    request: SearchDeckRanksRequest
  ): Promise<{ page: Page; res: DeckRank[] }> {
    const deckString = request.deckString?.trim()
    const classes = new Set(request.classes ?? [])
    const withCards = (request.withCards ?? []).map(Number)
    if (
      withCards.some(
        card => !Number.isSafeInteger(card) || card <= 0 || card > 65_535
      )
    ) {
      throw invalidArgument('withCards contains an invalid card ID')
    }
    const result = await this.query(page, true, row => {
      let matches = !deckString || row.deck_string === deckString
      if (classes.size) matches = classes.has(row.deck_class)
      if (withCards.length) {
        const cards = new Set(JSON.parse(row.card_ids_json) as number[])
        matches = withCards.every(card => cards.has(card))
      }
      return matches
    })
    return { page: result.page, res: result.rows.map(deckRank) }
  }
}
