import { i18n } from '@opensky/language-manager'
import device from '@opensky/shared/device'
import {
  BATTERY_SAVER_FRAMERATE,
  MAX_FRAMERATE
} from '@opensky/shared/gameConstants'
import { MAX_HEIGHT_FOR_HIGH_QUALITY } from '@opensky/shared/renderSettings'
import { RESET_USER_SETTINGS_TO_DEFAULTS } from '@opensky/shared/userSettings'
import { getLocalStorageBoolean } from '@opensky/shared/utils/localStorage'
import { clamp } from '@opensky/shared/utils/math'
import NiceBooleanParameter from '@opensky/shared/utils/NiceBooleanParameter'
import NiceFloatParameter from '@opensky/shared/utils/NiceFloatParameter'

import { reactToToggleWithLocationRefresh } from './userSettings'

export const renderShadows = new NiceBooleanParameter(
  'render-shadows.v2',
  'Render Shadows',
  //mobile default is false, desktop default to whatever it used to be
  device.isMobile
    ? false
    : getLocalStorageBoolean('opensky-settings-render-shadows', true),
  'never',
  v => (v ? 'Yes' : 'No'),
  RESET_USER_SETTINGS_TO_DEFAULTS,
  -99
)

export const renderClouds = new NiceBooleanParameter(
  'render-clouds.v4',
  'Render Clouds',
  true,
  'graphics',
  v => (v ? 'Yes' : 'No'),
  RESET_USER_SETTINGS_TO_DEFAULTS,
  -100
)

export const testOverdraw = new NiceBooleanParameter(
  'test-overdraw',
  'Test Overdraw',
  false,
  'graphics',
  v => (v ? 'Yes' : 'No'),
  RESET_USER_SETTINGS_TO_DEFAULTS,
  -99
)

export const forceWebGL1 = new NiceBooleanParameter(
  'force-webgl1',
  () => i18n.t('common:options.graphicsOptions.forceWebGL1'),
  true,
  'userGraphics',
  undefined,
  RESET_USER_SETTINGS_TO_DEFAULTS,
  -1100
)
reactToToggleWithLocationRefresh(forceWebGL1)

export const toggleAntialias = new NiceBooleanParameter(
  'antialias-v4',
  () => i18n.t('common:options.graphicsOptions.antialiasing'),
  !(
    !device.isMobile &&
    device.physicalDeviceHeight > MAX_HEIGHT_FOR_HIGH_QUALITY
  ),
  'userGraphics',
  undefined,
  RESET_USER_SETTINGS_TO_DEFAULTS,
  -1000
)

export const defaultTargetFps = new NiceFloatParameter(
  'target-fps-v4',
  () => i18n.t('common:options.graphicsOptions.targetFPS'),
  device.isMobile ? 60 : MAX_FRAMERATE,
  10,
  MAX_FRAMERATE,
  v => clamp(Math.pow(v, 2), 0, 1),
  v => {
    const roundedToNearest5 = Math.floor(v)
    // 144hz is a real refresh rate, so special-case 145 -> 144 in UI :)
    // This is just to please the gamers

    return roundedToNearest5 === 145
      ? '144'
      : roundedToNearest5 === 240
      ? 'VSync'
      : roundedToNearest5.toString()
  },
  'userGraphics',
  RESET_USER_SETTINGS_TO_DEFAULTS,
  5,
  -3,
  undefined,
  undefined,
  0.11
)

// Disable battery saver when FPS is adjusted
let lastKnownPreferredFrameRate = defaultTargetFps.value

const batterySaver = new NiceBooleanParameter(
  'battery-saver',
  () => i18n.t('common:options.graphicsOptions.batterySaver'),
  false,
  'userGraphics',
  undefined,
  RESET_USER_SETTINGS_TO_DEFAULTS,
  -1000
)
// When battery saver toggles on, set FPS to 30.
batterySaver.listen(enabled => {
  if (enabled) {
    defaultTargetFps.value = BATTERY_SAVER_FRAMERATE
  } else {
    if (lastKnownPreferredFrameRate > BATTERY_SAVER_FRAMERATE) {
      defaultTargetFps.value = lastKnownPreferredFrameRate
    } else {
      defaultTargetFps.value = MAX_FRAMERATE
    }
  }
}, false)

defaultTargetFps.listen(newVal => {
  lastKnownPreferredFrameRate = newVal
  if (batterySaver.value && newVal > BATTERY_SAVER_FRAMERATE) {
    batterySaver.value = false
  }
})
