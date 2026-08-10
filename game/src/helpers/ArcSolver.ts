import { Plane, Vector3 } from 'three'

const __v1 = new Vector3()
const __v2 = new Vector3()
const __d31 = new Vector3()
const __d21 = new Vector3()
const __c1 = new Vector3()
const __c2 = new Vector3()
const __cross = new Vector3()
const __sample = new Vector3()
export class ArcSolver {
  readonly center = new Vector3()
  readonly plane = new Plane()
  private planeDirU = new Vector3()
  private planeDirV = new Vector3()
  private radius: number
  private angle: number
  constructor(
    readonly p1: Vector3,
    readonly p2: Vector3,
    readonly p3: Vector3
  ) {
    this.update()
  }
  update() {
    const p1 = this.p1
    const p2 = this.p2
    const p3 = this.p3
    const center = this.center
    __v1.subVectors(p1, p3)
    __v2.subVectors(p2, p3)
    __cross.crossVectors(__v1, __v2)
    const v1Len = __v1.lengthSq()
    const v2Len = __v2.lengthSq()
    const crossLen = __cross.lengthSq()
    __v2.multiplyScalar(v1Len)
    __v1.multiplyScalar(v2Len)
    __v2.sub(__v1)
    center.crossVectors(__v2, __cross)
    center.multiplyScalar(1.0 / (2.0 * crossLen))
    center.add(p3)

    this.plane.setFromCoplanarPoints(p1, p2, p3)

    __c1.subVectors(p1, center)
    __c2.subVectors(p3, center)

    __v1.subVectors(p1, p3)
    __v2.subVectors(p2, p3)

    __d31.subVectors(p3, p1)
    __d21.subVectors(p2, p1)

    this.radius = __c1.length()

    this.planeDirU.copy(__c1).normalize()
    const n = __d31.cross(__d21)
    this.planeDirV.copy(n.cross(__c1).normalize())

    this.angle = Math.acos(__c1.normalize().dot(__c2.normalize()))

    if (__d21.dot(__v2) > 0) {
      this.angle = Math.PI * 2 - this.angle
    }
  }
  sample(t: number) {
    const x = t * this.angle
    return __sample
      .copy(this.center)
      .add(this.planeDirU.clone().multiplyScalar(this.radius * Math.cos(x)))
      .add(this.planeDirV.clone().multiplyScalar(-this.radius * Math.sin(x)))
  }
}
