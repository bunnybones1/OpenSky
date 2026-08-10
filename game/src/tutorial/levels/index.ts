import { TutorialConfig } from '@opensky/shared/tutorialConfig'

import example from './example'
import tutorial from './level1'
export const levels = {
  '0': example,
  '1': tutorial
}

// check configs are valid
void (levels as { [K in keyof typeof levels]: TutorialConfig })
