import { getAssetsManager } from '~/assets'
import { UI } from '~/scenes/ui'

import { BaseTestScene } from './BaseTestScene'

class TestTutorialTitleScene extends BaseTestScene {
  async initUI(ui: UI) {
    await getAssetsManager().loadAsset('uiSmall')

    const container = ui.getContainer('tutorialTitle')
    container.tutorialTitle = 'EXAMPLE TITLE'
    container.tutorialDescription = 'EXAMPLE DESCRIPTION'
    await container.ready
    await container.fadeIn()
    super.initUI(ui)
  }

  update(dt: number) {
    super.update(dt)
  }
}

export const scene = TestTutorialTitleScene
