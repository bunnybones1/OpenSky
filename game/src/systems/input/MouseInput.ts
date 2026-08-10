import renderer from '~/renderer'

import GeneralInput, { MB_LEFT, MB_RIGHT } from './GeneralInput'

export default class MouseInput {
  constructor(private _input: GeneralInput) {
    _input.inScreen = false
    const canvas = renderer.getContext().canvas
    canvas.addEventListener('mousemove', this.handleMouseMove, false)
    canvas.addEventListener('mousedown', this.handleMouseDown, false)
    canvas.addEventListener('mouseup', this.handleMouseUp, false)
    canvas.addEventListener('mouseout', this.handleMouseOut, false)
    canvas.addEventListener('click', this.handleClick, false)
    canvas.addEventListener('contextmenu', this.handleContextMenu, false)
    canvas.addEventListener('blur', this.handleBlur, false)
    canvas.addEventListener('wheel', this.handleWheel, false)
  }

  dispose() {
    const canvas = renderer.getContext().canvas
    canvas.removeEventListener('mousemove', this.handleMouseMove, false)
    canvas.removeEventListener('mousedown', this.handleMouseDown, false)
    canvas.removeEventListener('mouseup', this.handleMouseUp, false)
    canvas.removeEventListener('mouseout', this.handleMouseOut, false)
    canvas.removeEventListener('click', this.handleClick, false)
    canvas.removeEventListener('contextmenu', this.handleContextMenu, false)
    canvas.removeEventListener('blur', this.handleBlur, false)
    canvas.removeEventListener('wheel', this.handleWheel, false)
  }

  private handleBlur = () => {
    this._input.inScreen = false
    this._input.isTouch = false
    this._input.processPosition(
      -9999,
      -9999,
      Date.now(),
      this._input.isPressed,
      MB_LEFT,
      undefined
    )
  }

  private handleMouseMove = (ev: MouseEvent) => {
    this._input.inScreen = true
    this._input.isTouch = false
    this._input.processPosition(
      ev.offsetX,
      ev.offsetY,
      ev.timeStamp,
      this._input.isPressed,
      MB_LEFT,
      ev.target
    )
  }

  private handleMouseDown = (ev: MouseEvent) => {
    if (ev.button === MB_LEFT || ev.button === MB_RIGHT) {
      this._input.isTouch = false
      this._input.processPosition(
        ev.offsetX,
        ev.offsetY,
        ev.timeStamp,
        true,
        ev.button,
        ev.target
      )
    }
    ev.preventDefault()
    ev.stopImmediatePropagation()
  }

  private handleMouseUp = (ev: MouseEvent) => {
    if (ev.button === MB_LEFT || ev.button === MB_RIGHT) {
      this._input.isTouch = false
      this._input.processPosition(
        ev.offsetX,
        ev.offsetY,
        ev.timeStamp,
        false,
        ev.button,
        ev.target
      )
    }
    ev.preventDefault()
    ev.stopImmediatePropagation()
  }

  private handleMouseOut = () => {
    this._input.inScreen = false
    this._input.inCanvas = false
    this._input.onMove.dispatch(-1000, -1000)
  }

  private handleWheel = (ev: WheelEvent) => {
    this._input.onWheel.dispatch(ev.deltaX, ev.deltaY, ev.deltaZ, ev.deltaMode)
  }

  private handleClick = () => {
    //
  }

  private handleContextMenu = (ev: Event) => {
    ev.preventDefault()
  }
}
