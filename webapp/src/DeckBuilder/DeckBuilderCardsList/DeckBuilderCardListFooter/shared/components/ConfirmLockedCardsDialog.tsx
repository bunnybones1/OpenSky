import { memo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { push } from 'redux-first-history'

import {
  deckBuilderDeckClassSelector,
  deckBuilderDeckStringSelector,
  deckBuilderUUIDSelector
} from '~/DeckBuilder/shared/selectors'
import { DeckClass } from '~/lib/proto'
import { PromptDialog } from '~/shared/components/PromptDialog/PromptDialog'
import { Text } from '~/shared/components/Text'
import { makeItemsDecksRoute } from '~/shared/helpers/routes/items-decks'
import { controlDialog } from '~/shared/hooks/useDialog/control-dialog'
import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'
import { useCreateDeck } from '~/shared/mutations/decks/useCreateDeck'
import { useSaveDeck } from '~/shared/mutations/decks/useSaveDeck'
import { useUserDeck } from '~/shared/queries/decks/useUserDecks'
import { useDispatch, useSelector } from '~/shared/redux'
import { deckBuilderState } from '~/shared/state/deck-builder/deck-builder-state'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { CONFIRM_LOCKED_CARDS_DIALOG_ID } from '../constants'

const PromptText = memo(() => {
  const { t } = useTranslation()

  return (
    <div
      className={Sprinkles({
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'flex-start',
        flexWrap: 'wrap'
      })}
    >
      <Text color="purple9" fontWeight="400" fontSize="16px" textAlign="left">
        {t('createDeck.lockedCardsWarning')}
      </Text>
      <Text color="white" fontSize="16px" fontWeight="700" marginTop="8px">
        {t('createDeck.warningEnd')}
      </Text>
    </div>
  )
})

PromptText.displayName = 'PromptText'

const { closeDialog } = controlDialog(CONFIRM_LOCKED_CARDS_DIALOG_ID)

export const ConfirmLockedCardsDialog = memo(() => {
  const { t } = useTranslation()
  const { getAssetUrl } = useGetAssetContext()

  const uuid = useSelector(deckBuilderUUIDSelector)
  const deckString = useSelector(deckBuilderDeckStringSelector)
  const deckClass = useSelector(deckBuilderDeckClassSelector)
  const createDeck = useCreateDeck()
  const saveDeck = useSaveDeck()
  const dispatch = useDispatch()

  const { data: deck } = useUserDeck(uuid)

  const onDismiss = useCallback(() => {
    closeDialog()
  }, [])

  const onConfirm = useCallback(async () => {
    if (!deckString || !deckClass) return
    if (!!uuid) {
      await saveDeck.mutateAsync({
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
      closeDialog()
    } else {
      await createDeck.mutateAsync({
        deckClass: deckClass as DeckClass,
        deckString,
        name: deckBuilderState.newName || t('play.myDeck'),
        art: deckBuilderState.lastClickedCardId
      })
      dispatch(push(makeItemsDecksRoute()))
      closeDialog()
    }
  }, [createDeck, deck?.name, deckClass, deckString, dispatch, saveDeck, t, uuid])

  if (!getAssetUrl) return null

  return (
    <PromptDialog
      imageUrl={getAssetUrl('webapp/backgrounds/bg-locked-cards-modal.webp')}
      onDismiss={onDismiss}
      onConfirm={onConfirm}
      confirmColor="blue"
      dismissColor="default"
      prompText={<PromptText />}
    />
  )
})

ConfirmLockedCardsDialog.displayName = 'ConfirmLockedCardsDialog'
