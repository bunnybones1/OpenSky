import { AxesHelper } from 'three'

import { getAssetsManager } from '~/assets'
import { Pin } from '~/helpers/LayoutHelpers'
import { UI } from '~/scenes/ui'

import { BaseTestScene } from './BaseTestScene'

class TestRingGeometryScene extends BaseTestScene {
  async initUI(ui: UI) {
    await getAssetsManager().loadAsset('uiSmall')

    const container = ui.getContainer('randomTests')
    await container.ready

    function makeRing() {
      const ring = getAssetsManager().fetchMeshDeepClone(
        'uiSmall',
        'circle-outline-outer'
      )
      return ring
    }
    function makeUIRing(xPin: number) {
      const ring = makeRing()
      container.add(ring)
      ring.matrix.setConstraintsPosition(new Pin(xPin, 0.25))
    }
    const scene = this.scene
    function makeGameRing() {
      const ring = makeRing()
      ring.add(new AxesHelper(0.03))
      scene.add(ring)
    }
    makeUIRing(0.25)
    makeUIRing(0.75)
    makeGameRing()
    container.show()

    super.initUI(ui)
  }
}
export const scene = TestRingGeometryScene
