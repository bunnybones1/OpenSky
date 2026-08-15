import type { BalanceTuple, Card, CardWithBalance } from '@opensky/proto'

import { sourceCardWire } from './card-wire'

export interface SourceBalanceTupleInput {
  balance: string
  isNew?: boolean | null
}

export interface SourceCardWithBalanceInput {
  card?: Card | null
  balance: string
  balanceByType?: Record<string, SourceBalanceTupleInput> | null
  createdAt?: string | null
}

// BalanceTuple has no omitempty tags in the generated Go API. In particular,
// SearchCards leaves IsNew nil, which must cross the JSON boundary as null.
export const sourceBalanceTupleWire = (
  tuple: SourceBalanceTupleInput
): BalanceTuple =>
  ({
    balance: tuple.balance,
    isNew: tuple.isNew ?? null
  }) as unknown as BalanceTuple

// CardWithBalance likewise emits all four public fields. The database-only
// pagination cursor stays private, while nil pointers/maps remain explicit.
export const sourceCardWithBalanceWire = (
  entry: SourceCardWithBalanceInput
): CardWithBalance =>
  ({
    card: entry.card == null ? null : sourceCardWire(entry.card),
    balance: entry.balance,
    balanceByType:
      entry.balanceByType == null
        ? null
        : Object.fromEntries(
            Object.entries(entry.balanceByType).map(([itemType, tuple]) => [
              itemType,
              sourceBalanceTupleWire(tuple)
            ])
          ),
    createdAt: entry.createdAt ?? null
  }) as unknown as CardWithBalance
