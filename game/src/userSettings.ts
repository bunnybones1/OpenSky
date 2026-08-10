import { i18n } from '@opensky/language-manager'
import device from '@opensky/shared/device'
import { isDevMode } from '@opensky/shared/devMode'
import { RESET_USER_SETTINGS_TO_DEFAULTS } from '@opensky/shared/userSettings'
import { distributions } from '@opensky/shared/utils/distributions'
import NiceBooleanParameter from '@opensky/shared/utils/NiceBooleanParameter'
import NiceFloatParameter from '@opensky/shared/utils/NiceFloatParameter'

import env from '~/env'

import queryParams from './queryParams'
import { globalAccess } from './utils/globalAccess'
import NiceMethod from './utils/NiceMethod'

export function reactToToggleWithLocationRefresh(toggle: NiceBooleanParameter) {
  const initVal = toggle.value
  toggle.listen(v => {
    if (initVal !== v) {
      location.href = location.href
    }
  })
  toggle.valueStringSuffix = () => i18n.t('common:options.suffix.willRefresh')
}

export const changeReplaySpeed = new NiceFloatParameter(
  'catch-up-speed',
  () => i18n.t('common:options.gameOptions.catchUpSpeed'),
  1.5,
  1,
  10,
  distributions.linear,
  v => Math.round(v * 100) + '%',
  'game',
  RESET_USER_SETTINGS_TO_DEFAULTS
)

export const showPing = new NiceBooleanParameter(
  'show-ping',
  () => i18n.t('common:options.gameOptions.showPing'),
  false,
  'game',
  undefined,
  RESET_USER_SETTINGS_TO_DEFAULTS
)

export const showSpectatorCount = new NiceBooleanParameter(
  'show-spectators',
  () => i18n.t('common:options.gameOptions.showSpectatorCount'),
  true,
  'game',
  undefined,
  RESET_USER_SETTINGS_TO_DEFAULTS
)

export const spaceEndsTurn = new NiceBooleanParameter(
  'space-ends-turn',
  () => i18n.t('common:options.gameOptions.spacebarEndsTurn'),
  false,
  device.isMobile ? 'secret' : 'game',
  undefined,
  RESET_USER_SETTINGS_TO_DEFAULTS
)

export const scrollingCardSelection = new NiceBooleanParameter(
  'scrolling-card-selection',
  () => i18n.t('common:options.uiOptions.useScrollingCardSelection'),
  device.isMobile,
  'ui',
  undefined,
  RESET_USER_SETTINGS_TO_DEFAULTS
)
reactToToggleWithLocationRefresh(scrollingCardSelection)

export const combinedSidebars = new NiceBooleanParameter(
  'combined-sidebars',
  () => i18n.t('common:options.uiOptions.useCombinedDeckAndGraveSidebars'),
  device.isMobile,
  'ui',
  undefined,
  RESET_USER_SETTINGS_TO_DEFAULTS
)
reactToToggleWithLocationRefresh(combinedSidebars)

export const showEmotes = new NiceBooleanParameter(
  'show-emotes',
  () => i18n.t('common:options.gameOptions.heroEmotes'),
  true,
  'game',
  undefined,
  RESET_USER_SETTINGS_TO_DEFAULTS
)

export const reduceMotionEnabled = new NiceBooleanParameter(
  'reduce-motion',
  () => i18n.t('common:options.graphicsOptions.reduceMotion'),
  false,
  'userGraphics',
  undefined,
  RESET_USER_SETTINGS_TO_DEFAULTS
)

export const html5Audio = new NiceBooleanParameter(
  'html5-audio',
  'HTML5 Audio',
  false,
  'secret',
  undefined,
  RESET_USER_SETTINGS_TO_DEFAULTS
)
{
  const original = html5Audio.value
  html5Audio.listen(val => {
    if (val !== original) {
      window.location.reload()
    }
  })
}

export const performanceWarning = new NiceBooleanParameter(
  'performance-warning',
  'Performance',
  false,
  queryParams.debugPerformanceWarning ? 'graphics' : 'never',
  v => (v ? 'Warned' : 'Reset'),
  RESET_USER_SETTINGS_TO_DEFAULTS,
  -100
)

export const debugGuiState = new NiceBooleanParameter(
  'secret-debug-gui',
  'Debug GUI',
  isDevMode(),
  'never',
  undefined,
  isDevMode() ? true : RESET_USER_SETTINGS_TO_DEFAULTS,
  0,
  true
)

export const toggleSkyControls = new NiceBooleanParameter(
  'toggle-sky-controls',
  'Control Sky',
  false,
  'secret',
  undefined,
  RESET_USER_SETTINGS_TO_DEFAULTS,
  -100
)

reactToToggleWithLocationRefresh(toggleSkyControls)

const skyControlCategory = toggleSkyControls.value ? 'secret' : 'never'

export const timeOfDaySlider = new NiceFloatParameter(
  'debug-time-of-day',
  'Time of Day',
  queryParams.dayPercent,
  0.0,
  1,
  distributions.linear,
  v => ~~(v * 100) + '%',
  skyControlCategory,
  true,
  0.0001,
  -100,
  false
)

