import { CardMetadata } from '@skyweaver/state-metadata'
import { produce } from 'immer'
import { useMemo } from 'react'

const DEFAULT_COUNT = { unit: 0, spell: 0 }

type CostType = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8'

const DEFAULT_CURVE = {
  '0': DEFAULT_COUNT,
  '1': DEFAULT_COUNT,
  '2': DEFAULT_COUNT,
  '3': DEFAULT_COUNT,
  '4': DEFAULT_COUNT,
  '5': DEFAULT_COUNT,
  '6': DEFAULT_COUNT,
  '7': DEFAULT_COUNT,
  '8': DEFAULT_COUNT,
  '9+': DEFAULT_COUNT,
  X: DEFAULT_COUNT
} as const

export type CurveKeys = keyof typeof DEFAULT_CURVE

export const useDeckCurve = (cards?: CardMetadata[]) => {
  return useMemo(() => {
    if (!cards) return
    return produce(DEFAULT_CURVE, (draft) => {
      cards.forEach((card) => {
        if (
          card.cost !== undefined &&
          (card.type === 'spell' || card.type === 'unit')
        ) {
          if (card.cost === 'X') {
            draft.X[card.type] += 1
          } else {
            const numericalCost = Number(card.cost)

            if (!isNaN(numericalCost)) {
              if (numericalCost >= 9) {
                draft['9+'][card.type] += 1
              } else {
                const cost = String(card.cost) as CostType
                draft[cost][card.type] += 1
              }
            }
          }
        }
      })
    })
  }, [cards])
}
