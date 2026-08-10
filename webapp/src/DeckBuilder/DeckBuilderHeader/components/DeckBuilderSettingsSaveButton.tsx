/* eslint-disable valtio/state-snapshot-rule */
import { memo, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
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
import { DECK_SETTINGS_DIALOG_ID } from '~/shared/constants/ui'
import { makeDeckBuilderSearchRoute } from '~/shared/helpers/routes/deck-builder'
import { useSaveDeckButtonInfo } from '~/shared/hooks/decks/useSaveDeckButtonInfo'
import { controlDialog } from '~/shared/hooks/useDialog/control-dialog'
import { useIsInQueue } from '~/shared/hooks/useIsInQueue'
import { useCreateDeck } from '~/shared/mutations/decks/useCreateDeck'
import { useSaveDeck } from '~/shared/mutations/decks/useSaveDeck'
import { useUserDeck } from '~/shared/queries/decks/useUserDecks'
import { useStoredMatchInfo } from '~/shared/queries/play/useStoredMatchInfo'
import { useDispatch, useReduxStore, useSelector } from '~/shared/redux'
import { deckBuilderState } from '~/shared/state/deck-builder/deck-builder-state'
import { playState } from '~/shared/state/play-state'

const EditIcon = { icon: 'save-deck' } as const
const SpinnerIcon = { icon: 'spinner' } as const

interface SaveButtonProps {
  newName: string
}

export const DeckBuilderSettingsSaveButton = memo(({ newName }: SaveButtonProps) => {
  const { t } = useTranslation()
  const store = useReduxStore()
  const uuid = useSelector(deckBuilderUUIDSelector)
  const createDeck = useCreateDeck()
  const saveDeck = useSaveDeck()
  const { data: deck } = useUserDeck(uuid)
  const { originalDeckString } = useSnapshot(deckBuilderState)
  const deckString = useSelector(deckBuilderDeckStringSelector)
  const dispatch = useDispatch()
  const { isInQueue } = useIsInQueue()
  const { data: matchInfo } = useStoredMatchInfo()
  const { selectedDeck } = useSnapshot(playState)

  const isDisabledBecauseOfQueue =
    !!isInQueue &&
    matchInfo?.gameType === GameType.CONSTRUCTED &&
    !!selectedDeck &&
    !!uuid &&
    selectedDeck === uuid

  const { isDisabled: isDisabledBecauseOfCards, buttonText } = useSaveDeckButtonInfo(
    deckString,
    !uuid,
    isDisabledBecauseOfQueue
  )

  const onSave = useCallback(async () => {
    const deckClass = deckBuilderDeckClassSelector(store.getState())

    if (deckString && deckClass) {
      if (!uuid) {
        const newDeck = await createDeck.mutateAsync({
          deckClass: deckClass as DeckClass,
          deckString,
          name: !newName ? t('play.myDeck') : newName,
          art: deckBuilderState.lastClickedCardId
        })
        dispatch(push(makeDeckBuilderSearchRoute(undefined, newDeck.res.uuid)))
      } else {
        await saveDeck.mutateAsync({
          deckString,
          uuid,
          name: !newName ? t('play.myDeck') : newName,
          deckClass: deckClass as DeckClass,
          art: deckBuilderState.lastClickedCardId
        })
      }

      if (!!deckString) {
        deckBuilderState.originalDeckString = deckString
      }
      const { closeDialog } = controlDialog(DECK_SETTINGS_DIALOG_ID)
      closeDialog()
    }
  }, [store, deckString, uuid, createDeck, newName, t, dispatch, saveDeck])

  const isDisabled = useMemo(() => {
    if (isDisabledBecauseOfQueue) return true
    if (!!isDisabledBecauseOfCards) return true
    if (uuid) {
      return newName === deck?.name && deckString === originalDeckString
    } else {
      return false
    }
  }, [
    deck?.name,
    deckString,
    isDisabledBecauseOfCards,
    isDisabledBecauseOfQueue,
    newName,
    originalDeckString,
    uuid
  ])

  return (
    <Button
      frameType="default"
      colorType="blue"
      disabled={isDisabled}
      text={buttonText}
      onClick={onSave}
      leftAdornment={
        createDeck.status === 'loading' || saveDeck.status === 'loading'
          ? SpinnerIcon
          : EditIcon
      }
    />
  )
})

DeckBuilderSettingsSaveButton.displayName = 'DeckBuilderSettingsSaveButton'
