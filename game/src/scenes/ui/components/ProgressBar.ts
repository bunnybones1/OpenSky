import { Color } from 'three'

import { getAssetsManager } from '~/assets/index'
import { Pin, ReadonlyPin } from '~/helpers/LayoutHelpers'
import Mesh2D from '~/meshes/Mesh2D'
import { createResolvable, Resolvable } from '~/utils/asyncUtils'

export default class ProgressBar {
  mesh: Mesh2D
  sizePin: Pin
  complete: Resolvable<void>
  private _progress: number = 0
  private _barPercent: number = 0
  private _innerBar: Mesh2D
  private _outerBar: Mesh2D

  constructor() {
    this.mesh = new Mesh2D()
    this.mesh.matrix.setConstraints(
      new Pin(0.5, 0, 0, 1),
      ReadonlyPin.Center,
      new Pin(0.5, 0.9)
    )
    const bar = getAssetsManager().fetchMeshDeepClone(
      'uiPreloader',
      'rectangle-rounded-exterior'
    )
    const outerBar = bar.clone()
    outerBar.matrix.setColor(new Color(0x29204f))
    outerBar.name = 'outerBar'
    this.mesh.add(outerBar)
    const innerBar = bar
    innerBar.matrix.setColor(new Color(0x8370d3))
    this.mesh.add(innerBar)
    const sizePin = new Pin(0, 0, 0, 0)
    innerBar.matrix.setConstraints(sizePin, ReadonlyPin.Left, ReadonlyPin.Left)
    this.sizePin = sizePin
    this.complete = createResolvable()
    this._innerBar = innerBar
    this._outerBar = outerBar
    this.mesh.matrix.prescale.set(16, 16)
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

  set opacity(value: number) {
    this._innerBar.matrix.opacity = value
    this._outerBar.matrix.opacity = value
  }

  get opacity() {
    return this._innerBar.matrix.opacity
  }

  update() {
    this._barPercent += (this._progress - this._barPercent) * 0.15
    this.sizePin.x.scale = this._barPercent
  }
}
