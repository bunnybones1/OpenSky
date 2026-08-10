import { System } from 'gg'
import { Scene } from 'three'

import { DECK_COUNTER_POSITIONS } from '~/assets'
import { Components } from '~/components'
import { DeckCardStatuses, Owner } from '~/types'
import { findObject3DByName } from '~/utils/threeUtils'
import { world } from '~/world'

import TextMesh from '../text/TextMesh'
import * as textOptions from '../text/TextOptions'
import ZoneSystem from './ZoneSystem'

export default class DeckSystem extends System<Components> {
  constructor(private _arenaScene: Scene) {
    super()
  }
  init() {
    const zones = world.getSystem(ZoneSystem).zones

    //text mesh deck counters

    const arrX: Owner[] = ['Opponent', 'Player']
    const arrZ: DeckCardStatuses[] = ['Graveyard', 'Deck']
    const surface = findObject3DByName(this._arenaScene, 'surface')
    for (let iz = 0; iz <= 1; iz++) {
      for (let ix = 0; ix <= 1; ix++) {
        const ownedStatus = `${arrX[iz]}_${arrZ[ix]}` as const
        const deckZone = zones[ownedStatus]
        const deckCounter = new TextMesh(
          deckZone.cardsInZone.length,
          textOptions.deckCounterNumber,
          0
        )
        function onChange() {
          deckCounter.text = deckZone.cardsInZone.length
        }
        deckZone.cardsInZone.listenForAdd(onChange)
        deckZone.cardsInZone.listenForRemove(onChange)
        surface.add(deckCounter)
        const mx = ix * 2 - 1
        // const mz = iz * 2 - 1
        deckCounter.position.copy(DECK_COUNTER_POSITIONS[iz][ix]) // mx * 3.86 + 0.005, 0.032, mz * 1.07 + 0.98)
        deckCounter.rotation.set(-0.25, -0.4 * mx + Math.PI, 0, 'YXZ')
        deckCounter.scale.multiplyScalar(1.37)
      }
    }
  }

  update() {
    //
  }
}
