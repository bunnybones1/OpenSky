import { Color, Matrix4, Mesh, Object3D, Vector3 } from 'three'

import queryParams from '~/queryParams'
import { makeBallHelper } from '~/utils/threeUtils'

import { ArcSolver } from './ArcSolver'

export class ArcHelper extends Object3D {
  p1 = new Vector3(-1, 0, 0)
  p2 = new Vector3(0, 0.5, 0)
  p3 = new Vector3(1, 0, 0)
  balls: Mesh[] = []
  private arc = new ArcSolver(this.p1.clone(), this.p2.clone(), this.p3.clone())
  updateMatrixWorld(force: boolean) {
    super.updateMatrixWorld(force)
    this.arc.p1.copy(this.p1).applyMatrix4(this.matrixWorld)
    this.arc.p2.copy(this.p2).applyMatrix4(this.matrixWorld)
    this.arc.p3.copy(this.p3).applyMatrix4(this.matrixWorld)
    this.arc.update()
    this.balls.forEach((b, i) => {
      b.position.copy(this.arc.sample(i / this.balls.length))
      b.applyMatrix4(__mat.copy(this.matrixWorld).invert())
    })
  }
  sample(t: number) {
    return this.arc.sample(t)
  }
  constructor() {
    super()
    if (queryParams.debugArcHelpers) {
      for (let i = 0; i < 1; i += 0.01) {
        const ball = makeBallHelper(0.001, new Color(~(0xff0000 * i)))
        this.balls.push(ball)
        this.add(ball)
      }
    }
  }
}

const __mat = new Matrix4()
