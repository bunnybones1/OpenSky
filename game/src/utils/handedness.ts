import device from '@opensky/shared/device'
import { RESET_USER_SETTINGS_TO_DEFAULTS } from '@opensky/shared/userSettings'
import { distributions } from '@opensky/shared/utils/distributions'
import NiceFloatParameter from '@opensky/shared/utils/NiceFloatParameter'

import { ALLOW_USER_HANDEDNESS_PREFERENCE } from '~/constants'

type HandednessType = 'left' | 'leftish' | 'rightish' | 'right'

const handednessValues: HandednessType[] = [
  'left',
  'leftish',
  'rightish',
  'right'
]

const handednessLabels = new Map<HandednessType, string>()
  .set('left', 'Left Hand Only')
  .set('leftish', 'Left Hand Dominant')
  .set('rightish', 'Right Hand Dominant')
  .set('right', 'Right Hand Only')

const handednessParameter = new NiceFloatParameter(
  'handedness',
  'Handedness',
  3,
  0,
  3,
  distributions.linear,
  v => {
    return handednessLabels.get(handednessValues[~~v])!
  },
  device.useTouch && ALLOW_USER_HANDEDNESS_PREFERENCE ? 'game' : 'never',
  RESET_USER_SETTINGS_TO_DEFAULTS,
  1,
  -4,
  undefined,
  undefined,
  1 / 2
)

export function getHandDirection(initialPosX: number) {
  switch (handednessValues[~~handednessParameter.value]) {
    case 'left':
      return -1
    case 'leftish':
      return initialPosX > 0.2 ? 1 : -1
    case 'rightish':
      return initialPosX > -0.2 ? 1 : -1
    case 'right':
      return 1
    default:
      return 0
  }
}
