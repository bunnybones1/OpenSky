import { getAssetsManager } from '~/assets'
import { conquestDataHelper } from '~/helpers/conquestDataHelper'
import { isConquestGame } from '~/helpers/envGameModeHelpers'
import { changeUrlParamAndReload } from '~/utils/location'

import testEndMatch from './testEndMatch'

async function testEndMatchConquest() {
  await getAssetsManager().loadAsset('particle')
  if (!isConquestGame) {
    changeUrlParamAndReload('mode', 'CONQUEST_DISCOVERY')
  }
  conquestDataHelper.useFakeConquestData = true
  await testEndMatch()
}

export const test = testEndMatchConquest
