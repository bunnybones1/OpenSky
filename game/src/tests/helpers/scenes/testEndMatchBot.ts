import { isBotGame } from '~/helpers/envGameModeHelpers'
import { changeUrlParamAndReload } from '~/utils/location'

import testEndMatch from './testEndMatch'

async function testEndMatchBot() {
  if (!isBotGame) {
    changeUrlParamAndReload('mode', 'LOCAL_BOT')
  }
  await testEndMatch()
}

export const test = testEndMatchBot
