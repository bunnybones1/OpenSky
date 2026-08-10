import { gameMode, isRankedGame } from '~/helpers/envGameModeHelpers'
import { changeUrlParamAndReload } from '~/utils/location'

import testEndMatch from './testEndMatch'

async function testEndMatchRanked() {
  if (!isRankedGame(gameMode)) {
    changeUrlParamAndReload('mode', 'RANKED_CONSTRUCTED')
  }
  await testEndMatch()
}

export const test = testEndMatchRanked
