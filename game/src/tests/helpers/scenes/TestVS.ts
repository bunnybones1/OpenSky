import { AssetPriority } from '@opensky/shared/assets'

import { getAssetsManager } from '~/assets'
import { conquestDataHelper } from '~/helpers/conquestDataHelper'
import { UI } from '~/scenes/ui'
import { store, storeHelper } from '~/state'
import { loadProgressHelper } from '~/state/loadProgressHelper'
import { simpleTweener } from '~/systems/animation/tweeners'
import { animationDelay } from '~/utils/asyncUtils'

import { BaseTestScene } from './BaseTestScene'

class TestVS extends BaseTestScene {
  async initUI(ui: UI) {
    await getAssetsManager().loadAsset('uiPreloader')
    await getAssetsManager().loadAsset('uiSmall')
    await getAssetsManager().loadAsset('iconPalette')
    await getAssetsManager().loadAsset('uiPalette')
    await getAssetsManager().loadAsset('particle')
    await getAssetsManager().loadAsset('gamePiecesGraphical')

    getAssetsManager().loadPriority(AssetPriority.PreGame)

    storeHelper.useFakeStoreData = true
    conquestDataHelper.useFakeConquestData = true
    store.emitStoreEvent()

    const vsContainer = ui.getContainer('vs')
    await vsContainer.ready
    vsContainer.fadeIn()
    for (let i = 0; i < 10; i++) {
      loadProgressHelper.matchLoadingScreenAbandonTime = Date.now() + 10_000
      loadProgressHelper.playerLoadingProgress = 0
      loadProgressHelper.opponentLoadingProgress = 0

      // vsContainer.fadeInHeros()
      await simpleTweener.to({
        description: 'player loader helper',
        target: loadProgressHelper,
        propertyGoals: {
          playerLoadingProgress: 0.8,
          opponentLoadingProgress: 0.8
        },
        duration: 5_000
      }).finished
      await simpleTweener.to({
        description: 'player loader helper',
        target: loadProgressHelper,
        propertyGoals: {
          playerLoadingProgress: 1
        },
        duration: 5_000
      }).finished
      await simpleTweener.to({
        description: 'player loader helper',
        target: loadProgressHelper,
        propertyGoals: {
          opponentLoadingProgress: 1
        },
        duration: 5_000
      }).finished

      // vsContainer.fadeOutHeros()
      await animationDelay(2000)
    }
  }
}

export const scene = TestVS
