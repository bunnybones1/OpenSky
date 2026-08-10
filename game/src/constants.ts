import device from '@opensky/shared/device'
import { getUrlInt } from '@opensky/shared/utils/location'
import { BaseCard, Element, Prism, Trait } from '@skyweaver/state-metadata'
import { Color, Vector2, Vector3 } from 'three'

import { COLOR_DEEP_PURPLE } from './colors/colorLibrary'
import { CardVisType } from './helpers/CardVisType'
import queryParams from './queryParams'
import { getQuatFromEuler } from './utils/threeMathUtils'

export const DEBUG_SKY = queryParams.debugSky
export const DEBUG_TEXT = false

export const SIZE_RATIO_CARD_TO_ATTACHMENT = 2.5

export const RENDER_ORDERS = {
  frame: -11000,
  cardOutline: -10900,
  cardArt: -11001,
  characterArt: -11001,
  sky: -6000,
  manaVial: -5900,
  text: -5000,
  traits: -2999,
  highlight: -3000,
  damage: 0,
  debug: 1
}

export const TURN_TIMER_WARNING_FRACTION = 2 / 3

export const FIELD_HEIGHT_CONJURE = 0
export const ARENA_CAMERA_DISTANCE = 0.7
export const ARENA_ANGLE = Math.PI * 0.325

export const ARENA_ANGLE_QUAT = getQuatFromEuler(ARENA_ANGLE, 0, 0)
export const INV_ARENA_ANGLE_QUAT = ARENA_ANGLE_QUAT.clone().invert()
export const ARENA_ANTIANGLE_QUAT = getQuatFromEuler(
  Math.PI * -0.5 + ARENA_ANGLE,
  0,
  0
)
export const UPRIGHT_ANGLE_QUAT = getQuatFromEuler(
  Math.PI * -0.5,
  Math.PI,
  Math.PI
)

export const ARENA_OFFSET_Y = -0.01

export const TEXT_EDGE_FIX_ALPHA_TEST = 0.5

export const SCALE_CARD = new Vector3().setScalar(1.2)
export const SCALE_CHARACTER = new Vector3().setScalar(1.4)

export const DECK_SPACING = 0.0025

export const SHOW_ANIM_SPEED_SETTINGS_UI = queryParams.customSpeed

export const MOBILE_CARD_HOVER_SCALE = 0.6

export const USE_ALTERNATIVE_MOBILE_DECK_UI = queryParams.altMobileUI

export const LOW_MEMORY_MODE = queryParams.lowMem

export const elementColors: { [K in Element]: Color } = {
  air: new Color('#308e8e'),
  dark: new Color('#783f90'),
  earth: new Color('#649900'),
  fire: new Color('#be2e0c'),
  light: new Color('#d7a705'),
  metal: new Color('#998b70'),
  mind: new Color('#8431ff'),
  water: new Color('#1f79cf'),
  sky: new Color('#45354f')
}

// HACK
// hand-tweaked colors to compensate for mysterious color inaccuracy in some shaders
elementColors.fire.offsetHSL(-0.01, 0.2, 0.012)
elementColors.dark.offsetHSL(0.01, 0.08, 0.015)
elementColors.water.offsetHSL(0.0, 0.1, 0.005)
elementColors.earth.offsetHSL(0.02, 0.3, 0.01)
elementColors.air.offsetHSL(0, 0.2, -0.035)
elementColors.metal.offsetHSL(0, 0.03, 0.005)
elementColors.mind.offsetHSL(0.018, 0.1, -0.027)
elementColors.light.offsetHSL(-0.004, 0.17, 0.012)
elementColors.sky.offsetHSL(0, 0.03, 0.005)

export const prismsArr: Prism[] = ['str', 'wis', 'agy', 'hrt', 'int', 'tok']

export const elementsArr: Element[] = [
  'air',
  'dark',
  'earth',
  'fire',
  'light',
  'metal',
  'mind',
  'water',
  'sky'
]

export const traitColors: { [K in Trait]: Color } = {
  stealth: new Color('#8380B2'),
  wither: new Color('#EF50BE'),
  guard: new Color('#61DBC4'),
  banner: new Color('#C0CC4A'),
  lifesteal: new Color('#EC7DFF'),
  armor: new Color('#70C1F9'),
  dash: new Color('#9ad472')
}

export const traitsArr: Trait[] = Object.keys(traitColors) as Trait[]

