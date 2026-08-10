import { delayPromise } from '@opensky/shared/utils/async'
import { Color, Texture, Vector2 } from 'three'

import { getAssetsManager } from '~/assets'
import { COLOR_BLACK, COLOR_WHITE } from '~/colors/colorLibrary'
import { SPEECH_BUBBLE_PRESCALE } from '~/constants'
import { Pin, ReadonlyPin } from '~/helpers/LayoutHelpers'
import RectangleMaterial from '~/materials/RectangleMaterial'
import Mesh2D from '~/meshes/Mesh2D'
import Object2D from '~/meshes/Object2D'
import RectangleMesh from '~/meshes/RectangleMesh'
import { Easing } from '~/systems/animation/Easing'
import { simpleTweener } from '~/systems/animation/tweeners'
import * as textOptions from '~/systems/text/TextOptions'
import UITextMesh from '~/systems/text/UITextMesh'
import { makeInteractive } from '~/utils/makeInteractive'
import { getTempTexture } from '~/utils/tempTexture'
import { safelyResetFlipY } from '~/utils/textureUtils'
const MARGIN = 6

const ORIGINAL_SIZE = new Vector2(127, 51)
const ORIGINAL_MARGIN = new Vector2(
  ORIGINAL_SIZE.x * 0.5,
  ORIGINAL_SIZE.y * 0.5
)

function makeSpeechBubbleVisuals(
  data: { label: string } | { stickerUrl: string } | { icon: string },
  tailDir: TailDirection = 'left',
  onMeasurementsChanged?: (size: Vector2, offset: Vector2) => void
): Object2D {
  const speechBubble =
    'stickerUrl' in data
      ? new Mesh2D()
      : getAssetsManager().fetchMeshDeepClone(
          'uiSmall',
          `${
            tailDir === 'left' || tailDir === 'right' ? 'speech' : 'icon'
          }-bubble-tail-${tailDir}`,
          true,
          true
        )
  speechBubble.matrix.setConstraints(new Pin(0, 0, 60, 60))

  if ('stickerUrl' in data) {
    const stickerMesh = new RectangleMesh(
      new RectangleMaterial({
        map: getTempTexture(),
        forceTransparent: true
      })
    )

    getAssetsManager()
      .load('textureSmall', data.stickerUrl)
      .then(tex => {
        const texture = tex as Texture
        safelyResetFlipY(texture)
        stickerMesh.material.uniforms.mapTexture.value = texture
      })
    stickerMesh.matrix.setConstraints(
      new Pin(1, 1, 15, 15),
      ReadonlyPin.Center,
      ReadonlyPin.Center
    )
    speechBubble.add(stickerMesh)
  } else if ('label' in data) {
    const textMesh = new UITextMesh(
      data.label,
      { ...textOptions.emoteBubbleText, color: COLOR_BLACK },
      undefined,
      undefined,
      undefined,
      tm => {
        const size = new Vector2(
          Math.max(ORIGINAL_SIZE.x, tm.width + ORIGINAL_MARGIN.x) + MARGIN,
          tm.height + ORIGINAL_SIZE.y * 0.4 + MARGIN
        )
        speechBubble.matrix.setConstraints(
          Pin.fromPixels(
            size.x * SPEECH_BUBBLE_PRESCALE,
            size.y * SPEECH_BUBBLE_PRESCALE
          )
        )

        const offset = new Vector2(
          -Math.max(tm.width, ORIGINAL_MARGIN.x) * 0.5,
          -Math.max(tm.height, ORIGINAL_MARGIN.y) * 0.5
        )

        if (onMeasurementsChanged) {
          onMeasurementsChanged(size, offset)
        }
      }
    )
    textMesh.material.depth = 0.95
    speechBubble.add(textMesh)
  }
  if ('icon' in data) {
    speechBubble.matrix.setConstraints(
      new Pin(0, 0, 70, 50),
      ReadonlyPin.Center,
      ReadonlyPin.Center
    )
    // icon-back icon-stickers
    const iconMesh = getAssetsManager().fetchMeshDeepClone(
      'uiSmall',
      `icon-${data.icon}`
    )
    iconMesh.matrix.setConstraints(
      ReadonlyPin.EmptySize,
      ReadonlyPin.Center,
      ReadonlyPin.Center,
      new Vector2(2, 2)
    )
    speechBubble.add(iconMesh)
  }

  speechBubble.matrix.prescale = new Vector2(
    SPEECH_BUBBLE_PRESCALE,
    SPEECH_BUBBLE_PRESCALE
  )

  speechBubble.shouldRenderAsGroup = true
  speechBubble.material.depth = 0.95

  return speechBubble
}

export type TailDirection = 'left' | 'right' | 'center' | 'none'

export function makeInteractiveSpeechBubble(
  data: { label: string } | { stickerUrl: string } | { icon: string },
  tailDir: TailDirection = 'left',
  onSelect?: () => void
): Object2D {
  const obj2D = makeSpeechBubbleVisuals(data, tailDir, undefined)
  const originalSize = obj2D.matrix.size.clone()
  const originalPrescale = obj2D.matrix.prescale.clone()
  const bigPrescale = new Vector2(
    originalPrescale.x + 0.1,
    originalPrescale.y + 0.1
  )
  const sizeIncrease = 15
  const sizeRatio = originalSize.y.offset / originalSize.x.offset
  const colorChange = new Color(1.1, 1.1, 1.05)
  const workingColor = new Color(1.3, 1.3, 1.2)
  const animVal = { value: 0.001 }
  const onUpdate = () => {
    obj2D.matrix.size.x.offset =
      originalSize.x.offset + animVal.value * sizeRatio * sizeIncrease
    obj2D.matrix.size.y.offset =
      originalSize.y.offset + animVal.value * sizeRatio * sizeIncrease
    obj2D.matrix.prescale.lerpVectors(
      originalPrescale,
      bigPrescale,
      animVal.value
    )
    workingColor.lerpColors(COLOR_WHITE, colorChange, animVal.value)
    obj2D.matrix.setColor(workingColor)
  }
  makeInteractive(obj2D, {
    cursor: 'pointer',
    onSelect,
    onOver: async () => {
      simpleTweener.to({
        description: 'open sticker emote',
        target: animVal,
        propertyGoals: { value: 1 },
        duration: 100,
        easing: Easing.Quadratic.In,
        onUpdate
      }).finished
      await delayPromise(50)
    },
    onOut: () => {
      animVal.value = 1
      simpleTweener.to({
        description: 'open sticker emote',
        target: animVal,
        propertyGoals: { value: 0 },
        duration: 100,
        easing: Easing.Quadratic.In,
        onUpdate
      }).finished
    }
  })
  return obj2D
}
