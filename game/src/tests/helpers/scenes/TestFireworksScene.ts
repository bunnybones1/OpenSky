import { getAssetsManager } from '~/assets'
import { Pin, ReadonlyPin } from '~/helpers/LayoutHelpers'
import { makeUnscalingContainer } from '~/helpers/makeUnscalingContainer'
import { UI } from '~/scenes/ui'
import Fireworks from '~/scenes/ui/components/Fireworks'

import { BaseTestScene } from './BaseTestScene'

class TestFireworksScene extends BaseTestScene {
  private _fireWorks: Fireworks[] = []
  async initUI(ui: UI) {
    await getAssetsManager().loadAsset('uiSmall')
    await getAssetsManager().loadAsset('uiPalette')

    const container = ui.getContainer('randomTests')
    await container.ready

    await getAssetsManager().loadAsset('particle')
    const fireworksUnscaling = new Fireworks()
    this._fireWorks.push(fireworksUnscaling)
    const unscalingContainer = makeUnscalingContainer('uiHeight', 660)
    unscalingContainer.matrix.setConstraints(
      new Pin(0.5, 1),
      ReadonlyPin.Left,
      ReadonlyPin.Left
    )
    unscalingContainer.add(fireworksUnscaling.mesh)
    container.add(unscalingContainer)

    const fireworksScaling = new Fireworks()
    this._fireWorks.push(fireworksScaling)

    fireworksScaling.mesh.matrix.setConstraints(
      new Pin(0.5, 1),
      ReadonlyPin.Right,
      ReadonlyPin.Right
    )
    container.add(fireworksScaling.mesh)

    // this.add(fireworks.mesh)

    for (const fw of this._fireWorks) {
      fw.start()
    }

    container.fadeIn()
    super.initUI(ui)
  }

  update(dt: number) {
    for (const fw of this._fireWorks) {
      fw.update()
    }
    super.update(dt)
  }
}
export const scene = TestFireworksScene
