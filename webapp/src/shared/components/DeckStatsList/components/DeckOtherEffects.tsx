import clsx from 'clsx'
import { produce } from 'immer'
import capitalize from 'lodash-es/capitalize'
import { memo, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { Text } from '~/shared/components/Text'
import { CardType } from '~/shared/constants/cards'
import { useGetCardTexts } from '~/shared/hooks/cards/useCardTexts'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { DeckStatList, DeckStatsListItem } from '../shared/style/DeckStatList.css'

interface DeckUnitEffectsProps {
  cards: CardType[]
}

const DEFAULT_EFFECTS = {
  Conjure: 0,
  Draw: 0,
  Dust: 0,
  Mulligan: 0,
  Random: 0,
  Ready: 0
} as const

export const DeckOtherEffects = memo(({ cards }: DeckUnitEffectsProps) => {
  const { t } = useTranslation()
  const { getCardTexts } = useGetCardTexts()

  const counts = useMemo(() => {
    if (!cards) return
    return produce(DEFAULT_EFFECTS, (draft) => {
      cards.forEach((card) => {
        const { description } = getCardTexts(card.baseId)
        if (description) {
          description.forEach((td) => {
            if (
              !!td.value.text &&
              draft[capitalize(td.value.text.toLowerCase())] !== undefined
            ) {
              draft[capitalize(td.value.text.toLowerCase())] += 1
            }
          })
        }
      })
    })
  }, [cards, getCardTexts])

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
        {(Object.entries(counts) as Array<[keyof typeof counts, number]>).map(
          ([effect, count]) => (
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
                <Text color="white" fontSize="14px">
                  {t(
                    `cardMeta:keyword.titleCase.${
                      effect.toLowerCase() as Lowercase<typeof effect>
                    }`
                  )}
                </Text>
              </div>
              <Text color="white" fontSize="14px">
                {count}
              </Text>
            </div>
          )
        )}
      </div>
    </div>
  )
})

DeckOtherEffects.displayName = 'DeckOtherEffects'
