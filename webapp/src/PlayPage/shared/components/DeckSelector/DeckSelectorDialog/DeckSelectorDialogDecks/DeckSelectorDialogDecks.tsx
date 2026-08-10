import clsx from 'clsx'
import { memo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { push } from 'redux-first-history'
import { useSnapshot } from 'valtio'

import { Button } from '~/shared/components/Button'
import { makeItemsDecksRoute } from '~/shared/helpers/routes/items-decks'
import { controlDialog } from '~/shared/hooks/useDialog/control-dialog'
import { useDispatch } from '~/shared/redux/index'
import { playState, updatePlayState } from '~/shared/state/play-state'
import { FullWidthButtonStyle } from '~/shared/style/FullWidthButtonStyle.css'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { DeckSelectorDeck } from '../../shared/components/DeckSelectorDeck/DeckSelectorDeck'
import { DECK_SELECTOR_DIALOG_ID } from '../../shared/constants'
import { DeckSelectorDialogDecksStyle } from './DeckSelectorDialogDecks.css'
import { useSelectableDecks } from './hooks/useSelectableDecks'

interface DeckSelectorDialogDecksProps {
  isConquest?: boolean
}

export const DeckSelectorDialogDecks = memo(
  ({ isConquest }: DeckSelectorDialogDecksProps) => {
    const { selectableDecks, lockedDecks } = useSelectableDecks(isConquest)
    const { t } = useTranslation()
    const dispatch = useDispatch()
    const { selectedDeck, selectedConquestDeck } = useSnapshot(playState)

    const deckToUse = !!isConquest ? selectedConquestDeck : selectedDeck

    const onDeckClick = useCallback(
      (uuid: string) => {
        if (isConquest) {
          updatePlayState('selectedConquestDeck', uuid)
        } else {
          updatePlayState('selectedDeck', uuid)
        }
        const { closeDialog } = controlDialog(DECK_SELECTOR_DIALOG_ID)
        closeDialog()
      },
      [isConquest]
    )

    const onCollectionClick = useCallback(() => {
      dispatch(push(makeItemsDecksRoute()))
      const { closeDialog } = controlDialog(DECK_SELECTOR_DIALOG_ID)
      closeDialog()
    }, [dispatch])

    return (
      <div
        className={clsx(
          Sprinkles({
            width: 'full',
            paddingBottom: '16px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            justifyContent: 'flex-start'
          }),
          DeckSelectorDialogDecksStyle
        )}
      >
        {!!selectableDecks &&
          selectableDecks.map((deck) => (
            <DeckSelectorDeck
              onClick={onDeckClick}
              key={deck.uuid}
              uuid={deck.uuid}
              isActive={!!deckToUse && deckToUse === deck.uuid}
            />
          ))}
        {!!lockedDecks &&
          lockedDecks.map((deck) => (
            <DeckSelectorDeck
              onClick={onDeckClick}
              key={deck.uuid}
              uuid={deck.uuid}
              isLocked
              isActive={false}
            />
          ))}
        <Button
          frameType="default"
          onClick={onCollectionClick}
          height="52px"
          buttonClassName={FullWidthButtonStyle}
          className={FullWidthButtonStyle}
          colorType="secondary"
          leftAdornment={{ icon: 'external' }}
          text={t('play.goToDeckCollection')}
        />
      </div>
    )
  }
)

DeckSelectorDialogDecks.displayName = 'DeckSelectorDialogDecks'
