import { clamp, lerp } from '@opensky/shared/utils/math'
import { Color } from 'three'

import { getAssetsManager } from '~/assets/index'
import { COLOR_DUSTY_PURPLE, RANK_SEGMENT_FILLED } from '~/colors/colorLibrary'
import { Pin, PinVal, ReadonlyPin } from '~/helpers/LayoutHelpers'
import Object2D from '~/meshes/Object2D'
import { simpleTweener } from '~/systems/animation/tweeners'

import { rankChangeEase, rankChangeTime } from './rankConstants'

export default class ProgressBarContinuous extends Object2D {
  private _progressSizeX: PinVal
  private _playheadOffsetX: PinVal
  async animateToValue(value: number) {
    value = clamp(value, this._min, this._max)
    this._current = value
    await simpleTweener.to({
      description: 'ProgressBarContinuous width change',
      target: this._progressSizeX,
      propertyGoals: {
        scale: (value - this._min) / (this._max - this._min)
      },
      onUpdate: () => {
        if (this._playheadOffsetX) {
          this._playheadOffsetX.scale = this._progressSizeX.scale
        }
        if (this._onChangeValue) {
          this._onChangeValue(
            lerp(this._min, this._max, this._progressSizeX.scale)
          )
        }
      },
      duration: rankChangeTime(this._rankChange),
      easing: rankChangeEase(this._rankChange)
    }).finished
  }
  constructor(
    private _current: number,
    private _min: number,
    private _max: number,
    private _num_segments: number,
    private _rankChange: 'begin' | 'end' | false | true,
    private _onChangeValue?: (v: number) => void,
    private _usePlayHead = true,
    private _color = RANK_SEGMENT_FILLED
  ) {
    super()
    const bg = getAssetsManager().fetchMeshDeepClone(
      'uiSmall',
      'rectangle',
      true
    )
    bg.matrix.setColor(COLOR_DUSTY_PURPLE)
    this.add(bg)
    const progressBar = getAssetsManager().fetchMeshDeepClone(
      'uiSmall',
      'rectangle',
      true
    )
    progressBar.matrix.setColor(_color)
    this.add(progressBar)
    // fix for elo above and below being equal
    if (this._max === this._current) {
      this._max += 1
    }
    if (this._min === this._current) {
      this._min -= 1
    }
    const ratioX = (_current - this._min) / (this._max - this._min)
    const progressSize = new Pin(ratioX, 1)
    progressBar.matrix.setConstraints(
      progressSize,
      ReadonlyPin.TopLeft,
      ReadonlyPin.TopLeft
    )
    for (const i of Array(_num_segments).keys()) {
      const segment = getAssetsManager().fetchMeshDeepClone(
        'uiSmall',
        'rectangle',
        true
      )
      segment.matrix.setColor(new Color(0x151325))
      const segPin = ReadonlyPin.Left.clone()
      segPin.x.scale = (i + 1) * 0.25
      segment.matrix.setConstraints(
        new Pin(0, 1, 3, 0),
        ReadonlyPin.Center,
        segPin
      )
      this.add(segment)
    }
    if (_usePlayHead) {
      const playhead = getAssetsManager().fetchMeshDeepClone(
        'uiSmall',
        'rectangle',
        true
      )
      const playheadOffset = new Pin(ratioX, 0.5)
      playhead.matrix.setConstraints(
        new Pin(0, 1, 4, 8),
        ReadonlyPin.Center,
        playheadOffset
      )
      this.add(playhead)
      this._playheadOffsetX = playheadOffset.x
    }
    this._progressSizeX = progressSize.x
  }
}
