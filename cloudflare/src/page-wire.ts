import type { Page, SortBy } from '@opensky/proto'

export interface SourceSortByInput {
  column?: string
  order?: SortBy['order'] | null
}

export interface SourcePageInput {
  pageSize?: number | null
  before?: string | null
  hasBefore?: boolean | null
  after?: string | null
  hasAfter?: boolean | null
  sort?: Array<SourceSortByInput | null> | null
}

export interface SourceSortByWire {
  column: string
  order: SortBy['order'] | null
}

export interface SourcePageWire {
  pageSize: number | null
  before: string | null
  hasBefore: boolean | null
  after: string | null
  hasAfter: boolean | null
  sort: Array<SourceSortByWire | null> | null
}

// Page and SortBy have no omitempty tags in the generated Go API. Pointer
// fields therefore cross the JSON boundary as explicit nulls, including the
// Page pointer itself when a handler returns nil.
export const sourcePageWire = (
  page: SourcePageInput | Page | null | undefined
): SourcePageWire | null =>
  page === null || page === undefined
    ? null
    : {
        pageSize: page.pageSize ?? null,
        before: page.before ?? null,
        hasBefore: page.hasBefore ?? null,
        after: page.after ?? null,
        hasAfter: page.hasAfter ?? null,
        sort:
          page.sort === null || page.sort === undefined
            ? null
            : page.sort.map(sort =>
                sort === null
                  ? null
                  : {
                      column: sort.column ?? '',
                      order: sort.order ?? null
                    }
              )
      }

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

// Every paginated RPC response has its Page at the top level. Applying the
// projection in the shared JSON boundary protects all present and future
// routes instead of relying on each repository to remember null completion.
export const sourceResponsePageWire = (body: unknown): unknown => {
  if (!isRecord(body) || !Object.hasOwn(body, 'page')) return body
  return { ...body, page: sourcePageWire(body.page as SourcePageInput) }
}
