import { GameMode, GameMode as ProtoGameMode } from '@opensky/proto'
import clsx from 'clsx'
import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSnapshot } from 'valtio'

import { DeckSelector } from '~/PlayPage/shared/components/DeckSelector/DeckSelector'
import { GameTypeSelector } from '~/PlayPage/shared/components/GameTypeSelector/GameTypeSelector'
import { IOS_APP_UPDATE_DIALOG_ID } from '~/PlayPage/shared/constants'
import { useAssetWarningDialog } from '~/PlayPage/shared/hooks/useAssetWarningDialog/useAssetWarningDialog'
import { useJoinQueue } from '~/PlayPage/shared/hooks/useJoinQueue/useJoinQueue'
import {
  SharedButtonSectionStyle,
  SharedPlayButtonStyle,
  SharedPlayPageBottomStyle
} from '~/PlayPage/shared/style/SharedPlayPageStyle.css'
import { Button } from '~/shared/components/Button'
import { Input } from '~/shared/components/Input/Input'
import { isIOSUpdateNeeded } from '~/shared/constants/play'
import { GameType } from '~/shared/constants/ranks'
import { copyToClipBoard } from '~/shared/helpers/copy-to-clipboard'
import { useResponsiveQuery } from '~/shared/hooks/ui/useResponsiveQuery'
import { useDialog } from '~/shared/hooks/useDialog/useDialog'
import { useIsInQueue } from '~/shared/hooks/useIsInQueue'
import { useStoredMatchInfo } from '~/shared/queries/play/useStoredMatchInfo'
import { useGameAssetCachePaths } from '~/shared/queries/useGameAssetCachePaths'
import { playState } from '~/shared/state/play-state'
import { FullWidthButtonStyle } from '~/shared/style/FullWidthButtonStyle.css'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { IOSAppUpdateDialog as IOSAppUpdateDialogComponent } from '../../shared/components/IOSAppUpdateDialog'
import { PracticeVsPlayerGrid, PrivateCodeSection } from './PracticeVsPlayerPage.css'

const PRIVATE_MATCH_CURRENT_CODE = 'PRIVATE_MATCH_CURRENT_CODE'

const SpinnerIcon = { icon: 'spinner' } as const

interface PracticeVsPlayerPageProps {
  setParentGameType: (gameType: GameType) => void
}

