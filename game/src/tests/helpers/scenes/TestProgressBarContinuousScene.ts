import { getAssetsManager } from '~/assets'
import { Pin, ReadonlyPin } from '~/helpers/LayoutHelpers'
import { UI } from '~/scenes/ui'
import ProgressBarContinuous from '~/scenes/ui/components/ProgressBarContinuous'
import { makeQuickButtonColumn, QuickButtonData } from '~/utils/quickButton'
import { removeFromParent } from '~/utils/threeUtils'

import { BaseTestScene } from './BaseTestScene'

class TestProgressBarContinuousScene extends BaseTestScene {
  async initUI(ui: UI) {
    await getAssetsManager().loadAsset('uiSmall')
    await getAssetsManager().loadAsset('particle')

    const container = ui.getContainer('randomTests')
    await container.ready

    let bar: ProgressBarContinuous | undefined
    let initProgress = 60
    let total = 200
    function buildBar() {
      bar = new ProgressBarContinuous(initProgress, 50, total, 3, false)

      container.add(bar)
      bar.matrix.setConstraints(
        new Pin(0, 0, 300, 20),
        ReadonlyPin.Center,
        ReadonlyPin.Center.cloneOffset(0, 0)
      )
      return bar
    }
    buildBar()

    function getBar() {
      if (bar) {
        return bar
      } else {
        return buildBar()
      }
    }

    function rebuildBar() {
      if (bar) {
        removeFromParent(bar)
      }
      buildBar()
    }

    const container2 = ui.getContainer('randomTests')
    await container.ready
    await getAssetsManager().loadAsset('uiSmall')

    makeQuickButtonColumn(
      container2,
      [
        new QuickButtonData('+20 total', () => {
          total += 20
          rebuildBar()
        }),
        new QuickButtonData('-20 total', () => {
          total -= 20
          rebuildBar()
        }),
        new QuickButtonData('+10 progress', () => {
          initProgress += 10
          getBar().animateToValue(initProgress)
        }),
        new QuickButtonData('-10 progress', () => {
          initProgress -= 10
          getBar().animateToValue(initProgress)
        }),
        new QuickButtonData('+50 progress', () => {
          initProgress += 50
          getBar().animateToValue(initProgress)
        }),
        new QuickButtonData('-50 progress', () => {
          initProgress -= 50
          getBar().animateToValue(initProgress)
        })
      ],
      ReadonlyPin.BottomRight
    )
    container.fadeIn()
    super.initUI(ui)
  }
}

export const scene = TestProgressBarContinuousScene
