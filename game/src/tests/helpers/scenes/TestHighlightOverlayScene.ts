import { Vector2, Vector3 } from 'three'

import { getAssetsManager } from '~/assets'
import { COLOR_BLACK, COLOR_GRAY } from '~/colors/colorLibrary'
import HighlightOverlayMaterial from '~/materials/HighlightOverlayMaterial'
import RectangleMesh from '~/meshes/RectangleMesh'
import { UI } from '~/scenes/ui'
import { detRand } from '~/utils/detRand'

import { makeBallAt } from '../utils/lightCacheTestBallMakers'
import { addPrettyLights } from '../utils/lights'
import { BaseTestScene } from './BaseTestScene'

class TestHighlightOverlayScene extends BaseTestScene {
  async initUI(ui: UI) {
    await getAssetsManager().loadAsset('uiSmall')

    const container = ui.getContainer('randomTests')
    await container.ready

    const container2 = ui.getContainer('debug')
    await container2.ready
    container2.hide()
    const highlightOverlayMaterial = new HighlightOverlayMaterial({})
    const dummyRect = new RectangleMesh(highlightOverlayMaterial)
    dummyRect.matrix.setColor(COLOR_BLACK, 0.5)
    container.add(dummyRect)
    // majorPanelA.shouldRenderAsGroup = true
    highlightOverlayMaterial.setHighlight0(new Vector2(0.5, 0.5), 0.1, 1)
    highlightOverlayMaterial.setHighlight1(new Vector2(0.7, 0.8), 0.1, 1)
    container.show()
    for (let index = 0; index < 10; index++) {
      const ball = makeBallAt(
        new Vector3(detRand(-0.2, 0.2), detRand(-0.2, 0.2), detRand(-1, 0.2)),
        0.05,
        undefined,
        true
      )
      this.scene.add(ball.ball)
    }
    addPrettyLights(this.scene, COLOR_GRAY)
    this.scene.add
    super.initUI(ui)
  }

  update(dt: number) {
    super.update(dt)
  }
}
export const scene = TestHighlightOverlayScene
