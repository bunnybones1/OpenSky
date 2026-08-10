import { Vector3 } from 'three'

import { getAssetsManager } from '~/assets'
import { COLOR_GRAY } from '~/colors/colorLibrary'
import { makeSuperOpaque } from '~/helpers/I2D'
import { Pin, ReadonlyPin } from '~/helpers/LayoutHelpers'
import { UI } from '~/scenes/ui'
import * as textOptions from '~/systems/text/TextOptions'
import UITextMesh from '~/systems/text/UITextMesh'
import { detRand } from '~/utils/detRand'

import { makeBallAt } from '../utils/lightCacheTestBallMakers'
import { addPrettyLights } from '../utils/lights'
import { BaseTestScene } from './BaseTestScene'

class TestUI2DAdvancedScene extends BaseTestScene {
  async initUI(ui: UI) {
    await getAssetsManager().loadAsset('uiSmall')

    const container = ui.getContainer('randomTests')
    await container.ready

    const container2 = ui.getContainer('debug')
    await container2.ready
    container2.hide()

    function makeButton(paletteRow = 1) {
      const button = getAssetsManager().fetchMeshDeepClone(
        'uiSmall',
        'button-diagonal',
        true
      )
      button.material.paletteRow = paletteRow
      const label = new UITextMesh('test', textOptions.buttonText)
      label.matrix.setConstraintsPosition(
        ReadonlyPin.TopLeft.cloneOffset(-5, 0)
      )
      button.add(label)
      return button
    }
    function makePanel(paletteRow = 1, buttonCount = 4) {
      const panel = getAssetsManager().fetchMeshDeepClone(
        'uiSmall',
        'panel-w-gems-dark-dark',
        true
      )
      makeSuperOpaque(panel)
      panel.material.paletteRow = paletteRow
      for (let i = 0; i < buttonCount; i++) {
        const button = makeButton((i % 2) + 1)
        panel.add(button)
        button.matrix.setConstraints(
          new Pin(1, 1 / buttonCount, -10, -10),
          ReadonlyPin.Center,
          new Pin(0.5, (0.5 + i) / buttonCount)
        )
      }
      return panel
    }
    const majorPanelA = makePanel(6)
    // majorPanelA.shouldRenderAsGroup = true
    container.add(majorPanelA)
    majorPanelA.matrix.setConstraints(
      new Pin(0, 0.5, 400, 0),
      ReadonlyPin.Left.cloneOffset(-30, 0),
      ReadonlyPin.Left
    )
    const majorPanelB = makePanel(13)
    majorPanelB.shouldRenderAsGroup = true
    container.add(majorPanelB)
    majorPanelB.matrix.setConstraints(
      new Pin(0, 0.5, 400, 0),
      ReadonlyPin.Right.cloneOffset(30, 0),
      ReadonlyPin.Right
    )
    container.show()
    for (let index = 0; index < 10; index++) {
      const ball = makeBallAt(
        new Vector3(detRand(-0.2, 0.2), detRand(-0.2, 0.2), detRand(-1, 0.2)),
        0.05,
        undefined,
        true
      )
      this.scene.add(ball.ball)
    }
    addPrettyLights(this.scene, COLOR_GRAY)
    super.initUI(ui)
  }

  update(dt: number) {
    super.update(dt)
  }
}

export const scene = TestUI2DAdvancedScene