export const dayLengthSlider = new NiceFloatParameter(
  'day-length',
  'Length of Day',
  env.ART_DAY_DURATION_SECONDS,
  0.0,
  500,
  distributions.linear,
  v => ~~v + 'secs.',
  skyControlCategory,
  false,
  1,
  -100,
  false
)

export const toggleSkyTimer = new NiceBooleanParameter(
  'toggle-sky-timer-v2',
  'Use SkyTimer',
  true,
  toggleSkyControls.value ? 'never' : 'secret',
  undefined,
  RESET_USER_SETTINGS_TO_DEFAULTS,
  -100
)

reactToToggleWithLocationRefresh(toggleSkyTimer)

const skyTimerCategory =
  toggleSkyControls.value || !toggleSkyTimer.value ? 'never' : 'secret'

export const skyTimerSpeed = new NiceFloatParameter(
  'skytimer-speed-v3',
  'SkyTimer Speed',
  15,
  0.5,
  20,
  distributions.quadratic,
  v => v.toFixed(4),
  skyTimerCategory,
  RESET_USER_SETTINGS_TO_DEFAULTS,
  0.0001,
  -101
)

export const skyTimerStiffness = new NiceFloatParameter(
  'skytimer-stiffness',
  'SkyTimer Stiffness',
  1.5,
  0.25,
  5,
  distributions.quadratic,
  v => v.toFixed(4),
  skyTimerCategory,
  RESET_USER_SETTINGS_TO_DEFAULTS,
  0.0001,
  -101
)

export const sunSetEmphasis = new NiceFloatParameter(
  'sunset-emphasis',
  'Sunset Emphasis',
  1,
  0,
  1,
  distributions.linear,
  v => v.toFixed(4),
  'secret',
  RESET_USER_SETTINGS_TO_DEFAULTS,
  0.0001,
  -101
)

export const automaticMatrices = new NiceBooleanParameter(
  'automatic-matrices',
  'Automatic Matrices',
  true,
  'graphics',
  undefined,
  true,
  -1001
)

export const toggleCustomMatrixUpdateHandling = new NiceBooleanParameter(
  'toggle-custom-matrix-update-handling-v2',
  'Custom Matrix Updates',
  false,
  'graphics',
  undefined,
  RESET_USER_SETTINGS_TO_DEFAULTS,
  -1001
)

reactToToggleWithLocationRefresh(toggleCustomMatrixUpdateHandling)

export const toggleForceDayTime = new NiceBooleanParameter(
  'force-day-time',
  'Force Day Time',
  false,
  'never',
  undefined,
  RESET_USER_SETTINGS_TO_DEFAULTS,
  0,
  false
)

toggleForceDayTime.listen(v => {
  if (globalAccess.sky) {
    globalAccess.sky.forceDayTime = v
  }
})

export const showParallaxOption = new NiceBooleanParameter(
  'use-parallax',
  'Use Parallax',
  false,
  'secret',
  undefined,
  RESET_USER_SETTINGS_TO_DEFAULTS,
  1002
)
reactToToggleWithLocationRefresh(showParallaxOption)

export const parallaxStrength = new NiceFloatParameter(
  'parallaxStrength',
  'Parallax Strength',
  0.5,
  0,
  2,
  distributions.linear,
  v => Math.round(v * 100) + '%',
  showParallaxOption.value ? 'graphics' : 'never',
  RESET_USER_SETTINGS_TO_DEFAULTS,
  0.0001
)

export const useOrientationSensorForParallax = new NiceBooleanParameter(
  'useOrientationForParallax',
  'Use Device Tilt for Parallax',
  false,
  'secret',
  b => (b ? 'Yes' : 'No'),
  RESET_USER_SETTINGS_TO_DEFAULTS,
  0.0001
)

const iOS = device.isIOS || device.isIpadOS
export const useParallaxOnCardInspector = new NiceBooleanParameter(
  'useParallaxOnCardInspector3',
  'Use Orientation Sensor',
  !iOS,
  iOS ? 'userGraphics' : 'foils',
  b => (b ? 'Yes' : 'No'),
  RESET_USER_SETTINGS_TO_DEFAULTS,
  iOS ? -6 : 0.0001
)

useParallaxOnCardInspector.listen(v => {
  useOrientationSensorForParallax.value = v
})

reactToToggleWithLocationRefresh(useParallaxOnCardInspector)

export const interceptLogs = new NiceBooleanParameter(
  'intercept-logs-v3',
  'Intercept Logs',
  !device.isDesktop,
  'secret',
  b => (b ? 'Yes' : 'No'),
  RESET_USER_SETTINGS_TO_DEFAULTS,
  -100
)

export const showRelatedCardsOnHover = new NiceBooleanParameter(
  'show-related-cards-on-hover',
  () => i18n.t('common:options.uiOptions.showRelatedCardsOnHover'),
  device.isMobile ? false : true,
  'ui',
  undefined,
  RESET_USER_SETTINGS_TO_DEFAULTS
)

