/* eslint-disable valtio/state-snapshot-rule */
import { ItemType } from '@opensky/proto'
import clsx from 'clsx'
import { memo, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { Cards, CardType } from '~/shared/constants/cards'
import { useImageIsLoaded } from '~/shared/hooks/ui/useImageIsLoaded'
import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { CardImageStyle } from './CardImage.css'
import { CardLoadingFrame } from './components/CardLoadingFrame'

interface CardImageProps {
  id: CardType['id']
  className?: string
  showLoadingFrame?: boolean
  onClick?: () => void
  onLoad?: () => void
}

export const CardImage = memo(
  ({ id, className, showLoadingFrame, onClick, onLoad }: CardImageProps) => {
    const { isLoaded, imgRef, handleLoad } = useImageIsLoaded(onLoad)

    const { getAssetUrl } = useGetAssetContext()

    const { i18n } = useTranslation()

    const card = useMemo(() => {
      return Cards.get(id)
    }, [id])

    const cardSrcSet = useMemo(() => {
      if (!getAssetUrl || !i18n.language) return

      if (!card) return

      let suffix = ''

      if (card.grade === ItemType.SW_GOLD_CARDS) suffix = '-gold'
      if (card.grade === ItemType.SW_SILVER_CARDS) suffix = '-silver'

      return `
        ${getAssetUrl(
          `webapp/cards/full-cards/${i18n.language}/2x/${card.baseId}${suffix}.webp`
        )} 173w,
        ${getAssetUrl(
          `webapp/cards/full-cards/${i18n.language}/4x/${card.baseId}${suffix}.webp`
        )} 346w,
        ${getAssetUrl(
          `webapp/cards/full-cards/${i18n.language}/6x/${card.baseId}${suffix}.webp`
        )} 546w
      `
    }, [getAssetUrl, i18n.language, card])

    if (!card) return null

    return (
      <div
        onClick={onClick}
        className={Sprinkles({ width: 'full', position: 'relative' })}
      >
        {showLoadingFrame && (
          <CardLoadingFrame element={card?.element} isLoaded={isLoaded} />
        )}
        {!!cardSrcSet && (
          <img
            ref={imgRef}
            srcSet={cardSrcSet}
            onLoad={handleLoad}
            className={clsx(CardImageStyle, { isLoaded }, className)}
          />
        )}
      </div>
    )
  }
)

CardImage.displayName = 'CardImage'
