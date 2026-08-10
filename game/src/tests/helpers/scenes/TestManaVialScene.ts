import { getAssetsManager } from '~/assets'
import ManaVialController from '~/controllers/ManaVialController'
import { SizePin } from '~/helpers/LayoutHelpers'
import { UI } from '~/scenes/ui'

import { BaseTestScene } from './BaseTestScene'

class TestManaVialScene extends BaseTestScene {
  async initUI(ui: UI) {
    await getAssetsManager().loadAsset('uiSmall')
    await getAssetsManager().loadAsset('particle')
    await getAssetsManager().loadAsset('manaVial')

    const container = ui.getContainer('randomTests')
    await container.ready

    const manaVialController = new ManaVialController()

    const mesh = manaVialController.uiPivot
    mesh.matrix.setConstraints(new SizePin(0.5, 0.5, 1, 'fit'))
    container.add(mesh)
    container.show()

    super.initUI(ui)
  }
}
export const scene = TestManaVialScene
