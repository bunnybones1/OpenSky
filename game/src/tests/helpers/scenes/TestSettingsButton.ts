import { getAssetsManager } from '~/assets'
import { UI } from '~/scenes/ui'
import { makeQuickButtonColumn, QuickButtonData } from '~/utils/quickButton'

import { BaseTestScene } from './BaseTestScene'

class TestSettingsButton extends BaseTestScene {
  async initUI(ui: UI) {
    await getAssetsManager().loadAsset('uiSmall')

    super.initUI(ui)
    const container = ui.getContainer('randomTests')
    await container.ready
    container.show()
    makeQuickButtonColumn(container, [
      new QuickButtonData('Open Settings', async () => {
        const settings = ui.getContainer('settings')
        await settings.ready
        //settings.show()
        settings.fadeIn()
      })
    ])

    const ao = ui.getContainer('options')
    await ao.ready
    ao.fadeIn()
  }

  update(dt: number) {
    super.update(dt)
  }
}
export const scene = TestSettingsButton
