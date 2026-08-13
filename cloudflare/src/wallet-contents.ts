import type { WalletConnection } from './identities'
import { IdentitiesRepository } from './identities'

const CHAIN_ID = 137
const REQUEST_TIMEOUT_MS = 5_000
const PAGE_SIZE = 1_000
const MAX_PAGES_PER_WALLET = 5
const MAX_WALLETS = 10
const ITEM_ID_MASK = 0x00ffffn
const ITEM_TYPE_MASK = 0xff0000n

const ITEM_TYPE_BY_TOKEN_CODE = new Map<number, string>([
  [0, 'SW_BASE_CARDS'],
  [1, 'SW_SILVER_CARDS'],
  [2, 'SW_GOLD_CARDS'],
  [3, 'SW_HERO_SKINS'],
  [4, 'SW_CRYSTALS'],
  [5, 'SW_STICKERS'],
  [6, 'SW_CARD_BACKS'],
  [254, 'SW_CONQUEST_TICKET'],
  [255, 'SW_BASE_CARDS']
])
const CENTIMAL_TOKEN_CODES = new Set([1, 2, 3, 4, 5, 6, 254])

interface IndexerBalance {
  contractAddress?: unknown
  accountAddress?: unknown
  tokenID?: unknown
  balance?: unknown
  chainId?: unknown
}

interface IndexerPage {
  page?: unknown
  column?: unknown
  before?: unknown
  after?: unknown
  sort?: unknown
  pageSize?: unknown
  more?: unknown
}

interface IndexerResponse {
  page?: IndexerPage
  balances?: unknown
}

export interface ExternalWalletHolding {
  itemType: string
  tokenId: number
  rawTokenId: string
  balance: string
  rawBalance: string
}

export interface ExternalWalletContents {
  address: string
  label?: string
  verifiedAt: string
  holdings: ExternalWalletHolding[]
  totals: Record<string, string>
  truncated: boolean
}

export type WalletContentsProjection =
  | { status: 'not_configured'; chainId: 137; wallets: [] }
  | {
      status: 'available'
      chainId: 137
      contractAddress: string
      wallets: ExternalWalletContents[]
      totals: Record<string, string>
    }

export interface WalletContentsOptions {
  indexerUrl?: string
  accessKey?: string
  contractAddress?: string
  fetcher?: typeof fetch
}

export class WalletContentsError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string
  ) {
    super(message)
  }
}

const unavailable = (message = 'Wallet contents are temporarily unavailable.') =>
  new WalletContentsError(503, 'wallet.contents_unavailable', message)

const configuredUrl = (value: string | undefined): string | undefined => {
  if (!value?.trim()) return
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:') return
    url.pathname = `${url.pathname.replace(/\/$/, '')}/rpc/Indexer/GetTokenBalances`
    url.search = ''
    url.hash = ''
    return url.toString()
  } catch {
    return
  }
}

const configuredAddress = (value: string | undefined): string | undefined =>
  value && /^0x[0-9a-fA-F]{40}$/.test(value) ? value : undefined

const addToTotals = (
  totals: Record<string, bigint>,
  itemType: string,
  balance: bigint
) => {
  totals[itemType] = (totals[itemType] ?? 0n) + balance
}

const stringTotals = (totals: Record<string, bigint>): Record<string, string> =>
  Object.fromEntries(
    Object.entries(totals)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([itemType, balance]) => [itemType, balance.toString()])
  )

const decodeHolding = (
  row: IndexerBalance,
  address: string,
  contractAddress: string
): ExternalWalletHolding | undefined => {
  if (
    typeof row.accountAddress !== 'string' ||
    row.accountAddress.toLowerCase() !== address.toLowerCase() ||
    typeof row.contractAddress !== 'string' ||
    row.contractAddress.toLowerCase() !== contractAddress.toLowerCase() ||
    row.chainId !== CHAIN_ID ||
    typeof row.tokenID !== 'string' ||
    !/^\d+$/.test(row.tokenID) ||
    typeof row.balance !== 'string' ||
    !/^\d+$/.test(row.balance)
  ) {
    return
  }
  const rawTokenId = BigInt(row.tokenID)
  const rawBalance = BigInt(row.balance)
  if (rawTokenId > BigInt(Number.MAX_SAFE_INTEGER) || rawBalance <= 0n) return
  const tokenCode = Number((rawTokenId & ITEM_TYPE_MASK) >> 16n)
  const itemType = ITEM_TYPE_BY_TOKEN_CODE.get(tokenCode)
  if (!itemType) return
  const balance = CENTIMAL_TOKEN_CODES.has(tokenCode)
    ? rawBalance / 100n
    : rawBalance
  if (balance <= 0n) return

  return {
    itemType,
    tokenId: Number(rawTokenId & ITEM_ID_MASK),
    rawTokenId: row.tokenID,
    balance: balance.toString(),
    rawBalance: row.balance
  }
}

