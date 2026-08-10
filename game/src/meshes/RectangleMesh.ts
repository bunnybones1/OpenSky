import { BufferGeometry } from 'three'

import RectangleMaterial from '~/materials/RectangleMaterial'
import { getSharedRectangle2DBufferGeometry } from '~/utils/geometry'

import Mesh2D from './Mesh2D'

export default class RectangleMesh extends Mesh2D<
  BufferGeometry,
  RectangleMaterial
> {
  constructor(mat: RectangleMaterial, yRatio = 1) {
    super(getSharedRectangle2DBufferGeometry(yRatio), mat)
  }
}
