import { Color } from 'three'

import { getAssetsManager } from '~/assets/index'
import { COLOR_DEEP_LILAC } from '~/colors/colorLibrary'
import {
  BUTTON_HEIGHT,
  BUTTON_MARGINS,
  END_TURN_BUTTON_HEIGHT,
  SIDEBAR_WIDTH
} from '~/constants'
import { makeSuperOpaque } from '~/helpers/I2D'
import { Pin, ReadonlyPin } from '~/helpers/LayoutHelpers'
import { playSound } from '~/helpers/soundHelpers'
import RectangleMaterial from '~/materials/RectangleMaterial'
import Object2D from '~/meshes/Object2D'
import RectangleMesh from '~/meshes/RectangleMesh'
import { firstState } from '~/state'
import { Easing } from '~/systems/animation/Easing'
import { AnimatedObject } from '~/systems/animation/RawTweener'
import { simpleTweener } from '~/systems/animation/tweeners'
import { CursorType } from '~/systems/input/CursorType'
import IInteractive from '~/systems/input/IInteractive'
import AnimatedNumber from '~/utils/AnimatedNumber'
import { onNextFrame } from '~/utils/onNextFrame'
import { recursivelySetDepth } from '~/utils/threeUtils'
import { createButton, createButtonIcon } from '~/utils/ui'

import ScrollView from '../ScrollView'
import {
  DROP_SHADOW_WIDTH,
  SIDEBAR_ANIMATION_DURATION,
  SidebarPosition,
  SidebarStatus,
  STROKE_BORDER_WIDTH
} from './constants'

type StatusChangeCallback = (status: SidebarStatus) => void
export type SidebarRow = Object2D & {
  teardown?: () => void
  regenerateBannerOnOpen?: boolean
  regenerateBanner?: () => void
}

interface DyingRow<Row> {
  row: Row
  animation: AnimatedObject<any>
}

const BG_COLOR = new Color('rgb(10, 7, 28)')

