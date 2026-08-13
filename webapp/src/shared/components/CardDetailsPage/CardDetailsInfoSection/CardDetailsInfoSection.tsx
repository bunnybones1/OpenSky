import { ItemType } from '@opensky/proto'
import clsx from 'clsx'
import { ComponentType, memo } from 'react'

import { useResponsiveQuery } from '~/shared/hooks/ui/useResponsiveQuery'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { CardDetailsInfoSectionStyle } from './CardDetailsInfoSection.css'
import { CardInfoSection } from './components/CardInfoSection'
import { FlavorTextSection } from './components/FlavorTextSection'
import { RelatedCards } from './components/RelatedCards'
import { Keywords } from './Keywords/Keywords'
import { RelatedDecks } from './RelatedDecks/RelatedDecks'
import { TokenInfoSection } from './TokenInfoSection/TokenInfoSection'

interface CardDetailsInfoSectionProps {
  Controls?: ComponentType<{ id: number }>
  id: number
  allowedGrades?: (
    | ItemType.SW_BASE_CARDS
    | ItemType.SW_GOLD_CARDS
    | ItemType.SW_SILVER_CARDS
  )[]
  switchCard?: (id: number) => void
  hideTokenInfo?: boolean
  inventoryOnly?: boolean
}

export const CardDetailsInfoSection = memo(
  ({
    Controls,
    id,
    allowedGrades,
    switchCard,
    hideTokenInfo,
    inventoryOnly
  }: CardDetailsInfoSectionProps) => {
    const isTabletWide = useResponsiveQuery('tabletWide')

    return (
      <div
        className={clsx(
          Sprinkles({
            flex: 1,
            display: 'grid',
            paddingTop: '16px',
            paddingBottom: '48px'
          }),
          CardDetailsInfoSectionStyle
        )}
      >
        {!!Controls && <Controls id={id} />}
        {!hideTokenInfo && (
          <TokenInfoSection
            switchCard={switchCard}
            allowedGrades={allowedGrades}
            id={id}
            inventoryOnly={inventoryOnly}
          />
        )}
        {!isTabletWide && <FlavorTextSection id={id} />}
        <CardInfoSection id={id} />
        <Keywords id={id} />
        <RelatedCards id={id} switchCard={switchCard} />
        <RelatedDecks id={id} />
      </div>
    )
  }
)

CardDetailsInfoSection.displayName = 'CardDetailsInfoSection'
