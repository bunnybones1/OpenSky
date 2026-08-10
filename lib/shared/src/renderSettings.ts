import device from './device'
import { i18n } from '@opensky/language-manager'
import { RESET_USER_SETTINGS_TO_DEFAULTS } from './userSettings'
import { distributions } from './utils/distributions'
import NiceBooleanParameter from './utils/NiceBooleanParameter'
import NiceFloatParameter from './utils/NiceFloatParameter'

export const useRecommendedTextureResolution = new NiceBooleanParameter(
  'use-recommended-texture-resolution',
  'Texture Resolution',
  true,
  'graphics',
  v => (v ? 'Use Recommended' : 'Override'),
  RESET_USER_SETTINGS_TO_DEFAULTS,
  -100
)

export const MAX_HEIGHT_FOR_HIGH_QUALITY = 1000

export const downsamplePixels = new NiceFloatParameter(
  'pixel-down-sample-v4',
  () => i18n.t('common:options.graphicsOptions.renderResolution'),
  device.isMobile && device.physicalDeviceHeight > MAX_HEIGHT_FOR_HIGH_QUALITY
    ? 2
    : 3,
  1,
  3,
  distributions.linear,
  v => {
    switch (v) {
      case 1:
        return '33%'
      case 2:
        return '50%'
      case 3:
        return '100%'
      default:
        return '100%'
    }
  },
  'userGraphics',
  RESET_USER_SETTINGS_TO_DEFAULTS,
  1,
  -1,
  undefined,
  undefined,
  0.5
)
