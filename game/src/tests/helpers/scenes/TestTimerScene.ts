import { listenToProperty } from '@opensky/shared/utils/propertyListeners'
import { Vector3 } from 'three'

import { getAssetsManager } from '~/assets'
// import { getAwesomeAnimatedColor } from '~/colors/animatedColorsLib'
import { Pin, ReadonlyPin } from '~/helpers/LayoutHelpers'
import TimerRopeController from '~/helpers/TimerRopeController'
import { getTimerRopeMeshes } from '~/helpers/timerRopeMeshHelpers'
import Object2D from '~/meshes/Object2D'
import { UI } from '~/scenes/ui'
import TurnTimer from '~/scenes/ui/components/TurnTimer'
import UpdateManager from '~/systems/UpdateManager'
import { makeQuickButtonColumn, QuickButtonData } from '~/utils/quickButton'

import { BaseTestScene } from './BaseTestScene'

class TestTimerScene extends BaseTestScene {
  async initUI(ui: UI) {
    await Promise.all([
      getAssetsManager().loadAsset('particle'),
      getAssetsManager().loadAsset('noise3Map'),
      getAssetsManager().loadAsset('uiSmall'),
      getAssetsManager().loadAsset('gameBoardBasicModel'),
      getAssetsManager().loadAsset('gamePiecesPhysical')
    ])

    for (const meshName of [
      'field-rope',
      'field-rope-beams',
      'field-rope-shadow'
    ]) {
      const mesh = getAssetsManager().fetchMeshDeepClone(
        'gameBoardBasicModel',
        meshName,
        true,
        true
      )
      mesh.scale.multiplyScalar(0.05)
      mesh.position.add(new Vector3(0, 0.025, -0.025))
      this.scene.add(mesh)
    }

    const { rope, ropeShadow } = getTimerRopeMeshes(this.scene)

    const trc = new TimerRopeController(rope, ropeShadow)

    const container = ui.getContainer('randomTests')
    await container.ready
    const timerHolder = new Object2D()
    timerHolder.matrix.setConstraints(
      new Pin(0.5, 0, 0, 20),
      ReadonlyPin.Center,
      ReadonlyPin.Center
    )
    container.add(timerHolder)
    const turnTimer = new TurnTimer('end-turn', 30000, 2 / 3)
    turnTimer.endTime = Date.now() + 10000

    timerHolder.add(turnTimer.mesh)

    const proxyTimer = { endTime: Date.now() + 10000 }

    listenToProperty(proxyTimer, 'endTime', (val: number) => {
      turnTimer.endTime = val
      trc.endTime = val
    })

    makeQuickButtonColumn(
      container,
      [
        new QuickButtonData('+1 sec', () => {
          proxyTimer.endTime += 1000
        }),
        new QuickButtonData('+3 sec', () => {
          proxyTimer.endTime += 3000
        }),
        new QuickButtonData('+10 sec', () => {
          proxyTimer.endTime += 10000
        }),
        new QuickButtonData('reset full', () => {
          proxyTimer.endTime = Date.now() + 30000
        }),
        new QuickButtonData('reset half', () => {
          proxyTimer.endTime = Date.now() + 15000
        }),
        new QuickButtonData('reset empty', () => {
          proxyTimer.endTime = Date.now()
        }),
        new QuickButtonData('tiny bump', () => {
          proxyTimer.endTime += Math.random() * 500 + 100
        })
      ],
      ReadonlyPin.Right,
      ReadonlyPin.Right.cloneOffset(-20, 0)
    )

    container.show()
    UpdateManager.register(turnTimer)
    UpdateManager.register(trc)
    super.initUI(ui)
  }

  update(dt: number) {
    super.update(dt)
  }
}
export const scene = TestTimerScene
