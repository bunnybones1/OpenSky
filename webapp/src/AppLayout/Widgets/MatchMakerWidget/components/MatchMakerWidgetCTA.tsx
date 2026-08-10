import { GameMode } from '@opensky/proto'
import clsx from 'clsx'
import { stringify } from 'qs'
import { memo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useSnapshot } from 'valtio'

import { MatchMakerStatus } from '~/clients/MatchMakerClient/shared/types'
import env from '~/env'
import { useJoinQueue } from '~/PlayPage/shared/hooks/useJoinQueue/useJoinQueue'
import { MatchMakerClient } from '~/shared/clients'
import { Icon } from '~/shared/components/Icon/Icon'
import { captureError } from '~/shared/helpers/sentry'
import { useInProgressMatch } from '~/shared/queries/play/useInProgressMatch'
import { useStoredMatchInfo } from '~/shared/queries/play/useStoredMatchInfo'
import { authenticationState } from '~/shared/state/authentication-state'
import { playState, updatePlayState } from '~/shared/state/play-state'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { MatchMakerWidgetCTAStyle } from './MatchMakerWidgetCTA.css'

type ValidStatuses =
  | MatchMakerStatus.MATCH_FOUND
  | MatchMakerStatus.IN_PROGRESS_MATCH
  | MatchMakerStatus.OPPONENT_DECLINED
  | MatchMakerStatus.SEARCH_ERRORED
  | MatchMakerStatus.TIMED_OUT

const VALID_STATUSES: MatchMakerStatus[] = [
  MatchMakerStatus.MATCH_FOUND,
  MatchMakerStatus.IN_PROGRESS_MATCH,
  MatchMakerStatus.OPPONENT_DECLINED,
  MatchMakerStatus.SEARCH_ERRORED,
  MatchMakerStatus.TIMED_OUT
]

const isValidStatus = (status: MatchMakerStatus): status is ValidStatuses => {
  return VALID_STATUSES.includes(status)
}

export const MatchMakerWidgetCTA = memo(() => {
  const { matchMakerStatus } = useSnapshot(playState)
  const { t } = useTranslation()
  const { data: matchInfo } = useStoredMatchInfo()
  const { data: inProgressMatchInfo } = useInProgressMatch()

  const { joinQueue } = useJoinQueue()

  const onClick = useCallback(async () => {
    if (!matchMakerStatus) return
    if (matchMakerStatus === MatchMakerStatus.MATCH_FOUND) {
      if (!!authenticationState.userAddress) {
        MatchMakerClient.ws.send({
          type: 'accept_match',
          playerID: authenticationState.userAddress
        })
      }
    }
    if (
      matchMakerStatus === MatchMakerStatus.IN_PROGRESS_MATCH &&
      !!inProgressMatchInfo
    ) {
      updatePlayState('matchMakerStatus', MatchMakerStatus.JOINING_QUEUE)
      updatePlayState('matchMakerErrorReason', undefined)
      updatePlayState('matchMakerCountDown', undefined)

      // Reconnecting will always fail unless you have a subkey!
      const subkeyCert = await MatchMakerClient.generateSubkeyCertification().catch(
        (e) => {
          captureError(e, 'Sequence Error: Unable to generate or sign subkey')
          console.error(e)
        }
      )

      if (!subkeyCert) {
        updatePlayState('matchMakerStatus', MatchMakerStatus.SEARCH_ERRORED)
        return
      }

      // Once we have a subkey, it's safe to reconnect.
      window.location.href = `${env.GAME_URL}?${stringify({
        mode: inProgressMatchInfo.mode,
        version: inProgressMatchInfo.version
      })}`

      return
    }
    if (!!matchInfo?.gameMode) {
      joinQueue({ mode: matchInfo.gameMode, challengeCode: matchInfo.challengeCode })
    }
  }, [inProgressMatchInfo, joinQueue, matchInfo, matchMakerStatus])

  const acceptOnly =
    !!matchInfo && matchInfo.gameMode === GameMode.CONQUEST_CONSTRUCTED

  const onCancel = useCallback(() => {
    if (acceptOnly) {
      console.error('you cannot decline in conquest mode')
      return
    }

    if (!!authenticationState.userAddress) {
      MatchMakerClient.ws.send({
        type: 'decline_match',
        playerID: authenticationState.userAddress
      })
    }
  }, [acceptOnly])

  if (!matchMakerStatus || !isValidStatus(matchMakerStatus)) return null

  return (
    <div
      className={clsx(
        Sprinkles({
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start'
        })
      )}
    >
      <div
        onClick={onClick}
        className={clsx(
          Sprinkles({
            fontSize: '14px',
            color:
              matchMakerStatus === MatchMakerStatus.MATCH_FOUND ||
              matchMakerStatus === MatchMakerStatus.IN_PROGRESS_MATCH
                ? 'forest5'
                : 'warm5',
            marginTop: '8px',
            fontWeight: '500',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-start'
          }),
          MatchMakerWidgetCTAStyle
        )}
      >
        <Icon
          type={
            matchMakerStatus === MatchMakerStatus.OPPONENT_DECLINED
              ? 'spinner'
              : 'arrow-right'
          }
          color={
            matchMakerStatus === MatchMakerStatus.MATCH_FOUND ||
            matchMakerStatus === MatchMakerStatus.IN_PROGRESS_MATCH
              ? 'forest5'
              : 'warm5'
          }
          height="14px"
          marginRight="4px"
        />
        {t(
          `playPage.matchMaker.${
            matchMakerStatus === MatchMakerStatus.OPPONENT_DECLINED
              ? 'rejoiningCTA'
              : matchMakerStatus === MatchMakerStatus.MATCH_FOUND
              ? 'joinCTA'
              : matchMakerStatus === MatchMakerStatus.IN_PROGRESS_MATCH
              ? 'rejoinCTA'
              : 'reconnectCTA'
          }`
        )}
      </div>

      {matchMakerStatus === MatchMakerStatus.MATCH_FOUND && !acceptOnly && (
        <div
          className={clsx(
            Sprinkles({
              fontSize: '14px',
              color: 'warm4',
              marginTop: '8px',
              fontWeight: '500',
              marginLeft: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-start'
            }),
            MatchMakerWidgetCTAStyle
          )}
          onClick={onCancel}
        >
          <Icon type={'close'} color="warm4" height="14px" marginRight="4px" />
          {t('general.cancel')}
        </div>
      )}
    </div>
  )
})

MatchMakerWidgetCTA.displayName = 'MatchMakerWidgetCTA'
