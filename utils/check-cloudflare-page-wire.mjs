import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const structBody = (source, name) =>
  source.match(new RegExp(`type ${name} struct \\{([\\s\\S]*?)\\n\\}`))?.[1]

const jsonFields = body =>
  body
    ? [...body.matchAll(/^\s*(\w+)\s+([^`]+)`[^`]*json:"([^"]+)"[^`]*`/gm)].map(
        match => ({
          type: match[2].trim(),
          json: match[3].split(',')[0],
          omitEmpty: match[3].split(',').includes('omitempty')
        })
      )
    : []

const section = (source, start, end) => {
  const startIndex = source.indexOf(start)
  const endIndex = source.indexOf(end, startIndex + start.length)
  if (startIndex < 0) return ''
  return source.slice(
    startIndex,
    endIndex > startIndex ? endIndex : source.length
  )
}

export const pageWireErrors = (
  generatedSource,
  paginationSource,
  feedsSource,
  leaderboardSource,
  pageWire,
  api,
  playerRPC,
  competitive,
  packageSource
) => {
  const errors = []
  const pageFields = jsonFields(structBody(generatedSource, 'Page'))
  if (
    JSON.stringify(pageFields.map(field => field.json)) !==
    JSON.stringify([
      'pageSize',
      'before',
      'hasBefore',
      'after',
      'hasAfter',
      'sort'
    ])
  ) {
    errors.push('source Page JSON field contract changed')
  }
  if (
    JSON.stringify(pageFields.map(field => field.type)) !==
    JSON.stringify([
      '*uint32',
      '*string',
      '*bool',
      '*string',
      '*bool',
      '[]*SortBy'
    ])
  ) {
    errors.push('source Page field-type contract changed')
  }
  if (pageFields.some(field => field.omitEmpty)) {
    errors.push('source Page unexpectedly omits a JSON field')
  }

  const sortFields = jsonFields(structBody(generatedSource, 'SortBy'))
  if (
    JSON.stringify(sortFields.map(field => field.json)) !==
      JSON.stringify(['column', 'order']) ||
    JSON.stringify(sortFields.map(field => field.type)) !==
      JSON.stringify(['string', '*SortOrder']) ||
    sortFields.some(field => field.omitEmpty)
  ) {
    errors.push('source SortBy JSON contract changed')
  }

  const paginator = section(
    paginationSource,
    'func NewPaginator(',
    'func (p *Paginator) SetOptions('
  )
  for (const token of [
    'page = &proto.Page{}',
    'page.PageSize = &defaultPageSize',
    'page.PageSize = &maxPageSize'
  ]) {
    if (!paginator.includes(token)) {
      errors.push(`source Page initialization changed: ${token}`)
    }
  }
  const prepareSort = section(
    paginationSource,
    'func (p *Paginator) prepareSortKeys()',
    'func (p *Paginator) buildAmbiguityClauses('
  )
  for (const token of [
    'p.page.Sort = p.defaultSortBy',
    'filteredSort := make([]*proto.SortBy, 0, len(p.page.Sort))',
    'p.page.Sort[i].Order = &defaultOrder',
    'p.page.Sort = filteredSort'
  ]) {
    if (!prepareSort.includes(token)) {
      errors.push(`source SortBy response behavior changed: ${token}`)
    }
  }
  const attachCursor = section(
    paginationSource,
    'func (p *Paginator) attachCursor(',
    'func (p *Paginator) orderByClause('
  )
  for (const token of [
    'p.page.HasBefore = new(bool)',
    'p.page.HasAfter = new(bool)',
    'p.page.Before = nil',
    'p.page.After = nil',
    'p.page.Before = &value',
    'p.page.After = &value'
  ]) {
    if (!attachCursor.includes(token)) {
      errors.push(`source Page cursor behavior changed: ${token}`)
    }
  }

  const sourceFeed = section(
    feedsSource,
    'func (s *Server) GetFeed(',
    'func (s *Server) GetNotifications('
  )
  for (const token of [
    'Column: "id"',
    'Column: "created_at"',
    'Order:  &sortOrder_DESC',
    'NewPaginator(page, cursorKey, orderByCreatedAt)'
  ]) {
    if (!sourceFeed.includes(token)) {
      errors.push(`source feed Page sort changed: ${token}`)
    }
  }
  const sourceLeaderboard = section(
    leaderboardSource,
    'func (s *Server) fetchLeaderboardEntries(',
    'func (s *Server) AccountLeaderboard('
  )
  for (const token of [
    'Column: "player_rank"',
    'Column: "st.score"',
    'Column: "st.updated_at"',
    'Column: "st.account_id"',
    'NewPaginator(page, cursorKey, sortBy...)'
  ]) {
    if (!sourceLeaderboard.includes(token)) {
      errors.push(`source leaderboard Page sort changed: ${token}`)
    }
  }
  if (
    !leaderboardSource.includes(
      'page = &proto.Page{\n\t\t\tPageSize: &entriesPageSize,'
    )
  ) {
    errors.push('source AccountLeaderboard sparse Page contract changed')
  }

  const compactWire = pageWire.replace(/\s+/g, ' ')
  for (const token of [
    'pageSize: page.pageSize ?? null',
    'before: page.before ?? null',
    'hasBefore: page.hasBefore ?? null',
    'after: page.after ?? null',
    'hasAfter: page.hasAfter ?? null',
    'page.sort === null || page.sort === undefined ? null',
    "column: sort.column ?? ''",
    'order: sort.order ?? null',
    "Object.hasOwn(body, 'page')",
    'page: sourcePageWire(body.page as SourcePageInput)'
  ]) {
    if (!compactWire.includes(token)) {
      errors.push(`Worker Page wire is missing: ${token}`)
    }
  }

  if (!api.includes("import { sourceResponsePageWire } from './page-wire'")) {
    errors.push('main Worker lost the shared Page wire import')
  }
  if (!api.includes('JSON.stringify(sourceResponsePageWire(body))')) {
    errors.push('main Worker JSON boundary bypasses the shared Page wire')
  }

  const workerFeed = section(
    playerRPC,
    'async feed(',
    'private async getIdentityAccount('
  ).replace(/\s+/g, ' ')
  for (const token of [
    "column: 'created_at'",
    "order: 'DESC' as SortBy['order']"
  ]) {
    if (!workerFeed.includes(token)) {
      errors.push(`Worker feed Page sort is missing: ${token}`)
    }
  }
  const workerLeaderboard = section(
    competitive,
    'async listLeaderboard(',
    'async accountLeaderboard('
  ).replace(/\s+/g, ' ')
  for (const token of [
    "column: 'player_rank'",
    "column: 'st.score'",
    "column: 'st.updated_at'",
    "order: 'DESC' as SortBy['order']",
    "order: 'ASC' as SortBy['order']"
  ]) {
    if (!workerLeaderboard.includes(token)) {
      errors.push(`Worker leaderboard Page sort is missing: ${token}`)
    }
  }

  const scripts = JSON.parse(packageSource).scripts ?? {}
  if (
    scripts['check:cloudflare:page-wire'] !==
    'node --test ./utils/check-cloudflare-page-wire.test.mjs && node ./utils/check-cloudflare-page-wire.mjs'
  ) {
    errors.push('package scripts lost the Page wire gate')
  }
  if (
    !String(scripts['build:cloudflare']).includes(
      'pnpm check:cloudflare:page-wire'
    )
  ) {
    errors.push('complete Cloudflare build bypasses the Page wire gate')
  }
  return errors
}

const main = async () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  const files = [
    'api/proto/api.gen.go',
    'api/rpc/pagination.go',
    'api/rpc/feeds.go',
    'api/rpc/leaderboard.go',
    'cloudflare/src/page-wire.ts',
    'cloudflare/src/api.ts',
    'cloudflare/src/player-rpc.ts',
    'cloudflare/src/competitive.ts',
    'package.json'
  ]
  const values = await Promise.all(
    files.map(file => readFile(path.join(root, file), 'utf8'))
  )
  const errors = pageWireErrors(...values)
  if (errors.length) {
    console.error(errors.join('\n'))
    process.exitCode = 1
  } else {
    console.log(
      'Page and SortBy preserve generated nulls, field order, cursors, and effective default sorts'
    )
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  await main()
}
