import { Easing } from '~/systems/animation/Easing'
import { NumberEaser } from '~/systems/animation/RawTweener'
import { simpleTweener } from '~/systems/animation/tweeners'

type ProgressCallback = (val: number) => void

export default class AnimatedNumber {
  onChange(cb: ProgressCallback, firstOneForFree = true) {
    this._listeners.push(cb)
    if (firstOneForFree) {
      cb(this._animatedValue)
    }
  }
  private _value: number
  private _durationMSDown: number
  private _animatedValue: number
  private _listeners: ProgressCallback[] = []
  set durationMSUp(val: number) {
    this._durationMS = val
  }
  set durationMSDown(val: number) {
    this._durationMSDown = val
  }
  constructor(
    onUpdate: ProgressCallback,
    initVal: number = 0,
    private _durationMS: number = 500,
    public easing: NumberEaser = Easing.Quartic.InOut,
    durationMSOut: number = -1,
    firstOneForFree: boolean = false
  ) {
    this._listeners.push(onUpdate)
    this._value = initVal
    this._durationMSDown = durationMSOut === -1 ? _durationMS : durationMSOut
    this._animatedValue = initVal
    if (firstOneForFree) {
      onUpdate(initVal)
    }
  }
  set animatedValue(val: number) {
    this._animatedValue = val
    for (const cb of this._listeners) {
      cb(val)
    }
  }
  get animatedValue() {
    return this._animatedValue
  }
  set value(val: number) {
    this.animateToValue(val)
  }
  get value() {
    return this._value
  }
  animateToValue(val: number, durationOverride?: number, easing = this.easing) {
    if (val === this._value) {
      return
    }

    const duration =
      durationOverride !== undefined
        ? durationOverride
        : (val > this._animatedValue
            ? this._durationMS
            : this._durationMSDown) * Math.abs(this._animatedValue - val)

    this._value = val

    if (duration <= 0) {
      simpleTweener.killTweensOf(this)
      this.animatedValue = val
      return
    } else {
      return simpleTweener.to({
        description: 'animated number change',
        target: this as AnimatedNumber,
        propertyGoals: {
          animatedValue: val
        },
        duration,
        easing
      }).finished
    }
  }
}
