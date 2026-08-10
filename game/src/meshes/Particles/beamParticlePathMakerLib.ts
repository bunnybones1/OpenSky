import { lerp, rand, rand2 } from '@opensky/shared/utils/math'
import { Quaternion, Vector3 } from 'three'

import { ARENA_ANGLE_QUAT } from '~/constants'
import QuadraticBezierCurveHelper from '~/helpers/QuadraticBezierCurveHelper'
import {
  getFastRandomAngle,
  getFastRandomNumber,
  getFastRandomUnitVector
} from '~/utils/mathThree'

export type BeamParticlePathMaker = (
  positionStart: Vector3,
  positionEnd: Vector3,
  orientation: Quaternion,
  outStart: Vector3,
  outHandle: Vector3,
  outEnd: Vector3
) => void
const __tempTarget = new Vector3()
const __tempDelta = new Vector3()
const __tempNormal = new Vector3()
const __origin = new Vector3()

type QuadraticBeamParticleCurveModifier = (
  inPositionStart: Vector3,
  inPositionEnd: Vector3,
  inOrientation: Quaternion,
  outStart: Vector3,
  outHandle: Vector3,
  outEnd: Vector3
) => void

const makeScaleByStart: (
  amt: number
) => QuadraticBeamParticleCurveModifier = amt =>
  function (ps, pe, o, os, oh, oe) {
    oe.lerp(os, 1 - amt)
    oh.lerp(os, 1 - amt)
  }

const connectStartToEnd: QuadraticBeamParticleCurveModifier = function (
  ps,
  pe,
  o,
  os,
  oh,
  oe
) {
  os.copy(ps)
  oh.copy(ps).lerp(pe, 0.5)
  oe.copy(pe)
}
const makeCircleSample: (
  radius: number
) => QuadraticBeamParticleCurveModifier = segAngle =>
  function (ps, pe, o, os, oh, oe) {
    const radius = 0.2375 // 0.23 for conquest
    const angle = getFastRandomAngle()
    __tempVec3.copy(ps).lerp(pe, 0.5)
    os.copy(__tempVec3)
    oe.copy(__tempVec3)
    os.x += Math.cos(angle) * radius
    os.z += Math.sin(angle) * radius
    oe.x += Math.cos(angle + segAngle) * radius
    oe.z += Math.sin(angle + segAngle) * radius
    oh.copy(os).lerp(oe, 0.5)
  }
const moveToRandomPoint: QuadraticBeamParticleCurveModifier = function (
  ps,
  pe,
  o,
  os,
  oh,
  oe
) {
  __tempTarget.copy(ps).lerp(pe, getFastRandomNumber())
  __tempDelta.copy(__tempTarget).sub(os)
  os.add(__tempDelta)
  oh.add(__tempDelta)
  oe.add(__tempDelta)
}
const normalizeDistanceToStart: (
  distance: number
) => QuadraticBeamParticleCurveModifier = distance =>
  function (p, v, o, os, oh, oe) {
    const eDist = oe.distanceTo(os)
    const amt = distance / eDist
    oe.lerp(os, 1 - amt)
    oh.lerp(os, 1 - amt)
  }
const normalizeDistanceToEnd: (
  distance: number
) => QuadraticBeamParticleCurveModifier = distance =>
  function (p, v, o, os, oh, oe) {
    const eDist = os.distanceTo(oe)
    const amt = distance / eDist
    os.lerp(oe, 1 - amt)
    oh.lerp(oe, 1 - amt)
  }
const moveToEnd: QuadraticBeamParticleCurveModifier = function (
  ps,
  pe,
  o,
  os,
  oh,
  oe
) {
  os.copy(oe)
  oh.copy(oe)
}
const moveToStart: QuadraticBeamParticleCurveModifier = function (
  ps,
  pe,
  o,
  os,
  oh,
  oe
) {
  oh.copy(os)
  oe.copy(os)
}
const moveEndToHandle: (
  amt: number
) => QuadraticBeamParticleCurveModifier = amt =>
  function (p, v, o, os, oh, oe) {
    oe.lerp(oh, amt)
  }
const moveStartToHandle: (
  amt: number
) => QuadraticBeamParticleCurveModifier = amt =>
  function (p, v, o, os, oh, _oe) {
    os.lerp(oh, amt)
  }
