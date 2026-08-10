import { uiScale } from '@opensky/shared/userSettings'
import { WebGLRenderer } from 'three'

import { getAssetsManager } from '~/assets/index'
import { COLOR_DEBUG_RED } from '~/colors/colorLibrary'
import DragValue from '~/helpers/DragValue'
import { fastMatrixWorldUpdate } from '~/helpers/fastMatrixWorldUpdate'
import { putChildAtBottom } from '~/helpers/I2D'
import { Pin, ReadonlyPin } from '~/helpers/LayoutHelpers'
import ScrollValue from '~/helpers/ScrollValue'
import { Sorter } from '~/helpers/SortType'
import Mesh2D from '~/meshes/Mesh2D'
import Object2D from '~/meshes/Object2D'
import { Easing } from '~/systems/animation/Easing'
import { simpleTweener } from '~/systems/animation/tweeners'
import inputProvider, { underPointer } from '~/systems/input/input'
import { makeInteractive } from '~/utils/makeInteractive'
import { isOrHasChild, recursivelySetDepth } from '~/utils/threeUtils'

import SimpleRow from './DeckViewerSidebar/SimpleRow'

const WHEEL_LINE_PIXELS = 16

interface ScrollViewOptions<Item> {
  scrollAxis: 'x' | 'y'
  itemSorter?: Sorter<Item>
  tailEnd?: boolean
  overflowStart?: number
  overflowEnd?: number
  extraAllowScroll?: () => boolean
  clipSpaceDepth?: number
  scissor?: boolean
  inverted?: boolean
}

type HoverListener = (item: Object2D) => void

export default class SimpleScrollView<
  Item,
  RowKlass extends SimpleRow<Item>
