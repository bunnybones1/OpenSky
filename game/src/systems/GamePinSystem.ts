import { uiScale } from '@opensky/shared/userSettings'
import { System } from 'gg'
import { Object3D, Vector3 } from 'three'

import { Components } from '~/components'
import GamePinCushionComponent, {
  GamePinCushion
} from '~/components/GamePinCushionComponent'
import { getScreenSpace } from '~/utils/camera'
import { cameraShaker } from '~/utils/cameraShaker'
const _vec3 = new Vector3()

function updatePin(transform: Object3D, gamePinCushion: GamePinCushion) {
  gamePinCushion.forEach((pin, offset) => {
    _vec3.copy(offset)
    _vec3.applyMatrix4(transform.matrixWorld)

    const screenSpace = getScreenSpace(cameraShaker.camera, _vec3)
    pin.x.offset = screenSpace.x / uiScale.value
    pin.y.offset = screenSpace.y / uiScale.value
  })
}

export default class GamePinSystem extends System<Components> {
  init() {
    //
  }
  update() {
    for (const item of GamePinCushionComponent.entities.items) {
      updatePin(
        item.has('mesh') ? item.get('mesh') : item.get('transform'),
        item.get('gamePinCushion')
      )
    }
  }
}
