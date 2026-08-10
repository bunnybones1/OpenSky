import { COLOR_BLACK, COLOR_WHITE } from '~/colors/colorLibrary'

import { fontFaces } from './FontFace'
import { TextOptions } from './TextOptions'

const generic: Partial<TextOptions> = {
  color: COLOR_WHITE,
  strokeWidth: 0,
  strokeColor: COLOR_BLACK,
  alphaTest: 0
}

const title: Partial<TextOptions> = {
  ...generic,
  letterSpacing: -0.6
}
const bigNumber: Partial<TextOptions> = {
  ...title,
  fontFace: fontFaces.BarlowBold,
  letterSpacing: -1.0
}
const damageNumber: Partial<TextOptions> = {
  ...bigNumber,
  color: 0xff2200, //0xffffaa,
  strokeWidth: 0.3,
  letterSpacing: 0
}
const buffNumber: Partial<TextOptions> = {
  ...bigNumber,
  color: 0x66ff66,
  strokeWidth: 0.3,
  letterSpacing: 0
}
const manaCostNumber: Partial<TextOptions> = {
  ...bigNumber,
  color: COLOR_BLACK,
  strokeWidth: 0,
  strokeColor: undefined
}

export const textStyles = {
  generic,
  title,
  bigNumber,
  damageNumber,
  buffNumber,
  manaCostNumber
}
