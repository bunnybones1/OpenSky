/* eslint-disable valtio/state-snapshot-rule */
import { PlayerRank } from '@opensky/proto'
import { GameMode } from '@opensky/proto'
import clsx from 'clsx'
import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSnapshot } from 'valtio'

import { Button } from '~/shared/components/Button'
import { Icon } from '~/shared/components/Icon/Icon'
import { Tooltip } from '~/shared/components/Tooltip/Tooltip'
import { isIOSUpdateNeeded } from '~/shared/constants/play'
import { GameType } from '~/shared/constants/ranks'
import { getAccountStat } from '~/shared/helpers/account/get-account-stat'
import { useResponsiveQuery } from '~/shared/hooks/ui/useResponsiveQuery'
import { useAuthedAccount } from '~/shared/hooks/useAuthedAccount'
import { useDialog } from '~/shared/hooks/useDialog/useDialog'
import { useIsInQueue } from '~/shared/hooks/useIsInQueue'
import { useStoredMatchInfo } from '~/shared/queries/play/useStoredMatchInfo'
import { useGameAssetCachePaths } from '~/shared/queries/useGameAssetCachePaths'
import { playState } from '~/shared/state/play-state'
import { FullWidthButtonStyle } from '~/shared/style/FullWidthButtonStyle.css'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { DeckSelector } from '../shared/components/DeckSelector/DeckSelector'
import { GameModeDescription } from '../shared/components/GameModeDescription'
import { GameModeHeader } from '../shared/components/GameModeHeader/GameModeHeader'
import { GameTypeSelector } from '../shared/components/GameTypeSelector/GameTypeSelector'
import { IOSAppUpdateDialog as IOSAppUpdateDialogComponent } from '../shared/components/IOSAppUpdateDialog'
import { PlayPageBackground } from '../shared/components/PlayPageBackground'
import { PlayPageInner } from '../shared/components/PlayPageInner'
import { IOS_APP_UPDATE_DIALOG_ID } from '../shared/constants'
import { useAssetWarningDialog } from '../shared/hooks/useAssetWarningDialog/useAssetWarningDialog'
import { useJoinQueue } from '../shared/hooks/useJoinQueue/useJoinQueue'
import {
  SharedButtonSectionStyle,
  SharedPlayButtonStyle,
  SharedPlayPageStyle
} from '../shared/style/SharedPlayPageStyle.css'
import { RankedProgressBar } from './components/RankedProgressBar'
import { RankedBottomSection, RankedLockIcon } from './Ranked.css'

const SpinnerIcon = { icon: 'spinner' } as const

