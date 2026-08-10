import { Color, Matrix3, Matrix4, Matrix4Tuple, Vector2, Vector3 } from 'three'

import { Pin, ReadonlyPin } from '~/helpers/LayoutHelpers'

const __preScale = new Vector2(1, 1)

const __colorThrough = new Matrix3()

const __tempVec2 = new Vector2()

export default class Matrix2DUI extends Matrix4 {
  setColor(color: Color, opacity = this.opacity) {
    this.setColorMatrix(color.r, 0, 0, 0, color.g, 0, 0, 0, color.b)
    this.opacity = opacity
  }
  unlockConstraints() {
    this.size = this.size.clone()
    this.offset = this.offset.clone()
    this.anchor = this.anchor.clone()
  }
  setConstraintsPosition(offset: Pin) {
    this.offset = offset
    this.size = ReadonlyPin.EmptySize.clone()
  }
  setColorRGB(r: number, g: number, b: number) {
    const te = this.colorMatrix.elements
    te[0] = r
    te[4] = g
    te[8] = b
  }
  constructor() {
    super()
    this.identity()
  }

  identity() {
    this.set(1, 1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0, 0, 1, 1)
    return this as unknown as Matrix4
  }
  size = ReadonlyPin.FullSize
  anchor = ReadonlyPin.Center
  offset = ReadonlyPin.Center
  prescale = __preScale.clone()
  colorMatrix = __colorThrough.clone()
  opacity = 1
  aspectMode: 'x' | 'y' | 'fit' | 'crop' | 'stretch' = 'stretch'

  /**
   * When accessed on a world matrix, returns the width of the object in clip space.
   */
  get clipSpaceSizeX() {
    return this.elements[0]
  }

  /**
   * When accessed on a world matrix, returns the height of the object in clip space.
   */
  get clipSpaceSizeY() {
    return this.elements[1]
  }

  /**
   * When accessed on a world matrix, returns the x position of the top left of the object in clip space.
   */
  get clipSpacePosX() {
    return this.elements[2]
  }

  /**
   * When accessed on a world matrix, returns the y position of the top left of the object in clip space.
   */
  get clipSpacePosY() {
    return this.elements[3]
  }

  getWidthInPixels() {
    const els = this.elements
    return els[0] / els[7]
  }

  getHeightInPixels() {
    const els = this.elements
    return els[1] / els[11]
  }

  getPixelWidth() {
    return this.elements[7]
  }

  getPixelHeight() {
    return this.elements[11]
  }

  setConstraints(
    size?: Pin,
    anchor?: Pin,
    offset?: Pin,
    prescale?: Vector2,
    colorMatrix?: Matrix3
  ) {
    if (size) {
      this.size = size
    }
    if (anchor) {
      this.anchor = anchor
    }
    if (offset) {
      this.offset = offset
    }
    if (prescale) {
      this.prescale = prescale
    }
    if (colorMatrix) {
      this.colorMatrix = colorMatrix
    }
  }
  //  x   y   z   w
  //  rr  rg  rb  m
  //  gr  gg  gb  n
  //  br  bg  bb  a
  set(
    sx: number,
    sy: number,
    tx: number,
    ty: number,
    rr: number,
    rg: number,
    rb: number,
    psx: number,
    gr: number,
    gg: number,
    gb: number,
    psy: number,
    br: number,
    bg: number,
    bb: number,
    a: number
  ) {
    const te = this.elements
    te[0] = sx
    te[1] = sy
    te[2] = tx
    te[3] = ty
    te[4] = rr
    te[5] = rg
    te[6] = rb
    te[7] = psx
    te[8] = gr
    te[9] = gg
    te[10] = gb
    te[11] = psy
    te[12] = br
    te[13] = bg
    te[14] = bb
    te[15] = a
    return this as unknown as Matrix4
  }

  clone() {
    return new Matrix4().fromArray(this.elements)
  }

  copy(m: Matrix4) {
    const te = this.elements
    const me = m.elements
    te[0] = me[0]
    te[1] = me[1]
    te[2] = me[2]
    te[3] = me[3]
    te[4] = me[4]
    te[5] = me[5]
    te[6] = me[6]
    te[7] = me[7]
    te[8] = me[8]
    te[9] = me[9]
    te[10] = me[10]
    te[11] = me[11]
    te[12] = me[12]
    te[13] = me[13]
    te[14] = me[14]
    te[15] = me[15]
    return this
  }

