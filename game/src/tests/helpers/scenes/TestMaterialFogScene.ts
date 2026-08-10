import { getAssetsManager } from '~/assets'
import { getFireHighlightOptionOverrides } from '~/helpers/fireHighlightMaterialFactory'
import { makeUnscalingContainer } from '~/helpers/makeUnscalingContainer'
import MagicFireHighlightMeshMaterial from '~/materials/MagicFireHighlightMeshMaterial'
import Mesh2D from '~/meshes/Mesh2D'
import { UI } from '~/scenes/ui'

import { BaseTestScene } from './BaseTestScene'

class TestMaterialFogScene extends BaseTestScene {
  async initUI(ui: UI) {
    await getAssetsManager().loadAsset('uiSmall')
    const container = ui.getContainer('randomTests')
    await container.ready

    const unscalingContainer = makeUnscalingContainer('uiHeight', 1000)
    container.add(unscalingContainer)

    const fogProto = getAssetsManager().fetchMeshDeepClone(
      'uiSmall',
      'rectangle-highlight-from-bottom'
    ) as Mesh2D
    const fog = new Mesh2D(
      fogProto.geometry,
      new MagicFireHighlightMeshMaterial(
        getAssetsManager(),
        getFireHighlightOptionOverrides('fog')
      )
    )
    unscalingContainer.add(fog)
    const fog2 = new Mesh2D(
      fogProto.geometry,
      new MagicFireHighlightMeshMaterial(
        getAssetsManager(),
        getFireHighlightOptionOverrides('fog2')
      )
    )
    unscalingContainer.add(fog2)
    container.show()
  }
}
export const scene = TestMaterialFogScene
