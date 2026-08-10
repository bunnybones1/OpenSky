import { renderMetrics } from '@opensky/shared/renderMetrics'
import { MessageStep } from '@opensky/shared/tutorialConfig'
import { delayPromise } from '@opensky/shared/utils/async'
import { listenToProperty } from '@opensky/shared/utils/propertyListeners'

import { getAssetsManager } from '~/assets'
import { PALETTE_ROW } from '~/constants'
import { Pin, ReadonlyPin, SizePin } from '~/helpers/LayoutHelpers'
import PaletteMappedVertexColorMeshMaterial from '~/materials/PaletteMappedVertexColorMeshMaterial'
import Object2D from '~/meshes/Object2D'
import { UI } from '~/scenes/ui'
import { Easing } from '~/systems/animation/Easing'
import { simpleTweener } from '~/systems/animation/tweeners'
import * as textOptions from '~/systems/text/TextOptions'
import UITextMesh from '~/systems/text/UITextMesh'
import { waitForNextFrame } from '~/utils/onNextFrame'
import { createButtonText } from '~/utils/ui'

import { BaseTestScene } from './BaseTestScene'
const SPEECHBUBBLE_FADE_DURATION = 200
const textWidth = 224
const bubbleMargin = 10
const animationCharactersPerSecond = 5

class TestAnimatedTextScene extends BaseTestScene {
  testMaterial: PaletteMappedVertexColorMeshMaterial
  async initUI(ui: UI) {
    await getAssetsManager().loadAsset('uiSmall')

    const container = ui.getContainer('randomTests')
    await container.ready
    const c = container

    await delayPromise(5000)

    async function showSpeechBubble(message: MessageStep, pin: Pin) {
      const container = new Object2D()
      container.matrix.setConstraints(
        new SizePin(0.1, 0.1, 1, 'y', -10, -10),
        ReadonlyPin.Center,
        pin
      )
      c.add(container)
      const bg = getAssetsManager().fetchMeshDeepClone(
        'uiSmall',
        'info-box',
        true,
        true
      )
      listenToProperty(pin.x, 'offset', v => {
        const leftSide = v < renderMetrics.uiWidth * 0.75
        bg.matrix.setConstraints(
          undefined,
          leftSide ? ReadonlyPin.Left : ReadonlyPin.Right,
          leftSide ? ReadonlyPin.Right : ReadonlyPin.Left
        )
      })
      container.add(bg)

      const textMesh = new UITextMesh(
        [{ text: message.text, color: 0xc5b4f5 }],
        {
          ...textOptions.infoFlyoutBody,
          size: 22,
          vAlign: 'center',
          width: textWidth
        },
        undefined,
        undefined,
        undefined,
        textMesh => {
          const width = textWidth + bubbleMargin * 2
          const height = textMesh.height + bubbleMargin * 2

          bg.matrix.setConstraints(Pin.fromPixels(width, height))
        },
        undefined,
        animationCharactersPerSecond
      )
      textMesh.matrix.setConstraintsPosition(
        ReadonlyPin.Left.cloneOffset(bubbleMargin, 0)
      )
      bg.add(textMesh)
      bg.matrix.opacity = 0

      await waitForNextFrame()
      // Fade in Speech bubble
      await Promise.all([
        simpleTweener.to({
          description: 'speech bubble bg in',
          target: bg.matrix,
          propertyGoals: {
            opacity: 1
          },
          duration: SPEECHBUBBLE_FADE_DURATION,
          easing: Easing.Quartic.Out
        }).finished
      ])
      return container
    }

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

    const mStep: MessageStep = {
      type: 'message',
      text: 'MESSAGE IN HERE!!'
    }

    showSpeechBubble(mStep, new Pin(0.5, 0.5))

    createButtonText(
      button,
      `Random things to test text  with lots and lots and lotswith lots and 
      lots and lotswith lots and lots and lotswith lots and lots and lotswith lots and lots and lotswith lots and lots and lots`,
      undefined,
      undefined,
      undefined,
      animationCharactersPerSecond
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

    container.show()
    super.initUI(ui)
  }

  update(dt: number) {
    super.update(dt)
  }
}

export const scene = TestAnimatedTextScene
