import { GameMode } from '@opensky/proto'
import clsx from 'clsx'
import { memo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useSnapshot } from 'valtio'

import { DeckSelector } from '~/PlayPage/shared/components/DeckSelector/DeckSelector'
import { IOS_APP_UPDATE_DIALOG_ID } from '~/PlayPage/shared/constants'
import { useAssetWarningDialog } from '~/PlayPage/shared/hooks/useAssetWarningDialog/useAssetWarningDialog'
import { useJoinQueue } from '~/PlayPage/shared/hooks/useJoinQueue/useJoinQueue'
import {
  SharedPlayButtonStyle,
  SharedPlayPageBottomStyle
} from '~/PlayPage/shared/style/SharedPlayPageStyle.css'
import { Button } from '~/shared/components/Button'
import { isIOSUpdateNeeded } from '~/shared/constants/play'
import { GameType } from '~/shared/constants/ranks'
import { useResponsiveQuery } from '~/shared/hooks/ui/useResponsiveQuery'
import { useDialog } from '~/shared/hooks/useDialog/useDialog'
import { useIsInQueue } from '~/shared/hooks/useIsInQueue'
import { useGameAssetCachePaths } from '~/shared/queries/useGameAssetCachePaths'
import { playState } from '~/shared/state/play-state'
import { FullWidthButtonStyle } from '~/shared/style/FullWidthButtonStyle.css'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { IOSAppUpdateDialog as IOSAppUpdateDialogComponent } from '../../shared/components/IOSAppUpdateDialog'

const SpinnerIcon = { icon: 'spinner' } as const

export const PracticeVsBotPage = memo(() => {
  const isTabletWide = useResponsiveQuery('tabletWide')
  const { isInQueue } = useIsInQueue()
  const { selectedDeck } = useSnapshot(playState)
  const { t } = useTranslation()

  const { isLoading: isValidatingCache } = useGameAssetCachePaths()

  const { Dialog, showAssetWarning } = useAssetWarningDialog({
    mode: GameMode.PRACTICE_BOT
  })

  const { joinQueue } = useJoinQueue()

  const { Dialog: IOSAppUpdateDialog, openDialog: openIOSAppUpdateDialog } =
    useDialog({
      Element: IOSAppUpdateDialogComponent,
      id: IOS_APP_UPDATE_DIALOG_ID,
      isClickoffDisabled: true,
      isCloseButtonDisabled: true
    })

  const onPlayClick = useCallback(() => {
    if (!!isIOSUpdateNeeded) {
      openIOSAppUpdateDialog()
      return
    }

    if (!showAssetWarning()) {
      joinQueue({ mode: GameMode.PRACTICE_BOT })
    }
  }, [joinQueue, openIOSAppUpdateDialog, showAssetWarning])

  return (
    <>
      {IOSAppUpdateDialog}
      {Dialog}
      <div className={Sprinkles({ marginTop: '16px' })}>
        <DeckSelector selectedGameType={GameType.CONSTRUCTED} isLocked={isInQueue} />
      </div>
      <div
        className={clsx(
          Sprinkles({
            display: 'grid',
            width: 'full',
            position: 'absolute',
            left: 0,
            paddingX: { base: '12px', tablet: '20px' }
          }),
          SharedPlayPageBottomStyle
        )}
      >
        {/* This div is just here to fill the space in the grid */}
        <div />
        <Button
          colorType="orange"
          disabled={!selectedDeck || isInQueue}
          frameType="default"
          height={isTabletWide ? '76px' : '52px'}
          className={clsx(SharedPlayButtonStyle, FullWidthButtonStyle)}
          buttonClassName={clsx(SharedPlayButtonStyle, FullWidthButtonStyle)}
          onClick={onPlayClick}
          leftAdornment={isValidatingCache ? SpinnerIcon : undefined}
          buttonId="playButton"
          clickSound="PlayStinger"
          text={
            isValidatingCache
              ? t('play.loading')
              : isInQueue
              ? t('dashboard.inQueue')
              : t('play.play')
          }
        />
      </div>
    </>
  )
})

PracticeVsBotPage.displayName = 'PracticeVsBotPage'
