import { DECK_CARDS_REQUIRED } from '@opensky/shared/deckConsts'
import { memo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useDispatch } from 'react-redux'
import { push } from 'redux-first-history'
import { useSnapshot } from 'valtio'

import {
  deckBuilderDeckClassSelector,
  deckBuilderDeckStringSelector,
  deckBuilderUUIDSelector
} from '~/DeckBuilder/shared/selectors'
import { DeckClass } from '~/lib/proto'
import { Button } from '~/shared/components/Button'
import { GameType } from '~/shared/constants/ranks'
import { makeItemsDecksRoute } from '~/shared/helpers/routes/items-decks'
import { useDeckOwnedCards } from '~/shared/hooks/decks/useDeckOwnedCards'
import { useDecodedDeckString } from '~/shared/hooks/decks/useDecodedDeckString'
import { useSaveDeckButtonInfo } from '~/shared/hooks/decks/useSaveDeckButtonInfo'
import { useDialog } from '~/shared/hooks/useDialog/useDialog'
import { useIsInQueue } from '~/shared/hooks/useIsInQueue'
import { useSaveDeck } from '~/shared/mutations/decks/useSaveDeck'
import { useUserDeck } from '~/shared/queries/decks/useUserDecks'
import { useStoredMatchInfo } from '~/shared/queries/play/useStoredMatchInfo'
import { useSelector } from '~/shared/redux'
import { deckBuilderState } from '~/shared/state/deck-builder/deck-builder-state'
import { playState } from '~/shared/state/play-state'
import { FullWidthButtonStyle } from '~/shared/style/FullWidthButtonStyle.css'

import { ConfirmLockedCardsDialog } from '../shared/components/ConfirmLockedCardsDialog'
import { CONFIRM_LOCKED_CARDS_DIALOG_ID } from '../shared/constants'

const EditIcon = { icon: 'save-deck' } as const
const SpinnerIcon = { icon: 'spinner' } as const

export const DeckBuilderSaveButton = memo(() => {
  const { t } = useTranslation()
  const saveDeckMutation = useSaveDeck()
  const uuid = useSelector(deckBuilderUUIDSelector)
  const deckString = useSelector(deckBuilderDeckStringSelector)
  const deckClass = useSelector(deckBuilderDeckClassSelector)
  const { selectedDeck, selectedConquestDeck } = useSnapshot(playState)
  const { isInQueue } = useIsInQueue()
  const { data: matchInfo } = useStoredMatchInfo()

  const { Dialog, openDialog } = useDialog({
    Element: ConfirmLockedCardsDialog,
    id: CONFIRM_LOCKED_CARDS_DIALOG_ID
  })

  const { data: deck } = useUserDeck(uuid)
  const dispatch = useDispatch()
  const { cardIds } = useDecodedDeckString(deckString)

  const ownedCards = useDeckOwnedCards(cardIds)

  const isDisabledBecauseOfQueue =
    !!isInQueue &&
    matchInfo?.gameType === GameType.CONSTRUCTED &&
    !!uuid &&
    ((!!selectedDeck && selectedDeck === uuid) ||
      (!!selectedConquestDeck && selectedConquestDeck === uuid))

  const { buttonText, isDisabled } = useSaveDeckButtonInfo(
    deckString,
    false,
    isDisabledBecauseOfQueue
  )

  const saveDeck = useCallback(async () => {
    if (!!uuid && !!deckString && !!deckClass) {
      if (!ownedCards || ownedCards.length !== DECK_CARDS_REQUIRED) {
        openDialog()
      } else {
        await saveDeckMutation.mutateAsync({
          name: deckBuilderState.newName || deck?.name || t('play.myDeck'),
          uuid,
          deckString,
          deckClass: deckClass as DeckClass,
          art: deckBuilderState.lastClickedCardId
        })
        if (!!deckBuilderState.previousLocationPath) {
          dispatch(push(deckBuilderState.previousLocationPath))
        } else {
          dispatch(push(makeItemsDecksRoute()))
        }
      }
    }
  }, [
    uuid,
    deckString,
    deckClass,
    ownedCards,
    openDialog,
    saveDeckMutation,
    deck?.name,
    t,
    dispatch
  ])

  return (
    <>
      <Button
        disabled={
          saveDeckMutation.status === 'loading' ||
          !cardIds ||
          !cardIds.length ||
          !!isDisabled
        }
        buttonId="save-deck"
        onClick={saveDeck}
        frameType="default"
        colorType="blue"
        text={buttonText}
        leftAdornment={saveDeckMutation.status === 'loading' ? SpinnerIcon : EditIcon}
        className={FullWidthButtonStyle}
        buttonClassName={FullWidthButtonStyle}
      />
      {Dialog}
    </>
  )
})

DeckBuilderSaveButton.displayName = 'DeckBuilderSaveButton'