export const showTooltipsOnHover = new NiceBooleanParameter(
  'show-tooltips-on-hover',
  () => i18n.t('common:options.uiOptions.showTooltipsOnHover'),
  true,
  'ui',
  undefined,
  RESET_USER_SETTINGS_TO_DEFAULTS
)

reactToToggleWithLocationRefresh(interceptLogs)

export const toggleActionHistorySideBarOpen = new NiceBooleanParameter(
  'action-history-sidebar-open',
  'Open Action History',
  !device.isMobile,
  'never',
  undefined,
  RESET_USER_SETTINGS_TO_DEFAULTS,
  0,
  true
)

export const useBigTouchTargets = new NiceBooleanParameter(
  'use-big-touch-targets',
  'Enhance touch precision',
  false,
  'secret',
  undefined,
  RESET_USER_SETTINGS_TO_DEFAULTS,
  0,
  true
)

export const bigHandMode = new NiceBooleanParameter(
  'big-hand-mode',
  'Big hand mode',
  false,
  'secret',
  undefined,
  RESET_USER_SETTINGS_TO_DEFAULTS,
  0,
  true
)
reactToToggleWithLocationRefresh(bigHandMode)

export const heroCenterMode = new NiceBooleanParameter(
  'hero-center-mode',
  'Hero center mode',
  false,
  'secret',
  undefined,
  RESET_USER_SETTINGS_TO_DEFAULTS,
  0,
  true
)
reactToToggleWithLocationRefresh(heroCenterMode)

export const playRawAudioFx = new NiceBooleanParameter(
  'playRawAudioFx',
  'Play Raw Audio Fx',
  false,
  'secret',
  undefined,
  RESET_USER_SETTINGS_TO_DEFAULTS,
  0,
  true
)

export const fogNear = new NiceFloatParameter(
  'fogNear2',
  'Fog Near',
  0.9697,
  0,
  2,
  distributions.linear,
  v => (v * 100).toFixed(2) + 'cm',
  'secret',
  RESET_USER_SETTINGS_TO_DEFAULTS,
  0.0001
)

export const fogFar = new NiceFloatParameter(
  'fogFar2',
  'Fog Far',
  1.2121,
  0,
  5,
  distributions.linear,
  v => (v * 100).toFixed(2) + 'cm',
  'secret',
  RESET_USER_SETTINGS_TO_DEFAULTS,
  0.0001
)

export const toggleFPSCounter = new NiceBooleanParameter(
  'toggle-fps-counter',
  'FPS Counter',
  true,
  'webGL',
  b => (b ? 'Running' : 'Paused'),
  true
)

// new NiceMethod(
//   '',
//   async () => {
//     const container = globalAccess.ui!.getContainer('advancedOptions')
//     await container.ready
//     container.fadeIn()
//     globalAccess.ui!.getContainer('options').close()
//   },
//   'Advanced Options',
//   'user',
//   -1000
// )

new NiceMethod(
  '',
  async () => {
    const container = globalAccess.ui!.getContainer('gameOptions')
    await container.ready
    container.fadeIn()
    globalAccess.ui!.getContainer('options').close()
  },
  () => i18n.t('common:options.game'),
  'options',
  1
)
new NiceMethod(
  '',
  async () => {
    const container = globalAccess.ui!.getContainer('uiOptions')
    await container.ready
    container.fadeIn()
    globalAccess.ui!.getContainer('options').close()
  },
  () => i18n.t('common:options.ui'),
  'options',
  2
)

new NiceMethod(
  '',
  async () => {
    const container = globalAccess.ui!.getContainer('soundOptions')
    await container.ready
    container.fadeIn()
    globalAccess.ui!.getContainer('options').close()
  },
  () => i18n.t('common:options.sound'),
  'options',
  3
)

new NiceMethod(
  '',
  async () => {
    const container = globalAccess.ui!.getContainer('graphicsOptions')
    await container.ready
    container.fadeIn()
    globalAccess.ui!.getContainer('options').close()
  },
  () => i18n.t('common:options.graphics'),
  'options',
  4
)

export const showCauseAndEffect = new NiceBooleanParameter(
  'show-cause-and-effect-v2',
  () => i18n.t('common:options.gameOptions.showCauseAndEffectLines'),
  true,
  'game',
  undefined,
  undefined,
  1000
)

export const causeAndEffectSpeed = new NiceFloatParameter(
  'cause-and-effect-speed',
  'Cause And Effect Speed',
  1,
  0.1,
  1,
  v => v,
  v => `${v.toFixed(1)}x`,
  'secret'
)

export const aimAboveFingerTipAmt = new NiceFloatParameter(
  'aim-above-finger-tip-amt',
  'Aim Above Finger Tip',
  0,
  0,
  11,
  v => v,
  v => (v > 0 ? `${v + 9}% of Screen Height` : 'No'),
  device.isMobile ? 'game' : 'secret',
  false,
  1,
  -1000,
  undefined,
  undefined,
  1 / 10
)
