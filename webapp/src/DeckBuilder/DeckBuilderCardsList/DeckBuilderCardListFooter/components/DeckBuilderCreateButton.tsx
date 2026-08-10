import { DECK_CARDS_REQUIRED } from '@opensky/shared/deckConsts'
import { memo, useCallback } from 'react'
import { useDispatch } from 'react-redux'
import { push } from 'redux-first-history'

import {
  deckBuilderDeckClassSelector,
  deckBuilderDeckStringSelector
} from '~/DeckBuilder/shared/selectors'
import { DeckClass } from '~/lib/proto'
import { Button } from '~/shared/components/Button'
import { makeItemsDecksRoute } from '~/shared/helpers/routes/items-decks'
import { useDeckOwnedCards } from '~/shared/hooks/decks/useDeckOwnedCards'
import { useDecodedDeckString } from '~/shared/hooks/decks/useDecodedDeckString'
import { useSaveDeckButtonInfo } from '~/shared/hooks/decks/useSaveDeckButtonInfo'
import { useDialog } from '~/shared/hooks/useDialog/useDialog'
import { useCreateDeck } from '~/shared/mutations/decks/useCreateDeck'
import { useSelector } from '~/shared/redux'
import { deckBuilderState } from '~/shared/state/deck-builder/deck-builder-state'
import { FullWidthButtonStyle } from '~/shared/style/FullWidthButtonStyle.css'

import { ConfirmLockedCardsDialog } from '../shared/components/ConfirmLockedCardsDialog'
import { CONFIRM_LOCKED_CARDS_DIALOG_ID } from '../shared/constants'

const EditIcon = { icon: 'save-deck' } as const
const SpinnerIcon = { icon: 'spinner' } as const

export const DeckBuilderCreateButton = memo(() => {
  const deckString = useSelector(deckBuilderDeckStringSelector)
  const deckClass = useSelector(deckBuilderDeckClassSelector)
  const { cardIds } = useDecodedDeckString(deckString)
  const dispatch = useDispatch()

  const { Dialog, openDialog } = useDialog({
    Element: ConfirmLockedCardsDialog,
    id: CONFIRM_LOCKED_CARDS_DIALOG_ID
  })

  const ownedCards = useDeckOwnedCards(cardIds)

  const { buttonText, isDisabled } = useSaveDeckButtonInfo(deckString, true)

  const createDeckMutation = useCreateDeck()

  const createDeck = useCallback(async () => {
    if (!!deckClass && !!deckString) {
      if (!ownedCards || ownedCards.length !== DECK_CARDS_REQUIRED) {
        openDialog()
      } else {
        await createDeckMutation.mutateAsync({
          deckClass: deckClass as DeckClass,
          deckString,
          name: deckBuilderState.newName || 'My Deck',
          art: deckBuilderState.lastClickedCardId
        })
        dispatch(push(makeItemsDecksRoute()))
      }
    }
  }, [createDeckMutation, deckClass, deckString, dispatch, openDialog, ownedCards])

  return (
    <>
      <Button
        disabled={
          !cardIds ||
          !cardIds.length ||
          createDeckMutation.status === 'loading' ||
          !!isDisabled
        }
        onClick={createDeck}
        frameType="default"
        colorType="blue"
        buttonId="create-deck"
        text={buttonText}
        leftAdornment={
          createDeckMutation.status === 'loading' ? SpinnerIcon : EditIcon
        }
        className={FullWidthButtonStyle}
        buttonClassName={FullWidthButtonStyle}
      />
      {Dialog}
    </>
  )
})

DeckBuilderCreateButton.displayName = 'DeckBuilderCreateButton'
