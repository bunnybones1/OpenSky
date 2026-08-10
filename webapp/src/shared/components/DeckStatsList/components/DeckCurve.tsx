import { CardMetadata } from '@skyweaver/state-metadata'
import clsx from 'clsx'
import { memo, useLayoutEffect, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'

import { Text } from '~/shared/components/Text'
import { useDeckCurve } from '~/shared/hooks/decks/useDeckCurve'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import {
  BarStyle,
  DeckCurveGraph,
  GraphSeperator,
  TotalBarStyle
} from './DeckCurve.css'

interface CurveItemProps {
  numUnits: number
  numSpells: number
  cost: string
  highestCount: number
}

const BAR_MAX_HEIGHT = 37

const CurveItem = memo(
  ({ cost, numUnits, numSpells, highestCount }: CurveItemProps) => {
    const totalbarRef = useRef<HTMLDivElement | null>(null)
    const unitBarRef = useRef<HTMLDivElement | null>(null)
    const total = numUnits + numSpells

    useLayoutEffect(() => {
      if (totalbarRef.current && unitBarRef.current) {
        if (!total) {
          totalbarRef.current.style.height = `0px`
          unitBarRef.current.style.height = `0px`
        } else {
          const totalRatio = total / highestCount
          const unitRatio = numUnits / highestCount

          const totalHeight =
            totalRatio >= 1 ? BAR_MAX_HEIGHT : BAR_MAX_HEIGHT * totalRatio

          const unitHeight =
            unitRatio >= 1 ? BAR_MAX_HEIGHT : BAR_MAX_HEIGHT * unitRatio

          totalbarRef.current.style.height = `${totalHeight}px`
          unitBarRef.current.style.height = `${unitHeight}px`
        }
      }
    }, [highestCount, numSpells, numUnits, total])

    return (
      <div
        className={Sprinkles({
          width: 'full',
          display: 'flex',
          flexDirection: 'column',
          height: 'full',
          alignItems: 'center',
          justifyContent: 'flex-end'
        })}
      >
        {!!total && (
          <Text color="white" marginBottom="4px" fontSize="12px">
            {numUnits + numSpells}
          </Text>
        )}
        <div
          ref={totalbarRef}
          className={clsx(
            TotalBarStyle,
            BarStyle,
            Sprinkles({
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'center',
              backgroundColor: 'spell'
            })
          )}
        >
          <div
            className={clsx(
              BarStyle,
              Sprinkles({ width: 'full', backgroundColor: 'unit' })
            )}
            ref={unitBarRef}
          />
        </div>
        <div
          className={clsx(
            Sprinkles({
              width: 'full',
              backgroundColor: 'purple6'
            }),
            GraphSeperator
          )}
        />
        <Text color="white" fontSize="12px">
          {cost}
        </Text>
      </div>
    )
  }
)

CurveItem.displayName = 'CurveItem'

interface DeckCurveProps {
  cards: CardMetadata[]
}

export const DeckCurve = memo(({ cards }: DeckCurveProps) => {
  const { t } = useTranslation()

  const curve = useDeckCurve(cards)

  const highestCount = useMemo(() => {
    let currentHighest = 0

    if (!curve) return currentHighest

    Object.values(curve).forEach((costs) => {
      const total = costs.spell + costs.unit

      if (total > currentHighest) currentHighest = total
    })

    return currentHighest
  }, [curve])

  if (!curve) return null

  return (
    <div
      className={Sprinkles({
        width: 'full',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        justifyContent: 'flex-start'
      })}
    >
      <Text marginBottom="12px" color="purple9" fontWeight="700" fontSize="16px">
        {t('decks.ManaCurve')}
      </Text>
      <div
        className={clsx(
          Sprinkles({
            width: 'full',
            display: 'grid'
          }),
          DeckCurveGraph
        )}
      >
        {Object.entries(curve).map(([key, value]) => (
          <CurveItem
            numUnits={value.unit}
            numSpells={value.spell}
            cost={key}
            highestCount={highestCount}
            key={key}
          />
        ))}
      </div>
    </div>
  )
})

DeckCurve.displayName = 'DeckCurve'
