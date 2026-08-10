import { GameMode } from '@opensky/proto'

import { storeHelper } from '~/state/index'
import { getTutorial } from '~/tutorial/Tutorial'

import { gameMode } from './envGameModeHelpers'

export async function shouldShowTutorialContinueButton(): Promise<boolean> {
  const playerLost = (await storeHelper.getMatchEndType()) === 'defeat'
  const nextLevel = !!getTutorial()?.config?.nextLevel
  // we don't want to show a continue button on your last level, unless you lost
  return gameMode === GameMode.TUTORIAL && (playerLost || nextLevel)
}
