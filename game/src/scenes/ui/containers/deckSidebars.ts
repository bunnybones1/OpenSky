import {
  listenToProperty,
  stopListeningToProperty
} from '@opensky/shared/utils/propertyListeners'
import { CardInstance, SkyWeaver } from '@skyweaver/state-metadata'

import { getCardCache } from '~/cardCache'
import CardInstanceComponent from '~/components/CardInstanceComponent'
import { ReadonlyPin } from '~/helpers/LayoutHelpers'
import keyboardShortcuts from '~/keyboardShortcuts'
import Object2D from '~/meshes/Object2D'
import queryParams from '~/queryParams'
import keyboard from '~/systems/input/keyboard'
import { OwnedCardStatus } from '~/types'
import { combinedSidebars } from '~/userSettings'
import {
  ReadonlyTrackableCollection,
  TrackableCollection
} from '~/utils/TrackableCollection'

import { UI } from '..'
import {
  opponentGraveyardCardInstances,
  playerDeckCardInstances,
  playerGraveyardCardInstances
} from '../components/deckBreakdownDataManager'
import DeckViewerSidebar from '../components/DeckViewerSidebar'
import Row from '../components/DeckViewerSidebar/Row'
import {
  SidebarPosition,
  SidebarStatus
} from '../components/SlideOutSidebar/constants'
import { createCloseButton } from '../components/SlideOutSidebar/SlideOutSidebar'
import UIContainer from '../components/UIContainer'
import { sortByCostAndDimness, sortByReverseCardCacheOrder } from './deckSort'

const playerDustedCardsInCache = new TrackableCollection<
  CardInstance<SkyWeaver>
>('Player_Dusted')

const playerDustedCardsInCacheComponents = playerDustedCardsInCache.map(
  c => new CardInstanceComponent(c)
)

const opponentDustedCardsInCache = new TrackableCollection<
  CardInstance<SkyWeaver>
>('Opponent_Dusted')

const opponentDustedCardsInCacheComponents = opponentDustedCardsInCache.map(
  c => new CardInstanceComponent(c)
)

export default class DeckSidebarsContainer extends UIContainer {
  playerDeckSidebar: DeckViewerSidebar
  playerGraveyardSidebar: DeckViewerSidebar
  opponentGraveyardSidebar: DeckViewerSidebar
  byOwnedCardStatus: Partial<{
    [K in OwnedCardStatus]: DeckViewerSidebar
  }>
  private _isShiftingDebugMenuSetup = false

  constructor(ui: UI, priority: number) {
    super(ui, 'deckSidebars', {
      priority
    })
  }

  update(dt: number) {
    this.playerDeckSidebar.update(dt)
    this.playerGraveyardSidebar.update(dt)
    this.opponentGraveyardSidebar.update(dt)
  }

