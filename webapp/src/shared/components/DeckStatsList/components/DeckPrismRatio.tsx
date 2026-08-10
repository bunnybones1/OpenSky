import { CODE_PRISMS, PrismClass } from '@opensky/shared/constants'
import { CardMetadata } from '@skyweaver/state-metadata'
import { memo, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { DeckClass } from '~/lib/proto'
import { Icon } from '~/shared/components/Icon/Icon'
import { Text } from '~/shared/components/Text'
import { PRISM_ICON_TYPES } from '~/shared/constants/cards'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { DeckStatsRatioBar } from '../shared/components/DeckStatsRatioBar'

interface DeckPrismRatioProps {
  cards: CardMetadata[]
  deckClass: DeckClass
}

export const DeckPrismRatio = memo(({ deckClass, cards }: DeckPrismRatioProps) => {
  const prisms = CODE_PRISMS[deckClass]

  const { t } = useTranslation()

  const prismCounts = useMemo(() => {
    if (!prisms.length) return null

    let firstPrismCount = 0
    let secondPrismCount: number | undefined = undefined

    cards.forEach((card) => {
      const prism = card.prism.toUpperCase()
      if (prism === prisms[0]) {
        firstPrismCount += 1
      }
      if (!!prisms[1] && prism === prisms[1]) {
        secondPrismCount = !secondPrismCount ? 1 : secondPrismCount + 1
      }
    })

    return { firstPrismCount, secondPrismCount }
  }, [cards, prisms])

  if (!prisms.length || !prismCounts) return null

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
        {`${t('generic.PRISM')} ${t('generic.RATIO')}`}
      </Text>
      <div
        className={Sprinkles({
          width: 'full',
          alignItems: 'center',
          justifyContent: 'space-between',
          display: 'flex',
          marginBottom: '4px'
        })}
      >
        <div
          className={Sprinkles({
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-start'
          })}
        >
          <Icon
            height="16px"
            marginRight="4px"
            type={PRISM_ICON_TYPES[prisms[0]]}
            color={prisms[0]}
          />
          <Text color="purple9" fontSize="14px" fontWeight="500">
            {`${prismCounts.firstPrismCount} ${t(
              `cards.prisms.${prisms[0].toLowerCase() as Lowercase<PrismClass>}`
            )}`}
          </Text>
        </div>
        {prismCounts.secondPrismCount !== undefined && (
          <div
            className={Sprinkles({
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-start'
            })}
          >
            <Icon
              height="16px"
              marginRight="4px"
              type={PRISM_ICON_TYPES[prisms[1]]}
              color={prisms[1]}
            />
            <Text color="purple9" fontSize="14px" fontWeight="500">
              {`${prismCounts.secondPrismCount} ${t(
                `cards.prisms.${prisms[1].toLowerCase() as Lowercase<PrismClass>}`
              )}`}
            </Text>
          </div>
        )}
      </div>
      <DeckStatsRatioBar
        leftBarColor={prisms[0]}
        leftBarValue={prismCounts.firstPrismCount}
        rightBarColor={prisms[1]}
        rightBarValue={prismCounts.secondPrismCount}
      />
    </div>
  )
})

DeckPrismRatio.displayName = 'DeckPrismRatio'
