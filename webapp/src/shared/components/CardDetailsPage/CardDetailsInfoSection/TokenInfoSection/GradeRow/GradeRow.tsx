import { ItemType } from '@opensky/proto'
import { getGradedID, getItemType, getUngradedID } from '@opensky/shared/assetsIDs'
import clsx from 'clsx'
import { memo, useCallback, useMemo } from 'react'

import { Button } from '~/shared/components/Button'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { GradeRowBalance } from './components/GradeRowBalance'
import { GradeRowGrade } from './components/GradeRowGrade'
import { GradeRowPrices } from './components/GradeRowPrices'
import { GradeRowSupply } from './components/GradeRowSupply'
import { GradeRowStyle } from './GradeRow.css'
import { GradeRowTotalSupply } from './GradeRowTotalSupply/GradeRowTotalSupply'

interface GradeRowProps {
  activeId: number
  grade: ItemType.SW_BASE_CARDS | ItemType.SW_GOLD_CARDS | ItemType.SW_SILVER_CARDS
  switchCard?: (id: number) => void
  inventoryOnly?: boolean
}

export const GradeRow = memo(
  ({ activeId, grade, switchCard, inventoryOnly }: GradeRowProps) => {
    const id = useMemo(() => {
      const activeGrade = getItemType(activeId)

      if (activeGrade === grade) return activeId

      const ungradedId = getUngradedID(activeId)

      return getGradedID(ungradedId, grade)
    }, [activeId, grade])

    const onClick = useCallback(() => {
      if (!!switchCard && activeId !== id) {
        switchCard(id)
      }
    }, [activeId, id, switchCard])

    return (
      <div
        className={clsx(
          Sprinkles({
            width: 'full',
            backgroundColor: activeId === id ? 'purple5' : 'purple2',
            display: 'grid',
            position: 'relative',
            cursor: !!switchCard ? 'pointer' : undefined
          }),
          GradeRowStyle
        )}
        style={inventoryOnly ? { gridTemplateColumns: '1fr 1fr' } : undefined}
        onClick={!!switchCard ? onClick : undefined}
      >
        <GradeRowGrade grade={grade} inventoryOnly={inventoryOnly} />
        <GradeRowBalance id={id} grade={grade} />
        {!inventoryOnly && (
          <>
            <GradeRowPrices grade={grade} id={id} />
            <GradeRowSupply id={id} grade={grade} />
            <GradeRowTotalSupply id={id} grade={grade} />
          </>
        )}
        {!!switchCard && (
          <div
            className={Sprinkles({
              position: 'absolute',
              height: 'full',
              top: 0,
              right: 0,
              paddingRight: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end'
            })}
          >
            <Button
              frameType="default"
              colorType="default"
              onClick={onClick}
              disabled={activeId === id}
              leftAdornment={{ icon: 'eye' }}
              buttonClassName={Sprinkles({ paddingX: '4px' })}
            />
          </div>
        )}
      </div>
    )
  }
)

GradeRow.displayName = 'GradeRow'
