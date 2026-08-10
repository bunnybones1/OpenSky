import { ItemType } from '@opensky/proto'
import clsx from 'clsx'
import { ComponentType, memo, useMemo } from 'react'

import { Cards } from '~/shared/constants/cards'
import { useCardFlavorText, useCardTexts } from '~/shared/hooks/cards/useCardTexts'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { CardDetailsInfoSection } from './CardDetailsInfoSection/CardDetailsInfoSection'
import {
  CardDetailsContainerStyle,
  CardDetailsPageStyle
} from './CardDetailsPage.css'
import { CardDetailsBackground } from './components/CardDetailsBackground'
import { CardDetailsHeader } from './components/CardDetailsHeader'
import { CardDetailsPageCard } from './components/CardDetailsPageCard'

interface CardDetailsPageProps {
  id: number
  Controls?: ComponentType<{ id: number }>
  allowedGrades?: (
    | ItemType.SW_BASE_CARDS
    | ItemType.SW_GOLD_CARDS
    | ItemType.SW_SILVER_CARDS
  )[]
  switchCard?: (id: number) => void
}

export const CardDetailsPage = memo(
  ({ id, Controls, switchCard, allowedGrades }: CardDetailsPageProps) => {
    const card = useMemo(() => Cards.get(id), [id])

    const cardTexts = useCardTexts(card?.baseId)
    const flavorTextInfo = useCardFlavorText(card?.baseId)

    if (!card || !cardTexts?.name) return null

    return (
      <div
        className={clsx(
          Sprinkles({
            width: 'full',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'flex-start',
            position: 'relative',
            flexDirection: 'column'
          }),
          CardDetailsPageStyle
        )}
      >
        <CardDetailsHeader grade={card.grade} name={cardTexts.name} />
        <CardDetailsBackground
          id={id}
          asset={card.artSlug}
          type={card.type}
          backgroundAsset={card.backgroundArtSlug}
        />
        <div
          className={clsx(
            Sprinkles({
              width: 'full',
              display: 'flex',
              alignItems: 'flex-start'
            }),
            CardDetailsContainerStyle
          )}
        >
          <CardDetailsPageCard
            id={id}
            asset={card.artSlug}
            set={card.set}
            flavorText={flavorTextInfo?.text}
            flavorExplainer={flavorTextInfo?.explainer}
            author={flavorTextInfo?.author}
          />
          <CardDetailsInfoSection
            switchCard={switchCard}
            id={id}
            Controls={Controls}
            allowedGrades={allowedGrades}
          />
        </div>
      </div>
    )
  }
)

CardDetailsPage.displayName = 'CardDetailsPage'