const shootForward: (
  amt: number,
  tightness?: number
) => QuadraticBeamParticleCurveModifier = (amt, tightness = 10) =>
  function (p, v, o, os, oh, oe) {
    __tempNormal.copy(getFastRandomUnitVector())
    __tempNormal.z += tightness
    __tempNormal.normalize().multiplyScalar(amt)
    __tempNormal.applyQuaternion(o)
    oh.add(__tempNormal)
    oe.add(__tempNormal)
  }

const crowdAroundStart: (
  amt: number
) => QuadraticBeamParticleCurveModifier = amt =>
  function (p, v, o, os, oh, oe) {
    oh.lerp(os, amt)
    oe.lerp(os, amt)
  }

const overshootEnd: (
  amt: number,
  tightness?: number
) => QuadraticBeamParticleCurveModifier = (amt, tightness = 10) =>
  function (p, v, o, os, oh, oe) {
    __tempNormal.copy(getFastRandomUnitVector())
    __tempNormal.z += tightness
    __tempNormal.normalize().multiplyScalar(amt)
    __tempNormal.applyQuaternion(o)
    moveToEnd(p, v, o, os, oh, oe)
    oh.add(__tempNormal)
    oe.add(__tempNormal)
    oe.add(__tempNormal)
  }

const overshootEndY: (
  amt: number,
  tightness?: number
) => QuadraticBeamParticleCurveModifier = (amt, tightness = 10) =>
  function (p, v, o, os, oh, oe) {
    __tempNormal.copy(getFastRandomUnitVector())
    __tempNormal.y += tightness
    __tempNormal.normalize().multiplyScalar(amt)
    __tempNormal.applyQuaternion(o)
    moveToEnd(p, v, o, os, oh, oe)
    oh.add(__tempNormal)
    oe.add(__tempNormal)
    oe.add(__tempNormal)
  }

const addBuoyancy: (amt: number) => QuadraticBeamParticleCurveModifier = amt =>
  function (p, v, o, os, oh, oe) {
    oe.y += amt
  }
const addArc: (amt: number) => QuadraticBeamParticleCurveModifier = amt =>
  function (p, v, o, os, oh, _oe) {
    oh.y += amt
  }
const addWind: (wind: Vector3) => QuadraticBeamParticleCurveModifier = wind =>
  function (p, v, o, os, oh, oe) {
    oe.add(wind)
  }

const __tempWind = new Vector3()
const addRandomWind: (
  strength: number
) => QuadraticBeamParticleCurveModifier = strength =>
  function (p, v, o, os, oh, oe) {
    const a = getFastRandomAngle()
    __tempWind.x = Math.cos(a) * strength
    __tempWind.z = Math.sin(a) * strength
    oe.add(__tempWind)
  }
const shrinkAroundHandle: (
  amt: number
) => QuadraticBeamParticleCurveModifier = amt =>
  function (p, v, o, os, oh, oe) {
    oe.lerp(oh, amt)
    os.lerp(oh, amt)
  }
const __tempVec3 = new Vector3()
const expandHandleOut: (
  amt: number
) => QuadraticBeamParticleCurveModifier = amt =>
  function (p, v, o, os, oh, oe) {
    __tempNormal.copy(os).sub(oe).normalize()
    __tempVec3
      .crossVectors(__tempNormal, getFastRandomUnitVector())
      .multiplyScalar(amt)

    oh.add(__tempVec3)
  }
const expandHandleAndEndOut: (
  amt: number
) => QuadraticBeamParticleCurveModifier = amt =>
  function (p, v, o, os, oh, oe) {
    __tempNormal.copy(os).sub(oe).normalize()
    __tempVec3
      .crossVectors(__tempNormal, getFastRandomUnitVector())
      .multiplyScalar(amt)

    oh.add(__tempVec3)
    oe.add(__tempVec3)
  }
const diffuse: (
  size: Vector3,
  offset?: Vector3
) => QuadraticBeamParticleCurveModifier = (size, offset = __origin) =>
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

const diffuseHandle: (
  size: Vector3
) => QuadraticBeamParticleCurveModifier = size =>
  function (p, v, o, os, oh, _oe) {
    __tempVec3
      .copy(getFastRandomUnitVector())
      .multiply(size)
      .multiplyScalar(1 - rand(0, 1) * rand(0, 1))
      .applyQuaternion(o)
    oh.add(__tempVec3)
  }

