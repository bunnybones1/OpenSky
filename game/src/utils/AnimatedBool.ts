import { Easing } from '~/systems/animation/Easing'
import { NumberEaser } from '~/systems/animation/RawTweener'
import { simpleTweener } from '~/systems/animation/tweeners'

import { animationDelay } from './asyncUtils'

export type ProgressCallback = (val: number) => void

export class AnimatedBool {
  private _value: boolean
  private _durationMSOut: number
  private _animatedValue: number
  set durationMSIn(val: number) {
    this._durationMS = val
  }
  set durationMSOut(val: number) {
    this._durationMSOut = val
  }
  constructor(
    private _onUpdate: ProgressCallback,
    initVal: boolean = false,
    private _durationMS: number = 500,
    public easing: NumberEaser = Easing.Quartic.InOut,
    durationMSOut: number = -1
  ) {
    this._value = initVal
    this._durationMSOut = durationMSOut === -1 ? _durationMS : durationMSOut
    this._animatedValue = initVal ? 1 : 0
  }
  pulse() {
    this.value = true
    this.value = false
  }
  async pulseFull() {
    this.value = true
    const duration = this._durationMS * Math.abs(this._animatedValue - 1)
    await animationDelay(duration)
    this.value = false
  }
  set animatedValue(val: number) {
    this._animatedValue = val
    this._onUpdate(val)
  }
  get animatedValue() {
    return this._animatedValue
  }
  animateValue(
    val: boolean,
    durationOverride?: number,
    easing = this.easing,
    delay = 0
  ) {
    if (val === this._value) {
      return
    }

    const desiredVal = val ? 1 : 0

    const duration =
      durationOverride !== undefined
        ? durationOverride
        : (desiredVal > this._animatedValue
            ? this._durationMS
            : this._durationMSOut) * Math.abs(this._animatedValue - desiredVal)

    this._value = val

    if (duration <= 0) {
      simpleTweener.killTweensOf(this)
      this.animatedValue = desiredVal
      return
    } else {
      return simpleTweener.to({
        description: 'animated bool state change',
        target: this as AnimatedBool,
        propertyGoals: {
          animatedValue: desiredVal
        },
        duration,
        delay,
        easing
      }).finished
    }
  }
  set value(val: boolean) {
    this.animateValue(val)
  }
  get value() {
    return this._value
  }
}