  copyPosition(m: Matrix4) {
    const te = this.elements,
      me = m.elements
    te[12] = me[12]
    te[13] = me[13]
    te[14] = me[14]
    return this as unknown as Matrix4
  }

  setFromMatrix3(m: Matrix3) {
    const me = m.elements
    this.set(
      me[0],
      me[3],
      me[6],
      0,
      me[1],
      me[4],
      me[7],
      0,
      me[2],
      me[5],
      me[8],
      0,
      0,
      0,
      0,
      1
    )
    return this as unknown as Matrix4
  }

  multiply(m: Matrix2DUI) {
    return this.multiplyMatrices(this, m)
  }

  premultiply(m: Matrix2DUI) {
    return this.multiplyMatrices(m, this)
  }

  multiplyMatrices(a: Matrix2DUI, b: Matrix2DUI) {
    if (!(a instanceof Matrix2DUI)) {
      this.copy(b)
      return this as unknown as Matrix4
    }

    //  sx  sy  tx  ty
    //  rr  rg  rb  psx
    //  gr  gg  gb  psy
    //  br  bg  bb  a

    const ae = a.elements
    const size = b.size
    const offset = b.offset
    const anchor = b.anchor
    const prescale = b.prescale
    const te = this.elements

    const plx = ae[0]
    const ply = ae[1]
    const pix = ae[2]
    const piy = 2.0 - ae[3]
    const psx = ae[7]
    const psy = ae[11]
    const sx = psx * prescale.x
    const sy = psy * prescale.y

    size.solve(plx, ply, psx, psy, __tempVec2)
    const lx = __tempVec2.x
    const ly = __tempVec2.y
    const ax = lx * anchor.x.scale + anchor.x.offset * sx
    const ay = ly * anchor.y.scale + anchor.y.offset * sx
    const tx = plx * offset.x.scale + offset.x.offset * psx
    const ty = ply * offset.y.scale + offset.y.offset * psy
    const ix = pix + tx - ax
    const iy = piy + ty - ay
    te[0] = lx
    te[1] = ly
    te[2] = ix
    te[3] = 2.0 - iy
    te[7] = sx
    te[11] = sy

    const b11 = ae[4],
      b12 = ae[8],
      b13 = ae[12]
    const b21 = ae[5],
      b22 = ae[9],
      b23 = ae[13]
    const b31 = ae[6],
      b32 = ae[10],
      b33 = ae[14]

    const cbe = b.colorMatrix.elements
    const a11 = cbe[0],
      a12 = cbe[3],
      a13 = cbe[6]
    const a21 = cbe[1],
      a22 = cbe[4],
      a23 = cbe[7]
    const a31 = cbe[2],
      a32 = cbe[5],
      a33 = cbe[8]
    te[4] = a11 * b11 + a12 * b21 + a13 * b31
    te[8] = a11 * b12 + a12 * b22 + a13 * b32
    te[12] = a11 * b13 + a12 * b23 + a13 * b33
    te[5] = a21 * b11 + a22 * b21 + a23 * b31
    te[9] = a21 * b12 + a22 * b22 + a23 * b32
    te[13] = a21 * b13 + a22 * b23 + a23 * b33
    te[6] = a31 * b11 + a32 * b21 + a33 * b31
    te[10] = a31 * b12 + a32 * b22 + a33 * b32
    te[14] = a31 * b13 + a32 * b23 + a33 * b33

    te[15] = ae[15] * b.opacity

    return this as unknown as Matrix4
  }

  setColorMatrix(
    rr = 1,
    rg = 0,
    rb = 0,
    gr = 0,
    gg = 1,
    gb = 0,
    br = 0,
    bg = 0,
    bb = 1
  ) {
    if (this.colorMatrix === __colorThrough) {
      this.colorMatrix = this.colorMatrix.clone()
    }
    const te = this.colorMatrix.elements
    te[0] = rr
    te[1] = rg
    te[2] = rb

    te[3] = gr
    te[4] = gg
    te[5] = gb

    te[6] = br
    te[7] = bg
    te[8] = bb
  }

  scale(v: Vector3) {
    const te = this.elements
    const x = v.x,
      y = v.y,
      z = v.z
    te[0] *= x
    te[4] *= y
    te[8] *= z
    te[1] *= x
    te[5] *= y
    te[9] *= z
    te[2] *= x
    te[6] *= y
    te[10] *= z
    te[3] *= x
    te[7] *= y
    te[11] *= z
    return this as unknown as Matrix4
  }

