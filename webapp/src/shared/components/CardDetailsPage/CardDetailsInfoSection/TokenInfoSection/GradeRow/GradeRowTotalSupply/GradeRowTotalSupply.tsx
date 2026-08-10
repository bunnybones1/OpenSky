import { ItemType } from '@opensky/proto'
import { getUngradedID } from '@opensky/shared/assetsIDs'
import { memo, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { Icon } from '~/shared/components/Icon/Icon'
import { Text } from '~/shared/components/Text'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { useCardTotalSupply } from './queries/useCardTotalSupply'

interface GradeRowTotalSupplyProps {
  id: number
  grade: ItemType.SW_BASE_CARDS | ItemType.SW_GOLD_CARDS | ItemType.SW_SILVER_CARDS
}

export const GradeRowTotalSupply = memo(({ id, grade }: GradeRowTotalSupplyProps) => {
  const { data: supplyTuple } = useCardTotalSupply(getUngradedID(id))
  const { t } = useTranslation()

  const supply = useMemo(() => {
    if (supplyTuple === undefined) return undefined
    if (grade === ItemType.SW_BASE_CARDS || !supplyTuple)
      return t('generic.NotApplicable')

    return String(supplyTuple[grade] ? parseInt(supplyTuple[grade].balance) : 0)
  }, [grade, supplyTuple, t])

  return (
    <div
      className={Sprinkles({
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-start'
      })}
    >
      {supply === undefined ? (
        <Icon type="spinner" height="14px" color="purple9" />
      ) : (
        <Text fontSize="14px" color="purple9" fontWeight="400">
          {supply}
        </Text>
      )}
    </div>
  )
})

GradeRowTotalSupply.displayName = 'GradeRowTotalSupply'
