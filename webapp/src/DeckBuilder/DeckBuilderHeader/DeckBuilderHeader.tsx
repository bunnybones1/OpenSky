import clsx from 'clsx'
import { memo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { push } from 'redux-first-history'
import { useSnapshot } from 'valtio'

import { Button } from '~/shared/components/Button'
import { ConfirmDeleteDeckDialog } from '~/shared/components/ConfirmDeleteDeckDialog'
import { DeckSettingsDialog } from '~/shared/components/DeckSettingsDialog/DeckSettingsDialog'
import { FancyBackButton } from '~/shared/components/FancyBackButton/FancyBackButton'
import { GameType } from '~/shared/constants/ranks'
import {
  CONFIRM_DELETE_DECK_DIALOG_ID,
  DECK_SETTINGS_DIALOG_ID
} from '~/shared/constants/ui'
import { makePostDeleteDeckBuilderRoute } from '~/shared/helpers/routes/deck-builder'
import { makeItemsDecksRoute } from '~/shared/helpers/routes/items-decks'
import { useResponsiveQuery } from '~/shared/hooks/ui/useResponsiveQuery'
import { controlDialog } from '~/shared/hooks/useDialog/control-dialog'
import { useDialog } from '~/shared/hooks/useDialog/useDialog'
import { useIsInQueue } from '~/shared/hooks/useIsInQueue'
import { useUserDeck } from '~/shared/queries/decks/useUserDecks'
import { useStoredMatchInfo } from '~/shared/queries/play/useStoredMatchInfo'
import { useDispatch, useSelector } from '~/shared/redux'
import { deckBuilderState } from '~/shared/state/deck-builder/deck-builder-state'
import { playState } from '~/shared/state/play-state'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import {
  deckBuilderDeckStringSelector,
  deckBuilderUUIDSelector
} from '../shared/selectors'
import { DeckBuilderSettingsSaveButton } from './components/DeckBuilderSettingsSaveButton'
import { HeaderCostGraph } from './components/HeaderCostGraph'
import { HeaderDeckArt } from './components/HeaderDeckArt'
import { HeaderDeckString } from './components/HeaderDeckString'
import { HeaderHeroIcon } from './components/HeaderHeroIcon'
import { HeaderIcon } from './components/HeaderIcon'
import { HeaderName } from './components/HeaderName'
import {
  DeckBuilderHeaderBackButton,
  DeckbuilderHeaderStyle,
  ShowStatsButton
} from './DeckBuilderHeader.css'

const SETTINGS_ICON = { icon: 'gear' } as const
const STATS_ICON = { icon: 'bar-graph' } as const

interface DeckbuilderHeaderProps {
  isStatsOpen: boolean
  toggleStats: () => void
}

export const DeckBuilderHeader = memo(
  ({ isStatsOpen, toggleStats }: DeckbuilderHeaderProps) => {
    const uuid = useSelector(deckBuilderUUIDSelector)
    const dispatch = useDispatch()
    const isTabletWide = useResponsiveQuery('tabletWide')
    const { data: deck } = useUserDeck(uuid)
    const { t } = useTranslation()
    const deckString = useSelector(deckBuilderDeckStringSelector)
    const { selectedDeck, selectedConquestDeck } = useSnapshot(playState)
    const { isInQueue } = useIsInQueue()
    const { data: matchInfo } = useStoredMatchInfo()

    const onConfirmDeleteDeck = useCallback(() => {
      dispatch(
        push(makePostDeleteDeckBuilderRoute(deckBuilderState.previousLocationPath))
      )
    }, [dispatch])

    const {
      Dialog: _ConfirmDeleteDeckDialog,
      openDialog: openConfirmDeleteDeckDialog
    } = useDialog({
      Element: ConfirmDeleteDeckDialog,
      id: CONFIRM_DELETE_DECK_DIALOG_ID,
      uuid,
      onMutate: onConfirmDeleteDeck
    })

    const onDeleteClick = useCallback(() => {
      const { closeDialog } = controlDialog(DECK_SETTINGS_DIALOG_ID)
      closeDialog()
      openConfirmDeleteDeckDialog()
    }, [openConfirmDeleteDeckDialog])

    const isDeleteDisabledBecauseOfQueue =
      !!isInQueue &&
      matchInfo?.gameType === GameType.CONSTRUCTED &&
      !!uuid &&
      ((!!selectedDeck && selectedDeck === uuid) ||
        (!!selectedConquestDeck && selectedConquestDeck === uuid))

    const { Dialog: _DeckSettingsDialog, openDialog: openDeckSettingsDialog } =
      useDialog({
        Element: DeckSettingsDialog,
        id: DECK_SETTINGS_DIALOG_ID,
        originalName: deck?.name || t('play.myDeck'),
        deckString,
        SaveButton: DeckBuilderSettingsSaveButton,
        onDelete:
          !!uuid && !isDeleteDisabledBecauseOfQueue ? onDeleteClick : undefined
      })

    const goBack = useCallback(() => {
      // This will unfortunately not work with the browsers default scroll restoration behaviour.
      // I think this is a tradeoff we have to accept. Keeping scroll restoration in means we either have to:

      // 1. Store the previous scroll value, and scroll to it when we return to the previous route.
      // This would mean every route that could possibly push to this one needs to be able to handle
      // this custom scroll restoration behaviour, and we need to properly store and clear this value when
      // navigating between the pages so that it always matches what the user expects. Very prone to jankyness.
      // 2. Use the "goBack()" function instead of pushing. This would keep the default browser behavviour, but would
      // also take the user back through every change they made to the deck and its filters. Not ideal.

      if (!!deckBuilderState.previousLocationPath) {
        dispatch(push(deckBuilderState.previousLocationPath))
      } else {
        dispatch(push(makeItemsDecksRoute()))
      }
    }, [dispatch])

    const _openDeckSettingsDialog = useCallback(
      () => openDeckSettingsDialog(),
      [openDeckSettingsDialog]
    )

    return (
      <>
        <div
          className={clsx(
            DeckbuilderHeaderStyle,
            Sprinkles({
              position: 'sticky',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-start',
              paddingRight: '16px',
              width: 'full'
            }),
            { hasId: !!uuid }
          )}
        >
          <div
            className={clsx(
              Sprinkles({
                position: 'absolute',
                top: 0,
                left: 0
              }),
              DeckBuilderHeaderBackButton
            )}
          >
            <FancyBackButton onClick={goBack} />
          </div>
          <div
            className={Sprinkles({
              height: 'full',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-start'
            })}
          >
            <HeaderIcon />
            <HeaderName uuid={uuid} />
            <HeaderDeckString />
          </div>

          <div
            className={Sprinkles({
              height: 'full',
              display: 'flex',
              alignItems: 'center',
              flex: 1,
              justifyContent: 'flex-end',
              overflow: 'hidden'
            })}
          >
            <HeaderDeckArt uuid={uuid} />
            <HeaderHeroIcon />
            <HeaderCostGraph />
            <div className={Sprinkles({ marginLeft: '12px' })}>
              <Button
                frameType="default"
                colorType="default"
                onClick={_openDeckSettingsDialog}
                text={isTabletWide ? t('generic.Settings') : undefined}
                leftAdornment={SETTINGS_ICON}
              />
            </div>
            <div className={Sprinkles({ marginLeft: '12px' })}>
              <Button
                frameType="default"
                colorType="default"
                isToggled={isStatsOpen}
                onClick={toggleStats}
                text={
                  isTabletWide
                    ? t(isStatsOpen ? 'decks.HideStats' : 'decks.ShowStats')
                    : undefined
                }
                leftAdornment={STATS_ICON}
                className={ShowStatsButton}
                buttonClassName={ShowStatsButton}
              />
            </div>
          </div>
        </div>
        {_DeckSettingsDialog}
        {_ConfirmDeleteDeckDialog}
      </>
    )
  }
)

DeckBuilderHeader.displayName = 'DeckBuilderHeader'
