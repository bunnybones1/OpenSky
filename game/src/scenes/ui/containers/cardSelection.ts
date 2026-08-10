import { i18n } from '@opensky/language-manager'
import device from '@opensky/shared/device'
import { prismsToDeckClass } from '@opensky/shared/helpers'
import { renderMetrics } from '@opensky/shared/renderMetrics'
import { delayPromise } from '@opensky/shared/utils/async'
import { listenToProperty } from '@opensky/shared/utils/propertyListeners'
import { Prism } from '@skyweaver/state-metadata'
import { Entity } from 'gg'
import { Color, Vector3 } from 'three'

import { getAssetsManager } from '~/assets'
import { Components } from '~/components'
import {
  BUTTON_HEIGHT,
  BUTTON_MARGINS,
  END_TURN_BUTTON_HEIGHT,
  PALETTE_ROW,
  SIDEBAR_WIDTH,
  SKYTAG_HEIGHT,
  SKYTAG_WIDTH,
  TURN_TIMER_WARNING_FRACTION
} from '~/constants'
import env from '~/env'
import { possiblyAdjustButtonRedGreenPalette } from '~/helpers/buttonHelpers'
import {
  gameMode,
  isNoActionsGameMode,
  LocalGameMode
} from '~/helpers/envGameModeHelpers'
import { Pin, ReadonlyPin } from '~/helpers/LayoutHelpers'
import { ownedZoneCollections } from '~/helpers/zoneCollections'
import PaletteMappedVertexColorMeshMaterial from '~/materials/PaletteMappedVertexColorMeshMaterial'
import RectangleMaterial from '~/materials/RectangleMaterial'
import Object2D from '~/meshes/Object2D'
import RectangleMesh from '~/meshes/RectangleMesh'
import { accountsLoaded, matchEnded, matchStarted, store } from '~/state'
import { accountsStore } from '~/state/AccountStore'
import { matchInfoStore } from '~/state/stores/MatchInfoStore'
import { Easing } from '~/systems/animation/Easing'
import { simpleTweener } from '~/systems/animation/tweeners'
import { moveSeat } from '~/systems/animation/zoneSeatUtils'
import ChooseSystem from '~/systems/cardPositioning/ChooseSystem'
import ZoneSystem from '~/systems/cardPositioning/ZoneSystem'
import { underPointer } from '~/systems/input/input'
import * as textOptions from '~/systems/text/TextOptions'
import UITextMesh from '~/systems/text/UITextMesh'
import { scrollingCardSelection, spaceEndsTurn } from '~/userSettings'
import { cameraShaker } from '~/utils/cameraShaker'
import { waitForNextFrame } from '~/utils/onNextFrame'
import { safelyResetFlipY } from '~/utils/textureUtils'
import { removeFromParent } from '~/utils/threeUtils'
import {
  createButton,
  createButtonText,
  giveButtonKeyboardShortcut
} from '~/utils/ui'
import { world } from '~/world'

import { UI } from '..'
import { ButtonState } from '../components/BaseButton'
import Button from '../components/Button'
import ScrollView from '../components/ScrollView'
import { SidebarStatus } from '../components/SlideOutSidebar/constants'
import TurnTimer from '../components/TurnTimer'
import UIContainer from '../components/UIContainer'
import { cardSelectionUIState } from '../state/cardSelection'

export default class CardSelectionContainer extends UIContainer {
  innerContainer: Object2D
  finishButton: Button
  finishText: UITextMesh
  topText: UITextMesh
  topTextShadow: UITextMesh
  deckSidebarText: UITextMesh
  endTime: number
  turnTimer?: TurnTimer
  scrollView?: ScrollView<ScrollRect>
  waitingForOppt?: UITextMesh
  opponentPrismBadge: RectangleMesh
  playerPrismBadge: RectangleMesh
  constructor(ui: UI, priority: number) {
    super(ui, 'CardSelection', {
      priority
    })
  }

