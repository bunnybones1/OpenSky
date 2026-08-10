import { i18n } from '@opensky/language-manager'
import { InstanceID } from '@skyweaver/state-metadata'

import CardInstanceComponent from '~/components/CardInstanceComponent'
import {
  BREAKDOWN_BAR_HEIGHT,
  BUTTON_HEIGHT,
  BUTTON_MARGINS
} from '~/constants'
import { Pin, ReadonlyPin } from '~/helpers/LayoutHelpers'
import Mesh2D from '~/meshes/Mesh2D'
import Object2D from '~/meshes/Object2D'
import { fontFaces } from '~/systems/text/FontFace'
import * as textOptions from '~/systems/text/TextOptions'
import { ReadonlyTrackableCollection } from '~/utils/TrackableCollection'
import { createButton, createButtonText } from '~/utils/ui'

import DeckBreakdownData from '../DeckBreakdownData'
import { getDeckBreakdownDataFromCards } from '../deckBreakdownDataManager'
import DeckBreakdownWidget from '../DeckBreakdownWidget'
import PinnedButton from '../PinnedButton'
import { SidebarPosition } from '../SlideOutSidebar/constants'
import { flipness, SlideOutSidebar } from '../SlideOutSidebar/SlideOutSidebar'
import Row from './Row'

export default class DeckViewerSidebar extends SlideOutSidebar<
  CardInstanceComponent,
  InstanceID,
  Row
> {
  deckBreakdownDirty: boolean = true
  private deckBreakdownData: DeckBreakdownData
  private breakdownPanel: Mesh2D
  deckButton: PinnedButton
  graveButton: PinnedButton

  constructor(
    public side: SidebarPosition,
    cards: ReadonlyTrackableCollection<CardInstanceComponent>,
    deckButtonOnClick: () => void,
    graveButtonOnClick: () => void,
    itemSorter?: (a: Row, b: Row) => number,
    showButtons?: boolean
  ) {
    super(
      side,
      Row,
      row => row.entity.getComponent('cardInstance')!,
      card => (typeof card === 'number' ? card : card.value.id),
      {
        onUpdate: () => {
          if (this.deckBreakdownDirty) {
            this.deckBreakdownDirty = false
            this.deckBreakdownData.regenBreakdown()
          }
        },
        itemSorter,
        createBar: yOffset => {
          const MARGIN = 7
          const TOGGLE_BUTTON_HEIGHT = 40
          const solidBlockTopHeight =
            yOffset +
            (showButtons
              ? 30 + BUTTON_HEIGHT + 2 * BUTTON_MARGINS + 8
              : BREAKDOWN_BAR_HEIGHT) //+ MARGIN * 2
          const breakdownPanelContainer = new Object2D()
          breakdownPanelContainer.matrix.setConstraints(
            new Pin(1, 0, 0, BREAKDOWN_BAR_HEIGHT),
            ReadonlyPin.Top,
            ReadonlyPin.Top.cloneOffset(
              flipness(this.side),
              showButtons ? TOGGLE_BUTTON_HEIGHT + MARGIN * 2 : yOffset
            )
          )
          if (showButtons) {
            this.deckButton = createButton(
              breakdownPanelContainer,
              deckButtonOnClick,
              new Pin(0.5, 0, -MARGIN * 1.5, TOGGLE_BUTTON_HEIGHT),
              ReadonlyPin.BottomLeft,
              ReadonlyPin.TopLeft.cloneOffset(MARGIN, -MARGIN),
              undefined,
              undefined,
              'button-rectangular',
              false
            )

            this.graveButton = createButton(
              breakdownPanelContainer,
              graveButtonOnClick,
              new Pin(0.5, 0, -MARGIN * 1.5, TOGGLE_BUTTON_HEIGHT),
              ReadonlyPin.BottomRight,
              ReadonlyPin.TopRight.cloneOffset(-MARGIN, -MARGIN),
              undefined,
              undefined,
              'button-rectangular',
              false
            )
            createButtonText(
              this.deckButton.mesh,
              i18n.t('game:sidebarUI.buttonLabel.DECK'),
              {
                ...textOptions.endTurnButtonText,
                fontFace: fontFaces.BarlowCondensedMedium,
                size: 20
              },
              undefined,
              ReadonlyPin.Center.cloneOffset(0, -2)
            )
            createButtonText(
              this.graveButton.mesh,
              i18n.t('game:sidebarUI.buttonLabel.GRAVEYARD'),
              {
                ...textOptions.endTurnButtonText,
                fontFace: fontFaces.BarlowCondensedMedium,
                size: 20
              },
              undefined,
              ReadonlyPin.Center.cloneOffset(0, -2)
            )
          }

          this.deckBreakdownData = getDeckBreakdownDataFromCards(cards)
          this.breakdownPanel = new DeckBreakdownWidget(
            this.deckBreakdownData
          ).mesh

          breakdownPanelContainer.add(this.breakdownPanel)

          return {
            bar: breakdownPanelContainer,
            yOffset: solidBlockTopHeight
          }
        },
        onToggleRowDimness: (row, dim) => {
          row.updateCostBinding()
          row.dim = dim
        }
      }
    )
  }
}
