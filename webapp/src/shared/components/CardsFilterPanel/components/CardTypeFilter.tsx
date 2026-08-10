import { memo } from 'react'
import { useTranslation } from 'react-i18next'

import { Checkbox } from '~/shared/components/Checkbox'
import { CheckboxGroup } from '~/shared/components/CheckboxGroup'
import { Text } from '~/shared/components/Text'
import { CardSearchParams } from '~/shared/types/cards'

interface CardTypeFilterProps {
  type: CardSearchParams['type']
  onChange: (value: CardSearchParams['type']) => void
}

export const CardTypeFilter = memo(({ type, onChange }: CardTypeFilterProps) => {
  const { t } = useTranslation()

  return (
    <>
      <Text fontSize="16px" color="purple7" fontWeight="600">
        {t('cards.CardType')}
      </Text>
      <CheckboxGroup orientation="vertical" value={type} onChange={onChange}>
        <Checkbox value="spell" text={t('cards.Spell')} />
        <Checkbox value="unit" text={t('cards.Unit')} />
      </CheckboxGroup>
    </>
  )
})

CardTypeFilter.displayName = 'CardTypeFilter'
