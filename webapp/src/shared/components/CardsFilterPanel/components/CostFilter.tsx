import { memo } from 'react'
import { useTranslation } from 'react-i18next'

import { Checkbox } from '~/shared/components/Checkbox'
import { CheckboxGroup } from '~/shared/components/CheckboxGroup'
import { Text } from '~/shared/components/Text'
import { CardCost, CardSearchParams } from '~/shared/types/cards'

interface CostFilterProps {
  cost: CardSearchParams['cost']
  onChange: (value: CardCost) => void
}

export const CostFilter = memo(({ cost, onChange }: CostFilterProps) => {
  const { t } = useTranslation()

  return (
    <>
      <Text fontSize="16px" color="purple7" fontWeight="600">
        {t('generic.COST')}
      </Text>
      <CheckboxGroup orientation="vertical" value={cost} onChange={onChange}>
        <Checkbox value="0" text="0" />
        <Checkbox value="1" text="1" />
        <Checkbox value="2" text="2" />
        <Checkbox value="3" text="3" />
        <Checkbox value="4" text="4" />
        <Checkbox value="5" text="5" />
        <Checkbox value="6" text="6" />
        <Checkbox value="7" text="7" />
        <Checkbox value="8" text="8" />
        <Checkbox value="9" text="9" />
        <Checkbox value="10+" text="10+" />
        <Checkbox value="X" text="X" />
      </CheckboxGroup>
    </>
  )
})

CostFilter.displayName = 'CostFilter'
