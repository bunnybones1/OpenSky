import { queryStringUrlReplacement } from '@opensky/shared/utils/location'

import { getAssetsManager } from '~/assets'
import TransformComponent from '~/components/TransformComponent'
import { BUTTON_HEIGHT } from '~/constants'
import { getFakeRewards, RankChangeRewardPackName } from '~/debug/fakeRewards'
import { debugAccounts } from '~/debugAccounts'
import { isBotGame } from '~/helpers/envGameModeHelpers'
import { Pin, ReadonlyPin } from '~/helpers/LayoutHelpers'
import queryParams from '~/queryParams'
import { scene } from '~/scenes/arena/scene'
import { store, storeHelper } from '~/state'
import BasicIslandTest from '~/tests/BasicIslandTest'
import { globalAccess } from '~/utils/globalAccess'
import { NOOP } from '~/utils/jsUtils'
import { changeUrlParamAndReload } from '~/utils/location'
import {
  findObject3DsWhoseNamesInclude,
  removeFromParent
} from '~/utils/threeUtils'
import { createButton, createButtonText, createSkipButton } from '~/utils/ui'

async function testEndMatchRankedElo() {
  if (isBotGame) {
    changeUrlParamAndReload('mode', 'RANKED_CONSTRUCTED')
  }

  const islandTest = new BasicIslandTest()
  await islandTest.init()
  TransformComponent.defaultScene = scene

  await getAssetsManager().loadAsset('uiSmall')
  await getAssetsManager().loadAsset('particle')

  storeHelper.fakeGameOver = true
  storeHelper.useFakeStoreData = true
  store.emitStoreEvent()

  const ui = globalAccess.ui!
  const matchEndContainer = ui.getContainer('matchEndVictory')
  const testContainer = ui.getContainer('randomTests')
  await testContainer.ready
  await testContainer.fadeIn()
  await matchEndContainer.ready
  await matchEndContainer.fadeIn()

  const currentPreviewButton = createButton(
    testContainer,
    NOOP,
    Pin.fromPixels(BUTTON_HEIGHT * 5, BUTTON_HEIGHT),
    ReadonlyPin.BottomRight,
    ReadonlyPin.BottomRight.cloneOffset(0, BUTTON_HEIGHT * -5)
  )
  const text = createButtonText(currentPreviewButton.mesh, '')

  const openAsIndividualButton = createButton(
    testContainer,
    () => {
      if (queryParams.fakeRewards) {
        location.href = queryStringUrlReplacement(
          location.href,
          'fakeRewards',
          ``
        )
      } else {
        location.href = queryStringUrlReplacement(
          location.href,
          'fakeRewards',
          `rank_${text.text}`
        )
      }
    },
    Pin.fromPixels(BUTTON_HEIGHT * 5, BUTTON_HEIGHT),
    ReadonlyPin.BottomRight,
    ReadonlyPin.BottomRight.cloneOffset(0, BUTTON_HEIGHT * -3.5)
  )
  createButtonText(
    openAsIndividualButton.mesh,
    queryParams.fakeRewards ? 'back to all tests' : 'open individual test'
  )

  const ranksToIter = [...ranks]
  const debuAccountLvl15 = debugAccounts[0]
  debuAccountLvl15.level = 15
  for (const rank of queryParams.fakeRewards
    ? [queryParams.fakeRewards]
    : ranksToIter) {
    const rr = ui.getContainer('rewardRank')

    text.text = rank.replace('rank_', '')
    await matchEndContainer.ready
    await rr.ready
    // wipe out any existing match end +x elo text
    const unwantedRow = findObject3DsWhoseNamesInclude(rr, 'rankRow')
    unwantedRow.forEach(removeFromParent)
    const skipButton = createSkipButton(rr, undefined, false, 'CONTINUE')
    await rr.prepare(getFakeRewards(rank)!, debugAccounts[0])
    await rr.fadeIn()
    await rr.present(skipButton)
    await rr.fadeOut()
    ui.disposeContainer('rewardRank')
  }
}

export const test = testEndMatchRankedElo

const ranks: RankChangeRewardPackName[] = [
  // rank up from trainee to apprentice
  'rank_traineeFloor_to_traineeLow',
  'rank_traineeLow_to_traineeHigh',
  'rank_traineeHigh_to_apprenticeFloor',
  // rank down from apprentice to trainee
  'rank_apprenticeFloor_to_traineeHigh',
  'rank_traineeHigh_to_traineeLow',
  'rank_traineeLow_to_traineeFloor',
  // rank up from apprentice to expert
  'rank_apprenticeFloor_to_apprenticeLow',
  'rank_apprenticeLow_to_apprenticeHigh',
  'rank_apprenticeHigh_to_expertFloor',

  // rank up from expert to master
  'rank_expertFloor_to_expertLow',
  'rank_expertLow_to_expertHigh',
  'rank_expertHigh_to_masterBottomBottom',

  // rank up from Master to GW
  'rank_masterBottomBottom_to_masterBottom',
  'rank_masterBottom_to_masterMiddleBottom',
  'rank_masterMiddleBottom_to_masterMiddle',
  'rank_masterMiddle_to_masterTopBottom',
  'rank_masterTopBottom_to_masterTop',

  'rank_masterTop_to_gwBottomBottom',
  'rank_gwBottomBottom_to_gwBottom',
  'rank_gwBottom_to_gwMiddleBottom',
  'rank_gwMiddleBottom_to_gwMiddle',
  'rank_gwMiddle_to_gwTopBottom',
  'rank_gwTopBottom_to_gwTop',
  'rank_gwTop_to_gwTopTop',

  'rank_masterTop_to_gwBottom',
  'rank_masterTop_to_gwMiddle',
  'rank_masterTop_to_gwTop',
  'rank_gwMiddleBottom_to_gwBottom',
  'rank_gwBottomBottom_to_masterTopBottom',
  'rank_gwBottomBottom_to_masterTop',
  // rank down from GW to Master
  'rank_gwBottom_to_masterBottom',
  'rank_gwBottom_to_masterMiddle',
  'rank_gwBottom_to_masterTop',
  'rank_masterTop_to_masterTopBottom',
  'rank_masterTopBottom_to_masterMiddle',
  'rank_masterBottom_to_expertHigh',

  'rank_gwMiddle_to_masterBottom',
  'rank_gwMiddle_to_masterMiddle',
  'rank_gwMiddle_to_masterTop',

  'rank_gwTop_to_masterBottom',
  'rank_gwTop_to_masterMiddle',
  'rank_gwTop_to_masterTop',

  // gain and lose elo within Master without changing rank
  'rank_masterBottomBottom_to_masterBottom',
  'rank_masterBottom_to_masterBottomBottom',

  'rank_masterMiddleBottom_to_masterMiddle',
  'rank_masterMiddle_to_masterMiddleBottom',

  'rank_masterTopBottom_to_masterTop',
  'rank_masterTop_to_masterTopBottom',

  // gain and lose elo within GW without changing rank
  'rank_gwBottomBottom_to_gwBottom',
  'rank_gwBottom_to_gwBottomBottom',

  'rank_gwMiddleBottom_to_gwMiddle',
  'rank_gwMiddle_to_gwMiddleBottom',

  'rank_gwTopBottom_to_gwTop',
  'rank_gwTop_to_gwTopBottom'
]
