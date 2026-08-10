import inputProvider from '~/systems/input/input'
import SafeListeners from '~/utils/helpers/SafeListeners'

import DragValue from './DragValue'
import ScrollValue from './ScrollValue'

const WHEEL_LINE_PIXELS = 16

export default class InputBoundVerticalScroll {
  dragY: DragValue
  scrollY: ScrollValue
  constructor(safe: SafeListeners) {
    const dragY = new DragValue()
    const scrollY = new ScrollValue()
    scrollY.speedPPS = -1
    scrollY.innerSize = 600
    scrollY.outerSize = 750

    this.dragY = dragY
    this.scrollY = scrollY

    inputProvider.onPressStart.addListener(this._onDragStart)
    inputProvider.onWheel.addListener(this._handleWheel)
    safe.addCleanup(() => {
      inputProvider.onWheel.removeListener(this._handleWheel)
      inputProvider.onPressStart.removeListener(this._onDragStart)
      inputProvider.onWheel.removeListener(this._onDrag)
      inputProvider.onWheel.removeListener(this._onDragEnd)
    })
    safe.onRafUpdate(this)
  }

  update = (dt: number) => {
    if (this.dragY.active) {
      const y = this.dragY.drain()
      this.scrollY.addPosition(y)
    }
    this.scrollY.update(dt)
  }
  private _onDragStart = (clientX: number, clientY: number) => {
    inputProvider.onDrag.addListener(this._onDrag)
    inputProvider.onPressEnd.addListener(this._onDragEnd)
    this.dragY.start(clientY)
    this.scrollY.braking = true
    this.scrollY.applyMarginSpring = false
  }

  private _onDrag = (clientX: number, clientY: number) => {
    this.dragY.update(clientY)
  }

  private _onDragEnd = (clientX: number, clientY: number) => {
    this.dragY.stop(clientY)

    this.scrollY.braking = false
    this.scrollY.applyMarginSpring = true

    this.scrollY.speedPPS = this.dragY.speedPPS

    inputProvider.onDrag.removeListener(this._onDrag)
    inputProvider.onDragEnd.removeListener(this._onDragEnd)
  }

  private _handleWheel = (
    deltaX: number,
    deltaY: number,
    _: number,
    deltaMode: number
  ) => {
    const deltaScale = deltaMode ? WHEEL_LINE_PIXELS : 1

    if (deltaY !== 0) {
      this.scrollY.speedPPS = 0
      this.scrollY.addPosition((-deltaY * deltaScale) / 1.5)
    }
  }
}
