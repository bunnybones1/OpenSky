import { Euler, Object3D, Quaternion, Vector3 } from 'three'

import { I2D, proto2DAdd, proto2DOnAdd, proto2DRemove } from '~/helpers/I2D'
import { maybeAddLayoutHelper } from '~/helpers/utils2D'

import Matrix2DUI from './Matrix2DUI'
export default class Object2D extends Object3D implements I2D {
  matrix = new Matrix2DUI()
  matrixWorld = new Matrix2DUI()
  modelViewMatrix = new Matrix2DUI()
  isI2D = true as const
  shouldRenderAsGroup = false
  isOpaque = false
  /**
   * @deprecated Mesh2D doesn't support setting position. Use `.matrix.setConstraintsPosition(...)` instead.
   */
  readonly position: Vector3

  /**
   * @deprecated Mesh2D doesn't support setting rotation.
   */
  readonly rotation: Euler

  /**
   * @deprecated Mesh2D doesn't support setting rotation.
   */
  readonly quaternion: Quaternion

  /**
   * @deprecated Mesh2D doesn't support setting scale.
   */
  readonly scale: Vector3

  remove(...object: Object3D[]): this {
    proto2DRemove.call(this)
    return super.remove(...object)
  }
  add(...object: Object3D[]): this {
    proto2DAdd(...object)
    return super.add(...object)
  }
  makeConstraintClone() {
    const clone = new Object2D()
    clone.matrix = this.matrix
    return clone
  }

  constructor(useLayoutHelper = true) {
    super()
    this.addEventListener('added', proto2DOnAdd.bind(this))

    if (useLayoutHelper) {
      maybeAddLayoutHelper(this)
    }
  }
}
