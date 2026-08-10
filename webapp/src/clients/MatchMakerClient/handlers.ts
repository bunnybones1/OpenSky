import {
  AcceptMatchMessage,
  DeclineMatchMessage,
  MatchFoundMessage,
  MatchmakerErrorMessage,
  MatchReadyToStartMessage
  // MatchRefusalCooldownMessage
} from '@opensky/shared/matchmaker-message-types'

import env from '~/env'
import { MATCH_FOUND_DIALOG_ID } from '~/shared/constants/play'
import { captureError } from '~/shared/helpers/sentry'
import { controlDialog } from '~/shared/hooks/useDialog/control-dialog'
import { authenticationState } from '~/shared/state/authentication-state'
import {
  playState,
  resetMatchMakerState,
  updatePlayState
} from '~/shared/state/play-state'

import { MatchMakerStatus } from './shared/types'

const { openDialog, closeDialog } = controlDialog(MATCH_FOUND_DIALOG_ID)

export const onError = (message: MatchmakerErrorMessage) => {
  captureError(message.reason, 'join queue failed', false)

  updatePlayState('matchMakerErrorReason', message.reason)
  updatePlayState('matchMakerStatus', MatchMakerStatus.SEARCH_ERRORED)
}

export const onMatchReady = (data: MatchReadyToStartMessage) => {
  window.location.href = `${env.GAME_URL}?mode=${data.mode}`
}

export const onPlayerAccepted = (data: AcceptMatchMessage) => {
  const authedAddress = authenticationState.userAddress

  if (data.playerID === authedAddress) {
    updatePlayState('matchMakerStatus', MatchMakerStatus.WAITING_OPPONENT)
  }
}

export const onPlayerDeclined = (message: DeclineMatchMessage) => {
  const authedAddress = authenticationState.userAddress

  if (message.playerID === authedAddress) {
    resetMatchMakerState()
  } else {
    closeDialog()
    updatePlayState('matchMakerStatus', MatchMakerStatus.OPPONENT_DECLINED)
  }
}

export const onMatchFound = (data: MatchFoundMessage) => {
  updatePlayState('matchMakerStatus', MatchMakerStatus.MATCH_FOUND)
  updatePlayState('matchMakerCountDown', data.timeoutMs)

  openDialog()
}

export const onMatchRefusalCooldown = (/* data: MatchRefusalCooldownMessage */) => {
  resetMatchMakerState()

  updatePlayState('matchMakerStatus', MatchMakerStatus.SEARCH_ERRORED)
}

export const onTimedOut = () => {
  updatePlayState('matchMakerCountDown', undefined)
  closeDialog()

  if (playState.matchMakerStatus === MatchMakerStatus.WAITING_OPPONENT) {
    updatePlayState('matchMakerStatus', MatchMakerStatus.OPPONENT_DECLINED)
  } else {
    updatePlayState('matchMakerStatus', MatchMakerStatus.TIMED_OUT)
  }

  updatePlayState('matchMakerCountDown', undefined)
}
