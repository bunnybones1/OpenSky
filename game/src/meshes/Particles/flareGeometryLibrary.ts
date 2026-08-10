import { Color } from 'three'

import { blendColorsAndOpacitiesToVector4 } from '~/colors/utils'

import RGBACircleGeometry from '../geometry/RGBACircleGeometry'

type SupportedFlareGeometries =
  | 'electric'
  | 'fireBullet'
  | 'magicBullet'
  | 'holographicUpgrade'
  | 'firecracker'
  | 'ropeTimerSparkler'
  | 'damageHit'

const __lib = new Map<SupportedFlareGeometries, RGBACircleGeometry>()

const flareMakers: {
  [K in SupportedFlareGeometries]: (
    colorA: Color,
    colorB: Color
  ) => RGBACircleGeometry
} = {
  electric: (colorA: Color, colorB: Color) =>
    new RGBACircleGeometry(0.14, 7, 2, (uRatio, vRatio, outRGBA) => {
      blendColorsAndOpacitiesToVector4(colorA, colorB, 0.6, 0, vRatio, outRGBA)
    }),
  fireBullet: (colorA: Color, colorB: Color) =>
    new RGBACircleGeometry(0.045, 16, 2, (uRatio, vRatio, outRGBA) => {
      blendColorsAndOpacitiesToVector4(colorA, colorB, 1.5, 0, vRatio, outRGBA)
    }),
  magicBullet: (colorA: Color, colorB: Color) =>
    new RGBACircleGeometry(0.045, 16, 2, (uRatio, vRatio, outRGBA) => {
      blendColorsAndOpacitiesToVector4(colorA, colorB, 2, 0, vRatio, outRGBA)
    }),
  holographicUpgrade: (colorA: Color, colorB: Color) =>
    new RGBACircleGeometry(1.8, 24, 8, (uRatio, vRatio, outRGBA) => {
      blendColorsAndOpacitiesToVector4(
        colorA,
        colorB,
        0.6,
        0,
        1 - Math.pow(1 - vRatio, 2),
        outRGBA
      )
    }),
  firecracker: (colorA: Color, colorB: Color) =>
    new RGBACircleGeometry(0.4, 6, 2, (uRatio, vRatio, outRGBA) => {
      blendColorsAndOpacitiesToVector4(
        colorA,
        colorB,
        0.6,
        0,
        1 - Math.pow(1 - vRatio, 2),
        outRGBA
      )
    }),
  damageHit: (colorA: Color, colorB: Color) =>
    new RGBACircleGeometry(
      0.1,
      32,
      4,
      (uRatio, vRatio, outRGBA) => {
        blendColorsAndOpacitiesToVector4(
          colorA,
          colorB,
          0,
          0.5,
          vRatio,
          outRGBA
        )
      },
      undefined,
      v => Math.pow(v, 0.75) * 0.5 + 0.5,
      false
    ),
  ropeTimerSparkler: (colorA: Color, colorB: Color) =>
    new RGBACircleGeometry(0.14, 10, 3, (uRatio, vRatio, outRGBA) => {
      blendColorsAndOpacitiesToVector4(colorA, colorB, 0.6, 0, vRatio, outRGBA)
    })
}

export function getFlareGeometry(
  key: SupportedFlareGeometries,
  colorA: Color,
  colorB: Color
) {
  if (!__lib.has(key)) {
    __lib.set(key, flareMakers[key](colorA, colorB))
  }
  return __lib.get(key)
}
