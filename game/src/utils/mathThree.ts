import { rand } from '@opensky/shared/utils/math'
import { Euler, Quaternion, Vector3 } from 'three'

const quat = new Quaternion()
const euler = new Euler()
export function rotToQuat(x: number, y: number, z: number) {
  quat.setFromEuler(euler.set(x, y, z))
  return quat.clone()
}

export function create3DLocationGrid(size = 1, unitsPerDim = 3, bias: Vector3) {
  const locations: Vector3[] = []
  function adj(v: number) {
    return ((v + 0.5) / unitsPerDim - 0.5) * size
  }
  for (let ix = 0; ix < unitsPerDim; ix++) {
    for (let iy = 0; iy < unitsPerDim; iy++) {
      for (let iz = 0; iz < unitsPerDim; iz++) {
        locations.push(new Vector3(adj(ix), adj(iy), adj(iz)).divide(bias))
      }
    }
  }
  locations.sort((a, b) => a.lengthSq() - b.lengthSq())
  for (const v of locations) {
    v.multiply(bias)
  }
  return locations
}

const __tempRandomVector = new Vector3()
const __totalRandomVectors = 2000
const __randomUnitVectorData = new Float32Array(__totalRandomVectors * 3)
for (let i = 0; i < __totalRandomVectors; i++) {
  __tempRandomVector.set(rand(-1, 1), rand(-1, 1), rand(-1, 1)).normalize()
  __tempRandomVector.toArray(__randomUnitVectorData, i * 3)
}
let randomVectorDataCursor = 0

export function getFastRandomUnitVector() {
  randomVectorDataCursor = (randomVectorDataCursor + 1) % __totalRandomVectors
  return __tempRandomVector.fromArray(
    __randomUnitVectorData,
    randomVectorDataCursor * 3
  )
}

const __totalRandomNumbers = 2000
const __randomUnitNumberData = new Float32Array(__totalRandomNumbers)
for (let i = 0; i < __totalRandomNumbers; i++) {
  __randomUnitNumberData[i] = rand(0, 1)
}
let randomNumberDataCursor = 0

export function getFastRandomNumber() {
  randomNumberDataCursor = (randomNumberDataCursor + 1) % __totalRandomNumbers
  return __randomUnitNumberData[randomNumberDataCursor]
}

const __totalRandomAngles = 2000
const __tau = Math.PI * 2
const __randomUnitAngleData = new Float32Array(__totalRandomAngles)
for (let i = 0; i < __totalRandomAngles; i++) {
  __randomUnitAngleData[i] = rand(0, __tau)
}
let randomAngleDataCursor = 0

export function getFastRandomAngle() {
  randomAngleDataCursor = (randomAngleDataCursor + 1) % __totalRandomAngles
  return __randomUnitAngleData[randomAngleDataCursor]
}
