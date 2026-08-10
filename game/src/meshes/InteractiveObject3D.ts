import { Color, Object3D } from 'three'

import { hues } from '~/colors/colorHues'
import { addColor, makeHSL, screenColor } from '~/colors/utils'
import { Easing } from '~/systems/animation/Easing'
import { AnimatedBool } from '~/utils/AnimatedBool'
import { replaceObject3D } from '~/utils/threeUtils'

const __colorPlayable = makeHSL(hues._09_coolGreen, 0.8, 0.8)
const __colorHovered = makeHSL(hues._07_warmGreen, 0.8, 0.06)
const __colorSelected = new Color(0x7f7f00)
const __colorHolding = new Color(0x007f7f)
const __colorDragging = makeHSL(hues._04_warmYellow, 0.8, 0.8)

export default class InteractiveObject3D extends Object3D {
  get color() {
    return this._color
  }
  set colorPlayable(color: Color) {
    this._colorPlayable.copy(color)
    this.updateColor()
  }
  get colorPlayable() {
    return this._colorPlayable
  }
  get draggableSubstitute() {
    return this._draggableSubstitute
  }
  readonly playableState = new AnimatedBool(
    () => this.updateColor(),
    false,
    200
  )
  readonly holdingState = new AnimatedBool(() => this.updateColor(), false, 200)
  readonly draggingState = new AnimatedBool(
    v => this.updateDragging(v),
    false,
    100,
    undefined,
    300
  )
  readonly hoveringState = new AnimatedBool(
    () => this.updateColor(),
    false,
    50,
    undefined,
    100
  )
  readonly validTargets: this[] = []
  collider: Object3D
  protected _selectedState = new AnimatedBool(
    () => this.updateColor(),
    false,
    0,
    Easing.Exponential.Out,
    1000
  )
  protected _color: Color = new Color(0, 0, 0)
  protected _colorNormal: Color = new Color(0, 0, 0)
  protected _colorPlayable: Color = __colorPlayable.clone()
  protected _draggableSubstitute: Object3D | undefined
  constructor(
    obj3DToUpgrade: Object3D,
    public recenterOnDrag = true
  ) {
    super()
    this.name = obj3DToUpgrade.name
    this.visible = obj3DToUpgrade.visible
    this.renderOrder = obj3DToUpgrade.renderOrder
    replaceObject3D(obj3DToUpgrade, this)
    this.frustumCulled = false
  }
  select() {
    this._selectedState.pulse()
  }

  clone(): any {
    throw new Error('Not supported')
  }
  protected updateColor() {
    this._color.setRGB(0, 0, 0)
    addColor(this._color, this._colorPlayable, this.playableState.animatedValue)
    addColor(this._color, __colorHovered, this.hoveringState.animatedValue)
    addColor(this._color, __colorSelected, this._selectedState.animatedValue)
    addColor(this._color, __colorHolding, this.holdingState.animatedValue)
    addColor(this._color, __colorDragging, this.draggingState.animatedValue)
    screenColor(this._color, this._colorNormal)
  }
  protected updateDragging(_v: number) {
    this.updateColor()
  }
}