export const Ranked = memo(() => {
  const { t } = useTranslation()
  const { isInQueue } = useIsInQueue()
  const { data: matchInfo, isLoading: isMatchInfoLoading } = useStoredMatchInfo()
  const { data: authedAccount } = useAuthedAccount()
  const isTabletWide = useResponsiveQuery('tabletWide')
  const { selectedDeck, selectedHero } = useSnapshot(playState)
  const { isLoading: isValidatingCache } = useGameAssetCachePaths()

  const [selectedGameMode, setSelectedGameMode] = useState<
    GameMode.RANKED_CONSTRUCTED | GameMode.RANKED_DISCOVERY
  >(
    matchInfo?.gameType === GameType.DISCOVERY
      ? GameMode.RANKED_DISCOVERY
      : GameMode.RANKED_CONSTRUCTED
  )

  const { Dialog, showAssetWarning } = useAssetWarningDialog({
    mode: selectedGameMode
  })

  const { Dialog: IOSAppUpdateDialog, openDialog: openIOSAppUpdateDialog } =
    useDialog({
      Element: IOSAppUpdateDialogComponent,
      id: IOS_APP_UPDATE_DIALOG_ID,
      isClickoffDisabled: true,
      isCloseButtonDisabled: true
    })

  useEffect(() => {
    if (!isMatchInfoLoading && !!matchInfo) {
      setSelectedGameMode((currentMode) => {
        if (matchInfo.gameMode === GameMode.RANKED_CONSTRUCTED) {
          return GameMode.RANKED_CONSTRUCTED
        }
        if (matchInfo.gameMode === GameMode.RANKED_DISCOVERY) {
          return GameMode.RANKED_DISCOVERY
        }
        return currentMode
      })
    }
  }, [isMatchInfoLoading, matchInfo])

  const isUnranked = useMemo(() => {
    if (!authedAccount) return false
    const accountStat = getAccountStat(
      selectedGameMode === GameMode.RANKED_CONSTRUCTED
        ? GameType.CONSTRUCTED
        : GameType.DISCOVERY,
      authedAccount
    )
    return accountStat?.playerRank === PlayerRank.UNRANKED
  }, [authedAccount, selectedGameMode])

  const { joinQueue } = useJoinQueue()

  const onPlayClick = useCallback(() => {
    if (!!isIOSUpdateNeeded) {
      openIOSAppUpdateDialog()
      return
    }

    if (!showAssetWarning()) {
      joinQueue({ mode: selectedGameMode })
    }
  }, [joinQueue, openIOSAppUpdateDialog, selectedGameMode, showAssetWarning])

  const onGameTypeChange = useCallback((gameType: GameType) => {
    setSelectedGameMode(
      gameType === GameType.CONSTRUCTED
        ? GameMode.RANKED_CONSTRUCTED
        : GameMode.RANKED_DISCOVERY
    )
  }, [])

  const activeGameType = useMemo(() => {
    return isInQueue && !!matchInfo?.gameType
      ? matchInfo.gameType
      : selectedGameMode === GameMode.RANKED_DISCOVERY
      ? GameType.DISCOVERY
      : GameType.CONSTRUCTED
  }, [isInQueue, matchInfo?.gameType, selectedGameMode])

  const isDeckSelected =
    activeGameType === GameType.CONSTRUCTED ? !!selectedDeck : !!selectedHero

  return (
    <div
      className={clsx(
        Sprinkles({
          width: 'full',
          height: 'auto',
          position: 'relative',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center'
        }),
        SharedPlayPageStyle
      )}
    >
      {Dialog}
      {IOSAppUpdateDialog}
      <PlayPageBackground bgUrl="webapp/backgrounds/ranked.webp" />
      <PlayPageInner
        isDiscovery={selectedGameMode === GameMode.RANKED_DISCOVERY}
        bgUrl="webapp/backgrounds/ranked.webp"
      >
        <GameModeHeader page="RANKED" title={t('play.gameModes.header.RANKED')} />
        <GameModeDescription description={t('playPage.RANKED.description')} />
        <div
          className={clsx(
            Sprinkles({
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              justifyContent: 'flex-start'
            }),
            SharedButtonSectionStyle
          )}
        >
          <GameTypeSelector
            isLocked={isInQueue}
            selectedGameType={activeGameType}
            onGameTypeChange={onGameTypeChange}
          />
          <DeckSelector isLocked={isInQueue} selectedGameType={activeGameType} />
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
            RankedBottomSection
          )}
        >
          <RankedProgressBar
            isDiscovery={selectedGameMode === GameMode.RANKED_DISCOVERY}
          />
          <Tooltip
            tooltip={isUnranked ? t('play.rankedConstructedLocked') : undefined}
            placement="top-end"
            className={Sprinkles({ position: 'relative', width: 'full' })}
          >
            {isUnranked && (
              <div
                className={clsx(
                  Sprinkles({ position: 'absolute', pointerEvents: 'none' }),
                  RankedLockIcon
                )}
              >
                <Icon height="32px" type="lock-diamond" color="purple9" />
              </div>
            )}
            <Button
              disabled={
                isUnranked || isInQueue || !isDeckSelected || isValidatingCache
              }
              colorType="orange"
              frameType="default"
              height={isTabletWide ? '76px' : '52px'}
              className={clsx(SharedPlayButtonStyle, FullWidthButtonStyle)}
              buttonClassName={clsx(SharedPlayButtonStyle, FullWidthButtonStyle)}
              onClick={onPlayClick}
              buttonId="playButton"
              clickSound="PlayStinger"
              leftAdornment={isValidatingCache ? SpinnerIcon : undefined}
              text={
                isValidatingCache
                  ? t('play.loading')
                  : isInQueue
                  ? t('dashboard.inQueue')
                  : isUnranked
                  ? t('generic.Locked')
                  : t('play.play')
              }
            />
          </Tooltip>
        </div>
      </PlayPageInner>
    </div>
  )
})

Ranked.displayName = 'Ranked'
