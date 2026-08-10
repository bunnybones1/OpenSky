import { getBaseID } from '@opensky/shared/assetsIDs'
import { DECKCLASS_HEROES } from '@opensky/shared/constants'
import { DECK_CARDS_REQUIRED } from '@opensky/shared/deckConsts'
import { memo, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { push } from 'redux-first-history'

import { deckViewerIdSelector } from '~/AppLayout/DeckViewer/shared/selectors'
import { DeckType } from '~/lib/proto'
import { SoundClient } from '~/shared/clients'
import { Deck } from '~/shared/components/Deck/Deck'
import { ItemNewBadge } from '~/shared/components/ItemNewBadge'
import { Cards } from '~/shared/constants/cards'
import { DECK_VIEWER_SETTINGS_DIALOG_ID } from '~/shared/constants/ui'
import { makeDeckViewerRoute } from '~/shared/helpers/routes/items-decks'
import { useDeckGradeType } from '~/shared/hooks/decks/useDeckGradeType'
import { useDeckName } from '~/shared/hooks/decks/useDeckName'
import { useDeckOwnedCards } from '~/shared/hooks/decks/useDeckOwnedCards'
import { useDecodedDeckString } from '~/shared/hooks/decks/useDecodedDeckString'
import { useIsStarterDeck } from '~/shared/hooks/decks/useIsStarterDeck'
import { controlDialog } from '~/shared/hooks/useDialog/control-dialog'
import { useFavouriteDeck } from '~/shared/mutations/decks/useFavouriteDeck'
import { useMarkDeckNotNew } from '~/shared/mutations/decks/useMarkDeckNotNew'
import { useUnFavouriteDeck } from '~/shared/mutations/decks/useUnFavouriteDeck'
import { getUserDecks, useUserDeck } from '~/shared/queries/decks/useUserDecks'
import { useDispatch, useSelector } from '~/shared/redux'

import { BUY_DECKS_BUTTON_ID, CREATE_DECK_BUTTON_ID } from '../shared/constants'
import { ItemsDeckButton } from './components/ItemsDeckButton'

interface ItemsDeckNewBadgeProps {
  identifier: string
}

const ItemsDeckNewBadge = memo(({ identifier }: ItemsDeckNewBadgeProps) => {
  const { data: deck } = useUserDeck(identifier)
  const markDeckNotNew = useMarkDeckNotNew()

  const onHide = useCallback(() => {
    if (!deck?.uuid || !deck?.isNew) return

    const decks = getUserDecks()

    const _deck = decks?.find((d) => d.uuid === deck.uuid)

    if (_deck && _deck.isNew) {
      markDeckNotNew.mutate(_deck)
    }
  }, [deck?.isNew, deck?.uuid, markDeckNotNew])

  if (!deck) return null

  return <ItemNewBadge isNew={deck.isNew} onHide={onHide} />
})

ItemsDeckNewBadge.displayName = 'ItemsDeckNewBadge'

export interface ItemsDeckProps {
  id: string
}

const ItemsDeck = memo(({ id }: ItemsDeckProps) => {
  const { data: deck } = useUserDeck(id)
  const { t } = useTranslation()

  const { cardIds } = useDecodedDeckString(deck?.deckString)
  const isStarterDeck = useIsStarterDeck(deck?.deckType)
  const deckId = useSelector(deckViewerIdSelector)
  const markDeckNotNew = useMarkDeckNotNew()

  const favouriteDeck = useFavouriteDeck()
  const unFavouriteDeck = useUnFavouriteDeck()
  const ownedCards = useDeckOwnedCards(cardIds)

  const gradeType = useDeckGradeType(id)

  const firstCard = useMemo(() => {
    return !!cardIds ? cardIds[cardIds.length - 1] : undefined
  }, [cardIds])

  const deckArt = useMemo(() => {
    if (deck?.art) {
      return Cards.get(getBaseID(deck.art))?.baseId
    }
    return undefined
  }, [deck?.art])

  const name = useDeckName(isStarterDeck, deck?.name, deck?.class)

  const dispatch = useDispatch()

  const onClick = useCallback(() => {
    if (deck) {
      dispatch(
        push(
          makeDeckViewerRoute(
            deck?.deckString,
            deck?.uuid,
            isStarterDeck ? DECKCLASS_HEROES[deck?.class] : undefined
          )
        )
      )
    }
  }, [deck, dispatch, isStarterDeck])

  const onHover = useCallback(() => {
    if (!deck?.uuid || !deck?.isNew) return

    const decks = getUserDecks()

    const _deck = decks?.find((d) => d.uuid === deck.uuid)

    if (_deck && _deck.isNew) {
      markDeckNotNew.mutate(_deck)
    }
  }, [deck, markDeckNotNew])

  const onChangeFavourite = useCallback(
    (isFavourited: boolean) => {
      if (isFavourited) {
        unFavouriteDeck.mutate(id)
      } else {
        favouriteDeck.mutate(id)
      }
    },
    [id, unFavouriteDeck, favouriteDeck]
  )

  const onSettingsClick = useCallback(() => {
    onClick()
    const { openDialog } = controlDialog(DECK_VIEWER_SETTINGS_DIALOG_ID)
    openDialog()
  }, [onClick])

  const isLockedText = useMemo(() => {
    return t('createDeck.lockedPrism')
  }, [t])

  const isLocked = deck?.deckType === DeckType.LOCKED_STARTER

  if (!deck) return null

  return (
    <div
      onMouseDown={() => {
        if (!isLocked) SoundClient.playSound('CursorMainClick')
      }}
      onMouseEnter={() => {
        if (!isLocked) SoundClient.playSound('CursorMainHover')
      }}
    >
      <Deck
        deckClass={deck.class}
        isSelected={!!deckId && deckId === deck.uuid}
        onFavouriteChange={onChangeFavourite}
        identifier={deck.uuid}
        deckString={deck.deckString}
        isFavourited={deck.isFavorite}
        name={name}
        artCardId={deckArt || firstCard}
        isNew={deck.isNew}
        gradeType={gradeType}
        onHover={deck.isNew ? onHover : undefined}
        onClick={onClick}
        numCardsInDeck={!!ownedCards ? ownedCards.length : undefined}
        numCardsRequiredInDeck={DECK_CARDS_REQUIRED}
        isLockedText={isLockedText}
        isStarterDeck={isStarterDeck}
        NewBadge={deck.isNew ? ItemsDeckNewBadge : undefined}
        onSettingsClick={
          deck.deckType === DeckType.LOCKED_STARTER ? undefined : onSettingsClick
        }
        isLocked={isLocked}
      />
    </div>
  )
})

ItemsDeck.displayName = 'ItemsDeck'

export const ItemsDeckWrapper = memo(({ id }: ItemsDeckProps) => {
  if (id === BUY_DECKS_BUTTON_ID) {
    return <ItemsDeckButton type="buy" />
  }

  if (id === CREATE_DECK_BUTTON_ID) {
    return <ItemsDeckButton type="create" />
  }

  return <ItemsDeck id={id} />
})

ItemsDeckWrapper.displayName = 'ItemsDeckWrapper'
