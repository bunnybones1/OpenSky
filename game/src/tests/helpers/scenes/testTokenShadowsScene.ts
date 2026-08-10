import { getRandom } from '@opensky/shared/utils/arrayUtils'
import { Vector3 } from 'three'

import CharacterComponent from '~/components/CharacterComponent'
import FloatationComponent from '~/components/FloatationComponent'
import ShadowComponent from '~/components/ShadowComponent'
import { scene } from '~/scenes/arena/scene'
import FloatationSystem from '~/systems/FloatationSystem'
import ShadowSystem from '~/systems/ShadowSystem'
import { QuickButtonData } from '~/utils/quickButton'
import { world } from '~/world'

import { testAnimatingComponentScene } from './testAnimatingComponentScene'

function testTokenShadowsScene() {
  world.addSystem(new FloatationSystem())
  world.addSystem(new ShadowSystem(scene))

  return testAnimatingComponentScene(['4083'], 'Field', [
    new QuickButtonData('Alter Floatation', () => {
      const char = getRandom(CharacterComponent.entities.items)

      if (char.has('floatation')) {
        char.remove('floatation')
      } else {
        char.add(new FloatationComponent(new Vector3(0, 0.002, 0)))
      }

      console.log('button hit')
    }),

    new QuickButtonData('Alter Shadow', () => {
      const char = getRandom(CharacterComponent.entities.items)

      if (char.has('shadow')) {
        char.remove('shadow')
      } else {
        char.add(new ShadowComponent(0.6, 0.03, 0.04, 0.015))
      }

      console.log('button hit')
    })
  ])
}

export const test = testTokenShadowsScene
