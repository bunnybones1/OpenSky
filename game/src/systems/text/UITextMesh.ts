import { Euler, Object3D, Quaternion, Vector3 } from 'three'

import { I2D, proto2DAdd, proto2DOnAdd, proto2DRemove } from '~/helpers/I2D'
import { ReadonlyPin } from '~/helpers/LayoutHelpers'
import Matrix2DUI from '~/meshes/Matrix2DUI'

import TextMesh, { TextSegment } from './TextMesh'
import { TextMeshEffect } from './textMeshEffects'
import { TextOptions } from './TextOptions'

function __preprocessOptions(options?: TextOptions) {
  if (options) {
    options.scaleDownToPhysicalSize = false
    options.use2dMode = true
  }
  return options
}
export default class UITextMesh extends TextMesh implements I2D {
  isI2D = true as const
  shouldRenderAsGroup = false
  isVisual = true
  isOpaque = false
  matrix = new Matrix2DUI()
  matrixWorld = new Matrix2DUI()
  modelViewMatrix = new Matrix2DUI()

  /**
   * @deprecated UITextMesh doesn't support setting position. Use `.matrix.setConstraintsPosition(...)` instead.
   */
  readonly position: Vector3

  /**
   * @deprecated UITextMesh doesn't support setting rotation.
   */
  readonly rotation: Euler

  /**
   * @deprecated UITextMesh doesn't support setting rotation.
   */
  readonly quaternion: Quaternion

  /**
   * @deprecated UITextMesh doesn't support setting scale.
   */
  readonly scale: Vector3

  remove(...object: Object3D[]) {
    proto2DRemove.call(this)
    return super.remove(...object)
  }
  add(...object: Object3D[]): this {
    proto2DAdd(...object)
    return super.add(...object)
  }
  constructor(
    text: string | number | TextSegment[] = '',
    options: TextOptions,
    livePropObject?: any,
    livePropName?: string,
    textMeshEffect?: TextMeshEffect,
    onMeasurementsUpdated?: (mesh: UITextMesh) => void,
    optimizeRenderOrder: boolean = false,
    animationCharactersPerSecond?: number
  ) {
    super(
      text,
      __preprocessOptions(options),
      livePropObject,
      livePropName,
      textMeshEffect,
      onMeasurementsUpdated,
      optimizeRenderOrder,
      animationCharactersPerSecond
    )
    this.name = `text: "${text}"`
    this.matrix.size = ReadonlyPin.EmptySize
    const oldOnAdd = super.onAdd
    this.onAdd = () => {
      oldOnAdd.call(this)
      proto2DOnAdd.call(this)
    }
    this.addEventListener('added', proto2DOnAdd.bind(this))
  }
  set opacity(value: number) {
    this.matrix.opacity = value
  }
  get opacity() {
    return this.matrix.opacity
  }
}
