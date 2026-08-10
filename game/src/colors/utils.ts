import { lerp } from '@opensky/shared/utils/math'
import { Color, Vector2, Vector4 } from 'three'

import { hashStringAsNumber } from '~/utils/stringUtils'

import { ColorParameter } from './types'

const __whiteColor = new Color(1, 1, 1)
const __tempColor = new Color()

export function addColor(dst: Color, src: Color, amt: number) {
  if (amt !== 0) {
    dst.r += src.r * amt
    dst.g += src.g * amt
    dst.b += src.b * amt
  }
}

export function screenColor(dst: Color, src: Color) {
  __tempColor.copy(__whiteColor).sub(dst)
  dst.add(__tempColor.multiply(src))
}

export function makeHSL(h: number, s: number = 0.75, l: number = 0.5) {
  return new Color().setHSL(h, s, l)
}

//color style algorithm extracted from three.js
export function hexColor(style: string) {
  const m = /^#([A-Fa-f0-9]+)$/.exec(style)
  if (m) {
    // hex color

    const hex = m[1]
    const size = hex.length

    if (size === 3) {
      const color = new Color()
      // #ff0
      color.r = parseInt(hex.charAt(0) + hex.charAt(0), 16) / 255
      color.g = parseInt(hex.charAt(1) + hex.charAt(1), 16) / 255
      color.b = parseInt(hex.charAt(2) + hex.charAt(2), 16) / 255

      return color
    } else if (size === 6) {
      const color = new Color()
      // #ff0000
      color.r = parseInt(hex.charAt(0) + hex.charAt(1), 16) / 255
      color.g = parseInt(hex.charAt(2) + hex.charAt(3), 16) / 255
      color.b = parseInt(hex.charAt(4) + hex.charAt(5), 16) / 255

      return color
    }
  }
  return new Color(1, 0, 1)
}

function fToFS(f: number) {
  return f.toFixed(2)
}

export function niceColorToFloatString(c: Color) {
  return `r:${fToFS(c.r)} g:${fToFS(c.g)} b:${fToFS(c.b)}`
}

export function niceVec2ToFloatString(v2: Vector2) {
  return `x:${fToFS(v2.x)} y:${fToFS(v2.y)}`
}

export type XYZ = 'x' | 'y' | 'z'

const __hsl = { h: 0, s: 0, l: 0 }
export function modifyColorByHSL(
  color: Color,
  h: number,
  s: number,
  l: number
) {
  color.getHSL(__hsl)
  __hsl.h += h
  __hsl.s += s
  __hsl.l += l
  color.setHSL(__hsl.h, __hsl.s, __hsl.l)
  return color
}

function getHashNumberColor(h: number) {
  return makeHSL((h / 24) % 1, 1, ((h / 47) % 1) * 0.4 + 0.45)
}

const __cachedStringHashColor = new Map<string, Color>()
export function getCachedStringHashColor(s: string) {
  if (!__cachedStringHashColor.has(s)) {
    __cachedStringHashColor.set(s, getHashNumberColor(hashStringAsNumber(s)))
  }
  return __cachedStringHashColor.get(s)!
}

export function blendColorsAndOpacitiesToVector4(
  colorA: Color,
  colorB: Color,
  opacityA: number,
  opacityB: number,
  amt: number,
  outRGBA: Vector4
) {
  outRGBA.x = lerp(colorA.r, colorB.r, amt)
  outRGBA.y = lerp(colorA.g, colorB.g, amt)
  outRGBA.z = lerp(colorA.b, colorB.b, amt)
  outRGBA.w = lerp(opacityA, opacityB, amt)
}

export function toColor(value: ColorParameter) {
  return value instanceof Color ? value : new Color(value)
}

export function extractColorVals(color: Color) {
  const { r, g, b } = color
  return { r, g, b }
}
