import { CardMetadata } from '@skyweaver/state-metadata'
import { memo, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { ImageIcon } from '~/shared/components/ImageIcon/ImageIcon'
import { Text } from '~/shared/components/Text'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { DeckStatsRatioBar } from '../shared/components/DeckStatsRatioBar'

interface DeckCardTypeRatioProps {
  cards: CardMetadata[]
}

export const DeckCardTypeRatio = memo(({ cards }: DeckCardTypeRatioProps) => {
  const { t } = useTranslation()

  const counts = useMemo(() => {
    let unitCount = 0
    let spellCount = 0

    cards.forEach((card) => {
      if (card.type === 'unit') unitCount += 1
      if (card.type === 'spell') spellCount += 1
    })

    return { unitCount, spellCount }
  }, [cards])

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
        {`${t('cards.CardType')}`}
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
          <ImageIcon height="16px" marginRight="4px" type="unit" />
          <Text color="purple9" fontSize="14px" fontWeight="500">
            {t('cards.UnitsInDeck', { count: counts.unitCount })}
          </Text>
        </div>
        <div
          className={Sprinkles({
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-start'
          })}
        >
          <ImageIcon height="16px" marginRight="4px" type="spell" />
          <Text color="purple9" fontSize="14px" fontWeight="500">
            {t('cards.SpellsInDeck', { count: counts.spellCount })}
          </Text>
        </div>
      </div>
      <DeckStatsRatioBar
        leftBarColor="unit"
        leftBarValue={counts.unitCount}
        rightBarColor="spell"
        rightBarValue={counts.spellCount}
      />
    </div>
  )
})

DeckCardTypeRatio.displayName = 'DeckCardTypeRatio'
