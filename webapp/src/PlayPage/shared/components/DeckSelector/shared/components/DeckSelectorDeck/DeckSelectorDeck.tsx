import { DeckType } from '@opensky/proto'
import { memo } from 'react'

import { DeckRow } from '~/shared/components/DeckRow/DeckRow'
import { useDeckArt } from '~/shared/hooks/decks/useDeckArt'
import { useDeckCardGradeCounts } from '~/shared/hooks/decks/useDeckCardGradeCounts'
import { useDeckCardsRequired } from '~/shared/hooks/decks/useDeckCardsRequired'
import { useDeckName } from '~/shared/hooks/decks/useDeckName'
import { useDeckOwnedCards } from '~/shared/hooks/decks/useDeckOwnedCards'
import { useDecodedDeckString } from '~/shared/hooks/decks/useDecodedDeckString'
import { useIsStarterDeck } from '~/shared/hooks/decks/useIsStarterDeck'
import { useUserDeck } from '~/shared/queries/decks/useUserDecks'

import { DeckSelectorDeckWrapper } from './DeckSelectorDeckWrapper/DeckSelectorDeckWrapper'

interface DeckButtonProps {
  onClick: (uuid: string) => void
  uuid: string
  isArrowVisible?: boolean
  isLocked?: boolean
  isActive: boolean
}

export const DeckSelectorDeck = memo(
  ({ uuid, isArrowVisible, isLocked, isActive, onClick }: DeckButtonProps) => {
    const { data: deck } = useUserDeck(uuid)
    const { deckClass, cardIds } = useDecodedDeckString(deck?.deckString)
    const cardsRequired = useDeckCardsRequired(deckClass)
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
    const gradeCounts = useDeckCardGradeCounts(uuid)

    if (!deck || !deckClass || cardsRequired === null || !art) return null

    return (
      <DeckSelectorDeckWrapper uuid={uuid}>
        <DeckRow
          name={name}
          identifier={uuid}
          deckString={deck.deckString}
          deckClass={deckClass}
          isFavourite={deck?.isFavorite}
          isSelected={isActive}
          numGoldCards={
            !!uuid && !!gradeCounts ? gradeCounts.numGoldCards : undefined
          }
          numSilverCards={
            !!uuid && !!gradeCounts ? gradeCounts.numSilverCards : undefined
          }
          onClick={onClick}
          numCardsRequiredInDeck={cardsRequired}
          numCardsInDeck={ownedCards?.length}
          rowArt={art.rowArt}
          deckArt={art.miniColumnArt}
          showPrism
          hasDropdown={isArrowVisible}
          isLocked={isLocked || deck?.deckType === DeckType.LOCKED_STARTER}
          isStarterDeck={isStarterDeck}
        />
      </DeckSelectorDeckWrapper>
    )
  }
)

DeckSelectorDeck.displayName = 'DeckSelectorDeck'