  protected init() {
    function onAddDeadAndDusted(
      sidebar: DeckViewerSidebar,
      card: CardInstanceComponent,
      dusted: boolean
    ) {
      if (
        !sidebar.hasRow(card.value.id, true) &&
        card.value.state.view.type !== 'enchant'
      ) {
        sidebar.createRow(card)
      }
      sidebar.toggleRowDimness(card.value.id, dusted)
    }
    function onRemoveDeadAndDusted(
      sidebar: DeckViewerSidebar,
      card: CardInstanceComponent
    ) {
      sidebar.removeRow(card.value.id)
    }

    const cardCache = getCardCache()
    if (cardCache) {
      cardCache.subscribe(c => {
        const newPlayerDust: Array<CardInstance<SkyWeaver>> = []
        const newOpponentDust: Array<CardInstance<SkyWeaver>> = []
        c.forEachInstance((instance, location) => {
          if (location.location[0].name === 'Dust') {
            if (location.player === c.owner) {
              newPlayerDust.push(instance)
            } else {
              newOpponentDust.push(instance)
            }
          }
        })

        for (const [dustCollection, newDust] of [
          [playerDustedCardsInCache, newPlayerDust],
          [opponentDustedCardsInCache, newOpponentDust]
        ] as const) {
          for (const card of [...dustCollection.items]) {
            // cards should never be removed from dust, but just in case:
            const cardWasRemovedFromDust = !newDust.some(c => c.id === card.id)
            const cardInDustChangedObject = !newDust.includes(card)
            if (cardWasRemovedFromDust) {
              dustCollection.remove(card)
            } else if (cardInDustChangedObject) {
              // remove and re-add
              dustCollection.remove(card)
              dustCollection.add(newDust.find(c => c.id === card.id)!)
            }
          }
          for (const newCard of newDust) {
            if (!dustCollection.items.some(c => c.id === newCard.id)) {
              dustCollection.add(newCard)
            }
          }
        }
      })
    }

    const actionHistoryOffsetContainer = new Object2D()
    this.add(actionHistoryOffsetContainer)
    actionHistoryOffsetContainer.matrix.offset = ReadonlyPin.Center.clone()
    const actionHistoryContainer = this.ui.getContainer('actionHistory')
    actionHistoryContainer.ready.then(() => {
      actionHistoryContainer.sidebar.onAnimate(
        (progress: number, delta: number) => {
          actionHistoryOffsetContainer.matrix.offset.x.offset = delta
        }
      )
    })

    const playerGraveyardSidebar = createSidebar(
      SidebarPosition.Left,
      playerGraveyardCardInstances,
      playerDustedCardsInCacheComponents,
      onAddDeadAndDusted,
      onRemoveDeadAndDusted,
      () => {
        playerGraveyardSidebar.close()
        playerDeckSidebar.open()
      },
      () => {
        playerGraveyardSidebar.open()
        playerDeckSidebar.close()
      },
      sortByReverseCardCacheOrder, // graveyard is reverse order
      combinedSidebars.value
    )
    actionHistoryOffsetContainer.add(playerGraveyardSidebar)
    createCloseButton(actionHistoryOffsetContainer, playerGraveyardSidebar)

    const opponentGraveyardSidebar = createSidebar(
      SidebarPosition.Left,
      opponentGraveyardCardInstances,
      opponentDustedCardsInCacheComponents,
      onAddDeadAndDusted,
      onRemoveDeadAndDusted,
      () => {
        //
      },
      () => {
        //
      },
      sortByReverseCardCacheOrder, // graveyard is reverse order
      false
    )
    actionHistoryOffsetContainer.add(opponentGraveyardSidebar)
    createCloseButton(actionHistoryOffsetContainer, opponentGraveyardSidebar)

    const playerDeckSidebar = createSidebar(
      combinedSidebars.value ? SidebarPosition.Left : SidebarPosition.Right,
      playerDeckCardInstances,
      null,
      (sidebar, card, dimmed) => {
        if (!sidebar.hasRow(card.value.id, true)) {
          sidebar.createRow(card)
        }
        sidebar.toggleRowDimness(card.value.id, dimmed)
      },
      (sidebar, card) => {
        //don't remove cards from player deck. Instead, just dim them when they leave
        sidebar.toggleRowDimness(card.value.id, true)
      },
      () => {
        playerGraveyardSidebar.close()
        playerDeckSidebar.open()
      },
      () => {
        playerGraveyardSidebar.open()
        playerDeckSidebar.close()
      },
      sortByCostAndDimness,
      combinedSidebars.value
    )
    if (combinedSidebars.value) {
      actionHistoryOffsetContainer.add(playerDeckSidebar)
      createCloseButton(actionHistoryOffsetContainer, playerDeckSidebar)
    } else {
      this.add(playerDeckSidebar)
      createCloseButton(this, playerDeckSidebar)
    }

    keyboard.listenToKey(keyboardShortcuts.Deck, () => {
      playerDeckSidebar.toggle()
    })

    keyboard.listenToKey(keyboardShortcuts.Graveyard, () => {
      playerGraveyardSidebar.toggle()
    })
    keyboard.listenToKey('Escape', () => {
      playerDeckSidebar.close()
      playerGraveyardSidebar.close()
      opponentGraveyardSidebar.close()
    })

    this.playerDeckSidebar = playerDeckSidebar
    this.playerGraveyardSidebar = playerGraveyardSidebar
    this.opponentGraveyardSidebar = opponentGraveyardSidebar

    this.byOwnedCardStatus = {
      Player_Deck: playerDeckSidebar,
      Player_Graveyard: playerGraveyardSidebar,
      Opponent_Graveyard: opponentGraveyardSidebar
    }

    if (queryParams.openSidebars) {
      this.playerDeckSidebar.open()
      this.playerGraveyardSidebar.open()
    }
    this.setupShiftingDebugMenu()
  }
  async setupShiftingDebugMenu() {
    if (this._isShiftingDebugMenuSetup) {
      return
    }
    if (!this.ui.hasContainer('debug')) {
      return
    }
    this._isShiftingDebugMenuSetup = true
    const debugContainer = this.ui.getContainer('debug')
    await debugContainer.ready
    const positionAndScaleCardSelection = () => {
      const isSidebarOpen =
        this.playerGraveyardSidebar.status === SidebarStatus.Revealed ||
        this.playerGraveyardSidebar.status === SidebarStatus.Revealing ||
        this.opponentGraveyardSidebar.status === SidebarStatus.Revealed ||
        this.opponentGraveyardSidebar.status === SidebarStatus.Revealing

      debugContainer.setOffset(isSidebarOpen ? 300 : 0)
    }
    const setButtonStates = () => {
      const isGraveSidebarOpen =
        this.playerGraveyardSidebar.status === SidebarStatus.Revealed ||
        this.playerGraveyardSidebar.status === SidebarStatus.Revealing
      const isDeckSidebarOpen =
        this.playerDeckSidebar.status === SidebarStatus.Revealed ||
        this.playerDeckSidebar.status === SidebarStatus.Revealing

      if (isGraveSidebarOpen) {
        this.playerGraveyardSidebar.graveButton.selected = true
        this.playerGraveyardSidebar.deckButton.selected = false
      } else if (isDeckSidebarOpen) {
        this.playerDeckSidebar.deckButton.selected = true
        this.playerDeckSidebar.graveButton.selected = false
      }
    }

    this.playerGraveyardSidebar.onToggle(positionAndScaleCardSelection)
    this.opponentGraveyardSidebar.onToggle(positionAndScaleCardSelection)
    if (combinedSidebars.value) {
      this.playerGraveyardSidebar.onToggle(setButtonStates)
      this.playerDeckSidebar.onToggle(setButtonStates)
    }
  }
}

