import { rand } from '@opensky/shared/utils/math'
import { Quaternion, Vector3 } from 'three'

import { getFastRandomUnitVector } from '~/utils/mathThree'

export type MissileParticlePathMaker = (
  position: Vector3,
  direction: Vector3,
  orientation: Quaternion,
  outStart: Vector3,
  outHandle: Vector3,
  outEnd: Vector3
) => void
const __tempVec3b = new Vector3()
const __tempNormal = new Vector3()
const __origin = new Vector3()

type QuadraticMissileParticleCurveModifier = (
  inPosition: Vector3,
  inVelocity: Vector3,
  inOrientation: Quaternion,
  outStart: Vector3,
  outHandle: Vector3,
  outEnd: Vector3
) => void

const startAtStart: QuadraticMissileParticleCurveModifier = function (
  p,
  v,
  o,
  os,
  oh,
  oe
) {
  os.copy(p)
  oh.copy(p)
  oe.copy(p)
}
const moveStartBack: (amt: number) => QuadraticMissileParticleCurveModifier =
  function (amt = 0.6) {
    return function (p, v, o, os, oh, oe) {
      os.lerp(oe, amt)
    }
  }
const __tempVel = new Vector3()
const translateRelativeToVelocity: (
  amt: number
) => QuadraticMissileParticleCurveModifier = function (amt = 0.6) {
  return function (p, v, o, os, oh, oe) {
    __tempVel.copy(v).multiplyScalar(amt)
    os.add(__tempVel)
    oh.add(__tempVel)
    oe.add(__tempVel)
  }
}
const moveHandleToStart: QuadraticMissileParticleCurveModifier = function (
  p,
  v,
  o,
  os,
  oh,
  _oe
) {
  oh.copy(os)
}
const expandLikeUmbrella: (
  amt: number
) => QuadraticMissileParticleCurveModifier = amt => {
  const myExpandHandleOut = expandHandleOut(amt)
  return function (p, v, o, os, oh, oe) {
    __tempVec3b.copy(oe).sub(os)
    myExpandHandleOut(p, v, o, os, oh, oe)
    oe.copy(oh).add(__tempVec3b)
    __tempVec3b.copy(oe).sub(oh)
    oh.sub(__tempVec3b)
  }
}
const shootForward: (
  amt: number,
  tightness?: number
) => QuadraticMissileParticleCurveModifier = (amt, tightness = 10) =>
  function (p, v, o, os, oh, oe) {
    __tempNormal.copy(getFastRandomUnitVector())
    __tempNormal.z += tightness
    __tempNormal.normalize().multiplyScalar(amt)
    __tempNormal.applyQuaternion(o)
    oh.add(__tempNormal)
    oe.add(__tempNormal)
  }
const drift: (
  translation: Vector3
) => QuadraticMissileParticleCurveModifier = translation =>
  function (p, v, o, os, oh, oe) {
    oh.add(translation)
    oe.add(translation)
    oe.add(translation)
  }
const addBuoyancy: (
  amt: number
) => QuadraticMissileParticleCurveModifier = amt =>
  function (p, v, o, os, oh, oe) {
    oe.y += amt
  }
const addWind: (
  wind: Vector3
) => QuadraticMissileParticleCurveModifier = wind =>
  function (p, v, o, os, oh, oe) {
    oe.add(wind)
  }
const gravitate: (
  radius: number
) => QuadraticMissileParticleCurveModifier = radius => {
  const expand = expandStartOut(radius)
  return function (p, v, o, os, oh, oe) {
    __tempVec3b.copy(os)
    expand(p, v, o, os, oh, oe)
    oh.copy(__tempVec3b)
  }
}
const __tempVec3 = new Vector3()
const expandHandleOut: (
  amt: number
) => QuadraticMissileParticleCurveModifier = amt =>
  function (p, v, o, os, oh, oe) {
    __tempNormal.copy(os).sub(oe).normalize()
    __tempVec3
      .crossVectors(__tempNormal, getFastRandomUnitVector())
      .multiplyScalar(amt)

    oh.add(__tempVec3)
  }
const diffuse: (
  size: Vector3,
  offset?: Vector3
) => QuadraticMissileParticleCurveModifier = (size, offset = __origin) =>
  function (p, v, o, os, oh, oe) {
    __tempVec3
      .copy(getFastRandomUnitVector())
      .multiply(size)
      .multiplyScalar(1 - rand(0, 1) * rand(0, 1))
      .add(offset)
      .applyQuaternion(o)
    os.add(__tempVec3)
    oh.add(__tempVec3)
    oe.add(__tempVec3)
  }

const expandStartOut: (
  amt: number
) => QuadraticMissileParticleCurveModifier = amt =>
  function (p, v, o, os, oh, oe) {
    __tempNormal.copy(os).sub(oe).normalize()
    __tempVec3
      .crossVectors(__tempNormal, getFastRandomUnitVector())
      .normalize()
      .multiplyScalar(amt)

    os.add(__tempVec3)
  }

const reverseFlow: QuadraticMissileParticleCurveModifier = function (
  p,
  v,
  o,
  os,
  oh,
  oe
) {
  __tempVec3.copy(oe)
  oe.copy(os)
  os.copy(__tempVec3)
}
const __defaultStack: QuadraticMissileParticleCurveModifier[] = [
  startAtStart,
  shootForward(0.1, 4),
  addBuoyancy(0.1),
  expandHandleOut(0.01)
  // reverseFlow
]

