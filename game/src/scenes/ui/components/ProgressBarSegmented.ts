import { clamp } from '@opensky/shared/utils/math'

import { Pin, ReadonlyPin } from '~/helpers/LayoutHelpers'
import Object2D from '~/meshes/Object2D'

import StatusSegment from './StatusSegment'

export default class ProgressBarSegmented extends Object2D {
  async animateToValue(value: number) {
    value = clamp(value, 0, this._total)
    const delta = value - this._current
    const forward = delta > 0
    const direction = forward ? 1 : -1
    const steps = Math.abs(delta)
    const oldIndex = this._current - (forward ? 1 : 0)

    this._current = value
    const anims: Array<Promise<void> | undefined> = []
    for (let step = 1; step <= steps; step++) {
      const index = oldIndex + step * direction
      const anim = this._segments[index].animateStatus(
        forward,
        step * this._delay
      )
      anims.push(anim)
      if (anim && this._onChangeValue) {
        anim.then(() => this._onChangeValue!(index + (forward ? 1 : 0)))
      }
    }
    await Promise.all(anims)
  }
  private _segments: StatusSegment[] = []
  private _delay: number
  constructor(
    private _current: number,
    private _total: number,
    private _onChangeValue?: (v: number) => void,
    delay: number = 300,
    paddingRatio = 0.1
  ) {
    super()
    this._delay = delay
    const sizePin = new Pin((1 - paddingRatio) / _total, 1)
    for (let i = 0; i < _total; i++) {
      const segment = new StatusSegment(i < _current)
      segment.matrix.setConstraints(
        sizePin,
        ReadonlyPin.TopLeft,
        new Pin(i / _total, 0)
      )
      this._segments.push(segment)
      this.add(segment)
    }
  }
}