const requestPage = async (
  fetcher: typeof fetch,
  url: string,
  accessKey: string,
  body: Record<string, unknown>
): Promise<IndexerResponse> => {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    const response = await fetcher(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Access-Key': accessKey
      },
      body: JSON.stringify(body),
      signal: controller.signal
    })
    if (!response.ok) throw unavailable()
    const result = (await response.json()) as IndexerResponse
    if (!result || !Array.isArray(result.balances)) throw unavailable()
    if (result.balances.length > PAGE_SIZE) throw unavailable()
    return result
  } catch (error) {
    if (error instanceof WalletContentsError) throw error
    throw unavailable()
  } finally {
    clearTimeout(timeout)
  }
}

const walletContents = async (
  wallet: WalletConnection,
  input: {
    fetcher: typeof fetch
    url: string
    accessKey: string
    contractAddress: string
  }
): Promise<ExternalWalletContents> => {
  const holdings = new Map<string, ExternalWalletHolding>()
  let page: Record<string, unknown> = { pageSize: PAGE_SIZE }
  let truncated = false
  const cursors = new Set<string>()

  for (let pageNumber = 0; pageNumber < MAX_PAGES_PER_WALLET; pageNumber += 1) {
    const response = await requestPage(input.fetcher, input.url, input.accessKey, {
      accountAddress: wallet.address,
      contractAddress: input.contractAddress,
      includeMetadata: false,
      includeCollectionTokens: false,
      page
    })
    for (const candidate of response.balances as IndexerBalance[]) {
      const holding = decodeHolding(
        candidate,
        wallet.address,
        input.contractAddress
      )
      if (!holding) continue
      const key = `${holding.itemType}:${holding.tokenId}`
      const previous = holdings.get(key)
      if (!previous || BigInt(holding.balance) > BigInt(previous.balance)) {
        holdings.set(key, holding)
      }
    }
    if (response.page?.more !== true) break
    if (pageNumber === MAX_PAGES_PER_WALLET - 1) {
      truncated = true
      break
    }
    const nextPage = { ...response.page, pageSize: PAGE_SIZE }
    const cursor = JSON.stringify(nextPage)
    if (cursors.has(cursor)) throw unavailable()
    cursors.add(cursor)
    page = nextPage
  }

  const ordered = [...holdings.values()].sort(
    (left, right) =>
      left.itemType.localeCompare(right.itemType) || left.tokenId - right.tokenId
  )
  const totals: Record<string, bigint> = {}
  for (const holding of ordered) {
    addToTotals(totals, holding.itemType, BigInt(holding.balance))
  }
  return {
    address: wallet.address,
    ...(wallet.label ? { label: wallet.label } : {}),
    verifiedAt: wallet.verifiedAt,
    holdings: ordered,
    totals: stringTotals(totals),
    truncated
  }
}

export class WalletContentsRepository {
  constructor(
    private readonly database: D1Database,
    private readonly options: WalletContentsOptions
  ) {}

  async read(userId: string): Promise<WalletContentsProjection> {
    const url = configuredUrl(this.options.indexerUrl)
    const accessKey = this.options.accessKey?.trim()
    const contractAddress = configuredAddress(this.options.contractAddress)
    if (!url || !accessKey || !contractAddress) {
      return { status: 'not_configured', chainId: CHAIN_ID, wallets: [] }
    }
    const wallets = await new IdentitiesRepository(this.database).listWallets(userId)
    if (wallets.length > MAX_WALLETS) {
      throw unavailable('Too many linked wallets to read safely.')
    }
    const projected = await Promise.all(
      wallets.map(wallet =>
        walletContents(wallet, {
          fetcher: this.options.fetcher ?? fetch,
          url,
          accessKey,
          contractAddress
        })
      )
    )
    const totals: Record<string, bigint> = {}
    for (const wallet of projected) {
      for (const [itemType, balance] of Object.entries(wallet.totals)) {
        addToTotals(totals, itemType, BigInt(balance))
      }
    }
    return {
      status: 'available',
      chainId: CHAIN_ID,
      contractAddress,
      wallets: projected,
      totals: stringTotals(totals)
    }
  }
}
