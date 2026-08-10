import { Vector2 } from 'three'

import { getAssetsManager } from '~/assets'
import { PALETTE_ROW } from '~/constants'
import { Pin } from '~/helpers/LayoutHelpers'
import { UI } from '~/scenes/ui'
import { Easing } from '~/systems/animation/Easing'
import { simpleTweener } from '~/systems/animation/tweeners'

import { BaseTestScene } from './BaseTestScene'

class TestUIIconsScene extends BaseTestScene {
  async initUI(ui: UI) {
    await getAssetsManager().loadAsset('uiSmall')
    await getAssetsManager().loadAsset('iconPalette')

    const container = ui.getContainer('randomTests')
    await container.ready

    const total = 4
    for (let i = 0; i < total; i++) {
      const icon = getAssetsManager().fetchMeshDeepClone(
        'uiSmall',
        'icon-card',
        true
      )
      setInterval(() => {
        simpleTweener.to({
          description: 'spin icon',
          target: icon.material,
          propertyGoals: {
            angle: Math.random() > 0.5 ? Math.random() * Math.PI * 2 : 0
          },
          duration: 200,
          easing: Easing.Custom.RoundedOutHard
        })
      }, 1000)
      icon.material.paletteRow =
        i % 2 === 0 ? PALETTE_ROW.CARD_SILVER : PALETTE_ROW.CARD_GOLD

      container.add(icon)

      icon.matrix.setConstraintsPosition(
        new Pin(0.25 + (i / (total - 1)) * 0.5, 0.5)
      )
      icon.matrix.prescale = new Vector2(2, 2)
    }
    container.show()
    super.initUI(ui)
  }

  update(dt: number) {
    super.update(dt)
  }
}
export const scene = TestUIIconsScene