const diffuseEnd: (
  size: Vector3
) => QuadraticBeamParticleCurveModifier = size =>
  function (p, v, o, os, oh, oe) {
    __tempVec3
      .copy(getFastRandomUnitVector())
      .multiply(size)
      .multiplyScalar(1 - rand(0, 1) * rand(0, 1))
      .applyQuaternion(o)
    oe.add(__tempVec3)
  }

const translate: (
  offset: Vector3
) => QuadraticBeamParticleCurveModifier = offset =>
  function (p, v, o, os, oh, oe) {
    os.add(offset)
    oh.add(offset)
    oe.add(offset)
  }

const reverseFlow: QuadraticBeamParticleCurveModifier = function (
  ps,
  pe,
  o,
  os,
  oh,
  oe
) {
  __tempVec3.copy(oe)
  oe.copy(os)
  os.copy(__tempVec3)
}

const convertToSpray: (
  rangeMin?: number,
  rangeMax?: number,
  amt?: number,
  yUp?: boolean
) => QuadraticBeamParticleCurveModifier = (
  rangeMin = 0.12,
  rangeMax = 0.25,
  amt = 0.75,
  yUp = true
) =>
  function (p, v, o, os, oh, oe) {
    const distance = os.distanceTo(oe)
    __tempVec3.copy(getFastRandomUnitVector())
    if (yUp) {
      __tempVec3.y = Math.abs(__tempVec3.y)
    }
    __tempVec3.multiplyScalar(distance * rand2(rangeMin, rangeMax))
    os.copy(oe)
    oe.add(__tempVec3)
    oh.copy(os).lerp(oe, amt)
    oe.y = os.y
  }
const __defaultStack: QuadraticBeamParticleCurveModifier[] = [
  connectStartToEnd,
  shootForward(0.1, 4),
  addBuoyancy(0.1),
  expandHandleOut(0.01)
  // reverseFlow
]

const tiltRandomlyAroundStart: (
  amt: number
) => QuadraticBeamParticleCurveModifier = amt =>
  function (p, v, o, os, oh, oe) {
    __tempNormal.copy(os).sub(oe).normalize()
    __tempVec3
      .crossVectors(__tempNormal, getFastRandomUnitVector())
      .multiplyScalar(amt)

    oh.add(__tempVec3)
    __tempVec3.multiplyScalar(2)
    oe.add(__tempVec3)
  }
function getBeamPathMaker(
  stack: QuadraticBeamParticleCurveModifier[] = __defaultStack
) {
  function makePath(
    inPositionStart: Vector3,
    inPositionEnd: Vector3,
    inOrientation: Quaternion,
    outStart: Vector3,
    outHandle: Vector3,
    outEnd: Vector3
  ) {
    for (const f of stack) {
      f(
        inPositionStart,
        inPositionEnd,
        inOrientation,
        outStart,
        outHandle,
        outEnd
      )
    }
  }
  return makePath
}

const sweepArcAroundStart: (
  sweepDistance?: number,
  radialBias?: number,
  heightMin?: number,
  heightMax?: number,
  handleAmplify?: number,
  omniDirectional?: boolean
) => QuadraticBeamParticleCurveModifier = function (
  sweepDistance = 0.2,
  radialBias = 0.5,
  heightMin = 0,
  heightMax = 0,
  handleAmplify = 1,
  omniDirectional = false
) {
  return function (ps, pe, o, os, oh, oe) {
    const origDist = os.distanceTo(oe)
    const dist = lerp(
      origDist * (1 - Math.pow(1 - Math.random(), 2)),
      origDist,
      radialBias
    )
    const angleStart = rand(-Math.PI, Math.PI)
    const angleEnd =
      angleStart +
      (sweepDistance / dist) * (omniDirectional && Math.random() > 0.5 ? -1 : 1)
    const angleMid = lerp(angleStart, angleEnd, 0.5)
    const height = os.y + rand2(heightMin, heightMax)
    __tempVec3.copy(os)
    os.set(
      Math.cos(angleStart) * dist + __tempVec3.x,
      height,
      Math.sin(angleStart) * dist + __tempVec3.z
    )
    oh.set(
      Math.cos(angleMid) * dist * handleAmplify + __tempVec3.x,
      height,
      Math.sin(angleMid) * dist * handleAmplify + __tempVec3.z
    )
    oe.set(
      Math.cos(angleEnd) * dist + __tempVec3.x,
      height,
      Math.sin(angleEnd) * dist + __tempVec3.z
    )
  }
}

