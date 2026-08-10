import { RESET_USER_SETTINGS_TO_DEFAULTS } from '@opensky/shared/userSettings'
import { getFromArrayWrapped } from '@opensky/shared/utils/arrayUtils'
import { distributions } from '@opensky/shared/utils/distributions'
import NiceBooleanParameter from '@opensky/shared/utils/NiceBooleanParameter'
import NiceFloatParameter from '@opensky/shared/utils/NiceFloatParameter'
import { Color } from 'three'

import { hues } from './colors/colorHues'
import { COLOR_GRAY } from './colors/colorLibrary'
import { getCachedStringHashColor, makeHSL } from './colors/utils'
import queryParams from './queryParams'
import { splitCamelCase } from './utils/stringUtils'

export const toggleWebGLCommandTracer = new NiceBooleanParameter(
  'toggle-webgl-command-tracer',
  'Command Tracer',
  queryParams.forceWebGLCommandTracer,
  'webGL',
  undefined,
  RESET_USER_SETTINGS_TO_DEFAULTS
)

export const webGLCommandTracerInterval = new NiceFloatParameter(
  'webgl-command-tracer-interval',
  'Interval',
  200,
  0,
  2000,
  distributions.linear,
  v => ~~v.toString() + ' MS',
  'webGL',
  RESET_USER_SETTINGS_TO_DEFAULTS,
  1
)

export const webGLCommandTracerPointSize = new NiceFloatParameter(
  'webgl-command-tracer-point-size',
  'Point Size',
  16,
  0.5,
  64,
  distributions.linear,
  v => v.toFixed(2),
  'webGL',
  RESET_USER_SETTINGS_TO_DEFAULTS,
  0.1
)

export const webGLCommandTracerWrapWidth = new NiceFloatParameter(
  'webgl-command-tracer-wrap-width',
  'Wrap Width',
  30,
  20,
  600,
  distributions.linear,
  v => v.toString(),
  'webGL',
  RESET_USER_SETTINGS_TO_DEFAULTS,
  1
)

const __stringColorLibrary: { [K: string]: Color } = {
  active: makeHSL(hues._07_warmGreen, 0.4, 0.4),
  enable: makeHSL(hues._08_green, 0.5, 0.6),
  create: makeHSL(hues._08_green, 0.6, 0.8),
  bind: makeHSL(hues._14_blue, 0.5, 0.5),
  use: makeHSL(hues._07_warmGreen, 1, 0.75),
  clear: makeHSL(hues._02_red, 0.5, 0.35),
  disable: makeHSL(hues._02_red, 0.8, 0.5),
  delete: makeHSL(hues._02_red, 1, 0.6),
  draw: makeHSL(hues._08_green, 1, 0.7),
  blend: makeHSL(hues._04_warmYellow, 1, 0.8),
  color: makeHSL(hues._14_blue, 0.65, 0.25),
  depth: makeHSL(hues._12_coolCyan),
  stencil: makeHSL(hues._04_warmYellow, 1, 0.85),
  mask: makeHSL(hues._12_coolCyan, 0.5, 0.9),
  program: makeHSL(hues._17_majenta, 1, 0.85),
  texture: makeHSL(hues._15_warmBlue, 0.6, 0.5),
  buffer: makeHSL(hues._15_warmBlue, 0.6, 0.4),
  vertex: makeHSL(hues._06_coolYellow, 0.7, 0.6),
  attrib: makeHSL(hues._12_coolCyan, 0.6, 0.5),
  pointer: makeHSL(hues._09_coolGreen, 0.7, 0.35),
  array: makeHSL(hues._09_coolGreen, 0.2, 0.4),
  elements: makeHSL(hues._11_cyan, 0.2, 0.4),
  front: makeHSL(hues._11_cyan, 0.5, 0.4),
  face: makeHSL(hues._15_warmBlue, 0.5, 0.5),
  scissor: makeHSL(hues._04_warmYellow, 0.75, 0.75),
  viewport: makeHSL(hues._05_yellow, 0.75, 0.85),
  uniform: makeHSL(hues._12_coolCyan, 0.15, 0.25),
  matrix: makeHSL(hues._12_coolCyan, 0.5, 0.65),
  f: makeHSL(hues._06_coolYellow, 0.25, 0.45),
  fv: makeHSL(hues._06_coolYellow, 0.25, 0.6),
  '1': makeHSL(hues._12_coolCyan, 0.25, 0.85),
  '2': makeHSL(hues._13_coolBlue, 0.25, 0.85),
  '3': makeHSL(hues._14_blue, 0.25, 0.85),
  '4': makeHSL(hues._15_warmBlue, 0.25, 0.85),
  func: makeHSL(hues._05_yellow, 0.6, 0.65),
  op: makeHSL(hues._05_yellow, 0.7, 0.75),
  separate: makeHSL(hues._05_yellow, 0.8, 0.85)
}

const __cachedStringColors = new Map<string, Color>()
function getCachedStringColor(s: string) {
  if (__stringColorLibrary.hasOwnProperty(s)) {
    return __stringColorLibrary[s]
  }
  if (!__cachedStringColors.has(s)) {
    const c = getCachedStringHashColor(s)
    c.lerp(COLOR_GRAY, 0.8)
    __cachedStringColors.set(s, c)
  }
  return __cachedStringColors.get(s)!
}

const __cachedWebGLSubCommandColor = new Map<string, Color[]>()
export function getCachedWebGLCommandColors(s: string) {
  if (!__cachedWebGLSubCommandColor.has(s)) {
    const srcColors = splitCamelCase(s).map(getCachedStringColor)
    const colors: Color[] = []
    for (let i = 0; i < 4; i++) {
      colors.push(getFromArrayWrapped(srcColors, i))
    }
    __cachedWebGLSubCommandColor.set(s, colors)
  }
  return __cachedWebGLSubCommandColor.get(s)!
}
