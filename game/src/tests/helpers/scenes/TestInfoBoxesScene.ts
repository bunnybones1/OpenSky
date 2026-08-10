import { getAssetsManager } from '~/assets'
import { PALETTE_ROW, TIPS_BOX_WIDTH } from '~/constants'
import { Pin, ReadonlyPin } from '~/helpers/LayoutHelpers'
import PaletteMappedVertexColorMeshMaterial from '~/materials/PaletteMappedVertexColorMeshMaterial'
import { makeCardAspectInfoBoxes } from '~/meshes/CardAspectInfoBoxes'
import { UI } from '~/scenes/ui'

import { BaseTestScene } from './BaseTestScene'

class TestInfoBoxesScene extends BaseTestScene {
  testMaterial: PaletteMappedVertexColorMeshMaterial
  async initUI(ui: UI) {
    await getAssetsManager().loadAsset('uiSmall')

    const container = ui.getContainer('randomTests')
    await container.ready

    const button = getAssetsManager().fetchMeshDeepClone(
      'uiSmall',
      'info-box-with-margin',
      undefined,
      true
    )
    button.material.paletteRow = PALETTE_ROW.PURPLE
    container.add(button)

    button.matrix.setConstraints(
      new Pin(0.3, 0.2, -4, -4),
      ReadonlyPin.BottomLeft,
      ReadonlyPin.BottomLeft
    )

    const button2 = getAssetsManager().fetchMeshDeepClone(
      'uiSmall',
      'info-box-with-margin',
      undefined,
      true
    )
    button2.material = button2.material.variant({})
    this.testMaterial = button2.material
    button2.material.paletteRow = PALETTE_ROW.PURPLE
    container.add(button2)

    button2.matrix.setConstraints(
      new Pin(0.3, 0.2, -4, -4),
      ReadonlyPin.Center,
      ReadonlyPin.Center
    )

    const boxes = makeCardAspectInfoBoxes(
      [
        {
          base: '2073'
        }
      ],
      TIPS_BOX_WIDTH,
      false
    )
    if (boxes) {
      boxes.matrix.setConstraints(
        undefined,
        ReadonlyPin.TopRight,
        ReadonlyPin.TopRight
      )
      container.add(boxes)
    }
    container.show()
    super.initUI(ui)
  }

  update(dt: number) {
    super.update(dt)
  }
}
export const scene = TestInfoBoxesScene
