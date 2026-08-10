/* eslint-disable valtio/state-snapshot-rule */
import { GameMode } from '@opensky/proto'
import { useQueryClient } from '@tanstack/react-query'
import clsx from 'clsx'
import { motion } from 'framer-motion'
import { memo, useCallback, useEffect, useMemo, useRef } from 'react'
import { useSnapshot } from 'valtio'

import { MatchMakerStatus } from '~/clients/MatchMakerClient/shared/types'
import { useJoinQueue } from '~/PlayPage/shared/hooks/useJoinQueue/useJoinQueue'
import { MatchMakerClient } from '~/shared/clients'
import { Icon } from '~/shared/components/Icon/Icon'
import { MATCH_FOUND_DIALOG_ID } from '~/shared/constants/play'
import { getInProgressMatchKey } from '~/shared/constants/react-query-keys'
import { useDialog } from '~/shared/hooks/useDialog/useDialog'
import { useStoredMatchInfo } from '~/shared/queries/play/useStoredMatchInfo'
import { authenticationState } from '~/shared/state/authentication-state'
import { playState, resetMatchMakerState } from '~/shared/state/play-state'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { MatchFoundDialog } from './components/MatchFoundDialog'
import { MatchMakerWidgetBackground } from './components/MatchMakerWidgetBackground'
import { MatchMakerWidgetCTA } from './components/MatchMakerWidgetCTA'
import { MatchMakerWidgetStatusText } from './components/MatchMakerWidgetStatusText'
import { useHandleInProgressMatch } from './hooks/useHandleInProgressMatch'
import { useHandleStoredMatchInfo } from './hooks/useHandleStoredMatchInfo'
import { MatchMakerWidgetInner, MatchMakerWidgetStyle } from './MatchMakerWidget.css'
import { MatchMakerWidgetLogo } from './MatchMakerWidgetLogo/MatchMakerWidgetLogo'
import { MatchMakerWidgetTimer } from './MatchMakerWidgetTimer/MatchMakerWidgetTimer'
import { GreenSatus, OrangeStatus } from './shared/constants'
import { MatchMakerColorType } from './shared/type'

const ValidCloseButtonStatuses: MatchMakerStatus[] = [
  MatchMakerStatus.JOINING_QUEUE,
  MatchMakerStatus.SEARCHING,
  MatchMakerStatus.TIMED_OUT,
  MatchMakerStatus.SEARCH_ERRORED
]

export const MatchMakerWidget = memo(() => {
  const { matchMakerStatus } = useSnapshot(playState)
  const rejoinTimerRef = useRef<number | null>(null)
  const { data: matchInfo } = useStoredMatchInfo()
  const queryClient = useQueryClient()

  const color = useMemo<MatchMakerColorType>(() => {
    if (!matchMakerStatus) return 'blue'
    if (OrangeStatus.includes(matchMakerStatus)) return 'orange'
    if (GreenSatus.includes(matchMakerStatus)) return 'green'
    return 'blue'
  }, [matchMakerStatus])

  const { joinQueue } = useJoinQueue()

  const { Dialog } = useDialog({
    Element: MatchFoundDialog,
    isCloseButtonDisabled: true,
    isClickoffDisabled: true,
    id: MATCH_FOUND_DIALOG_ID
  })

  useHandleStoredMatchInfo()
  useHandleInProgressMatch()

  useEffect(() => {
    if (
      matchMakerStatus === MatchMakerStatus.OPPONENT_DECLINED &&
      !rejoinTimerRef.current &&
      !!matchInfo?.gameMode &&
      matchInfo.gameMode !== GameMode.CHALLENGE_CONSTRUCTED &&
      matchInfo.gameMode !== GameMode.CHALLENGE_DISCOVERY
    ) {
      // Rejoin the queue if the status flips to opponent declined
      rejoinTimerRef.current = window.setTimeout(() => {
        if (!!matchInfo.gameMode) {
          joinQueue({ mode: matchInfo.gameMode })
        }
      }, 2000)
    }
  }, [joinQueue, matchInfo?.gameMode, matchMakerStatus])

  useEffect(() => {
    return () => {
      if (!!rejoinTimerRef.current) {
        window.clearTimeout(rejoinTimerRef.current)
      }
    }
  }, [])

  const onClose = useCallback(() => {
    if (rejoinTimerRef.current) {
      window.clearTimeout(rejoinTimerRef.current)
    }
    MatchMakerClient.ws.manual_disconnect()
    resetMatchMakerState()
    if (!!authenticationState.userAddress) {
      queryClient.setQueryData(
        getInProgressMatchKey(authenticationState.userAddress),
        null
      )
    }
  }, [queryClient])

  return (
    <>
      {!!matchMakerStatus && (
        <motion.div
          className={clsx(
            Sprinkles({
              backgroundColor: 'black',
              position: 'relative',
              pointerEvents: 'all',
              overflow: 'hidden',
              border: '1px solid'
            }),
            MatchMakerWidgetStyle[color]
          )}
          initial={{ x: 200, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ ease: 'anticipate', duration: 0.5 }}
        >
          {ValidCloseButtonStatuses.includes(matchMakerStatus) && (
            <div
              className={Sprinkles({
                position: 'absolute',
                right: 0,
                top: 0,
                padding: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                pointerEvents: 'all',
                zIndex: 3
              })}
              onClick={onClose}
            >
              <Icon height="14px" color="white" type="close" />
            </div>
          )}
          <div
            className={clsx(
              Sprinkles({
                padding: '12px',
                display: 'grid',
                justifyContent: 'flex-start',
                width: 'full',
                height: 'full',
                position: 'absolute',
                left: 0,
                top: 0,
                zIndex: 2
              }),
              MatchMakerWidgetInner
            )}
          >
            <MatchMakerWidgetLogo color={color} />
            <div
              className={Sprinkles({
                width: 'full',
                height: 'full',
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'center',
                flexDirection: 'column',
                paddingLeft: '12px'
              })}
            >
              <MatchMakerWidgetTimer />
              <MatchMakerWidgetStatusText />
              <MatchMakerWidgetCTA />
            </div>
          </div>
          <MatchMakerWidgetBackground color={color} />
        </motion.div>
      )}
      {Dialog}
    </>
  )
})

MatchMakerWidget.displayName = 'MatchMakerWidget'
