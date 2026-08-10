import { Element } from '@skyweaver/state-metadata'
import { memo } from 'react'
import { useTranslation } from 'react-i18next'

import { Checkbox } from '~/shared/components/Checkbox'
import { CheckboxGroup } from '~/shared/components/CheckboxGroup'
import { Text } from '~/shared/components/Text'
import { CardSearchParams } from '~/shared/types/cards'

import { ImageIconTypes } from '../../ImageIcon/ImageIconConfig'

const Adorments: {
  [key in Exclude<Element, 'sky'>]: { icon: { type: ImageIconTypes } }
} = {
  air: {
    icon: { type: 'element-air' }
  },
  dark: {
    icon: { type: 'element-dark' }
  },
  earth: {
    icon: { type: 'element-earth' }
  },
  fire: {
    icon: { type: 'element-fire' }
  },
  light: {
    icon: { type: 'element-light' }
  },
  metal: {
    icon: { type: 'element-metal' }
  },
  water: {
    icon: { type: 'element-water' }
  },
  mind: {
    icon: { type: 'element-mind' }
  }
}

interface ElementFilterProps {
  element: CardSearchParams['element']
  onChange: (value: Element) => void
}

export const ElementFilter = memo(({ element, onChange }: ElementFilterProps) => {
  const { t } = useTranslation()

  return (
    <>
      <Text fontSize="16px" color="purple7" fontWeight="600">
        {t('cards.Element')}
      </Text>
      <CheckboxGroup orientation="vertical" value={element} onChange={onChange}>
        <Checkbox
          value="air"
          text={t('cards.elements.air')}
          adornment={Adorments.air}
        />
        <Checkbox
          value="dark"
          text={t('cards.elements.dark')}
          adornment={Adorments.dark}
        />
        <Checkbox
          value="earth"
          text={t('cards.elements.earth')}
          adornment={Adorments.earth}
        />
        <Checkbox
          value="fire"
          text={t('cards.elements.fire')}
          adornment={Adorments.fire}
        />
        <Checkbox
          value="light"
          text={t('cards.elements.light')}
          adornment={Adorments.light}
        />
        <Checkbox
          value="metal"
          text={t('cards.elements.metal')}
          adornment={Adorments.metal}
        />
        <Checkbox
          value="water"
          text={t('cards.elements.water')}
          adornment={Adorments.water}
        />
        <Checkbox
          value="mind"
          text={t('cards.elements.mind')}
          adornment={Adorments.mind}
        />
      </CheckboxGroup>
    </>
  )
})

ElementFilter.displayName = 'ElementFilter'
