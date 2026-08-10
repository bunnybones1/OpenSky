import { EffectType } from '@skyweaver/state-metadata'
import clsx from 'clsx'
import { produce } from 'immer'
import { memo, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { ImageIconTypes } from '~/shared/components/ImageIcon/ImageIconConfig'
import { Text } from '~/shared/components/Text'
import { CardType } from '~/shared/constants/cards'
import { useGetCardTexts } from '~/shared/hooks/cards/useCardTexts'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { ImageIcon } from '../../ImageIcon/ImageIcon'
import { DeckStatList, DeckStatsListItem } from '../shared/style/DeckStatList.css'

interface DeckUnitEffectsProps {
  cards: CardType[]
}

type Effects =
  | Exclude<EffectType, 'Slay' | 'Generic' | 'Internal' | 'Choose'>
  | 'Unique'

const DEFAULT_EFFECTS: { [key in Effects]: number } = {
  Unique: 0,
  Continuous: 0,
  Death: 0,
  Glory: 0,
  Inspire: 0,
  Play: 0,
  Summon: 0,
  Sunrise: 0,
  Sunset: 0
}

const getIcon = (effect: Effects): ImageIconTypes => {
  if (effect === 'Unique') return 'trigger-generic'
  return `trigger-${
    effect.toLowerCase() as Lowercase<Exclude<Effects, 'Unique'>>
  }` as const
}

export const DeckUnitEffects = memo(({ cards }: DeckUnitEffectsProps) => {
  const { t } = useTranslation()
  const { getCardTexts } = useGetCardTexts()

  const counts = useMemo(() => {
    if (!cards) return
    return produce(DEFAULT_EFFECTS, (draft) => {
      cards.forEach((card) => {
        const { description } = getCardTexts(card.baseId)

        const hasAUniqueEffect =
          (card.effectTypes.length === 1 && card.effectTypes.includes('Generic')) ||
          (!!description &&
            description.length > 0 &&
            card.effectTypes.some((effect) => effect === 'Internal'))

        if (hasAUniqueEffect) {
          draft['Unique'] += 1
        } else {
          card.effectTypes.forEach((effect) => {
            if (effect !== 'Generic' && draft[effect] !== undefined) {
              draft[effect] += 1
            }
          })
        }
      })
    })
  }, [cards, getCardTexts])

  const getText = useCallback((effect: Effects) => {
    if (effect === 'Unique') {
      return 'cards.effects.UniqueEffect' as const
    }
    if (effect === 'Continuous') {
      return 'cards.effects.ContinuousEffect' as const
    }
    return `cards.effects.${
      effect as Exclude<Effects, 'Unique' | 'Continuous'>
    }` as const
  }, [])

  if (!counts) return null

  return (
    <div
      className={Sprinkles({
        width: 'full',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        justifyContent: 'flex-start'
      })}
    >
      <Text marginBottom="12px" color="purple9" fontWeight="700" fontSize="16px">
        {t('cards.UnitEffects')}
      </Text>
      <div
        className={clsx(
          Sprinkles({
            display: 'grid',
            width: 'full'
          }),
          DeckStatList
        )}
      >
        {Object.entries(counts).map(([effect, count]) => (
          <div
            key={effect}
            className={Sprinkles({
              width: 'full',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'nowrap',
              display: 'flex'
            })}
          >
            <div
              className={clsx(
                Sprinkles({
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-start'
                }),
                DeckStatsListItem,
                { hasNoCount: !count }
              )}
            >
              <ImageIcon
                type={getIcon(effect as Effects)}
                height="16px"
                marginRight="4px"
              />
              <Text color="white" fontSize="14px">
                {t(getText(effect as Effects))}
              </Text>
            </div>
            <Text color={!count ? 'purple7' : 'white'} fontSize="14px">
              {count}
            </Text>
          </div>
        ))}
      </div>
    </div>
  )
})

DeckUnitEffects.displayName = 'DeckUnitEffects'
