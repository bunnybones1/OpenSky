import { GameMode, RewardType } from '@opensky/proto'

import { getAssetsManager } from '~/assets'
import { getFakeRewards } from '~/debug/fakeRewards'
import { MatchEndType } from '~/helpers/typeHelpers'
import queryParams from '~/queryParams'
import { UI } from '~/scenes/ui'
import { createRankStage } from '~/scenes/ui/containers/rewardRank'
import UpdateManager from '~/systems/UpdateManager'

import { BaseTestScene } from './BaseTestScene'

const endType: MatchEndType = 'defeat'

class TestRankBarScene extends BaseTestScene {
  async initUI(ui: UI) {
    await getAssetsManager().loadAsset('uiSmall')
    await getAssetsManager().loadAsset('particle')
    await getAssetsManager().loadAsset('audioFxMatchEnd')

    const container = ui.getContainer('randomTests')

    await container.ready

    const rankBar = await createRankStage(
      container,
      GameMode.RANKED_CONSTRUCTED,
      //GameMode.RANKED_DISCOVERY,
      endType,
      'raccagreen',
      ['str']
    )!

    UpdateManager.register(rankBar)
    const fakeRewards = getFakeRewards(queryParams.fakeRewards || 'basic')
    if (fakeRewards && fakeRewards.length > 0) {
      if (fakeRewards[0].type === RewardType.RANK) {
        rankBar.bar.prepare(fakeRewards[0].rank!)
      }
    }

    await container.fadeIn()

    await rankBar.bar.perform()

    super.initUI(ui)
  }

  update(dt: number) {
    super.update(dt)
  }
}
export const scene = TestRankBarScene
