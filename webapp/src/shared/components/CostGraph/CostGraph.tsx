import { CardLibrary } from '@skyweaver/state-metadata'
import clsx from 'clsx'
import { memo, useMemo } from 'react'

import { isDefined } from '~/shared/helpers/is-defined-is-not-null'
import { CurveKeys, useDeckCurve } from '~/shared/hooks/decks/useDeckCurve'
import { useDecodedDeckString } from '~/shared/hooks/decks/useDecodedDeckString'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { CostGraphBarWrapper, CostGraphWrapper } from './CostGraph.css'

interface CostGraphProps {
  deckString: string
  height?: number
}

export const CostGraph = memo(({ deckString, height }: CostGraphProps) => {
  const { cardIds } = useDecodedDeckString(deckString)

  const cards = useMemo(() => {
    if (!cardIds) return
    return cardIds.map((id) => CardLibrary.get(id)).filter(isDefined)
  }, [cardIds])

  const curve = useDeckCurve(cards)

  const costInfo = useMemo(() => {
    if (!curve) return

    let highest = 0

    const data = Object.keys(curve)
      .map((key) => {
        const curveData = curve[key as CurveKeys]

        if (!curveData) return undefined

        return { count: curveData.spell + curveData.unit, id: key }
      })
      .filter(isDefined)

    data.forEach((bar) => {
      if (bar.count > highest) {
        highest = bar.count
      }
    })

    return { data, highest: highest + 1 }
  }, [curve])

  if (!costInfo) return null

  return (
    <div
      className={clsx(
        Sprinkles({
          backgroundColor: 'purple1',
          display: 'grid'
        }),
        CostGraphWrapper
      )}
      style={{
        height: !!height ? height + 2 : 22
      }}
    >
      {costInfo.data.map((bar) => (
        <div
          className={clsx(
            Sprinkles({
              height: 'full',
              display: 'flex',
              alignItems: 'flex-end'
            }),
            CostGraphBarWrapper
          )}
          key={bar.id}
        >
          <div
            className={Sprinkles({ width: 'full', backgroundColor: 'cold7' })}
            style={{
              height: `calc(${(bar.count / costInfo.highest) * 100}%)`
            }}
          />
        </div>
      ))}
    </div>
  )
})

CostGraph.displayName = 'CostGraph'
