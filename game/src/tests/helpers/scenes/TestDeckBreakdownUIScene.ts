import { CardLibrary } from '@skyweaver/state-metadata'

import { getAssetsManager } from '~/assets'
import CardInstanceComponent from '~/components/CardInstanceComponent'
import { createCard } from '~/factories/CardFactory'
import { knownCards } from '~/helpers/compoundCollections'
import { Pin, ReadonlyPin } from '~/helpers/LayoutHelpers'
import { UI } from '~/scenes/ui'
import { getDeckBreakdownDataFromCards } from '~/scenes/ui/components/deckBreakdownDataManager'
import DeckBreakdownWidget from '~/scenes/ui/components/DeckBreakdownWidget'
import { getFakeCardTagView } from '~/utils/card'

import { BaseTestScene } from './BaseTestScene'

const knownCardsInstances = knownCards
  .intersect(CardInstanceComponent.entities)
  .map(c => c.getComponent('cardInstance')!)
class TestDeckBreakdownUIScene extends BaseTestScene {
  async initUI(ui: UI) {
    const deckBreakdownData = getDeckBreakdownDataFromCards(knownCardsInstances)
    const cardViews = [...CardLibrary.keys()]
      .map(id => {
        const view = getFakeCardTagView(id, 'base')
        // view.state.view.rarity = 'none'
        return view
      })
      .filter(
        c => c.state.view.type === 'spell' || c.state.view.type === 'unit'
      )
    const CARD_COUNT = 20
    cardViews.slice(0, CARD_COUNT).forEach(view => {
      createCard(view, true)
    })

    await getAssetsManager().loadAsset('uiSmall')

    const container = ui.getContainer('randomTests')
    await container.ready

    const widget = new DeckBreakdownWidget(deckBreakdownData)
    const panel = widget.mesh
    container.add(panel)

    panel.matrix.setConstraints(
      new Pin(0.3, 0.2, -4, -4),
      ReadonlyPin.BottomLeft,
      ReadonlyPin.BottomLeft
    )

    const widget2 = new DeckBreakdownWidget(deckBreakdownData, true)
    const panel2 = widget2.mesh

    container.add(panel2)

    panel2.matrix.setConstraints(
      new Pin(0, 0, 350, 120),
      ReadonlyPin.Center,
      ReadonlyPin.Center
    )

    container.show()
    super.initUI(ui)

    setTimeout(() => {
      cardViews.slice(CARD_COUNT, CARD_COUNT + CARD_COUNT).forEach(view => {
        createCard(view, true)
      })
    }, 3000)
  }

  update(dt: number) {
    super.update(dt)
  }
}
export const scene = TestDeckBreakdownUIScene
