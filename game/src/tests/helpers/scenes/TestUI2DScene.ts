import { BASE_HERO_SKINS } from '@opensky/shared/constants'
import { Vector2 } from 'three'

import { getAssetsManager } from '~/assets'
import { TextureType } from '~/assets/TextureType'
import { PALETTE_ROW } from '~/constants'
import { Pin, ReadonlyPin, SizePin } from '~/helpers/LayoutHelpers'
import PaletteMappedVertexColorMeshMaterial from '~/materials/PaletteMappedVertexColorMeshMaterial'
import RectangleMaterial from '~/materials/RectangleMaterial'
import Mesh2D from '~/meshes/Mesh2D'
import { UI } from '~/scenes/ui'
import UpdateManager from '~/systems/UpdateManager'
import { getSharedRectangle2DBufferGeometry } from '~/utils/geometry'
import { safelyResetFlipY } from '~/utils/textureUtils'
import { createButton, createButtonIcon } from '~/utils/ui'

import { BaseTestScene } from './BaseTestScene'

class TestUI2DScene extends BaseTestScene {
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
        true,
        true
      ) as Mesh2D
      if (button.material instanceof PaletteMappedVertexColorMeshMaterial) {
        button.material.paletteRow = paletteRow
      }
      return button
    }
    const majorButton = makeButton()
    majorButton.shouldRenderAsGroup = true
    container.add(majorButton)
    // button.matrix.setOpacity(0.5)
    majorButton.matrix.setConstraints(
      new Pin(0.5, 0.5, 0, 0),
      ReadonlyPin.Center,
      ReadonlyPin.Center
    )
    majorButton.matrix.setColorMatrix(
      0.5,
      0.25,
      0.25,
      0.25,
      0.5,
      0.25,
      0.25,
      0.25,
      0.5
    )

    const buttonChildBR = makeButton(12)
    buttonChildBR.matrix.setConstraints(
      new Pin(0.5, 0, 0, 100),
      ReadonlyPin.BottomRight,
      new Pin(0.95, 0.95)
    )

    const buttonChildBL = makeButton(4)
    // button.add(buttonChildBL)
    buttonChildBL.matrix.setConstraints(
      new Pin(0.5, 0, 0, 100),
      ReadonlyPin.BottomLeft,
      new Pin(0.05, 0.95)
    )

    const buttonChildBR2 = makeButton(8)
    // button.add(buttonChildBR)
    buttonChildBR2.matrix.setConstraints(
      new Pin(0.5, 0, 0, 100),
      ReadonlyPin.BottomRight.cloneOffset(0, 40),
      new Pin(0.95, 0.95)
    )

    const buttonChildBL2 = makeButton(0)
    // button.add(buttonChildBL)
    buttonChildBL2.matrix.setConstraints(
      new Pin(0.5, 0, 0, 100),
      ReadonlyPin.BottomLeft.cloneOffset(0, 40),
      new Pin(0.05, 0.95)
    )

    const swappers = [
      buttonChildBL,
      buttonChildBL2,
      buttonChildBR2,
      buttonChildBR
    ]
    let i = 0
    setInterval(() => {
      i++
      majorButton.add(swappers[i % swappers.length])
    }, 600)

    const buttonChild2 = makeButton(12)
    majorButton.add(buttonChild2)
    buttonChild2.matrix.setConstraints(
      new Pin(0, 0, 20, 20),
      ReadonlyPin.BottomLeft,
      ReadonlyPin.TopRight
    )

    const buttonChild3 = makeButton(12)
    majorButton.add(buttonChild3)
    buttonChild3.matrix.setConstraints(
      new Pin(0, 0, 200, 20),
      ReadonlyPin.TopLeft.cloneOffset(100, 0),
      ReadonlyPin.BottomRight
    )

    const topButtonChild = makeButton(0)
    majorButton.add(topButtonChild)
    topButtonChild.matrix.setConstraints(
      new Pin(0.5, 0.2, 0, 0),
      ReadonlyPin.TopLeft,
      new Pin(0.1, 0, 0, -10),
      new Vector2(2, 2)
    )
    topButtonChild.matrix.setColorMatrix(0, 0, 0, 0, 0, 0, 0, 0.15, 1)
    // buttonChild4.matrix.setColorMatrix(0.5, 0.25, 0.25, 0.25, 0.5, 0.25, 0.25, 0.25, 0.5)

    const buttonChild5 = makeButton(4)
    topButtonChild.add(buttonChild5)
    buttonChild5.matrix.setConstraints(
      new Pin(0.5, 1, -8, -8),
      ReadonlyPin.TopLeft,
      ReadonlyPin.TopLeft.cloneOffset(4, 4),
      new Vector2(0.5, 0.5)
    )
    // buttonChild5.matrix.setOpacity(0.5)

    const button2Size = new Pin(0, 0, 300, 100)
    UpdateManager.register({
      update() {
        button2Size.y.offset = Math.sin(performance.now() * 0.003) * 100 + 300
      }
    })
    const button2 = createButton(
      container,
      () => {
        console.log('test')
      },
      button2Size,
      ReadonlyPin.BottomLeft,
      ReadonlyPin.BottomLeft
    )

    createButtonIcon(button2.mesh, 'ui-icon-close')

    const playerHeroURL = `game/cards/art-full/heroes/${BASE_HERO_SKINS.SAMYA.artID}.png`
    const playerHeroArt = await getAssetsManager().load(
      'textureBig',
      playerHeroURL
    )
    safelyResetFlipY(playerHeroArt)
    const tc = getAssetsManager().getTextureCache(TextureType.Big)
    tc.protect(playerHeroURL)

    const image = new Mesh2D(
      getSharedRectangle2DBufferGeometry(),
      new RectangleMaterial({ map: playerHeroArt })
    )

    image.matrix.setColorMatrix(
      0.5,
      0.25,
      0.25,
      0.25,
      0.5,
      0.25,
      0.25,
      0.25,
      0.5
    )
    container.add(image)
    // button.matrix.setOpacity(0.5)
    image.matrix.setConstraints(
      new Pin(0, 1, 300, 0),
      ReadonlyPin.BottomRight,
      ReadonlyPin.BottomRight
    )

    const image2 = new Mesh2D(
      getSharedRectangle2DBufferGeometry(),
      new RectangleMaterial({ map: playerHeroArt })
    )
    image2.matrix.setConstraints(new SizePin(1, 1, 0.5, 'fit'))

    image2.matrix.setColorMatrix(2, -0.5, -0.5, -0.5, 2, -0.5, -0.5, -0.5, 2)
    button2.mesh.add(image2)

    button2.basePaletteRow = PALETTE_ROW.GREEN
    container.show()

    const uiContainer = ui.getContainer('whoseTurn')
    await uiContainer.ready
    uiContainer.announce(true)

    UpdateManager.register({
      update() {
        console.log(
          image.matrixWorld.elements[1] / image.matrixWorld.elements[11]
        )
      }
    })

    super.initUI(ui)
  }

  update(dt: number) {
    super.update(dt)
  }
}

export const scene = TestUI2DScene
