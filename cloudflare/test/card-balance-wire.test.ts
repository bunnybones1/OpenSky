import { describe, expect, it } from 'vitest'

import {
  sourceBalanceTupleWire,
  sourceCardOwnershipWire,
  sourceCardWithBalanceWire
} from '../src/card-balance-wire'

describe('source CardWithBalance JSON wire', () => {
  it('emits every nullable field when source values are nil', () => {
    expect(
      sourceCardWithBalanceWire({
        card: null,
        balance: '0',
        balanceByType: null,
        createdAt: null
      })
    ).toStrictEqual({
      card: null,
      balance: '0',
      balanceByType: null,
      createdAt: null
    })
  })

  it('normalizes every nested BalanceTuple without dropping false or nil', () => {
    const result = sourceCardWithBalanceWire({
      card: { id: 42 } as never,
      balance: '3',
      balanceByType: {
        SW_BASE_CARDS: { balance: '1' },
        SW_SILVER_CARDS: { balance: '2', isNew: false }
      },
      createdAt: '2026-01-02T00:00:00.000Z'
    }) as unknown as Record<string, unknown>
    expect(Object.keys(result)).toEqual([
      'card',
      'balance',
      'balanceByType',
      'createdAt'
    ])
    expect(result.balanceByType).toStrictEqual({
      SW_BASE_CARDS: { balance: '1', isNew: null },
      SW_SILVER_CARDS: { balance: '2', isNew: false }
    })
    expect(sourceBalanceTupleWire({ balance: '7', isNew: true })).toStrictEqual(
      { balance: '7', isNew: true }
    )
  })

  it('normalizes every ownership tuple and preserves the 13-field order', () => {
    const counts = { STR: 0 }
    const matrix = { STR: { SW_BASE_CARDS: 0 } }
    const result = sourceCardOwnershipWire({
      cardBalances: {
        6: {
          SW_BASE_CARDS: { balance: '1', isNew: false },
          SW_SILVER_CARDS: { balance: '0' }
        }
      },
      lockedCards: 1,
      lockedCardsByClass: counts,
      lockedCardsByFrame: { SW_BASE_CARDS: 1 },
      lockedCardsByClassAndFrame: matrix,
      unlockedCards: 1,
      unlockedCardsByClass: counts,
      unlockedCardsByFrame: { SW_BASE_CARDS: 1 },
      unlockedCardsByClassAndFrame: matrix,
      pendingCards: 0,
      pendingCardsByClass: counts,
      pendingCardsByFrame: { SW_BASE_CARDS: 0 },
      pendingCardsByClassAndFrame: matrix
    }) as unknown as Record<string, unknown>
    expect(Object.keys(result)).toEqual([
      'cardBalances',
      'lockedCards',
      'lockedCardsByClass',
      'lockedCardsByFrame',
      'lockedCardsByClassAndFrame',
      'unlockedCards',
      'unlockedCardsByClass',
      'unlockedCardsByFrame',
      'unlockedCardsByClassAndFrame',
      'pendingCards',
      'pendingCardsByClass',
      'pendingCardsByFrame',
      'pendingCardsByClassAndFrame'
    ])
    expect(result.cardBalances).toStrictEqual({
      '6': {
        SW_BASE_CARDS: { balance: '1', isNew: false },
        SW_SILVER_CARDS: { balance: '0', isNew: null }
      }
    })
  })
})
