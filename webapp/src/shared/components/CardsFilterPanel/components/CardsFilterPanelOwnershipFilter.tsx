import { memo } from 'react'
import { useTranslation } from 'react-i18next'

import { Checkbox } from '~/shared/components/Checkbox'
import { CheckboxGroup } from '~/shared/components/CheckboxGroup'
import { Text } from '~/shared/components/Text'
import { OwnershipFilter } from '~/shared/types/cards'

interface CardsFilterPanelOwnershipFilterProps {
  ownership: OwnershipFilter
  onChange: (value: OwnershipFilter) => void
  allowedOwnershipOptions: OwnershipFilter[]
}

export const CardsFilterPanelOwnershipFilter = memo(
  ({
    ownership,
    onChange,
    allowedOwnershipOptions
  }: CardsFilterPanelOwnershipFilterProps) => {
    const { t } = useTranslation()
    return (
      <>
        <Text fontSize="16px" color="purple7" fontWeight="600">
          {t('generic.OWNERSHIP')}
        </Text>
        <CheckboxGroup orientation="vertical" value={ownership} onChange={onChange}>
          {!!allowedOwnershipOptions.includes(OwnershipFilter.OWNED) && (
            <Checkbox value={OwnershipFilter.OWNED} text={t('cards.MyCards')} />
          )}
          {!!allowedOwnershipOptions.includes(OwnershipFilter.LOCKED) && (
            <Checkbox value={OwnershipFilter.LOCKED} text={t('generic.Locked')} />
          )}
          {!!allowedOwnershipOptions.includes(OwnershipFilter.ALL) && (
            <Checkbox value={OwnershipFilter.ALL} text={t('generic.All')} />
          )}
          {!!allowedOwnershipOptions.includes(OwnershipFilter.SELECTED) && (
            <Checkbox value={OwnershipFilter.SELECTED} text={t('generic.Selected')} />
          )}
        </CheckboxGroup>
      </>
    )
  }
)

CardsFilterPanelOwnershipFilter.displayName = 'CardsFilterPanelOwnershipFilter'
