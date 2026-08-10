import { memo } from 'react'
import { useSnapshot } from 'valtio'

import { deckBuilderDeckStringSelector } from '~/DeckBuilder/shared/selectors'
import { RowArt } from '~/shared/components/RowArt/RowArt'
import { useDeckArt } from '~/shared/hooks/decks/useDeckArt'
import { useDecodedDeckString } from '~/shared/hooks/decks/useDecodedDeckString'
import { useIsStarterDeck } from '~/shared/hooks/decks/useIsStarterDeck'
import { useUserDeck } from '~/shared/queries/decks/useUserDecks'
import { useSelector } from '~/shared/redux'
import { deckBuilderState } from '~/shared/state/deck-builder/deck-builder-state'

interface HeaderDeckArtProps {
  uuid?: string
}

export const HeaderDeckArt = memo(({ uuid }: HeaderDeckArtProps) => {
  const deckString = useSelector(deckBuilderDeckStringSelector)
  const { lastClickedCardId } = useSnapshot(deckBuilderState)
  const { cardIds, deckClass } = useDecodedDeckString(deckString)
  const { data: deck } = useUserDeck(uuid)
  const isStarterDeck = useIsStarterDeck(deck?.deckType)

  const firstCard = cardIds ? Number(cardIds[0]) : undefined

  const art = useDeckArt({
    art: lastClickedCardId || deck?.art,
    firstCard,
    isStarterDeck,
    deckClass
  })

  if (!art) return null

  return (
    <RowArt colorType={!!uuid ? 'secondary' : 'blue'} url={art.rowArt} useHeight />
  )
})

HeaderDeckArt.displayName = 'HeaderDeckArt'