export const traitsByName: { [K: string]: Trait } = {
  stealth: 'stealth',
  wither: 'wither',
  guard: 'guard',
  banner: 'banner',
  lifesteal: 'lifesteal',
  armor: 'armor',
  dash: 'dash'
}

export const ALLOW_USER_HANDEDNESS_PREFERENCE = true

export const SHOULD_LOG_ACTION = queryParams.logActions
export const SHOULD_LOG_STORY = queryParams.logStory
export const SHOULD_LOG_PROOF = queryParams.logProof
export const SHOULD_LOG_GAME_ACTIONS = queryParams.logGameActions

export const FANCY_LOGS = SHOULD_LOG_STORY || SHOULD_LOG_ACTION

export const HERO_ATTACK_FADED_OPACITY = 0.25

export const BUTTON_HEIGHT = (device.isMobile ? 32 : 24) + 17
export const BUTTON_MARGINS = (device.isMobile ? 9 : 12) * 1.2
export const BUTTON_PADDING = 28
export const SLIDER_HEIGHT = device.isMobile ? 18 : 10
export const SLIDER_MARGINS = device.isMobile ? 52 : 42

export const END_TURN_BUTTON_WIDTH = 190
export const END_TURN_BUTTON_TOP_WIDTH = 175
export const END_TURN_BUTTON_HEIGHT = 50

export const SIDEBAR_WIDTH = 300

export const BREAKDOWN_BAR_HEIGHT = 59

export const ERROR_MODAL_WIDTH = 650

export const USE_WORKER =
  (queryParams.useWorker ||
    !(device.isIOS || device.isIpadOS || !device.supportsModulesInWorker)) &&
  !queryParams.workerless

class LineworkSettings {
  constructor(
    public overrideColor?: Color,
    public deepenColor = false
  ) {
    //
  }
}

let overrideColor: Color | undefined = COLOR_DEEP_PURPLE

const rowStyle = getUrlInt('rowStyle', 1)
if (rowStyle === 2) {
  overrideColor = undefined
}

export const lineworkSettingsLib: { [K in CardVisType]: LineworkSettings } = {
  card: new LineworkSettings(),
  token: new LineworkSettings(),
  rowDesktop: new LineworkSettings(overrideColor, true),
  rowMobile: new LineworkSettings(overrideColor, true),
  rowMini: new LineworkSettings(overrideColor, true),
  rowGold: new LineworkSettings(new Color(0xffa000), false),
  rowSilver: new LineworkSettings(new Color(0xdddddd), false)
}

export const START_OF_GAME_DAY = 0.02
export const manaCostCompositeNudge = new Vector2()

export enum PALETTE_ROW {
  PURPLE = 0,
  CHECKBOX_HOVERING = 1,
  CHECKBOX_DOWN = 2,
  GREEN = 4,
  LAYOUT_TESTER = 6,
  PURPLE_TRANSLUCENT = 8,
  PURPLE_TRANSLUCENT_HIGHLIT = 9,
  RED = 12,
  COLLIDER_2D = 14,
  CARD_SILVER = 16,
  CARD_GOLD = 17,
  BLACK_AND_WHITE = 18,
  WHITE_GRADIENT = 19,
  DUSTY_PURPLE = 20,
  LEVEL_SLANT = 24,
  CONQUEST_POINTS = 26,
  WHITE_TO_BLACK_GRADIENT = 27,
  PURPLE_AND_GREY = 32,
  BLUE = 36
}

export const HIT_TEST_CLIP_SPACE_RADIUS = 0.05
export const MOUSE_HIT_TEST_POINTS = [[0, 0]] as const
export const TOUCH_HIT_TEST_POINTS = [
  [0, 0],
  [-1, 0],
  [0, 1],
  [1, 0],
  [0, -1]
] as const

export const ACTION_HISTORY_SIDEBAR_WIDTH = 154 / 2
export const TIPS_BOX_WIDTH = 274
export const SKYTAG_HEIGHT = 45
export const SKYTAG_WIDTH = 307
export const HUD_SKYTAG_SCALE = device.isMobile ? 0.85 : 0.7 //1.1

export const SPEECH_BUBBLE_PRESCALE = 0.9
export const REWARD_FLOTATION_SPEED = 0.8

export const fakeID = 'fakebasecard' as BaseCard
export const fakeAttachID = 'fakeattachbasecard' as BaseCard
