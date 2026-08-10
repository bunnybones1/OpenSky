import { Euler, Matrix4, Quaternion, Vector3 } from 'three'

export function mat4Blend(dst: Matrix4, a: Matrix4, b: Matrix4, amt: number) {
  const dstElems = dst.elements
  const aElems = a.elements
  const bElems = b.elements
  const t = dst.elements.length
  const invAmt = 1 - amt
  for (let i = 0; i < t; i++) {
    dstElems[i] = aElems[i] * invAmt + bElems[i] * amt
  }
  return dst
}

const __tempQuat = new Quaternion()
const __tempEuler = new Euler()
export function getTempQuatFromEuler(
  x: number,
  y: number,
  z: number,
  order: string = 'XYZ'
) {
  __tempEuler.order = order
  __tempEuler.set(x, y, z)
  __tempQuat.setFromEuler(__tempEuler)
  return __tempQuat
}

export function getQuatFromEuler(x: number, y: number, z: number) {
  return getTempQuatFromEuler(x, y, z).clone()
}

export function vec3HasNaN(vec: Vector3) {
  return isNaN(vec.x) || isNaN(vec.y) || isNaN(vec.z)
}

export function addTranslationToMatrixFast(
  mat: Matrix4,
  vec: Vector3,
  amt: number
) {
  const el = mat.elements
  el[12] += vec.x * amt
  el[13] += vec.y * amt
  el[14] += vec.z * amt
}