function getPathMaker(
  stack: QuadraticMissileParticleCurveModifier[] = __defaultStack
) {
  function makePath(
    inPosition: Vector3,
    inVelocity: Vector3,
    inOrientation: Quaternion,
    outStart: Vector3,
    outHandle: Vector3,
    outEnd: Vector3
  ) {
    for (const f of stack) {
      f(inPosition, inVelocity, inOrientation, outStart, outHandle, outEnd)
    }
  }
  return makePath
}

const gpm = getPathMaker

const simpleFluffyArc = gpm()

const missileParticlePathMakerLib = {
  simpleFluffyArc,
  smoke: gpm([
    startAtStart,
    shootForward(0.1, 3),
    addBuoyancy(0.15),
    expandHandleOut(0.01)
  ]),
  missile: gpm(),
  missile2: gpm([
    startAtStart,
    shootForward(-0.1, 4),
    // addBuoyancy(0.1),
    moveHandleToStart,
    expandStartOut(0.2)
  ]),
  fireTrail: gpm([
    startAtStart,
    translateRelativeToVelocity(2),
    shootForward(-0.1, 4),
    moveHandleToStart,
    // expandStartOut(0.015),
    expandHandleOut(0.01),
    reverseFlow,
    // addBuoyancy(0.02),
    moveStartBack(0.4)
  ]),
  fireHead: gpm([
    startAtStart,
    translateRelativeToVelocity(2),
    shootForward(0.01, 4),
    expandLikeUmbrella(0.03)
  ]),
  fireExplosion: gpm([
    startAtStart,
    shootForward(0.1, 1),
    expandHandleOut(0.05),
    addBuoyancy(0.02)
  ]),
  fireGather: gpm([
    startAtStart,
    shootForward(0.15, 1),
    expandHandleOut(0.05),
    addBuoyancy(0.02),
    reverseFlow
  ]),
  fireGatherBig: gpm([
    startAtStart,
    shootForward(0.5, 1),
    expandHandleOut(0.05),
    addBuoyancy(0.02),
    reverseFlow
  ]),
  sparks: gpm([
    startAtStart,
    shootForward(0.14, 8),
    addBuoyancy(-0.05)
    // expandHandleOut(0.01)
  ]),
  sparks2: gpm([
    startAtStart,
    shootForward(0.08, 1.8),
    addBuoyancy(-0.05)
    // expandHandleOut(0.01)
  ]),
  sparks3: gpm([
    startAtStart,
    shootForward(0.03, 1.5),
    addBuoyancy(-0.01),
    diffuse(new Vector3(0.01, 0.01, 0.04), new Vector3(0, 0, 0.02)),
    reverseFlow
    // expandHandleOut(0.01)
  ]),
  sparksFloating: gpm([
    startAtStart,
    shootForward(-0.1, 1.5),
    addBuoyancy(0.04),
    diffuse(new Vector3(0.01, 0.01, 0.01), new Vector3(0, 0, 0.005)),
    addWind(new Vector3(-0.1, 0, 0))
    // reverseFlow
    // expandHandleOut(0.01)
  ]),
  sparkExplosion: gpm([
    startAtStart,
    shootForward(0.15, 1),
    addBuoyancy(0.04),
    diffuse(new Vector3(0.01, 0.01, 0.01), new Vector3(0, 0, 0.005)),
    addWind(new Vector3(-0.1, 0, 0))
    // reverseFlow
    // expandHandleOut(0.01)
  ]),
  smokeFloating: gpm([
    startAtStart,
    shootForward(-0.01, 1.5),
    addBuoyancy(0.01),
    diffuse(new Vector3(0.01, 0.01, 0.01), new Vector3(0, 0, 0.005)),
    addWind(new Vector3(-0.04, 0, 0))
    // reverseFlow
    // expandHandleOut(0.01)
  ]),
  smokeExplosion: gpm([
    startAtStart,
    shootForward(0.1, 1),
    addBuoyancy(0.01),
    diffuse(new Vector3(0.01, 0.01, 0.01), new Vector3(0, 0, 0.005)),
    addWind(new Vector3(-0.04, 0, 0))
    // reverseFlow
    // expandHandleOut(0.01)
  ]),
  sparkField: gpm([
    startAtStart,
    diffuse(new Vector3(0.5, 0.2, 0.5)),
    drift(new Vector3(-0.2, -0.03, 0))
    // expandHandleOut(0.01)
  ]),
  sparkSinkhole: gpm([
    startAtStart,
    drift(new Vector3(0, -0.2, 0)),
    gravitate(0.5)
    // reverseFlow,
    // expandHandleOut(0.01)
  ]),
  lifeTrail: gpm([
    startAtStart,
    // translateRelativeToVelocity(2),
    shootForward(0.2, 4),
    moveHandleToStart,
    // expandStartOut(0.015),
    expandHandleOut(0.01),
    addBuoyancy(-0.04),
    reverseFlow,
    moveStartBack(0.4)
  ]),
  lifeGather: gpm([
    startAtStart,
    shootForward(0.15, 1),
    expandHandleOut(0.05),
    addBuoyancy(0.02),
    reverseFlow
  ]),
  lifeExplosion: gpm([
    startAtStart,
    shootForward(0.1, 1),
    expandHandleOut(0.05),
    addBuoyancy(0.02)
  ]),
  default: simpleFluffyArc
}

export default missileParticlePathMakerLib