const OPEN_SIDEBARS: {
  [K in SidebarPosition]: SlideOutSidebar<any, any, any> | null
} = {
  [SidebarPosition.Left]: null,
  [SidebarPosition.Right]: null
}
export class SlideOutSidebar<Item, ItemID, Row extends Object2D>
  extends Object2D
  implements IInteractive
{
  slideController: AnimatedNumber
  private _openPosX: number
  private _closedPosX: number
  private _xOpenOffset: number
  changeSort(sorter: (a: Row, b: Row) => number) {
    this.scrollView.itemSorter = sorter
  }
  shouldRenderAsGroup = true

  private dyingRows: Map<ItemID, DyingRow<Row>> = new Map()

  update(dt: number) {
    this.scrollView.update(dt)
  }

  get allItems() {
    return [
      ...this._createQueue.map(i => this.getItemIDFromItem(i)),
      ...this.scrollView.items.map(i =>
        this.getItemIDFromItem(this.getItemFromRow(i))
      )
    ]
  }

  private _locked: boolean

  private _status: SidebarStatus
  get status(): SidebarStatus {
    return this._status
  }
  set status(value: SidebarStatus) {
    if (this._status === value) {
      return
    }
    this._status = value
    for (const cb of this._statusListeners) {
      cb(value)
    }
  }
  scrollView: ScrollView<Row>

  cursor: CursorType = 'grab'

  private _statusListeners: Set<StatusChangeCallback> = new Set()
  private _dirty = false
  private _createQueue: Item[] = []
  private _dimQueue = new Map<ItemID, boolean>()

  constructor(
    public side: SidebarPosition,
    private rowConstructor: {
      new (sidebar: SlideOutSidebar<Item, ItemID, Row>, item: Item): Row
    },
    private getItemFromRow: (row: Row) => Item,
    private getItemIDFromItem: (itemOrID: Item | ItemID) => ItemID,
    private options?: {
      itemSorter?: (a: Row, b: Row) => number
      createBar?: (yOffset: number) => { yOffset: number; bar: Object2D }
      onClose?: () => void
      onUpdate?: () => void
      onToggleRowDimness?: (row: Row, dim: boolean) => void
      addToBottom?: boolean
      xOffset?: number
      occupiesSide?: boolean
    }
  ) {
    super()
    const isLeftSide = side === SidebarPosition.Left
    const sidebarSidePin = isLeftSide ? ReadonlyPin.Left : ReadonlyPin.Right
    const sidebarSideOppositePin = isLeftSide
      ? ReadonlyPin.Right
      : ReadonlyPin.Left
    const offsetPin = sidebarSidePin.clone()
    this.matrix.setConstraints(
      new Pin(0, 1, SIDEBAR_WIDTH, 0),
      sidebarSidePin.clone(),
      offsetPin
    )
    this._closedPosX = 0
    this._openPosX = (SIDEBAR_WIDTH + DROP_SHADOW_WIDTH) * -flipness(this.side)
    this._xOpenOffset = (options?.xOffset ?? 0) * -flipness(this.side)
    this.slideController = new AnimatedNumber(
      v => {
        offsetPin.x.offset = this._openPosX - v
      },
      this._closedPosX,
      SIDEBAR_ANIMATION_DURATION,
      Easing.Cubic.Out
    )

    const backgroundMesh = getAssetsManager().fetchMeshDeepClone(
      'uiSmall',
      'rectangle',
      true
    )
    makeSuperOpaque(backgroundMesh)
    backgroundMesh.matrix.setColor(BG_COLOR)

    const gradientHeight = isLeftSide ? 15 : 31

    const solidBlockBottomHeight = isLeftSide ? 15 : END_TURN_BUTTON_HEIGHT + 65

    this.scrollView = new ScrollView<Row>({
      scrollAxis: 'y',
      itemSorter: options?.itemSorter,
      overflowStart: 10,
      overflowEnd: solidBlockBottomHeight
    })

    const topGradientMesh = getAssetsManager().fetchMeshDeepClone(
      'uiSmall',
      'gradient-top'
    )

    topGradientMesh.matrix.setColor(BG_COLOR, 0.9)

    const bottomGradientMesh = getAssetsManager().fetchMeshDeepClone(
      'uiSmall',
      'gradient-bottom'
    )
    bottomGradientMesh.matrix.setConstraints(
      new Pin(1, 0, 0, gradientHeight),
      ReadonlyPin.Bottom,
      ReadonlyPin.Bottom.cloneOffset(0, -solidBlockBottomHeight)
    )
    bottomGradientMesh.matrix.setColor(BG_COLOR, 0.9)

    const bottomPaddingCoverMesh = new RectangleMesh(new RectangleMaterial({}))
    bottomPaddingCoverMesh.matrix.setColor(BG_COLOR, 0.9)
    bottomPaddingCoverMesh.matrix.setConstraints(
      new Pin(1, 0, 0, solidBlockBottomHeight),
      ReadonlyPin.Bottom,
      ReadonlyPin.Bottom
    )

    const dropShadowMesh = getAssetsManager().fetchMeshDeepClone(
      'uiSmall',
      this.side === SidebarPosition.Left ? 'gradient-left' : 'gradient-right'
    )
    dropShadowMesh.matrix.setConstraints(
      new Pin(0, 1, DROP_SHADOW_WIDTH),
      sidebarSidePin,
      sidebarSideOppositePin
    )
    dropShadowMesh.matrix.setColor(BG_COLOR, 0.5)

    const strokeBorderMesh = getAssetsManager().fetchMeshDeepClone(
      'uiSmall',
      'rectangle',
      true
    )
    strokeBorderMesh.matrix.setColor(COLOR_DEEP_LILAC)
    strokeBorderMesh.matrix.setConstraints(
      new Pin(0, 1, STROKE_BORDER_WIDTH),
      sidebarSidePin,
      sidebarSideOppositePin
    )

    const yOffset = isLeftSide ? 0 : BUTTON_HEIGHT + 2 * BUTTON_MARGINS + 8 //8 extra pixels of space, as per mockup

    setTimeout(() => {
      const bar = options?.createBar?.(yOffset)
      const solidBlockTopHeight = bar?.yOffset ?? yOffset
      const topOfListYOffset = solidBlockTopHeight + 10
      this.scrollView.matrix.setConstraints(
        new Pin(
          0,
          1,
          SIDEBAR_WIDTH,
          -topOfListYOffset - solidBlockBottomHeight
        ),
        ReadonlyPin.TopLeft,
        ReadonlyPin.TopLeft.cloneOffset(0, topOfListYOffset)
      )
      topGradientMesh.matrix.setConstraints(
        new Pin(1, 0, 0, gradientHeight),
        ReadonlyPin.Top,
        ReadonlyPin.Top.cloneOffset(0, solidBlockTopHeight)
      )
      this.add(dropShadowMesh)
      this.add(backgroundMesh)
      this.add(this.scrollView)
      this.add(topGradientMesh)
      if (bar) {
        this.add(bar.bar)
      }

      this.add(bottomPaddingCoverMesh)
      this.add(bottomGradientMesh)
      this.add(strokeBorderMesh)

      this.close(0)
      this.updateVisuals()
    }, 1)
  }

  async open(duration: number = SIDEBAR_ANIMATION_DURATION) {
    if (this._locked) {
      return
    }
    if (this.options?.occupiesSide ?? true) {
      if (OPEN_SIDEBARS[this.side]) {
        OPEN_SIDEBARS[this.side]?.close()
      }
      OPEN_SIDEBARS[this.side] = this
    }

    this.traverse(child => {
      child.visible = true
    })
    this.status = SidebarStatus.Revealing
    for (const row of this.scrollView.items) {
      if (
        'regenerateBannerOnOpen' in row &&
        row.regenerateBannerOnOpen &&
        'regenerateBanner' in row &&
        typeof row.regenerateBanner === 'function'
      ) {
        row.regenerateBanner?.()
      }
    }

    this.makeDirty()

    await this.slideController.animateToValue(
      this._openPosX + this._xOpenOffset,
      duration
    )
    if (this.status !== SidebarStatus.Revealing) {
      return
    }
    this.status = SidebarStatus.Revealed
  }

  async close(duration: number = SIDEBAR_ANIMATION_DURATION) {
    this.status = SidebarStatus.Hiding
    this.options?.onClose?.()

    await this.slideController.animateToValue(this._closedPosX, duration)

    if (this.status !== SidebarStatus.Hiding) {
      return
    }
    this.traverse(child => {
      child.visible = false
    })
    this.status = SidebarStatus.Hidden
  }

  closeAndLock() {
    this._locked = true
    return this.close()
  }
  unlock() {
    this._locked = false
  }

  toggle() {
    playSound('audioFxCommon', 'SidebarSlides')
    switch (this._status) {
      case SidebarStatus.Hidden:
      case SidebarStatus.Hiding:
        this.scrollView.scrollValue.setPosition(0)
        return this.open()

      case SidebarStatus.Revealed:
      case SidebarStatus.Revealing:
        return this.close()
    }
  }

  onToggle(callback: StatusChangeCallback) {
    this._statusListeners.add(callback)

    return () => this._statusListeners.delete(callback)
  }

  toggleRowDimness(itemID: ItemID, dim: boolean) {
    if (this.status === SidebarStatus.Hidden) {
      this._dimQueue.set(itemID, dim)
      return
    }
    if (this.hasRow(itemID)) {
      const row = this.getRow(itemID)!
      this.options?.onToggleRowDimness?.(row, dim)
    }
    this.scrollView.recalculate()
    this.makeDirty()
  }

  createRow(item: Item, pretendItWasAlwaysThere = false) {
    if (this.status === SidebarStatus.Hidden) {
      this._createQueue.push(item)
      return
    }
    let row: Row
    const itemID = this.getItemIDFromItem(item)
    if (this.dyingRows.has(itemID)) {
      const dyingRow = this.dyingRows.get(itemID)!
      dyingRow.animation.kill()
      this.dyingRows.delete(itemID)
      row = dyingRow.row
      pretendItWasAlwaysThere = true
    } else {
      row = new this.rowConstructor(this, item)
    }
    const rowXOffset = row.matrix.offset.x.offset

    if (!pretendItWasAlwaysThere) {
      row.matrix.offset.x.offset = SIDEBAR_WIDTH * -flipness(this.side)
      simpleTweener.to({
        description: 'slide sidebar',
        target: row.matrix.offset.x,
        propertyGoals: { offset: rowXOffset },
        duration: 300,
        easing: Easing.Cubic.Out
      })
    }

    if (this.options?.addToBottom) {
      this.scrollView.push(row)
    } else {
      this.scrollView.unshift(row)
    }
    this.makeDirty()
  }

  hasRow(itemID: ItemID, evenJustQueued = false) {
    if (
      evenJustQueued &&
      this._createQueue.some(
        queuedItem => this.getItemIDFromItem(queuedItem) === itemID
      )
    ) {
      return true
    }
    return (
      !this.dyingRows.has(itemID) &&
      this.scrollView.items.some(
        row => this.getItemIDFromItem(this.getItemFromRow(row)) === itemID
      )
    )
  }

  getRow(id: ItemID) {
    const row = this.scrollView.items.find(
      (row: Row) => this.getItemIDFromItem(this.getItemFromRow(row)) === id
    )
    return row
  }

  removeRow(itemOrID: Item | ItemID) {
    const id = this.getItemIDFromItem(itemOrID)
    const createQueueIndex = this._createQueue.findIndex(
      c => this.getItemIDFromItem(c) === id
    )
    if (createQueueIndex !== -1) {
      this._createQueue.splice(createQueueIndex, 1)
    }
    const row = this.getRow(id)

    if (row) {
      const x = SIDEBAR_WIDTH * -flipness(this.side)
      const animation = simpleTweener.to({
        description: 'slide row',
        target: row.matrix.offset.x,
        propertyGoals: { offset: x },
        duration: 300,
        easing: Easing.Cubic.Out,
        onComplete: () => {
          this.scrollView.removeItem(row)
          this.dyingRows.delete(id)
          if ('teardown' in row && typeof row.teardown === 'function') {
            row.teardown()
          }
        }
      })

      this.dyingRows.set(id, { row, animation })
    }
    this.makeDirty()
  }
  makeDirty = () => {
    if (this._dirty || this.status === SidebarStatus.Hidden) {
      return
    }
    onNextFrame(() => {
      if (!this._dirty) {
        return
      }
      firstState.then(() => this.updateVisuals())
      this.updateVisuals()
      this._dirty = false
    })
    this._dirty = true
  }
  private updateVisuals() {
    for (const card of this._createQueue) {
      this.createRow(card, true)
    }
    this._createQueue.length = 0
    for (const card of this._dimQueue.keys()) {
      this.toggleRowDimness(card, this._dimQueue.get(card)!)
    }
    this._dimQueue.clear()
    this.scrollView.recalculate()
    recursivelySetDepth(this, 0.91)
  }
}

