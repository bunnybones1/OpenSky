import { DeckClass } from '@opensky/proto'

import StarterDeckAssemblage from '~/assemblages/StarterDeckAssemblage'
import { getAssetsManager } from '~/assets'
import { createWorldEntity } from '~/helpers/worldHelpers'
import { UI } from '~/scenes/ui'

import { BaseTestScene } from './BaseTestScene'

class TestStarterDeckScene extends BaseTestScene {
  async initUI(ui: UI) {
    await getAssetsManager().loadAsset('starterDeckFrame')

    const container = ui.getContainer('randomTests')
    await container.ready
    const deck = createWorldEntity(StarterDeckAssemblage(DeckClass.STR))
    deck.get('zone').setUserZone('DisabledReward')
    deck.get('zone').setUserZone('HeroReward')
    await container.fadeIn()
    super.initUI(ui)
  }

  update(dt: number) {
    super.update(dt)
  }
}
export const scene = TestStarterDeckScene
