import { trackGameEvent } from '~/helpers/analytics-old'

import { getAssetsManager } from '~/assets'
import { ReadonlyPin } from '~/helpers/LayoutHelpers'
import { UI } from '~/scenes/ui'
import { makeQuickButtonColumn, QuickButtonData } from '~/utils/quickButton'

import { BaseTestScene } from './BaseTestScene'

class TestInGameAnalyticsScene extends BaseTestScene {
  async initUI(ui: UI) {
    await getAssetsManager().loadAsset('uiSmall')
    await getAssetsManager().loadAsset('particle')

    const container = ui.getContainer('randomTests')
    await container.ready
    makeQuickButtonColumn(
      container,
      [
        new QuickButtonData('Foo', () => {
          trackGameEvent([{ name: 'foo' }])
        }),
        new QuickButtonData('Bar', () => {
          trackGameEvent([{ name: 'bar' }])
        }),
        new QuickButtonData('performance.now()', () => {
          trackGameEvent([
            {
              name: 'performance.now',
              additionalProperties: [performance.now()]
            }
          ])
        })
      ],
      ReadonlyPin.BottomRight
    )
    container.fadeIn()
    super.initUI(ui)
  }
}
export const scene = TestInGameAnalyticsScene