export function flipness(side: SidebarPosition) {
  return side === SidebarPosition.Left ? 1 : -1
}

export function createCloseButton(
  container: Object2D,
  sidebar: SlideOutSidebar<unknown, unknown, any>
) {
  const buttonWidth = BUTTON_HEIGHT * 1.2
  const pin =
    sidebar.side === SidebarPosition.Left
      ? ReadonlyPin.TopLeft.cloneOffset(-SIDEBAR_WIDTH, 0)
      : ReadonlyPin.TopRight.cloneOffset(SIDEBAR_WIDTH, 0)
  const closeButton = createButton(
    container,
    () => sidebar.close(),
    Pin.fromPixels(buttonWidth, BUTTON_HEIGHT),
    pin,
    sidebar.side === SidebarPosition.Left
      ? ReadonlyPin.TopLeft
      : ReadonlyPin.TopRight,
    undefined,
    undefined,
    'button-diagonal'
  )
  createButtonIcon(closeButton.mesh, 'ui-icon-close')

  closeButton.mesh.visible = false

  sidebar.onToggle(async s => {
    function anim(offset: number) {
      return simpleTweener.to({
        description: 'slide sidebar button',
        target: pin.y,
        propertyGoals: { offset },
        duration: 100
      }).finished
    }
    if (s === SidebarStatus.Revealed) {
      closeButton.mesh.visible = true
      await anim(0)
    } else if (s === SidebarStatus.Hiding) {
      await anim(100)
      closeButton.mesh.visible = false
    }
  })
  return closeButton
}
