import device from '@opensky/shared/device'
import { listenToProperty } from '@opensky/shared/utils/propertyListeners'
import { Player } from '@skyweaver/state-metadata'

import { getAssetsManager } from '~/assets'
import {
  ACTION_HISTORY_SIDEBAR_WIDTH,
  HUD_SKYTAG_SCALE,
  SKYTAG_HEIGHT,
  SKYTAG_WIDTH
} from '~/constants'
import ManaVialController from '~/controllers/ManaVialController'
import {
  EXTRA_VERTICAL_MARGIN,
  VIAL_MARGIN,
  VIAL_SIZE
} from '~/data/manaVialConstants'
import { gameMode, LocalGameMode } from '~/helpers/envGameModeHelpers'
import { Pin, ReadonlyPin } from '~/helpers/LayoutHelpers'
import { setupDone } from '~/helpers/setupHelper'
import Object2D from '~/meshes/Object2D'
import RectangleMesh from '~/meshes/RectangleMesh'
import { accountsLoaded, store } from '~/state'
import { accountsStore } from '~/state/AccountStore'
import { statePlayer } from '~/state/StatePlayer'
import { matchInfoStore, PlayerInfo } from '~/state/stores/MatchInfoStore'
import { Easing } from '~/systems/animation/Easing'
import { AnimatedObject } from '~/systems/animation/RawTweener'
import { simpleTweener } from '~/systems/animation/tweeners'
import DragSystem from '~/systems/DragSystem'
import AnimatedNumber from '~/utils/AnimatedNumber'
import { recursivelySetDepth } from '~/utils/threeUtils'
import { world } from '~/world'

import { UI } from '..'
import HandSizeCounter from '../components/HandSizeCounter'
import { createHUDSkyTag, SkyTagVersion, WIDTH } from '../components/SkyTag'
import {
  SidebarPosition,
  SidebarStatus
} from '../components/SlideOutSidebar/constants'
import UIContainer, {
  makeMobileScaleingSubContainer
} from '../components/UIContainer'

const replayOffset =
  gameMode === LocalGameMode.REPLAY ? (device.isMobile ? -90 : -69) : 0

