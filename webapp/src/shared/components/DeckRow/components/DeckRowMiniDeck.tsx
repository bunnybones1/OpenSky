import { DeckClass } from '@opensky/proto'
import clsx from 'clsx'
import { memo, useMemo } from 'react'

import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import {
  DeckRowMiniDeckStyle,
  MiniDeckArt,
  MiniDeckArtWrapper,
  MiniDeckBody,
  MiniDeckHex,
  MiniDeckHighlight,
  MiniDeckTop
} from './DeckRowMiniDeck.css'

interface DeckRowMiniDeckProps {
  isHighlighted: boolean
  isLarge: boolean
  deckArt: string
  numGoldCards: number
  numSilverCards: number
  deckClass: DeckClass
}

export const DeckRowMiniDeck = memo(
  ({
    deckArt,
    isLarge,
    numGoldCards,
    numSilverCards,
    isHighlighted,
    deckClass
  }: DeckRowMiniDeckProps) => {
    const { getAssetUrl } = useGetAssetContext()

    const cardTopColor = useMemo(() => {
      let colour = 'base-cards'
      if (numSilverCards >= 5 && numGoldCards < 5) {
        colour = 'silver-base-cards'
      }
      if (numSilverCards >= 10 && numGoldCards < 5) {
        colour = 'silver-cards'
      }
      if (numGoldCards >= 5 && numSilverCards < 5) {
        colour = 'gold-base-cards'
      }
      if (numGoldCards >= 10 && numSilverCards < 5) {
        colour = 'gold-cards'
      }
      if (numSilverCards >= 5 && numGoldCards >= 5) {
        colour = 'gold-silver-cards'
      }
      return colour
    }, [numGoldCards, numSilverCards])

    return (
      <div
        className={clsx(
          Sprinkles({
            position: 'absolute',
            left: 0,
            bottom: 0,
            height: 'full',
            pointerEvents: 'none'
          }),
          DeckRowMiniDeckStyle,
          { isLarge }
        )}
      >
        {!!getAssetUrl && (
          <>
            <div
              className={clsx(
                Sprinkles({ position: 'absolute' }),
                MiniDeckArtWrapper
              )}
            >
              <img
                src={getAssetUrl(deckArt)}
                className={clsx(
                  Sprinkles({ position: 'absolute', width: 'full' }),
                  MiniDeckArt
                )}
              />
            </div>
            <img
              src={getAssetUrl('webapp/misc/deck-icon-body.webp')}
              className={clsx(
                Sprinkles({
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  height: 'full'
                }),
                MiniDeckBody
              )}
            />
            <img
              src={getAssetUrl(`webapp/misc/deck-icon-highlight.webp`)}
              className={clsx(
                Sprinkles({
                  height: 'full',
                  width: 'full',
                  top: 0,
                  left: 0,
                  position: 'absolute'
                }),
                MiniDeckHighlight,
                { isHighlighted }
              )}
            />
            <img
              src={getAssetUrl(`webapp/misc/deck-icon-${cardTopColor}.webp`)}
              className={clsx(
                Sprinkles({
                  height: 'full',
                  width: 'full',
                  position: 'absolute',
                  left: 0,
                  top: 0
                }),
                MiniDeckTop
              )}
            />
            <img
              src={getAssetUrl(`webapp/icons/${deckClass}-thumbnail-hex.webp`)}
              className={clsx(
                Sprinkles({
                  position: 'absolute'
                }),
                MiniDeckHex,
                { isLarge }
              )}
            />
          </>
        )}
      </div>
    )
  }
)

DeckRowMiniDeck.displayName = 'DeckRowMiniDeck'
