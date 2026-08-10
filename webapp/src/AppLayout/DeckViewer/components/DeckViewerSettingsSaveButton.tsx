import { memo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'

import { deckViewerIdSelector } from '~/AppLayout/DeckViewer/shared/selectors'
import { Button } from '~/shared/components/Button'
import { DECK_VIEWER_SETTINGS_DIALOG_ID } from '~/shared/constants/ui'
import { controlDialog } from '~/shared/hooks/useDialog/control-dialog'
import { useSaveDeck } from '~/shared/mutations/decks/useSaveDeck'
import { useUserDeck } from '~/shared/queries/decks/useUserDecks'
import { useSelector } from '~/shared/redux'

const EditIcon = { icon: 'save-deck' } as const
const SpinnerIcon = { icon: 'spinner' } as const

interface SaveButtonProps {
  newName: string
}

export const DeckViewerSettingsSaveButton = memo(({ newName }: SaveButtonProps) => {
  const uuid = useSelector(deckViewerIdSelector)
  const saveDeck = useSaveDeck()
  const { data: deck } = useUserDeck(uuid)
  const { t } = useTranslation()

  const onSave = useCallback(async () => {
    if (!!deck) {
      await saveDeck.mutateAsync({
        deckString: deck.deckString,
        uuid: deck.uuid,
        name: !newName ? deck.name : newName,
        deckClass: deck.class,
        art: deck.art
      })

      const { closeDialog } = controlDialog(DECK_VIEWER_SETTINGS_DIALOG_ID)
      closeDialog()
    }
  }, [deck, saveDeck, newName])

  return (
    <Button
      frameType="default"
      colorType="blue"
      disabled={newName === deck?.name || !deck || saveDeck.status === 'loading'}
      text={t('generic.Save')}
      onClick={onSave}
      leftAdornment={saveDeck.status === 'loading' ? SpinnerIcon : EditIcon}
    />
  )
})

DeckViewerSettingsSaveButton.displayName = 'DeckViewerSettingsSaveButton'
