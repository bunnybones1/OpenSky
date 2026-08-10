import { Object3D } from 'three'

import { getAssetsManager } from '~/assets'
import { COLOR_DEBUG_RED } from '~/colors/colorLibrary'
import { Pin, ReadonlyPin } from '~/helpers/LayoutHelpers'
import RectangleMaterial from '~/materials/RectangleMaterial'
import RectangleMesh from '~/meshes/RectangleMesh'
import { UI } from '~/scenes/ui'
import { emitParticlesInLineShape } from '~/systems/animation/emitParticlesInLineShape'
import { simpleTweener } from '~/systems/animation/tweeners'
import { waitForNextFrame } from '~/utils/onNextFrame'

import { TestLightCacheScene } from './TestLightCacheScene'

class TestUIParticlesScene extends TestLightCacheScene {
  constructor() {
    super(false, false)
  }
  async initUI(ui: UI) {
    await getAssetsManager().loadAsset('uiSmall')
    await getAssetsManager().loadAsset('gamePiecesPhysical') // for button highlights

    const container = ui.getContainer('randomTests')
    await container.ready

    const particleParentUICentered = new RectangleMesh(
      new RectangleMaterial({})
    )
    particleParentUICentered.matrix.setColor(COLOR_DEBUG_RED)
    particleParentUICentered.matrix.setConstraints(
      Pin.fromPixels(200, 40),
      ReadonlyPin.Center,
      ReadonlyPin.Center
    )
    container.add(particleParentUICentered)
    const particleParentUITopLeft = new RectangleMesh(new RectangleMaterial({}))
    particleParentUITopLeft.matrix.setColor(COLOR_DEBUG_RED)
    const movingPin = ReadonlyPin.TopLeft.cloneOffset(50, 50)
    particleParentUITopLeft.matrix.setConstraints(
      Pin.fromPixels(200, 40),
      ReadonlyPin.TopLeft,
      movingPin
    )
    simpleTweener.to({
      description: 'test',
      target: movingPin.x,
      propertyGoals: {
        offset: 500
      },
      delay: 3000
    })
    container.add(particleParentUITopLeft)

    const particleParentUIBottomLeft = new RectangleMesh(
      new RectangleMaterial({})
    )
    particleParentUIBottomLeft.matrix.setColor(COLOR_DEBUG_RED)

    const movingPin2 = ReadonlyPin.BottomLeft.cloneOffset(50, -50)
    particleParentUIBottomLeft.matrix.setConstraints(
      Pin.fromPixels(200, 40),
      ReadonlyPin.BottomLeft,
      movingPin2
    )
    simpleTweener.to({
      description: 'test',
      target: movingPin2.x,
      propertyGoals: {
        offset: 500
      },
      delay: 3000
    })
    container.add(particleParentUIBottomLeft)
    await waitForNextFrame()
    emitParticlesInLineShape(
      particleParentUITopLeft,
      [
        [0, 40, 0],
        [0, 0, 0],
        [200, 0, 0],
        [200, 40, 0]
      ],
      'uiSparks'
    )
    emitParticlesInLineShape(
      particleParentUIBottomLeft,
      [
        [0, 40, 0],
        [0, 0, 0],
        [200, 0, 0],
        [200, 40, 0]
      ],
      'uiSparks'
    )
    emitParticlesInLineShape(
      particleParentUICentered,
      [
        [0, 40, 10],
        [0, 0, 10],
        [200, 0, 10],
        [200, 40, 10]
      ],
      'timerSparkler'
    )

    const particleParentGame = new Object3D()

    particleParentGame.position.x = -0.2
    particleParentGame.rotation.x = Math.PI * -0.5
    this.scene.add(particleParentGame)
    // emitParticlesInLineShape(
    //   particleParentGame,
    //   [
    //     [0, 0, 0.1],
    //     [0, 0, 0.2]
    //   ],
    //   'electricShock',
    //   undefined,
    //   'Game'
    // )
    container.show()

    super.initUI(ui)
  }
  update(dt: number) {
    super.update(dt)
  }
}

export const scene = TestUIParticlesScene
