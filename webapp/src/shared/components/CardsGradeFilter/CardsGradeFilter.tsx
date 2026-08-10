/* eslint-disable valtio/state-snapshot-rule */
import { memo, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { ItemType } from '~/lib/proto'
import { Select } from '~/shared/components/Select'
import { SelectOption } from '~/shared/components/SelectOption'
import { NAVBAR_HEIGHT } from '~/shared/constants/ui'
import { useNumNewCards } from '~/shared/hooks/cards/useNumNewCards'
import { useResponsiveQuery } from '~/shared/hooks/ui/useResponsiveQuery'
import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'
import { CardSearchParams } from '~/shared/types/cards'

import { ToggleButton } from '../ToggleButton'
import { ToggleButtonGroup } from '../ToggleButtonGroup'
import { CardsGradeFilterSelectStyle } from './CardsGradeFilter.css'

const ToolTipPadding = { top: NAVBAR_HEIGHT, bottom: 0, left: 0, right: 0 } as const

const ADORNMENTS = {
  [ItemType.SW_BASE_CARDS]: 'webapp/icons/base-card-with-letter.webp',
  [ItemType.SW_GOLD_CARDS]: 'webapp/icons/gold-card-with-letter.webp',
  [ItemType.SW_SILVER_CARDS]: 'webapp/icons/silver-card-with-letter.webp'
} as const

const TEXT = {
  [ItemType.SW_BASE_CARDS]: 'cards.grades.Base',
  [ItemType.SW_GOLD_CARDS]: 'cards.grades.Gold',
  [ItemType.SW_SILVER_CARDS]: 'cards.grades.Silver'
} as const

type GradesToUse = readonly (
  | ItemType.SW_BASE_CARDS
  | ItemType.SW_SILVER_CARDS
  | ItemType.SW_GOLD_CARDS
)[]

interface CardsGradeFilterProps {
  grade: CardSearchParams['grade']
  onChange: (value: CardSearchParams['grade']) => void
  gradesToUse?: GradesToUse
  showUnseenCardCounts?: boolean
}

const DEFAULT_GRADES_TO_USE: GradesToUse = [
  ItemType.SW_BASE_CARDS,
  ItemType.SW_SILVER_CARDS,
  ItemType.SW_GOLD_CARDS
]

export const CardsGradeFilter = memo(
  ({
    grade,
    onChange,
    gradesToUse = DEFAULT_GRADES_TO_USE,
    showUnseenCardCounts
  }: CardsGradeFilterProps) => {
    const isTabletWide = useResponsiveQuery('tabletWide')
    const { t } = useTranslation()
    const { baseCount, goldCount, silverCount } = useNumNewCards()
    const { getAssetUrl } = useGetAssetContext()

    const getUnreadForItemType = useCallback(
      (itemType: ItemType) => {
        let unread: undefined | number = undefined

        if (showUnseenCardCounts) {
          if (goldCount && itemType === ItemType.SW_GOLD_CARDS) unread = goldCount
          if (silverCount && itemType === ItemType.SW_SILVER_CARDS)
            unread = silverCount
          if (baseCount && itemType === ItemType.SW_BASE_CARDS) unread = baseCount
        }
        return unread
      },
      [baseCount, goldCount, showUnseenCardCounts, silverCount]
    )

    const options = useMemo(() => {
      return gradesToUse.map((itemType) => {
        return (
          <SelectOption
            key={itemType}
            adornmentHeight="24px"
            value={itemType}
            text={t(TEXT[itemType])}
            adornment={
              !!getAssetUrl ? { image: getAssetUrl(ADORNMENTS[itemType]) } : undefined
            }
            unread={getUnreadForItemType(itemType)}
          />
        )
      })
    }, [getAssetUrl, getUnreadForItemType, gradesToUse, t])

    const buttons = useMemo(() => {
      return gradesToUse.map((itemType) => {
        return (
          <ToggleButton
            key={itemType}
            value={itemType}
            iconHeight="24px"
            tooltip={t(TEXT[itemType])}
            tooltipPadding={ToolTipPadding}
            leftAdornment={
              !!getAssetUrl ? { image: getAssetUrl(ADORNMENTS[itemType]) } : undefined
            }
            unread={getUnreadForItemType(itemType)}
          />
        )
      })
    }, [gradesToUse, t, getAssetUrl, getUnreadForItemType])

    if (!isTabletWide) {
      return (
        <Select
          value={grade}
          colorType="default"
          adornmentHeight="24px"
          onChange={onChange}
          adornment={
            !!getAssetUrl
              ? {
                  image: getAssetUrl(
                    !!grade ? ADORNMENTS[grade] : ADORNMENTS[ItemType.SW_BASE_CARDS]
                  )
                }
              : undefined
          }
          className={CardsGradeFilterSelectStyle}
          optionsMatchParentWidth={false}
          optionsPlacement="bottom-end"
          unread={
            showUnseenCardCounts ? baseCount + goldCount + silverCount : undefined
          }
        >
          {options}
        </Select>
      )
    }

    return (
      <ToggleButtonGroup<CardSearchParams['grade']>
        value={grade}
        height="36px"
        colorType="default"
        onChange={onChange}
      >
        {buttons}
      </ToggleButtonGroup>
    )
  }
)

CardsGradeFilter.displayName = 'CardsGradeFilter'
