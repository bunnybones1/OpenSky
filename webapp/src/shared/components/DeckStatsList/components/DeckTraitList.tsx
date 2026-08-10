import { CardMetadata, Trait } from '@skyweaver/state-metadata'
import clsx from 'clsx'
import { produce } from 'immer'
import { memo, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { ImageIcon } from '~/shared/components/ImageIcon/ImageIcon'
import { Text } from '~/shared/components/Text'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { DeckStatList, DeckStatsListItem } from '../shared/style/DeckStatList.css'

interface DeckTraitProps {
  cards: CardMetadata[]
}

const DEFAULT_TRAITS: { [key in Trait]: number } = {
  armor: 0,
  banner: 0,
  dash: 0,
  guard: 0,
  lifesteal: 0,
  stealth: 0,
  wither: 0
}

export const DeckTraitList = memo(({ cards }: DeckTraitProps) => {
  const { t } = useTranslation()

  const counts = useMemo(() => {
    if (!cards) return
    return produce(DEFAULT_TRAITS, (draft) => {
      cards.forEach((card) => {
        card.traits.forEach((trait) => {
          if (draft[trait] !== undefined) {
            draft[trait] += 1
          }
        })
      })
    })
  }, [cards])

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
        {t('cards.Traits')}
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
        {(Object.entries(counts) as Array<[Trait, number]>).map(([trait, count]) => (
          <div
            key={trait}
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
              <ImageIcon height="14px" marginRight="4px" type={`trait-${trait}`} />
              <Text color="white" fontSize="14px">
                {t(`cardMeta:traits.titleCase.${trait}`)}
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

DeckTraitList.displayName = 'DeckTraitList'
