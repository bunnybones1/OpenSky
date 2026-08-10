import { memo, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { Select } from '~/shared/components/Select'
import { SelectOption } from '~/shared/components/SelectOption'
import { useResponsiveQuery } from '~/shared/hooks/ui/useResponsiveQuery'
import { CARD_SORTING_OPTIONS, CardSearchParams } from '~/shared/types/cards'

const Adornments = {
  [CARD_SORTING_OPTIONS.HEALTH_DESCENDING]: { icon: { type: 'sort-descending' } },
  [CARD_SORTING_OPTIONS.POWER_DESCENDING]: { icon: { type: 'sort-descending' } },
  [CARD_SORTING_OPTIONS.MANA_DESCENDING]: { icon: { type: 'sort-descending-num' } },
  [CARD_SORTING_OPTIONS.MANA_ASCENDING]: { icon: { type: 'sort-ascending-num' } },
  [CARD_SORTING_OPTIONS.PRICE_DESCENDING]: {
    icon: { type: 'sort-descending-price' }
  },
  [CARD_SORTING_OPTIONS.PRICE_ASCENDING]: { icon: { type: 'sort-ascending-price' } },
  [CARD_SORTING_OPTIONS.QUANTITY_ASCENDING]: {
    icon: { type: 'sort-ascending-quantity' }
  },
  [CARD_SORTING_OPTIONS.QUANTITY_DESCENDING]: {
    icon: { type: 'sort-ascending-quantity' }
  },
  [CARD_SORTING_OPTIONS.DATE_RECIEVED_ASCENDING]: {
    icon: { type: 'sort-ascending' }
  },
  [CARD_SORTING_OPTIONS.DATE_RECIEVED_DESCENDING]: {
    icon: { type: 'sort-descending' }
  }
} as const

const Texts = {
  [CARD_SORTING_OPTIONS.HEALTH_DESCENDING]: 'cards.sorts.HealthDesc',
  [CARD_SORTING_OPTIONS.POWER_DESCENDING]: 'cards.sorts.PowerDesc',
  [CARD_SORTING_OPTIONS.MANA_DESCENDING]: 'cards.sorts.ManaDesc',
  [CARD_SORTING_OPTIONS.MANA_ASCENDING]: 'cards.sorts.ManaAsc',
  [CARD_SORTING_OPTIONS.PRICE_ASCENDING]: 'cards.sorts.PriceAsc',
  [CARD_SORTING_OPTIONS.PRICE_DESCENDING]: 'cards.sorts.PriceDesc',
  [CARD_SORTING_OPTIONS.QUANTITY_ASCENDING]: 'cards.sorts.QuantityAsc',
  [CARD_SORTING_OPTIONS.DATE_RECIEVED_ASCENDING]: 'cards.sorts.DateAsc',
  [CARD_SORTING_OPTIONS.DATE_RECIEVED_DESCENDING]: 'cards.sorts.DateDesc',

  [CARD_SORTING_OPTIONS.QUANTITY_DESCENDING]: 'cards.sorts.QuantityDesc'
} as const

const DEFAULT_OPTIONS_TO_USE = [
  CARD_SORTING_OPTIONS.HEALTH_DESCENDING,
  CARD_SORTING_OPTIONS.POWER_DESCENDING,
  CARD_SORTING_OPTIONS.MANA_ASCENDING,
  CARD_SORTING_OPTIONS.MANA_DESCENDING
] as const

interface ItemsSortSelectProps {
  sort: CardSearchParams['sort']
  onChange: (value: CardSearchParams['sort']) => void
  optionsToUse?: readonly CARD_SORTING_OPTIONS[]
}

export const ItemsSortSelect = memo(
  ({
    sort,
    onChange,
    optionsToUse = DEFAULT_OPTIONS_TO_USE
  }: ItemsSortSelectProps) => {
    const isTabletWide = useResponsiveQuery('tabletWide')

    const { t } = useTranslation()

    const options = useMemo(() => {
      return optionsToUse.map((option) => (
        <SelectOption
          key={option}
          adornment={Adornments[option]}
          text={t(Texts[option])}
          value={option}
        />
      ))
    }, [optionsToUse, t])

    return (
      <Select
        text={sort && !!isTabletWide ? t(Texts[sort]) : undefined}
        adornment={sort ? Adornments[sort] : undefined}
        title={t('generic.Sorting')}
        onChange={onChange}
        colorType="default"
        value={sort}
        optionsMatchParentWidth={isTabletWide ? true : false}
      >
        {options}
      </Select>
    )
  }
)

ItemsSortSelect.displayName = 'ItemsSortSelect'
