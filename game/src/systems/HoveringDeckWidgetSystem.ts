import { renderMetrics } from '@opensky/shared/renderMetrics'
import {
  listenToProperty,
  stopListeningToProperty
} from '@opensky/shared/utils/propertyListeners'
import { Entity, System } from 'gg'
import { Vector3 } from 'three'

import { Components } from '~/components'
import { BREAKDOWN_BAR_HEIGHT, SIDEBAR_WIDTH } from '~/constants'
import { inspectingDecks } from '~/helpers/compoundCollections'
import { Pin } from '~/helpers/LayoutHelpers'
import {
  deckCardInstanceCollections,
  getDeckBreakdownDataFromCards
} from '~/scenes/ui/components/deckBreakdownDataManager'
import DeckBreakdownWidget from '~/scenes/ui/components/DeckBreakdownWidget'
import { SidebarStatus } from '~/scenes/ui/components/SlideOutSidebar/constants'
import { OwnedCardStatus } from '~/types'
import { cameraShaker } from '~/utils/cameraShaker'
import { globalAccess } from '~/utils/globalAccess'
import { onNextFrame } from '~/utils/onNextFrame'

const allowedDecks: OwnedCardStatus[] = ['Player_Deck']
interface BoundDeckBreakdownWidget {
  widget: DeckBreakdownWidget
  onResize: () => void
}

const __tempVec = new Vector3()
export default class HoveringDeckWidgetSystem extends System<Components> {
  widgetMap = new Map<Entity<Components>, BoundDeckBreakdownWidget>()

  init() {
    inspectingDecks.listenForAdd(e => {
      const deck = e.get('deck')
      if (
        deck.ownedCardStatus in deckCardInstanceCollections &&
        allowedDecks.includes(deck.ownedCardStatus)
      ) {
        if (globalAccess.ui!.hasContainer('deckSidebars')) {
          const deckSidebars = globalAccess.ui!.getContainer('deckSidebars')
          const sidebar = deckSidebars.byOwnedCardStatus[deck.ownedCardStatus]!
          if (
            sidebar.status === SidebarStatus.Revealed ||
            sidebar.status === SidebarStatus.Revealing
          ) {
            return
          }
        }
        const anchor = new Pin(0.5, 0.25, 0, 0)
        const offset = new Pin(0, 0)

        const container = globalAccess.ui!.getContainer('game')
        const deckBreakdownData = getDeckBreakdownDataFromCards(
          deckCardInstanceCollections[deck.ownedCardStatus]!
        )
        const widget = new DeckBreakdownWidget(deckBreakdownData, true)
        const panel = widget.mesh
        container.add(panel)

        const onResize = () => {
          onNextFrame(() => {
            __tempVec.copy(e.get('transform').position)
            __tempVec.z += 0.05
            __tempVec.project(cameraShaker.camera)
            // __tempVec.unproject(globalAccess.ui!.camera)
            const width = renderMetrics.width
            const relX = __tempVec.x * 0.5 + 0.5
            const relY = 1 - (__tempVec.y * 0.5 + 0.5)
            const pixelsX = relX * width
            const xOffset =
              pixelsX + SIDEBAR_WIDTH < width
                ? Math.min(width - SIDEBAR_WIDTH / 2, 0)
                : Math.max(-width + pixelsX + SIDEBAR_WIDTH / 2, 0)

            anchor.x.offset = xOffset
            offset.x.scale = relX
            offset.y.scale = relY
          })
        }

        listenToProperty(renderMetrics, 'uiWidth', onResize)

        panel.matrix.setConstraints(
          new Pin(0, 0, SIDEBAR_WIDTH, BREAKDOWN_BAR_HEIGHT),
          anchor,
          offset
        )

        this.widgetMap.set(e, { widget, onResize })
      }
    })

    inspectingDecks.listenForRemove(e => {
      if (!this.widgetMap.has(e)) {
        return
      }
      const widget = this.widgetMap.get(e)!
      const widgetParent = widget.widget.mesh.parent!
      widgetParent.remove(widget.widget.mesh)
      stopListeningToProperty(renderMetrics, 'uiWidth', widget.onResize)
      this.widgetMap.delete(e)
    })
  }

  update() {
    //
  }
}