  protected async init() {
    const skytags = this.ui.getContainer('skyTags')
    await skytags.ready
    skytags.setManaVialAndHandCounterVisibility(false)
    const innerContainer = new Object2D()
    this.add(innerContainer)

    const innerSize = new Pin(1, 1)
    innerContainer.matrix.setConstraints(
      innerSize,
      ReadonlyPin.TopLeft,
      ReadonlyPin.TopLeft.clone()
    )

    const sideBarsContainer = this.ui.getContainer('deckSidebars')

    sideBarsContainer.playerDeckSidebar.slideController.onChange(sideWidth => {
      innerSize.x.offset = -sideWidth
    })

    this.innerContainer = innerContainer
    await accountsLoaded
    const opponentPlayerId = 1 - store.player!
    const accounts = [
      accountsStore.accounts![opponentPlayerId],
      accountsStore.accounts![store.player!]
    ]

    await matchStarted

    const isFirstPlayer = store.player === 0

    this.topTextShadow = new UITextMesh(
      i18n.t(
        isFirstPlayer
          ? 'ui.cardSelection.pickPromptFirst'
          : 'ui.cardSelection.pickPromptSecond',
        {
          count:
            store.state?.state.gameParams.playerParams[store.player ?? 0]
              .mulliganChoiceSize ?? 0
        }
      ),
      {
        ...textOptions.cardSelectTextShadow,
        vAlign: 'top'
      }
    )
    this.topTextShadow.matrix.setConstraintsPosition(new Pin(0.5, 0.025))
    this.add(this.topTextShadow)
    this.topText = new UITextMesh(this.topTextShadow.text, {
      ...textOptions.cardSelectText,
      vAlign: 'top'
    })
    this.topText.matrix.setConstraintsPosition(new Pin(0.5, 0.025))
    this.add(this.topText)

    this.finishButton = createButton(
      this,
      () => {
        world.getSystem(ChooseSystem).commit()
      },
      scrollingCardSelection.value
        ? Pin.fromPixels(150, END_TURN_BUTTON_HEIGHT)
        : Pin.fromPixels(270, BUTTON_HEIGHT),
      ReadonlyPin.BottomRight,
      ReadonlyPin.BottomRight.cloneOffset(-BUTTON_MARGINS, -BUTTON_MARGINS),
      undefined,
      undefined,
      undefined,
      true,
      env.TURN_TIMER_ENABLED
    )
    this.finishButton.basePaletteRow = PALETTE_ROW.GREEN
    this.finishButton.disabled = true
    this.finishText = createButtonText(
      this.finishButton.mesh,
      i18n.t('ui.endTurnButton.startGame'),
      textOptions.buttonText
    )
    giveButtonKeyboardShortcut(
      this.finishButton,
      ' ',
      () => spaceEndsTurn.value
    )
    if (isNoActionsGameMode) {
      removeFromParent(this.finishButton.mesh)
    }

    const deckSideBar = this.ui.getContainer('deckSidebars')

    const zone = world.getSystem(ZoneSystem).zones.Player_CardSelection
    const positionAndScaleCardSelection = async () => {
      await waitForNextFrame()
      const screenHeight = renderMetrics.uiHeight
      const cardBoxWidth = (1 / 0.83) * screenHeight

      const unusedSpace = Math.max(0, renderMetrics.uiWidth - cardBoxWidth)
      const doesOpeningSidebarOverlapCardBox = unusedSpace < SIDEBAR_WIDTH * 2
      const isSidebarOpen =
        deckSideBar.playerDeckSidebar.status === SidebarStatus.Revealed ||
        deckSideBar.playerDeckSidebar.status === SidebarStatus.Revealing
      const openWidth =
        renderMetrics.uiWidth -
        (doesOpeningSidebarOverlapCardBox && isSidebarOpen ? SIDEBAR_WIDTH : 0)
      const scale = Math.min(openWidth / cardBoxWidth, 1)

      __vec.x = openWidth / renderMetrics.uiWidth - 1
      __vec.y = 0
      __vec.z = -1

      __vec.unproject(cameraShaker.camera)
      zone.positionHelper.position.x = __vec.x * 30
      zone.positionHelper.scale.setScalar(scale)

      zone.positionHelper.updateMatrixWorld(true)
      zone.markAllEntitiesDirty()
    }

    if (!scrollingCardSelection.value) {
      deckSideBar.playerDeckSidebar.onToggle(positionAndScaleCardSelection)

      listenToProperty(
        renderMetrics,
        'uiWidth',
        positionAndScaleCardSelection,
        true
      )
      listenToProperty(renderMetrics, 'uiHeight', positionAndScaleCardSelection)
    }

    if (env.TURN_TIMER_ENABLED) {
      const turnTimer = new TurnTimer(
        'normal-button',
        env.TURN_TIMER_MAX,
        TURN_TIMER_WARNING_FRACTION
      )

      this.finishButton.mesh.add(turnTimer.mesh)
      const rightOffset = 9
      turnTimer.mesh.matrix.setConstraints(
        new Pin(1, 0, -rightOffset, 3.2),
        ReadonlyPin.BottomLeft,
        ReadonlyPin.TopLeft.cloneOffset(0, -1)
      )
      this.turnTimer = turnTimer
    } else {
      this.endTime = Date.now() + 10000000000
    }

    listenToProperty(
      matchInfoStore.timer,
      'turnEndTime',
      endTime => {
        this.endTime = endTime
        if (this.turnTimer) {
          this.turnTimer.endTime = endTime
        }
      },
      true
    )

    const gray = new Color(0.4, 0.4, 0.4)
    const yellow = new Color(0.9, 0.6, 0.1)
    listenToProperty(cardSelectionUIState, 'finishButtonDisabled', v => {
      this.finishButton.disabled = v
    })
    listenToProperty(cardSelectionUIState, 'finishButtonHighlight', v => {
      this.finishButton.highlight = v
    })
    listenToProperty(this.finishButton, 'state', state => {
      const isDisabled = state === ButtonState.Disabled
      ;(
        this.finishButton.mesh.material as PaletteMappedVertexColorMeshMaterial
      ).setFancyHighlightColor(isDisabled ? gray : yellow)
    })

    const opponentPrismsBadge = await getPrismUIMesh(accounts[0].prisms)
    const playerPrismsBadge = await getPrismUIMesh(accounts[1].prisms)

    this.opponentPrismBadge = opponentPrismsBadge
    this.playerPrismBadge = playerPrismsBadge
    opponentPrismsBadge.matrix.setConstraints(
      new Pin(0, 0, SKYTAG_HEIGHT - 5, SKYTAG_HEIGHT - 5),
      ReadonlyPin.Center,
      ReadonlyPin.TopLeft.cloneOffset(
        SKYTAG_WIDTH + (device.isMobile ? -60 : 20),
        SKYTAG_HEIGHT * (device.isMobile ? 0.4 : 0.5)
      )
    )
    playerPrismsBadge.matrix.setConstraints(
      new Pin(0, 0, SKYTAG_HEIGHT - 5, SKYTAG_HEIGHT - 5),
      ReadonlyPin.Center,
      ReadonlyPin.BottomLeft.cloneOffset(
        SKYTAG_WIDTH + (device.isMobile ? -60 : 20),
        -SKYTAG_HEIGHT * (device.isMobile ? 0.4 : 0.5)
      )
    )
    this.add(opponentPrismsBadge)
    this.add(playerPrismsBadge)
    if (gameMode === LocalGameMode.REPLAY) {
      playerPrismsBadge.matrix.offset.y.offset -= 70
    }
    if (scrollingCardSelection.value) {
      const scrollView = new ScrollView<ScrollRect>({
        scrollAxis: 'x',
        tailEnd: true,
        extraAllowScroll: () =>
          world
            .getSystem(ZoneSystem)
            .zones.Player_CardSelection.cardsInZone.items.includes(
              underPointer.entity!
            ) ||
          (underPointer.entity?.has('attachedTo') &&
            world
              .getSystem(ZoneSystem)
              .zones.Player_CardSelection.cardsInZone.items.includes(
                underPointer.entity.get('attachedTo').entity
              )) ||
          false,
        overflowStart: 20,
        overflowEnd: 20,
        clipSpaceDepth: 0.93,
        ommitCollider: true
      })
      this.scrollView = scrollView
      scrollView.matrix.setConstraints(
        new Pin(1, 0.8, -40),
        new Pin(0.5, 0.5 - 0.025, -10, 40),
        ReadonlyPin.Center.clone()
      )
      innerContainer.add(scrollView)

      const onAdd = (added: Entity<Components>) => {
        // check for Axel's Fate cards here, adjust the rect depending on that
        const rect = new ScrollRect(added)
        scrollView.push(rect)
        setTimeout(() => {
          this.updateScrollSize()
        }, 1)
      }
      ownedZoneCollections.Player_CardSelection.listenForAdd(onAdd)
      ownedZoneCollections.Player_CardSelection.listenForRemove(removed => {
        const scroller = (scrollView.items as ScrollRect[]).find(
          item => item.associatedCard === removed
        )
        if (!scroller) {
          throw new Error(
            'expected each card selection card to have a scroller'
          )
        }
        scrollView.removeItem(scroller)
        this.updateScrollSize()
      })

      renderMetrics.onSizeChange(() => {
        this.updateScrollSize()
      }, true)

      this.waitingForOppt = new UITextMesh(
        i18n.t('ui.cardSelection.waitingForOpponent')!,
        textOptions.turnChangeTitle
      )
      this.waitingForOppt.opacity = 0
      const centerishPin = new Pin(0.5, 0.415)
      this.waitingForOppt.matrix.setConstraintsPosition(centerishPin)
      innerContainer.add(this.waitingForOppt)
    }
    matchEnded().then(() => {
      if (this.active) {
        this.fadeOut()
      }
    })
  }

