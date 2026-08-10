import { AdditiveBlending, Color, Object3D, Vector2 } from 'three'

import { hues } from '~/colors/colorHues'
import { makeHSL } from '~/colors/utils'
import { RENDER_ORDERS } from '~/constants'
import ScreenSpaceRingGlowingMesh from '~/meshes/ScreenSpaceRingGlowingMesh'
import ScreenSpaceTriLineMesh from '~/meshes/ScreenSpaceTriLineMesh'
import { Easing } from '~/systems/animation/Easing'
import { simpleTweener } from '~/systems/animation/tweeners'
import TextMesh from '~/systems/text/TextMesh'
import * as textOptions from '~/systems/text/TextOptions'
import { removeFromParent } from '~/utils/threeUtils'

interface ToolTipOptions {
  color: Color
  side: -1 | 1
  constantSizeOnScreen: boolean
  textOptions?: Partial<textOptions.TextOptions>
  innerThickness?: number
  outerThickness?: number
  radius?: number
  angle?: number
  offset?: Vector2
  prescale?: number
}

const __defaultOptions: ToolTipOptions = {
  color: makeHSL(hues._12_coolCyan, 0.8, 0.5),
  constantSizeOnScreen: true,
  side: 1,
  innerThickness: 2,
  outerThickness: 24,
  radius: 24,
  angle: 0,
  offset: new Vector2(),
  prescale: 1
}

export default class ToolTip extends Object3D {
  private _textMesh: TextMesh
  private _ring: ScreenSpaceRingGlowingMesh
  private _triLine: ScreenSpaceTriLineMesh
  constructor(
    text: string = 'Test Tooltip',
    options: Partial<ToolTipOptions> = __defaultOptions
  ) {
    super()
    const fullOptions = {
      ...__defaultOptions,
      ...options
    }
    const { side, color } = fullOptions
    const point2 = new Vector2(30 * side, -30).add(fullOptions.offset!)
    let triLine: ScreenSpaceTriLineMesh
    const extraX = side === 1 ? 12 : 0
    const textMesh = new TextMesh(
      text,
      {
        ...textOptions.tooltip,
        align: side === 1 ? 'left' : 'right',
        color,
        strokeColor: color,
        offset: point2,
        bakedOffset: new Vector2(extraX, -6),
        ...fullOptions.textOptions,
        constantSizeOnScreen: fullOptions.constantSizeOnScreen,
        prescale: fullOptions.prescale
      },
      undefined,
      undefined,
      undefined,
      tm => {
        if (triLine) {
          triLine.material.lineLength = (tm.width + extraX) * side
        }
      }
    )
    textMesh.material.depthTest = false
    textMesh.material.blending = AdditiveBlending
    textMesh.opacity = 0
    simpleTweener.to({
      description: 'show tooltip text',
      target: textMesh,
      propertyGoals: {
        opacity: 1
      },
      duration: 2000,
      delay: 1000
    })
    this.add(textMesh)

    const ring = new ScreenSpaceRingGlowingMesh(fullOptions)
    this.add(ring)
    triLine = new ScreenSpaceTriLineMesh({
      ...fullOptions,
      point1Radius: fullOptions.radius,
      point1: new Vector2(0, 0),
      point2,
      lineLength: (textMesh.width + extraX) * side,
      outerOpacity: 0.1,
      prescale: fullOptions.prescale
    })
    this.add(triLine)
    simpleTweener.to({
      description: 'grow triline',
      target: triLine.material,
      propertyGoals: {
        x2: triLine.material.x2 + 20 * side,
        y2: triLine.material.y2 + 10
      },
      easing: Easing.Quartic.Out,
      duration: 2000,
      delay: 1000
    })

    triLine.renderOrder = RENDER_ORDERS.text + 1
    ring.renderOrder = RENDER_ORDERS.text + 2

    this.add(textMesh)
    this._textMesh = textMesh
    this._triLine = triLine
    this._ring = ring
  }
  async hideAndDispose(duration: number = 400) {
    this._ring.material.progressSharpness = 2
    simpleTweener.to({
      description: 'hide tooltip ring',
      target: this._ring.material,
      propertyGoals: {
        progress: 0
      },
      duration
    })
    simpleTweener.to({
      description: 'hide tooltip text',
      target: this._textMesh,
      propertyGoals: {
        opacity: 0
      },
      duration
    })
    await simpleTweener.to({
      description: 'hide tooltip triline',
      target: this._triLine.material,
      propertyGoals: {
        opacity: 0
      },
      easing: Easing.Quartic.Out,
      duration
    }).finished
    removeFromParent(this)
  }
}
