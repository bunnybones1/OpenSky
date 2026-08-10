import { BREAKDOWN_BAR_HEIGHT } from '~/constants'
import { Pin, ReadonlyPin } from '~/helpers/LayoutHelpers'
import Mesh2D from '~/meshes/Mesh2D'
import Object2D from '~/meshes/Object2D'
import { DraftStateCard } from '~/tests/draftMockup/DraftState'

import DeckBreakdownWidget from '../DeckBreakdownWidget'
import DraftDeckBreakdownData from '../DraftDeckBreakdownData'
import PinnedButton from '../PinnedButton'
import { SimpleSlideOutSidebar } from '../SlideOutSidebar/SimpleSlideOutSidebar'
import { flipness } from '../SlideOutSidebar/SlideOutSidebar'
import DraftRow from './DraftRow'

export default class DraftCardListViewer extends SimpleSlideOutSidebar<
  DraftStateCard,
  DraftRow
> {
  deckBreakdownData: DraftDeckBreakdownData
  private breakdownPanel: Mesh2D
  deckButton: PinnedButton
  graveButton: PinnedButton

  constructor() {
    super(DraftRow)

    const breakdownPanelContainer = new Object2D()
    breakdownPanelContainer.matrix.setConstraints(
      new Pin(1, 0, 0, BREAKDOWN_BAR_HEIGHT),
      ReadonlyPin.Top,
      ReadonlyPin.Top.cloneOffset(flipness(this.side), 8)
    )
    this.deckBreakdownData = new DraftDeckBreakdownData()
    this.breakdownPanel = new DeckBreakdownWidget(this.deckBreakdownData).mesh

    breakdownPanelContainer.add(this.breakdownPanel)
    this.add(breakdownPanelContainer)
  }
  addRow(item: DraftStateCard): void {
    super.addRow(item)
  }
  removeRow(item: DraftStateCard): void {
    super.removeRow(item)
  }
}
