import { getAssetsManager } from '~/assets'
import { Pin, ReadonlyPin } from '~/helpers/LayoutHelpers'
import { UI } from '~/scenes/ui'
import ProgressBarSegmented from '~/scenes/ui/components/ProgressBarSegmented'
import * as textOptions from '~/systems/text/TextOptions'
import UITextMesh from '~/systems/text/UITextMesh'
import { makeQuickButtonColumn, QuickButtonData } from '~/utils/quickButton'
import { removeFromParent } from '~/utils/threeUtils'

import { BaseTestScene } from './BaseTestScene'

class TestProgressBarSegmentedScene extends BaseTestScene {
  async initUI(ui: UI) {
    await getAssetsManager().loadAsset('uiSmall')
    await getAssetsManager().loadAsset('particle')

    const container = ui.getContainer('randomTests')
    await container.ready

    let bar: ProgressBarSegmented | undefined
    let initProgress = 8
    let total = 10
    function buildBar() {
      const bg = getAssetsManager().fetchMeshDeepClone(
        'uiSmall',
        'info-box',
        true,
        true
      )
      container.add(bg)
      bg.matrix.setConstraints(
        new Pin(0, 0, 400, 100),
        ReadonlyPin.Center,
        ReadonlyPin.Center
      )
      const label = new UITextMesh(`${initProgress} / ${total}`, {
        ...textOptions.buttonText,
        align: 'left'
      })
      bar = new ProgressBarSegmented(initProgress, total, v => {
        label.text = `${v} / ${total}`
      })

      bg.add(bar)
      bar.matrix.setConstraints(
        new Pin(0, 0, 300, 20),
        ReadonlyPin.Center,
        ReadonlyPin.Center
      )
      bar.add(label)
      label.matrix.setConstraints(
        new Pin(0, 0, 300, 20),
        ReadonlyPin.Bottom,
        ReadonlyPin.Top
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
        new QuickButtonData('total+', () => {
          total++
          rebuildBar()
        }),
        new QuickButtonData('total-', () => {
          total--
          rebuildBar()
        }),
        new QuickButtonData('+1 progress', () => {
          initProgress++
          getBar().animateToValue(initProgress)
        }),
        new QuickButtonData('-1 progress', () => {
          initProgress--
          getBar().animateToValue(initProgress)
        }),
        new QuickButtonData('+5 progress', () => {
          initProgress += 5
          getBar().animateToValue(initProgress)
        }),
        new QuickButtonData('-5 progress', () => {
          initProgress -= 5
          getBar().animateToValue(initProgress)
        })
      ],
      ReadonlyPin.BottomRight
    )
    container.fadeIn()
    super.initUI(ui)
  }
}

export const scene = TestProgressBarSegmentedScene