> extends Object2D {
  private _overflowTop: number
  private _overflowBottom: number
  private _scissorRects: Mesh2D[] | undefined
  private _needsToScroll: boolean
  private _inverted: boolean
  get needsToScroll(): boolean {
    return this._needsToScroll
  }
  set needsToScroll(value: boolean) {
    if (this._needsToScroll === value) {
      return
    }
    if (this._scissorRects) {
      for (const mesh of this._scissorRects) {
        mesh.visible = value
      }
    }
    this._needsToScroll = value
  }
  animateToBottom() {
    this.scrollValue.animateToEnd()
  }
  private _itemSorter: Sorter<Item> | undefined
  get itemSorter(): Sorter<Item> | undefined {
    return this._itemSorter
  }
  set itemSorter(value: Sorter<Item> | undefined) {
    this._itemSorter = value
    this.makeDirty()
  }
  innerContainer: Object2D = new Object2D()
  items: RowKlass[] = []
  itemOffsets: Map<RowKlass, number | undefined> = new Map()
  scrollValue: ScrollValue

  private _dirty = true
  makeDirty() {
    this._dirty = true
  }
  private _hoverListeners: Set<HoverListener> = new Set()
  private _innerSizePin: Pin

  private _majorAxis: 'x' | 'y'
  private _matrixIndexScale: number
  private _matrixIndexPrescale: number
  private _matrixIndexTranslate: number
  private _dragValue: DragValue
  private _extraAllowScroll?: () => boolean

  constructor(options: ScrollViewOptions<Item>) {
    super()

    this.name = 'scrollview'
    makeInteractive(this, { cursor: 'default' })

    this._extraAllowScroll = options.extraAllowScroll

    this._itemSorter = options.itemSorter
    this._overflowTop = options.overflowStart || 0
    this._overflowBottom = options.overflowEnd || 0
    this._inverted = options.inverted || false

    const isHorizontal = options.scrollAxis === 'x'
    this._majorAxis = options.scrollAxis

    this._matrixIndexScale = isHorizontal ? 0 : 1
    this._matrixIndexTranslate = isHorizontal ? 2 : 3
    this._matrixIndexPrescale = isHorizontal ? 7 : 11

    const innerSizePin = new Pin(1, 1, 0, 0)
    innerSizePin[this._majorAxis].scale = 0

    this.innerContainer.matrix.setConstraints(
      innerSizePin,
      ReadonlyPin.TopLeft,
      ReadonlyPin.TopLeft.clone()
    )
    this.innerContainer.shouldRenderAsGroup = true

    this.add(this.innerContainer)

    if (options.scissor) {
      const maskRect = getAssetsManager().fetchMeshDeepClone(
        'uiSmall',
        'rectangle-backfacing'
      )
      maskRect.matrix.setConstraints(
        new Pin(1, 1, -2, this._overflowTop + this._overflowBottom - 3),
        new Pin(0.5, 0),
        new Pin(0.5, 0, 0, -this._overflowTop + 1.5)
      )
      maskRect.matrix.setColor(COLOR_DEBUG_RED)
      maskRect.matrix.opacity = 0.1
      maskRect.shouldRenderAsGroup = true
      const mrmw = maskRect.matrixWorld
      const mEls = mrmw.elements
      maskRect.onBeforeRender = (renderer: WebGLRenderer) => {
        const w = mrmw.getWidthInPixels()
        const h = mrmw.getHeightInPixels()
        const x = ((mEls[2] * 0.5 + 0.5) / mEls[7]) * 2
        const y = ((mEls[3] * 0.5 + 0.5) / mEls[11]) * 2 - h
        const s = uiScale.value
        renderer.setScissor(x * s, y * s, w * s, h * s)
        renderer.setScissorTest(true)
      }
      this.add(maskRect)

      const maskRect2 = getAssetsManager().fetchMeshDeepClone(
        'uiSmall',
        'rectangle-backfacing'
      )
      maskRect2.matrix = maskRect.matrix
      maskRect2.shouldRenderAsGroup = true
      maskRect2.onBeforeRender = (renderer: WebGLRenderer) => {
        renderer.setScissorTest(false)
      }
      this.add(maskRect2)

      putChildAtBottom(maskRect)
      this._scissorRects = [maskRect, maskRect2]
    }

    const dragValue = new DragValue()
    const scrollValue = new ScrollValue(options.tailEnd)

    this._innerSizePin = innerSizePin

    this._dragValue = dragValue
    this.scrollValue = scrollValue

    inputProvider.onPressStart.addListener(this._onPointerDown)
    inputProvider.onWheel.addListener(this._onWheel)

    if (options.clipSpaceDepth !== undefined) {
      recursivelySetDepth(this, options.clipSpaceDepth)
    }
  }

  update(dt: number) {
    if (this._dirty) {
      this._dirty = false
      this.recalculate()
    }

    if (this._dragValue.active) {
      const x = this._dragValue.drain()
      this.scrollValue.addPosition(x)
    }
    const outerEls = this.matrixWorld.elements
    const innerEls = this.innerContainer.matrixWorld.elements
    this.scrollValue.outerSize =
      outerEls[this._matrixIndexScale] / outerEls[this._matrixIndexPrescale]
    this.scrollValue.innerSize =
      innerEls[this._matrixIndexScale] / innerEls[this._matrixIndexPrescale]
    this.scrollValue.update(dt)
    this.needsToScroll =
      this.scrollValue.outerSize + 1 < this.scrollValue.innerSize
    if (!this.needsToScroll) {
      this.scrollValue.setPosition(0)
    }

    this.innerContainer.matrix.offset[this._majorAxis].offset =
      this.scrollValue.innerPos

    this.toggleVisible()
  }

  toggleVisible() {
    const sI = this._matrixIndexScale
    const tI = this._matrixIndexTranslate
    const psI = this._matrixIndexPrescale

    const pEls = this.matrixWorld.elements
    fastMatrixWorldUpdate(this.innerContainer)
    const s = this._majorAxis === 'x' ? 1 : -1
    for (const item of this.items) {
      fastMatrixWorldUpdate(item)
      const els = item.matrixWorld.elements
      const outerMin = pEls[tI] + this._overflowTop * pEls[psI]
      const outerMax = pEls[sI] * s + this._overflowBottom * pEls[psI] * s
      item.visible =
        (els[tI] + els[sI] * s) * s > outerMin * s &&
        els[tI] * s < (pEls[tI] + outerMax) * s
    }
  }

  push(item: RowKlass) {
    this.items.push(item)
    this._updateAfterAdd(item)
  }

  unshift(item: RowKlass) {
    this.items.unshift(item)
    this._updateAfterAdd(item)
  }

  private _updateAfterAdd(item: RowKlass) {
    this.itemOffsets.set(item, undefined)
    this.innerContainer.add(item)
    this._dirty = true
  }

  removeItem(item: RowKlass) {
    const idx = this.items.indexOf(item)

    if (idx !== -1) {
      this.items.splice(idx, 1)
      this.innerContainer.remove(item)
      this._dirty = true
    }
  }

  onHoverItem(callback: HoverListener) {
    this._hoverListeners.add(callback)

    return () => {
      this._hoverListeners.delete(callback)
    }
  }

  recalculate = (iOffset = 0) => {
    if (this._itemSorter) {
      this.items.sort((a, b) => this._itemSorter!(a.item, b.item))
    }
    // Reposition items
    for (let i = Math.max(iOffset, 0); i < this.items.length; i++) {
      const item = this.items[i]
      const offsetPinVal = item.matrix.offset[this._majorAxis]
      const oldOffset = this.itemOffsets.get(item)
      let newOffset = 0
      if (i > 0) {
        const prevIndex = i - 1
        const prevItem = this.items[prevIndex]
        const prevOffset = this.itemOffsets.get(prevItem)
        newOffset =
          (prevOffset || 0) + prevItem.matrix.size[this._majorAxis].offset
      }
      if (oldOffset !== newOffset || simpleTweener.isAnimating(offsetPinVal)) {
        if (oldOffset !== newOffset) {
          this.itemOffsets.set(item, newOffset)
          if (oldOffset === undefined) {
            offsetPinVal.offset = this._inverted ? 0 : newOffset
          } else {
            simpleTweener.to({
              description: 'slide scrollview',
              target: offsetPinVal,
              propertyGoals: { offset: newOffset },
              duration: 150,
              easing: Easing.Quadratic.Out
            })
          }
        }
      }
    }
    if (this.items.length > 0) {
      const lastItem = this.items[this.items.length - 1]
      const lastItemMatrix = lastItem.matrix
      this._innerSizePin[this._majorAxis].offset =
        this.itemOffsets.get(lastItem)! +
        lastItemMatrix.size[this._majorAxis].offset
    }
  }

  getScrollPixelsOuter() {
    const els = this.matrixWorld.elements
    return els[this._matrixIndexScale] / els[this._matrixIndexPrescale]
  }

  getScrollPixelsInner() {
    const els = this.innerContainer.matrixWorld.elements
    return els[this._matrixIndexScale] / els[this._matrixIndexPrescale]
  }

  private _onPointerDown = (clientX: number, clientY: number) => {
    if (this._eatsMouseEvents()) {
      inputProvider.onDrag.addListener(this._onPointerMove)
      inputProvider.onPressEnd.addListener(this._onPointerUp)

      const pos = this._majorAxis === 'x' ? clientX : clientY

      this._dragValue.start(pos)
      this.scrollValue.braking = true
      this.scrollValue.applyMarginSpring = false
    }
  }

  private _onPointerMove = (clientX: number, clientY: number) => {
    const pos = this._majorAxis === 'x' ? clientX : clientY
    this._dragValue.update(pos)
  }

  private _onPointerUp = (clientX: number, clientY: number) => {
    inputProvider.onDrag.removeListener(this._onPointerMove)
    inputProvider.onPressEnd.removeListener(this._onPointerUp)

    const pos = this._majorAxis === 'x' ? clientX : clientY

    this._dragValue.stop(pos)

    this.scrollValue.braking = false
    this.scrollValue.applyMarginSpring = true

    this.scrollValue.speedPPS = this._dragValue.speedPPS
  }

  private _onWheel = (
    deltaX: number,
    deltaY: number,
    _: number,
    deltaMode: number
  ) => {
    if (this._eatsMouseEvents()) {
      const delta = this._majorAxis === 'x' ? deltaX : deltaY

      const deltaScale = deltaMode ? WHEEL_LINE_PIXELS : 1
      if (delta !== 0) {
        this.scrollValue.speedPPS = 0
        this.scrollValue.addPosition(
          (-delta * deltaScale) /
            this.matrixWorld.elements[this._matrixIndexPrescale] /
            600
        )
      }
    }
  }
  private _eatsMouseEvents() {
    return (
      (this._extraAllowScroll && this._extraAllowScroll()) ||
      (underPointer.collider2D?.parent &&
        isOrHasChild(this, underPointer.collider2D.parent))
    )
  }
}
