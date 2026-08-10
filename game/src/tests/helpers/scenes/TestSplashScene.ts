import { getAssetsManager } from '~/assets'
import { UI } from '~/scenes/ui'
import { SplashComposition } from '~/scenes/ui/components/SplashComposition'
import { loadSplashTextures } from '~/scenes/ui/components/utils/splashUtils'
import { animationDelay } from '~/utils/asyncUtils'

import { BaseTestScene } from './BaseTestScene'

class TestSplashScene extends BaseTestScene {
  async initUI(ui: UI) {
    await getAssetsManager().loadAsset('uiSmall')

    const container = ui.getContainer('randomTests')
    await container.ready

    const splashTextures = await loadSplashTextures('1')
    const splash = new SplashComposition(
      splashTextures.splashFg,
      splashTextures.splashBg
    )
    container.add(splash)
    await container.fadeIn()
    await splash.show()
    await animationDelay(2000)
    await splash.hide()
    super.initUI(ui)
  }

  update(dt: number) {
    super.update(dt)
  }
}

export const scene = TestSplashScene
