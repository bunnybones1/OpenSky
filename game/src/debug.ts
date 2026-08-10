import { isDevMode } from '@opensky/shared/devMode'
import { getUrlInt } from '@opensky/shared/utils/location'

import { statePlayer } from './state/StatePlayer'
import keyboard from './systems/input/keyboard'
import fpsControls from './utils/fpsControls'
import {
  boobyTrap,
  decorateMethodAfter,
  decorateMethodBefore
} from './utils/jsUtils'

Object.defineProperty(window, 'boobyTrap', { value: boobyTrap })
Object.defineProperty(window, 'decorateMethodBefore', {
  value: decorateMethodBefore
})
Object.defineProperty(window, 'decorateMethodAfter', {
  value: decorateMethodAfter
})

if (isDevMode()) {
  keyboard.listenToKey('`', () => fpsControls.toggle())
  keyboard.listenToKey('p', () => statePlayer.playPause())
}

export const bezierAnimTestParams = {
  repeats: getUrlInt('bezierRepeats', 1, 1, 200),
  repeatNth: getUrlInt('bezierRepeatNth', 0, 0, 200)
}
