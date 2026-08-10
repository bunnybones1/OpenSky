import { Color } from 'three'

import { getAssetsManager } from '~/assets'
import {
  COLOR_NERFED_TEXT,
  COLOR_WHITE,
  RANK_SEGMENT_FILLED,
  RANK_SEGMENT_UNFILLED
} from '~/colors/colorLibrary'
import { ReadonlyPin } from '~/helpers/LayoutHelpers'
import RectangleMaterial from '~/materials/RectangleMaterial'
import FireCracker from '~/meshes/FireCracker'
import RectangleMesh from '~/meshes/RectangleMesh'
import { AnimatedBool } from '~/utils/AnimatedBool'

class StatusColorPack {
  constructor(
    public off: Color,
    public on: Color,
    public increasing: Color,
    public decreasing: Color
  ) {
    //
  }
}
let __sharedMaterial: RectangleMaterial | undefined
function __getSharedMaterial() {
  if (!__sharedMaterial) {
    __sharedMaterial = new RectangleMaterial({ forceTransparent: true })
  }
  return __sharedMaterial!
}

const flashColor = new Color(1, 1, 1)

const __defaultColors = new StatusColorPack(
  RANK_SEGMENT_UNFILLED,
  RANK_SEGMENT_FILLED,
  COLOR_WHITE,
  COLOR_NERFED_TEXT
)
const __workingColor = new Color(1, 1, 1)
export default class StatusSegment extends RectangleMesh {
  private _animatedTransition: AnimatedBool
  private _transitionColor: Color
  private _status = false
  async animateStatus(value: boolean, delay = 0) {
    this._transitionColor = value
      ? this._colors.increasing
      : this._colors.decreasing
    await this._animatedTransition.animateValue(
      true,
      undefined,
      undefined,
      delay
    )
    this._status = value
    if (value) {
      const fireCracker = new FireCracker(
        getAssetsManager().getAsset('particle'),
        fc => {
          fc.parent!.remove(fc)
        },
        32,
        20000,
        20000,
        500,
        0,
        flashColor
      )
      fireCracker.matrix.setConstraints(
        ReadonlyPin.FullSize.cloneOffset(60, 60)
      )

      this.add(fireCracker)
    }
    this._animatedTransition.animateValue(false)
  }
  constructor(
    initialValue = false,
    private _colors: StatusColorPack = __defaultColors
  ) {
    super(__getSharedMaterial())
    this._status = initialValue
    this.matrix.setColor(initialValue ? _colors.on : _colors.off)
    this._animatedTransition = new AnimatedBool(
      (v: number) => {
        __workingColor
          .copy(this._status ? this._colors.on : this._colors.off)
          .lerp(this._transitionColor, v)
        this.matrix.setColor(__workingColor)
      },
      false,
      150,
      undefined,
      400
    )
  }
}
