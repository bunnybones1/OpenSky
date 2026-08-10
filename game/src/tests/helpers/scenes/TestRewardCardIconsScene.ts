import { getAssetsManager } from '~/assets'
import { Pin, ReadonlyPin } from '~/helpers/LayoutHelpers'
import { UI } from '~/scenes/ui'
import { simpleTweener } from '~/systems/animation/tweeners'
import { globalAccess } from '~/utils/globalAccess'
import { makeQuickButtonColumn, QuickButtonData } from '~/utils/quickButton'

import { getRewardIconPrefab } from '../rewardIconFactory'
import { BaseTestScene } from './BaseTestScene'

class TestRewardCardIconsScene extends BaseTestScene {
  async initUI(ui: UI) {
    await getAssetsManager().loadAsset('uiSmall')
    await getAssetsManager().loadAsset('iconPalette')

    const container = ui.getContainer('randomTests')
    await container.ready

    const { pivot, anim } = getRewardIconPrefab(1 / 3)

    container.add(pivot)

    pivot.matrix.setConstraintsPosition(new Pin(0.5, 0.5))
    container.show()
    super.initUI(ui)
    simpleTweener.to({
      description: 'test reward icon',
      delay: 1000,
      target: anim,
      propertyGoals: { value: 2 / 3 },
      duration: 1000
    })

    const debugContainer = globalAccess.ui!.getContainer('cheats')!
    makeQuickButtonColumn(
      debugContainer,
      [
        new QuickButtonData('Show', () => {
          container.fadeIn()
        }),
        new QuickButtonData('Hide', () => {
          container.fadeOut()
        })
      ],
      ReadonlyPin.BottomRight,
      ReadonlyPin.BottomRight
    )
  }

  update(dt: number) {
    super.update(dt)
  }
}
export const scene = TestRewardCardIconsScene
