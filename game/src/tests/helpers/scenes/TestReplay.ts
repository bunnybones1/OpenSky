import { getAssetsManager } from '~/assets'
import { UI } from '~/scenes/ui'

import { BaseTestScene } from './BaseTestScene'

class TestReplay extends BaseTestScene {
  async initUI(ui: UI) {
    await getAssetsManager().loadAsset('uiSmall')

    const replayContainer = ui.getContainer('replay')
    await replayContainer.ready
    replayContainer.fadeIn()
  }
}

export const scene = TestReplay
