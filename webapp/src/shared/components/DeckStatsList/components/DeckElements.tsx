import { CardMetadata, Element } from '@skyweaver/state-metadata'
import clsx from 'clsx'
import { produce } from 'immer'
import { memo, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { ImageIcon } from '~/shared/components/ImageIcon/ImageIcon'
import { Text } from '~/shared/components/Text'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { DeckStatList, DeckStatsListItem } from '../shared/style/DeckStatList.css'

interface DeckElementsProps {
  cards: CardMetadata[]
}

type ElementWithoutSky = Exclude<Element, 'sky'>

const DEFAULT_ELEMENTS: { [key in ElementWithoutSky]: number } = {
  air: 0,
  dark: 0,
  earth: 0,
  fire: 0,
  light: 0,
  metal: 0,
  mind: 0,
  water: 0
}

export const DeckElements = memo(({ cards }: DeckElementsProps) => {
  const { t } = useTranslation()

  const counts = useMemo(() => {
    if (!cards) return
    return produce(DEFAULT_ELEMENTS, (draft) => {
      cards.forEach((card) => {
        if (draft[card.element] !== undefined) {
          draft[card.element] += 1
        }
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
        {t('cards.Elements')}
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
        {Object.entries(counts).map(([element, count]) => (
          <div
            key={element}
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
                height="16px"
                type={`element-${element as ElementWithoutSky}`}
                marginRight="4px"
              />
              <Text color="white" fontSize="14px">
                {t(`cards.elements.${element as ElementWithoutSky}`)}
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

DeckElements.displayName = 'DeckElements'
