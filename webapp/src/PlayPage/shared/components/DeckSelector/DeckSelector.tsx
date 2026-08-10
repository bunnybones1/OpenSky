import { memo, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useSnapshot } from 'valtio'

import { Button } from '~/shared/components/Button'
import { GameType } from '~/shared/constants/ranks'
import { useDialog } from '~/shared/hooks/useDialog/useDialog'
import { useUserDeck } from '~/shared/queries/decks/useUserDecks'
import { playState } from '~/shared/state/play-state'

import {
  DeckSelectorDialogClassName,
  DeckSelectorNoSelectionButton,
  DeckSelectorStyle
} from './DeckSelector.css'
import { DeckSelectorDialog } from './DeckSelectorDialog/DeckSelectorDialog'
import { DeckSelectorDeck } from './shared/components/DeckSelectorDeck/DeckSelectorDeck'
import { DeckSelectorHero } from './shared/components/DeckSelectorHero/DeckSelectorHero'
import { DECK_SELECTOR_DIALOG_ID } from './shared/constants'

interface DeckSelectorProps {
  selectedGameType: GameType
  isLocked?: boolean
  isConquest?: boolean
}

export const DeckSelector = memo(
  ({ selectedGameType, isLocked, isConquest }: DeckSelectorProps) => {
    const { selectedDeck, selectedHero, selectedConquestDeck } =
      useSnapshot(playState)
    const { t } = useTranslation()

    const dialogOptions = useMemo(() => {
      return {
        Element: DeckSelectorDialog,
        id: DECK_SELECTOR_DIALOG_ID,
        selectedGameType,
        isConquest,
        className: DeckSelectorDialogClassName,
        isCloseButtonDisabled: true,
        isBorderDisabled: true,
        isGlowDisabled: true,
        isSoundDisabled: true
      }
    }, [isConquest, selectedGameType])

    const { Dialog, openDialog } = useDialog(dialogOptions)

    const _openDialog = useCallback(() => {
      openDialog()
    }, [openDialog])

    const deckUUIDToUse = !!isConquest ? selectedConquestDeck : selectedDeck

    // We fetch the deck here to make sure the selected UUID is a valid deck.
    // This avoids the case where the user played with a deck and had it saved
    // as their last played deck, but then deleted the deck.
    // We set the UUID to undefined if in discovery mode to avoid fetching
    // for no reason.
    const { data: deckToUse } = useUserDeck(
      selectedGameType === GameType.CONSTRUCTED ? deckUUIDToUse : undefined
    )

    return (
      <>
        <div className={DeckSelectorStyle}>
          {selectedGameType === GameType.CONSTRUCTED && !!deckToUse ? (
            <DeckSelectorDeck
              isArrowVisible
              uuid={deckToUse.uuid}
              onClick={_openDialog}
              isLocked={isLocked}
              isActive={false}
            />
          ) : selectedGameType === GameType.DISCOVERY && !!selectedHero ? (
            <DeckSelectorHero
              deckClass={selectedHero}
              onClick={_openDialog}
              isArrowVisible
              isLocked={isLocked}
            />
          ) : (
            <Button
              height="52px"
              colorType="green"
              frameType="default"
              className={DeckSelectorNoSelectionButton}
              buttonId="choose-deck"
              buttonClassName={DeckSelectorNoSelectionButton}
              onClick={_openDialog}
              text={t(
                selectedGameType === GameType.CONSTRUCTED
                  ? 'play.selectDeck'
                  : 'createDeck.title'
              )}
            />
          )}
        </div>
        {Dialog}
      </>
    )
  }
)

DeckSelector.displayName = 'DeckSelector'
