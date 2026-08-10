import { listenToProperty } from '@opensky/shared/utils/propertyListeners'

import { TURN_TIMER_WARNING_FRACTION } from '~/constants'
import env from '~/env'
import { store } from '~/state'
import { matchInfoStore } from '~/state/stores/MatchInfoStore'
import WorkerProxyStore from '~/state/WorkerProxyStore'
import EmoteSystem from '~/systems/EmoteSystem'
import { autoDispatchAtEndOfTurn } from '~/systems/input/StateInteractions'
import { world } from '~/world'

import { playSound } from './soundHelpers'

function timerRanOut() {
  if (store.state && !store.isGameOver) {
    playSound('audioFxCommon', 'TimeUp')
    autoDispatchAtEndOfTurn(store.state, store.player!)
  }
}

function showLowTimeWarning() {
  if (matchInfoStore.timer.hasGoneRedThisTurn) {
    return
  }
  if (!matchInfoStore.isPlayerTurn) {
    return
  }
  matchInfoStore.timer.hasGoneRedThisTurn = true
  if (world.hasSystem(EmoteSystem) && matchInfoStore.cardSelectionsDone) {
    world.getSystem(EmoteSystem).showTimeout(store.player!)
  }
  playSound('audioFxCommon', 'TimeEnding')
}

let __autoDispatchTimer: any // timeout
let __speechBubbleTimer: any // timeout

function updateAutoEndTurn() {
  if (env.TURN_TIMER_ENABLED) {
    clearTimeout(__autoDispatchTimer)
    clearTimeout(__speechBubbleTimer)
    if (
      !matchInfoStore.timer.paused &&
      matchInfoStore.timer.turnEndTime !== -1
    ) {
      const timeUntilTurnEnd = matchInfoStore.timer.turnEndTime - Date.now()
      if (timeUntilTurnEnd > -500) {
        __autoDispatchTimer = setTimeout(timerRanOut, timeUntilTurnEnd + 500) // give some buffer for player to make actions :)
      } else {
        timerRanOut()
      }

      const elapsedFraction = timeUntilTurnEnd / env.TURN_TIMER_MAX
      const fractionUntilWarning = elapsedFraction - TURN_TIMER_WARNING_FRACTION
      const timeUntilWarning = (1 - fractionUntilWarning) * env.TURN_TIMER_MAX
      if (timeUntilWarning > 0) {
        __speechBubbleTimer = setTimeout(showLowTimeWarning, timeUntilWarning)
      } else {
        showLowTimeWarning()
      }
    }
  }
}

export function initTimerStoreBehaviours(store: WorkerProxyStore) {
  listenToProperty(matchInfoStore.timer, 'paused', updateAutoEndTurn, true)
  listenToProperty(matchInfoStore.timer, 'turnEndTime', updateAutoEndTurn, true)
  store.subscribeToTurnTimers(endTime => {
    matchInfoStore.timer.turnEndTime = endTime
    matchInfoStore.timer.paused = false
  })
}