export const PracticeVsPlayerPage = memo(
  ({ setParentGameType }: PracticeVsPlayerPageProps) => {
    const isTabletWide = useResponsiveQuery('tabletWide')
    const [challengeCode, setChallengeCode] = useState(
      window.localStorage.getItem(PRIVATE_MATCH_CURRENT_CODE) || ''
    )
    const [selectedGameMode, setSelectedGameMode] = useState<
      ProtoGameMode.CHALLENGE_CONSTRUCTED | ProtoGameMode.CHALLENGE_DISCOVERY
    >(ProtoGameMode.CHALLENGE_CONSTRUCTED)
    const { selectedDeck, selectedHero } = useSnapshot(playState)

    const { isLoading: isValidatingCache } = useGameAssetCachePaths()

    const { Dialog, showAssetWarning } = useAssetWarningDialog({
      mode: selectedGameMode,
      challengeCode
    })

    const { data: matchInfo, isLoading: isMatchInfoLoading } = useStoredMatchInfo()

    useEffect(() => {
      if (!isMatchInfoLoading && !!matchInfo) {
        setSelectedGameMode((currentMode) => {
          if (matchInfo.gameMode === GameMode.CHALLENGE_CONSTRUCTED) {
            return GameMode.CHALLENGE_CONSTRUCTED
          }
          if (matchInfo.gameMode === GameMode.CHALLENGE_DISCOVERY) {
            return GameMode.CHALLENGE_DISCOVERY
          }
          return currentMode
        })
      }
    }, [isMatchInfoLoading, matchInfo])

    const { t } = useTranslation()

    const { isInQueue } = useIsInQueue()
    const { joinQueue } = useJoinQueue()

    const { Dialog: IOSAppUpdateDialog, openDialog: openIOSAppUpdateDialog } =
      useDialog({
        Element: IOSAppUpdateDialogComponent,
        id: IOS_APP_UPDATE_DIALOG_ID,
        isClickoffDisabled: true,
        isCloseButtonDisabled: true
      })

    const onPlayClick = useCallback(() => {
      if (!challengeCode) return
      if (!!isIOSUpdateNeeded) {
        openIOSAppUpdateDialog()
        return
      }

      if (!showAssetWarning()) {
        joinQueue({ mode: selectedGameMode, challengeCode })
      }
    }, [
      challengeCode,
      joinQueue,
      openIOSAppUpdateDialog,
      selectedGameMode,
      showAssetWarning
    ])

    const onGenerateCodeClick = useCallback(() => {
      let code = ''
      for (let iter = 0; iter < 6; iter++) {
        if (iter < 3) {
          const rand = Math.round(Math.random() * 25)

          code += 'abcdefghijklmnopqrstuvwxyz'.charAt(rand)
        } else {
          code += `${Math.round(Math.random() * 9)}`
        }
      }
      window.localStorage.setItem(PRIVATE_MATCH_CURRENT_CODE, code)
      setChallengeCode(code)
    }, [])

    const onClearCode = useCallback(() => {
      setChallengeCode('')
      window.localStorage.setItem(PRIVATE_MATCH_CURRENT_CODE, '')
    }, [])

    const onCopy = useCallback(async () => {
      if (!!challengeCode) {
        await copyToClipBoard(challengeCode)
      }
    }, [challengeCode])

    const onCodeChange = useCallback((newValue: string) => {
      if (newValue.length <= 6) {
        setChallengeCode(newValue)
        window.localStorage.setItem(PRIVATE_MATCH_CURRENT_CODE, newValue)
      }
    }, [])

    const onGameTypeChange = useCallback(
      (gameType: GameType) => {
        setParentGameType(gameType)
        setSelectedGameMode(
          gameType === GameType.CONSTRUCTED
            ? ProtoGameMode.CHALLENGE_CONSTRUCTED
            : ProtoGameMode.CHALLENGE_DISCOVERY
        )
      },
      [setParentGameType]
    )

    const activeGameType = useMemo(() => {
      return isInQueue && !!matchInfo?.gameType
        ? matchInfo.gameType
        : selectedGameMode === GameMode.CHALLENGE_DISCOVERY
        ? GameType.DISCOVERY
        : GameType.CONSTRUCTED
    }, [isInQueue, matchInfo?.gameType, selectedGameMode])

    const isDeckSelected =
      activeGameType === GameType.CONSTRUCTED ? !!selectedDeck : !!selectedHero

    return (
      <>
        {Dialog}
        {IOSAppUpdateDialog}
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
            PrivateCodeSection,
            Sprinkles({ position: 'absolute', marginTop: '16px' })
          )}
        >
          <Button
            height={isTabletWide ? '52px' : '36px'}
            text={t('play.createGameCode')}
            frameType="default"
            colorType="secondary"
            leftAdornment={{ icon: 'plus' }}
            onClick={onGenerateCodeClick}
            className={FullWidthButtonStyle}
            buttonClassName={FullWidthButtonStyle}
            disabled={isInQueue}
          />
          <div className={clsx(Sprinkles({ display: 'grid' }), PracticeVsPlayerGrid)}>
            <div
              className={Sprinkles({
                display: 'flex',
                flexDirection: 'column',
                marginTop: { base: '16px', tabletWide: '24px' }
              })}
            >
              <div
                className={Sprinkles({
                  marginBottom: '20px',
                  flexWrap: 'nowrap',
                  display: 'flex'
                })}
              >
                <Input
                  onClear={onClearCode}
                  placeholder={t('play.typeAMatchCode')}
                  onChange={onCodeChange}
                  value={challengeCode.toUpperCase()}
                  inputClassname={Sprinkles({ width: 'full' })}
                  formClassName={Sprinkles({ width: 'full' })}
                  disabled={isInQueue}
                />
              </div>
            </div>

            <Button
              disabled={!challengeCode}
              height="36px"
              frameType="default"
              colorType="default"
              className={clsx(
                Sprinkles({ marginTop: { base: '16px', tabletWide: '24px' } }),
                FullWidthButtonStyle
              )}
              buttonClassName={FullWidthButtonStyle}
              leftAdornment={{ icon: 'copy' }}
              onClick={onCopy}
            />
          </div>
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
            clickSound="PlayStinger"
            colorType="orange"
            buttonId="playButton"
            disabled={!challengeCode || !isDeckSelected || isInQueue}
            frameType="default"
            height={isTabletWide ? '76px' : '52px'}
            className={clsx(SharedPlayButtonStyle, FullWidthButtonStyle)}
            buttonClassName={clsx(SharedPlayButtonStyle, FullWidthButtonStyle)}
            onClick={onPlayClick}
            leftAdornment={isValidatingCache ? SpinnerIcon : undefined}
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
  }
)

PracticeVsPlayerPage.displayName = 'PracticeVsPlayerPage'
