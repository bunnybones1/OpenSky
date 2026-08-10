import { GameMode } from '@opensky/proto'
import { clamp } from '@opensky/shared/utils/math'
import { listenToProperty } from '@opensky/shared/utils/propertyListeners'
import { Camera } from 'three'

import { getAssetsManager } from '~/assets/index'
import { COLOR_BLACK } from '~/colors/colorLibrary'
import { ACTION_HISTORY_SIDEBAR_WIDTH } from '~/constants'
import { gameMode } from '~/helpers/envGameModeHelpers'
import { makeSuperOpaque } from '~/helpers/I2D'
import { Pin, ReadonlyPin } from '~/helpers/LayoutHelpers'
import keyboardShortcuts from '~/keyboardShortcuts'
import Mesh2D from '~/meshes/Mesh2D'
import Object2D from '~/meshes/Object2D'
import { store } from '~/state'
import { ActionHistoryEvent } from '~/state/ActionHistory'
import { actionHistoryStore } from '~/state/stores/ActionHistoryStore'
import { Easing } from '~/systems/animation/Easing'
import PromiseQueue from '~/systems/animation/PromiseQueue'
import { CompleteStatus } from '~/systems/animation/RawTweener'
import { simpleTweener } from '~/systems/animation/tweeners'
import { CursorType } from '~/systems/input/CursorType'
import IInteractive from '~/systems/input/IInteractive'
import keyboard from '~/systems/input/keyboard'
import { toggleActionHistorySideBarOpen } from '~/userSettings'
import { createResolvable } from '~/utils/asyncUtils'
import { makeInteractive } from '~/utils/makeInteractive'

import ScrollView from '../ScrollView'
import { SidebarStatus } from '../SlideOutSidebar/constants'
import {
  actionHistorySidebarOpenWidthAnimated,
  actionHistorySidebarOpenWidthInstant
} from './actionHistorySidebarOpenWidth'
import {
  backgroundColor,
  DROP_SHADOW_WIDTH,
  SIDEBAR_ANIMATION_DURATION
} from './constants'
import PaddingRow from './PaddingRow'
import Row from './Row'
import { createRowFromEvent } from './rowFactory'
import { AnimationCallback, ToggleCallback } from './rowUtils'
import StartTurnRow from './StartTurnRow'
import TurnGroup from './TurnGroup'

function ratioToWidth(ratio: number) {
  return clamp(
    ratio * (ACTION_HISTORY_SIDEBAR_WIDTH + DROP_SHADOW_WIDTH) -
      DROP_SHADOW_WIDTH,
    0,
    ACTION_HISTORY_SIDEBAR_WIDTH
  )
}

