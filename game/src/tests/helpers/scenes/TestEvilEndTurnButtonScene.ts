import { getAssetsManager } from '~/assets'
import {
  END_TURN_BUTTON_HEIGHT,
  END_TURN_BUTTON_WIDTH,
  PALETTE_ROW
} from '~/constants'
import { Pin, ReadonlyPin } from '~/helpers/LayoutHelpers'
import PaletteMappedVertexColorMeshMaterial from '~/materials/PaletteMappedVertexColorMeshMaterial'
import { UI } from '~/scenes/ui'
import UpdateManager from '~/systems/UpdateManager'
import { createButton } from '~/utils/ui'

import { TestLightCacheSkyScene } from './TestLightCacheSkyScene'

class TestEvilEndTurnButtonScene extends TestLightCacheSkyScene {
  async initUI(ui: UI) {
    await Promise.all([
      getAssetsManager().loadAsset('uiSmall'),
      getAssetsManager().loadAsset('gamePiecesPhysical'),
      getAssetsManager().loadAsset('gameBoardBasicModel')
    ])

    const container = ui.getContainer('randomTests')
    await container.ready

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

    endTurnButton.disabled = false
    endTurnButton.highlightUrgent = true

    endTurnButton.mesh.material = (
      endTurnButton.mesh.material as PaletteMappedVertexColorMeshMaterial
    ).variant({
      useFancyHighlight: true
    })

    endTurnButton.basePaletteRow = PALETTE_ROW.GREEN
    container.show()

    super.initUI(ui)
    const highlight = getAssetsManager().fetchMeshDeepClone(
      'gamePiecesPhysical',
      'card-highlight'
    )
    this.scene.add(highlight)
    const gameBoardModel = getAssetsManager().fetchMeshDeepClone(
      'gameBoardBasicModel',
      'field-highlight'
    )
    console.log(gameBoardModel)
    this.scene.add(gameBoardModel)
  }

  update(dt: number) {
    super.update(dt)
  }
}

export const scene = TestEvilEndTurnButtonScene