function defaultOnAdd(sidebar: DeckViewerSidebar, card: CardInstanceComponent) {
  sidebar.createRow(card)
}
function defaultOnRemove(
  sidebar: DeckViewerSidebar,
  card: CardInstanceComponent
) {
  sidebar.removeRow(card.value.id)
}

const createSidebar = (
  position: SidebarPosition,
  cards: ReadonlyTrackableCollection<CardInstanceComponent>,
  dimmedCards: ReadonlyTrackableCollection<CardInstanceComponent> | null,
  onAdd: (
    sidebar: DeckViewerSidebar,
    card: CardInstanceComponent,
    _dimmed: boolean
  ) => void = defaultOnAdd,
  onRemove = defaultOnRemove,
  deckButtonOnClick: () => void,
  graveButtonOnClick: () => void,
  sorter?: (a: Row, b: Row) => number,
  showButtons?: boolean
) => {
  const sidebar = new DeckViewerSidebar(
    position,
    cards,
    deckButtonOnClick,
    graveButtonOnClick,
    sorter,
    showButtons
  )

  cards.listenForAdd(card => onAdd(sidebar, card, false))
  cards.listenForRemove(card => {
    // don't remove cards that are switching collections
    if (!dimmedCards?.items.some(c => c.value.id === card.value.id)) {
      onRemove(sidebar, card)
    } else {
      sidebar.toggleRowDimness(card.value.id, true)
    }
  })

  if (dimmedCards) {
    dimmedCards.listenForAdd(card => onAdd(sidebar, card, true))
    dimmedCards.listenForRemove(card => {
      // don't remove cards that are switching collections
      if (!cards.items.some(c => c.value.id === card.value.id)) {
        onRemove(sidebar, card)
      } else {
        sidebar.toggleRowDimness(card.value.id, false)
      }
    })
  }

  const livePropCallback = () => (sidebar.deckBreakdownDirty = true)
  cards.listenForAdd(card => {
    listenToProperty(card.value.state.view, 'element', livePropCallback, true)
    livePropCallback()
  })
  cards.listenForRemove(card => {
    stopListeningToProperty(card.value.state.view, 'element', livePropCallback)
    livePropCallback()
  })

  return sidebar
}
