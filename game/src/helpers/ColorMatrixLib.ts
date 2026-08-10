import { Matrix4, Vector3 } from 'three'

import { mat4Blend } from '~/utils/threeMathUtils'

function m4() {
  return new Matrix4()
}

const identity: Matrix4 = m4()
const translateHalfDown = m4().makeTranslation(-0.5, -0.5, -0.5)
const translateHalfUp = m4().makeTranslation(0.5, 0.5, 0.5)
const negate = m4().makeScale(-1, -1, -1)

const invert = m4().premultiply(
  translateHalfDown.premultiply(negate).premultiply(translateHalfUp)
)
const invertedSaturation = m4().makeRotationAxis(
  new Vector3(1, 1, 1).normalize(),
  Math.PI
)
const desaturate = mat4Blend(m4(), invertedSaturation, identity, 0.5)
const invertValuesOnly = invert.clone().premultiply(invertedSaturation)
function levelsInMaker(colorInLow: Vector3, colorInHigh: Vector3) {
  const colorInRange = new Vector3().subVectors(colorInHigh, colorInLow)
  const colorInScale = new Vector3(1, 1, 1).divide(colorInRange)
  return m4()
    .makeTranslation(-colorInLow.x, -colorInLow.y, -colorInLow.z)
    .premultiply(m4().makeScale(colorInScale.x, colorInScale.y, colorInScale.z))
}
function levelsOutMaker(colorInLow: Vector3, colorInHigh: Vector3) {
  const colorInRange = new Vector3().subVectors(colorInHigh, colorInLow)
  return m4()
    .makeScale(colorInRange.x, colorInRange.y, colorInRange.z)
    .premultiply(m4().makeTranslation(colorInLow.x, colorInLow.y, colorInLow.z))
}
function levelsMaker(
  colorInLow: Vector3,
  colorInHigh: Vector3,
  colorOutLow: Vector3,
  colorOutHigh: Vector3
) {
  return levelsInMaker(colorInLow, colorInHigh).premultiply(
    levelsOutMaker(colorOutLow, colorOutHigh)
  )
}
function levelsMakerPhotoshop(
  rInLow: number,
  rInHigh: number,
  rOutLow: number,
  rOutHigh: number,
  gInLow: number,
  gInHigh: number,
  gOutLow: number,
  gOutHigh: number,
  bInLow: number,
  bInHigh: number,
  bOutLow: number,
  bOutHigh: number
) {
  return levelsMaker(
    new Vector3(rInLow / 255, gInLow / 255, bInLow / 255),
    new Vector3(rInHigh / 255, gInHigh / 255, bInHigh / 255),
    new Vector3(rOutLow / 255, gOutLow / 255, bOutLow / 255),
    new Vector3(rOutHigh / 255, gOutHigh / 255, bOutHigh / 255)
  )
}

const icy = mat4Blend(m4(), identity, desaturate, 0.6).premultiply(
  levelsMakerPhotoshop(34, 208, 0, 196, 0, 187, 5, 255, 0, 173, 58, 255)
)

const counterIncreaseGlow = mat4Blend(
  m4(),
  identity,
  desaturate,
  0.6
).premultiply(
  levelsMakerPhotoshop(34, 208, 30, 196, 0, 187, 65, 255, 0, 173, 118, 255)
)

const goldenLight = levelsMaker(
  new Vector3(0, 0, 0),
  new Vector3(0.6, 0.6, 0.8),
  new Vector3(0.15, 0.1, 0.01),
  new Vector3(1, 1, 1)
)
const intenseGoldenLight = mat4Blend(
  m4(),
  identity,
  desaturate,
  0.2
).premultiply(mat4Blend(m4(), identity, goldenLight, 2))

const darkPurply = levelsMaker(
  new Vector3(0.3, 0.6, 0.4),
  new Vector3(0.8, 1, 0.8),
  new Vector3(0.5, 0, 0.5),
  new Vector3(0.75, 0.2, 0.9)
)
const withered = mat4Blend(m4(), identity, desaturate, 0.8).premultiply(
  mat4Blend(m4(), identity, darkPurply, 0.5)
)

const healyGreen2 = levelsMaker(
  new Vector3(0.2, 0.1, 0.1),
  new Vector3(0.8, 0.5, 1),
  new Vector3(0.2, 0.5, 0),
  new Vector3(0.75, 1, 0.75)
)
const healyGreen = mat4Blend(m4(), identity, invertValuesOnly, 1.5).premultiply(
  healyGreen2
)
const pink = levelsMaker(
  new Vector3(0.1, 0.2, 0.15),
  new Vector3(0.5, 0.7, 0.65),
  new Vector3(0.3, 0.1, 0.2),
  new Vector3(1, 0.9, 0.95)
)

const healyPink = mat4Blend(m4(), identity, desaturate, 0.7)
  .premultiply(mat4Blend(m4(), identity, pink, 3))
  .premultiply(mat4Blend(m4(), identity, desaturate, 0.25))
//   mat4Blend(healyPink,  identity, healyPink, 2)
//   const healyPink = invertedSaturation.clone().multiply(healyGreen)

const stealthyBlue = levelsMaker(
  new Vector3(0.2, 0.1, 0.1),
  new Vector3(1, 0.5, 0.8),
  new Vector3(0.3, 0.4, 0.5),
  new Vector3(0.75, 1, 1)
)
const intenseStealthyBlue = mat4Blend(m4(), identity, stealthyBlue, 2)

const damageRed = levelsMaker(
  new Vector3(0, 0.8, 0.8),
  new Vector3(0.5, 1, 1),
  new Vector3(0.8, 0.1, 0.1),
  new Vector3(1, 1, 1)
)

const damageWhite = levelsMaker(
  new Vector3(0.1, 0.1, 0.2),
  new Vector3(0.5, 0.5, 0.5),
  new Vector3(0.8, 0.8, 0.7),
  new Vector3(1, 1, 1)
)
const intenseWhiteLight = mat4Blend(
  m4(),
  identity,
  desaturate,
  0.2
).premultiply(mat4Blend(m4(), identity, damageWhite, 2))

export const ColorMatrixLib = {
  identity,
  translateHalfDown,
  translateHalfUp,
  negate,
  invert,
  invertedSaturation,
  desaturate,
  invertValuesOnly,
  levelsInMaker,
  levelsOutMaker,
  levelsMaker,
  icy,
  counterIncreaseGlow,
  goldenLight,
  intenseGoldenLight,
  withered,
  healyGreen,
  healyPink,
  stealthyBlue,
  intenseStealthyBlue,
  damageRed,
  damageWhite,
  intenseWhiteLight
}
