import { cardGradeCountsToThreeCardViewCode } from '@opensky/shared/utils/cardGradeCountsToThreeCardViewCode'

import { getAssetsManager } from '~/assets'
import { ReadonlyPin } from '~/helpers/LayoutHelpers'
import { UI } from '~/scenes/ui'
import * as textOptions from '~/systems/text/TextOptions'
import UITextMesh from '~/systems/text/UITextMesh'
import { makeQuickButtonColumn } from '~/utils/quickButton'
import { QuickButtonData } from '~/utils/quickButton'

import { BaseTestScene } from './BaseTestScene'

class TestCardGradeDeckVisualsScene extends BaseTestScene {
  async initUI(ui: UI) {
    await getAssetsManager().loadAsset('uiSmall')
    await getAssetsManager().loadAsset('particle')

    const container = ui.getContainer('randomTests')
    await container.ready
    const labelTextOptions = {
      ...textOptions.debugText,
      size: 16
    }
    const labelTop = new UITextMesh('...', labelTextOptions)
    labelTop.matrix.setConstraints(
      ReadonlyPin.EmptySize,
      ReadonlyPin.Center,
      ReadonlyPin.Top.cloneOffset(0, 200)
    )
    container.add(labelTop)
    const labelCenter = new UITextMesh('...', labelTextOptions)
    labelCenter.matrix.setConstraints(
      ReadonlyPin.EmptySize,
      ReadonlyPin.Center,
      ReadonlyPin.Center
    )
    container.add(labelCenter)
    const labelBottom = new UITextMesh(
      'Waiting for button interaction...',
      labelTextOptions
    )
    labelBottom.matrix.setConstraints(
      ReadonlyPin.EmptySize,
      ReadonlyPin.Center,
      ReadonlyPin.Bottom.cloneOffset(0, -100)
    )
    container.add(labelBottom)

    makeQuickButtonColumn(
      container,
      [
        new QuickButtonData('another', () => {
          const numBaseCards = Math.round(Math.random() * 30)
          const numSilverCards = Math.round(Math.random() * (30 - numBaseCards))
          const numGoldCards = 30 - numSilverCards - numBaseCards
          const gradeCounts = {
            numBaseCards,
            numSilverCards,
            numGoldCards
          }
          labelTop.text = JSON.stringify(gradeCounts)
          labelCenter.text = cardGradeCountsToThreeCardViewCode(gradeCounts)
        })
      ],
      ReadonlyPin.Right,
      ReadonlyPin.Right.cloneOffset(-20, 0)
    )

    container.fadeIn()
    super.initUI(ui)
  }
}
export const scene = TestCardGradeDeckVisualsScene
