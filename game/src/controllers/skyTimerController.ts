import { removeFromArray } from '@opensky/shared/utils/arrayUtils'
import { clamp01, lerp } from '@opensky/shared/utils/math'
import { listenToProperty } from '@opensky/shared/utils/propertyListeners'

import { START_OF_GAME_DAY } from '~/constants'
import env from '~/env'
import SkySystem from '~/scenes/arena/Sky'
import { store } from '~/state'
import { matchInfoStore } from '~/state/stores/MatchInfoStore'
import { skyTimerSpeed } from '~/userSettings'

interface SkyTimerControllerWrapper {
  controller: SkyTimerController | undefined
}

export const skyTimerControllerWrapper: SkyTimerControllerWrapper = {
  controller: undefined
}

export class TimeSync {
  constructor(
    public description: string,
    public timeInDays: number,
    public resolve: () => void
  ) {
    //
  }
}

export class SkyTimerController {
  targetDaysGoneBy = START_OF_GAME_DAY
  daysGoneBy = START_OF_GAME_DAY
  throttledDelta = 0
  timeSyncs: TimeSync[] = []
  private _onAdded: Array<(ts: TimeSync) => void> = []
  private _onRemoved: Array<(ts: TimeSync) => void> = []
  private _pause: boolean
  constructor(sky: SkySystem) {
    listenToProperty(matchInfoStore, 'pauseSky', pause => {
      this._pause = pause
    })

    sky!.updateTimeController = (dt: number) => {
      const ratio = 60 * dt
      const speed = skyTimerSpeed.value
      const mixAmt = 1.0 - Math.max(Math.pow(1 - 0.025 * speed, ratio), 0.1)
      if (!store.state) {
        return 0
      }
      matchInfoStore.timer.elapsedTurnTime += dt
      const remainingMS = matchInfoStore.timer.turnEndTime - Date.now()

      const timeRemainingRatio = remainingMS / env.TURN_TIMER_MAX
      const trrr = matchInfoStore.cardSelectionsDone
        ? lerp(0.1, 0.9, clamp01(timeRemainingRatio))
        : 0.95
      const extraTime =
        matchInfoStore.timer.elapsedTurnTime / (env.TURN_TIMER_MAX * 0.001)

      const timeUsedRatio =
        (1 - Math.max(0.001, trrr) + extraTime) / (1 + extraTime)

      // console.log(
      //   `remaining: ${timeRemainingRatio.toFixed(
      //     2
      //   )} used:${timeUsedRatio.toFixed(2)}`
      // )

      let newTarget = this.targetDaysGoneBy
      if (!this._pause) {
        if (this.timeSyncs.length > 0) {
          newTarget = this.timeSyncs[0].timeInDays
        } else {
          newTarget = (timeUsedRatio + matchInfoStore.turnCount + 1) * 0.5
        }
      }

      this.targetDaysGoneBy = newTarget
      //skip days instead of warp-speed catchup
      if (this.daysGoneBy < this.targetDaysGoneBy - 1) {
        this.daysGoneBy += ~~(this.targetDaysGoneBy - this.daysGoneBy)
      }
      const delta =
        lerp(this.daysGoneBy, this.targetDaysGoneBy, mixAmt) - this.daysGoneBy

      if (this.throttledDelta < delta) {
        this.throttledDelta += dt * 0.0025 * speed
        if (this.throttledDelta > delta) {
          this.throttledDelta *= 1 - mixAmt
        }
      } else {
        this.throttledDelta *= 1 - mixAmt
      }
      this.daysGoneBy += this.throttledDelta
      while (this.timeSyncs.length > 0) {
        const ts = this.timeSyncs[0]
        if (this.daysGoneBy >= ts.timeInDays) {
          ts.resolve()
          this.timeSyncs.shift()
          for (const rem of this._onRemoved) {
            rem(ts)
          }
        } else {
          break
        }
      }
      return this.daysGoneBy + (store.player === 1 ? 0 : -0.5)
    }
  }
  listenToTimeSyncs(
    added: (ts: TimeSync) => void,
    removed: (ts: TimeSync) => void
  ) {
    this._onAdded.push(added)
    for (const ts of this.timeSyncs) {
      added(ts)
    }
    this._onRemoved.push(removed)
  }
  stopListeningToTimeSyncs(
    added: (ts: TimeSync) => void,
    removed: (ts: TimeSync) => void
  ) {
    removeFromArray(this._onAdded, added)
    for (const ts of this.timeSyncs) {
      removed(ts)
    }
    removeFromArray(this._onRemoved, removed)
  }
  onNextTimeOfDay(
    description: string,
    timeInDays: number,
    resolve: () => void
  ) {
    const ts = new TimeSync(description, timeInDays, resolve)
    this.timeSyncs.push(ts)
    for (const add of this._onAdded) {
      add(ts)
    }
    this.timeSyncs.sort((a, b) => a.timeInDays - b.timeInDays)
  }
}

export function initSkyTimer(sky: SkySystem) {
  skyTimerControllerWrapper.controller = new SkyTimerController(sky)
}

export function getTimeInDays(turnNumber: number, phaseOfTurn: number) {
  return (turnNumber + phaseOfTurn) * 0.5
}

export async function onNextTimeOfDay(description: string, timeInDays: number) {
  let signalGameOver: () => void
  const onGameOver = new Promise<void>(res => {
    signalGameOver = res
  })
  const unsub = store.subscribeToStateChanges(() => {
    if (store.isGameOver) {
      signalGameOver()
    }
  })
  return Promise.race([
    new Promise<void>(resolve => {
      const c = skyTimerControllerWrapper.controller
      if (c) {
        c.onNextTimeOfDay(description, timeInDays, resolve)
      } else {
        resolve()
      }
    }),
    onGameOver
  ]).then(unsub)
}
