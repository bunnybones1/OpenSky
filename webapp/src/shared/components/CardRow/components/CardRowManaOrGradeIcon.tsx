import { ItemType } from '@opensky/proto'
import clsx from 'clsx'
import { memo, useMemo } from 'react'

import { CardType } from '~/shared/constants/cards'
import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { Text } from '../../Text'
import { ManaIconText, ManaIconWrapper } from './CardRowManaOrGradeIcon.css'

const ManaGemFontSizes = {
  tablet: '16px',
  tabletWide: '18px'
} as const

interface CardRowManaOrGradeIconProps {
  prioritizeGrade: boolean
  grade: CardType['grade']
  cost?: CardType['cost']
}

export const CardRowManaOrGradeIcon = memo(
  ({ prioritizeGrade, cost, grade }: CardRowManaOrGradeIconProps) => {
    const { getAssetUrl } = useGetAssetContext()

    const imageName = useMemo(() => {
      if (!prioritizeGrade) return 'mana-gem.webp'

      let key = 'base-card-with-letter.webp'
      if (grade === ItemType.SW_SILVER_CARDS) {
        key = 'silver-card-with-letter.webp'
      } else if (grade === ItemType.SW_GOLD_CARDS) {
        key = 'gold-card-with-letter.webp'
      }
      return key
    }, [grade, prioritizeGrade])

    return (
      <div
        className={clsx(Sprinkles({ position: 'absolute' }), ManaIconWrapper, {
          prioritizeGrade
        })}
      >
        {!!getAssetUrl && (
          <img
            src={getAssetUrl(`webapp/icons/${imageName}`)}
            className={Sprinkles({
              zIndex: 5,
              width: 'full',
              height: 'full',
              top: 0,
              left: 0,
              position: 'absolute'
            })}
          />
        )}
        {!prioritizeGrade && (
          <Text
            className={clsx(ManaIconText, Sprinkles({ position: 'absolute' }))}
            color="black"
            fontWeight="700"
            fontSize={ManaGemFontSizes}
          >
            {cost || 0}
          </Text>
        )}
      </div>
    )
  }
)

CardRowManaOrGradeIcon.displayName = 'CardRowManaOrGradeIcon'
