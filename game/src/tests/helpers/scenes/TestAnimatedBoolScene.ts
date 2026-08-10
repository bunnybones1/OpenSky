import { getAssetsManager } from '~/assets'
import { Pin, ReadonlyPin } from '~/helpers/LayoutHelpers'
import PaletteMappedVertexColorMeshMaterial from '~/materials/PaletteMappedVertexColorMeshMaterial'
import { UI } from '~/scenes/ui'
import { simpleTweener } from '~/systems/animation/tweeners'
import { makeQuickButtonColumn, QuickButtonData } from '~/utils/quickButton'

import { BaseTestScene } from './BaseTestScene'

class TestAnimatedBoolScene extends BaseTestScene {
  testMaterial: PaletteMappedVertexColorMeshMaterial
  async initUI(ui: UI) {
    await getAssetsManager().loadAsset('uiSmall')

    const container = ui.getContainer('randomTests')
    await container.ready

    const bg = getAssetsManager().fetchMeshDeepClone(
      'uiSmall',
      'info-box',
      true,
      true
    )
    bg.matrix.setConstraints(new Pin(0, 0, 100, 100))
    container.add(bg)

    function animOpacity(opacity: number) {
      simpleTweener.to({
        description: 'test',
        target: bg.matrix,
        propertyGoals: { opacity },
        duration: 100
      })
    }

    makeQuickButtonColumn(
      container,
      [
        new QuickButtonData('on', () => {
          animOpacity(1)
        }),
        new QuickButtonData('off', () => {
          animOpacity(0)
        }),
        new QuickButtonData('on, off', () => {
          animOpacity(1)
          animOpacity(0)
        }),
        new QuickButtonData('off, on', () => {
          animOpacity(0)
          animOpacity(1)
        }),
        new QuickButtonData('misc', () => {
          animOpacity(0)
          animOpacity(0)
          animOpacity(1)
          animOpacity(1)
        })
      ],
      ReadonlyPin.BottomRight,
      ReadonlyPin.BottomRight
    )
    container.show()
    super.initUI(ui)
  }

  update(dt: number) {
    super.update(dt)
  }
}

export const scene = TestAnimatedBoolScene
