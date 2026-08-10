import { Matrix4, Object3D } from 'three'

export function wrapMatrixUpdateWithScroller(obj: Object3D, mat4: Matrix4) {
  obj.updateMatrix = function wrappedUpdateMatrix() {
    Object3D.prototype.updateMatrix.call(obj)
    obj.matrix.multiply(mat4)
  }
}

export function unwrapMatrixUpdateWithScroller(obj: Object3D) {
  obj.updateMatrix = Object3D.prototype.updateMatrix
}
