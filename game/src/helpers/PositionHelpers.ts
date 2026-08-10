import { Object3D, Vector3 } from 'three'

export interface PositionHelper extends Object3D {
  sample: (t: number) => Vector3
}

export class ObjPosHelper extends Object3D implements PositionHelper {
  sample() {
    return this.position
  }
}
