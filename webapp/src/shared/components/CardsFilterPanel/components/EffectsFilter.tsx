import { ExpectedBoldable } from '@opensky/parse-card-description'
import { EffectType } from '@skyweaver/state-metadata'
import { memo } from 'react'
import { useTranslation } from 'react-i18next'

import { Checkbox } from '~/shared/components/Checkbox'
import { CheckboxGroup } from '~/shared/components/CheckboxGroup'
import { Text } from '~/shared/components/Text'
import { CardSearchParams } from '~/shared/types/cards'

interface EffectsFilterProps {
  effects: CardSearchParams['effects']
  onChange: (value: EffectType | ExpectedBoldable) => void
}

export const EffectsFilter = memo(({ effects, onChange }: EffectsFilterProps) => {
  const { t } = useTranslation()

  return (
    <>
      <Text fontSize="16px" color="purple7" fontWeight="600">
        {t('cards.UnitEffects')}
      </Text>
      <CheckboxGroup orientation="vertical" value={effects} onChange={onChange}>
        <Checkbox value="Generic" text={t('cards.effects.UniqueEffect')} />
        <Checkbox value="Death" text={t('cards.effects.Death')} />
        <Checkbox value="Glory" text={t('cards.effects.Glory')} />
        <Checkbox value="Inspire" text={t('cards.effects.Inspire')} />
        <Checkbox value="Play" text={t('cards.effects.Play')} />
        <Checkbox value="Summon" text={t('cards.effects.Summon')} />
        <Checkbox value="Sunrise" text={t('cards.effects.Sunrise')} />
        <Checkbox value="Sunset" text={t('cards.effects.Sunset')} />
        <Checkbox value="Continuous" text={t('cards.effects.ContinuousEffect')} />
        <Checkbox value="Slay" text={t('cards.effects.Slay')} />
      </CheckboxGroup>
      <Text fontSize="16px" color="purple7" fontWeight="600">
        {t('cards.OtherEffects')}
      </Text>
      <CheckboxGroup orientation="vertical" value={effects} onChange={onChange}>
        <Checkbox value="Dust" text={t('cards.effects.Dust')} />
        <Checkbox value="Mulligan" text={t('cards.effects.Mulligan')} />
        <Checkbox value="Random" text={t('cards.effects.Random')} />
        <Checkbox value="Draw" text={t('cards.effects.Draw')} />
        <Checkbox value="Ready" text={t('cards.effects.Ready')} />
        <Checkbox value="Conjure" text={t('cards.effects.Conjure')} />
      </CheckboxGroup>
    </>
  )
})

EffectsFilter.displayName = 'EffectsFilter'
