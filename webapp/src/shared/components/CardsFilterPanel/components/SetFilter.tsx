import { memo } from 'react'
import { useTranslation } from 'react-i18next'

import { Checkbox } from '~/shared/components/Checkbox'
import { CheckboxGroup } from '~/shared/components/CheckboxGroup'
import { Text } from '~/shared/components/Text'
import { CardSearchParams, Set } from '~/shared/types/cards'

const ClashAdornment = { icon: { type: 'clash-set' } } as const

interface SetFilterProps {
  set: CardSearchParams['set']
  onChange: (value: Set) => void
}

export const SetFilter = memo(({ set, onChange }: SetFilterProps) => {
  const { t } = useTranslation()

  return (
    <>
      <Text fontSize="16px" color="purple7" fontWeight="600">
        {t('cards.Set')}
      </Text>
      <CheckboxGroup orientation="vertical" value={set} onChange={onChange}>
        <Checkbox value="Core Set" text={t('cards.CoreSet')} />
        <Checkbox value="Core Expansion" text={t('cards.CoreExpansion')} />
        <Checkbox
          value="Clash of Inventors"
          text={t('cards.ClashSet')}
          adornment={ClashAdornment}
        />
        <Checkbox
          adornment={{ icon: { type: 'hexbound-set', color: 'warm4' } }}
          value="Hexbound Invasion"
          text={t('cards.HexboundSet')}
        />
        <Checkbox value="Starter Expansion" text={t('cards.StarterExpansion')} />
      </CheckboxGroup>
    </>
  )
})

SetFilter.displayName = 'SetFilter'
