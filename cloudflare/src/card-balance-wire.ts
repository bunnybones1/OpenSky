import type {
  BalanceTuple,
  Card,
  CardOwnershipResponse,
  CardWithBalance
} from '@opensky/proto'

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

export type SourceCardOwnershipInput = Omit<
  CardOwnershipResponse,
  'cardBalances'
> & {
  cardBalances: Record<string | number, Record<string, SourceBalanceTupleInput>>
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

// GetCardOwnership initializes every aggregate map, but each zero-value frame
// tuple still carries a nil IsNew pointer. Normalize the complete response at
// one boundary so those nested nulls and the generated outer field order hold.
export const sourceCardOwnershipWire = (
  ownership: SourceCardOwnershipInput
): CardOwnershipResponse => ({
  cardBalances: Object.fromEntries(
    Object.entries(ownership.cardBalances).map(([cardID, balances]) => [
      cardID,
      Object.fromEntries(
        Object.entries(balances).map(([itemType, tuple]) => [
          itemType,
          sourceBalanceTupleWire(tuple)
        ])
      )
    ])
  ),
  lockedCards: ownership.lockedCards,
  lockedCardsByClass: ownership.lockedCardsByClass,
  lockedCardsByFrame: ownership.lockedCardsByFrame,
  lockedCardsByClassAndFrame: ownership.lockedCardsByClassAndFrame,
  unlockedCards: ownership.unlockedCards,
  unlockedCardsByClass: ownership.unlockedCardsByClass,
  unlockedCardsByFrame: ownership.unlockedCardsByFrame,
  unlockedCardsByClassAndFrame: ownership.unlockedCardsByClassAndFrame,
  pendingCards: ownership.pendingCards,
  pendingCardsByClass: ownership.pendingCardsByClass,
  pendingCardsByFrame: ownership.pendingCardsByFrame,
  pendingCardsByClassAndFrame: ownership.pendingCardsByClassAndFrame
})
