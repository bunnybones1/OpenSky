import { getAssetsManager } from '~/assets'
import {
  BUTTON_HEIGHT,
  END_TURN_BUTTON_HEIGHT,
  END_TURN_BUTTON_WIDTH,
  PALETTE_ROW
} from '~/constants'
import { Pin, ReadonlyPin } from '~/helpers/LayoutHelpers'
import PaletteMappedVertexColorMeshMaterial from '~/materials/PaletteMappedVertexColorMeshMaterial'
import { UI } from '~/scenes/ui'
import * as textOptions from '~/systems/text/TextOptions'
import UpdateManager from '~/systems/UpdateManager'
import { createButton, createButtonText } from '~/utils/ui'

import { TestLightCacheSkyScene } from './TestLightCacheSkyScene'

class TestButtonsScene extends TestLightCacheSkyScene {
  async initUI(ui: UI) {
    await getAssetsManager().loadAsset('uiSmall')

    const container = ui.getContainer('randomTests')
    await container.ready

    let state = 1

    const butt = createButton(
      container,
      () => {
        if (state === 0) {
          endTurnButton.disabled = false
          endTurnButton.highlight = false
          endTurnButton.highlightUrgent = false
          endTurnButtonText.text = 'END TURN'
          state++
        } else if (state === 1) {
          endTurnButton.highlight = true
          endTurnButtonText.text = 'END TURN!'
          state++
        } else if (state === 2) {
          endTurnButton.disabled = false
          endTurnButton.highlightUrgent = true
          endTurnButtonText.text = 'END TURN!!!'
          state++
        } else if (state === 3) {
          endTurnButton.disabled = true
          endTurnButton.highlight = false
          endTurnButton.highlightUrgent = false
          endTurnButtonText.text = 'ENEMY TURN'
          state = 0
        }
      },
      Pin.fromPixels(200, BUTTON_HEIGHT),
      ReadonlyPin.Center,
      ReadonlyPin.Center
    )
    createButtonText(butt.mesh, 'change state')

    const sizePin = Pin.fromPixels(
      END_TURN_BUTTON_WIDTH,
      END_TURN_BUTTON_HEIGHT
    )
    UpdateManager.register({
      update() {
        sizePin.x.offset =
          Math.sin(performance.now() * 0.001) * 20 + END_TURN_BUTTON_WIDTH
      }
    })
    const endTurnButton = createButton(
      container,
      () => {
        //
      },
      sizePin,
      ReadonlyPin.BottomRight,
      ReadonlyPin.BottomRight.cloneOffset(-100, -100),
      undefined,
      undefined,
      'button-diagonal',
      undefined,
      true
    )

    endTurnButton.mesh.material = (
      endTurnButton.mesh.material as PaletteMappedVertexColorMeshMaterial
    ).variant({
      useFancyHighlight: true
    })

    endTurnButton.basePaletteRow = PALETTE_ROW.GREEN
    const endTurnButtonText = createButtonText(
      endTurnButton.mesh,
      'END TURN',
      textOptions.endTurnButtonText
    )

    container.show()

    super.initUI(ui)
  }

  update(dt: number) {
    super.update(dt)
  }
}

export const scene = TestButtonsScene
