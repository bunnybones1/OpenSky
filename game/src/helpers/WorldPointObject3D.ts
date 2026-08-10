import { Object3D, Vector3 } from 'three'

export class WorldPointObject3D extends Object3D {
  worldPosition = new Vector3()
  updateMatrixWorld(force?: boolean | undefined): void {
    super.updateMatrixWorld(force)
    const te = this.matrixWorld.elements
    this.worldPosition.set(te[12], te[13], te[14])
  }
  updateWorldMatrix(updateParents: boolean, updateChildren: boolean): void {
    super.updateWorldMatrix(updateParents, updateChildren)
    const te = this.matrixWorld.elements
    this.worldPosition.set(te[12], te[13], te[14])
  }
}
