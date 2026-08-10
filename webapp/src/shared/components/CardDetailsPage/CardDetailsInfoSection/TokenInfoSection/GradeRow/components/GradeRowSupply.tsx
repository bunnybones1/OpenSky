import { SwapType } from '@0xsequence/metadata'
import { ItemType } from '@opensky/proto'
import { memo } from 'react'
import { useTranslation } from 'react-i18next'

import { Icon } from '~/shared/components/Icon/Icon'
import { Text } from '~/shared/components/Text'
import { useTokenPriceAndSupply } from '~/shared/queries/useTokenPriceAndSupply'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

interface GradeRowSupplyProps {
  id: number
  grade: ItemType.SW_BASE_CARDS | ItemType.SW_GOLD_CARDS | ItemType.SW_SILVER_CARDS
}

export const GradeRowSupply = memo(({ id, grade }: GradeRowSupplyProps) => {
  const { data: priceAndSupply } = useTokenPriceAndSupply({
    mode: SwapType.BUY,
    id,
    quantity: 1
  })

  const { t } = useTranslation()

  return (
    <div
      className={Sprinkles({
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-start'
      })}
    >
      {grade === ItemType.SW_BASE_CARDS ? (
        <Text fontSize="14px" color="purple9" fontWeight="400">
          {t('generic.NotApplicable')}
        </Text>
      ) : priceAndSupply === undefined ? (
        <Icon type="spinner" height="14px" color="purple9" />
      ) : (
        <Text fontSize="14px" color="purple9" fontWeight="400">
          {priceAndSupply?.supply || 0}
        </Text>
      )}
    </div>
  )
})

GradeRowSupply.displayName = 'GradeRowSupply'
