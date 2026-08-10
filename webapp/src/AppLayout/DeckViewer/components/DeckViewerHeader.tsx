import { DECK_CARDS_REQUIRED } from '@opensky/shared/deckConsts'
import clsx from 'clsx'
import { memo } from 'react'

import { DeckRow } from '~/shared/components/DeckRow/DeckRow'
import { useDeckArt } from '~/shared/hooks/decks/useDeckArt'
import { useDeckCardGradeCounts } from '~/shared/hooks/decks/useDeckCardGradeCounts'
import { useDeckName } from '~/shared/hooks/decks/useDeckName'
import { useDeckOwnedCards } from '~/shared/hooks/decks/useDeckOwnedCards'
import { useDecodedDeckString } from '~/shared/hooks/decks/useDecodedDeckString'
import { useIsStarterDeck } from '~/shared/hooks/decks/useIsStarterDeck'
import { useUserDeck } from '~/shared/queries/decks/useUserDecks'
import { useSelector } from '~/shared/redux'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { deckViewerIdSelector } from '../shared/selectors'
import { DeckViewerHeaderStyle } from './DeckViewerHeader.css'

interface DeckViewerHeaderProps {
  deckString?: string
}

export const DeckViewerHeader = memo(({ deckString }: DeckViewerHeaderProps) => {
  const deckId = useSelector(deckViewerIdSelector)

  const { data: deck } = useUserDeck(deckId)
  const { deckClass, cardIds } = useDecodedDeckString(deckString)
  const isStarterDeck = useIsStarterDeck(deck?.deckType)

  const ownedCards = useDeckOwnedCards(cardIds)

  const firstCard = cardIds ? Number(cardIds[0]) : undefined

  const art = useDeckArt({
    firstCard,
    art: deck?.art,
    deckClass: deck?.class,
    isStarterDeck
  })

  const name = useDeckName(isStarterDeck, deck?.name, deckClass)
  const gradeCounts = useDeckCardGradeCounts(deckId)

  if (!deckString || !deckClass || !art) return null

  return (
    <div
      className={clsx(
        Sprinkles({
          width: 'full',
          paddingY: '8px',
          paddingX: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start',
          position: 'relative'
        }),
        DeckViewerHeaderStyle
      )}
    >
      <DeckRow
        name={name}
        identifier={deckId || deckString}
        deckString={deckString}
        deckClass={deckClass}
        numGoldCards={
          !!deckId && !!gradeCounts ? gradeCounts.numGoldCards : undefined
        }
        numSilverCards={
          !!deckId && !!gradeCounts ? gradeCounts.numSilverCards : undefined
        }
        numCardsRequiredInDeck={DECK_CARDS_REQUIRED}
        numCardsInDeck={ownedCards?.length}
        rowArt={art.rowArt}
        deckArt={art.miniColumnArt}
        showPrism
        isPresentational
        isStarterDeck={isStarterDeck}
      />
    </div>
  )
})

DeckViewerHeader.displayName = 'DeckViewerHeader'
