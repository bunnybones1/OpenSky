import queryParams from './sharedQueryParams'
import { i18n } from '@opensky/language-manager'
// import { isIOSNativeApp } from './check-mobile-app-type'
import device from './device'
import { distributions } from './utils/distributions'
import NiceBooleanParameter from './utils/NiceBooleanParameter'
import NiceFloatParameter from './utils/NiceFloatParameter'

export const RESET_USER_SETTINGS_TO_DEFAULTS = queryParams.resetSettings

export const musicVolume = new NiceFloatParameter(
  'music-volume',
  () => i18n.t('common:options.soundOptions.musicVolume'),
  0.5,
  0,
  1,
  distributions.linear,
  v => ~~(v * 100) + '%',
  'sound',
  RESET_USER_SETTINGS_TO_DEFAULTS,
  0.01,
  101
)

export const sfxVolume = new NiceFloatParameter(
  'sfx-volume',
  () => i18n.t('common:options.soundOptions.sfxVolume'),
  1,
  0,
  1,
  distributions.linear,
  v => ~~(v * 100) + '%',
  'sound',
  RESET_USER_SETTINGS_TO_DEFAULTS,
  0.01,
  100
)

export const muteAudio = new NiceBooleanParameter(
  'mute-audio',
  () => i18n.t('common:options.soundOptions.muteAllSounds'),
  false,
  'sound',
  undefined,
  RESET_USER_SETTINGS_TO_DEFAULTS
)

const DEFAULT_UI_PRESCALE = device.isMobile ? 0.65 : 1
export const uiScale = new NiceFloatParameter(
  'ui-scale',
  () => i18n.t('common:options.uiOptions.uiScale'),
  DEFAULT_UI_PRESCALE,
  0.4,
  1.5,
  distributions.linear,
  v => Math.round(v * 100) + '%',
  'ui',
  RESET_USER_SETTINGS_TO_DEFAULTS,
  0.0001,
  -2
)

export const useWorkerlessCacheStorage = new NiceBooleanParameter(
  'use-workerless-cache-storage-v2',
  'Use Workerless Cache Storage (Experimental)',
  false,
  'secret',
  undefined,
  RESET_USER_SETTINGS_TO_DEFAULTS
)

export const sendTimeMarksToAnalytics = new NiceBooleanParameter(
  'send-time-marks-to-analytics',
  'Send Time Marks to Analytics',
  false,
  'secret',
  undefined,
  RESET_USER_SETTINGS_TO_DEFAULTS
)
