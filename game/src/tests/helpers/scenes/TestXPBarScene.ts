import { i18nInit } from '@opensky/language-manager'
import { delayPromise } from '@opensky/shared/utils/async'

import { getAssetsManager } from '~/assets'
import env from '~/env'
import { Pin, ReadonlyPin } from '~/helpers/LayoutHelpers'
import { UI } from '~/scenes/ui'
import XPBar from '~/scenes/ui/components/XPBar'

import { BaseTestScene } from './BaseTestScene'

class TestXPBarScene extends BaseTestScene {
  async initUI(ui: UI) {
    await i18nInit({
      defaultNS: 'game',
      lng: 'en',
      version: env.GITCOMMIT
    })
    await getAssetsManager().loadAsset('uiSmall')
    await getAssetsManager().loadAsset('particle')
    await getAssetsManager().loadAsset('audioFxMatchEnd')

    const bar = new XPBar(1, 25, 100)
    const container = ui.getContainer('randomTests')
    await container.ready
    bar.mesh.matrix.setConstraints(
      Pin.fromPixels(354, 12),
      ReadonlyPin.Center,
      ReadonlyPin.Center
    )

    async function perform() {
      await delayPromise(1000)
      await bar.perform(100, 25, 75)
      await bar.perform(100, 75, 100)
      await bar.perform(100, 100, 150)
      await bar.perform(100, 150, 375)
      await bar.perform(100, 375, 390)
      await bar.perform(100, 390, 450)
    }
    perform()
    container.add(bar.mesh)
    container.show()
    super.initUI(ui)
  }

  update(dt: number) {
    super.update(dt)
  }
}
export const scene = TestXPBarScene