const rippleRing: (
  dist?: number,
  sweepDistance?: number,
  handleAmplify?: number,
  aspectRatio?: number,
  omniDirectional?: boolean,
  rotation?: Quaternion
) => QuadraticBeamParticleCurveModifier = function (
  dist = 0.045,
  sweepDistance = 0.1,
  handleAmplify = 1.2,
  aspectRatio = 1.3,
  omniDirectional = true,
  rotation = ARENA_ANGLE_QUAT
) {
  return function (ps, pe, o, os, oh, oe) {
    const angleStart = rand(-Math.PI, Math.PI)
    const angleEnd =
      angleStart +
      (sweepDistance / dist) * (omniDirectional && Math.random() > 0.5 ? -1 : 1)
    const angleMid = lerp(angleStart, angleEnd, 0.5)
    __tempVec3.copy(os)
    os.set(
      Math.cos(angleStart) * dist,
      0,
      Math.sin(angleStart) * dist * aspectRatio
    )
      .applyQuaternion(rotation)
      .add(__tempVec3)
    oh.set(
      Math.cos(angleMid) * dist * handleAmplify,
      0,
      Math.sin(angleMid) * dist * handleAmplify * aspectRatio
    )
      .applyQuaternion(rotation)
      .add(__tempVec3)
    oe.set(
      Math.cos(angleEnd) * dist,
      0,
      Math.sin(angleEnd) * dist * aspectRatio
    )
      .applyQuaternion(rotation)
      .add(__tempVec3)
  }
}
const positionOnRing: (
  dist?: number,
  aspectRatio?: number,
  rotation?: Quaternion
) => QuadraticBeamParticleCurveModifier = function (
  dist = 0.045,
  aspectRatio = 1.3,
  rotation = ARENA_ANGLE_QUAT
) {
  return function (ps, pe, o, os, oh, oe) {
    const angleStart = rand(-Math.PI, Math.PI)
    __tempVec3
      .set(
        Math.cos(angleStart) * dist,
        0,
        Math.sin(angleStart) * dist * aspectRatio
      )
      .applyQuaternion(rotation)
    os.add(__tempVec3)
    oh.add(__tempVec3)
    oe.add(__tempVec3)
  }
}
const scale: (amt: Vector3) => QuadraticBeamParticleCurveModifier = amt =>
  function (p, v, o, os, oh, oe) {
    os.multiply(amt)
    oh.multiply(amt)
    oe.multiply(amt)
  }
const straighten: (amt: number) => QuadraticBeamParticleCurveModifier = amt =>
  function (p, v, o, os, oh, oe) {
    __tempVec3.copy(os).lerp(oe, 0.5)
    oh.lerp(__tempVec3, amt)
  }
const stretchForward: (
  amt: number
) => QuadraticBeamParticleCurveModifier = amt =>
  function (p, v, o, os, oh, oe) {
    __tempVec3.copy(oh).sub(os).multiplyScalar(amt)
    oh.add(__tempVec3)
    __tempVec3.copy(oe).sub(os).multiplyScalar(amt)
    oe.add(__tempVec3)
  }
const scaleTowardsEnd: (
  amt: number
) => QuadraticBeamParticleCurveModifier = amt =>
  function (p, v, o, os, oh, oe) {
    os.lerp(oe, amt)
    oh.lerp(oe, amt)
  }
// const scalar: (amt: number) => QuadraticBeamParticleCurveModifier = amt => scale(new Vector3(amt, amt, amt))

function __rotateAAroundB(a: Vector3, b: Vector3, angleDelta: number) {
  const angle = Math.atan2(a.z - b.z, a.x - b.x) + angleDelta
  const dist = a.distanceTo(b)
  a.x = Math.cos(angle) * dist + b.x
  a.z = Math.sin(angle) * dist + b.z
}
const rotateDir90: QuadraticBeamParticleCurveModifier = function (
  p,
  v,
  o,
  os,
  oh,
  oe
) {
  __rotateAAroundB(os, oh, Math.PI * 0.5)
  __rotateAAroundB(oe, oh, Math.PI * 0.5)
}

