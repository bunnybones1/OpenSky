import { ItemType } from '@opensky/proto'
import clsx from 'clsx'
import { memo, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { Text } from '~/shared/components/Text'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { GradeRow } from './GradeRow/GradeRow'
import { TokenInfoSectionHeader } from './TokenInfoSection.css'

const DEFAULT_GRADES = [
  ItemType.SW_BASE_CARDS,
  ItemType.SW_SILVER_CARDS,
  ItemType.SW_GOLD_CARDS
] as const

interface TokenInfoSectionProps {
  allowedGrades?: (
    | ItemType.SW_BASE_CARDS
    | ItemType.SW_GOLD_CARDS
    | ItemType.SW_SILVER_CARDS
  )[]
  id: number
  switchCard?: (id: number) => void
}

export const TokenInfoSection = memo(
  ({ allowedGrades, id, switchCard }: TokenInfoSectionProps) => {
    const gradesToUse = useMemo(() => {
      if (!allowedGrades) return DEFAULT_GRADES
      return DEFAULT_GRADES.filter((grade) => allowedGrades.includes(grade))
    }, [allowedGrades])

    const { t } = useTranslation()

    if (!gradesToUse.length) return null

    return (
      <div
        className={Sprinkles({
          width: 'full',
          border: '1px solid',
          borderColor: 'purple5',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'flex-start'
        })}
      >
        <div
          className={clsx(
            Sprinkles({
              display: 'grid',
              width: 'full',
              borderBottom: '1px solid',
              borderColor: 'purple5',
              backgroundColor: 'purple2'
            }),
            TokenInfoSectionHeader
          )}
        >
          <div
            className={Sprinkles({
              alignItems: 'center',
              justifyContent: 'flex-start',
              display: 'flex'
            })}
          >
            <Text marginLeft="20px" fontSize="14px" color="purple8">
              {t('general.grade')}
            </Text>
          </div>
          <div
            className={Sprinkles({
              alignItems: 'center',
              justifyContent: 'flex-start',
              display: 'flex'
            })}
          >
            <Text fontSize="14px" color="purple8">
              {t('generic.Ownership')}
            </Text>
          </div>
          <div
            className={Sprinkles({
              alignItems: 'center',
              justifyContent: 'flex-start',
              display: 'flex'
            })}
          >
            <Text fontSize="14px" color="purple8">
              {t('general.price')}
            </Text>
          </div>
          <div
            className={Sprinkles({
              alignItems: 'center',
              justifyContent: 'flex-start',
              display: 'flex'
            })}
          >
            <Text fontSize="14px" color="purple8">
              {t('general.stock')}
            </Text>
          </div>
          <div
            className={Sprinkles({
              alignItems: 'center',
              justifyContent: 'flex-start',
              display: 'flex'
            })}
          >
            <Text fontSize="14px" color="purple8">
              {t('general.supply')}
            </Text>
          </div>
        </div>
        {gradesToUse.map((grade) => (
          <GradeRow key={grade} grade={grade} activeId={id} switchCard={switchCard} />
        ))}
      </div>
    )
  }
)

TokenInfoSection.displayName = 'TokenInfoSection'