function makeVial(playerInfo: PlayerInfo, previewDown: boolean) {
  const manaVialController = new ManaVialController(previewDown)

  listenToProperty(playerInfo, 'mana', t => (manaVialController.mana = t))
  listenToProperty(
    playerInfo,
    'manaCrystals',
    t => (manaVialController.manaTotal = t)
  )
  listenToProperty(playerInfo, 'manaPreview', t =>
    manaVialController.showPreview(t)
  )

  playerInfo.manaChangeDispatcher.addListener(change => {
    manaVialController.showManaChange(change)
  })

  return manaVialController
}
export default class SkyTagsContainer extends UIContainer {
  subContainer: Object2D
  opponentPrismBadge: RectangleMesh
  playerPrismBadge: RectangleMesh
  skyTagOpponent: Object2D
  skyTagPlayer: Object2D
  playerManaTracker: ManaVialController
  opponentManaTracker: ManaVialController
  playerHandSizeCounter: HandSizeCounter
  opponentHandSizeCounter: HandSizeCounter
  opacityController: AnimatedNumber
  constructor(ui: UI, priority: number) {
    super(ui, 'skyTags', {
      priority
    })
    this.subContainer = makeMobileScaleingSubContainer(this)
    this.subContainer.matrix.offset = ReadonlyPin.Center.clone()
  }
  async setManaVialAndHandCounterVisibility(value: boolean) {
    await this.opacityController.animateToValue(value ? 1 : 0)
  }
  protected async init() {
    await accountsLoaded
    const opponentPlayerId = 1 - store.player!

    await getAssetsManager().loadAsset('gamePiecesGraphical')
    await getAssetsManager().loadAsset('manaVial')

    const mode =
      gameMode === LocalGameMode.REPLAY
        ? statePlayer.record!.gameMode
        : gameMode
    const skyTagOpponent = await createHUDSkyTag(
      this.ui,
      accountsStore.accounts![opponentPlayerId],
      mode,
      SkyTagVersion.Up,
      opponentPlayerId
    )
    const skyTagOpponentOffset = ReadonlyPin.TopLeft.clone()
    skyTagOpponent.matrix.setConstraints(
      new Pin(0, 0, SKYTAG_WIDTH, SKYTAG_HEIGHT),
      ReadonlyPin.TopLeft,
      skyTagOpponentOffset
    )

    const skyTagPlayer = await createHUDSkyTag(
      this.ui,
      accountsStore.accounts![store.player!],
      mode,
      SkyTagVersion.Down,
      store.player!
    )

    const skyTagPlayerOffset = ReadonlyPin.BottomLeft.clone()

    skyTagPlayer.matrix.setConstraints(
      new Pin(0, 0, SKYTAG_WIDTH, SKYTAG_HEIGHT),
      ReadonlyPin.BottomLeft,
      skyTagPlayerOffset
    )
    const vialSize = new Pin(0, 0, VIAL_SIZE, VIAL_SIZE)
    const playerManaTracker = makeVial(matchInfoStore.playerInfo, false)
    playerManaTracker.uiPivot.matrix.setConstraints(
      vialSize,
      ReadonlyPin.BottomLeft.clone(),
      ReadonlyPin.BottomLeft.cloneOffset(VIAL_MARGIN, SKYTAG_HEIGHT)
    )
    const opponentManaTracker = makeVial(matchInfoStore.opponentInfo, true)
    opponentManaTracker.uiPivot.matrix.setConstraints(
      vialSize,
      ReadonlyPin.TopLeft.clone(),
      ReadonlyPin.TopLeft.cloneOffset(VIAL_MARGIN, SKYTAG_HEIGHT)
    )
    const playerHandSizeCounter = new HandSizeCounter(store.player!)

    const opponentHandSizeCounter = new HandSizeCounter(
      (1 - store.player!) as Player
    )
    const handCounterSize = new Pin(
      0,
      0,
      54 * HUD_SKYTAG_SCALE,
      22 * HUD_SKYTAG_SCALE
    )
    const handCounterOffsetX = WIDTH + (device.isMobile ? 0 : 4)
    opponentHandSizeCounter.matrix.setConstraints(
      handCounterSize,
      ReadonlyPin.TopLeft,
      ReadonlyPin.TopLeft.cloneOffset(handCounterOffsetX, 12)
    )
    playerHandSizeCounter.matrix.setConstraints(
      handCounterSize,
      ReadonlyPin.BottomLeft,
      ReadonlyPin.BottomLeft.cloneOffset(handCounterOffsetX, -17)
    )
    recursivelySetDepth(playerHandSizeCounter, 0.915)
    recursivelySetDepth(opponentHandSizeCounter, 0.915)

    setupDone.then(() => {
      if (device.isMobile) {
        const drag = world.getSystem(DragSystem)
        let handCounterAnimation: AnimatedObject<any> | undefined
        listenToProperty(drag, 'isPianoRolling', isPianoRolling => {
          if (handCounterAnimation) {
            handCounterAnimation.kill()
          }
          handCounterAnimation = simpleTweener.to({
            target: playerHandSizeCounter.matrix.offset.y,
            propertyGoals: {
              offset: isPianoRolling ? 100 : -17 + replayOffset
            },
            description: 'Move hand counter down',
            duration: 400,
            easing: Easing.Quadratic.In,
            delay: isPianoRolling ? 0 : 150,
            onUpdate: () => {
              skyTagPlayerOffset.y.offset =
                playerHandSizeCounter.matrix.offset.y.offset + 17
            }
          })
        })
      }
    })
    this.skyTagOpponent = skyTagOpponent
    this.skyTagPlayer = skyTagPlayer
    this.subContainer.add(skyTagOpponent)
    this.subContainer.add(skyTagPlayer)
    this.subContainer.add(playerManaTracker.uiPivot)
    this.subContainer.add(opponentManaTracker.uiPivot)
    this.subContainer.add(playerHandSizeCounter)
    this.subContainer.add(opponentHandSizeCounter)

    this.playerHandSizeCounter = playerHandSizeCounter
    this.opponentHandSizeCounter = opponentHandSizeCounter
    this.playerManaTracker = playerManaTracker
    this.opponentManaTracker = opponentManaTracker

    const pmtuipm = playerManaTracker.uiPivot.matrix
    const omtuipm = opponentManaTracker.uiPivot.matrix

    const pmtuihapm = playerManaTracker.uiHeroAbilityPivot.matrix
    const omtuihapm = opponentManaTracker.uiHeroAbilityPivot.matrix
    const pmtuihaspm = playerManaTracker.uiHeroAbilityStagingPivot.matrix

    // hide the hero-ability-minis off screen until they're animated in
    pmtuihapm.offset.x.offset = -500
    omtuihapm.offset.x.offset = -500

    this.opacityController = new AnimatedNumber(
      v => {
        playerHandSizeCounter.matrix.opacity = v
        opponentHandSizeCounter.matrix.opacity = v
        pmtuipm.opacity = v
        omtuipm.opacity = v
        if (import.meta.hot) {
          import.meta.hot.data.opacity = v
        }
      },
      import.meta.hot?.data.opacity || 0,
      500,
      undefined,
      500,
      true
    )

    if (gameMode === LocalGameMode.REPLAY) {
      skyTagPlayer.matrix.offset.y.offset += replayOffset
      pmtuipm.offset.y.offset += replayOffset
      playerHandSizeCounter.matrix.offset.y.offset += replayOffset
    }

    const dsc = this.ui.getContainer('deckSidebars')
    const ahc = this.ui.getContainer('actionHistory')
    const manaPosition = new AnimatedNumber(
      (delta: number) => {
        pmtuipm.offset.x.offset = delta
        omtuipm.offset.x.offset = delta
        if (delta >= -50) {
          pmtuipm.anchor.x.scale = 1
          omtuipm.anchor.x.scale = 1
          pmtuipm.offset.x.scale = 0
          omtuipm.offset.x.scale = 0

          pmtuipm.offset.y.offset =
            -SKYTAG_HEIGHT + replayOffset - EXTRA_VERTICAL_MARGIN
          omtuipm.offset.y.offset = SKYTAG_HEIGHT + EXTRA_VERTICAL_MARGIN
          pmtuihapm.offset.x.offset = VIAL_SIZE * 2 + EXTRA_VERTICAL_MARGIN
          pmtuihaspm.offset.x.offset = VIAL_SIZE * 2 + EXTRA_VERTICAL_MARGIN
          omtuihapm.offset.x.offset = VIAL_SIZE * 2 + EXTRA_VERTICAL_MARGIN
        } else {
          pmtuipm.anchor.x.scale = 0
          omtuipm.anchor.x.scale = 0
          pmtuipm.offset.x.scale = 1
          omtuipm.offset.x.scale = 1

          pmtuipm.offset.y.offset =
            -SKYTAG_HEIGHT - EXTRA_VERTICAL_MARGIN * 2 + replayOffset
          omtuipm.offset.y.offset = SKYTAG_HEIGHT + EXTRA_VERTICAL_MARGIN * 2

          pmtuihapm.offset.x.offset = -EXTRA_VERTICAL_MARGIN
          pmtuihaspm.offset.x.offset = -EXTRA_VERTICAL_MARGIN
          omtuihapm.offset.x.offset = -EXTRA_VERTICAL_MARGIN
        }
        if (import.meta.hot) {
          import.meta.hot.data.manaPosition = delta
        }
      },
      import.meta.hot?.data.manaPosition || 0,
      300,
      Easing.Cubic.Out,
      300
    )
    const subcontainerPos = new AnimatedNumber(
      (delta: number) => {
        this.subContainer.matrix.offset.x.offset = delta
        if (import.meta.hot) {
          import.meta.hot.data.subcontainerPos = delta
        }
      },
      import.meta.hot?.data.subcontainerPos || 0,
      300,
      Easing.Cubic.Out,
      300
    )

    Promise.all([dsc.ready, ahc.ready]).then(() => {
      const adjustManaVialOffset = () => {
        const isLeftSidebarOpen =
          dsc.playerGraveyardSidebar.status === SidebarStatus.Revealed ||
          dsc.playerGraveyardSidebar.status === SidebarStatus.Revealing ||
          dsc.opponentGraveyardSidebar.status === SidebarStatus.Revealed ||
          dsc.opponentGraveyardSidebar.status === SidebarStatus.Revealing ||
          (dsc.playerDeckSidebar.side === SidebarPosition.Left &&
            (dsc.playerDeckSidebar.status === SidebarStatus.Revealed ||
              dsc.playerDeckSidebar.status === SidebarStatus.Revealing))
        const isRightSidebarOpen =
          dsc.playerDeckSidebar.side === SidebarPosition.Right &&
          (dsc.playerDeckSidebar.status === SidebarStatus.Revealed ||
            dsc.playerDeckSidebar.status === SidebarStatus.Revealing)
        const isActionHistoryOpen =
          ahc.sidebar.status === SidebarStatus.Revealed ||
          ahc.sidebar.status === SidebarStatus.Revealing
        if (isLeftSidebarOpen) {
          subcontainerPos.animateToValue(0, 300, Easing.Cubic.Out)
          if (isRightSidebarOpen) {
            manaPosition.animateToValue(
              -VIAL_MARGIN -
                VIAL_SIZE -
                dsc.playerDeckSidebar.matrix.size.x.offset,
              300,
              Easing.Cubic.Out
            )
          } else {
            manaPosition.animateToValue(
              -VIAL_MARGIN - VIAL_SIZE,
              300,
              Easing.Cubic.Out
            )
          }
        } else {
          // left closed.

          manaPosition.animateToValue(
            VIAL_MARGIN + VIAL_SIZE,
            300,
            Easing.Cubic.Out
          )

          if (isActionHistoryOpen) {
            subcontainerPos.animateToValue(
              ACTION_HISTORY_SIDEBAR_WIDTH,
              300,
              Easing.Cubic.Out
            )
          } else {
            subcontainerPos.animateToValue(0, 300, Easing.Cubic.Out)
          }
        }
      }

      dsc.playerGraveyardSidebar.onToggle(adjustManaVialOffset)
      dsc.playerDeckSidebar.onToggle(adjustManaVialOffset)
      dsc.opponentGraveyardSidebar.onToggle(adjustManaVialOffset)

      ahc.sidebar.onToggle(() => {
        adjustManaVialOffset()
      })
    })
  }
  async switchPlayerSkytags() {
    const mode =
      gameMode === LocalGameMode.REPLAY
        ? statePlayer.record!.gameMode
        : gameMode
    this.skyTagOpponent.removeFromParent()
    this.skyTagPlayer.removeFromParent()
    this.skyTagOpponent = await createHUDSkyTag(
      this.ui,
      accountsStore.accounts![1 - store.player!],
      mode,
      SkyTagVersion.Up,
      store.player!
    )
    this.skyTagPlayer = await createHUDSkyTag(
      this.ui,
      accountsStore.accounts![store.player!],
      mode,
      SkyTagVersion.Down,
      store.player!
    )

    this.skyTagOpponent.matrix.setConstraints(
      new Pin(0, 0, SKYTAG_WIDTH, SKYTAG_HEIGHT),
      ReadonlyPin.TopLeft,
      ReadonlyPin.TopLeft.clone()
    )

    this.skyTagPlayer.matrix.setConstraints(
      new Pin(0, 0, SKYTAG_WIDTH, SKYTAG_HEIGHT),
      ReadonlyPin.BottomLeft,
      ReadonlyPin.BottomLeft.clone()
    )
    this.skyTagPlayer.matrix.offset.y.offset += replayOffset
    this.subContainer.add(this.skyTagOpponent)
    this.subContainer.add(this.skyTagPlayer)
  }
}
