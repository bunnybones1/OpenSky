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
  cards_revision: undefined,
  cardsRevision: undefined,
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

const cursor = (offset: number) => btoa(JSON.stringify({ offset }))

const cursorOffset = (value?: string) => {
  if (!value) return 0
  try {
    const parsed = JSON.parse(atob(value)) as { offset?: unknown }
    if (Number.isSafeInteger(parsed.offset) && (parsed.offset as number) >= 0) {
      return parsed.offset as number
    }
  } catch {
    // Fall through to the source-compatible invalid page response.
  }
  throw invalidArgument('page cursor is invalid')
}

const compareValue = (left: unknown, right: unknown) => {
  if (typeof left === 'number' && typeof right === 'number') return left - right
  return String(left).localeCompare(String(right))
}

const requestedSort = (page: Page | undefined, search: boolean): SortBy[] => {
  const sort = page?.sort?.length
    ? page.sort
    : [
        { column: 'score', order: 'DESC' as SortBy['order'] },
        // cards_revision is constant because reads are scoped to the generated
        // library SHA; keeping the historical direction has no visible effect.
        {
          column: 'deck_string',
          order: 'DESC' as SortBy['order']
        }
      ]
  for (const item of sort) {
    if (!(item.column in SORT_COLUMNS)) {
      throw invalidArgument(
        `unsupported deck-rank sort column '${item.column}'`
      )
    }
    if (!['ASC', 'DESC'].includes(item.order)) {
      throw invalidArgument('deck-rank sort order is invalid')
    }
  }
  return sort
}

const sortRows = (
  rows: DeckRankRow[],
  page: Page | undefined,
  search: boolean
) => {
  const sort = requestedSort(page, search)
  const uniqueOrder =
    sort.find(item => SORT_COLUMNS[item.column] === 'deck_string')?.order ??
    (page?.sort?.length === 1 ? page.sort[0].order : 'DESC')
  return rows.sort((left, right) => {
    for (const item of sort) {
      const column = SORT_COLUMNS[item.column]
      if (!column) continue
      const compared = compareValue(left[column], right[column])
      if (compared) return item.order === 'DESC' ? -compared : compared
    }
    const deckStringSort = sort.find(
      item => SORT_COLUMNS[item.column] === 'deck_string'
    )
    return (deckStringSort?.order ?? uniqueOrder) === 'ASC'
      ? left.deck_string.localeCompare(right.deck_string)
      : right.deck_string.localeCompare(left.deck_string)
  })
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
        `SELECT ranks.deck_string, ranks.deck_class, ranks.card_ids_json,
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
    const rows = sortRows(result.results.filter(filter), page, search)
    const size = pageSize(page)
    // Existing Cloud Weasel list RPCs use before as the forward cursor. Accept
    // after as well so generated source clients can walk either direction.
    const offset = cursorOffset(page?.before ?? page?.after)
    const slice = rows.slice(offset, offset + size)
    const next = offset + slice.length
    return {
      page: {
        pageSize: size,
        before: slice.length ? cursor(offset) : undefined,
        after: slice.length ? cursor(next) : undefined,
        hasBefore: next < rows.length,
        hasAfter: offset > 0
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
