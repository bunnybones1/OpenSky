import { Trait } from '@skyweaver/state-metadata'
import { memo } from 'react'
import { useTranslation } from 'react-i18next'

import { Checkbox } from '~/shared/components/Checkbox'
import { CheckboxGroup } from '~/shared/components/CheckboxGroup'
import { Text } from '~/shared/components/Text'
import { CardSearchParams } from '~/shared/types/cards'

import { ImageIconTypes } from '../../ImageIcon/ImageIconConfig'

const Adorments: {
  [key in Trait]: { icon: { type: ImageIconTypes } }
} = {
  armor: {
    icon: { type: 'trait-armor' }
  },
  banner: {
    icon: { type: 'trait-banner' }
  },
  dash: {
    icon: { type: 'trait-dash' }
  },
  guard: {
    icon: { type: 'trait-guard' }
  },
  lifesteal: {
    icon: { type: 'trait-lifesteal' }
  },
  stealth: {
    icon: { type: 'trait-stealth' }
  },
  wither: {
    icon: { type: 'trait-wither' }
  }
}

interface TraitFilterProps {
  trait: CardSearchParams['trait']
  onChange: (value: Trait) => void
}

export const TraitFilter = memo(({ trait, onChange }: TraitFilterProps) => {
  const { t } = useTranslation()

  return (
    <>
      <Text fontSize="16px" color="purple7" fontWeight="600">
        {t('cards.Traits')}
      </Text>
      <CheckboxGroup orientation="vertical" value={trait} onChange={onChange}>
        <Checkbox
          value="armor"
          text={t('cardMeta:traits.titleCase.armor')}
          adornment={Adorments.armor}
        />
        <Checkbox
          value="banner"
          text={t('cardMeta:traits.titleCase.banner')}
          adornment={Adorments.banner}
        />
        <Checkbox
          value="dash"
          text={t('cardMeta:traits.titleCase.dash')}
          adornment={Adorments.dash}
        />
        <Checkbox
          value="guard"
          text={t('cardMeta:traits.titleCase.guard')}
          adornment={Adorments.guard}
        />
        <Checkbox
          value="lifesteal"
          text={t('cardMeta:traits.titleCase.lifesteal')}
          adornment={Adorments.lifesteal}
        />
        <Checkbox
          value="stealth"
          text={t('cardMeta:traits.titleCase.stealth')}
          adornment={Adorments.stealth}
        />
        <Checkbox
          value="wither"
          text={t('cardMeta:traits.titleCase.wither')}
          adornment={Adorments.wither}
        />
      </CheckboxGroup>
    </>
  )
})

TraitFilter.displayName = 'TraitFilter'
