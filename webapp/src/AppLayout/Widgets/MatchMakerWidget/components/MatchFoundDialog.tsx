/* eslint-disable valtio/state-snapshot-rule */
import { GameMode } from '@opensky/proto'
import clsx from 'clsx'
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useKey } from 'react-use'
import { useSnapshot } from 'valtio'

import { MatchMakerStatus } from '~/clients/MatchMakerClient/shared/types'
// import Play from '~/__temp__/sound/Play'
// import useHowl from '~/__temp__/sound/useHowl'
import { MatchMakerClient, SoundClient } from '~/shared/clients'
import { Button } from '~/shared/components/Button'
import { Text } from '~/shared/components/Text'
import { MATCH_FOUND_DIALOG_ID } from '~/shared/constants/play'
import { controlDialog } from '~/shared/hooks/useDialog/control-dialog'
import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'
import { useStoredMatchInfo } from '~/shared/queries/play/useStoredMatchInfo'
import { getAuthenticatedGameAddress } from '~/shared/state/authentication-state'
import { playState, updatePlayState } from '~/shared/state/play-state'
import { FullWidthButtonStyle } from '~/shared/style/FullWidthButtonStyle.css'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import {
  MatchFoundDialogContent,
  MatchFoundDialogHeader,
  MatchFoundDialogMinimizeButton,
  MatchFoundDialogStyle
} from './MatchFoundDialog.css'

const { closeDialog } = controlDialog(MATCH_FOUND_DIALOG_ID)

export const MatchFoundDialog = memo(() => {
  const { getAssetUrl } = useGetAssetContext()
  const { data: matchInfo } = useStoredMatchInfo()
  const { matchMakerCountDown, matchMakerStatus } = useSnapshot(playState)
  const [millisecondsElapsed, setMillisecondsElapsed] = useState(0)
  const startMillisecondsRef = useRef<number | null>(null)
  const intervalRef = useRef<number | null>(null)
  const { t } = useTranslation()

  const acceptOnly =
    !!matchInfo && matchInfo.gameMode === GameMode.CONQUEST_CONSTRUCTED

  useEffect(() => {
    if (
      !!matchMakerCountDown &&
      playState.matchMakerStatus === MatchMakerStatus.MATCH_FOUND
    ) {
      SoundClient.playSound('MatchFound')
      startMillisecondsRef.current = new Date(Date.now()).getTime()

      intervalRef.current = window.setInterval(() => {
        if (!!startMillisecondsRef.current) {
          const currentMilliseconds = new Date().getTime()
          setMillisecondsElapsed(currentMilliseconds - startMillisecondsRef.current)
        } else if (!!intervalRef.current) {
          window.clearTimeout(intervalRef.current)
        }
      }, 500)
    } else {
      if (startMillisecondsRef.current) startMillisecondsRef.current = null
      if (!!intervalRef.current) {
        window.clearTimeout(intervalRef.current)
      }
    }
  }, [matchMakerCountDown])

  const secondsLeft = useMemo(() => {
    if (!matchMakerCountDown || matchMakerStatus !== MatchMakerStatus.MATCH_FOUND) {
      return 0
    }

    const countDownSeconds = matchMakerCountDown / 1000
    const seconds = millisecondsElapsed / 1000
    const secondsToGo = countDownSeconds - seconds

    return Math.floor(secondsToGo < 0 ? 0 : secondsToGo)
  }, [matchMakerCountDown, matchMakerStatus, millisecondsElapsed])

  const onMinimize = useCallback(() => {
    updatePlayState('matchMakerStatus', MatchMakerStatus.MATCH_FOUND)
    closeDialog()
  }, [])

  const onDecline = useCallback(() => {
    if (acceptOnly) {
      console.error('you cannot decline in conquest mode')
      return
    }

    const playerID = getAuthenticatedGameAddress()
    if (playerID) {
      MatchMakerClient.ws.send({
        type: 'decline_match',
        playerID
      })
      closeDialog()
    }
  }, [acceptOnly])

  const onAccept = useCallback(() => {
    const playerID = getAuthenticatedGameAddress()
    if (playerID) {
      MatchMakerClient.ws.send({
        type: 'accept_match',
        playerID
      })
      closeDialog()
    }
  }, [])

  useKey(' ', onAccept, undefined, [onAccept])

  return (
    <div
      className={clsx(
        Sprinkles({
          position: 'relative',
          padding: '8px',
          backgroundColor: 'purple1',
          overflow: 'hidden'
        }),
        MatchFoundDialogStyle
      )}
    >
      <div
        style={{
          backgroundImage: !!getAssetUrl
            ? `url(${getAssetUrl('webapp/backgrounds/conquestactivesmall.webp')})`
            : undefined
        }}
        className={clsx(
          Sprinkles({
            width: 'full',
            borderTop: '1px solid',
            borderLeft: '1px solid',
            borderRight: '1px solid',
            borderColor: 'purple5'
          }),
          MatchFoundDialogHeader
        )}
      />
      <div
        className={clsx(
          Sprinkles({
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'flex-start',
            position: 'relative',
            flexDirection: 'column',
            overflow: 'hidden',
            border: '1px solid',
            borderColor: 'purple5',
            width: 'full'
          }),
          MatchFoundDialogContent
        )}
      >
        <div
          className={Sprinkles({
            position: 'absolute',
            left: 0,
            top: 0,
            width: 'full',
            padding: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2
          })}
        >
          <Text fontSize="16px" fontWeight="400" color="purple9">
            {t(
              acceptOnly
                ? 'matchMaker.matchFoundModalAcceptOnly'
                : 'matchMaker.matchFoundModal',
              {
                count: secondsLeft
              }
            )}
          </Text>
        </div>
        <div
          className={Sprinkles({
            width: 'full',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'absolute',
            flexWrap: 'nowrap',
            bottom: 0,
            left: 0,
            zIndex: 2,
            padding: '20px',
            paddingTop: '0px'
          })}
        >
          {!acceptOnly && (
            <div
              className={Sprinkles({ flex: 1, display: 'flex', marginRight: '8px' })}
            >
              <Button
                className={FullWidthButtonStyle}
                buttonClassName={FullWidthButtonStyle}
                height="36px"
                onClick={onDecline}
                colorType="default"
                frameType="default"
                buttonId="declineMatch"
                text={t('general.cancel')}
              />
            </div>
          )}
          <div className={Sprinkles({ flex: 1, display: 'flex' })}>
            <Button
              className={FullWidthButtonStyle}
              buttonClassName={FullWidthButtonStyle}
              height="36px"
              onClick={onAccept}
              colorType="blue"
              frameType="default"
              data-id="acceptMatch"
              text={t('matchMaker.acceptMatch')}
            />
          </div>
        </div>
      </div>

      <div
        className={clsx(
          Sprinkles({ position: 'absolute', zIndex: 2 }),
          MatchFoundDialogMinimizeButton
        )}
      >
        <Button
          leftAdornment={{ icon: 'minimize' }}
          frameType="rightCorner"
          colorType="default"
          onClick={onMinimize}
        />
      </div>
    </div>
  )
})

MatchFoundDialog.displayName = 'MatchFoundDialog'
