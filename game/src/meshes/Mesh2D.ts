import {
  BufferGeometry,
  Euler,
  Material,
  Mesh,
  Object3D,
  Quaternion,
  Vector3
} from 'three'

import { I2D, proto2DAdd, proto2DOnAdd, proto2DRemove } from '~/helpers/I2D'

import Matrix2DUI from './Matrix2DUI'
import Object2D from './Object2D'

export interface IDepthMaterial2D {
  /**
   * Used for manual depth changes & offsets, for interlacing 2d & 3d objects.
   */
  depth: number
  /**
   * Automatically assigned based on tree hierarchy.
   */
  depthOffset: number
  /**
   * Sum of depth & depthOffset
   */
  getFinalDepth(): number
}
export type DepthMaterial2D = IDepthMaterial2D & Material
export default class Mesh2D<
    TGeometry extends BufferGeometry = BufferGeometry,
    TMaterial extends DepthMaterial2D = DepthMaterial2D
  >
  extends Mesh<TGeometry, TMaterial>
  implements I2D
{
  useLayoutHelper = true
  isI2D = true as const
  shouldRenderAsGroup = false
  isVisual = true
  isOpaque = false
  matrix = new Matrix2DUI()
  matrixWorld = new Matrix2DUI()
  modelViewMatrix = new Matrix2DUI()
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

  remove(...object: Object3D[]) {
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
  constructor(geometry?: TGeometry, material?: TMaterial) {
    super(geometry, material)
    this.addEventListener('added', proto2DOnAdd.bind(this))
    this.frustumCulled = false
  }
}