  setOpacity(opacity: number) {
    this.opacity = opacity
  }

  equals(matrix: Matrix4) {
    const te = this.elements
    const me = matrix.elements

    for (let i = 0; i < 16; i++) {
      if (te[i] !== me[i]) {
        return false
      }
    }

    return true
  }

  fromArray(array: number[], offset = 0) {
    for (let i = 0; i < 16; i++) {
      this.elements[i] = array[i + offset]
    }

    return this as unknown as Matrix4
  }

  toArray(array: number[] = [], offset: number = 0) {
    const te = this.elements
    array[offset] = te[0]
    array[offset + 1] = te[1]
    array[offset + 2] = te[2]
    array[offset + 3] = te[3]
    array[offset + 4] = te[4]
    array[offset + 5] = te[5]
    array[offset + 6] = te[6]
    array[offset + 7] = te[7]
    array[offset + 8] = te[8]
    array[offset + 9] = te[9]
    array[offset + 10] = te[10]
    array[offset + 11] = te[11]
    array[offset + 12] = te[12]
    array[offset + 13] = te[13]
    array[offset + 14] = te[14]
    array[offset + 15] = te[15]
    return array as Matrix4Tuple
  }

  /**
   * @deprecated Not supported.
   */
  multiplyScalar(): Matrix4 {
    throw new Error('No multiplyScalar.')
  }

  /**
   * @deprecated Not supported.
   */
  determinant() {
    return 1
  }

  /**
   * @deprecated Not supported.
   */
  transpose(): Matrix4 {
    throw new Error('No transpose.')
  }

  /**
   * @deprecated Not supported.
   */
  setPosition(): Matrix4 {
    throw new Error('No setPosition.')
  }

  /**
   * @deprecated Not supported.
   */
  invert(): Matrix4 {
    throw new Error('No invert.')
  }

  /**
   * @deprecated Not supported.
   */
  getMaxScaleOnAxis(): number {
    throw new Error('No getMaxScaleOnAxis.')
  }

  /**
   * @deprecated Not supported.
   */
  makeTranslation(): Matrix4 {
    throw new Error('No makeTranslation.')
  }

  /**
   * @deprecated Not supported.
   */
  makeRotationX(): Matrix4 {
    throw new Error('No makeRotationX.')
  }

  /**
   * @deprecated Not supported.
   */
  makeRotationY(): Matrix4 {
    throw new Error('No makeRotationY.')
  }

  /**
   * @deprecated Not supported.
   */
  makeRotationZ(): Matrix4 {
    throw new Error('No makeRotationZ.')
  }

  /**
   * @deprecated Not supported.
   */
  makeRotationAxis(): Matrix4 {
    throw new Error('No makeRotationAxis.')
  }

  /**
   * @deprecated Not supported.
   */
  makeScale(): Matrix4 {
    throw new Error('No makeScale.')
  }

  /**
   * @deprecated Not supported.
   */
  makeShear(): Matrix4 {
    throw new Error('No makeShear.')
  }

  /**
   * @deprecated Not supported.
   */
  compose(): Matrix4 {
    return this as unknown as Matrix4
  }

  /**
   * @deprecated Not supported.
   */
  decompose(): Matrix4 {
    throw new Error('No decompose.')
  }

  /**
   * @deprecated Not supported.
   */
  makePerspective(): Matrix4 {
    throw new Error('No makePerspective.')
  }

  /**
   * @deprecated Not supported.
   */
  makeOrthographic(): Matrix4 {
    throw new Error('No makeOrthographic.')
  }

  /**
   * @deprecated Not supported.
   */
  extractBasis(): Matrix4 {
    throw new Error('No extractBasis.')
  }

  /**
   * @deprecated Not supported.
   */
  makeBasis(): Matrix4 {
    throw new Error('No makeBasis.')
  }
  /**
   * @deprecated Not supported.
   */
  extractRotation(): Matrix4 {
    throw new Error('No extractRotation.')
  }

  /**
   * @deprecated Not supported.
   */
  makeRotationFromEuler(): Matrix4 {
    throw new Error('No makeRotationFromEuler.')
  }

  /**
   * @deprecated Not supported.
   */
  makeRotationFromQuaternion(): Matrix4 {
    throw new Error('No makeRotationFromQuaternion.')
  }

  /**
   * @deprecated Not supported.
   */
  lookAt(): Matrix4 {
    throw new Error('No lookAt.')
  }
}