const resampleCurve = (
  ratioS: number,
  ratioH: number,
  ratioE: number
): QuadraticBeamParticleCurveModifier => {
  const ts = new Vector3()
  const th = new Vector3()
  const te = new Vector3()
  const tCurve = new QuadraticBezierCurveHelper(ts, th, te)
  return function (p, v, o, os, oh, oe) {
    ts.copy(os)
    th.copy(oh)
    te.copy(oe)
    os.copy(tCurve.sample(ratioS))
    oh.copy(tCurve.sample(ratioH))
    oe.copy(tCurve.sample(ratioE))
  }
}

const gpm = getBeamPathMaker
const fullArc = gpm([connectStartToEnd, addArc(0.05)])

const beamParticlePathMakerLib = {
  fullArc,
  simplePath: gpm([connectStartToEnd, makeScaleByStart(0.05)]),
  chargeUpArc: gpm([
    connectStartToEnd,
    reverseFlow,
    convertToSpray(),
    reverseFlow
  ]),
  chargeUpStaticDust: gpm([
    connectStartToEnd,
    reverseFlow,
    convertToSpray(),
    addBuoyancy(0.1),
    reverseFlow,
    shrinkAroundHandle(0.75)
  ]),
  ricochetArc: gpm([connectStartToEnd, convertToSpray()]),
  blast: gpm([
    connectStartToEnd,
    shootForward(0.1, 3),
    crowdAroundStart(0.7),
    addArc(0.02),
    addBuoyancy(0.04)
  ]),
  metalSparksJumping: gpm([overshootEnd(-0.04, 1.5), addArc(0.03)]),
  smokeFloating: gpm([
    connectStartToEnd,
    overshootEnd(-0.05, 1.5),
    addBuoyancy(0.01),
    diffuse(new Vector3(0.01, 0.01, 0.01), new Vector3(0, 0, 0.005)),
    addWind(new Vector3(-0.04, 0, 0)),
    expandHandleOut(0.01)
  ]),
  elementalSoulFloat: gpm([
    connectStartToEnd,
    // overshootEnd(-0.05, 5),
    // addBuoyancy(0.06),
    // diffuse(new Vector3(0.01, 0.01, 0.01), new Vector3(0, 0, 0.005)),
    addWind(new Vector3(-0.01, 0.06, 0)),
    diffuseEnd(new Vector3(0.01, 0.01, 0.01))
  ]),
  evaporatingMagicSparks: gpm([
    connectStartToEnd,
    overshootEndY(0.0125, 2.5),
    addBuoyancy(0.005),
    diffuse(new Vector3(0.005, 0.005, 0.005), new Vector3(0, 0, 0.005)),
    addWind(new Vector3(0.04, 0, 0)),
    expandHandleOut(0.01),
    moveToRandomPoint
  ]),
  evaporatingMagicSparksShort: gpm([
    connectStartToEnd,
    overshootEndY(0.025, 2.5),
    addBuoyancy(0.001),
    diffuse(new Vector3(0.00125, 0.00125, 0.00125), new Vector3(0, 0, 0.0025)),
    addWind(new Vector3(0.01, 0, 0)),
    // expandHandleOut(0.01),
    moveToRandomPoint
  ]),
  evaporatingMagicSparksCircle: gpm([
    makeCircleSample(0.1),
    overshootEndY(0.025, 2.5),
    addBuoyancy(0.005),
    // diffuse(new Vector3(0.005, 0.005, 0.005), new Vector3(0, 0, 0.005)),
    addWind(new Vector3(0.04, 0, 0)),
    expandHandleOut(0.01)
  ]),
  grassFireflies: gpm([
    connectStartToEnd,
    // overshootEnd(0.03, 2.5),
    addArc(0.05),
    // diffuse(new Vector3(0.007, 0.007, 0.007), new Vector3(0, 0, 0.005)),
    addRandomWind(0.06),
    expandHandleAndEndOut(0.025)
    // shrinkAroundHandle(0.5),
    // translate(new Vector3(0, -0.04, 0))
  ]),
  whirlwind: gpm([connectStartToEnd, sweepArcAroundStart()]),
  catScratches: gpm([
    connectStartToEnd,
    normalizeDistanceToStart(0.05),
    sweepArcAroundStart(0.15, 0.7, -0.01, 0.01, 1.3, true),
    tiltRandomlyAroundStart(0.05)
  ]),
  smoke: gpm([
    sweepArcAroundStart(0.1),
    rotateDir90,
    scale(new Vector3(0.8, 1, 0.8)),
    addBuoyancy(0.05),
    addWind(new Vector3(-0.04, 0, 0))
  ]),
  sparksFloating: gpm([
    sweepArcAroundStart(0.1),
    addBuoyancy(0.04),
    addWind(new Vector3(-0.1, 0, 0))
  ]),
  healingVapor: gpm([
    connectStartToEnd,
    overshootEnd(0.03, 2.5),
    addBuoyancy(0.1),
    diffuse(new Vector3(0.007, 0.007, 0.007), new Vector3(0, 0, 0.005)),
    addWind(new Vector3(-0.04, 0, 0)),
    expandHandleOut(0.06),
    shrinkAroundHandle(0.5),
    translate(new Vector3(0, -0.04, 0))
  ]),
  ailingVapor: gpm([
    connectStartToEnd,
    overshootEnd(-0.03, 3.5),
    // addBuoyancy(-0.1),
    diffuse(new Vector3(0.037, 0.037, 0.037), new Vector3(0, 0, 0.005)),
    // addWind(new Vector3(-0.04, 0, 0)),
    // expandHandleOut(0.04),
    // shrinkAroundHandle(0.5),
    translate(new Vector3(0, 0.02, 0))
  ]),
  witherVapor: gpm([
    connectStartToEnd,
    reverseFlow,
    overshootEnd(0.01, 1),
    // addBuoyancy(0.0125),
    diffuse(new Vector3(0.02, 0.007, 0.007), new Vector3(0, 0, 0.005)),
    // addWind(new Vector3(-0.02, 0, 0)),
    // expandHandleOut(0.04),
    // shrinkAroundHandle(0.5)
    translate(new Vector3(0, -0.01, 0))
  ]),
  drippingTendrils: gpm([
    connectStartToEnd,
    reverseFlow,
    tiltRandomlyAroundStart(0.04),
    // convertToSpray(0.025, 0.25, 0.35, false),
    addBuoyancy(0.017),
    // diffuse(new Vector3(0.05, 0.05, 0.05), new Vector3(0, 0, 0)),
    expandHandleOut(0.06),
    shrinkAroundHandle(0.125)
    // makeScaleByStart(2)
    // translate(new Vector3(0, 0.0, 0)),
    // reverseFlow
  ]),
  sparksFromEnd: gpm([
    connectStartToEnd,
    reverseFlow,
    convertToSpray(0.075, 0.15),
    addBuoyancy(0.075),
    addArc(0.035),
    // diffuse(new Vector3(0.007, 0.007, 0.007), new Vector3(0, 0, 0.005)),
    addWind(new Vector3(-0.06, 0, 0)),
    expandHandleOut(0.07),
    shrinkAroundHandle(0.35)
    // translate(new Vector3(0, -0.04, 0))
  ]),
  uiSparksRandom: gpm([
    connectStartToEnd,
    // moveToEnd,
    // addWind(new Vector3(0, -10, 0)),
    diffuse(new Vector3(0, 0.02, 0.02), new Vector3(0, 0, 0))
    // tiltRandomlyAroundStart(3),
  ]),
  ropeSparksRandom: gpm([
    connectStartToEnd,
    // moveToEnd,
    addWind(new Vector3(0.002, 0.005, 0)),
    diffuse(new Vector3(0, 0.002, 0.002), new Vector3(0, 0, 0)),
    tiltRandomlyAroundStart(0.005)
  ]),
  dustStompRing: gpm([
    connectStartToEnd,
    moveToEnd,
    addBuoyancy(0.015),
    expandHandleOut(0.035),
    moveEndToHandle(0.85),
    moveStartToHandle(0.5),
    // connectStartToEnd,
    // reverseFlow,
    // sweepArcAroundStart(0.04),
    // rotateDir90,
    // scale(new Vector3(0.8, 1, 0.8)),
    addBuoyancy(-0.015)
    // addWind(new Vector3(-0.04, 0, 0))
  ]),
  dustStompRingLite: gpm([
    connectStartToEnd,
    moveToEnd,
    addBuoyancy(0.015),
    expandHandleOut(0.025),
    moveEndToHandle(0.9),
    moveStartToHandle(0.5),
    // connectStartToEnd,
    // reverseFlow,
    // sweepArcAroundStart(0.04),
    // rotateDir90,
    // scale(new Vector3(0.8, 1, 0.8)),
    addBuoyancy(-0.015)
    // addWind(new Vector3(-0.04, 0, 0))
  ]),
  pebbleSplash: gpm([
    connectStartToEnd,
    moveToEnd,
    addBuoyancy(0.015),
    convertToSpray(0.075 * 5, 0.15 * 5),
    translate(new Vector3(0, -0.015, 0))
  ]),
  rippleRings: gpm([connectStartToEnd, rippleRing()]),
  rippleRingsEnd: gpm([connectStartToEnd, moveToEnd, rippleRing()]),
  rippleRingsSmall: gpm([connectStartToEnd, rippleRing(0.035)]),
  dustFloatFromRings: gpm([
    connectStartToEnd,
    moveToStart,
    positionOnRing(),
    addBuoyancy(0.025),
    addWind(new Vector3(-0.02, 0, 0))
  ]),
  dustFloatFromRingsEnd: gpm([
    connectStartToEnd,
    moveToEnd,
    positionOnRing(),
    addBuoyancy(0.025),
    addWind(new Vector3(-0.02, 0, 0))
  ]),
  uiDustFloat: gpm([
    connectStartToEnd,
    moveToStart,
    addBuoyancy(0.25),
    addWind(new Vector3(-0.25, 0, 0))
  ]),
  shineToSky: gpm([
    connectStartToEnd,
    addArc(0.8),
    diffuseHandle(new Vector3(0.05, 0.05, 0.05)),
    resampleCurve(0, 0.2, 0.4),
    straighten(1),
    diffuse(new Vector3(0.025, 0.025, 0.0), new Vector3(0, 0, 0))
  ]),
  shineFromSky: gpm([
    connectStartToEnd,
    addArc(0.8),
    // diffuseHandle(new Vector3(0.05, 0.05, 0.05)),
    resampleCurve(0.6, 0.8, 1.0),
    diffuseEnd(new Vector3(0.035, 0.035, 0.0)),
    straighten(1),
    stretchForward(0.6),
    diffuse(new Vector3(0.025, 0.025, 0.0), new Vector3(0, 0, 0))
  ]),
  shineAroundTarget: gpm([
    connectStartToEnd,
    moveToEnd,
    // addArc(0.8),
    // diffuseHandle(new Vector3(0.05, 0.05, 0.05)),
    // resampleCurve(1, 1, 1),
    diffuseEnd(new Vector3(0.1, 0.0, 0.1)),
    normalizeDistanceToStart(0.1),
    straighten(1),
    diffuse(new Vector3(0.0, 0.0, 0.0125), new Vector3(0, 0.04, -0.0125)),
    scaleTowardsEnd(0.3)
  ]),
  shineAroundTarget2: gpm([
    connectStartToEnd,
    moveToEnd,
    // addArc(0.8),
    // diffuseHandle(new Vector3(0.05, 0.05, 0.05)),
    // resampleCurve(1, 1, 1),
    diffuseEnd(new Vector3(0.1, 0.1, 0.1)),
    normalizeDistanceToStart(0.1),
    straighten(1),
    diffuse(new Vector3(0.0, 0.0, 0.0125), new Vector3(0, 0, -0.0125)),
    scaleTowardsEnd(0.2)
  ]),
  shineAroundTarget3: gpm([
    connectStartToEnd,
    moveToEnd,
    // addArc(0.8),
    // diffuseHandle(new Vector3(0.05, 0.05, 0.05)),
    // resampleCurve(1, 1, 1),
    diffuseEnd(new Vector3(0.1, 0.1, 0.1)),
    normalizeDistanceToStart(0.2 * 0.4),
    straighten(1),
    diffuse(new Vector3(0.0, 0.0, 0.0125), new Vector3(0, 0, -0.0125)),
    scaleTowardsEnd(0.2 * 0.4)
  ]),
  shineAroundTarget4: gpm([
    connectStartToEnd,
    moveToEnd,
    // addArc(0.8),
    // diffuseHandle(new Vector3(0.05, 0.05, 0.05)),
    // resampleCurve(1, 1, 1),
    diffuseEnd(new Vector3(0.01, 0.01, 0.0)),
    normalizeDistanceToStart(0.12 * 0.5),
    straighten(1),
    diffuse(new Vector3(0.0, 0.0, 0.0125), new Vector3(0, 0, -0.0125)),
    // scaleTowardsEnd(0)
    normalizeDistanceToEnd(0.14 * 0.5)
  ]),
  default: fullArc
}

export default beamParticlePathMakerLib
