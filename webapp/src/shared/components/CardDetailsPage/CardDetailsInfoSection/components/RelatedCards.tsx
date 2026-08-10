import { getGradedID } from '@opensky/shared/assetsIDs'
import clsx from 'clsx'
import uniq from 'lodash-es/uniq'
import { memo, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { CardImage } from '~/shared/components/CardImage/CardImage'
import { Text } from '~/shared/components/Text'
import { Cards } from '~/shared/constants/cards'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { RelatedCardsGrid } from './RelatedCards.css'

interface RelatedCardsProps {
  id: number
  switchCard?: (id: number) => void
}

export const RelatedCards = memo(({ id, switchCard }: RelatedCardsProps) => {
  const { t } = useTranslation()
  const relatedCards = useMemo(() => {
    const card = Cards.get(id)

    if (!card) return

    const cards: number[] = []

    if (card.attachment) {
      cards.push(getGradedID(card.attachment, card.grade))
    }

    card.relatedCards.forEach((id) => {
      cards.push(getGradedID(id, card.grade))
    })

    return uniq(cards)
  }, [id])

  if (!relatedCards || !relatedCards.length) return null

  return (
    <div
      className={Sprinkles({
        width: 'full',
        border: '1px solid',
        borderColor: 'purple5',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        justifyContent: 'flex-start',
        backgroundColor: 'purple2',
        paddingX: '16px'
      })}
    >
      <Text
        fontSize="26px"
        color="white"
        fontWeight="600"
        fontFamily="condensed"
        marginTop="16px"
        marginBottom="12px"
        className={Sprinkles({
          textAlign: 'center',
          width: 'full'
        })}
      >
        {t('cardDetails.relatedCards')}
      </Text>
      <div
        className={clsx(
          Sprinkles({
            width: 'full',
            display: 'grid'
          }),
          RelatedCardsGrid
        )}
      >
        {relatedCards.map((relatedId) => (
          <CardImage
            id={relatedId}
            key={relatedId}
            onClick={!!switchCard ? () => switchCard(relatedId) : undefined}
          />
        ))}
      </div>
    </div>
  )
})

RelatedCards.displayName = 'RelatedCards'
