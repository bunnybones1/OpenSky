import { CardLibrary } from '@skyweaver/state-metadata'

import { getAssetsManager } from '~/assets'
import { initializeCardCache } from '~/cardCache'
import CardInstanceComponent from '~/components/CardInstanceComponent'
import { createCard } from '~/factories/CardFactory'
import { knownCards } from '~/helpers/compoundCollections'
import { UI } from '~/scenes/ui'
import DeckViewerSidebar from '~/scenes/ui/components/DeckViewerSidebar'
import { SidebarPosition } from '~/scenes/ui/components/SlideOutSidebar/constants'
import {
  sortByCostAndDimness,
  sortByReverseCardCacheOrder,
  sortByReverseCostAndDimness
} from '~/scenes/ui/containers/deckSort'
import { getFakeCardTagView } from '~/utils/card'
import { makeQuickButtonColumn, QuickButtonData } from '~/utils/quickButton'

import { BaseTestScene } from './BaseTestScene'

const knownCardsInstances = knownCards
  .intersect(CardInstanceComponent.entities)
  .map(c => c.getComponent('cardInstance')!)
class TestDeckSidebarUIScene extends BaseTestScene {
  leftBar: DeckViewerSidebar | undefined
  rightBar: DeckViewerSidebar | undefined
  async initUI(ui: UI) {
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

    await Promise.all([
      getAssetsManager().loadAsset('uiSmall'),
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
    setTimeout(() => {
      this.rightBar!.changeSort(sortByReverseCostAndDimness)
      this.rightBar!.matrix.opacity = 0.7
    }, 2000)
    container.add(this.leftBar)
    container.add(this.rightBar)
    this.rightBar.open()
    this.leftBar.open()

    knownCardsInstances.listenForAdd(card => {
      this.leftBar!.createRow(card)
      this.rightBar!.createRow(card)
    })

    makeQuickButtonColumn(container, [
      new QuickButtonData('toggle left', () => this.leftBar!.toggle()),
      new QuickButtonData('toggle right', () => this.rightBar!.toggle())
    ])
    super.initUI(ui)
  }

  update(dt: number) {
    super.update(dt)
    this.leftBar?.update(dt)
    this.rightBar?.update(dt)
  }
}
export const scene = TestDeckSidebarUIScene
