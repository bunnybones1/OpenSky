import { AssetPriority } from '@opensky/shared/assets'
import { CardLibrary } from '@skyweaver/state-metadata'

import { getAssetsManager } from '~/assets'
import { initializeCardCache } from '~/cardCache'
import CardInstanceComponent from '~/components/CardInstanceComponent'
import { createCard } from '~/factories/CardFactory'
import { knownCards } from '~/helpers/compoundCollections'
import { conquestDataHelper } from '~/helpers/conquestDataHelper'
import { markUIRootDirty } from '~/helpers/I2D'
import { UI } from '~/scenes/ui'
import DeckViewerSidebar from '~/scenes/ui/components/DeckViewerSidebar'
import { SidebarPosition } from '~/scenes/ui/components/SlideOutSidebar/constants'
import {
  sortByCostAndDimness,
  sortByReverseCardCacheOrder
} from '~/scenes/ui/containers/deckSort'
import { continueHandler } from '~/scenes/ui/helpers'
import { store, storeHelper } from '~/state'
import { loadProgressHelper } from '~/state/loadProgressHelper'
import { interceptLogs } from '~/userSettings'
import { animationDelay } from '~/utils/asyncUtils'
import { getFakeCardTagView } from '~/utils/card'
import { waitForNextFrame } from '~/utils/onNextFrame'

import { BaseTestScene } from './BaseTestScene'

const knownCardsInstances = knownCards
  .intersect(CardInstanceComponent.entities)
  .map(c => c.getComponent('cardInstance')!)
class TestRenderOrderDeckSidebarUIScene extends BaseTestScene {
  leftBar: DeckViewerSidebar | undefined
  rightBar: DeckViewerSidebar | undefined
  async initUI(ui: UI) {
    await getAssetsManager().loadAsset('uiSmall')

    interceptLogs.value = false
    initializeCardCache(0)

    const cardViews = [...CardLibrary.keys()]
      .map(id => {
        const view = getFakeCardTagView(id, 'base')
        // view.state.view.rarity = 'none'
        return view
      })
      .filter(
        c => c.state.view.type === 'spell' || c.state.view.type === 'unit'
      )
    const CARD_COUNT = 40
    for (const view of cardViews.slice(0, CARD_COUNT)) {
      createCard(view, true)
    }

    const msgContainer = ui.getContainer('specialMessage')
    await msgContainer.ready
    msgContainer.announce('Commencing a test of graphical render order')

    await Promise.all([
      getAssetsManager().loadAsset('gamePiecesPhysical'),
      getAssetsManager().loadAsset('gamePiecesGraphical')
    ])

    const container = ui.getContainer('randomTests')
    await container.ready
    container.show()
    this.leftBar = new DeckViewerSidebar(
      SidebarPosition.Left,
      knownCardsInstances,
      () => {
        //
      },
      () => {
        //
      },
      sortByReverseCardCacheOrder
    )
    this.rightBar = new DeckViewerSidebar(
      SidebarPosition.Right,
      knownCardsInstances,
      () => {
        //
      },
      () => {
        //
      },
      sortByCostAndDimness
    )
    container.add(this.leftBar)
    container.add(this.rightBar)
    this.rightBar.open()
    this.leftBar.open()

    knownCardsInstances.listenForAdd(card => {
      this.leftBar!.createRow(card)
      this.rightBar!.createRow(card)
    })

    getAssetsManager().loadPriority(AssetPriority.PreGame)

    storeHelper.useFakeStoreData = true
    conquestDataHelper.useFakeConquestData = true
    store.emitStoreEvent()

    const vsContainer = ui.getContainer('vs')
    await vsContainer.ready
    vsContainer.fadeIn()
    loadProgressHelper.matchLoadingScreenAbandonTime = Date.now() + 10_000
    loadProgressHelper.playerLoadingProgress = 0
    loadProgressHelper.opponentLoadingProgress = 0

    // await vsContainer.fadeInHeros()

    await animationDelay(1500)

    interceptLogs.value = true
    markUIRootDirty(ui.allContainersInOne)
    await waitForNextFrame()
    interceptLogs.value = false

    msgContainer.announce('Sending results back to the dev team').then(() => {
      msgContainer
        .announce('Thank you for your help!')
        .then(() => continueHandler())
    })
    await animationDelay(1000)
    await vsContainer.fadeOut()

    this.rightBar.close()
    this.leftBar.close()

    super.initUI(ui)
  }

  update(dt: number) {
    super.update(dt)
    this.leftBar?.update(dt)
    this.rightBar?.update(dt)
  }
}
export const scene = TestRenderOrderDeckSidebarUIScene
export const showDebugMenu = false
