import { listenToProperty } from '@opensky/shared/utils/propertyListeners'
import { System } from 'gg'
import { Scene } from 'three'

import { Components } from '~/components'
import TimerRopeController from '~/helpers/TimerRopeController'
import { getTimerRopeMeshes } from '~/helpers/timerRopeMeshHelpers'
import { matchInfoStore } from '~/state/stores/MatchInfoStore'

export default class RopeSystem extends System<Components> {
  private _ropeController: TimerRopeController
  constructor(scene: Scene, timerMaxMS: number) {
    super()

    const { rope, ropeShadow } = getTimerRopeMeshes(scene)

    const trc = new TimerRopeController(rope, ropeShadow, timerMaxMS)
    this._ropeController = trc
    listenToProperty(matchInfoStore.timer, 'turnEndTime', (val: number) => {
      trc.endTime = val
    })
    listenToProperty(matchInfoStore.timer, 'finished', (val: boolean) => {
      if (val) {
        trc.mute(1000000)
      }
    })
  }
  update() {
    this._ropeController.update()
  }
}
