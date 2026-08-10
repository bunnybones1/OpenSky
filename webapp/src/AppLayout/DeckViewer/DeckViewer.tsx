import clsx from 'clsx'
import { AnimatePresence, motion } from 'framer-motion'
import { memo, useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { push } from 'redux-first-history'
import { useSnapshot } from 'valtio'

import { ConfirmDeleteDeckDialog } from '~/shared/components/ConfirmDeleteDeckDialog'
import { DeckCardsList } from '~/shared/components/DeckCardsList/DeckCardsList'
import { DeckSettingsDialog } from '~/shared/components/DeckSettingsDialog/DeckSettingsDialog'
import { DeckStatsList } from '~/shared/components/DeckStatsList/DeckStatsList'
import { Portal } from '~/shared/components/Portal'
import { GameType } from '~/shared/constants/ranks'
import {
  CONFIRM_DELETE_DECKVIEWER_DECK_DIALOG_ID,
  DECK_VIEWER_ID,
  DECK_VIEWER_SETTINGS_DIALOG_ID
} from '~/shared/constants/ui'
import { makeCloseDeckViewerRoute } from '~/shared/helpers/routes/general'
import { controlDialog } from '~/shared/hooks/useDialog/control-dialog'
import { useDialog } from '~/shared/hooks/useDialog/useDialog'
import { useIsInQueue } from '~/shared/hooks/useIsInQueue'
import { useUserDeck } from '~/shared/queries/decks/useUserDecks'
import { useStoredMatchInfo } from '~/shared/queries/play/useStoredMatchInfo'
import { useBanners } from '~/shared/queries/useBanners'
import { useDispatch, useSelector } from '~/shared/redux'
import { playState } from '~/shared/state/play-state'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { DeckViewerCardRow } from './components/DeckViewerCardRow'
import { DeckViewerControls } from './components/DeckViewerControls'
import { DeckViewerHeader } from './components/DeckViewerHeader'
import { DeckViewerSettingsSaveButton } from './components/DeckViewerSettingsSaveButton'
import { DeckViewerStyle } from './DeckViewer.css'
import { DeckViewerFooter } from './DeckViewerFooter/DeckViewerFooter'
import {
  deckViewerDeckStringSelector,
  deckViewerIdSelector
} from './shared/selectors'

export const DeckViewer = memo(() => {
  const deckToView = useSelector(deckViewerDeckStringSelector)
  const uuid = useSelector(deckViewerIdSelector)
  const { data: banners } = useBanners()
  const dispatch = useDispatch()
  const [isStatsListOpen, setIsStatsListOpen] = useState(false)
  const { isInQueue } = useIsInQueue()
  const { data: matchInfo } = useStoredMatchInfo()
  const { selectedDeck, selectedConquestDeck } = useSnapshot(playState)
  const { t } = useTranslation()
  const { data: deck } = useUserDeck(uuid)

  const toggleStatsList = useCallback(() => {
    setIsStatsListOpen((isOpen) => !isOpen)
  }, [])

  const onConfirmDeleteDeck = useCallback(() => {
    dispatch(push(makeCloseDeckViewerRoute()))
  }, [dispatch])

  const {
    Dialog: _ConfirmDeleteDeckDialog,
    openDialog: openConfirmDeleteDeckDialog
  } = useDialog({
    Element: ConfirmDeleteDeckDialog,
    id: CONFIRM_DELETE_DECKVIEWER_DECK_DIALOG_ID,
    uuid,
    onMutate: onConfirmDeleteDeck
  })

  const onDeleteClick = useCallback(() => {
    const { closeDialog } = controlDialog(DECK_VIEWER_SETTINGS_DIALOG_ID)
    closeDialog()
    openConfirmDeleteDeckDialog()
  }, [openConfirmDeleteDeckDialog])

  const isDeleteDisabledBecauseOfQueue =
    !!isInQueue &&
    matchInfo?.gameType === GameType.CONSTRUCTED &&
    !!uuid &&
    ((!!selectedDeck && selectedDeck === uuid) ||
      (!!selectedConquestDeck && selectedConquestDeck === uuid))

  const { Dialog: _DeckSettingsDialog } = useDialog({
    Element: DeckSettingsDialog,
    id: DECK_VIEWER_SETTINGS_DIALOG_ID,
    originalName: deck?.name || t('play.myDeck'),
    deckString: deckToView,
    SaveButton: DeckViewerSettingsSaveButton,
    onDelete: !!uuid && !isDeleteDisabledBecauseOfQueue ? onDeleteClick : undefined
  })

  return (
    <>
      <Portal>
        <AnimatePresence>
          {!!deckToView && (
            <motion.div
              animate={{ opacity: 1, x: 0 }}
              initial={{ opacity: 0, x: 300 }}
              exit={{ opacity: 0, x: 300 }}
              id={DECK_VIEWER_ID}
              className={clsx(
                DeckViewerStyle,
                Sprinkles({
                  backgroundColor: 'purple3',
                  position: 'fixed',
                  right: 0,
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'flex-start',
                  flexDirection: 'column'
                }),
                {
                  hasBannerMargin: !!banners?.length
                }
              )}
              transition={{ duration: 0.2 }}
            >
              <DeckViewerHeader deckString={deckToView} />
              <div
                className={Sprinkles({
                  width: 'full',
                  flex: 1,
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'flex-start',
                  overflow: 'hidden'
                })}
              >
                <DeckCardsList
                  deckString={deckToView}
                  CardRowComponent={DeckViewerCardRow}
                  FooterComponent={DeckViewerFooter}
                />
              </div>

              {!!isStatsListOpen && <DeckStatsList deckString={deckToView} />}
              <DeckViewerControls
                isStatsListOpen={isStatsListOpen}
                toggleStatsList={toggleStatsList}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </Portal>
      {_ConfirmDeleteDeckDialog}
      {_DeckSettingsDialog}
    </>
  )
})

DeckViewer.displayName = 'DeckViewer'