export default class ActionHistorySidebar
  extends Object2D
  implements IInteractive
{
  interactivityWeight = 10 as const
  private _locked = false
  innerContainer: Object2D = new Object2D()
  scrollView: ScrollView<Row | PaddingRow>
  backgroundMesh: Mesh2D
  topGradientMesh: Mesh2D
  bottomGradientMesh: Mesh2D
  dropShadowMesh: Mesh2D
  shouldRenderAsGroup = true
  exposedRatio = 0
  exposedWidth = 0
  queue: PromiseQueue<undefined> = new PromiseQueue(e =>
    store.fireClientError(e)
  )

  cursor: CursorType = 'grab'

  started = createResolvable()
  currentTurnGroup: TurnGroup
  turnGroups: TurnGroup[]

  get status() {
    return actionHistoryStore.status
  }

  set status(value: SidebarStatus) {
    actionHistoryStore.status = value
  }

  private _toggleListeners: Set<ToggleCallback> = new Set()
  private _animationListeners: Set<AnimationCallback> = new Set()

  constructor(public camera: Camera) {
    super()
    this.add(this.innerContainer)
    this.innerContainer.matrix.setConstraints(
      new Pin(0, 1, ACTION_HISTORY_SIDEBAR_WIDTH, 0),
      ReadonlyPin.Left,
      ReadonlyPin.Left.clone()
    )
    makeInteractive(this.innerContainer, this)

    listenToProperty(this, 'exposedRatio', ratio => {
      const ew = ratioToWidth(ratio)
      this.exposedWidth = ew
      this.innerContainer.matrix.offset.x.offset =
        ew - ACTION_HISTORY_SIDEBAR_WIDTH
      actionHistorySidebarOpenWidthAnimated.value = ew
      this._animationListeners.forEach(callback => callback(ratio, ew))
    })

    const backgroundMesh = getAssetsManager().fetchMeshDeepClone(
      'uiSmall',
      'rectangle',
      true
    )
    makeSuperOpaque(backgroundMesh)

    backgroundMesh.matrix.setConstraints(ReadonlyPin.FullSize)
    backgroundMesh.matrix.setColor(backgroundColor)
    this.backgroundMesh = backgroundMesh
    this.innerContainer.add(backgroundMesh)

    this.scrollView = new ScrollView({
      scrollAxis: 'y',
      tailEnd: true,
      inverted: true
    })
    this.innerContainer.add(this.scrollView)

    // Add gradient shadows to top, bottom and side of scrollbar

    const gradients = new Object2D()
    gradients.matrix.setColor(COLOR_BLACK)
    gradients.shouldRenderAsGroup = true

    const topGradientMesh = getAssetsManager().fetchMeshDeepClone(
      'uiSmall',
      'gradient-top',
      true
    )
    topGradientMesh.matrix.setConstraints(
      new Pin(1, 0, 0, 30),
      ReadonlyPin.TopLeft,
      ReadonlyPin.TopLeft
    )
    gradients.add(topGradientMesh)

    const bottomGradientMesh = getAssetsManager().fetchMeshDeepClone(
      'uiSmall',
      'gradient-bottom',
      true
    )
    bottomGradientMesh.matrix.setConstraints(
      new Pin(1, 0, 0, 30),
      ReadonlyPin.BottomLeft,
      ReadonlyPin.BottomLeft
    )
    gradients.add(bottomGradientMesh)

    const sideGradientMesh = getAssetsManager().fetchMeshDeepClone(
      'uiSmall',
      'gradient-left',
      true
    )
    sideGradientMesh.matrix.setConstraints(
      new Pin(0, 1, 8, 0),
      ReadonlyPin.TopLeft,
      ReadonlyPin.TopRight
    )
    sideGradientMesh.matrix.opacity = 0.5
    gradients.add(sideGradientMesh)

    this.innerContainer.add(gradients)
    this.turnGroups = []
    this.close(0)

    this.started.then(() => {
      if (toggleActionHistorySideBarOpen.value) {
        this.open()
      }
      keyboard.listenToKey(keyboardShortcuts.ActionHistory, () => {
        if (!this._locked) {
          this.toggle()
        }
      })
    })
  }

  onToggle(callback: ToggleCallback) {
    this._toggleListeners.add(callback)
    callback(this)

    return () => this._toggleListeners.delete(callback)
  }

  onAnimate(callback: AnimationCallback) {
    this._animationListeners.add(callback)
    callback(0, this.exposedWidth)

    return () => this._animationListeners.delete(callback)
  }

  async open(duration: number = SIDEBAR_ANIMATION_DURATION) {
    if (this._locked || gameMode === GameMode.TUTORIAL) {
      return
    }
    this.traverse(child => {
      child.visible = true
    })
    this.status = SidebarStatus.Revealing
    this._toggleListeners.forEach(callback => callback(this))
    actionHistorySidebarOpenWidthInstant.value = ratioToWidth(1)
    const animationStatus = await simpleTweener.to({
      description: 'open action history',
      target: this as ActionHistorySidebar,
      propertyGoals: {
        exposedRatio: 1
      },
      duration,
      easing: Easing.Cubic.Out
    }).finished

    if (animationStatus) {
      this.status = SidebarStatus.Revealed
    }

    this._toggleListeners.forEach(callback => callback(this))
  }

  async close(duration: number = SIDEBAR_ANIMATION_DURATION) {
    if (
      this.status === SidebarStatus.Hidden ||
      this.status === SidebarStatus.Hiding
    ) {
      return
    }
    this.status = SidebarStatus.Hiding
    this._toggleListeners.forEach(callback => callback(this))
    actionHistorySidebarOpenWidthInstant.value = ratioToWidth(0)
    const animationStatus = await simpleTweener.to({
      description: 'close action history',
      target: this as ActionHistorySidebar,
      propertyGoals: {
        exposedRatio: 0
      },
      duration,
      easing: Easing.Cubic.Out
    }).finished

    if (animationStatus) {
      this.status = SidebarStatus.Hidden
      this.traverse(child => {
        child.visible = false
      })
    }

    this._toggleListeners.forEach(callback => callback(this))
  }
  closeAndLock() {
    this._locked = true
    return this.close()
  }

  toggle() {
    switch (this.status) {
      case SidebarStatus.Hidden:
      case SidebarStatus.Hiding:
        toggleActionHistorySideBarOpen.value = true
        return this.open()

      case SidebarStatus.Revealed:
      case SidebarStatus.Revealing:
        toggleActionHistorySideBarOpen.value = false
        return this.close()
    }
  }

  updatePositions = async (offset: number) => {
    const anims: Promise<CompleteStatus>[] = []
    for (const t of this.turnGroups) {
      if (t != this.currentTurnGroup) {
        const val = t.mesh.matrix.offset.y.offset + offset

        const anim = simpleTweener.to({
          description: 'action history group position',
          target: t.mesh.matrix.offset.y,
          propertyGoals: {
            offset: val
          },
          duration: 200,
          easing: Easing.Cubic.Out
        }).finished
        anims.push(anim)
      }
    }
    this.scrollView.scrollValue.setPosition(0)
    await Promise.all(anims)
  }
  async process(ev: ActionHistoryEvent) {
    const isFirstRow = this.scrollView.items.length === 0
    const playerId = ev.player

    const row = createRowFromEvent(this, ev)!

    // If EndTurn event, display all item rows FIRST, then the EndTurn badge,
    // so that no items dispay AFTER the EndTurn badge
    const rowItems =
      ev.type === 'EndTurn'
        ? (
            ev.items
              .map(item => createRowFromEvent(this, ev, item))
              .filter(Boolean) as Row[]
          ).concat(row)
        : [row].concat(
            ev.items
              .map(item => createRowFromEvent(this, ev, item))
              .filter(Boolean) as Row[]
          )

    if (isFirstRow) {
      this.started.resolve()
    }

    const isNewGroup = row instanceof StartTurnRow || !this.currentTurnGroup
    let anim: Promise<CompleteStatus> | undefined
    if (isNewGroup) {
      this.queue.push(async () => {
        this.currentTurnGroup = new TurnGroup(
          playerId,
          this.scrollView,
          isFirstRow ? 18 : 14
        )

        this.turnGroups.push(this.currentTurnGroup)
        this.currentTurnGroup.mesh.matrix.offset.x.scale = -1
        anim = simpleTweener.to({
          description: 'action history group position',
          target: this.currentTurnGroup.mesh.matrix.offset.x,
          propertyGoals: {
            scale: 0
          },
          duration: 200,
          easing: Easing.Cubic.Out
        }).finished
        this.scrollView.push(this.currentTurnGroup.mesh)
        await this.updatePositions(this.currentTurnGroup.padding + 4)
        this.currentTurnGroup.mesh.matrix.offset.y.offset = 0
      })
    }

    for (const r of rowItems) {
      this.queue.push(async () => {
        await Promise.all([
          this.updatePositions(r.matrix.size.y.offset),
          this.currentTurnGroup.add(r)
        ])
      })
    }
    this.queue.runUntilFinished()
    if (isNewGroup) {
      this.scrollView.recalculate(this.scrollView.items.indexOf(row) - 3)
    }
    await anim
  }
}
