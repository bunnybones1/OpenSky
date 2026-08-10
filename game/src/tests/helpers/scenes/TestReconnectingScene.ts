import { getAssetsManager } from '~/assets'
import { UI } from '~/scenes/ui'
import ErrorManager from '~/scenes/ui/ErrorManager'

import { BaseTestScene } from './BaseTestScene'

class TestReconnectingScene extends BaseTestScene {
  async initUI(ui: UI) {
    await getAssetsManager().loadAsset('uiSmall')

    const container = ui.getContainer('randomTests')
    await container.ready

    const er = new ErrorManager(ui)
    let errorCount = 1
    setInterval(() => {
      er.create(`Error #${errorCount++}`)
    }, 1500)

    container.show()
    super.initUI(ui)
  }

  update(dt: number) {
    super.update(dt)
  }
}
export const scene = TestReconnectingScene