  updateScrollSize() {
    if (!this.scrollView) {
      return
    }
    const cardWidth = renderMetrics.uiHeight / 2
    for (const child of this.scrollView.items) {
      child.matrix.setConstraints(new Pin(0, 1, cardWidth))
    }
    this.scrollView.recalculate()
  }

  async fadeIn(duration?: number) {
    await super.fadeIn(duration)
    this.show()
  }
  async fadeOut(duration?: number) {
    await super.fadeOut(duration)
    const skytags = this.ui.getContainer('skyTags')
    await skytags.ready
    skytags.setManaVialAndHandCounterVisibility(true)
  }

  async showWaitingForOppt() {
    if (scrollingCardSelection.value && this.waitingForOppt) {
      await delayPromise(500)
      simpleTweener.to({
        description: 'UI container opacity',
        target: this.waitingForOppt,
        duration: 500,
        propertyGoals: { opacity: 1 },
        easing: Easing.Quartic.InOut
      })
    } else {
      this.finishText.text = i18n.t('ui.cardSelection.waitingForOpponent')
    }
  }

  update(dt: number) {
    possiblyAdjustButtonRedGreenPalette(this.finishButton, this.endTime)
    this.turnTimer?.update()

    if (scrollingCardSelection.value) {
      this.scrollView?.update(dt)
      const zone = world.getSystem(ZoneSystem).zones.Player_CardSelection
      for (const [index, seat] of zone.seatController.seats.entries()) {
        const transform = zone.seatController.makeIndexTransform(seat, index)
        if (transform) {
          moveSeat(seat, transform, 50)
        }
      }
      if (this.scrollView) {
        const xOffset =
          (this.scrollView.scrollValue.outerSize -
            this.scrollView.scrollValue.innerSize) /
          2

        this.scrollView.matrix.offset.x.offset = Math.max(0, xOffset)
      }
    }
  }
  set active(v: boolean) {
    super.active = v
    if (this.turnTimer) {
      this.turnTimer.toggleSparkles(v)
    }
  }
  get active() {
    return super.active
  }
}

class ScrollRect extends Object2D {
  constructor(public associatedCard: Entity<Components>) {
    super()
    this.matrix.setConstraints(
      undefined,
      ReadonlyPin.TopLeft,
      ReadonlyPin.TopLeft.clone()
    )
  }
}

const __vec = new Vector3()

function getPrismUIMesh(prisms: Prism[], large = false) {
  const prismsUrl = `game/prisms/${large ? 'large/' : ''}${prismsToDeckClass(
    prisms
  )}.png`
  return getAssetsManager()
    .load('texture', prismsUrl)
    .then(prismsTexture => {
      safelyResetFlipY(prismsTexture)
      const mat = new RectangleMaterial({
        map: prismsTexture
      })
      mat.depth = -0.9
      return new RectangleMesh(mat)
    })
}
