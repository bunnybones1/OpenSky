import { getAssetsManager } from '~/assets'
import { PALETTE_ROW } from '~/constants'
import { Pin, ReadonlyPin } from '~/helpers/LayoutHelpers'
import PaletteMappedVertexColorMeshMaterial from '~/materials/PaletteMappedVertexColorMeshMaterial'
import Mesh2D from '~/meshes/Mesh2D'
import { UI } from '~/scenes/ui'
import { createButton, createButtonIcon } from '~/utils/ui'

import { BaseTestScene } from './BaseTestScene'

class TestButtonsScene extends BaseTestScene {
  async initUI(ui: UI) {
    await getAssetsManager().loadAsset('uiSmall')

    const container = ui.getContainer('randomTests')
    await container.ready

    const container2 = ui.getContainer('debug')
    await container2.ready
    container2.hide()

    function makeButton(paletteRow: PALETTE_ROW = PALETTE_ROW.PURPLE) {
      const button = getAssetsManager().fetchMeshDeepClone(
        'uiSmall',
        'button-diagonal',
        true,
        true
      ) as Mesh2D
      if (button.material instanceof PaletteMappedVertexColorMeshMaterial) {
        button.material.paletteRow = paletteRow
      }
      return button
    }
    const button = makeButton()
    container.add(button)
    button.matrix.setConstraints(
      new Pin(0.5, 0.5, 0, 0),
      ReadonlyPin.Center,
      ReadonlyPin.Center
    )

    const button2 = createButton(
      container,
      () => {
        console.log('test')
      },
      new Pin(0.5, 0, 0, 100),
      ReadonlyPin.TopRight,
      ReadonlyPin.TopRight
    )
    // button2.mesh.onBeforeRender = () => {
    //   debugger
    // }
    createButtonIcon(button2.mesh, 'ui-icon-close')

    button2.basePaletteRow = PALETTE_ROW.GREEN
    container.show()
    super.initUI(ui)
  }

  update(dt: number) {
    super.update(dt)
  }
}
export const scene = TestButtonsScene
