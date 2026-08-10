import { Vector3 } from 'three'

const __pc = new Vector3()
const __p2 = new Vector3()
function __getBezierPosition(
  t: number,
  p1: Vector3,
  pc: Vector3,
  p2: Vector3,
  result: Vector3
) {
  const it = 1.0 - t
  return result
    .copy(p1)
    .multiplyScalar(it * it)
    .add(
      __pc
        .copy(pc)
        .multiplyScalar(2.0 * it * t)
        .add(__p2.copy(p2).multiplyScalar(t * t))
    )
}

export default class QuadraticBezierCurveHelper {
  private _sample = new Vector3()
  constructor(
    private _p1: Vector3,
    private _handle: Vector3,
    private _p2: Vector3
  ) {
    //
  }

  sample(t: number) {
    __getBezierPosition(t, this._p1, this._handle, this._p2, this._sample)
    return this._sample
  }
}
