import { Object3D } from 'three'

export function fastMatrixWorldUpdate(node: Object3D) {
  node.matrixWorld.multiplyMatrices(node.parent!.matrixWorld, node.matrix)
}
