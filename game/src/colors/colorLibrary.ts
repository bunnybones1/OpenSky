import { Type } from '@skyweaver/state-metadata'
import { Color } from 'three'

import { hues } from './colorHues'
import Gradient, { GradientOptions } from './Gradient'
import { makeHSL } from './utils'

export const COLOR_BLACK: Readonly<Color> = new Color(0x000000)
export const COLOR_WHITE: Readonly<Color> = new Color(0xffffff)
export const COLOR_GRAY: Readonly<Color> = new Color(0x7f7f7f)
export const COLOR_HIGHLIGHT_GREEN: Readonly<Color> = new Color(0x66ff66)
export const COLOR_HIGHLIGHT_YELLOW: Readonly<Color> = makeHSL(
  hues._04_warmYellow - 0.03,
  0.95,
  0.7
)
export const COLOR_DEBUG_RED: Readonly<Color> = new Color(0xdd2222)
export const COLOR_DEEP_PURPLE: Readonly<Color> = new Color(0x422681)
export const COLOR_FOG_PURPLE: Readonly<Color> = new Color(0x251547)
export const COLOR_BUFFED_TEXT: Readonly<Color> = new Color(0x66ff66)
export const COLOR_NERFED_TEXT: Readonly<Color> = new Color(0xff0000)
export const COLOR_DECK_BUFFED_TEXT: Readonly<Color> = new Color(0x93fd7a)
export const COLOR_DECK_NERFED_TEXT: Readonly<Color> = new Color(0xea3e25)
export const COLOR_PALE_BUFFED_TEXT: Readonly<Color> = new Color(0x92fc7a)
export const COLOR_PALE_NERFED_TEXT: Readonly<Color> = new Color(0xed7882)
export const COLOR_DYNAMIC_COST_TEXT: Readonly<Color> = new Color(0xf4e842)
export const COLOR_PRIZE_UPGRADE_CYAN: Readonly<Color> = new Color(0x87fbfd)
export const COLOR_PROGRESSION_LINE_TUTORIAL_BASE: Readonly<Color> = new Color(
  0x4e4289
)
export const COLOR_PROGRESSION_LINE_BASE: Readonly<Color> = new Color(0xc2b5f0)
export const COLOR_PROGRESSION_LINE_FILLED: Readonly<Color> = new Color(
  0x79c4f4
)
export const RANK_SEGMENT_FILLED: Readonly<Color> = new Color(0xf5a81a)
export const RANK_SEGMENT_UNFILLED: Readonly<Color> = new Color(0x563c2b)

export const COLOR_LILAC: Readonly<Color> = new Color(0xc5b4f5)
export const COLOR_DEEP_LILAC: Readonly<Color> = new Color(
  134 / 255,
  109 / 255,
  184 / 255
)
export const COLOR_DARK_BLUE_GRADIENT: Readonly<Color> = new Color(
  14 / 255,
  11 / 255,
  32 / 255
)
export const COLOR_HOLOGRAPHIC_GLOW_SILVER = new Color(0x0f456b).multiplyScalar(
  2
)
export const COLOR_HOLOGRAPHIC_GLOW_GOLD = new Color(0x6b550d).multiplyScalar(
  1.5
)
export const COLOR_CONQUEST_REWARDS_RED = new Color(0xea343b)

const COLOR_CYAN = new Color(0x0cf8f6)
const COLOR_ORANGE = new Color(0xff9401)
export const COLOR_DUSTY_PURPLE = new Color(0x594985)
export const COLOR_MODAL_OUTLINE_PURPLE = new Color(0x8777c3)
export const COLOR_SLIDER_INNER_LILAC = new Color(0xbaadf2)
export const COLOR_RANK_XP_BAR_CYAN = new Color(0x44cefc)

export const COLOR_ARROW_YELLOW: Readonly<Color> = makeHSL(
  hues._05_yellow,
  1,
  0.5
)

export const HEADING_GLOW_COLORS = {
  defeat: new Color(1, 0.1, 0),
  tie: new Color(0.3, 0.8, 1),
  victory: new Color(0x27569e),
  rankup: new Color(0.9, 0.4, 0.1)
}
export const COLOR_FIRE_RED: Readonly<Color> = new Color(0xdf2e08)

type CuratedGradients = 'positive' | 'negative' | 'fatigue'

const __gradientOptions: { [K in CuratedGradients]: GradientOptions } = {
  positive: {
    top: new Color(0.741, 0.902, 0.47),
    bottom: new Color(0.745, 0.973, 0.208)
  },
  negative: {
    top: new Color(1.0, 0.356, 0.18),
    bottom: new Color(1.0, 0.666, 0.0)
  },
  fatigue: {
    top: 0xa03eeb,
    bottom: 0xff89fe
  }
}

const __gradientLib = new Map<CuratedGradients, Gradient | undefined>()

export function getGradient(key: CuratedGradients) {
  if (!__gradientLib.has(key)) {
    __gradientLib.set(key, new Gradient(__gradientOptions[key]))
  }
  return __gradientLib.get(key)!
}

export const cardTypeColors: { [K in Type]: Color } = {
  hero: COLOR_ORANGE,
  unit: COLOR_ORANGE,
  enchant: COLOR_CYAN,
  spell: COLOR_CYAN,
  heroAbility: COLOR_CYAN
}

export const atmosphereColor = new Color(0.5, 0.5, 0.5)
export const atmosphereColorForIsland = new Color(0.5, 0.5, 0.5)
export const atmosphereColorForCards = new Color(0.5, 0.5, 0.5)
export const sunColor = new Color()
export const invGammaColor = new Color()
export const skyColor = new Color()

export const COLOR_PLAYABLE_GREEN = makeHSL(hues._07_warmGreen, 0.8, 0.4)
export const COLOR_HERO_ABILITY = new Color('#506079')
