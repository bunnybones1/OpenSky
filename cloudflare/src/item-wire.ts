import type { Item, ItemSummary } from '@opensky/proto'

export type SourceItemInput = Omit<
  Item,
  'contractAddress' | 'updatedAt' | 'createdAt' | 'isNew'
> & {
  contractAddress?: string | null
  updatedAt?: string | null
  createdAt?: string | null
  isNew?: boolean | null
}

type SourceItemSummaryInput = Omit<ItemSummary, 'updatedAt' | 'createdAt'> & {
  updatedAt?: string | null
  createdAt?: string | null
}

// Go emits all public Item fields. Cloud Weasel inventory is identity-owned,
// so its optional legacy contract address remains an explicit null rather than
// being invented from a wallet integration.
export const sourceItemWire = (item: SourceItemInput): Item =>
  ({
    id: item.id,
    contractAddress: item.contractAddress ?? null,
    itemType: item.itemType,
    tokenID: item.tokenID,
    balance: item.balance,
    lastUpdateID: item.lastUpdateID,
    updatedAt: item.updatedAt ?? null,
    createdAt: item.createdAt ?? null,
    isNew: item.isNew ?? null
  }) as unknown as Item

// ItemSummary likewise has no omitempty JSON tags; nil time pointers stay on
// the wire as null while AccountID remains private.
export const sourceItemSummaryWire = (
  summary: SourceItemSummaryInput
): ItemSummary =>
  ({
    id: summary.id,
    itemType: summary.itemType,
    totalBalance: summary.totalBalance,
    updatedAt: summary.updatedAt ?? null,
    createdAt: summary.createdAt ?? null
  }) as unknown as ItemSummary
