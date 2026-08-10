import { GameMode } from '@opensky/proto'
import clsx from 'clsx'
import { memo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useSnapshot } from 'valtio'

import { IOSAppUpdateDialog } from '~/PlayPage/shared/components/IOSAppUpdateDialog'
import { IOS_APP_UPDATE_DIALOG_ID } from '~/PlayPage/shared/constants'
import { useAssetWarningDialog } from '~/PlayPage/shared/hooks/useAssetWarningDialog/useAssetWarningDialog'
import { useJoinQueue } from '~/PlayPage/shared/hooks/useJoinQueue/useJoinQueue'
import { SharedPlayButtonStyle } from '~/PlayPage/shared/style/SharedPlayPageStyle.css'
import { Button } from '~/shared/components/Button'
import { isIOSUpdateNeeded } from '~/shared/constants/play'
import { useResponsiveQuery } from '~/shared/hooks/ui/useResponsiveQuery'
import { useDialog } from '~/shared/hooks/useDialog/useDialog'
import { useGameAssetCachePaths } from '~/shared/queries/useGameAssetCachePaths'
import { playState } from '~/shared/state/play-state'
import { FullWidthButtonStyle } from '~/shared/style/FullWidthButtonStyle.css'

const SpinnerIcon = { icon: 'spinner' } as const

interface ActiveConquestButtonProps {
  isInQueue: boolean
}

export const ActiveConquestButton = memo(
  ({ isInQueue }: ActiveConquestButtonProps) => {
    const { selectedConquestDeck } = useSnapshot(playState)
    const isTabletWide = useResponsiveQuery('tabletWide')
    const { t } = useTranslation()

    const { Dialog, showAssetWarning } = useAssetWarningDialog({
      mode: GameMode.CONQUEST_CONSTRUCTED
    })

    const { isLoading: isValidatingCache } = useGameAssetCachePaths()

    const { Dialog: IOSUpdateDialog, openDialog: openIOSAppUpdateDialog } = useDialog(
      {
        Element: IOSAppUpdateDialog,
        id: IOS_APP_UPDATE_DIALOG_ID,
        isClickoffDisabled: true,
        isCloseButtonDisabled: true
      }
    )

    const { joinQueue } = useJoinQueue()

    const onClick = useCallback(() => {
      if (!!isIOSUpdateNeeded) {
        openIOSAppUpdateDialog()
        return
      }

      if (!showAssetWarning()) {
        joinQueue({ mode: GameMode.CONQUEST_CONSTRUCTED })
      }
    }, [joinQueue, openIOSAppUpdateDialog, showAssetWarning])

    return (
      <>
        {IOSUpdateDialog}
        {Dialog}
        <Button
          disabled={isValidatingCache || isInQueue || !selectedConquestDeck}
          colorType="orange"
          clickSound="PlayStinger"
          buttonId="playButton"
          frameType="default"
          height={isTabletWide ? '76px' : '52px'}
          className={clsx(SharedPlayButtonStyle, FullWidthButtonStyle)}
          buttonClassName={clsx(SharedPlayButtonStyle, FullWidthButtonStyle)}
          onClick={onClick}
          leftAdornment={isValidatingCache ? SpinnerIcon : undefined}
          text={
            isValidatingCache
              ? t('play.loading')
              : isInQueue
              ? t('dashboard.inQueue')
              : t('play.play')
          }
        />
      </>
    )
  }
)

ActiveConquestButton.displayName = 'ActiveConquestButton'
