import { Color } from 'three'

import { Pin, ReadonlyPin } from '~/helpers/LayoutHelpers'
import RectangleMaterial from '~/materials/RectangleMaterial'
import Object2D from '~/meshes/Object2D'
import RectangleMesh from '~/meshes/RectangleMesh'
import { createResolvable, Resolvable } from '~/utils/asyncUtils'

export default class PlayerProgressBar {
  mesh: Object2D
  sizePin: Pin
  complete: Resolvable<void>
  private _progress: number = 0
  private _barPercent: number = 0

  get opacity() {
    return this.mesh.matrix.opacity
  }

  set opacity(value: number) {
    this.mesh.matrix.opacity = value
  }

  constructor(
    constraints: { size: Pin; anchor: Pin; offset: Pin },
    direction: ReadonlyPin = ReadonlyPin.Left
  ) {
    this.mesh = new Object2D()
    this.mesh.matrix.setConstraints(
      constraints.size,
      constraints.anchor,
      constraints.offset
    )

    const outerBar = new RectangleMesh(new RectangleMaterial({}))
    outerBar.matrix.setColor(new Color(0x000000))
    this.mesh.add(outerBar)
    const innerBar = new RectangleMesh(new RectangleMaterial({}))
    innerBar.matrix.setColor(new Color(0x8370d3))
    this.mesh.add(innerBar)
    const sizePin = new Pin(0, 1, 0, 1)
    innerBar.matrix.setConstraints(sizePin, direction, direction)
    this.sizePin = sizePin
    this.complete = createResolvable()
  }

  get progress() {
    return this._progress
  }

  set progress(value: number) {
    this._progress = value

    if (value === 1.0) {
      this.complete.resolve()
    }
  }
  update() {
    this._barPercent += (this._progress - this._barPercent) * 0.15
    this.sizePin.x.scale = this._barPercent
  }
}
