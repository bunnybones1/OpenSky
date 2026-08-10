import styled from '@emotion/styled'
import { Deck, DeckType } from '@opensky/proto'
import { memo, useMemo } from 'react'

import { Asset } from '~/shared/components/Asset'
import { FlexBox } from '~/shared/components/Base'
import { useDecodedDeckString } from '~/shared/hooks/decks/useDecodedDeckString'

import { useDeckArt } from '../hooks/decks/useDeckArt'
import { useIsStarterDeck } from '../hooks/decks/useIsStarterDeck'

interface DeckIconProps extends React.HTMLAttributes<HTMLDivElement> {
  deck?: Deck
  isMicro?: boolean
  cardColour?: string
}

export const DeckIcon = memo(
  ({ deck, isMicro = false, cardColour = 'base-cards' }: DeckIconProps) => {
    const { cardIds } = useDecodedDeckString(deck?.deckString)
    const isStarterDeck = useIsStarterDeck(deck?.deckType)
    const firstCard = cardIds ? Number(cardIds[0]) : undefined

    const art = useDeckArt({
      firstCard,
      art: deck?.art,
      deckClass: deck?.class,
      isStarterDeck
    })

    const miniBg = useMemo(() => {
      if (
        deck?.deckType === DeckType.UNLOCKED_STARTER ||
        deck?.deckType === DeckType.LOCKED_STARTER
      ) {
        return `webapp/backgrounds/mini-deck-art-${deck.class.toLowerCase()}.webp`
      } else {
        return `webapp/cards/art-columns/2x/${art?.id}-column@2x.webp`
      }
    }, [art?.id, deck?.class, deck?.deckType])

    if (!deck) return null

    return (
      <FlexBox
        height="100%"
        width={isMicro ? '52px' : '74px'}
        flexShrink={0}
        style={{
          position: 'absolute',
          bottom: '0px',
          left: '-14px'
        }}
      >
        <Asset url={miniBg}>
          {({ result }) => (
            <GridDeckArt
              style={{
                backgroundImage: `url(${result})`,
                zIndex: 2,
                width: '72px',
                height: '62px',
                position: 'absolute',
                left: '-6px',
                backgroundSize: 'cover'
              }}
              top={isMicro ? ['30px'] : ['10px', '10px', '10px', '10px']}
            />
          )}
        </Asset>
        <Asset
          url={`webapp/misc/deck-icon-body.webp`}
          style={{
            height: '80px',
            width: '80px',
            zIndex: 2,
            position: 'absolute',
            bottom: '0px',
            left: '-10px'
          }}
        />
        <Asset
          url={`webapp/misc/deck-icon-${cardColour}.webp`}
          style={{
            height: '80px',
            width: '80px',
            zIndex: 3,
            position: 'absolute',
            bottom: '0px',
            left: '-10px'
          }}
        />
        <Asset
          url={`webapp/icons/${deck.class}-thumbnail-hex.webp`}
          style={{
            height: '52px',
            width: '52px',
            zIndex: 4,
            position: 'absolute',
            bottom: '-10px',
            left: '3px'
          }}
        />
      </FlexBox>
    )
  }
)

const GridDeckArt = styled(FlexBox)`
  position: absolute;
  right: 0px;
  top: 0px;
  width: 98%;
  height: 100%;
  background-repeat: no-repeat;
  background-position: 0% 10%;
  background-size: cover;
  transition: all 0.2s ease-in;
  ${({ theme }) => theme.mediaQueries.mobile} {
    background-position: 80% 0;
  }
`

DeckIcon.displayName = 'DeckIcon'
