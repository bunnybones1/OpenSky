import { DeckClass } from '@opensky/proto'
import { BaseCard } from '@skyweaver/state-metadata'
import clsx from 'clsx'
import { memo, useMemo } from 'react'

import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'
import { Sprinkles } from '~/shared/style/Sprinkles.css'
import { DeckCardGradeType } from '~/shared/types/decks'

import { DeckFrame, DeckHighlight, DeckTop, PrismOrHeroIcon } from './DeckImages.css'

interface DeckImagesProps {
  isHighlighted: boolean
  isStarterDeck: boolean
  deckClass: DeckClass
  artCardId?: BaseCard
  gradeType?: DeckCardGradeType
}

export const DeckImages = memo(
  ({
    isStarterDeck,
    deckClass,
    artCardId,
    isHighlighted,
    gradeType
  }: DeckImagesProps) => {
    const { getAssetUrl } = useGetAssetContext()

    const frameSrcSet = useMemo(() => {
      if (!getAssetUrl) return undefined

      if (isStarterDeck) {
        return `
          ${getAssetUrl(
            `webapp/cards/deck-cover-images/2x/${deckClass.toLowerCase()}-hero@2x.webp`
          )} 173w,
          ${getAssetUrl(
            `webapp/cards/deck-cover-images/4x/${deckClass.toLowerCase()}-hero@4x.webp`
          )} 346w,
          ${getAssetUrl(
            `webapp/cards/deck-cover-images/6x/${deckClass.toLowerCase()}-hero@6x.webp`
          )} 546w
        `
      }

      if (!!artCardId) {
        return `
          ${getAssetUrl(
            `webapp/cards/deck-cover-images/2x/${artCardId}@2x.webp`
          )} 173w,
          ${getAssetUrl(
            `webapp/cards/deck-cover-images/4x/${artCardId}@4x.webp`
          )} 346w,
          ${getAssetUrl(
            `webapp/cards/deck-cover-images/6x/${artCardId}@6x.webp`
          )} 546w
        `
      }

      return `
          ${getAssetUrl(
            `webapp/cards/deck-cover-images/2x/${deckClass.toLowerCase()}-prism@2x.webp`
          )} 173w,
          ${getAssetUrl(
            `webapp/cards/deck-cover-images/4x/${deckClass.toLowerCase()}-prism@4x.webp`
          )} 346w,
          ${getAssetUrl(
            `webapp/cards/deck-cover-images/6x/${deckClass.toLowerCase()}-prism@6x.webp`
          )} 546w
        `
    }, [artCardId, deckClass, getAssetUrl, isStarterDeck])

    if (!getAssetUrl || !frameSrcSet) return null

    return (
      <>
        <img
          src={getAssetUrl('webapp/misc/deck-highlight.webp')}
          className={clsx(
            Sprinkles({
              height: 'full',
              width: 'full',
              position: 'absolute',
              left: 0,
              pointerEvents: 'none',
              top: 0
            }),
            { isHighlighted },
            DeckHighlight
          )}
        />
        <img
          className={clsx(
            Sprinkles({
              height: 'full',
              width: 'full',
              position: 'absolute',
              left: 0,
              pointerEvents: 'none',
              top: 0
            }),
            DeckTop
          )}
          src={getAssetUrl(
            `webapp/cards/deck-cover-images/4x/deck-cards-${
              gradeType || 'bbb'
            }@4x.webp`
          )}
        />
        <img
          className={clsx(
            Sprinkles({
              height: 'full',
              width: 'full',
              position: 'absolute',
              left: 0,
              pointerEvents: 'none',
              top: 0
            }),
            DeckFrame
          )}
          srcSet={frameSrcSet}
          src={getAssetUrl('webapp/misc/deck-border.webp')}
        />
        <img
          className={clsx(
            Sprinkles({
              position: 'absolute',
              top: 0,
              left: 0
            }),
            PrismOrHeroIcon
          )}
          src={getAssetUrl(`webapp/icons/prisms/large/${deckClass}.webp`)}
        />
      </>
    )
  }
)

DeckImages.displayName = 'DeckImages'
