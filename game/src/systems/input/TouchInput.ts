import GeneralInput, { MB_LEFT } from './GeneralInput'

export default class TouchInput {
  private trackedID: number | null = null

  constructor(private _input: GeneralInput) {
    _input.inScreen = true
    window.addEventListener('touchmove', this.handleTouchMove, {
      passive: false
    })
    window.addEventListener('touchstart', this.handleTouchStart, {
      passive: false
    })
    window.addEventListener('touchend', this.handleTouchEnd, { passive: false })
    window.addEventListener('touchcancel', this.handleTouchEnd, {
      passive: false
    })
  }

  dispose() {
    window.removeEventListener('touchmove', this.handleTouchMove)
    window.removeEventListener('touchstart', this.handleTouchStart)
    window.removeEventListener('touchend', this.handleTouchEnd)
    window.removeEventListener('touchcancel', this.handleTouchEnd)
  }

  private handleTouchMove = (ev: TouchEvent) => {
    ev.preventDefault()
    const touch = ev.changedTouches[0]
    if (touch.identifier === this.trackedID) {
      this._input.isTouch = true
      this._input.processPosition(
        touch.clientX,
        touch.clientY,
        ev.timeStamp,
        true,
        MB_LEFT,
        ev.target
      )
    }
  }

  private handleTouchStart = (ev: TouchEvent) => {
    ev.preventDefault()
    const touch = ev.changedTouches[0]
    if (this.trackedID === null) {
      this.trackedID = touch.identifier
    }
    this._input.isTouch = true
    this._input.processPosition(
      touch.clientX,
      touch.clientY,
      ev.timeStamp,
      true,
      MB_LEFT,
      ev.target
    )
  }

  private handleTouchEnd = (ev: TouchEvent) => {
    if (ev.cancelable) {
      ev.preventDefault()
    }
    const touch = ev.changedTouches[0]
    if (touch.identifier === this.trackedID) {
      this.trackedID = null
    }
    this._input.isTouch = true
    this._input.processPosition(
      touch.clientX,
      touch.clientY,
      ev.timeStamp,
      false,
      MB_LEFT,
      ev.target
    )
    this._input.processPosition(
      -99999,
      -99999,
      ev.timeStamp,
      false,
      MB_LEFT,
      ev.target
    )
  }
}
