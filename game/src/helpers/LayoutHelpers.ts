import { renderMetrics } from '@opensky/shared/renderMetrics'
import { Vector2 } from 'three'

import { fatalBoobyTrap } from '~/utils/jsUtils'

export class PinVal {
  constructor(
    public scale = 0.5,
    public offset = 0
  ) {
    //
  }
  copy(other: PinVal) {
    this.scale = other.scale
    this.offset = other.offset
  }
  getValue(parent: number, parentScale: number) {
    return this.scale * parent + this.offset * parentScale
  }
}

export class Pin {
  static fromPixels(w: number, h: number) {
    return new Pin(0, 0, w, h)
  }
  static offsetFromParentSize(w: number, h: number) {
    return new Pin(1, 1, w, h)
  }
  x: PinVal
  y: PinVal
  constructor(xScale = 0.5, yScale = 0.5, xOffset = 0, yOffset = 0) {
    this.x = new PinVal(xScale, xOffset)
    this.y = new PinVal(yScale, yOffset)
  }
  solve(
    parentWidth: number,
    parentHeight: number,
    parentWidthScale: number,
    parentHeightScale: number,
    result: Vector2
  ) {
    result.x = this.x.getValue(parentWidth, parentWidthScale)
    result.y = this.y.getValue(parentHeight, parentHeightScale)
  }
  clone() {
    return new Pin(this.x.scale, this.y.scale, this.x.offset, this.y.offset)
  }
  copy(other: Pin) {
    this.x.offset = other.x.offset
    this.x.scale = other.x.scale
    this.y.offset = other.y.offset
    this.y.scale = other.y.scale
  }
  cloneOffset(x: number, y: number) {
    const clone = this.clone()
    clone.x.offset += x
    clone.y.offset += y
    return clone
  }
}
export class ReadonlyPin extends Pin {
  static TopLeft = new ReadonlyPin(0, 0)
  static Top = new ReadonlyPin(0.5, 0)
  static TopRight = new ReadonlyPin(1, 0)
  static Right = new ReadonlyPin(1, 0.5)
  static BottomRight = new ReadonlyPin(1, 1)
  static Bottom = new ReadonlyPin(0.5, 1)
  static BottomLeft = new ReadonlyPin(0, 1)
  static Left = new ReadonlyPin(0, 0.5)
  static Center = new ReadonlyPin(0.5, 0.5)
  static FullSize = new ReadonlyPin(1, 1)
  static EmptySize = new ReadonlyPin(0, 0)
  constructor(xScale = 0.5, yScale = 0.5, xOffset = 0, yOffset = 0) {
    super(xScale, yScale, xOffset, yOffset)
    fatalBoobyTrap(this.x, 'offset', "Can't change x offset of ReadonlyPin.")
    fatalBoobyTrap(this.x, 'scale', "Can't change x scale of ReadonlyPin.")
    fatalBoobyTrap(this.y, 'offset', "Can't change y offset of ReadonlyPin.")
    fatalBoobyTrap(this.y, 'scale', "Can't change y scale of ReadonlyPin.")
  }
}

export class SizePin extends Pin {
  constructor(
    xScale = 0.5,
    yScale = 0.5,
    private contentAspectRatio = 1,
    private aspectMode: 'x' | 'y' | 'fit' | 'crop' | 'stretch' = 'fit',
    xOffset = 0,
    yOffset = 0
  ) {
    super(xScale, yScale, xOffset, yOffset)
  }
  solve(
    parentWidth: number,
    parentHeight: number,
    parentWidthScale: number,
    parentHeightScale: number,
    result: Vector2
  ) {
    super.solve(
      parentWidth,
      parentHeight,
      parentWidthScale,
      parentHeightScale,
      result
    )
    const parentAspectRatio = parentWidth / parentHeight
    let aspectMode = this.aspectMode
    const contentAspectRatio = this.contentAspectRatio / renderMetrics.aspect
    const contentTooWide = contentAspectRatio > parentAspectRatio
    switch (aspectMode) {
      case 'fit':
        aspectMode = contentTooWide ? 'x' : 'y'
        break
      case 'crop':
        aspectMode = contentTooWide ? 'y' : 'x'
        break
    }

    switch (aspectMode) {
      case 'x':
        result.y = result.x / contentAspectRatio
        break
      case 'y':
        result.x = result.y * contentAspectRatio
        break
    }
  }
}

/**
 * Example:
 * ```ts
 * new PickerPin(Math.min, ReadonlyPin.FullSize, Pin.fromPixels(1000, 1000))
 * ```
 * Will be the full screen size or 1000x1000, whatever is smaller.
 */
export class PickerPin extends Pin {
  private _pins: Array<{ pin: Pin; result: Vector2 }>
  constructor(
    private _picker: (...numbers: number[]) => number,
    ...pins: Pin[]
  ) {
    super()
    this._pins = pins.map(pin => ({ pin, result: new Vector2() }))
  }
  solve(
    parentWidth: number,
    parentHeight: number,
    parentWidthScale: number,
    parentHeightScale: number,
    result: Vector2
  ) {
    for (const { pin, result: pinResult } of this._pins) {
      pin.solve(
        parentWidth,
        parentHeight,
        parentWidthScale,
        parentHeightScale,
        pinResult
      )
    }
    for (const { result: pinResult } of this._pins) {
      result.x = this._picker(result.x, pinResult.x)
      result.y = this._picker(result.y, pinResult.y)
    }
  }
}
