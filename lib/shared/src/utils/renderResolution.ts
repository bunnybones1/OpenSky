import { RESET_USER_SETTINGS_TO_DEFAULTS } from '../userSettings'
import { distributions } from './distributions'

import NiceFloatParameter from './NiceFloatParameter'

export const supportedResolutions = [25, 35, 50, 70, 100]

export const textureResolution = new NiceFloatParameter(
  'texture-resolution',
  'Texture Resolution',
  4,
  0,
  4,
  distributions.linear,
  v => supportedResolutions[Math.round(v)] + '%',
  'graphics',
  RESET_USER_SETTINGS_TO_DEFAULTS,
  0.01,
  -101
)
